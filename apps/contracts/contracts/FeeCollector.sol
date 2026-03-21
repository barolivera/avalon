// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/// @title FeeCollector - Success fee collection for Avalon (x402-compatible)
/// @notice Only charges fees on profit. If the strategy didn't make money, no fee is charged.
///         Supports both direct settlement and x402 "upto" scheme for gasless fee collection.
/// @dev Fee is expressed in basis points (e.g. 1000 = 10%). Capped at MAX_FEE_BPS.
///      x402 integration: the facilitator can settle fees via USDC using EIP-3009
///      transferWithAuthorization, enabling gasless, natively Avalanche fee collection.
contract FeeCollector is Initializable, UUPSUpgradeable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    /// @notice Maximum fee: 20% (protocol safety cap)
    uint256 public constant MAX_FEE_BPS = 2000;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ──────────────────────────────────────────────
    //  Roles
    // ──────────────────────────────────────────────

    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    bytes32 public constant FACILITATOR_ROLE = keccak256("FACILITATOR_ROLE");

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @notice Success fee in basis points (default 10% = 1000 bps)
    uint256 public feeBps;

    /// @notice Address that receives collected fees (treasury/multisig)
    address public treasury;

    /// @notice USDC token address (for x402 settlement)
    address public usdc;

    /// @notice Total fees collected per token
    mapping(address => uint256) public totalFeesCollected;

    /// @notice Fees collected per strategy
    mapping(uint256 => uint256) public strategyFeesCollected;

    /// @notice x402 settlement records: paymentHash => settled
    mapping(bytes32 => bool) public x402Settlements;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event FeeCollected(
        uint256 indexed strategyId,
        address indexed token,
        uint256 profit,
        uint256 feeAmount,
        uint256 feeBps
    );
    event X402FeeSettled(
        uint256 indexed strategyId,
        bytes32 indexed paymentHash,
        uint256 feeAmount,
        address indexed facilitator
    );
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error ZeroAddress();
    error FeeTooHigh(uint256 feeBps, uint256 maxFeeBps);
    error NothingToWithdraw();
    error AlreadySettled(bytes32 paymentHash);

    // ──────────────────────────────────────────────
    //  Initializer (UUPS)
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the fee collector
    /// @param admin_ Protocol admin
    /// @param treasury_ Address that receives fees
    /// @param usdc_ USDC token address
    function initialize(
        address admin_,
        address treasury_,
        address usdc_
    ) external initializer {
        if (admin_ == address(0) || treasury_ == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);

        treasury = treasury_;
        usdc = usdc_;
        feeBps = 1000; // 10% default
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /// @notice Update the success fee (capped at MAX_FEE_BPS)
    function setFeeBps(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    /// @notice Update treasury address
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ──────────────────────────────────────────────
    //  Core: Collect fee on profit (called by Vault)
    // ──────────────────────────────────────────────

    /// @notice Calculate and collect fee from strategy profit
    /// @dev Called by StrategyVault.settleStrategy() when a strategy completes
    /// @param strategyId Strategy that completed
    /// @param token The deposit token
    /// @param depositAmount Original deposit
    /// @param finalBalance Final balance after trading
    /// @return feeAmount The fee collected (0 if no profit)
    function collectFee(
        uint256 strategyId,
        address token,
        uint256 depositAmount,
        uint256 finalBalance
    ) external nonReentrant onlyRole(VAULT_ROLE) returns (uint256 feeAmount) {
        // No fee if no profit
        if (finalBalance <= depositAmount) return 0;

        uint256 profit = finalBalance - depositAmount;
        feeAmount = (profit * feeBps) / BPS_DENOMINATOR;

        if (feeAmount == 0) return 0;

        totalFeesCollected[token] += feeAmount;
        strategyFeesCollected[strategyId] += feeAmount;

        emit FeeCollected(strategyId, token, profit, feeAmount, feeBps);

        IERC20(token).safeTransferFrom(msg.sender, address(this), feeAmount);
    }

    // ──────────────────────────────────────────────
    //  x402: Settle fee via facilitator (gasless)
    // ──────────────────────────────────────────────

    /// @notice Settle a strategy fee via x402 facilitator
    /// @dev The x402 facilitator calls this after settling USDC payment on-chain.
    ///      This is the "upto" scheme: user authorized max fee, facilitator settles actual amount.
    ///      The facilitator must have already transferred USDC to this contract via EIP-3009.
    /// @param strategyId Strategy being settled
    /// @param feeAmount Actual fee amount in USDC (≤ authorized max)
    /// @param paymentHash Unique x402 payment identifier (prevents replay)
    function settleX402Fee(
        uint256 strategyId,
        uint256 feeAmount,
        bytes32 paymentHash
    ) external nonReentrant onlyRole(FACILITATOR_ROLE) {
        if (x402Settlements[paymentHash]) revert AlreadySettled(paymentHash);

        x402Settlements[paymentHash] = true;

        totalFeesCollected[usdc] += feeAmount;
        strategyFeesCollected[strategyId] += feeAmount;

        emit X402FeeSettled(strategyId, paymentHash, feeAmount, msg.sender);

        // Facilitator has already sent USDC to this contract via EIP-3009
        // We just record the settlement. Funds are already here.
    }

    // ──────────────────────────────────────────────
    //  Treasury: Withdraw
    // ──────────────────────────────────────────────

    /// @notice Withdraw collected fees to treasury
    function withdrawFees(address token) external nonReentrant {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();

        emit FeesWithdrawn(token, treasury, balance);

        IERC20(token).safeTransfer(treasury, balance);
    }

    // ──────────────────────────────────────────────
    //  View
    // ──────────────────────────────────────────────

    /// @notice Calculate fee for a given profit amount (preview)
    function calculateFee(uint256 profit) external view returns (uint256) {
        return (profit * feeBps) / BPS_DENOMINATOR;
    }

    /// @notice Calculate fee for a completed strategy (preview)
    function previewFee(uint256 depositAmount, uint256 finalBalance) external view returns (uint256) {
        if (finalBalance <= depositAmount) return 0;
        return ((finalBalance - depositAmount) * feeBps) / BPS_DENOMINATOR;
    }

    /// @notice Check if an x402 payment has been settled
    function isSettled(bytes32 paymentHash) external view returns (bool) {
        return x402Settlements[paymentHash];
    }
}
