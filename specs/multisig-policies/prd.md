# PRD: Multisig with Approval Policies

## 1. Meta Information

- **Created Date:** 2026-03-18
- **Epic:** Multisig Approval Policies
- **Depends on:** [Multi-Account Management](../multi-accounts/prd.md), [tempo-multisig contracts + SDK](../../tempo-multisig/)

## 2. What

Add multisig approval policies to Goldhord treasury accounts. Any account can be upgraded to a multisig wallet with configurable guard policies that control when transactions require multi-party approval. A per-wallet guard contract enforces two policy types: **threshold by amount** (transfers above X require M-of-N confirmations) and **allowlist** (only send to pre-approved addresses). The base multisig threshold is set to 1-of-N, and the guard contract is the real policy engine — it blocks execution until the configured conditions are met.

## 3. Motivation

Enterprise treasuries need approval workflows. A CFO shouldn't have to approve every $50 vendor payment, but a $500k transfer to a new address absolutely needs multiple sign-offs. Today, Goldhord accounts are single-signer EOA wallets — anyone with the passkey can move any amount to any address. This is fine for small operations but unacceptable for enterprise treasury management.

Approval policies solve this by making the level of friction proportional to the risk:
- Routine payments to known vendors: single signer, instant
- Large transfers to approved addresses: 2-of-3 approval
- Any transfer to a new address: requires allowlist addition first (which itself needs approval)

## 4. Key Decisions

### Guard Contract Per Wallet (Not Shared Singleton)

Each multisig wallet deploys its own `PolicyGuard` contract with its own policy storage. No shared state between wallets.

**Why isolated over shared:**
- Simpler to reason about — one wallet, one guard, one set of policies
- No cross-wallet interference or storage collision risks
- Guard can be upgraded per-wallet without affecting others
- Slightly more gas on deployment, but deployment is a one-time cost

### Base Threshold 1-of-N, Guard Enforces Higher

The `MultisigSingleton` threshold is set to 1 (any single owner can submit + execute). The `PolicyGuard` intercepts `executeTransaction` and blocks execution unless the transaction meets the configured policy requirements.

**Why not modify the singleton:**
- Zero changes to audited, deployed, tested contract
- Guard is the policy engine — threshold becomes a policy parameter, not a contract constant
- Different transaction types can have different effective thresholds
- Policies can be updated without touching the core multisig logic

**How it works:**
1. Owner submits transaction → auto-confirmed (count = 1)
2. Owner calls `executeTransaction`
3. Singleton calls `guard.checkTransaction(txId, to, value, data, numConfirmations)`
4. Guard evaluates policies:
   - Is `to` on the allowlist? If not → revert
   - Is `value` above the threshold amount? If yes → require M confirmations
   - Does `numConfirmations` meet the required threshold? If not → revert
5. If guard doesn't revert → execution proceeds

### Signers Are External Addresses

Treasury admin adds signer Tempo addresses directly. Goldhord remains single-tenant per treasury — signers manage their own wallets/keys externally. No invite system, no multi-user auth.

**Implications:**
- Admin enters signer addresses in the Goldhord UI
- Signers interact with the multisig via their own tooling (their own Goldhord treasury, CLI, or direct contract calls)
- Goldhord shows pending transactions and confirmation status, but only the treasury admin sees the full management UI
- The admin's own Tempo address is always included as an owner

### Two V1 Policy Types

#### Policy 1: Threshold by Amount

Configurable per-wallet. Defines tiers of approval requirements based on transfer value.

```
Example configuration:
  Tier 1: value <= $10,000  → 1 confirmation (any single signer)
  Tier 2: value >  $10,000  → 3 confirmations (e.g., 3-of-5 signers)
```

- Values are denominated in the account's token (stablecoins = USD equivalent)
- Guard reads `numConfirmations` from the multisig and compares against the tier's required count
- Multiple tiers supported (e.g., <$10k = 1, $10k-$100k = 2, >$100k = 3)
- Tier configuration is stored in the guard contract, updated via multisig self-call

#### Policy 2: Allowlist

Configurable per-wallet. Only addresses on the allowlist can receive transfers.

```
Example configuration:
  Allowlist: [0xVendorA, 0xVendorB, 0xPayroll]
  Self-calls: always allowed (owner management, policy changes)
```

- Guard checks `to` address against the allowlist mapping
- Self-calls (to = multisig wallet address) are always permitted — this is how owners and policies are managed
- Adding/removing allowlist entries is done via multisig self-call (so it goes through the approval flow itself)
- Allowlist can be disabled entirely (all addresses permitted, only threshold policy active)

### No Singleton Contract Changes

The existing `MultisigSingleton` needs exactly one addition: a **guard slot** — a storage variable holding the guard contract address, with a `setGuard(address)` function callable only via self-call (`onlySelf` modifier). The guard is called in `executeTransaction` before the external call.

This is the minimal change to the singleton:
```solidity
address public guard;

function setGuard(address _guard) external onlySelf {
    guard = _guard;
    emit GuardChanged(_guard);
}

// In executeTransaction, before the external call:
if (guard != address(0)) {
    IGuard(guard).checkTransaction(txId, txn.to, txn.value, txn.data, txn.numConfirmations);
}
```

### Multisig Accounts Coexist with EOA Accounts

A treasury can have a mix of EOA accounts (single-signer, current behavior) and multisig accounts. The `accounts` table gets a `walletType` discriminator. The UI shows different flows based on wallet type — multisig accounts show pending approvals, signer lists, and policy configuration.

## 5. Contracts

### PolicyGuard.sol

Per-wallet guard contract that enforces approval policies.

**Storage:**
```solidity
address public multisig;              // The wallet this guard protects
bool public allowlistEnabled;         // Whether allowlist is active

// Threshold tiers: sorted by maxValue ascending
struct Tier {
    uint256 maxValue;                 // Up to this value (inclusive)
    uint256 requiredConfirmations;    // Need this many confirmations
}
Tier[] public tiers;                  // Last tier covers everything above
uint256 public defaultConfirmations;  // Fallback if value exceeds all tiers

// Allowlist
mapping(address => bool) public allowlisted;
```

**Functions:**
```solidity
// Called by MultisigSingleton before execution
function checkTransaction(
    uint256 txId,
    address to,
    uint256 value,
    bytes calldata data,
    uint256 numConfirmations
) external view;

// Configuration (callable only by the multisig via self-call)
function setTiers(Tier[] calldata _tiers, uint256 _defaultConfirmations) external;
function setAllowlistEnabled(bool _enabled) external;
function addToAllowlist(address _address) external;
function removeFromAllowlist(address _address) external;
function addToAllowlistBatch(address[] calldata _addresses) external;
```

**Guard Logic in `checkTransaction`:**
1. If `to == multisig` → allow (self-calls always pass)
2. If `allowlistEnabled && !allowlisted[to]` → revert `NotAllowlisted(to)`
3. Determine required confirmations from tiers based on `value`
4. If `numConfirmations < requiredConfirmations` → revert `InsufficientConfirmations(have, need)`
5. Otherwise → return (allow execution)

### PolicyGuardFactory.sol

Deploys guard contracts for multisig wallets.

```solidity
function createGuard(
    address multisig,
    Tier[] calldata tiers,
    uint256 defaultConfirmations,
    bool allowlistEnabled,
    address[] calldata initialAllowlist
) external returns (address guard);
```

## 6. SDK Extensions

Add to `@tempo-multisig/sdk`:

```typescript
// Guard deployment
createPolicyGuard(publicClient, walletClient, factoryAddress, params): Promise<Address>

// Guard configuration (encode calldata for multisig self-call)
encodeSetTiers(tiers, defaultConfirmations): Hex
encodeSetAllowlistEnabled(enabled): Hex
encodeAddToAllowlist(address): Hex
encodeRemoveFromAllowlist(address): Hex
encodeAddToAllowlistBatch(addresses): Hex
encodeSetGuard(guardAddress): Hex

// Guard queries
getGuardAddress(publicClient, walletAddress): Promise<Address>
getGuardPolicies(publicClient, guardAddress): Promise<PolicyConfig>
isAllowlisted(publicClient, guardAddress, address): Promise<boolean>
getRequiredConfirmations(publicClient, guardAddress, value): Promise<bigint>

// Types
interface Tier { maxValue: bigint; requiredConfirmations: number }
interface PolicyConfig {
    tiers: Tier[];
    defaultConfirmations: number;
    allowlistEnabled: boolean;
}
```

## 7. Database Changes

### New columns on `accounts`

```typescript
accounts: {
    // ... existing fields
    walletType: "eoa" | "multisig"   // default "eoa"
}
```

### New tables

```typescript
multisigConfigs: {
    id: uuid (PK)
    accountId: uuid (FK → accounts, unique)
    guardAddress: text              // PolicyGuard contract address
    owners: text[]                  // Signer addresses (JSON array)
    // Policy config cached from chain for display (source of truth is on-chain)
    tiersJson: jsonb                // Cached tier config
    allowlistEnabled: boolean
    createdAt: timestamp
    updatedAt: timestamp
}

multisigTransactions: {
    id: uuid (PK)
    accountId: uuid (FK → accounts)
    onChainTxId: bigint             // Transaction ID in multisig contract
    to: text
    value: text                     // bigint as string
    data: text                      // hex calldata
    requiredConfirmations: integer  // From guard policy at submission time
    currentConfirmations: integer   // Updated on confirm/revoke
    executed: boolean
    executedAt: timestamp?
    createdAt: timestamp
}

multisigConfirmations: {
    id: uuid (PK)
    multisigTransactionId: uuid (FK → multisigTransactions)
    signerAddress: text
    confirmedAt: timestamp
}
```

## 8. Domain: `domain/multisig/`

### Structure

```
domain/multisig/
├── actions/
│   ├── create-multisig-account.ts    # Deploy wallet + guard, persist config
│   ├── sync-multisig-state.ts        # Sync on-chain state to DB cache
│   ├── submit-transaction.ts         # Submit tx to multisig (server action)
│   └── manage-policies.ts            # Encode policy change txs
├── components/
│   ├── create-multisig-form.tsx      # Account name, token, signers, policies
│   ├── multisig-account-badge.tsx    # Visual indicator on account cards
│   ├── pending-transactions.tsx      # List of pending approvals
│   ├── transaction-approval-card.tsx # Single pending tx with confirm/execute
│   ├── signers-list.tsx              # Current owners with add/remove
│   ├── policy-config.tsx             # Tier + allowlist configuration UI
│   └── allowlist-manager.tsx         # Add/remove allowlisted addresses
├── hooks/
│   ├── use-create-multisig.ts        # Deploy wallet + guard + persist
│   ├── use-submit-multisig-tx.ts     # Submit transaction
│   ├── use-confirm-transaction.ts    # Confirm pending tx
│   ├── use-execute-transaction.ts    # Execute approved tx
│   ├── use-revoke-confirmation.ts    # Revoke confirmation
│   ├── use-pending-transactions.ts   # Query pending txs
│   ├── use-multisig-config.ts        # Query wallet config (owners, policies)
│   └── use-policy-mutations.ts       # Tier + allowlist changes
└── queries/
    ├── get-multisig-config.ts        # DB + on-chain config
    └── get-pending-transactions.ts   # DB cache of pending txs
```

### Account Creation Flow

1. Admin fills form: account name, token, signer addresses, policy tiers, allowlist
2. Server action validates inputs (name uniqueness, valid addresses, valid tiers)
3. Client deploys multisig wallet via `createMultisigWallet()` with threshold=1, owners=[admin + signers]
4. Client deploys `PolicyGuard` via `createPolicyGuard()` with configured tiers + allowlist
5. Client calls `setGuard(guardAddress)` on the multisig (self-call: submit + execute since threshold=1 and admin is owner)
6. Server action `finalizeMultisigAccountCreate()` persists to DB with walletType="multisig"

### Payment Flow (Multisig Account)

**Submitting a payment:**
1. Admin enters recipient + amount in send form
2. If account is multisig → submit transaction to multisig contract (not direct transfer)
3. Transaction appears in "Pending Approvals" with confirmation count
4. If guard allows single-signer execution (small amount, allowlisted address) → auto-execute

**Approval flow:**
1. Other signers see pending transaction (via their own tooling or Goldhord)
2. Each signer calls `confirmTransaction(txId)` on the multisig
3. Goldhord polls/syncs confirmation count
4. When confirmations meet guard requirements → any signer can call `executeTransaction`
5. Guard's `checkTransaction` passes → transaction executes

### Policy Management Flow

Policy changes are themselves multisig transactions (self-calls):
1. Admin configures new policy in Goldhord UI
2. Goldhord encodes the policy change as calldata (e.g., `encodeSetTiers(...)`)
3. Submits as a multisig transaction with `to=walletAddress`
4. Policy change goes through the same approval flow
5. Once executed, guard contract is updated on-chain
6. Goldhord syncs new policy config to DB cache

## 9. UI Changes

### Account Cards (Dashboard)

Multisig accounts show additional info:
- Badge: "Multisig 3/5" (confirmations/owners)
- Pending count: "2 pending approvals"
- Clicking navigates to account detail with approval queue

### Account Detail Page (Multisig)

New tabs for multisig accounts:
- **Activity** — transaction history (existing)
- **Pending** — transactions awaiting approval, with confirm/execute buttons
- **Signers** — list of owners with add/remove (via multisig self-call)
- **Policies** — tier configuration + allowlist management

### Send Payment Form

When sending from a multisig account:
- Form shows "Submit for Approval" instead of "Send"
- After submission, shows confirmation status: "1/3 confirmations — waiting for approval"
- If guard allows instant execution (under threshold, allowlisted) → shows "Sent" directly

### Create Account Form

Extended with optional multisig toggle:
- Toggle: "Enable multisig approval"
- If enabled: signer address inputs, tier configuration, allowlist toggle
- Preview: shows the resulting policy ("Transfers under $10k: 1 signer. Over $10k: 3-of-5 signers.")

## 10. What We're NOT Building (V1 Scope)

| Feature | Why not V1 |
|---------|-----------|
| Multi-user auth / invite system | Signers use their own wallets, Goldhord stays single-tenant |
| Timelock policies | Useful but not essential for launch |
| Daily/monthly spending limits | Can be added as a guard extension in V2 |
| Role-based signer tiers | Adds IAM complexity, defer to V2 |
| Token restriction policies | Low value, accounts already hold one token |
| Off-chain signatures (EIP-712) | Gasless proposal is nice-to-have, not must-have |
| Transaction batching (MultiSend) | Useful for bulk payroll, defer to V2 |
| Guard upgrades | V1 guards are immutable; redeploy if policy structure changes |
| Notification system | Signers check pending txs manually or via polling |

## 11. Success Criteria

- [ ] Admin can create a multisig account with N signers and configured policies
- [ ] Single-signer transactions to allowlisted addresses under the threshold execute instantly
- [ ] Large transfers require M-of-N confirmations before execution
- [ ] Transfers to non-allowlisted addresses are blocked by the guard
- [ ] Policy changes go through the multisig approval flow
- [ ] Adding/removing signers goes through the multisig approval flow
- [ ] Allowlist additions/removals go through the multisig approval flow
- [ ] Multisig and EOA accounts coexist in the same treasury
- [ ] Dashboard shows pending approval count for multisig accounts
- [ ] Guard contract correctly enforces tier thresholds and allowlist

## 12. Implementation Order

### Phase 1: Contracts + SDK
1. Add guard slot to `MultisigSingleton` (`setGuard`, `checkTransaction` hook)
2. Build `PolicyGuard.sol` (threshold tiers + allowlist)
3. Build `PolicyGuardFactory.sol`
4. Full test coverage (unit + integration + fuzz)
5. Deploy to Tempo testnet
6. Extend `@tempo-multisig/sdk` with guard functions

### Phase 2: Database + Domain
7. Add `walletType` to accounts, create `multisigConfigs` + `multisigTransactions` + `multisigConfirmations` tables
8. Build `domain/multisig/` actions, hooks, queries
9. Implement multisig account creation flow (wallet + guard deployment + DB persistence)

### Phase 3: UI
10. Multisig account creation form
11. Pending approvals UI (transaction list, confirm/execute buttons)
12. Signer management UI
13. Policy configuration UI (tiers + allowlist)
14. Update send payment form for multisig accounts
15. Dashboard badges and pending counts

### Phase 4: Integration + Polish
16. State sync (poll chain for confirmation updates, cache in DB)
17. Optimistic updates for confirm/execute actions
18. Error handling (guard reverts → user-friendly messages)
19. E2E tests (full approval flow from submit to execution)
