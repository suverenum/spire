# PRD: Multi-Account Management

## 1. Meta Information

- **Created Date:** 2026-03-17
- **Epic:** Multi-Account Management
- **Depends on:** [MVP](../mvp/prd.md) (single wallet, passkey auth, send/receive)

## 2. What

Extend Spire from a single-wallet treasury to a multi-account model. Each account is a **separate Tempo wallet on-chain**, holding exactly one token type. A single root passkey controls all account wallets via Tempo's Account Keychain Precompile — one fingerprint scan signs for any account. Users can create, rename, and delete accounts. Default accounts ("Main AlphaUSD" and "Main BetaUSD") are created automatically. Includes swaps between accounts via Tempo's native stablecoin DEX.

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

For testnet, we use AlphaUSD and BetaUSD (available via faucet). On mainnet, these will be replaced with USDC.e and EURC.e — the mapping is in a single config file.

| Token | Symbol | Address (Chain ID: 42431) | Decimals | Mainnet Equivalent |
|---|---|---|---|---|
| AlphaUSD | AlphaUSD | `0x20c0000000000000000000000000000000000001` | 6 | USDC.e |
| BetaUSD | BetaUSD | `0x20c0000000000000000000000000000000000002` | 6 | EURC.e |

Faucet provides 1M of each token per funded address.

### Total Balance in USD (Exchange Rate)

The dashboard shows total treasury value in USD. Both AlphaUSD and BetaUSD count as **1:1 USD** — no exchange rate conversion needed. Total = sum of all account balances.

### Dashboard Transaction Feed (Multi-Wallet)

With each account being a separate wallet, the dashboard transaction feed requires fetching transactions from N wallets in parallel. Strategy:

- Fetch transactions from all account wallets in parallel using `Promise.all`
- Merge results and sort by timestamp (newest first)
- Each transaction is tagged with its source account name for display
- TanStack Query caches each wallet's transactions independently — only stale wallets refetch
- WebSocket subscriptions run per-wallet — incoming payments invalidate only the affected account's cache
- Dashboard shows the merged feed; account filter narrows to one wallet's transactions

### Account Names Must Be Unique

No two accounts within a treasury can share the same name. Enforced on create and rename — the app shows an inline error if the name is already taken, and the database rejects concurrent duplicates.

### Default Accounts Are Protected

"Main AlphaUSD" and "Main BetaUSD" are created automatically during treasury setup. They can be **renamed** but **not deleted**.

### Unassigned Tokens (Future)

If an account wallet receives a token it wasn't created for (e.g., someone sends ThetaUSD to an AlphaUSD account's address), the app ignores it in the normal balance UI for now. No "Other tokens" section yet. Withdrawal logic for unassigned tokens will be added in a future release, but account deletion stays blocked while detectable unassigned assets remain in the wallet.

## 5. User Stories

### Account CRUD

1. As a **user**, when I create a treasury, I want "Main AlphaUSD" and "Main BetaUSD" accounts (each a separate wallet) created automatically so that I'm ready to send and receive immediately.
2. As a **user**, I want to create a new account by selecting a token and entering a name so that I can organize funds by purpose.
3. As a **user**, I want to create multiple accounts with the same token (e.g., "Ops AlphaUSD" and "Savings AlphaUSD") so that I can separate funds for different purposes.
4. As a **user**, I want to rename an account so that I can update its label as needs change.
5. As a **user**, I want to delete an account I no longer need so that my dashboard stays clean.
6. As a **user**, I want to be blocked from deleting an account that has a balance, with a prompt to transfer the balance first, so that I don't accidentally lose access to funds.
7. As a **user**, I want default accounts (Main AlphaUSD, Main BetaUSD) to be undeletable so that I always have a primary account per token.

### Dashboard

8. As a **user**, I want to see all my accounts as cards on the dashboard, each showing account name, token, and balance, so that I have a full overview.
9. As a **user**, I want to see my total treasury value in USD at the top of the dashboard (all tokens counted 1:1) so that I know the total value at a glance.
10. As a **user**, I want a unified transaction feed on the dashboard showing transactions from all accounts so that I see all recent activity. *(Transactions fetched in parallel from all account wallets, merged and sorted by timestamp.)*
11. As a **user**, I want to filter the dashboard transaction feed by account so that I can focus on one account's activity.

### Account Detail Page

12. As a **user**, I want to tap an account card to see its detail page with balance, address, and transaction history so that I can drill into one account.
13. As a **user**, I want to send from a specific account directly from its detail page so that the send form pre-selects the right account.
14. As a **user**, I want to see the unique wallet address for each account so that I can receive funds into the correct account.

### Send Flow

15. As a **user**, I want to select which account to send from in the send form so that the correct token is used and the right balance is shown.
16. As a **user**, I want the available balance in the send form to reflect the selected account so that I know how much I can send.

### Internal Transfers

17. As a **user**, I want to transfer funds between my own accounts (same token) so that I can move money between e.g., "Ops AlphaUSD" and "Savings AlphaUSD".

### Swaps

18. As a **user**, I want to swap between tokens (e.g., AlphaUSD → BetaUSD) from one account to another so that I can convert currencies.
19. As a **user**, I want to see a quote before confirming a swap so that I know the exchange rate and any price impact.
20. As a **user**, I want the swap to appear in both accounts' transaction histories so that there's a complete audit trail.
21. As a **user**, if the post-swap transfer to the destination account fails, I want the app to tell me the output funds are still recoverable from the source wallet so that I don't think the funds disappeared.

### Accounts Page

22. As a **user**, I want a dedicated accounts page listing all accounts with their balances and addresses so that I can manage them in one place.
23. As a **user**, I want to create, rename, and delete accounts from the accounts page so that management is centralized.

## 6. User Flow

### 6.1. Treasury Creation (Updated)

```
User creates treasury (MVP flow)
  → Root passkey created
  → Treasury controller/root account established for auth + session restore
  → Two Tempo wallets created on-chain:
    → Wallet A: "Main AlphaUSD" — root passkey registered on keychain
    → Wallet B: "Main BetaUSD" — root passkey registered on keychain
  → Both wallets auto-funded via faucet RPC
  → Dashboard shows both account cards with funded balances
```

#### Screen Mockup

**Dashboard (After Treasury Creation)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund         ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $2,000,000.00                  │
│                                 │
│  ┌──────────────┐ ┌───────────────┐
│  │ Main AlphaUSD│ │ Main BetaUSD  │
│  │ $1,000,000   │ │ $1,000,000    │
│  │ 0xabc…  ⋯   │ │ 0xdef…  ⋯     │
│  └──────────────┘ └───────────────┘
│                                 │
│  ┌──────┐ ┌────────┐ ┌──────┐  │
│  │ Send │ │Receive │ │ Swap │  │
│  └──────┘ └────────┘ └──────┘  │
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↓ Faucet  Main AlphaUSD       │
│    +$1,000,000 · just now       │
│  ↓ Faucet  Main BetaUSD        │
│    +$1,000,000 · just now       │
│                                 │
└─────────────────────────────────┘
```
> Two default account cards with faucet-funded balances.
> Each card shows account name, balance, and truncated address.
> "⋯" menu on each card for Rename.
> Transaction feed shows faucet entries tagged with account name.

**Dashboard (With Account Filter on Transaction Feed)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund         ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $2,000,000.00                  │
│                                 │
│  ┌──────────────┐ ┌───────────────┐
│  │ Main AlphaUSD│ │ Main BetaUSD  │
│  │ $1,000,000   │ │ $1,000,000    │
│  └──────────────┘ └───────────────┘
│  ┌────────────────┐               │
│  │Savings AlphaUSD│               │
│  │ $50,000        │               │
│  └────────────────┘               │
│                                 │
│  ┌──────┐ ┌────────┐ ┌──────┐  │
│  │ Send │ │Receive │ │ Swap │  │
│  └──────┘ └────────┘ └──────┘  │
│                                 │
│  Recent Transactions  View all →│
│  ┌─────────────────────────┐    │
│  │● All ○Main Alpha        │    │
│  │○ Main Beta ○Savings Alpha│   │
│  └─────────────────────────┘    │
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
> Account filter chips above the transaction feed.
> "All" selected by default — shows merged feed from all wallets.
> Each transaction tagged with its source account name.
> Internal transfers show → icon with both account names.

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

**Screen 4 — Dashboard (After Creation)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund         ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $2,000,000.00                  │
│                                 │
│  ┌──────────────┐ ┌───────────────┐
│  │ Main AlphaUSD│ │ Main BetaUSD  │
│  │ $1,000,000   │ │ $1,000,000    │
│  │ 0xabc…  ⋯   │ │ 0xdef…  ⋯     │
│  └──────────────┘ └───────────────┘
│  ┌────────────────┐               │
│  │Savings AlphaUSD│               │
│  │ $0.00          │               │
│  │ 0x789…  ⋯     │               │
│  └────────────────┘               │
│                                 │
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

  If wallet holds any detectable assets:
    → Dialog: "This wallet still holds funds. Transfer them before deleting."
    → "Transfer Balance" button → opens send form pre-filled with full balance
    → After all detectable balances are 0, user can retry delete

  If all detectable balances == 0:
    → Confirmation dialog: "Delete [account name]? This cannot be undone."
    → User confirms → account removed from DB, card removed from dashboard
    → On-chain wallet still exists but app no longer tracks it

  If default account (Main AlphaUSD / Main BetaUSD):
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
> "Transfer Balance" opens the relevant transfer/send flow pre-filled with the remaining detected asset.

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
  → If opened from dashboard: first account is selected by default
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
│  Network fee          $0.00     │
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

### 6.6. Internal Transfer (Same Token)

```
User taps "Transfer" on account detail or dashboard
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

**Screen 2 — Swap Confirmed**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐    │
│  │ ✓ Swap confirmed        │    │
│  │   250 AlphaUSD →        │    │
│  │   249.75 BetaUSD        │    │
│  └─────────────────────────┘    │
│ ◆ Spire · Ops Fund         ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $2,000,000.00                  │
│                                 │
│  ┌──────────────┐ ┌───────────────┐
│  │ Main AlphaUSD│ │ Main BetaUSD  │
│  │ $999,750     │ │ $1,000,249.75 │
│  └──────────────┘ └───────────────┘
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↔ Swap  Main AlphaUSD →       │
│    Main BetaUSD · -$250 · now   │
│                                 │
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
  → Action buttons: Send, Receive (QR + address for THIS account), Swap
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

**Receive Sheet (Per-Account)**

```
┌─────────────────────────────────┐
│ ← Main AlphaUSD            ⋯  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   Receive into           │    │
│  │   Main AlphaUSD         │    │
│  │                         │    │
│  │   ┌─────────────┐       │    │
│  │   │             │       │    │
│  │   │   QR CODE   │       │    │
│  │   │             │       │    │
│  │   │             │       │    │
│  │   └─────────────┘       │    │
│  │                         │    │
│  │   0xabc1...def2         │    │
│  │                         │    │
│  │  ┌───────────────────┐  │    │
│  │  │  📋 Copy Address  │  │    │
│  │  └───────────────────┘  │    │
│  │                         │    │
│  │   Send AlphaUSD to      │    │
│  │   this address.         │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Account name shown at top so user knows which wallet they're sharing.
> QR encodes this account's unique wallet address (not the treasury root).
> Helper text specifies the token type to avoid wrong-token sends.
> Same dismiss behavior as MVP (tap outside or swipe down).

### 6.9. Accounts Management Page

```
User navigates to "Accounts" in nav
  → List of all accounts with name, token, balance, address (truncated)
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
> Each account row shows name, balance, truncated address.
> Default accounts marked with 🔒.
> "⋯" menu: Rename + Delete (Delete hidden for defaults).
> "+ New Account" button in header.

## 7. Definition of Done

### Account CRUD

1. Given a new treasury is created, When setup completes, Then two Tempo wallets are created on-chain, each with the root passkey registered on its keychain, and "Main AlphaUSD" and "Main BetaUSD" accounts appear on the dashboard.
2. Given a returning user authenticates, When the session is restored, Then the treasury is still identified by its controller/root Tempo account rather than any individual spend wallet.
3. Given the user taps "New Account", When they select a token and name and confirm, Then a new Tempo wallet is created on-chain with the root passkey registered, and the account appears on dashboard and accounts page.
4. Given the user creates a second AlphaUSD account, When it's created, Then it has its own unique wallet address and independent balance.
5. Given the user taps Rename on an account, When they enter a new name and save, Then the name updates everywhere (dashboard, detail, accounts page).
6. Given the user creates or renames an account with a name that already exists, When they submit, Then an inline error "Name already taken" is shown and the action is blocked, even under concurrent requests.
7. Given the user taps Delete on an account with no detectable wallet balances, When they confirm, Then the account is removed from the app (wallet still exists on-chain).
8. Given the user taps Delete on an account with any detectable wallet balance, When the dialog appears, Then it blocks deletion and offers a transfer path.
9. Given the account is a default (Main AlphaUSD / Main BetaUSD), When the user opens the menu, Then the Delete option is not shown.

### Dashboard

10. Given the user has multiple accounts, When they view the dashboard, Then all accounts show as cards with name, token, balance, and address, plus a total balance in USD at the top (all tokens counted 1:1).
11. Given the user views the dashboard transaction feed, When they tap an account filter, Then only transactions from that account's wallet are shown.

### Account Detail

12. Given the user taps an account card, When the detail page loads, Then it shows the account name, token, balance, unique wallet address, and transaction history for that wallet.
13. Given the user taps "Send" on an account detail page, When the send form opens, Then the account is pre-selected.
14. Given the user taps "Receive" on an account detail page, When the receive sheet opens, Then it shows that account's unique wallet address and QR code.

### Send Flow

15. Given the user opens the send form from the dashboard, When the form loads, Then an account selector is shown and the first account is selected by default.
16. Given the user selects a different account, When the selection changes, Then the token, available balance, and sending address update.

### Internal Transfers

17. Given the user opens the transfer form, When they select a "From" account, Then the "To" selector only shows other accounts with the same token.
18. Given the user has only one account for a token, When they view that account's detail page, Then the "Transfer" button is not shown.
19. Given the user opens the transfer form, When they confirm, Then a TIP-20 transfer executes between the two wallet addresses and both balances update.

### Swaps

20. Given the user opens the swap form, When they select a "From" account, Then the "To" selector only shows accounts with a different token type.
21. Given the user opens the swap form, When they select source and destination accounts, Then a quote is fetched from the Tempo DEX.
22. Given the user confirms a swap, When the swap and follow-up transfer both succeed, Then both account balances update and the swap appears in both accounts' transaction histories.
23. Given the follow-up transfer after a swap fails, When the error is detected, Then the app shows that the output funds remain in the source wallet and offers a recovery path.
24. Given a swap fails before settlement, When the error is detected, Then the optimistic update rolls back and an error toast is shown.

### Accounts Page

25. Given the user navigates to the Accounts page, When it loads, Then all accounts are listed with name, token, balance, address, and action menus.

## 8. Out of Scope

| Feature | Why | Future? |
|---|---|---|
| **Cross-chain swaps** | Only same-chain Tempo DEX swaps | Yes — requires bridge |
| **Limit orders on DEX** | Only instant market swaps | Yes — Tempo DEX supports limit orders natively |
| **Swap fee customization** | Use default Tempo DEX fees | Yes |
| **Account reordering** | Cards shown in creation order | Yes — drag-and-drop reorder |
| **Account icons/colors** | No visual customization | Yes |
| **Per-account Ledger policy** | Each account could have its own spending limit / Ledger requirement | Yes — when Ledger is added |
| **Bulk account creation** | Create one at a time | Yes |
| **Unassigned token display/withdrawal** | Tokens sent to a wallet for the wrong token type are ignored in the UI | Yes — withdrawal logic later |

## 9. References

- [Tempo Token List](https://docs.tempo.xyz/quickstart/tokenlist)
- [Tempo Faucet — Token Addresses](https://docs.chainstack.com/reference/tempo-tempo-fundaddress)
- [Tempo Stablecoin DEX — Executing Swaps](https://docs.tempo.xyz/guide/stablecoin-dex/executing-swaps)
- [Tempo Stablecoin Exchange Protocol](https://docs.tempo.xyz/protocol/exchange)
- [Tempo Account Keychain Precompile](https://docs.tempo.xyz/protocol/transactions/spec-tempo-transaction)
- [MVP PRD](../mvp/prd.md)
- [MVP Spec](../mvp/spec.md)
- [Authentication Architecture](../mvp/authentication.md)

## 10. FAQs

### Q1: How do accounts work on-chain?

Each account is a **separate Tempo wallet** with its own on-chain address. The balance you see is the actual on-chain balance — no app-layer accounting. The user's root passkey is registered on each wallet's keychain, so one biometric scan signs for any account. Separately, the treasury keeps a controller/root Tempo account for authentication and session restore.

### Q2: Do I need a new passkey for each account?

No. One root passkey (created during treasury setup) controls all account wallets. When a new account is created, the root passkey is registered on the new wallet's keychain. One fingerprint scan = sign for any account.

### Q3: Can I have two AlphaUSD accounts?

Yes. Each is a separate wallet with its own address and independent balance. E.g., "Ops AlphaUSD" and "Savings AlphaUSD" are two different wallets both holding AlphaUSD.

### Q4: What happens when I delete an account?

If the wallet has no detectable balances — the account is removed from the app. The on-chain wallet still exists but the app stops tracking it. If the wallet still holds any detectable asset, including an unassigned token, deletion is blocked until you transfer the funds out.

### Q5: How do swaps work?

Tempo has a native stablecoin DEX. The app fetches a quote (exchange rate + amount), shows it to the user, and submits the swap signed by the root passkey. The swap output first lands in the source wallet, then the app submits a follow-up transfer into the destination account wallet. If that second step fails, the output remains recoverable from the source wallet.

### Q6: How do internal transfers work?

A simple TIP-20 transfer from one account's wallet address to another. Signed by the root passkey. Same as sending to any external address, just between your own accounts.

### Q7: What about the Tempo faucet tokens?

The faucet provides AlphaUSD, BetaUSD, ThetaUSD, pathUSD. We use AlphaUSD and BetaUSD as our supported tokens on testnet. ThetaUSD and pathUSD sent to account wallets are ignored in the main balance UI for now, but they still count as wallet funds for delete safety. On mainnet, we'll switch to USDC.e and EURC.e.

## 11. Appendix

### Token Addresses (Tempo, Chain ID: 42431)

**Testnet (active):**

| Token | Address | Decimals |
|---|---|---|
| AlphaUSD | `0x20c0000000000000000000000000000000000001` | 6 |
| BetaUSD | `0x20c0000000000000000000000000000000000002` | 6 |

**Mainnet (future):**

| Token | Symbol | Address | Decimals |
|---|---|---|---|
| Bridged USDC (Stargate) | USDC.e | `0x20c0000000000000000000009e8d7eb59b783726` | 6 |
| Bridged EURC (Stargate) | EURC.e | `0x20c000000000000000000000d72572838bbee59c` | 6 |

Source: [USDC.e](https://tokenlist.tempo.xyz/asset/42431/0x20c0000000000000000000009e8d7eb59b783726) · [EURC.e](https://tokenlist.tempo.xyz/asset/42431/0x20c000000000000000000000d72572838bbee59c)

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
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  treasuryNameUnique: uniqueIndex('accounts_treasury_name_idx').on(table.treasuryId, table.name),
  walletAddressUnique: uniqueIndex('accounts_wallet_address_idx').on(table.walletAddress),
}));
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                    Spire App                      │
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
