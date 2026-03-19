# PRD: Cross-Chain USDC Deposits via Stargate

## 1. Meta Information

- **Created Date:** 2026-03-19
- **Epic:** Cross-Chain Deposits
- **Depends On:** [Multi-Accounts PRD](../multi-accounts/prd.md)

## 2. What

Enable Goldhord users to top up their treasury accounts with USDC from Ethereum and Solana — not just Tempo. The deposit modal gains a **source chain selector** so users can pick where they're sending from. Funds arrive as native USDC on Tempo via [Stargate Finance](https://stargate.finance/) (LayerZero).

Phase 1 is USDC-account-only. Cross-chain receive is enabled only when the selected account is the treasury's USDC account; non-USDC accounts keep the existing Tempo-only receive flow.

## 3. Motivation

Today, depositing into a Goldhord treasury requires the sender to already hold USDC on Tempo. This is a hard blocker for enterprise adoption — most corporate USDC sits on Ethereum, Solana, or other established chains. Requiring users to manually bridge before depositing adds friction, risk, and complexity that finance teams won't tolerate.

By integrating Stargate's cross-chain bridge directly into the deposit flow, we make "fund your treasury" a single action regardless of where the USDC currently lives. The user never leaves Goldhord, never needs to understand bridging, and gets a familiar experience (pick chain → send to address → done).

### Why Stargate

- **Native USDC delivery** — leverages Circle CCTP v2 for burn-and-mint (no wrapped tokens, no liquidity pool risk on supported routes)
- **80+ chains supported** — covers every chain where enterprise USDC lives
- **Built on LayerZero** — battle-tested cross-chain messaging with guaranteed finality
- **Low fees** — 0.06% base fee, competitive with direct CCTP
- **Widget + SDK options** — can ship fast with widget, migrate to custom UI later

## 4. User Stories

### Depositing from Another Chain

1. As a **treasury manager**, I want to select a source chain (e.g., Ethereum, Solana) in the deposit modal so that I can fund my Goldhord account from wherever my USDC currently sits.
2. As a **treasury manager**, I want to see clear deposit instructions for the selected chain so that I know exactly what to do to complete the deposit.
3. As a **treasury manager**, I want to see an estimated bridge fee and arrival time before sending so that I can make informed decisions.
4. As a **treasury manager**, I want to track the status of my cross-chain deposit (pending → bridging → arrived) so that I know my funds are safe.
5. As a **treasury manager**, I want to receive a notification when my cross-chain deposit lands so that I don't have to keep checking.
6. As a **treasury manager**, I want the deposit to appear in my transaction history with the source chain noted so that I have a complete audit trail.

### Depositing on Tempo (Existing Flow)

7. As a **treasury manager**, I want to still deposit directly on Tempo (the default) so that native deposits remain simple and instant.

## 5. User Flow

### 5.1. Deposit Modal — Chain Selection

```
User taps "Receive" on dashboard or account detail
  → Receive sheet opens
  → If multiple accounts: account selector shown (highest balance pre-selected)
  → Two dropdowns at top:
      [Network: Tempo (default)]  [Token: USDC]
  → Network dropdown options:
      • Tempo         ← default, existing flow
      • Ethereum
      • Solana
  → Token locked to USDC
```

### 5.2. Tempo Selected (Default — Existing Flow)

```
Network = Tempo selected
  → QR code shown with account's Tempo wallet address
  → Wallet address shown with copy button
  → Helper text: "Send USDC on Tempo to this address"
  → No fee, instant settlement
  → (Identical to current receive sheet behavior)
```

### 5.3. External Chain Selected (New Flow — Phase 1: Widget)

```
Network = Ethereum (or any non-Tempo chain) selected
  → Stargate widget embedded in the deposit sheet
  → Destination wallet address shown above the widget with copy button
  → User sets destination chain/address inside the widget
  → Widget handles:
      • Wallet connection (MetaMask, WalletConnect, etc.)
      • Amount input
      • Fee estimation + display
      • Transaction signing
      • Bridge execution
  → After submitting the bridge, user pastes the source tx hash into Goldhord to start tracking
  → Below widget: helper text with fee estimate + expected arrival time
  → Info banner: "Bridge powered by Stargate (LayerZero). Funds typically arrive in 1-5 minutes."
```

### 5.4. External Chain Selected (Future — Phase 2: Native UI)

```
Network = Ethereum (or any non-Tempo chain) selected
  → Custom native UI replaces widget:
      • Amount input field
      • "Connect Wallet" button (for source chain wallet)
      • Fee breakdown: bridge fee (≈0.06%) + gas estimate
      • Estimated arrival time
      • "Deposit" CTA button
  → User connects source chain wallet (MetaMask, WalletConnect)
  → User enters amount, reviews fees
  → Taps "Deposit"
  → Transaction signing prompt from source wallet
  → Progress tracker: Sent → Bridging → Arrived
  → Notification on completion
```

### 5.5. Deposit Tracking

```
After user initiates a cross-chain deposit
  → After the user pastes the source tx hash, transaction appears in history with status: "Bridging from [Chain]"
  → Animated indicator while bridge is in progress
  → On completion:
      • Status updates to "Received"
      • Balance updates
      • Toast notification: "Deposit of $X USDC from Ethereum arrived"
      • Source chain noted in transaction detail
```

## 6. UI Design

### 6.1. Deposit Modal Layout

The deposit modal extends the existing receive sheet with chain + token selectors:

```
┌─────────────────────────────────────────┐
│  Deposit USDC                        ✕  │
│                                         │
│  ┌─────────────────┐ ┌───────────────┐  │
│  │ Network      >  │ │ Token      >  │  │
│  │ 🔷 Ethereum     │ │ 💲 USDC       │  │
│  └─────────────────┘ └───────────────┘  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │    [Stargate Widget Embed]          ││
│  │    - Connect wallet                 ││
│  │    - Enter amount                   ││
│  │    - Review fees                    ││
│  │    - Sign & bridge                  ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  ℹ️ Bridge powered by Stargate.         │
│     Funds arrive in ~1-5 minutes.       │
│     Fee: ≈0.06%                         │
│                                         │
└─────────────────────────────────────────┘
```

When **Tempo** is selected (default), the modal looks identical to today — QR code + address + copy button.

### 6.2. Network Selector Dropdown

```
┌─────────────────────────┐
│  Select Network          │
│                          │
│  ⚡ Tempo        default │  ← free, instant
│  ─────────────────────── │
│  🔷 Ethereum             │
│  ◈  Solana               │
│                          │
└─────────────────────────┘
```

Each chain shows its icon and name. Tempo is highlighted as default with "free, instant" badge.

### 6.3. Transaction History Entry (Cross-Chain Deposit)

```
┌──────────────────────────────────────────┐
│  ↓ Received from Ethereum                │
│  +5,000.00 USDC                          │
│  Mar 19, 2026 · Bridged via Stargate     │
│  Status: ✓ Complete                      │
└──────────────────────────────────────────┘
```

For in-progress bridges:

```
┌──────────────────────────────────────────┐
│  ↓ Deposit from Solana                   │
│  +12,000.00 USDC                         │
│  Mar 19, 2026 · Bridging...  ◌           │
│  Status: In transit (~2 min remaining)   │
└──────────────────────────────────────────┘
```

## 7. Technical Approach

### 7.1. Phase 1: Stargate Widget (Ship Fast)

**Goal:** Get cross-chain deposits working with minimal custom code.

- Embed Stargate's pre-built widget (`@layerzerolabs/stargate-ui`) in the receive sheet
- Treat widget as a self-contained surface; do not assume documented callback or postMessage APIs
- Show destination chain/address instructions above the widget and require explicit source tx hash capture after submission
- Widget handles wallet connection, fee estimation, signing, and bridging
- Monitor LayerZero message status for bridge completion via server-side polling

**Integration:**
```html
<stargate-widget theme="dark" />
```

**Deposit tracking:**
- After the user pastes the source tx hash: create a `bridge_deposits` record in DB
- Poll LayerZero Scan API on the server for message delivery status
- On completion: mark deposit as arrived, invalidate balance cache, send notification
- Fallback: WebSocket listener on Tempo will also detect the incoming USDC transfer and accelerate UI refresh

### 7.2. Phase 2: Native UI with Smart Contract Calls (Future)

**Goal:** Replace widget with custom UI for full brand control and better UX.

- Call Stargate `quoteSend()` for fee estimation
- Build custom amount input, wallet connection (via WalletConnect/wagmi multi-chain), and review screen
- Call `sendToken()` via user's source chain wallet
- Custom progress tracker UI with real-time status updates
- Support for "Taxi" (immediate) and "Bus" (cheaper, batched) transfer modes

### 7.3. Database Changes

**New table: `bridge_deposits`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| accountId | UUID | FK → accounts |
| sourceChain | TEXT | e.g., "ethereum", "arbitrum" |
| amount | DECIMAL | USDC amount sent |
| status | TEXT | "pending" \| "bridging" \| "completed" \| "failed" |
| lzMessageHash | TEXT | LayerZero message hash for tracking |
| initiatedAt | TIMESTAMP | When user initiated the bridge |
| completedAt | TIMESTAMP | When funds arrived on Tempo |
| bridgeFee | DECIMAL | Fee charged by Stargate |
| sourceTxHash | TEXT | Transaction hash on source chain |
| tempoTxHash | TEXT | Transaction hash on Tempo (on arrival) |

### 7.4. New Domain

```
domain/
└── bridge/
    ├── components/
    │   ├── chain-selector.tsx       # Network dropdown
    │   ├── stargate-widget.tsx      # Widget wrapper (Phase 1)
    │   └── bridge-status.tsx        # Deposit tracking UI
    ├── hooks/
    │   ├── use-bridge-deposit.ts    # Bridge deposit state + polling
    │   └── use-supported-chains.ts  # Chain list + metadata
    ├── actions/
    │   └── track-deposit.ts         # Server action: create/update bridge_deposits
    └── queries/
        └── get-pending-deposits.ts  # Fetch active bridge deposits
```

## 8. Supported Chains (Launch)

| Chain | USDC Contract | Bridge Method | Est. Time |
|-------|--------------|---------------|-----------|
| Tempo | Native | Direct transfer | Instant |
| Ethereum | 0xA0b8...eB48 | Stargate (CCTP v2) | 1-5 min |
| Solana | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | Stargate (CCTP v2) | 1-5 min |

Only USDC for now.

## 9. Phasing

### Phase 1 — Widget Integration (Target: v1 launch)

- Network + Token selectors in deposit modal
- Stargate widget embed for non-Tempo chains
- Basic deposit tracking (pending → complete)
- Transaction history shows bridge deposits with source chain
- Supported chains: Ethereum, Solana

**Out of scope for Phase 1:**
- Custom native bridge UI (use widget)
- EURC or other stablecoin bridging
- Transfer mode selection (Taxi vs Bus — default to Taxi)
- Refund handling for failed bridges

### Phase 2 — Native UI

- Replace Stargate widget with custom branded UI
- Transfer mode selection (Taxi for speed, Bus for savings)
- Real-time progress tracker with step-by-step status
- Push notifications for deposit completion
- Failed bridge detection + retry/refund flow

### Phase 3 — Advanced Features

- EURC cross-chain deposits
- Additional chains (Arbitrum, Base, Optimism, Polygon, Avalanche, BNB)

## 10. Success Criteria

- **Activation:** 50%+ of new treasuries make their first deposit via cross-chain bridge within 7 days of creation
- **Completion rate:** 90%+ of initiated bridge deposits complete successfully
- **Time to deposit:** Average bridge completion < 3 minutes for CCTP v2 routes
- **Support tickets:** < 5% of bridge deposits generate a support inquiry
- **Adoption:** Cross-chain deposits account for > 30% of all deposits within 30 days of launch

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bridge delays or failures | Funds in limbo, user anxiety | Real-time status tracking, clear messaging, LayerZero guaranteed finality |
| Stargate widget UX doesn't match Goldhord brand | Jarring experience | Phase 1 is temporary; Phase 2 replaces with native UI |
| User sends wrong token on source chain | Funds lost | Warning banner: "Only send USDC on [Chain]. Other assets may be lost." |
| Stargate API/widget changes | Integration breaks | Pin widget version, monitor changelog |
| Gas fees on source chain surprise users | Abandonment | Show estimated gas cost before initiating bridge |
| LayerZero/Stargate downtime | Deposits unavailable | Show bridge status indicator, graceful fallback to "share Tempo address" flow |

## 12. Open Questions

1. **Widget customization** — can we theme the Stargate widget to match Goldhord's dark UI, or is the iframe fixed?
2. **Compliance** — do cross-chain deposits trigger additional KYC/AML requirements for enterprise users?
3. **Fee absorption** — should Goldhord absorb bridge fees for deposits above a threshold to reduce friction?
4. **Minimum deposit** — what's the minimum economically viable cross-chain deposit given bridge fees + gas?
