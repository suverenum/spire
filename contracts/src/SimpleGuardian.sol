// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title SimpleGuardian
/// @notice On-chain spending guardrails for AI agents with owner approval flow.
///         Payments within limits execute immediately. Over-limit payments create
///         proposals that the owner can approve or reject.

contract SimpleGuardian {
    using SafeERC20 for IERC20;

    // ─── Custom Errors (cheaper than revert strings) ─────────────
    error NotAgent();
    error NotOwner();
    error ZeroAddress();
    error TokenNotAllowed(address token);
    error RecipientNotAllowed(address recipient);
    error ExceedsPerTxLimit(uint256 amount, uint256 maxPerTx);
    error DailyLimitExceeded(uint256 newSpentToday, uint256 dailyLimit);
    error SpendingCapExceeded(uint256 newTotalSpent, uint256 spendingCap);
    error NotPending(uint256 id);
    error InvalidProposal(uint256 id);
    error ContractPaused();
    error LimitsInvariantViolation();
    error PendingQueueFull(uint256 maxPending);
    error RenounceDisabled();

    // ─── State ───────────────────────────────────────────────────
    address public owner;
    address public agent;
    address public pendingOwner;

    uint256 public maxPerTx;
    uint256 public dailyLimit;
    uint256 public spendingCap;
    uint256 public totalSpent;
    uint256 public spentToday;
    uint256 public lastResetDay;

    mapping(address => bool) public allowedRecipients;
    mapping(address => bool) public allowedTokens;

    bool public paused;

    // ─── Approval Queue ─────────────────────────────────────────
    struct Proposal {
        address token;
        address to;
        uint256 amount;
        uint8 status; // 0 = pending, 1 = approved, 2 = rejected
        uint256 createdAt;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    uint256 public pendingCount;
    uint256 public constant MAX_PENDING = 32;

    // ─── Events ─────────────────────────────────────────────────
    event PaymentExecuted(address indexed token, address indexed to, uint256 amount);
    event PaymentProposed(uint256 indexed proposalId, address indexed token, address indexed to, uint256 amount);
    event PaymentApproved(uint256 indexed proposalId, address indexed token, address indexed to, uint256 amount);
    event PaymentRejected(uint256 indexed proposalId);
    event LimitsUpdated(uint256 maxPerTx, uint256 dailyLimit, uint256 spendingCap);
    event RecipientAdded(address indexed recipient);
    event RecipientRemoved(address indexed recipient);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Withdrawn(address indexed token, uint256 amount);
    event PausedStateChanged(bool paused);
    event AgentUpdated(address indexed oldAgent, address indexed newAgent);
    event OwnershipTransferStarted(address indexed oldOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ─── Modifiers ──────────────────────────────────────────────
    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────
    constructor(
        address _owner,
        address _agent,
        uint256 _maxPerTx,
        uint256 _dailyLimit,
        uint256 _spendingCap,
        address[] memory _recipients,
        address[] memory _tokens
    ) {
        if (_owner == address(0) || _agent == address(0)) revert ZeroAddress();
        _validateLimits(_maxPerTx, _dailyLimit, _spendingCap);
        owner = _owner;
        agent = _agent;
        maxPerTx = _maxPerTx;
        dailyLimit = _dailyLimit;
        spendingCap = _spendingCap;
        lastResetDay = block.timestamp / 1 days;
        for (uint256 i = 0; i < _recipients.length; i++) {
            address r = _recipients[i];
            if (r == address(0)) revert ZeroAddress();
            allowedRecipients[r] = true;
            emit RecipientAdded(r);
        }
        for (uint256 i = 0; i < _tokens.length; i++) {
            address t = _tokens[i];
            if (t == address(0)) revert ZeroAddress();
            allowedTokens[t] = true;
            emit TokenAdded(t);
        }
    }

    // ─── Allowlist Management ───────────────────────────────────
    function addRecipient(address r) external onlyOwner {
        if (r == address(0)) revert ZeroAddress();
        allowedRecipients[r] = true;
        emit RecipientAdded(r);
    }

    function addToken(address t) external onlyOwner {
        if (t == address(0)) revert ZeroAddress();
        allowedTokens[t] = true;
        emit TokenAdded(t);
    }

    function removeRecipient(address r) external onlyOwner {
        allowedRecipients[r] = false;
        emit RecipientRemoved(r);
    }

    function removeToken(address t) external onlyOwner {
        allowedTokens[t] = false;
        emit TokenRemoved(t);
    }

    // ─── Admin Operations ───────────────────────────────────────
    function updateLimits(uint256 _maxPerTx, uint256 _dailyLimit, uint256 _spendingCap) external onlyOwner {
        _validateLimits(_maxPerTx, _dailyLimit, _spendingCap);
        maxPerTx = _maxPerTx;
        dailyLimit = _dailyLimit;
        spendingCap = _spendingCap;
        emit LimitsUpdated(_maxPerTx, _dailyLimit, _spendingCap);
    }

    function pause() external onlyOwner {
        paused = true;
        emit PausedStateChanged(true);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit PausedStateChanged(false);
    }

    function setAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        address old = agent;
        agent = newAgent;
        emit AgentUpdated(old, newAgent);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotOwner();
        address old = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(old, owner);
    }

    function renounceOwnership() external pure {
        revert RenounceDisabled();
    }

    // ─── Fund Management ────────────────────────────────────────
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance == 0) revert();
        IERC20(token).safeTransfer(owner, balance);
        emit Withdrawn(token, balance);
    }

    // ─── Payments ───────────────────────────────────────────────
    /// @notice Execute a payment within limits (reverts if over limits)
    function pay(address token, address to, uint256 amount) external onlyAgent whenNotPaused {
        if (!allowedTokens[token]) revert TokenNotAllowed(token);
        if (!allowedRecipients[to]) revert RecipientNotAllowed(to);
        if (amount > maxPerTx) revert ExceedsPerTxLimit(amount, maxPerTx);

        _resetDayIfNeeded();
        _enforceDailyAndCap(amount);

        spentToday += amount;
        totalSpent += amount;
        IERC20(token).safeTransfer(to, amount);
        emit PaymentExecuted(token, to, amount);
    }

    /// @notice Propose a payment. If within per-tx limit, executes immediately (still respects daily/cap).
    ///         If over per-tx limit, creates a proposal for owner approval.
    function proposePay(address token, address to, uint256 amount)
        external
        onlyAgent
        whenNotPaused
        returns (uint256 proposalId, bool executed)
    {
        if (!allowedTokens[token]) revert TokenNotAllowed(token);
        if (!allowedRecipients[to]) revert RecipientNotAllowed(to);

        _resetDayIfNeeded();

        // Execute immediately if within per-tx limit; still respects daily/cap
        if (amount <= maxPerTx) {
            _enforceDailyAndCap(amount);
            spentToday += amount;
            totalSpent += amount;
            IERC20(token).safeTransfer(to, amount);
            emit PaymentExecuted(token, to, amount);
            return (0, true);
        }

        // Above per-tx threshold → proposal, but only if it can still fit daily/cap
        _enforceDailyAndCap(amount);
        if (pendingCount >= MAX_PENDING) revert PendingQueueFull(MAX_PENDING);

        proposalCount++;
        pendingCount++;
        proposals[proposalCount] =
            Proposal({token: token, to: to, amount: amount, status: 0, createdAt: block.timestamp});

        emit PaymentProposed(proposalCount, token, to, amount);
        return (proposalCount, false);
    }

    /// @notice Owner approves and executes a pending payment (enforces daily/cap)
    function approvePay(uint256 proposalId) external onlyOwner whenNotPaused {
        Proposal storage p = proposals[proposalId];
        if (proposalId == 0 || p.amount == 0) revert InvalidProposal(proposalId);
        if (p.status != 0) revert NotPending(proposalId);

        _resetDayIfNeeded();
        _enforceDailyAndCap(p.amount);

        p.status = 1;
        pendingCount--;
        spentToday += p.amount;
        totalSpent += p.amount;
        IERC20(p.token).safeTransfer(p.to, p.amount);
        emit PaymentApproved(proposalId, p.token, p.to, p.amount);
    }

    /// @notice Owner rejects a pending payment
    function rejectPay(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        if (proposalId == 0 || p.amount == 0) revert InvalidProposal(proposalId);
        if (p.status != 0) revert NotPending(proposalId);

        p.status = 2;
        pendingCount--;
        emit PaymentRejected(proposalId);
    }

    // ─── Internal Helpers ───────────────────────────────────────
    function _resetDayIfNeeded() internal {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            spentToday = 0;
            lastResetDay = today;
        }
    }

    function _enforceDailyAndCap(uint256 amount) internal view {
        if (spentToday + amount > dailyLimit) revert DailyLimitExceeded(spentToday + amount, dailyLimit);
        if (spendingCap != 0 && totalSpent + amount > spendingCap) {
            revert SpendingCapExceeded(totalSpent + amount, spendingCap);
        }
    }

    function _validateLimits(uint256 _max, uint256 _daily, uint256 _cap) internal pure {
        if (_max == 0 || _daily == 0 || _cap == 0) revert LimitsInvariantViolation();
        if (_max > _daily) revert LimitsInvariantViolation();
        if (_daily > _cap) revert LimitsInvariantViolation();
    }
}
