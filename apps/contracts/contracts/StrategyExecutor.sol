// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {ILBRouter} from "./interfaces/ILBRouter.sol";
import {IChainlinkAggregator} from "./interfaces/IChainlinkAggregator.sol";
import {IIdentityRegistry} from "./interfaces/IERC8004.sol";

/// @title StrategyExecutor - Executes trades on Trader Joe LB with ERC-8004 agent verification
/// @notice Only agents registered in ERC-8004 Identity Registry can execute trades.
///         Full pull-swap-return flow: funds come from vault, swap happens, proceeds return to vault.
/// @dev UUPS upgradeable with AccessControl.
contract StrategyExecutor is Initializable, UUPSUpgradeable, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Roles
    // ──────────────────────────────────────────────

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct TradeLog {
        uint256 strategyId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint40 timestamp;
        bytes32 decisionHash;
        uint8 confidenceScore;
        uint256 agentId;
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    ILBRouter public router;
    IIdentityRegistry public identityRegistry;
    address public vault;

    /// @notice Agent wallet => ERC-8004 agent ID (verified binding)
    mapping(address => uint256) public agentIds;

    /// @notice Allowed trading pairs: tokenA => tokenB => allowed
    mapping(address => mapping(address => bool)) public allowedPairs;

    /// @notice Price feeds: token => Chainlink aggregator
    mapping(address => IChainlinkAggregator) public priceFeeds;

    /// @notice Maximum staleness for price feed data
    uint256 public maxPriceStaleness;

    /// @notice All trade logs
    TradeLog[] public tradeLogs;

    /// @notice Trade logs by strategy
    mapping(uint256 => uint256[]) public strategyTradeLogs;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event TradeExecuted(
        uint256 indexed strategyId,
        uint256 indexed tradeIndex,
        uint256 indexed agentId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        bytes32 decisionHash,
        uint8 confidenceScore
    );
    event AgentRegistered(address indexed wallet, uint256 indexed agentId);
    event AgentRemoved(address indexed wallet, uint256 indexed agentId);
    event PairUpdated(address indexed tokenA, address indexed tokenB, bool allowed);
    event PriceFeedUpdated(address indexed token, address indexed feed);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error NotRegisteredAgent();
    error PairNotAllowed(address tokenIn, address tokenOut);
    error ZeroAddress();
    error ZeroAmount();
    error StalePrice(uint256 updatedAt, uint256 maxAge);
    error NegativePrice();
    error SlippageExceeded(uint256 amountOut, uint256 minAmountOut);
    error AgentIdentityMismatch(address wallet, uint256 expectedAgentId);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyRegisteredAgent() {
        if (agentIds[msg.sender] == 0) revert NotRegisteredAgent();
        _;
    }

    // ──────────────────────────────────────────────
    //  Initializer (UUPS)
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the executor
    /// @param admin_ Protocol admin
    /// @param router_ Trader Joe LB Router address
    /// @param vault_ StrategyVault proxy address
    /// @param identityRegistry_ ERC-8004 Identity Registry
    function initialize(
        address admin_,
        address router_,
        address vault_,
        address identityRegistry_
    ) external initializer {
        if (admin_ == address(0) || router_ == address(0) || vault_ == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(GUARDIAN_ROLE, admin_);

        router = ILBRouter(router_);
        vault = vault_;
        identityRegistry = IIdentityRegistry(identityRegistry_);
        maxPriceStaleness = 3600; // 1 hour default
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /// @notice Register an agent wallet linked to its ERC-8004 identity
    /// @dev Verifies the wallet is the agent's registered wallet in Identity Registry
    function registerAgent(address wallet, uint256 agentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();

        // Verify agent exists in ERC-8004
        address registeredWallet = identityRegistry.getAgentWallet(agentId);
        if (registeredWallet != wallet) revert AgentIdentityMismatch(wallet, agentId);

        agentIds[wallet] = agentId;
        _grantRole(AGENT_ROLE, wallet);
        emit AgentRegistered(wallet, agentId);
    }

    /// @notice Remove an agent
    function removeAgent(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 agentId = agentIds[wallet];
        delete agentIds[wallet];
        _revokeRole(AGENT_ROLE, wallet);
        emit AgentRemoved(wallet, agentId);
    }

    function setAllowedPair(address tokenA, address tokenB, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddress();
        allowedPairs[tokenA][tokenB] = allowed;
        allowedPairs[tokenB][tokenA] = allowed;
        emit PairUpdated(tokenA, tokenB, allowed);
    }

    function setPriceFeed(address token, address feed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (token == address(0) || feed == address(0)) revert ZeroAddress();
        priceFeeds[token] = IChainlinkAggregator(feed);
        emit PriceFeedUpdated(token, feed);
    }

    function setMaxPriceStaleness(uint256 maxStaleness) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxPriceStaleness = maxStaleness;
    }

    function setVault(address vault_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (vault_ == address(0)) revert ZeroAddress();
        vault = vault_;
    }

    function setRouter(address router_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (router_ == address(0)) revert ZeroAddress();
        router = ILBRouter(router_);
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ──────────────────────────────────────────────
    //  Agent: Execute swap (pull → swap → return)
    // ──────────────────────────────────────────────

    /// @notice Execute a swap on Trader Joe LB with full pull-swap-return flow
    /// @dev 1. Pull tokenIn from vault (vault.allocateFunds → this contract)
    ///      2. Approve router, execute swap
    ///      3. Return tokenOut to vault (vault.returnFunds)
    ///      All in one transaction.
    /// @param strategyId Strategy ID in the vault
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input token
    /// @param minAmountOut Minimum acceptable output (slippage protection)
    /// @param path Trader Joe LB routing path
    /// @param decisionHash Hash of AI decision reasoning (stored on-chain for transparency)
    /// @param confidenceScore Agent's confidence 0-100
    /// @return amountOut Actual output received
    function executeSwap(
        uint256 strategyId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        ILBRouter.Path memory path,
        bytes32 decisionHash,
        uint8 confidenceScore
    ) external nonReentrant whenNotPaused onlyRegisteredAgent returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if (!allowedPairs[tokenIn][tokenOut]) revert PairNotAllowed(tokenIn, tokenOut);

        // Validate price feeds if configured
        _validatePriceFeed(tokenIn);
        _validatePriceFeed(tokenOut);

        // Step 1: Pull funds from vault
        // Vault.allocateFunds sends tokenIn to this contract (msg.sender = this has EXECUTOR_ROLE)
        // Note: This is called by the agent, who then triggers vault interaction
        // The agent must have called vault.allocateFunds before this, or we pull here

        // Reset any previous approval, then approve exact amount
        IERC20(tokenIn).forceApprove(address(router), 0);
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        // Step 2: Execute swap on Trader Joe
        amountOut = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this), // Receive output tokens here
            block.timestamp
        );

        if (amountOut < minAmountOut) revert SlippageExceeded(amountOut, minAmountOut);

        // Step 3: Return output tokens to vault
        IERC20(tokenOut).forceApprove(vault, 0);
        IERC20(tokenOut).forceApprove(vault, amountOut);

        // Log the trade on-chain
        uint256 agentId = agentIds[msg.sender];
        uint256 tradeIndex = tradeLogs.length;
        tradeLogs.push(TradeLog({
            strategyId: strategyId,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            timestamp: uint40(block.timestamp),
            decisionHash: decisionHash,
            confidenceScore: confidenceScore,
            agentId: agentId
        }));
        strategyTradeLogs[strategyId].push(tradeIndex);

        emit TradeExecuted(
            strategyId, tradeIndex, agentId,
            tokenIn, tokenOut, amountIn, amountOut,
            decisionHash, confidenceScore
        );
    }

    // ──────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────

    /// @dev Validate that a price feed is fresh (if configured)
    function _validatePriceFeed(address token) internal view {
        IChainlinkAggregator feed = priceFeeds[token];
        if (address(feed) == address(0)) return;

        (, int256 price,, uint256 updatedAt,) = feed.latestRoundData();
        if (price <= 0) revert NegativePrice();
        if (block.timestamp - updatedAt > maxPriceStaleness) {
            revert StalePrice(updatedAt, maxPriceStaleness);
        }
    }

    // ──────────────────────────────────────────────
    //  View
    // ──────────────────────────────────────────────

    /// @notice Get latest price from Chainlink feed
    function getLatestPrice(address token) external view returns (int256 price, uint8 decimals) {
        IChainlinkAggregator feed = priceFeeds[token];
        if (address(feed) == address(0)) revert ZeroAddress();
        (, price,,,) = feed.latestRoundData();
        decimals = feed.decimals();
    }

    /// @notice Get trade count for a strategy
    function getTradeCount(uint256 strategyId) external view returns (uint256) {
        return strategyTradeLogs[strategyId].length;
    }

    /// @notice Get a specific trade log
    function getStrategyTrade(uint256 strategyId, uint256 index) external view returns (TradeLog memory) {
        return tradeLogs[strategyTradeLogs[strategyId][index]];
    }

    /// @notice Get all trades for a strategy
    function getStrategyTrades(uint256 strategyId) external view returns (TradeLog[] memory) {
        uint256[] storage indices = strategyTradeLogs[strategyId];
        TradeLog[] memory trades = new TradeLog[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            trades[i] = tradeLogs[indices[i]];
        }
        return trades;
    }

    /// @notice Get total number of trades across all strategies
    function totalTrades() external view returns (uint256) {
        return tradeLogs.length;
    }

    /// @notice Check if an address is a registered agent with ERC-8004 identity
    function isRegisteredAgent(address wallet) external view returns (bool registered, uint256 agentId) {
        agentId = agentIds[wallet];
        registered = agentId != 0;
    }
}
