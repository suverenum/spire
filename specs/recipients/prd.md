# PRD: Recipients (Contact Book)

## 1. Meta Information

- **Created Date:** 2026-03-17
- **Epic:** Recipients
- **Depends on:** [Multi-Account Management](../multi-accounts/prd.md)

## 2. What

Add a contact book ("Recipients") where users save on-chain addresses with nicknames. Recipients appear in the send flow for quick selection, in transaction history as named counterparties, and on a dedicated management page with per-recipient turnover stats.

## 3. Motivation

Enterprise treasury teams send to the same counterparties repeatedly — vendors, subsidiaries, payroll addresses, exchanges. Without a contact book, they copy-paste raw `0x` addresses every time and can't tell who `0x9f3a…` is when reviewing transaction history. Recipients solve this:

- **Speed:** Pick a name instead of pasting an address
- **Safety:** Reduce copy-paste errors on high-value transfers
- **Visibility:** Transaction history shows "Acme Corp" instead of "0x9f3a…"
- **Analytics:** See how much you've sent to each counterparty over time

## 4. Key Decisions

### Recipients Are Per-Treasury

Each treasury has its own recipient list. Recipients are not shared across treasuries. This matches the mental model — different treasuries serve different entities with different counterparties.

### Recipients Are DB-Only (Not On-Chain)

Recipient nicknames are stored in the app database, not on-chain. They're display metadata — the chain only knows addresses. This keeps the feature simple and instant (no on-chain transactions for CRUD).

### Unique Address + Unique Nickname

Both address and nickname must be unique within a treasury's recipient list.
- **Duplicate address:** "This address is already saved as [nickname]" — offers to edit
- **Duplicate nickname:** "This name is already used for [address]" — user must pick a different name
- Enforced on both create and edit, with DB-level unique indexes on `(treasury_id, address)` and `(treasury_id, nickname_normalized)`

### Recipients Work Across All Accounts

A recipient is a counterparty address, not tied to a specific account. When sending from any account, the same recipient list is available. Transaction stats aggregate across all accounts.

### Treasury-Owned Addresses Are Not Recipients

Wallet addresses that belong to the current treasury's own accounts are never valid recipients.

- They cannot be saved in the contact book
- They cannot be used in the external send flow
- If the user enters one in a send context, the app blocks submission and points them to the internal transfer flow instead
- Internal transfers and swaps keep using account names, not recipient nicknames

### Recipient Stats Are Cached From Full History

Each recipient shows:
- **Turnover:** total USD value sent to and received from this address
- **Last active:** date of the most recent transaction with this address
- The canonical source is the full merged transaction history across all treasury accounts, not the dashboard's recent transactions list
- The app persists a cached stats snapshot per recipient and refreshes it after transaction sync/invalidation, so the Recipients page and send picker do not trigger a full-history chain scan on open
- When a recipient is created or re-created, the app triggers an immediate backfill for that recipient's cached stats from full history
- Until that backfill completes, the recipient row and picker show a loading state for stats instead of `$0 · never`
- Internal transfers and swaps between treasury-owned wallets do not count toward recipient stats

### Address Validation

All address inputs (add recipient, send form) are validated:
- **Format:** must be `0x` + 40 hex characters
- **Checksum:** if the address contains mixed-case letters, validate EIP-55 checksum to catch single-character typos
- **Treasury-owned address prevention:** cannot save or send to any wallet address that belongs to the current treasury; use internal transfer instead
- Validation runs inline as the user types, blocking submission until valid

### Wallet Activity Check

When sending to an address or adding a recipient, the app performs a non-blocking Tempo activity check. The app treats an address as "verified active" if either of these is true:

- `eth_getTransactionCount > 0` for the address
- At least one supported-token transfer involving the address is found on Tempo

This is a heuristic safety signal, not a full chain scan and not a validity check.

- **Send flow:** if the check succeeds but finds no prior activity, a warning appears: "We couldn't verify prior Tempo activity for this address. Double-check the address." The user can still proceed.
- **Add recipient:** same warning when saving a new recipient and the check succeeds but finds no prior activity
- **Check unavailable:** if the activity check cannot complete because of RPC/network failure, the app does not show the no-activity warning and instead shows a neutral status like "Activity check unavailable" (non-blocking)

### Address Normalization

All addresses are stored lowercase in the DB. Comparison is always case-insensitive. This prevents `0xAbC` and `0xabc` from creating duplicate recipients.

### Nickname Normalization

Nicknames are trimmed before validation and compared case-insensitively for uniqueness within a treasury.

- `"Acme Corp"`, `"acme corp"`, and `"Acme Corp "` are treated as the same nickname
- The app preserves the user's display casing after trimming (for example, stores `"Acme Corp"`, not forced lowercase)
- Uniqueness is enforced both in UI validation and at the DB layer using a normalized nickname value

### Ad-Hoc Creation During Send

When the user enters an address in the send form that isn't in the contact book, the app offers to save it as a new recipient after the transaction succeeds. This is the most natural moment to name a counterparty — you just sent money to them.

## 5. User Stories

### Recipients CRUD

1. As a **user**, I want to add a recipient by entering an address and nickname so that I can quickly send to them later.
2. As a **user**, I want to edit a recipient's nickname so that I can keep my contact book up to date.
3. As a **user**, I want to delete a recipient I no longer need so that my list stays clean.
4. As a **user**, I want to be prevented from adding a duplicate address or nickname so that my contact book has no conflicts.

### Address Safety

5. As a **user**, I want address format and checksum validation when entering an address so that typos are caught immediately.
6. As a **user**, when the app can't verify prior activity for an address, I want a warning so that I can double-check before sending funds to a potentially wrong address.

### Recipients Page

7. As a **user**, I want a dedicated Recipients page listing all saved recipients with nickname, address, turnover, and last active date, sorted by turnover (highest first).
8. As a **user**, when I have no recipients, I want an empty state with a prompt to add my first one.

### Send Flow Integration

9. As a **user**, when I open the send form, I want to pick a recipient from my contact book instead of pasting an address so that sending is faster and safer.
10. As a **user**, I want to search my recipients by name or address in the send form picker so that I can find one quickly.
11. As a **user**, I want the recipient picker to show turnover and last active date per recipient so that I can confirm I'm picking the right one.
12. As a **user**, after a successful send to a new address, I want the app to offer saving it as a recipient so that I can name it for next time.

### Transaction History Integration

13. As a **user**, I want transaction history to show the recipient nickname next to the address (e.g., "To: Acme Corp · 0x9f3a…") so that I can understand my history at a glance.
14. As a **user**, I want the transaction detail page to show the recipient name when the counterparty is a saved recipient.
15. As a **user**, I want a "View Transactions" option in the recipient's `⋯` menu that opens `/transactions` filtered to that address.

### Real-Time Notifications

16. As a **user**, when I receive a payment from a saved recipient, I want the notification to say "Payment received from [nickname]" instead of showing the raw address.

### Navigation

17. As a **user**, I want "Recipients" in the sidebar so that I can access my contact book from any page.

## 6. User Flow

### 6.1. Recipients Page

```
User taps "Recipients" in sidebar
  → Navigates to /recipients
  → Shows list of all saved recipients, sorted by turnover (highest first)
  → Each row shows: nickname, truncated address, turnover, last active
  → Turnover and last active come from the cached recipient stats snapshot
  → "+ Add Recipient" button in header
  → Each row has "⋯" menu: Edit, Delete, View Transactions
```

#### Screen Mockup

**Recipients Page**

```
┌──────────────┬──────────────────────────────┐
│              │                              │
│  Ops Fund    │  Recipients     + Add        │
│              │  ─────────────────────       │
│  Dashboard   │                              │
│  Transactions│  ┌────────────────────────┐  │
│  Accounts    │  │ Acme Corp          ⋯  │  │
│  ● Recipients│  │ 0x9f3a…bc7d            │  │
│  Settings    │  │ $48k · last active 2d ago │  │
│              │  └────────────────────────┘  │
│              │                              │
│              │  ┌────────────────────────┐  │
│              │  │ Payroll Wallet     ⋯  │  │
│              │  │ 0x1a2b…ef01            │  │
│              │  │ $36k · last active 1w ago │  │
│              │  └────────────────────────┘  │
│              │                              │
│              │  ┌────────────────────────┐  │
│  Logout      │  │ EU Vendor Ltd      ⋯  │  │
│              │  │ 0xde4f…8901            │  │
│              │  │ $0 · never    │  │
│              │  └────────────────────────┘  │
│              │                              │
└──────────────┴──────────────────────────────┘
```
> Sorted by turnover (highest first).
> Each row shows nickname, truncated address, turnover, last active.
> "⋯" menu: Edit, Delete, View Transactions.

**Empty State**

```
┌──────────────┬──────────────────────────────┐
│              │                              │
│  Ops Fund    │  Recipients     + Add        │
│              │  ─────────────────────       │
│  Dashboard   │                              │
│  Transactions│                              │
│  Accounts    │     No recipients yet        │
│  ● Recipients│                              │
│  Settings    │     Save addresses you send  │
│              │     to frequently so you can │
│              │     find them quickly.        │
│              │                              │
│              │  ┌─────────────────────────┐ │
│  Logout      │  │  Add your first recipient│ │
│              │  └─────────────────────────┘ │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### 6.2. Add Recipient

```
User taps "+ Add" on Recipients page
  → Dialog with address field and nickname field
  → Address validated inline as user types:
    → Format: 0x + 40 hex chars
    → EIP-55 checksum validation (if mixed-case)
    → Duplicate check against existing addresses and nicknames
    → Treasury-owned account address check
  → If address already exists: inline message "This address is already saved as [nickname]" with option to edit
  → If nickname already exists: inline error "This name is already used for [address]"
  → If the activity check succeeds but finds no prior activity: warning "We couldn't verify prior Tempo activity for this address" (non-blocking)
  → If the activity check is unavailable: show neutral status "Activity check unavailable" (non-blocking)
  → Taps "Save"
  → Recipient appears in list immediately
  → If stats cache does not exist yet, turnover/last-active show a loading state until the immediate backfill completes
```

#### Screen Mockup

**Add Recipient Dialog**

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Add Recipient           │    │
│  │                         │    │
│  │  Address                │    │
│  │  ┌───────────────────┐  │    │
│  │  │ 0x                 │  │    │
│  │  └───────────────────┘  │    │
│  │                         │    │
│  │  Nickname               │    │
│  │  ┌───────────────────┐  │    │
│  │  │ Acme Corp          │  │    │
│  │  └───────────────────┘  │    │
│  │                         │    │
│  │  Cancel          Save   │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Duplicate Address**

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Add Recipient           │    │
│  │                         │    │
│  │  Address                │    │
│  │  ┌───────────────────┐  │    │
│  │  │ 0x9f3a…bc7d        │  │    │
│  │  └───────────────────┘  │    │
│  │  Already saved as       │    │
│  │  "Acme Corp"  Edit →    │    │
│  │                         │    │
│  │        Cancel           │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### 6.3. Edit Recipient

```
User taps "Edit" from ⋯ menu
  → Edit dialog with pre-filled nickname
  → Address shown but not editable (read-only)
  → User updates nickname
  → Nickname validated: duplicate check (trimmed, case-insensitive) against existing recipients
  → If nickname already exists: inline error "This name is already used for [address]"
  → Taps "Save"
  → Name updates everywhere (recipients list, transaction history, send picker)
```

### 6.4. Delete Recipient

```
User taps "Delete" from ⋯ menu
  → Confirmation dialog: "Remove [nickname] from recipients?"
  → User confirms → recipient removed
  → Transaction history reverts to showing raw address for past transactions
```

### 6.5. Send Flow with Recipient Picker

```
User taps "Send" on dashboard or account detail
  → Send form opens with account selector (existing)
  → "To" field has two modes:
    → Type/paste address (existing behavior)
    → Tap recipient icon → opens recipient picker sheet
  → Recipient picker shows:
    → Search bar (name or address)
    → List of recipients sorted by turnover
    → Each row: nickname, truncated address, turnover, last active
    → Stats come from the cached recipient stats snapshot
  → User taps a recipient → address filled in, nickname shown above field
  → If the user edits the address and it no longer matches the selected recipient, the selected recipient state is cleared immediately
  → If the user enters one of the treasury's own account addresses, submission is blocked and the UI points them to internal transfer instead
  → User completes send as normal
```

#### Screen Mockup

**Send Form with Recipient**

```
┌─────────────────────────────────┐
│ ← Send Payment                  │
│─────────────────────────────────│
│                                 │
│  From Account                   │
│  ┌─────────────────────────┐    │
│  │ Main AlphaUSD     ▼     │    │
│  │ $1,000,000 · 0xabc…     │    │
│  └─────────────────────────┘    │
│                                 │
│  To                        📇  │
│  Acme Corp                      │
│  ┌─────────────────────────┐    │
│  │ 0x9f3a…bc7d             │    │
│  └─────────────────────────┘    │
│                                 │
│  Amount                         │
│  ┌─────────────────────────┐    │
│  │ $                       │    │
│  └─────────────────────────┘    │
│  Available: $1,000,000.00       │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Confirm & Send  →    │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> 📇 icon next to "To" opens the recipient picker.
> When a recipient is selected, nickname shows above the address field.
> Address field is still editable (user can override).

**Recipient Picker Sheet**

```
┌─────────────────────────────────┐
│  Select Recipient           ✕   │
│─────────────────────────────────│
│                                 │
│  🔍 Search by name/address      │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Acme Corp               │    │
│  │ 0x9f3a…  $48k · 2d ago   │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ Payroll Wallet           │    │
│  │ 0x1a2b…  $36k · 1w ago   │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ EU Vendor Ltd            │    │
│  │ 0xde4f…  $1.5k · 3w ago  │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Sorted by turnover.
> Each row shows nickname, truncated address, turnover, last active.
> Tapping a row fills the "To" field and dismisses the picker.

### 6.6. Ad-Hoc Save After Send

```
User sends to an address not in the contact book
  → Transaction succeeds
  → Toast: "Payment sent! Save as recipient?"
  → User taps "Save" → inline nickname field appears in toast/dialog
  → User enters name, taps confirm
  → Recipient saved
  → Or user dismisses → no recipient created
```

#### Screen Mockup

**Post-Send Save Prompt**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐    │
│  │ ✓ Payment sent!          │    │
│  │   $250 to 0x9f3a…bc7d   │    │
│  │                         │    │
│  │   Save as recipient?    │    │
│  │  ┌───────────────────┐  │    │
│  │  │ Acme Corp          │  │    │
│  │  └───────────────────┘  │    │
│  │  Dismiss       Save     │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

### 6.7. Transaction History with Recipient Names

```
Transaction list (dashboard, /transactions, account detail)
  → For each transaction, check if from/to address is in recipients
  → If match: show "To: Acme Corp · 0x9f3a…" or "From: Payroll · 0x1a2b…"
  → If no match: show raw address as before
  → Transaction detail page also shows recipient name when counterparty is saved
  → Treasury-internal transfers and swaps continue to render as grouped account-level entries, never as recipient counterparties

Real-time incoming payments:
  → WebSocket detects incoming transfer
  → If sender address matches a saved recipient:
    → Toast: "Payment received from Acme Corp!"
  → If not: "Payment received!" (existing behavior)
```

#### Screen Mockup

**Transaction Row (With Recipient Name)**

```
  ↑ To: Acme Corp · 0x9f3a…  Main AlphaUSD
    -$250 · 5 min ago

  ↓ From: Payroll · 0x1a2b…  Main BetaUSD
    +$500 · 1 hour ago

  ↑ To: 0xde4f…8901  Main AlphaUSD     ← not in recipients
    -$100 · 2 hours ago
```

## 7. Definition of Done

### Recipient CRUD

1. Given the user taps "+ Add" on the Recipients page, When they enter a valid address and nickname and save, Then the recipient appears in the list.
2. Given the user enters a duplicate address, When the dialog detects it, Then it shows the existing recipient name and offers to edit.
2a. Given the user enters a nickname that matches an existing one after trim and case normalization, When the dialog detects it, Then it shows which address already uses that name and blocks save before submission.
3. Given the user taps Edit on a recipient, When they update the nickname and save, Then the name updates everywhere (list, transactions, send picker).
4. Given the user taps Delete on a recipient, When they confirm, Then the recipient is removed and past transactions revert to showing the raw address.
4a. Given the user adds or re-adds a recipient whose address already has matching historical transactions, When the recipient is created, Then the app starts an immediate stats backfill and shows a loading state until turnover and last active are populated from history.

### Address Safety

5. Given the user enters an address, When it has invalid format or fails EIP-55 checksum, Then an inline error is shown and submission is blocked.
6. Given the user enters an address whose activity check completes successfully but finds no nonce and no supported-token transfer history, When the activity check completes, Then a warning "We couldn't verify prior Tempo activity for this address" is shown (does not block).
6a. Given the user enters any of the treasury's account wallet addresses in the send form, Then an inline error blocks submission and points them to the internal transfer flow.
6b. Given the user enters any of the treasury's account wallet addresses in the add-recipient dialog, Then save is blocked and the dialog explains that treasury-owned addresses are managed as accounts, not recipients.
6c. Given the activity check cannot complete because of RPC/network failure, When the user is entering an address, Then the app does not show the no-activity warning and instead shows a neutral non-blocking "Activity check unavailable" status.

### Recipients Page

7. Given the user navigates to Recipients, When the page loads, Then all recipients are listed sorted by turnover with nickname, address, turnover, and last active date from the cached recipient stats snapshot.
8. Given the user has no recipients, Then an empty state is shown with "Add your first recipient" CTA.

### Send Flow

9. Given the user opens the send form, When they tap the recipient icon, Then the picker sheet opens with all recipients sorted by turnover with stats from the cached recipient stats snapshot.
9a. Given the user searches in the recipient picker, When they type, Then the list filters by name or address in real time.
10. Given the user selects a recipient, When the picker closes, Then the address is filled in and the nickname is shown above the field.
10a. Given the user edits the filled address so it no longer matches the selected recipient, Then the nickname/selection state is cleared before submission.
11. Given the user sends to a new address, When the transaction succeeds, Then the app offers to save the address as a recipient.
12. Given the user sends to an existing recipient, When the submitted address still matches that saved recipient at send time, Then no save prompt is shown.

### Transaction History

13. Given a transaction involves a saved recipient, When the transaction renders, Then the recipient nickname is shown next to the truncated address.
14. Given the transaction detail page shows a saved recipient as counterparty, Then the recipient name is displayed.
15. Given the user taps "View Transactions" in a recipient's ⋯ menu, Then `/transactions` opens filtered to that recipient's address.

### Real-Time Notifications

16. Given an incoming payment from a saved recipient's address, When the WebSocket notification fires, Then the toast shows "Payment received from [nickname]!"

### Navigation

17. Given the user is on any authenticated page, Then "Recipients" appears in the sidebar between "Accounts" and "Settings".

## 8. Out of Scope

| Feature | Why | Future? |
|---|---|---|
| **Recipient groups/tags** | No categorization in v1 | Yes — tag recipients by type (vendor, payroll, etc.) |
| **Import/export contacts** | Manual entry only | Yes — CSV import/export |
| **Recipient approval policies** | No per-recipient spending limits | Yes — tie to multi-sig policies |
| **Shared recipients across treasuries** | Each treasury has its own list | Yes — org-level contact book |
| **Recipient address validation (ENS/DNS)** | Raw `0x` addresses only | Yes — resolve human-readable names |
| **Recipient profile pictures** | No visual customization | Yes |
| **Recipient-initiated transactions** | Recipients can't request payments | Yes — payment requests |

## 9. FAQs

### Q1: What happens to transactions when I delete a recipient?

Past transactions revert to showing the raw `0x` address. The transaction data is unchanged — only the display name is removed.

### Q2: Can two recipients have the same nickname?

No. Both address and nickname must be unique within a treasury. Nicknames are trimmed and compared case-insensitively, so `"Acme Corp"` and `" acme corp "` conflict.

### Q3: Are recipients shared across accounts?

Yes. Recipients are per-treasury, not per-account. The same contact book is available when sending from any account.

### Q4: How are stats calculated?

- **Turnover:** sum of all external payment amounts (sent + received) with this address across all accounts (1:1 USD for all supported tokens)
- **Last active:** timestamp of the most recent transaction involving this address
- Both are derived from the full merged transaction history across all accounts, then cached per recipient for fast reads in `/recipients` and the send picker
- On recipient create/re-create, the app kicks off an immediate backfill for that address; until it finishes, stats render in a loading state rather than as zero

### Q5: Does saving a recipient cost anything?

No. Recipients are database-only — no on-chain transaction is needed.

## 10. Appendix

### DB Schema

```typescript
export const recipients = pgTable('recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  treasuryId: uuid('treasury_id').references(() => treasuries.id).notNull(),
  address: text('address').notNull(),           // 0x... on-chain address
  nickname: text('nickname').notNull(),          // trimmed display value, e.g., "Acme Corp"
  nicknameNormalized: text('nickname_normalized').notNull(), // lower(trim(nickname))
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  treasuryAddressUnique: uniqueIndex('recipients_treasury_address_idx').on(table.treasuryId, table.address),
  treasuryNicknameUnique: uniqueIndex('recipients_treasury_nickname_idx').on(table.treasuryId, table.nicknameNormalized),
}));
```

### Recipient Stats Cache

```typescript
export const recipientStats = pgTable('recipient_stats', {
  recipientId: uuid('recipient_id').references(() => recipients.id, { onDelete: 'cascade' }).primaryKey(),
  turnoverUsd6: bigint('turnover_usd_6', { mode: 'bigint' }).notNull().default(0n),
  lastActiveAt: timestamp('last_active_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

> Stats are derived from full treasury history, then cached here for fast reads.

### Sidebar (Updated)

```
┌──────────────┐
│  Ops Fund    │
│              │
│  Dashboard   │
│  Transactions│
│  Accounts    │
│  Recipients  │  ← new
│  Settings    │
│              │
│  Logout      │
└──────────────┘
```
