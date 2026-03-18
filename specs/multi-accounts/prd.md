# PRD: Multi-Account Management

## 1. Meta Information

- **Created Date:** 2026-03-17
- **Epic:** Multi-Account Management
- **Depends on:** [MVP](../mvp/prd.md) (single wallet, passkey auth, send/receive)

## 2. What

Extend Goldhord from a single-wallet treasury to a multi-account model. Each account is a **separate Tempo wallet on-chain**, holding exactly one token type. A single root passkey controls all account wallets via Tempo's Account Keychain Precompile — one fingerprint scan signs for any account. Users can create, rename, and delete accounts. Two protected default accounts are created automatically during setup. Includes swaps between accounts via Tempo's native stablecoin DEX.

## 3. Motivation

A real treasury needs to separate funds by purpose and currency. "Ops AlphaUSD" for daily operations, "Savings AlphaUSD" for reserves, "EU Payments BetaUSD" for EU vendors — each with its own balance, address, and transaction history. Since each account is a real on-chain wallet, balances are always the chain truth — no app-layer accounting needed.

## 4. Key Decisions

### Each Account = Separate Tempo Wallet

Every account is its own Tempo wallet with its own on-chain address. Balance is always read directly from the chain — no app-layer allocation or accounting.

**Why separate wallets instead of one wallet with app-layer tracking:**
- On-chain truth — balance is what the chain says, no DB sync issues
- Each account has its own address — receive is per-account
- Clean separation — no allocation logic, no race conditions
- Future-proof for multi-sig (each account could have its own approval policy)

### One Root Passkey Controls All Accounts

The user creates one passkey during treasury setup. When a new account is created, a new Tempo wallet is generated and the user's root passkey is registered on that wallet's Account Keychain as an authorized key. One biometric scan → can sign transactions for any account.

```
Root Passkey (WebAuthn, created once)
  ├── Main AlphaUSD wallet  (passkey registered via keychain)
  ├── Main BetaUSD wallet  (passkey registered via keychain)
  ├── Savings AlphaUSD wallet (passkey registered via keychain)
  └── EU Payments BetaUSD wallet (passkey registered via keychain)
```

### Treasury Keeps a Controller Account

The treasury still keeps one canonical Tempo identity for authentication and session restore. That controller/root account is the treasury-level principal; user funds live in the per-account wallets.

- Treasury controller account = auth/session identity
- Account wallets = spend/receive balances shown in the product
- Users do not need to manage two credentials; the same root passkey controls both layers

### One Account = One Token

Each account holds exactly one token type. You **can** have multiple accounts with the same token (e.g., "Ops AlphaUSD" and "Savings AlphaUSD" are two separate AlphaUSD wallets).

### Supported Tokens

For this version, we support AlphaUSD and BetaUSD (available via faucet).

| Token | Symbol | Address (Chain ID: 42431) | Decimals |
|---|---|---|---|
| AlphaUSD | AlphaUSD | `0x20c0000000000000000000000000000000000001` | 6 |
| BetaUSD | BetaUSD | `0x20c0000000000000000000000000000000000002` | 6 |

Faucet provides 1M of each token per funded address.

### Total Balance in USD (Exchange Rate)

The dashboard shows total treasury value in USD. Both AlphaUSD and BetaUSD count as **1:1 USD** in this version — no exchange rate conversion needed. Total = sum of all account balances.

### Dashboard Transaction Feed (Multi-Wallet)

With each account being a separate wallet, the dashboard transaction feed requires fetching transactions from N wallets in parallel. Strategy:

- Fetch transactions from all account wallets in parallel using `Promise.all`
- Merge results and sort by timestamp (newest first)
- Each transaction is tagged with its source account name for display
- If both sides of a transaction belong to treasury-owned wallets, group it as a single "Transfer" entry by tx hash instead of showing separate debit/credit rows
- TanStack Query caches each wallet's transactions independently — only stale wallets refetch
- WebSocket subscriptions run per-wallet — incoming payments invalidate only the affected account's cache
- **Dashboard shows "Recent Transactions" (no filters)** — a simple merged feed of the latest N transactions
- **"View all →" links to `/transactions`** — full page with account, date, amount, and sender/recipient address filters plus sent/received tabs

### Account Names Must Be Unique

No two accounts within a treasury can share the same name. Enforced on create and rename — the app shows an inline error if the name is already taken, and the database rejects concurrent duplicates.

### Default Accounts Are Protected

Two system default accounts are created automatically during treasury setup: one AlphaUSD account and one BetaUSD account. Their protected status is tracked by immutable database metadata (`isDefault` together with token), not by the current display name. They can be **renamed** but **not deleted**.

### Sidebar Navigation

With multiple pages (Dashboard, Transactions, Accounts, Settings), the app uses a sidebar instead of the MVP's header-only navigation.

- **Treasury name** at the top (no address — addresses are per-account now)
- **Nav links:** Dashboard, Transactions, Accounts, Settings
- **Logout** at the bottom
- **Desktop:** always visible sidebar
- **Mobile:** collapsed hamburger menu

```
┌──────────────┬──────────────────────┐
│              │                      │
│  Ops Fund    │   [page content]     │
│              │                      │
│  ● Dashboard │                      │
│  Transactions│                      │
│  Accounts    │                      │
│  Settings    │                      │
│              │                      │
│              │                      │
│              │                      │
│  Logout      │                      │
│              │                      │
└──────────────┴──────────────────────┘
```

### Unassigned Tokens (Future)

If an account wallet receives a token it wasn't created for (e.g., someone sends ThetaUSD to an AlphaUSD account's address), the app ignores it in the normal balance UI for now. No "Other tokens" section yet. Withdrawal logic for unassigned tokens will be added in a future release. For deletion safety in this version, only assets the app can move today block deletion. If detectable unassigned assets remain, the app warns that deleting the account will stop tracking that wallet, but it does not block the delete action.

## 5. User Stories

### Account CRUD

1. As a **user**, when I create a treasury, I want "Main AlphaUSD" and "Main BetaUSD" accounts (each a separate wallet) created automatically so that I'm ready to send and receive immediately.
2. As a **user**, I want to create a new account by selecting a token and entering a name so that I can organize funds by purpose.
3. As a **user**, I want to create multiple accounts with the same token (e.g., "Ops AlphaUSD" and "Savings AlphaUSD") so that I can separate funds for different purposes.
4. As a **user**, I want to rename an account so that I can update its label as needs change.
5. As a **user**, I want to delete an account I no longer need so that my dashboard stays clean.
6. As a **user**, I want to be blocked from deleting an account that still holds a movable balance, with a prompt to transfer that balance first, so that I don't accidentally lose access to funds.
7. As a **user**, I want default accounts to be undeletable even if I rename them, so that I always have a primary account per token.

### Dashboard

8. As a **user**, I want to see my top 4 accounts (by balance) as cards on the dashboard, with a "View all accounts →" link to the accounts page if I have more, so that I see the most important accounts at a glance.
9. As a **user**, I want to see my total treasury value in USD at the top of the dashboard (all tokens counted 1:1) so that I know the total value at a glance.
10. As a **user**, I want a "Recent Transactions" section on the dashboard showing the latest transactions from all accounts (no filters) so that I see recent activity at a glance. *(Transactions fetched in parallel from all account wallets, merged and sorted by timestamp.)*
11. As a **user**, I want a "View all →" link on the dashboard that takes me to a full transactions page (`/transactions`) with account, date, amount, and sender/recipient address filters plus sent/received tabs so that I can find specific transactions.

### Account Detail Page

12. As a **user**, I want to tap an account card to see its detail page with balance, address, and transaction history so that I can drill into one account.
13. As a **user**, I want to send from a specific account directly from its detail page so that the send form pre-selects the right account.
14. As a **user**, I want to see the unique wallet address for each account so that I can receive funds into the correct account.
14a. As a **user**, when I tap "Receive" on the dashboard, I want an account selector in the receive sheet so that I can choose which account to share the address for.

### Send Flow

15. As a **user**, I want to select which account to send from in the send form so that the correct token is used and the right balance is shown.
16. As a **user**, I want the available balance in the send form to reflect the selected account so that I know how much I can send.

### Internal Transfers

17. As a **user**, I want to transfer funds between my own accounts (same token) so that I can move money between e.g., "Ops AlphaUSD" and "Savings AlphaUSD".

### Swaps

18. As a **user**, I want to swap between tokens (e.g., AlphaUSD → BetaUSD) from one account to another so that I can convert currencies.
19. As a **user**, I want to see a quote before confirming a swap so that I know the exchange rate and any price impact.
20. As a **user**, I want swaps and internal transfers to appear as grouped entries in transaction history so that I have a clean audit trail. *(Swaps group the DEX swap + follow-up transfer into a single "Swap" entry with ↔ icon. Internal transfers group a treasury-owned wallet-to-wallet transfer into a single "Transfer" entry with → icon.)*
21. As a **user**, if the post-swap transfer to the destination account fails, I want the app to tell me the output funds are still recoverable from the source wallet so that I don't think the funds disappeared.

### Navigation

22. As a **user**, I want a sidebar with links to Dashboard, Transactions, Accounts, and Settings so that I can navigate between pages.
23. As a **user**, I want the sidebar to show my treasury name and have a logout button so that I know which treasury I'm in and can sign out.

### Accounts Page

24. As a **user**, I want a dedicated accounts page listing all accounts sorted by balance with their addresses so that I can manage them in one place.
25. As a **user**, I want to create, rename, and delete accounts from the accounts page so that management is centralized.

## 6. User Flow

### 6.1. Treasury Creation (Updated)

```
User creates treasury (MVP flow)
  → Root passkey created
  → Treasury controller/root account established for auth + session restore
  → Two Tempo wallets created on-chain (sequentially):
    → Wallet A: "Main AlphaUSD" — root passkey registered on keychain
    → Wallet B: "Main BetaUSD" — root passkey registered on keychain
  → Both wallets auto-funded via faucet RPC
  → User lands on dashboard with sidebar navigation
  → Dashboard shows both account cards with funded balances

  If wallet creation fails mid-way:
    → Treasury row exists in DB with controller account
    → Successfully created wallets are saved as accounts
    → User sees dashboard with partial accounts (e.g., only Main AlphaUSD)
    → App detects which default account slot is missing from DB metadata
    → App offers "Retry setup" to create the missing default account with default metadata
```

#### Screen Mockup

**Dashboard (After Treasury Creation)**

```
┌──────────────┬──────────────────────────────┐
│              │                              │
│  Ops Fund    │  Total Balance               │
│              │  $2,000,000.00               │
│  ● Dashboard │                              │
│  Transactions│  ┌──────────────┐ ┌────────────────┐
│  Accounts    │  │ Main AlphaUSD│ │ Main BetaUSD   │
│  Settings    │  │ $1,000,000   │ │ $1,000,000     │
│              │  │ 0xabc…  ⋯   │ │ 0xdef…  ⋯      │
│              │  └──────────────┘ └────────────────┘
│              │                              │
│              │  ┌──────┐ ┌────────┐ ┌──────┐│
│              │  │ Send │ │Receive │ │ Swap ││
│              │  └──────┘ └────────┘ └──────┘│
│              │                              │
│              │  Recent Transactions View all→│
│              │  ─────────────────────       │
│              │  ↓ Faucet  Main AlphaUSD     │
│              │    +$1,000,000 · just now     │
│              │  ↓ Faucet  Main BetaUSD      │
│  Logout      │    +$1,000,000 · just now     │
│              │                              │
└──────────────┴──────────────────────────────┘
```
> Sidebar: treasury name at top, nav links, logout at bottom.
> Top account cards sorted by balance (highest first), max 4 shown.
> Each card shows account name, balance, and truncated address.
> "⋯" menu on each card for Rename.
> "View all accounts →" shown if more than 4 accounts exist.
> Transaction feed shows faucet entries tagged with account name.

**Transactions Page (`/transactions` — via "View all →")**

```
┌─────────────────────────────────┐
│ ← Transactions                  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🔍 Search sender/recipient│    │
│  └─────────────────────────┘    │
│                                 │
│  ┌────────────┐ ┌───────────┐   │
│  │ Date   ▼   │ │ Amount ▼  │   │
│  └────────────┘ └───────────┘   │
│                                 │
│  ┌─────────────────────────┐    │
│  │● All ○Main Alpha        │    │
│  │○ Main Beta ○Savings Alpha│   │
│  └─────────────────────────┘    │
│                                 │
│  ┌──────┐ ┌──────┐ ┌────────┐  │
│  │ All  │ │ Sent │ │Received│  │
│  └──────┘ └──────┘ └────────┘  │
│  ─────────────────────────      │
│  ↑ To 0x9f3…  Main AlphaUSD    │
│    -$250 · 5 min ago            │
│  ↓ From 0xbc7  Main BetaUSD    │
│    +$500 · 1 hour ago           │
│  → Transfer  Main Alpha →      │
│    Savings Alpha · $50k · 2h    │
│                                 │
└─────────────────────────────────┘
```
> Account filter chips narrow to one account's transactions.
> Search filters by sender or recipient address.
> Date range and amount range filters narrow the list further.
> Sent/Received tabs filter direction.
> Each transaction tagged with its source account name.
> Internal transfers show → icon with both account names and render as a single grouped row keyed by tx hash.

### 6.2. Create Account

```
User navigates to Accounts page
  → Taps "New Account"
  → Selects token from dropdown (AlphaUSD or BetaUSD)
  → Enters account name (e.g., "Savings AlphaUSD")
  → If name already exists: inline error "Name already taken"
  → Taps "Create"
  → Loading state: "Creating account..." spinner (2-3 seconds)
    → New Tempo wallet provisioned locally
    → Root passkey registered on new wallet's keychain
    → Account saved in DB (name, token, wallet address)
  → Appears on Accounts page and Dashboard with $0 balance
  → Account detail page shows unique wallet address for receiving
```

#### Screen Mockups

**Screen 1 — New Account Form**

```
┌─────────────────────────────────┐
│ ← New Account                   │
│─────────────────────────────────│
│                                 │
│  Token                          │
│  ┌─────────────────────────┐    │
│  │ AlphaUSD          ▼     │    │
│  └─────────────────────────┘    │
│                                 │
│  Account Name                   │
│  ┌─────────────────────────┐    │
│  │ Savings AlphaUSD        │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Create Account  →    │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Screen 2 — Name Already Taken**

```
┌─────────────────────────────────┐
│ ← New Account                   │
│─────────────────────────────────│
│                                 │
│  Token                          │
│  ┌─────────────────────────┐    │
│  │ AlphaUSD          ▼     │    │
│  └─────────────────────────┘    │
│                                 │
│  Account Name                   │
│  ┌─────────────────────────┐    │
│  │ Main AlphaUSD           │    │
│  └─────────────────────────┘    │
│  ⚠ Name already taken           │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Create Account  →    │ ←disabled
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Screen 3 — Creating (Loading)**

```
┌─────────────────────────────────┐
│ ← New Account                   │
│─────────────────────────────────│
│                                 │
│                                 │
│         ◌  Creating             │
│            account...           │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Screen 3b — Creation Failed (Error)**

```
┌─────────────────────────────────┐
│ ← New Account                   │
│─────────────────────────────────│
│                                 │
│  ⚠ Failed to create account.   │
│  The wallet could not be        │
│  provisioned on-chain.          │
│                                 │
│  ┌─────────────────────────┐    │
│  │      Try Again  →       │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Error state shown if on-chain wallet provisioning or keychain registration fails.
> "Try Again" retries the full creation flow.
> No partial state — account is only saved to DB after on-chain success.

**Screen 4 — Dashboard (After Account Creation)**

```
┌──────────────┬──────────────────────────────┐
│              │                              │
│  Ops Fund    │  Total Balance               │
│              │  $2,000,000.00               │
│  ● Dashboard │                              │
│  Transactions│  ┌──────────────┐ ┌────────────────┐
│  Accounts    │  │ Main AlphaUSD│ │ Main BetaUSD   │
│  Settings    │  │ $1,000,000   │ │ $1,000,000     │
│              │  │ 0xabc…  ⋯   │ │ 0xdef…  ⋯      │
│              │  └──────────────┘ └────────────────┘
│              │  ┌────────────────┐               │
│              │  │Savings AlphaUSD│               │
│              │  │ $0.00          │               │
│              │  │ 0x789…  ⋯     │               │
│  Logout      │  └────────────────┘               │
│              │                              │
└──────────────┴──────────────────────────────┘
```
> New account appears as a third card with $0 balance.
> Its own unique address (0x789…) ready for receiving.

### 6.3. Rename Account

```
User taps "..." menu on account card or account detail page
  → Taps "Rename"
  → Edits name inline or in a dialog
  → If name already exists: inline error "Name already taken"
  → Taps "Save"
  → Name updated immediately (DB only — nothing on-chain)
```

#### Screen Mockup

**Rename Dialog**

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Rename Account         │    │
│  │                         │    │
│  │  ┌───────────────────┐  │    │
│  │  │ Ops AlphaUSD      │  │    │
│  │  └───────────────────┘  │    │
│  │                         │    │
│  │  Cancel         Save    │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Inline dialog over the current page.
> Pre-filled with current name, user edits in place.

### 6.4. Delete Account

```
User taps "..." menu on account card or account detail page
  → Taps "Delete"

  If the account's assigned token balance is greater than 0:
    → Dialog: "This wallet still holds funds. Transfer them before deleting."
    → "Transfer Balance" button:
      → If other accounts with the same token exist → opens transfer form (pre-filled with full balance, "To" filtered to same-token accounts)
      → If no other same-token accounts → opens send form (pre-filled with full balance for external transfer)
    → After the assigned token balance is 0, user can retry delete

  If the assigned token balance is 0 but detectable unassigned assets remain:
    → Warning dialog: "This wallet still holds assets the app cannot move yet. Deleting it will stop tracking that wallet."
    → User can cancel or continue with delete

  If the assigned token balance is 0:
    → Confirmation dialog: "Delete [account name]? This cannot be undone."
    → User confirms → account removed from DB, card removed from dashboard
    → On-chain wallet still exists but app no longer tracks it

  If account is a system default account:
    → "Delete" option is not shown in the menu
```

#### Screen Mockups

**Screen 1 — Delete Blocked (Has Balance)**

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Cannot Delete           │    │
│  │                         │    │
│  │  "Savings AlphaUSD" has │    │
│  │  a balance of $500.00.  │    │
│  │  Transfer the balance    │    │
│  │  before deleting.        │    │
│  │                         │    │
│  │  ┌───────────────────┐  │    │
│  │  │ Transfer Balance → │  │    │
│  │  └───────────────────┘  │    │
│  │                         │    │
│  │        Cancel           │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> "Transfer Balance" opens the relevant transfer/send flow pre-filled with the assigned-token balance.
> Delete blocking only checks the account's assigned token in this version.

**Screen 2 — Delete Confirmation (Zero Balance)**

```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  Delete Account?         │    │
│  │                         │    │
│  │  "Savings AlphaUSD"     │    │
│  │  will be permanently     │    │
│  │  removed. This cannot    │    │
│  │  be undone.              │    │
│  │                         │    │
│  │  Cancel        Delete   │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Screen 3 — Account Card Menu (Default vs Non-Default)**

```
Non-default account:        Default account:
┌──────────────┐            ┌──────────────┐
│ Savings Alpha│            │ Main AlphaUSD│
│ $0.00    ⋯  │            │ $1,000,000 ⋯│
│  ┌────────┐  │            │  ┌────────┐  │
│  │ Rename │  │            │  │ Rename │  │
│  │ Delete │  │            │  └────────┘  │
│  └────────┘  │            └──────────────┘
└──────────────┘
```
> Default accounts: menu shows Rename only.
> Non-default accounts: menu shows Rename + Delete.

### 6.5. Send Payment (Updated)

```
User taps "Send" on dashboard or account detail page
  → Send form with account selector at the top
  → If opened from account detail: that account is pre-selected
  → If opened from dashboard: the highest-balance account is selected by default
  → Selecting an account shows: token, available balance, sending address
  → Recipient address field, amount, memo
  → User taps "Confirm" → root passkey signs (one biometric scan)
  → Transaction sent from the selected account's wallet address
  → Rest of flow same as MVP (optimistic update, confirmation)
```

#### Screen Mockup

**Send Form (With Account Selector)**

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
│  To                             │
│  ┌─────────────────────────┐    │
│  │ 0x                      │    │
│  └─────────────────────────┘    │
│                                 │
│  Amount                         │
│  ┌─────────────────────────┐    │
│  │ $                       │    │
│  └─────────────────────────┘    │
│  Available: $1,000,000.00       │
│                                 │
│  Memo (optional)                │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Confirm & Send  →    │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Account selector at top — shows name, balance, truncated address.
> Token is determined by the selected account (no separate token picker).
> "Available" reflects the selected account's balance.
> Changing account updates token + balance + sending address.
> If balances tie, the older account is selected first.

### 6.6. Internal Transfer (Same Token)

```
User taps "Transfer" on account detail page
  → Transfer form:
    From: [Account selector] — e.g., "Ops AlphaUSD ($500.00)"
    To:   [Account selector] — filtered to same token, excludes "From" account
    Amount: $___
  → Validation:
    → "From" and "To" cannot be the same account
    → "To" only shows accounts with the same token
    → Amount must be > 0 and ≤ available balance
  → User enters amount
  → User taps "Confirm" → root passkey signs
  → Simple TIP-20 transfer from one wallet to another
  → Both account balances update
  → Merged transaction feeds show a single grouped "Transfer" entry for this tx hash
```

> "Transfer" button is only shown when 2+ accounts of the same token exist.
> If only one account of that token exists, the button is hidden.

#### Screen Mockup

**Transfer Form**

```
┌─────────────────────────────────┐
│ ← Transfer                      │
│─────────────────────────────────│
│                                 │
│  From                           │
│  ┌─────────────────────────┐    │
│  │ Main AlphaUSD     ▼     │    │
│  │ $1,000,000 · 0xabc…     │    │
│  └─────────────────────────┘    │
│                                 │
│  To                             │
│  ┌─────────────────────────┐    │
│  │ Savings AlphaUSD  ▼     │    │
│  │ $0.00 · 0x789…          │    │
│  └─────────────────────────┘    │
│  Only AlphaUSD accounts shown   │
│                                 │
│  Amount                         │
│  ┌─────────────────────────┐    │
│  │ $ 50,000                │    │
│  └─────────────────────────┘    │
│  Available: $1,000,000.00       │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Confirm Transfer →   │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> "To" dropdown only shows other accounts with the same token.
> No memo field — internal transfers don't need memos.
> No fee shown — same as regular send ($0).
> Dashboard and `/transactions` show one grouped row for the transfer, not separate send/receive entries.

### 6.7. Swap Between Tokens

```
User taps "Swap" on dashboard
  → Swap form:
    From: [Account selector] — e.g., "Main AlphaUSD ($500.00)"
    To:   [Account selector] — filtered to different token type only
          e.g., "Main BetaUSD ($450.00)"
    Amount: $___
  → "To" only shows accounts with a different token than "From"
    (same-token moves use Transfer, not Swap)
  → User enters amount
  → App fetches quote from Tempo DEX (exchange rate, price impact)
  → Quote displayed: "250 AlphaUSD → ~249.75 BetaUSD (rate: 0.999)"
  → User taps "Confirm Swap" → root passkey signs
  → Tx 1: swap executes on Tempo DEX from the source wallet
  → Swap output lands in the source wallet as BetaUSD
  → Tx 2: app transfers the received BetaUSD into the destination account wallet
  → Both account balances update
  → Transaction appears in both accounts' histories
  → If Tx 2 fails, output funds remain in the source wallet and the app shows a recovery prompt
```

#### Screen Mockups

**Screen 1 — Swap Form**

```
┌─────────────────────────────────┐
│ ← Swap                          │
│─────────────────────────────────│
│                                 │
│  From                           │
│  ┌─────────────────────────┐    │
│  │ Main AlphaUSD     ▼     │    │
│  │ $1,000,000 · 0xabc…     │    │
│  └─────────────────────────┘    │
│                                 │
│  To                             │
│  ┌─────────────────────────┐    │
│  │ Main BetaUSD      ▼     │    │
│  │ $1,000,000 · 0xdef…     │    │
│  └─────────────────────────┘    │
│  Only BetaUSD accounts shown    │
│                                 │
│  Amount                         │
│  ┌─────────────────────────┐    │
│  │ $ 250                   │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Quote                   │    │
│  │ 250 AlphaUSD            │    │
│  │ → ~249.75 BetaUSD       │    │
│  │ Rate: 0.999             │    │
│  │ Slippage: 0.5%          │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Confirm Swap  →      │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> "To" dropdown only shows accounts with a DIFFERENT token.
> Quote fetched live from Tempo DEX when amount is entered.
> Shows rate and slippage tolerance.
> Final delivery to the destination account happens in a follow-up transfer after the swap settles.

**Screen 2 — Swap Confirmed (Toast + Dashboard)**

```
┌──────────────┬──────────────────────────────┐
│              │  ┌─────────────────────────┐  │
│  Ops Fund    │  │ ✓ Swap confirmed        │  │
│              │  │   250 AlphaUSD →        │  │
│  ● Dashboard │  │   249.75 BetaUSD        │  │
│  Transactions│  └─────────────────────────┘  │
│  Accounts    │                              │
│  Settings    │  Total Balance               │
│              │  $2,000,000.00               │
│              │                              │
│              │  ┌──────────────┐ ┌────────────────┐
│              │  │ Main AlphaUSD│ │ Main BetaUSD   │
│              │  │ $999,750     │ │ $1,000,249.75  │
│              │  └──────────────┘ └────────────────┘
│              │                              │
│              │  Recent Transactions View all→│
│              │  ─────────────────────       │
│  Logout      │  ↔ Swap  Main AlphaUSD →    │
│              │    Main BetaUSD · -$250 · now │
└──────────────┴──────────────────────────────┘
```
> Toast confirms swap with amounts.
> Both account balances updated.
> Swap shows in feed with ↔ icon and both account names.
> If the follow-up transfer fails, the UI shows that the output remains in the source wallet and offers a recovery path.

### 6.8. Account Detail Page

```
User taps account card on dashboard
  → Navigates to /accounts/[id]
  → Shows: account name, token, balance, wallet address (unique, copyable)
  → Action buttons: Send, Receive (opens receive sheet with this account pre-selected), Swap
  → Transfer button shown only if 2+ accounts of the same token exist
  → Transaction history for this account's wallet
  → "..." menu with Rename / Delete (if not default)
```

#### Screen Mockup

**Account Detail Page**

```
┌─────────────────────────────────┐
│ ← Main AlphaUSD            ⋯  │
│─────────────────────────────────│
│                                 │
│  Balance                        │
│  $1,000,000.00                  │
│  AlphaUSD                       │
│                                 │
│  Wallet Address                 │
│  0xabc1...def2         📋 Copy │
│                                 │
│  ┌──────┐ ┌────────┐ ┌──────┐  │
│  │ Send │ │Receive │ │ Swap │  │
│  └──────┘ └────────┘ └──────┘  │
│  ┌──────────┐                   │
│  │ Transfer │  ← only if 2+    │
│  └──────────┘    same-token     │
│                    accounts     │
│  Transactions                   │
│  ─────────────────────────      │
│  ↓ Faucet funding               │
│    +$1,000,000 · just now       │
│                                 │
│         ◌ Load more             │
│                                 │
└─────────────────────────────────┘
```
> "⋯" menu in header: Rename / Delete (Delete hidden for defaults).
> Wallet address is unique to this account — copyable.
> Receive shows QR + address for THIS account's wallet.
> Transfer button only visible when 2+ accounts of same token exist.
> Transaction history scoped to this wallet only.

**Receive Sheet (With Account Selector)**

```
┌─────────────────────────────────┐
│  Receive Payment            ✕   │
│─────────────────────────────────│
│                                 │
│  Receive into                   │
│  ┌─────────────────────────┐    │
│  │ Main AlphaUSD     ▼     │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │       QR CODE           │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  0xabc1...def2                  │
│                                 │
│  ┌─────────────────────────┐    │
│  │    📋 Copy Address       │    │
│  └─────────────────────────┘    │
│                                 │
│  Send AlphaUSD to this address. │
│                                 │
└─────────────────────────────────┘
```
> Account selector at top — if opened from account detail, that account is pre-selected.
> If opened from dashboard, the highest-balance account is selected by default.
> Changing account updates QR code, address, and helper text.
> QR encodes the selected account's unique wallet address (not the treasury root).
> Helper text specifies the token type to avoid wrong-token sends.
> If balances tie, the older account is selected first.

### 6.9. Transactions Page

```
User taps "View all →" on dashboard or "Transactions" in sidebar
  → Navigates to /transactions
  → Shows all transactions from all accounts, merged and sorted by timestamp
  → Account filter chips at the top:
    → "All" selected by default — shows all accounts
    → Tapping an account chip filters to that account's transactions only
  → Search field filters by sender or recipient address (case-insensitive)
  → Date range filter narrows results by transaction timestamp
  → Amount range filter narrows results by transaction value
  → Sent/Received/All tabs filter by direction
  → Filters combine: account chip + address search + date range + amount range + direction tab all apply together
  → Each transaction row shows: direction icon, counterparty address,
    amount, token, account name tag, timestamp
  → Internal transfers show → icon with both account names and are grouped into a single row by tx hash
  → Swaps show ↔ icon with both account names
  → Tapping a transaction navigates to transaction detail page
```

#### Transaction Detail Page

Tapping a transaction row opens a detail page with the grouped transaction summary plus the underlying chain references.

- **Send / Receive:** shows direction, counterparty, amount, token, memo (if present), timestamp, and tx hash
- **Internal Transfer:** shows from-account, to-account, amount, token, timestamp, and the shared tx hash for the wallet-to-wallet transfer
- **Swap:** shows source account, destination account, amount in, amount out, swap tx hash, and follow-up transfer tx hash
- **Swap partial failure:** if the follow-up transfer failed, the page states that the output token remains in the source wallet and offers a recovery CTA

### 6.10. Accounts Management Page

```
User navigates to "Accounts" in nav
  → List of all accounts sorted by balance (highest first)
  → Each row shows name, token, balance, address (truncated)
  → "New Account" button
  → Each account row has "..." menu: Rename, Delete (if not default), View Detail
```

#### Screen Mockup

**Accounts Page**

```
┌─────────────────────────────────┐
│ ← Accounts        + New Account│
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ Main AlphaUSD       ⋯  │    │
│  │ $1,000,000 · 0xabc…     │    │
│  │ 🔒 Default               │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Main BetaUSD        ⋯  │    │
│  │ $1,000,000 · 0xdef…     │    │
│  │ 🔒 Default               │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Savings AlphaUSD    ⋯  │    │
│  │ $0.00 · 0x789…          │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Accounts sorted by balance (highest first).
> Each account row shows name, balance, truncated address.
> Default accounts marked with 🔒.
> "⋯" menu: Rename + Delete (Delete hidden for defaults).
> "+ New Account" button in header.

## 7. Definition of Done

### Account CRUD

1. Given a new treasury is created, When setup completes, Then two Tempo wallets are created on-chain, each with the root passkey registered on its keychain, and "Main AlphaUSD" and "Main BetaUSD" accounts appear on the dashboard.
2. Given a returning user authenticates, When the session is restored, Then the treasury is still identified by its controller/root Tempo account rather than any individual spend wallet.
3. Given the user taps "New Account", When they select a token and name and confirm, Then a new Tempo wallet is created on-chain with the root passkey registered, and the account appears on dashboard and accounts page.
3a. Given account creation fails (on-chain provisioning error), When the error occurs, Then an error message is shown with a "Try Again" button, and no partial account is saved to DB.
4. Given the user creates a second AlphaUSD account, When it's created, Then it has its own unique wallet address and independent balance.
5. Given the user taps Rename on an account, When they enter a new name and save, Then the name updates everywhere (dashboard, detail, accounts page).
6. Given the user creates or renames an account with a name that already exists, When they submit, Then an inline error "Name already taken" is shown and the action is blocked, even under concurrent requests.
7. Given the user taps Delete on an account with a zero balance in its assigned token, When they confirm, Then the account is removed from the app (wallet still exists on-chain).
8. Given the user taps Delete on an account whose assigned token balance is non-zero, When the dialog appears, Then it blocks deletion and offers a transfer path.
8a. Given the wallet only holds detectable unassigned assets, When the user taps Delete, Then the app warns that deletion will stop tracking that wallet but still allows the delete action.
9. Given the account is a system default account, When the user opens the menu, Then the Delete option is not shown even if the account was renamed.

### Dashboard

10. Given the user has multiple accounts, When they view the dashboard, Then the top 4 accounts (by balance) show as cards with name, token, balance, and address, a "View all accounts →" link appears if more than 4 exist, total balance in USD is shown at the top, and "Recent Transactions" shows the latest transactions from all accounts (no filters).
11. Given the user taps "View all →" on the dashboard, When the transactions page loads, Then it shows all transactions with account, sender/recipient address, date, and amount filters plus sent/received tabs.

### Account Detail

12. Given the user taps an account card, When the detail page loads, Then it shows the account name, token, balance, unique wallet address, and transaction history for that wallet.
13. Given the user taps "Send" on an account detail page, When the send form opens, Then the account is pre-selected.
14. Given the user taps "Receive" on an account detail page, When the receive sheet opens, Then that account is pre-selected and the sheet shows its wallet address and QR code.
14a. Given the user taps "Receive" on the dashboard, When the receive sheet opens, Then an account selector is shown (highest-balance account selected by default) and changing accounts updates the QR and address.

### Send Flow

15. Given the user opens the send form from the dashboard, When the form loads, Then an account selector is shown and the highest-balance account is selected by default.
16. Given the user selects a different account, When the selection changes, Then the token, available balance, and sending address update.

### Internal Transfers

17. Given the user opens the transfer form, When they select a "From" account, Then the "To" selector only shows other accounts with the same token.
18. Given the user has only one account for a token, When they view that account's detail page, Then the "Transfer" button is not shown.
19. Given the user opens the transfer form, When they confirm, Then a TIP-20 transfer executes between the two wallet addresses, both balances update, and merged feeds show one grouped "Transfer" entry for that tx hash.

### Swaps

20. Given the user opens the swap form, When they select a "From" account, Then the "To" selector only shows accounts with a different token type.
21. Given the user opens the swap form, When they select source and destination accounts, Then a quote is fetched from the Tempo DEX.
22. Given the user confirms a swap, When the swap and follow-up transfer both succeed, Then both account balances update and the swap appears in both accounts' transaction histories.
23. Given the follow-up transfer after a swap fails, When the error is detected, Then the app shows that the output funds remain in the source wallet and offers a recovery path.
24. Given a swap fails before settlement, When the error is detected, Then the optimistic update rolls back and an error toast is shown.

### Accounts Page

25. Given the user navigates to the Accounts page (or taps "View all accounts →" on dashboard), When it loads, Then all accounts are listed sorted by balance (highest first) with name, token, balance, address, and action menus.

### Transaction Detail

26. Given the user taps a grouped internal transfer, When the detail page loads, Then it shows one transfer summary with from-account, to-account, amount, token, timestamp, and tx hash.
27. Given the user taps a grouped swap, When the detail page loads, Then it shows the swap summary with amount in, amount out, source account, destination account, and the underlying tx hashes.
28. Given the swap follow-up transfer failed, When the user opens the swap detail page, Then it explains that the output remains in the source wallet and offers a recovery action.

### Navigation

29. Given the user is on any authenticated page, Then a sidebar shows treasury name, nav links (Dashboard, Transactions, Accounts, Settings), and logout.
30. Given the user is on mobile, Then the sidebar is collapsed behind a hamburger menu.

## 8. Out of Scope

| Feature | Why | Future? |
|---|---|---|
| **Cross-chain swaps** | Only same-chain Tempo DEX swaps | Yes — requires bridge |
| **Limit orders on DEX** | Only instant market swaps | Yes — Tempo DEX supports limit orders natively |
| **Swap fee customization** | Use default Tempo DEX fees | Yes |
| **Account reordering** | Sorted by balance; manual reorder not supported | Yes — drag-and-drop reorder |
| **Account icons/colors** | No visual customization | Yes |
| **Per-account Ledger policy** | Each account could have its own spending limit / Ledger requirement | Yes — when Ledger is added |
| **Bulk account creation** | Create one at a time | Yes |
| **Unassigned token display/withdrawal** | Tokens sent to a wallet for the wrong token type are ignored in the UI; delete only warns and does not block on them | Yes — withdrawal logic later |

## 9. References

- [Tempo Token List](https://docs.tempo.xyz/quickstart/tokenlist)
- [Tempo Faucet — Token Addresses](https://docs.chainstack.com/reference/tempo-tempo-fundaddress)
- [Tempo Stablecoin DEX — Executing Swaps](https://docs.tempo.xyz/guide/stablecoin-dex/executing-swaps)
- [Tempo Stablecoin Exchange Protocol](https://docs.tempo.xyz/protocol/exchange)
- [Tempo Account Keychain Precompile](https://docs.tempo.xyz/protocol/transactions/spec-tempo-transaction)
- [MVP PRD](../mvp/prd.md)
- [Authentication Architecture](../mvp/authentication.md)

## 10. FAQs

### Q1: How do accounts work on-chain?

Each account is a **separate Tempo wallet** with its own on-chain address. The balance you see is the actual on-chain balance — no app-layer accounting. The user's root passkey is registered on each wallet's keychain, so one biometric scan signs for any account. Separately, the treasury keeps a controller/root Tempo account for authentication and session restore.

### Q2: Do I need a new passkey for each account?

No. One root passkey (created during treasury setup) controls all account wallets. When a new account is created, the root passkey is registered on the new wallet's keychain. One fingerprint scan = sign for any account.

### Q3: Can I have two AlphaUSD accounts?

Yes. Each is a separate wallet with its own address and independent balance. E.g., "Ops AlphaUSD" and "Savings AlphaUSD" are two different wallets both holding AlphaUSD.

### Q4: What happens when I delete an account?

If the account's assigned token balance is zero, the account can be deleted and the app stops tracking that wallet. If the assigned token still has funds, deletion is blocked until you transfer them out. If only unassigned tokens remain, the app warns before delete but does not block it.

### Q5: How do swaps work?

Tempo has a native stablecoin DEX. The app fetches a quote (exchange rate + amount), shows it to the user, and submits the swap signed by the root passkey. The swap output first lands in the source wallet, then the app submits a follow-up transfer into the destination account wallet. If that second step fails, the output remains recoverable from the source wallet.

### Q6: How do internal transfers work?

A simple TIP-20 transfer from one account's wallet address to another. Signed by the root passkey. Same as sending to any external address, just between your own accounts.

### Q7: What about the Tempo faucet tokens?

The faucet provides AlphaUSD, BetaUSD, ThetaUSD, pathUSD. We use AlphaUSD and BetaUSD as our supported tokens in this version. ThetaUSD and pathUSD sent to account wallets are ignored in the main balance UI for now. If they are detected during delete, the app warns that deleting the account will stop tracking that wallet, but they do not block deletion.

## 11. Appendix

### Token Addresses (Tempo, Chain ID: 42431)

**Testnet (active):**

| Token | Address | Decimals |
|---|---|---|
| AlphaUSD | `0x20c0000000000000000000000000000000000001` | 6 |
| BetaUSD | `0x20c0000000000000000000000000000000000002` | 6 |

### DB Schema Extension

```typescript
export const treasuries = pgTable('treasuries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  tempoAddress: text('tempo_address').notNull().unique(), // treasury controller/root account
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  treasuryId: uuid('treasury_id').references(() => treasuries.id).notNull(),
  name: text('name').notNull(),                  // e.g., "Ops AlphaUSD", "Main BetaUSD"
  tokenSymbol: text('token_symbol').notNull(),   // e.g., "AlphaUSD", "BetaUSD"
  tokenAddress: text('token_address').notNull(), // TIP-20 contract address
  walletAddress: text('wallet_address').notNull(), // Tempo wallet address for this account
  isDefault: boolean('is_default').default(false).notNull(), // immutable system-default flag; rename changes only `name`
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  treasuryNameUnique: uniqueIndex('accounts_treasury_name_idx').on(table.treasuryId, table.name),
  walletAddressUnique: uniqueIndex('accounts_wallet_address_idx').on(table.walletAddress),
}));
```

`isDefault` is system metadata. Delete protection and missing-default retry logic use that flag together with `tokenSymbol`, not the current account label.

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                    Goldhord App                      │
│                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ Ops Alpha   │ │Savings Alpha│ │ Main Beta  │ │
│  │ 0xabc...    │ │ 0xdef...    │ │ 0x123...   │ │
│  │ $500 Alpha │ │ $2000 Alpha │ │ $800 Beta  │ │
│  └──────┬──────┘ └──────┬──────┘ └─────┬──────┘ │
│         │               │              │          │
│         └───────────┬───┘──────────────┘          │
│                     │                              │
│              Root Passkey                          │
│         (registered on all keychains)              │
│                     │                              │
│              One biometric scan                    │
│           signs for any account                    │
└─────────────────────────────────────────────────┘
                      │
              Tempo Blockchain
         (each account = real wallet)
```
