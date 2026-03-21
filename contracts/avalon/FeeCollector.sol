// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FeeCollector
 * @notice Implements the x402 success fee model: agents are only paid when they generate
 *         profit for the user. This contract is called by authorized agents after a profitable
 *         trade cycle to collect their performance fee in USDC.
 *
 * x402 Protocol Integration:
 * The x402 protocol uses HTTP 402 Payment Required for machine-to-machine payments.
 * In Avalon's flow:
 *   1. Agent completes a profitable trade cycle
 *   2. Agent calls collectFee() with the profit amount
 *   3. Contract calculates fee = profit * feePercent / 10000 (basis points)
 *   4. USDC is transferred from the StrategyVault to the platform treasury
 *   5. FeeCollected event is emitted (indexed for the frontend's Fee History tab)
 *
 * Security decisions:
 * - Only authorized agents can collect fees (prevents anyone from draining the vault)
 * - Fee percent is capped at MAX_FEE_BPS (30%) to prevent abusive fees
 * - Zero-profit protection: reverts if profitAmount is 0 (no profit = no fee)
 * - ReentrancyGuard on collectFee since it transfers tokens
 * - Fee recipient (treasury) is set at deploy and only changeable by owner
 */
contract FeeCollector is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constants ---

    /// @notice Maximum fee in basis points (30% = 3000 bps)
    /// @dev Hard cap prevents owner from setting abusive fees. 30% is generous;
    ///      typical Avalon agents charge 10-15%.
    uint256 public constant MAX_FEE_BPS = 3000;

    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS_DENOMINATOR = 10000;

    // --- State ---

    /// @notice The fee token (USDC)
    IERC20 public immutable feeToken;

    /// @notice The vault that holds user funds (fees are pulled from here)
    address public immutable vault;

    /// @notice Address that receives collected fees (platform treasury)
    address public treasury;

    /// @notice Addresses authorized to trigger fee collection (AI agents)
    mapping(address => bool) public authorizedAgents;

    /// @notice Running total of fees collected (for analytics)
    uint256 public totalFeesCollected;

    /// @notice Incrementing ID for each fee collection event
    uint256 public feeNonce;

    // --- Events ---

    /**
     * @notice Emitted when a success fee is collected
     * @param user The user whose profit generated the fee
     * @param agent The agent that executed the trades
     * @param feeAmount The fee collected in USDC
     * @param profitAmount The total profit that triggered the fee
     * @param feeBps The fee rate in basis points
     * @param txId Unique identifier for this fee event (used by frontend)
     */
    event FeeCollected(
        address indexed user,
        address indexed agent,
        uint256 feeAmount,
        uint256 profitAmount,
        uint256 feeBps,
        uint256 indexed txId
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AgentAuthorized(address indexed agent);
    event AgentRevoked(address indexed agent);

    // --- Errors ---

    error NotAuthorizedAgent(address caller);
    error ZeroProfitAmount();
    error FeeExceedsMax(uint256 requested, uint256 max);
    error ZeroAddress();

    // --- Modifiers ---

    modifier onlyAgent() {
        if (!authorizedAgents[msg.sender]) revert NotAuthorizedAgent(msg.sender);
        _;
    }

    // --- Constructor ---

    /**
     * @param _feeToken USDC token address
     * @param _vault StrategyVault address (source of fee funds)
     * @param _treasury Platform treasury address (destination of fees)
     *
     * Security: feeToken and vault are immutable — can't be changed post-deploy.
     * Treasury can be updated by owner (in case of key rotation).
     */
    constructor(
        address _feeToken,
        address _vault,
        address _treasury
    ) Ownable(msg.sender) {
        if (_feeToken == address(0) || _vault == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        feeToken = IERC20(_feeToken);
        vault = _vault;
        treasury = _treasury;
    }

    // --- Core Function ---

    /**
     * @notice Collect a success fee from a user's profit
     * @param user The user whose trades generated profit
     * @param profitAmount The profit in USDC (token decimals)
     * @param feeBps Fee percentage in basis points (1000 = 10%)
     *
     * x402 Flow:
     * This is the on-chain settlement step of the x402 protocol.
     * The agent's backend has already:
     *   1. Detected a profitable trade cycle
     *   2. Sent HTTP 402 to the frontend with fee requirements
     *   3. Received the user's signed payment authorization
     *   4. Now calls this contract to execute the on-chain transfer
     *
     * Security:
     * - onlyAgent: only authorized agents can trigger fee collection
     * - nonReentrant: prevents re-entrancy during token transfer
     * - Fee cap: feeBps cannot exceed MAX_FEE_BPS (30%)
     * - Zero-profit check: no fee on zero or negative profit
     * - SafeERC20: handles non-standard token return values
     *
     * Note: The vault must have approved this contract to spend USDC
     * via depositToken.approve(feeCollector, amount) beforehand.
     */
    function collectFee(
        address user,
        uint256 profitAmount,
        uint256 feeBps
    ) external onlyAgent nonReentrant {
        if (profitAmount == 0) revert ZeroProfitAmount();
        if (feeBps > MAX_FEE_BPS) revert FeeExceedsMax(feeBps, MAX_FEE_BPS);

        uint256 feeAmount = (profitAmount * feeBps) / BPS_DENOMINATOR;

        // Skip if fee rounds to zero (very small profits)
        if (feeAmount == 0) return;

        // Track state before transfer (CEI pattern)
        uint256 txId = ++feeNonce;
        totalFeesCollected += feeAmount;

        // Transfer fee from vault to treasury
        // Requires: vault has called feeToken.approve(address(this), feeAmount)
        feeToken.safeTransferFrom(vault, treasury, feeAmount);

        emit FeeCollected(user, msg.sender, feeAmount, profitAmount, feeBps, txId);
    }

    // --- Owner Functions ---

    /**
     * @notice Update the treasury address
     * @param newTreasury New treasury address
     *
     * Security: only owner can change. Emits event for transparency.
     * Does not allow zero address to prevent accidental fund loss.
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    /// @notice Authorize an agent to collect fees
    function authorizeAgent(address agent) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        authorizedAgents[agent] = true;
        emit AgentAuthorized(agent);
    }

    /// @notice Revoke an agent's fee collection rights
    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
        emit AgentRevoked(agent);
    }
}
