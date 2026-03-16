# PRD: Spire — MVP

## 1. Meta Information

- **Created Date:** 2026-03-16
- **Epic:** Spire MVP
- **SPEC:** [spec.md](./spec.md)
- **Auth Architecture:** [authentication.md](./authentication.md)

## 2. What

A single-wallet treasury management app built on the [Tempo blockchain](https://tempo.xyz/). One user manages one wallet — view stablecoin balances, send payments, receive payments, and browse transaction history. Authentication is passkey-only (fingerprint / Face ID). No seed phrases, no gas tokens, no wallet extensions. Payments settle in under a second and cost near-zero.

## 3. Motivation

Managing a treasury wallet on-chain today requires juggling browser extensions, seed phrases, gas tokens, and clunky block explorer UIs. Mainstream finance teams and solo operators need a simple, fast interface to move stablecoins — not a crypto power-user toolbox.

Tempo's native passkey auth, gasless transactions, and sub-second finality make it possible to deliver a treasury management UX that feels like a banking app. The MVP validates this with the simplest possible scope: one user, one wallet, basic operations.

### Architecture Considerations for Future Growth

The MVP is intentionally minimal, but the architecture accounts for features that will come later. These are **not built** in MVP but the data model, auth model, and component boundaries are designed to support them without rewrites:

- **Ledger hardware wallet** — Tempo's keychain supports multiple key types per account; the auth layer is structured for tiered auth (see [authentication.md](./authentication.md))
- **Multi-signature approvals** — app-layer approval queue pattern identified; DB schema can accommodate approval records
- **Compliance policies** — Tempo TIP-403 is protocol-native; no custom infrastructure needed when ready
- **Multiple pockets** — same token in separate sub-accounts; the account model can extend to support this
- **Multi-user management** — role-based access on top of the single-account model

## 4. User Stories

### Account & Authentication

1. As a **user**, I want to create a treasury wallet using my fingerprint or Face ID (passkey) so that I don't need a password or seed phrase.
2. As a **user**, I want to name my treasury during creation so that I can identify it easily.
3. As a **user**, I want to rename my treasury later in settings so that I can update it as its purpose changes.
4. As a **user**, I want to log in with my passkey so that returning to the app is instant and secure.
5. As a **user**, I want to log out so that no one else can access my treasury on a shared device.
6. As a **user**, I want my session to expire after inactivity so that my treasury is protected if I walk away.
7. As a **user**, I want to see my stablecoin balances on a dashboard so that I know how much is in the treasury at a glance.
8. As a **user**, I want my dashboard to load instantly when I return to the app so that I'm never waiting.

### Send Payments

9. As a **user**, I want to send a stablecoin payment by entering a recipient address, amount, and optional memo so that I can move money out of the treasury.
10. As a **user**, I want clear error messages if I enter an invalid address, exceed my balance, or leave required fields empty so that I can fix mistakes before confirming.
11. As a **user**, I want my payment to appear in the transaction list immediately after I confirm so that I know it's being processed.
12. As a **user**, I want to pay zero transaction fees so that moving money is cost-effective.

### Receive Payments

13. As a **user**, I want to view my wallet address and a QR code so that I can share them with senders.
14. As a **user**, I want to copy my wallet address with one tap so that sharing it is quick.
15. As a **user**, I want incoming payments to appear in real-time without refreshing so that I see money arriving instantly.
16. As a **user**, I want to see a "live updates paused" indicator if the real-time connection drops so that I know to refresh manually.

### Transaction History

17. As a **user**, I want to see all past transactions (sent and received) with dates, amounts, addresses, and memos so that I have a complete audit trail.
18. As a **user**, I want to filter transactions by date, amount, or address so that I can find specific payments.

### Offline & Performance

19. As a **user**, I want to browse balances and recent transactions on flaky connections so that I always have access to my treasury data.
20. As a **user**, I want page navigations to feel instant so that the app never feels sluggish.

## 5. User Flow

### 5.1. First-Time Setup

```
User opens app
  → Lands on welcome page
  → Taps "Create Treasury"
  → User enters a treasury name (e.g., "Ops Fund", "Marketing Budget")
  → Browser prompts for passkey creation (fingerprint / Face ID)
  → Tempo passkey account is created on-chain
  → Server automatically funds the wallet via Tempo faucet RPC (no user action)
  → User redirected to dashboard with balances already visible
```
> **Testnet only:** The auto-funding step uses Tempo's faucet RPC. On mainnet,
> this will be replaced by a deposit flow (receive from external wallet/exchange).

#### Screen Mockups

**Screen 1 — Welcome**

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│            ◆ SPIRE              │
│                                 │
│   Manage your stablecoin        │
│   treasury. No passwords,       │
│   no seed phrases.              │
│                                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Create Treasury  →    │    │
│  └─────────────────────────┘    │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Screen 2 — Name Your Treasury**

```
┌─────────────────────────────────┐
│                                 │
│            ◆ SPIRE              │
│                                 │
│                                 │
│   Name your treasury            │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Ops Fund                │    │
│  └─────────────────────────┘    │
│                                 │
│   This is for your reference    │
│   only. You can change it       │
│   later.                        │
│                                 │
│  ┌─────────────────────────┐    │
│  │      Continue  →        │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Screen 3 — Passkey Creation (Browser Native Prompt)**

```
┌─────────────────────────────────┐
│                                 │
│            ◆ SPIRE              │
│                                 │
│   ┌───────────────────────┐     │
│   │                       │     │
│   │   Create a passkey    │     │
│   │   for spire.app       │     │
│   │                       │     │
│   │   ┌─────────────┐     │     │
│   │   │  ◉ Touch ID  │     │     │
│   │   └─────────────┘     │     │
│   │                       │     │
│   │  Cancel    Continue   │     │
│   └───────────────────────┘     │
│                                 │
│  Setting up your treasury...    │
│                                 │
└─────────────────────────────────┘
```
> This is a browser-native WebAuthn dialog. Appearance varies by OS/browser.
> We cannot customize its content — only the surrounding page.

**Screen 4 — Creating (Loading State)**

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│            ◆ SPIRE              │
│                                 │
│                                 │
│         ◌  Creating your        │
│            treasury...          │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```
> Single rotating spinner. No step-by-step breakdown — the user just waits
> 2-3 seconds while wallet creation + faucet funding happen server-side.

**Screen 5 — Dashboard (First Load)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $400.00                        │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ AlphaUSD │  │ pathUSD  │    │
│  │  $100.00 │  │  $100.00 │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ BetaUSD  │  │ ThetaUSD │    │
│  │  $100.00 │  │  $100.00 │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ┌───────┐  ┌───────────┐      │
│  │ Send  │  │ Receive ↓ │      │
│  └───────┘  └───────────┘      │
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↓ Faucet funding  +$100.00    │
│    AlphaUSD · just now          │
│  ↓ Faucet funding  +$100.00    │
│    pathUSD · just now           │
│  ↓ Faucet funding  +$100.00    │
│    BetaUSD · just now           │
│  ↓ Faucet funding  +$100.00    │
│    ThetaUSD · just now          │
│                                 │
└─────────────────────────────────┘
```
> First-time dashboard shows faucet-funded balances immediately.
> "Send" and "Receive" are the two primary actions.
> Wallet address truncated in header, full address copyable on tap.

### 5.2. Returning User

```
User opens app
  → Service worker serves cached app shell instantly (<200ms)
  → App shows login screen (no data visible — balances and transactions are hidden)
  → Browser prompts for passkey authentication (fingerprint / Face ID)
  → Auth verified → persisted cache renders last-known data immediately
  → Fresh data streams in via PPR in the background
  → Dashboard fully interactive with live data
```

#### Screen Mockups

**Screen 1 — Lock Screen (Before Auth)**

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│            ◆ SPIRE              │
│                                 │
│          Ops Fund               │
│                                 │
│                                 │
│   ┌───────────────────────┐     │
│   │                       │     │
│   │   Verify your         │     │
│   │   identity            │     │
│   │                       │     │
│   │   ┌─────────────┐     │     │
│   │   │  ◉ Touch ID  │     │     │
│   │   └─────────────┘     │     │
│   │                       │     │
│   │       Continue        │     │
│   └───────────────────────┘     │
│                                 │
│                                 │
└─────────────────────────────────┘
```
> Treasury name is shown, but no balances or transactions.
> Browser passkey prompt appears automatically on page load.
> No "skip" or "later" — auth is required to proceed.

**Screen 2 — Dashboard (Cached → Live)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $1,247.50          ◌ updating  │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ AlphaUSD │  │ pathUSD  │    │
│  │  $847.50 │  │  $200.00 │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ BetaUSD  │  │ ThetaUSD │    │
│  │  $150.00 │  │   $50.00 │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ┌───────┐  ┌───────────┐      │
│  │ Send  │  │ Receive ↓ │      │
│  └───────┘  └───────────┘      │
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↑ Payment to 0x9f3...  -$50   │
│    AlphaUSD · 2 hours ago       │
│  ↓ From 0xbc7...       +$200   │
│    pathUSD · yesterday          │
│  ↑ Payment to 0x4e1... -$75    │
│    AlphaUSD · 2 days ago        │
│                                 │
└─────────────────────────────────┘
```
> Renders immediately from persisted TanStack Query cache (<100ms).
> "◌ updating" indicator shows briefly while fresh data streams in.
> Once live data arrives, indicator disappears and values update silently.
> If nothing changed, user sees no visual difference — instant.

### 5.3. Send Payment

```
User taps "Send" on dashboard
  → Payment form: recipient address, amount, stablecoin, memo (optional)
  → User taps "Confirm" → passkey signs the transaction
  → Optimistic update: payment appears as "pending", balance decrements
  → Server action submits transfer via Tempo SDK (fee sponsored — $0)
  → Tempo confirms in <1 second
  → Status updates to "confirmed"
  → If failure: rollback, error toast shown
```

#### Screen Mockups

**Screen 1 — Send Form**

```
┌─────────────────────────────────┐
│ ← Send Payment                  │
│─────────────────────────────────│
│                                 │
│  To                             │
│  ┌─────────────────────────┐    │
│  │ 0x                      │    │
│  └─────────────────────────┘    │
│                                 │
│  Token                          │
│  ┌─────────────────────────┐    │
│  │ AlphaUSD          ▼     │    │
│  └─────────────────────────┘    │
│  Available: $847.50             │
│                                 │
│  Amount                         │
│  ┌─────────────────────────┐    │
│  │ $                       │    │
│  └─────────────────────────┘    │
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
> Token dropdown shows available stablecoins with balances.
> "Available" updates when token selection changes.
> Network fee always shows $0.00 (fee sponsored).
> "Confirm & Send" triggers passkey prompt.
> Button is disabled until all required fields are valid.

**Screen 2 — Validation Errors**

```
┌─────────────────────────────────┐
│ ← Send Payment                  │
│─────────────────────────────────│
│                                 │
│  To                             │
│  ┌─────────────────────────┐    │
│  │ 0x9zz_INVALID           │    │
│  └─────────────────────────┘    │
│  ⚠ Invalid address format       │
│                                 │
│  Token                          │
│  ┌─────────────────────────┐    │
│  │ AlphaUSD          ▼     │    │
│  └─────────────────────────┘    │
│  Available: $597.50             │
│                                 │
│  Amount                         │
│  ┌─────────────────────────┐    │
│  │ $ 800.00                │    │
│  └─────────────────────────┘    │
│  ⚠ Exceeds available balance    │
│                                 │
│  Memo (optional)                │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  Network fee          $0.00     │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Confirm & Send  →    │ ←disabled
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Inline validation — errors appear below each field as user types.
> "Confirm & Send" stays disabled until all errors are resolved.
> Validation rules:
>   - Address: must match `0x[a-fA-F0-9]{40}` format
>   - Amount: must be > 0, must not exceed available balance
>   - Token: must be selected (required)

**Screen 3 — Passkey Confirmation**

```
┌─────────────────────────────────┐
│ ← Send Payment                  │
│─────────────────────────────────│
│                                 │
│  Sending                        │
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │  $250.00 AlphaUSD       │    │
│  │                         │    │
│  │  To  0x9f3a...4e21      │    │
│  │  Memo  Invoice #1042    │    │
│  │  Fee   $0.00            │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│   ┌───────────────────────┐     │
│   │                       │     │
│   │   Confirm with        │     │
│   │   passkey             │     │
│   │                       │     │
│   │   ┌─────────────┐     │     │
│   │   │  ◉ Touch ID  │     │     │
│   │   └─────────────┘     │     │
│   │                       │     │
│   │       Continue        │     │
│   └───────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```
> Summary card shows exactly what will be sent — no surprises.
> Browser passkey prompt overlays the summary.
> User confirms with biometric → transaction submits.

**Screen 4 — Pending (Optimistic Update)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $997.50                        │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ AlphaUSD │  │ pathUSD  │    │
│  │  $597.50 │  │  $200.00 │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ BetaUSD  │  │ ThetaUSD │    │
│  │  $150.00 │  │   $50.00 │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ┌───────┐  ┌───────────┐      │
│  │ Send  │  │ Receive ↓ │      │
│  └───────┘  └───────────┘      │
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↑ To 0x9f3...    -$250.00 ◌  │
│    AlphaUSD · just now · pending│
│  ↑ Payment to 0x9f3...  -$50   │
│    AlphaUSD · 2 hours ago       │
│  ↓ From 0xbc7...       +$200   │
│    pathUSD · yesterday          │
│                                 │
└─────────────────────────────────┘
```
> User returns to dashboard immediately after passkey confirmation.
> Balance already decremented ($847.50 → $597.50).
> New transaction at top with "◌ pending" indicator.
> No loading screen — optimistic update is instant.

**Screen 5 — Confirmed**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐    │
│  │ ✓ Payment confirmed     │    │
│  └─────────────────────────┘    │
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↑ To 0x9f3...    -$250.00 ✓  │
│    AlphaUSD · just now          │
│                                 │
```
> Toast notification at top: "Payment confirmed".
> Transaction status changes from "◌ pending" to "✓".
> Happens ~1 second after submission. Feels instant.

### 5.4. Share Address (Receive)

```
User taps "Receive" on dashboard
  → Receive sheet slides up with wallet address + QR code
  → User taps "Copy Address" → address copied to clipboard, confirmation shown
  → User shares QR code or address with sender
  → User dismisses sheet → back to dashboard
```

#### Screen Mockup

**Screen 1 — Receive Sheet**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   Receive Payments      │    │
│  │                         │    │
│  │   ┌─────────────┐       │    │
│  │   │             │       │    │
│  │   │   QR CODE   │       │    │
│  │   │             │       │    │
│  │   │             │       │    │
│  │   └─────────────┘       │    │
│  │                         │    │
│  │   0x1a2b...8d3f         │    │
│  │                         │    │
│  │  ┌───────────────────┐  │    │
│  │  │  📋 Copy Address  │  │    │
│  │  └───────────────────┘  │    │
│  │                         │    │
│  │   Share this address    │    │
│  │   or QR code with the   │    │
│  │   sender.               │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Bottom sheet overlay — dashboard is still visible behind.
> QR code encodes the full wallet address.
> "Copy Address" copies to clipboard with brief "Copied!" confirmation.
> Dismiss by tapping outside or swiping down.

### 5.5. Incoming Payment (Real-Time)

```
External sender transfers stablecoins to this wallet's address
  → WebSocket subscription detects incoming TIP-20 Transfer event
  → TanStack Query cache invalidated (balances + transactions)
  → Payment appears in transaction list with memo
  → Balance updates — no page reload
  → If WebSocket is disconnected: "Live updates paused" banner shown,
    app falls back to polling every 15s until reconnected
```

#### Screen Mockups

**Screen 1 — Dashboard Before (Idle)**

```
┌─────────────────────────────────┐
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $997.50                        │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ AlphaUSD │  │ pathUSD  │    │
│  │  $597.50 │  │  $200.00 │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ BetaUSD  │  │ ThetaUSD │    │
│  │  $150.00 │  │   $50.00 │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ┌───────┐  ┌───────────┐      │
│  │ Send  │  │ Receive ↓ │      │
│  └───────┘  └───────────┘      │
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│  ↑ To 0x9f3...    -$250.00 ✓  │
│    AlphaUSD · 5 min ago         │
│  ↑ Payment to 0x9f3...  -$50   │
│    AlphaUSD · 2 hours ago       │
│                                 │
└─────────────────────────────────┘
```
> User is on the dashboard doing nothing.
> No action required — the next screens happen automatically.

**Screen 2 — Incoming Payment (Real-Time Update)**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐    │
│  │ ↓ Received $500.00      │    │
│  │   pathUSD from 0xbc7... │    │
│  └─────────────────────────┘    │
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $1,497.50                      │
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │ AlphaUSD │  │ pathUSD  │    │
│  │  $597.50 │  │▸ $700.00 │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ BetaUSD  │  │ ThetaUSD │    │
│  │  $150.00 │  │   $50.00 │    │
│  └──────────┘  └──────────┘    │
│                                 │
│  ┌───────┐  ┌───────────┐      │
│  │ Send  │  │ Receive ↓ │      │
│  └───────┘  └───────────┘      │
│                                 │
│  Recent Transactions  View all →│
│  ─────────────────────────      │
│▸ ↓ From 0xbc7...  +$500.00 ✓  │
│▸   pathUSD · just now           │
│  ↑ To 0x9f3...    -$250.00 ✓  │
│    AlphaUSD · 5 min ago         │
│  ↑ Payment to 0x9f3...  -$50   │
│    AlphaUSD · 2 hours ago       │
│                                 │
└─────────────────────────────────┘
```
> Toast notification slides in: "Received $500.00 pathUSD from 0xbc7..."
> Total balance updates instantly ($997.50 → $1,497.50).
> pathUSD card highlights briefly (▸) to draw attention ($200 → $700).
> New transaction appears at top of list, highlighted (▸).
> No page reload, no refresh button — WebSocket push + cache invalidation.
> Toast auto-dismisses after ~4 seconds.

**Screen 3 — WebSocket Disconnected**

```
┌─────────────────────────────────┐
│ ⚠ Live updates paused  Refresh │
│ ◆ Spire · Ops Fund  0x1a2… ⏻  │
│─────────────────────────────────│
│                                 │
│  Total Balance                  │
│  $1,497.50                      │
│                                 │
```
> Yellow banner appears when WebSocket connection drops.
> "Refresh" link forces a manual data refetch.
> Banner disappears automatically when connection is restored.
> App falls back to polling every 15s while banner is visible.

### 5.6. Logout

```
User taps "Log out" button in header
  → Session cleared, persisted cache cleared
  → User redirected to lock screen (5.2 Screen 1)
```

Auto-logout: session expires after 15 minutes of inactivity. User sees the lock screen on next interaction and must re-authenticate with passkey.

### 5.7. Browse Transaction History

```
User navigates to "Transactions" page
  → View Transition animates the route change
  → Prefetched data renders immediately
  → Transaction list with date, amount, address, memo, status
  → User can filter by date range, amount, address
```

#### Screen Mockups

**Screen 1 — Empty State (New Treasury)**

```
┌─────────────────────────────────┐
│ ← Transactions                  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ All  ○ Sent  ○ Recv  │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 🔍 Search by address... │    │
│  └─────────────────────────┘    │
│                                 │
│                                 │
│                                 │
│          No transactions        │
│              yet.               │
│                                 │
│   Send or receive a payment     │
│   to see it here.               │
│                                 │
│  ┌─────────────────────────┐    │
│  │       Send  →           │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │     Receive  ↓          │    │
│  └─────────────────────────┘    │
│                                 │
│                                 │
└─────────────────────────────────┘
```
> Shown when the treasury has no transactions (excluding faucet entries)
> or if the user is viewing a filtered view with no results.
> CTA buttons link to Send and Receive flows.

**Screen 2 — Transaction List (Default)**

```
┌─────────────────────────────────┐
│ ← Transactions                  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ All  ○ Sent  ○ Recv  │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 🔍 Search by address... │    │
│  └─────────────────────────┘    │
│                                 │
│  Today                          │
│  ─────────────────────────      │
│  ↓ From 0xbc7...4a12           │
│    +$500.00 pathUSD             │
│    Memo: Q1 vendor payment      │
│    10:32 AM · ✓ confirmed       │
│                                 │
│  ↑ To 0x9f3...4e21             │
│    -$250.00 AlphaUSD            │
│    Memo: Invoice #1042          │
│    9:15 AM · ✓ confirmed        │
│                                 │
│  Yesterday                      │
│  ─────────────────────────      │
│  ↑ To 0x9f3...4e21             │
│    -$50.00 AlphaUSD             │
│    8:41 PM · ✓ confirmed        │
│                                 │
│  ↓ From 0xbc7...4a12           │
│    +$200.00 pathUSD             │
│    Memo: March deposit          │
│    2:10 PM · ✓ confirmed        │
│                                 │
│  Mar 14                         │
│  ─────────────────────────      │
│  ↑ To 0x4e1...7b33             │
│    -$75.00 AlphaUSD             │
│    Memo: Reimbursement          │
│    11:20 AM · ✓ confirmed       │
│                                 │
│  ↓ From 0xd82...9c05           │
│    +$1,000.00 BetaUSD           │
│    4:55 PM · ✓ confirmed        │
│                                 │
│         ◌ Load more             │
│                                 │
└─────────────────────────────────┘
```
> Grouped by date. Each entry shows direction (↑ sent / ↓ received),
> counterparty address, amount, token, memo (if present), time, and status.
> Tabs filter by All / Sent / Received.
> Search box filters by address.
> Infinite scroll — "Load more" at bottom fetches older transactions.

**Screen 3 — Filtered (Sent Only)**

```
┌─────────────────────────────────┐
│ ← Transactions                  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ All  ● Sent  ○ Recv  │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 🔍 Search by address... │    │
│  └─────────────────────────┘    │
│                                 │
│  Today                          │
│  ─────────────────────────      │
│  ↑ To 0x9f3...4e21             │
│    -$250.00 AlphaUSD            │
│    Memo: Invoice #1042          │
│    9:15 AM · ✓ confirmed        │
│                                 │
│  Yesterday                      │
│  ─────────────────────────      │
│  ↑ To 0x9f3...4e21             │
│    -$50.00 AlphaUSD             │
│    8:41 PM · ✓ confirmed        │
│                                 │
│  Mar 14                         │
│  ─────────────────────────      │
│  ↑ To 0x4e1...7b33             │
│    -$75.00 AlphaUSD             │
│    Memo: Reimbursement          │
│    11:20 AM · ✓ confirmed       │
│                                 │
│         ◌ Load more             │
│                                 │
└─────────────────────────────────┘
```
> "Sent" tab active — only outgoing transactions shown.
> Same layout, just filtered. Received transactions hidden.

**Screen 4 — Search by Address**

```
┌─────────────────────────────────┐
│ ← Transactions                  │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ All  ○ Sent  ○ Recv  │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ 🔍 0x9f3                │    │
│  └─────────────────────────┘    │
│  Showing results for 0x9f3...   │
│                                 │
│  Today                          │
│  ─────────────────────────      │
│  ↑ To 0x9f3...4e21             │
│    -$250.00 AlphaUSD            │
│    Memo: Invoice #1042          │
│    9:15 AM · ✓ confirmed        │
│                                 │
│  Yesterday                      │
│  ─────────────────────────      │
│  ↑ To 0x9f3...4e21             │
│    -$50.00 AlphaUSD             │
│    8:41 PM · ✓ confirmed        │
│                                 │
│  2 transactions found           │
│                                 │
└─────────────────────────────────┘
```
> User types partial address in search box.
> List filters in real-time as they type.
> Result count shown at bottom.
> Can combine with Sent/Received tabs.

**Screen 5 — Transaction Detail**

```
┌─────────────────────────────────┐
│ ← Transaction Detail            │
│─────────────────────────────────│
│                                 │
│  Sent                           │
│  -$250.00 AlphaUSD              │
│                                 │
│  ─────────────────────────      │
│  Status        ✓ Confirmed      │
│  Date          Mar 16, 9:15 AM  │
│  ─────────────────────────      │
│  To            0x9f3a...4e21    │
│                         📋 Copy │
│  From          0x1a2b...8d3f    │
│                         📋 Copy │
│  ─────────────────────────      │
│  Token         AlphaUSD         │
│  Amount        $250.00          │
│  Network fee   $0.00            │
│  ─────────────────────────      │
│  Memo                           │
│  Invoice #1042                  │
│  ─────────────────────────      │
│  Tx Hash                        │
│  0x7c4f...2e91         📋 Copy │
│                                 │
│  ┌─────────────────────────┐    │
│  │  View on Explorer  ↗   │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```
> Tapping any transaction in the list opens this detail view.
> All fields copyable (address, tx hash).
> "View on Explorer" links to explore.tempo.xyz.
> Back arrow returns to the filtered list state.

## 6. Definition of Done

### Account & Authentication

1. Given the user is on the welcome page, When they tap "Create Treasury", enter a name, and complete passkey creation, Then a Tempo passkey account is created on-chain, automatically funded with test stablecoins, and the user is redirected to the dashboard showing the treasury name and balances.
2. Given the user is in Settings, When they edit the treasury name and save, Then the new name is persisted and displayed in the header.
3. Given a returning user opens the app, When they authenticate with their passkey, Then the dashboard loads with fresh data. No financial data is visible before authentication.
4. Given the user is on the dashboard, When they view balances, Then they see the balance for each supported stablecoin in the wallet.
5. Given the user taps "Log out", When the action completes, Then the session and persisted cache are cleared and the user is redirected to the lock screen.
6. Given the user has been inactive for 15 minutes, When they next interact with the app, Then they are redirected to the lock screen and must re-authenticate with their passkey.

### Send Payments

7. Given the user taps "Send", When they enter an invalid address format, Then an inline error "Invalid address format" appears below the field and the confirm button remains disabled.
8. Given the user taps "Send", When they enter an amount exceeding their available balance, Then an inline error "Exceeds available balance" appears and the confirm button remains disabled.
9. Given the user taps "Send", When they fill in valid recipient address, amount, stablecoin, and optional memo and tap "Confirm", Then the payment appears as "pending" in the transaction list and the balance decrements instantly.
10. Given a payment has been submitted, When Tempo confirms the transaction (less than 1 second), Then the status updates to "confirmed".
11. Given a payment fails, When the error is detected, Then the optimistic update rolls back and an error toast is shown.
12. Given the user sends a payment, When the transaction is processed, Then the user pays zero fees.

### Receive Payments

13. Given the user taps "Receive" on the dashboard, When the receive sheet opens, Then the wallet address and a QR code are displayed.
14. Given the user taps "Copy Address" on the receive sheet, When the action completes, Then the full address is copied to the clipboard and a "Copied!" confirmation is shown.
15. Given an external sender sends stablecoins to the wallet address, When the TIP-20 Transfer event is emitted, Then the payment appears in the transaction list and the balance updates in real-time without page refresh.
16. Given the WebSocket connection drops, When the app detects the disconnect, Then a "Live updates paused" banner is shown and the app falls back to polling every 15 seconds until reconnected.

### Transaction History

17. Given the user navigates to the transaction history, When the page loads, Then all sent and received transactions are displayed with date, amount, counterparty address, status, and memo.
18. Given the user is on the transaction history, When they apply filters (All/Sent/Received tabs, address search), Then the list updates to show only matching transactions.
19. Given the user taps a transaction in the list, When the detail view opens, Then all fields are shown (status, date, to, from, token, amount, fee, memo, tx hash) with copyable addresses and a link to the block explorer.
20. Given the treasury has no transactions, When the user opens the transaction history, Then an empty state is shown with "No transactions yet" and links to Send and Receive.

### Performance

21. Given the dashboard page is requested, When the response is sent, Then the static shell is served from CDN with TTFB less than 50ms and dynamic content streams in via Suspense.
22. Given the user navigates between routes, When the navigation occurs, Then a View Transition animates the change at 60fps on supported browsers.
23. Given the app is built, When Lighthouse CI runs, Then LCP is less than 400ms, INP is less than 100ms, and CLS is less than 0.05.
24. Given the initial client bundle, When measured, Then it is less than 100kb gzipped.

### Offline & Resilience

25. Given the user has visited the app before, When they open it offline, Then the app shell loads from service worker cache and cached data renders from IndexedDB.
26. Given the user is on a flaky connection, When they browse, Then cached data renders immediately and fresh data loads when connectivity returns.

### Security

27. Given any page is loaded, When HTTP response headers are inspected, Then HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and CSP headers are present.
28. Given any server action receives input, When processed, Then it is validated against a Zod schema before reaching the database or Tempo RPC.

### Observability (MVP+)

29. (MVP+) Given an unhandled error occurs, When Sentry captures it, Then the report includes source-mapped stack trace, breadcrumbs, and release version.
30. (MVP+) Given the user completes a key action (wallet created, payment sent, payment received, logout), When the action completes, Then a PostHog event is tracked.

### Deployment

31. Given the MVP is complete, When deployed, Then the app is live and accessible on a `*.vercel.app` domain.

## 7. Out of Scope (MVP)

Items deferred from MVP. Architecture accounts for all of these — no rewrites needed when they're built.

| Feature | Why Deferred | Architecture Ready? |
|---|---|---|
| **Ledger hardware wallet** | Adds auth complexity; passkey sufficient for single-user treasury | Yes — keychain supports multiple key types (see [authentication.md](./authentication.md)) |
| **Multi-signature approvals** | Requires approval queue, multi-user roles | Yes — app-layer approval pattern identified, DB schema extensible |
| **Compliance policies (TIP-403)** | Admin tooling scope; not needed for single-user | Yes — Tempo protocol-native, no custom infrastructure |
| **Multiple pockets (sub-accounts)** | Same token in separate buckets; UX complexity | Yes — account model can extend |
| **Multi-user management** | Roles, permissions, team access | Yes — auth + DB model designed for extension |
| **Batch payments** | Multi-recipient in one tx; needs Ledger for elevated auth | Yes — Tempo batch primitive available |
| **Transaction labels / categories** | UX feature, not core treasury ops | Yes — DB schema has metadata table |
| **Account recovery (external wallet)** | Requires MetaMask integration + email verification | Yes — keychain recovery key slot reserved (see [authentication.md](./authentication.md) Tier 3) |
| **Username-based lookup** | Requires user directory; MVP uses addresses only | Yes — profile table supports username field |
| **Fiat on/off-ramp** | Bank transfers, card funding | No — requires third-party integration |
| **Multi-currency (non-stablecoin)** | ETH, BTC, etc. | No — different token standards |
| **Recurring payments** | Scheduled transfers | Partial — Tempo supports scheduled transactions natively |
| **Cross-chain transfers** | Bridge to Ethereum, etc. | No — requires bridge infrastructure |
| **Mobile native app** | iOS / Android | Partial — PWA covers mobile for now |
| **Multi-language / i18n** | English only | Yes — standard i18n patterns |
| **Rate limiting** | Upstash Redis in edge middleware | Yes — middleware slot ready |
| **tRPC API layer** | Server Actions sufficient for MVP scope | Yes — can wrap existing actions |
| **Secrets manager (Doppler)** | Vercel env vars sufficient | Yes — swap env source |
| **Mainnet deployment** | Testnet only | Yes — RPC URL + chain ID config swap |

## 8. References

- [Tempo Documentation](https://docs.tempo.xyz/)
- [Tempo GitHub Repository](https://github.com/tempoxyz/tempo)
- [Send a Payment Guide](https://docs.tempo.xyz/guide/payments/send-a-payment)
- [Accept a Payment Guide](https://docs.tempo.xyz/guide/payments/accept-a-payment)
- [Passkey Accounts Guide](https://docs.tempo.xyz/guide/use-accounts/embed-passkeys)
- [Fee Sponsorship Guide](https://docs.tempo.xyz/guide/payments/sponsor-user-fees)
- [Technical Specification](./spec.md)
- [Authentication Architecture](./authentication.md)

## 9. FAQs

### Q1: Why Tempo instead of Ethereum/Solana/Base?

Tempo is purpose-built for stablecoin payments: native transfer memos, payment lanes with predictable fees, passkey accounts (no seed phrases), gasless transactions, and sub-second finality. For treasury management, these features eliminate the middleware and UX hacks that general-purpose chains require.

### Q2: What happens if Tempo's testnet goes down?

Users can still view cached balances and transactions (service worker + IndexedDB). Payment submissions will fail with a clear error. Sentry will alert on error spikes.

### Q3: How does the user pay for transactions if there's no gas token?

A server-side fee payer account sponsors all user fees via Tempo's fee sponsorship mechanism. Users pay $0. The fee payer account is funded by us and monitored for low balance.

### Q4: What if a user loses their device (and passkey)?

Passkeys sync across devices via iCloud Keychain / Google Password Manager, so losing one device isn't usually a problem. If all synced devices are lost, users contact support for MVP. Self-service recovery via external wallet is planned post-MVP (see [authentication.md](./authentication.md) Tier 3).

### Q5: Why single-user, single-wallet for MVP?

The simplest scope that validates the core hypothesis: can Tempo deliver a banking-grade treasury UX? Multi-user, multi-sig, and sub-accounts add collaboration complexity that isn't needed to prove the core value. The architecture supports all of them when ready.

### Q6: Is this a custodial wallet?

No. The user holds the passkey — we never have access to their private key. The fee payer account only covers gas fees and cannot move user funds. This is a non-custodial, self-sovereign wallet with a managed UX layer on top.

## 10. Appendix

### Target Performance Metrics

| Metric | Target |
|---|---|
| TTFB (static shell) | < 50ms |
| LCP | < 400ms |
| INP | < 100ms |
| CLS | < 0.05 |
| Repeat visit to interactive | < 200ms |
| Dashboard data (returning user) | < 100ms |
| Route navigation | < 100ms |
| Payment confirmation | < 1s |
| Client JS bundle (initial) | < 100kb gzipped |

### Supported Stablecoins (Testnet)

| Token | Address |
|---|---|
| pathUSD | Testnet faucet |
| AlphaUSD | Testnet faucet |
| BetaUSD | Testnet faucet |
| ThetaUSD | Testnet faucet |

### Key Tempo Testnet Details

- **Chain ID:** 42431
- **RPC:** `https://rpc.moderato.tempo.xyz`
- **Explorer:** https://explore.tempo.xyz
- **Faucet:** `cast rpc tempo_fundAddress <ADDRESS>`
