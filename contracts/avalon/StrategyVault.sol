// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StrategyVault
 * @notice Holds user deposits (USDC) that autonomous AI agents trade on behalf of users.
 *         Each user's balance is tracked individually. The vault can be paused in an
 *         emergency, blocking all deposits and withdrawals until the owner unpauses.
 *
 * Security decisions:
 * - Ownable: only the deployer (Avalon platform) can pause/unpause and authorize agents.
 * - ReentrancyGuard: prevents re-entrancy on deposit/withdraw since they transfer ERC-20 tokens.
 * - Pausable: emergency stop — users can't deposit/withdraw while paused, protecting funds
 *   if an agent misbehaves or a vulnerability is discovered.
 * - SafeERC20: handles non-standard ERC-20 return values (USDT, etc.) safely.
 * - No raw ETH handling: USDC-only vault avoids fallback/receive complexity.
 */
contract StrategyVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- State ---

    /// @notice The deposit token (USDC on Avalanche Fuji/Mainnet)
    IERC20 public immutable depositToken;

    /// @notice Per-user deposited balances (not including unrealized PnL)
    mapping(address => uint256) public balances;

    /// @notice Total deposits across all users
    uint256 public totalDeposits;

    /// @notice Addresses authorized to execute trades on behalf of users (AI agents)
    mapping(address => bool) public authorizedAgents;

    /// @notice Maximum a single user can deposit (prevents concentration risk)
    uint256 public maxDepositPerUser;

    // --- Events ---

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event AgentAuthorized(address indexed agent);
    event AgentRevoked(address indexed agent);
    event MaxDepositUpdated(uint256 newMax);

    // --- Errors ---

    /// @dev Prefer custom errors over require strings — saves gas on revert
    error ZeroAmount();
    error InsufficientBalance(uint256 requested, uint256 available);
    error ExceedsMaxDeposit(uint256 amount, uint256 max);
    error NotAuthorizedAgent(address caller);

    // --- Modifiers ---

    /// @notice Restricts function to authorized AI agents only
    modifier onlyAgent() {
        if (!authorizedAgents[msg.sender]) revert NotAuthorizedAgent(msg.sender);
        _;
    }

    // --- Constructor ---

    /**
     * @param _depositToken Address of the USDC token contract
     * @param _maxDepositPerUser Initial max deposit cap per user (in token decimals)
     *
     * Security: depositToken is immutable — can't be changed after deploy,
     * preventing a malicious owner from swapping to a fake token.
     */
    constructor(
        address _depositToken,
        uint256 _maxDepositPerUser
    ) Ownable(msg.sender) {
        depositToken = IERC20(_depositToken);
        maxDepositPerUser = _maxDepositPerUser;
    }

    // --- User Functions ---

    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit (in token decimals, e.g. 1000000 = 1 USDC)
     *
     * Security:
     * - nonReentrant: prevents callback attacks during safeTransferFrom
     * - whenNotPaused: blocks deposits during emergency
     * - Checks-Effects-Interactions pattern: update state before external call
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] + amount > maxDepositPerUser) {
            revert ExceedsMaxDeposit(amount, maxDepositPerUser);
        }

        // Effects first (CEI pattern)
        balances[msg.sender] += amount;
        totalDeposits += amount;

        // Interaction last
        depositToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw USDC from the vault
     * @param amount Amount of USDC to withdraw
     *
     * Security:
     * - nonReentrant: prevents re-entrancy during token transfer
     * - whenNotPaused: blocks withdrawals during emergency (controversial but necessary —
     *   if an agent is compromised, we need to freeze funds while investigating.
     *   The owner can unpause to allow withdrawals once safe.)
     * - Balance check before state change prevents underflow
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }

        // Effects first (CEI pattern)
        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        // Interaction last
        depositToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // --- Agent Functions ---

    /**
     * @notice Returns the vault's total token balance (may differ from totalDeposits if agents generated PnL)
     * @dev Agents use this to know available liquidity for trades
     */
    function vaultBalance() external view returns (uint256) {
        return depositToken.balanceOf(address(this));
    }

    // --- Owner Functions ---

    /**
     * @notice Emergency stop — pauses all deposits and withdrawals
     * @dev Only owner can call. Use when an agent is compromised or a bug is found.
     */
    function emergencyStop() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume normal operations after emergency
     */
    function resume() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Authorize an AI agent wallet to execute trades
     * @param agent The agent's wallet address (EOA or smart wallet)
     */
    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
        emit AgentAuthorized(agent);
    }

    /**
     * @notice Revoke an agent's trading authorization
     * @param agent The agent's wallet address
     */
    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
        emit AgentRevoked(agent);
    }

    /**
     * @notice Update the per-user deposit cap
     * @param newMax New maximum deposit amount
     */
    function setMaxDepositPerUser(uint256 newMax) external onlyOwner {
        maxDepositPerUser = newMax;
        emit MaxDepositUpdated(newMax);
    }
}
