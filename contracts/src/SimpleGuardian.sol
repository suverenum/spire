// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleGuardian
/// @notice On-chain spending guardrails for AI agents with owner approval flow.
///         Payments within limits execute immediately. Over-limit payments create
///         proposals that the owner can approve or reject.

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SimpleGuardian {
    address public immutable owner;
    address public immutable agent;

    uint256 public maxPerTx;
    uint256 public dailyLimit;
    uint256 public spendingCap;
    uint256 public totalSpent;
    uint256 public spentToday;
    uint256 public lastResetDay;

    mapping(address => bool) public allowedRecipients;
    mapping(address => bool) public allowedTokens;

    // ─── Approval Queue ────────────────────────────────────────────
    struct Proposal {
        address token;
        address to;
        uint256 amount;
        uint8 status; // 0 = pending, 1 = approved, 2 = rejected
        uint256 createdAt;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    // ─── Events ────────────────────────────────────────────────────
    event PaymentExecuted(address indexed token, address indexed to, uint256 amount);
    event PaymentProposed(uint256 indexed proposalId, address indexed token, address indexed to, uint256 amount);
    event PaymentApproved(uint256 indexed proposalId, address indexed token, address indexed to, uint256 amount);
    event PaymentRejected(uint256 indexed proposalId);
    event LimitsUpdated(uint256 maxPerTx, uint256 dailyLimit);
    event RecipientRemoved(address indexed recipient);
    event TokenRemoved(address indexed token);
    event Withdrawn(address indexed token, uint256 amount);

    modifier onlyAgent() {
        require(msg.sender == agent, "Not agent");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner, address _agent, uint256 _maxPerTx, uint256 _dailyLimit, uint256 _spendingCap) {
        owner = _owner;
        agent = _agent;
        maxPerTx = _maxPerTx;
        dailyLimit = _dailyLimit;
        spendingCap = _spendingCap;
        lastResetDay = block.timestamp / 1 days;
    }

    function addRecipient(address r) external onlyOwner {
        allowedRecipients[r] = true;
    }

    function addToken(address t) external onlyOwner {
        allowedTokens[t] = true;
    }

    function removeRecipient(address r) external onlyOwner {
        allowedRecipients[r] = false;
        emit RecipientRemoved(r);
    }

    function removeToken(address t) external onlyOwner {
        allowedTokens[t] = false;
        emit TokenRemoved(t);
    }

    function updateLimits(uint256 _maxPerTx, uint256 _dailyLimit) external onlyOwner {
        maxPerTx = _maxPerTx;
        dailyLimit = _dailyLimit;
        emit LimitsUpdated(_maxPerTx, _dailyLimit);
    }

    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit Withdrawn(token, balance);
    }

    /// @notice Execute a payment within limits (reverts if over limits)
    function pay(address token, address to, uint256 amount) external onlyAgent {
        require(allowedTokens[token], "Token not allowed");
        require(allowedRecipients[to], "Recipient not allowed");
        require(amount <= maxPerTx, "Exceeds per-tx limit");

        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            spentToday = 0;
            lastResetDay = today;
        }
        require(spentToday + amount <= dailyLimit, "Daily limit exceeded");
        require(spendingCap == 0 || totalSpent + amount <= spendingCap, "Spending cap exceeded");

        spentToday += amount;
        totalSpent += amount;
        IERC20(token).transfer(to, amount);
        emit PaymentExecuted(token, to, amount);
    }

    /// @notice Propose a payment. If within limits, executes immediately.
    ///         If over limits, creates a proposal for owner approval.
    /// @return proposalId 0 if executed immediately, otherwise the proposal ID
    /// @return executed true if payment was executed immediately
    function proposePay(address token, address to, uint256 amount)
        external
        onlyAgent
        returns (uint256 proposalId, bool executed)
    {
        require(allowedTokens[token], "Token not allowed");
        require(allowedRecipients[to], "Recipient not allowed");

        // Check if within all limits
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            spentToday = 0;
            lastResetDay = today;
        }

        bool withinLimits = amount <= maxPerTx
            && spentToday + amount <= dailyLimit
            && (spendingCap == 0 || totalSpent + amount <= spendingCap);

        if (withinLimits) {
            // Execute immediately
            spentToday += amount;
            totalSpent += amount;
            IERC20(token).transfer(to, amount);
            emit PaymentExecuted(token, to, amount);
            return (0, true);
        }

        // Over limits — create proposal for owner approval
        proposalCount++;
        proposals[proposalCount] = Proposal({
            token: token,
            to: to,
            amount: amount,
            status: 0,
            createdAt: block.timestamp
        });

        emit PaymentProposed(proposalCount, token, to, amount);
        return (proposalCount, false);
    }

    /// @notice Owner approves and executes a pending payment (bypasses limits)
    function approvePay(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        require(p.status == 0, "Not pending");
        require(p.amount > 0, "Invalid proposal");

        p.status = 1;
        totalSpent += p.amount;
        IERC20(p.token).transfer(p.to, p.amount);
        emit PaymentApproved(proposalId, p.token, p.to, p.amount);
    }

    /// @notice Owner rejects a pending payment
    function rejectPay(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        require(p.status == 0, "Not pending");
        require(p.amount > 0, "Invalid proposal");

        p.status = 2;
        emit PaymentRejected(proposalId);
    }
}
