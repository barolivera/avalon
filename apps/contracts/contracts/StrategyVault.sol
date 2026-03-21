// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IIdentityRegistry, IReputationRegistry} from "./interfaces/IERC8004.sol";

/// @title StrategyVault - Non-custodial vault for Avalon DeFAI strategies
/// @notice Users deposit funds, assign an ERC-8004 registered AI agent, and can emergency withdraw at any time.
/// @dev UUPS upgradeable. Executor is the only role authorized to move funds for trades.
///      Integrates with ERC-8004 Identity & Reputation registries on Avalanche.
contract StrategyVault is Initializable, UUPSUpgradeable, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Roles
    // ──────────────────────────────────────────────

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    enum StrategyStatus {
        Draft,
        Funded,
        Active,
        Paused,
        Completed,
        Cancelled
    }

    struct Strategy {
        address user;
        address depositToken;
        uint256 depositAmount;
        uint256 currentBalance;
        uint256 maxBudget;
        uint16 maxSlippageBps;
        uint16 maxTradesPerDay;
        uint16 tradesToday;
        uint40 lastTradeReset;
        uint40 createdAt;
        uint256 agentId;          // ERC-8004 agent identity
        StrategyStatus status;
    }

    struct StrategyView {
        uint256 strategyId;
        address user;
        address depositToken;
        uint256 depositAmount;
        uint256 currentBalance;
        int256 pnl;
        uint256 agentId;
        StrategyStatus status;
        uint40 createdAt;
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    IIdentityRegistry public identityRegistry;
    IReputationRegistry public reputationRegistry;
    address public feeCollector;
    uint256 public nextStrategyId;

    /// @notice Minimum reputation score required for an agent to be assigned
    int128 public minReputationScore;

    mapping(uint256 => Strategy) public strategies;

    /// @notice User address => array of strategy IDs
    mapping(address => uint256[]) public userStrategies;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event StrategyCreated(uint256 indexed strategyId, address indexed user, address depositToken, uint256 amount, uint256 indexed agentId);
    event StrategyActivated(uint256 indexed strategyId);
    event StrategyPaused(uint256 indexed strategyId);
    event StrategyResumed(uint256 indexed strategyId);
    event StrategySettled(uint256 indexed strategyId, uint256 finalBalance, int256 pnl, uint256 feeAmount);
    event StrategyCancelled(uint256 indexed strategyId);
    event EmergencyWithdraw(uint256 indexed strategyId, address indexed user, uint256 amount);
    event FundsAllocated(uint256 indexed strategyId, uint256 amount);
    event FundsReturned(uint256 indexed strategyId, uint256 amount);
    event FeedbackGiven(uint256 indexed strategyId, uint256 indexed agentId, int128 rating);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error NotStrategyOwner();
    error InvalidStatus(StrategyStatus current, StrategyStatus expected);
    error ExceedsBudget(uint256 requested, uint256 maxBudget);
    error ExceedsDailyTradeLimit();
    error InsufficientBalance(uint256 requested, uint256 available);
    error AgentNotRegistered(uint256 agentId);
    error AgentReputationTooLow(uint256 agentId, int128 score, int128 minimum);
    error StrategyNotProfitable();

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyStrategyOwner(uint256 strategyId) {
        if (strategies[strategyId].user != msg.sender) revert NotStrategyOwner();
        _;
    }

    modifier inStatus(uint256 strategyId, StrategyStatus expected) {
        StrategyStatus current = strategies[strategyId].status;
        if (current != expected) revert InvalidStatus(current, expected);
        _;
    }

    // ──────────────────────────────────────────────
    //  Initializer (UUPS)
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the vault (called once via proxy)
    /// @param admin_ Protocol admin (multisig recommended)
    /// @param identityRegistry_ ERC-8004 Identity Registry address
    /// @param reputationRegistry_ ERC-8004 Reputation Registry address
    function initialize(
        address admin_,
        address identityRegistry_,
        address reputationRegistry_
    ) external initializer {
        if (admin_ == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(GUARDIAN_ROLE, admin_);

        identityRegistry = IIdentityRegistry(identityRegistry_);
        reputationRegistry = IReputationRegistry(reputationRegistry_);
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    function setFeeCollector(address feeCollector_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (feeCollector_ == address(0)) revert ZeroAddress();
        feeCollector = feeCollector_;
    }

    function setMinReputationScore(int128 score) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minReputationScore = score;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ──────────────────────────────────────────────
    //  User: Create & Fund
    // ──────────────────────────────────────────────

    /// @notice Create and fund a new strategy linked to an ERC-8004 agent
    /// @param depositToken ERC-20 token to deposit (e.g. USDC, WAVAX)
    /// @param amount Amount to deposit
    /// @param agentId ERC-8004 agent ID (must be registered in Identity Registry)
    /// @param maxBudget Max amount the executor can use per trade
    /// @param maxSlippageBps Max slippage in basis points (e.g. 50 = 0.5%)
    /// @param maxTradesPerDay Max trades the agent can execute per 24h
    /// @return strategyId The ID of the new strategy
    function createStrategy(
        address depositToken,
        uint256 amount,
        uint256 agentId,
        uint256 maxBudget,
        uint16 maxSlippageBps,
        uint16 maxTradesPerDay
    ) external nonReentrant whenNotPaused returns (uint256 strategyId) {
        if (amount == 0) revert ZeroAmount();
        if (depositToken == address(0)) revert ZeroAddress();

        // Verify agent is registered in ERC-8004 Identity Registry
        _verifyAgent(agentId);

        strategyId = nextStrategyId++;

        strategies[strategyId] = Strategy({
            user: msg.sender,
            depositToken: depositToken,
            depositAmount: amount,
            currentBalance: amount,
            maxBudget: maxBudget,
            maxSlippageBps: maxSlippageBps,
            maxTradesPerDay: maxTradesPerDay,
            tradesToday: 0,
            lastTradeReset: uint40(block.timestamp),
            createdAt: uint40(block.timestamp),
            agentId: agentId,
            status: StrategyStatus.Funded
        });

        userStrategies[msg.sender].push(strategyId);

        emit StrategyCreated(strategyId, msg.sender, depositToken, amount, agentId);

        IERC20(depositToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Activate a funded strategy (starts the agent)
    function activateStrategy(uint256 strategyId)
        external
        onlyStrategyOwner(strategyId)
        inStatus(strategyId, StrategyStatus.Funded)
    {
        strategies[strategyId].status = StrategyStatus.Active;
        emit StrategyActivated(strategyId);
    }

    /// @notice Pause an active strategy
    function pauseStrategy(uint256 strategyId)
        external
        onlyStrategyOwner(strategyId)
        inStatus(strategyId, StrategyStatus.Active)
    {
        strategies[strategyId].status = StrategyStatus.Paused;
        emit StrategyPaused(strategyId);
    }

    /// @notice Resume a paused strategy
    function resumeStrategy(uint256 strategyId)
        external
        onlyStrategyOwner(strategyId)
        inStatus(strategyId, StrategyStatus.Paused)
    {
        strategies[strategyId].status = StrategyStatus.Active;
        emit StrategyResumed(strategyId);
    }

    /// @notice Emergency withdraw — available in ANY status, no delay, no approval needed
    function emergencyWithdraw(uint256 strategyId)
        external
        nonReentrant
        onlyStrategyOwner(strategyId)
    {
        Strategy storage s = strategies[strategyId];
        uint256 balance = s.currentBalance;
        if (balance == 0) revert ZeroAmount();

        s.currentBalance = 0;
        s.status = StrategyStatus.Cancelled;

        emit EmergencyWithdraw(strategyId, msg.sender, balance);
        emit StrategyCancelled(strategyId);

        IERC20(s.depositToken).safeTransfer(msg.sender, balance);
    }

    // ──────────────────────────────────────────────
    //  Executor: Allocate & Return funds
    // ──────────────────────────────────────────────

    /// @notice Executor takes funds from vault to execute a trade
    /// @dev Validates all on-chain constraints before releasing funds
    function allocateFunds(uint256 strategyId, uint256 amount)
        external
        nonReentrant
        onlyRole(EXECUTOR_ROLE)
        inStatus(strategyId, StrategyStatus.Active)
    {
        Strategy storage s = strategies[strategyId];

        if (amount == 0) revert ZeroAmount();
        if (amount > s.maxBudget) revert ExceedsBudget(amount, s.maxBudget);
        if (amount > s.currentBalance) revert InsufficientBalance(amount, s.currentBalance);

        // Reset daily trade counter if 24h passed
        if (block.timestamp >= uint256(s.lastTradeReset) + 1 days) {
            s.tradesToday = 0;
            s.lastTradeReset = uint40(block.timestamp);
        }
        if (s.tradesToday >= s.maxTradesPerDay) revert ExceedsDailyTradeLimit();
        s.tradesToday++;

        s.currentBalance -= amount;

        emit FundsAllocated(strategyId, amount);

        IERC20(s.depositToken).safeTransfer(msg.sender, amount);
    }

    /// @notice Executor returns funds after a trade
    function returnFunds(uint256 strategyId, uint256 amount)
        external
        nonReentrant
        onlyRole(EXECUTOR_ROLE)
    {
        if (amount == 0) revert ZeroAmount();
        Strategy storage s = strategies[strategyId];
        s.currentBalance += amount;

        emit FundsReturned(strategyId, amount);

        IERC20(s.depositToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    // ──────────────────────────────────────────────
    //  Settlement: Complete strategy + collect fee
    // ──────────────────────────────────────────────

    /// @notice Settle a strategy: calculate profit, collect fee, mark complete
    /// @dev Called by executor when strategy lifecycle ends.
    ///      Automatically calls FeeCollector for success fee on profit.
    function settleStrategy(uint256 strategyId)
        external
        onlyRole(EXECUTOR_ROLE)
        inStatus(strategyId, StrategyStatus.Active)
    {
        Strategy storage s = strategies[strategyId];

        uint256 finalBalance = s.currentBalance;
        int256 pnl = int256(finalBalance) - int256(s.depositAmount);
        uint256 feeAmount = 0;

        // Collect fee only if profitable and feeCollector is set
        if (pnl > 0 && feeCollector != address(0)) {
            // Approve feeCollector to pull the fee
            IERC20(s.depositToken).forceApprove(feeCollector, finalBalance);

            // FeeCollector.collectFee returns the actual fee taken
            (bool success, bytes memory data) = feeCollector.call(
                abi.encodeWithSignature(
                    "collectFee(uint256,address,uint256,uint256)",
                    strategyId,
                    s.depositToken,
                    s.depositAmount,
                    finalBalance
                )
            );

            if (success && data.length >= 32) {
                feeAmount = abi.decode(data, (uint256));
                s.currentBalance -= feeAmount;
            }

            // Reset approval
            IERC20(s.depositToken).forceApprove(feeCollector, 0);
        }

        s.status = StrategyStatus.Completed;

        emit StrategySettled(strategyId, finalBalance, pnl, feeAmount);
    }

    /// @notice Withdraw all funds from a completed strategy
    function withdraw(uint256 strategyId)
        external
        nonReentrant
        onlyStrategyOwner(strategyId)
        inStatus(strategyId, StrategyStatus.Completed)
    {
        Strategy storage s = strategies[strategyId];
        uint256 balance = s.currentBalance;
        if (balance == 0) revert ZeroAmount();

        s.currentBalance = 0;

        IERC20(s.depositToken).safeTransfer(msg.sender, balance);
    }

    // ──────────────────────────────────────────────
    //  User: Give feedback via ERC-8004 Reputation
    // ──────────────────────────────────────────────

    /// @notice Give feedback for the agent after strategy completion
    /// @param strategyId The completed strategy
    /// @param rating Rating value (e.g. 1-5 scaled to int128)
    /// @param tag Strategy type tag (e.g. "grid-trading", "dca")
    function giveFeedback(uint256 strategyId, int128 rating, string calldata tag)
        external
        onlyStrategyOwner(strategyId)
        inStatus(strategyId, StrategyStatus.Completed)
    {
        Strategy storage s = strategies[strategyId];

        reputationRegistry.giveFeedback(
            s.agentId,
            rating,
            0,    // 0 decimals (whole number)
            tag,
            "",   // tag2
            "",   // endpoint
            "",   // feedbackURI
            bytes32(0) // feedbackHash
        );

        emit FeedbackGiven(strategyId, s.agentId, rating);
    }

    // ──────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────

    /// @dev Verify agent exists in ERC-8004 Identity Registry and meets reputation minimum
    function _verifyAgent(uint256 agentId) internal view {
        // Check agent exists (ownerOf reverts if not minted)
        try identityRegistry.ownerOf(agentId) returns (address) {} catch {
            revert AgentNotRegistered(agentId);
        }

        // Check reputation if minimum is set
        if (minReputationScore > 0) {
            address[] memory empty = new address[](0);
            (, int128 score,) = reputationRegistry.getSummary(agentId, empty, "", "");
            if (score < minReputationScore) {
                revert AgentReputationTooLow(agentId, score, minReputationScore);
            }
        }
    }

    // ──────────────────────────────────────────────
    //  View functions
    // ──────────────────────────────────────────────

    /// @notice Get full strategy details
    function getStrategy(uint256 strategyId) external view returns (Strategy memory) {
        return strategies[strategyId];
    }

    /// @notice Get P&L for a strategy
    function getPnL(uint256 strategyId) external view returns (int256) {
        Strategy storage s = strategies[strategyId];
        return int256(s.currentBalance) - int256(s.depositAmount);
    }

    /// @notice Get all strategy IDs for a user
    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }

    /// @notice Get enriched view of strategies for a user (frontend-friendly)
    function getUserStrategyViews(address user) external view returns (StrategyView[] memory) {
        uint256[] storage ids = userStrategies[user];
        StrategyView[] memory views = new StrategyView[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            Strategy storage s = strategies[ids[i]];
            views[i] = StrategyView({
                strategyId: ids[i],
                user: s.user,
                depositToken: s.depositToken,
                depositAmount: s.depositAmount,
                currentBalance: s.currentBalance,
                pnl: int256(s.currentBalance) - int256(s.depositAmount),
                agentId: s.agentId,
                status: s.status,
                createdAt: s.createdAt
            });
        }

        return views;
    }

    /// @notice Get agent reputation from ERC-8004
    function getAgentReputation(uint256 agentId)
        external
        view
        returns (uint64 feedbackCount, int128 averageRating)
    {
        address[] memory empty = new address[](0);
        (feedbackCount, averageRating,) = reputationRegistry.getSummary(agentId, empty, "", "");
    }
}
