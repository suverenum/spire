# SPEC: Cross-Chain USDC Deposits via Stargate

## 1. Meta Information

- **Branch:** feature/cross-chain-deposits
- **Epic:** Cross-Chain Deposits
- **PRD:** [prd.md](./prd.md)
- **Depends on:** [Multi-Account Spec](../multi-accounts/completed/spec.md), [Deployment Environments](../deployment-environments/spec.md)

## 2. Context

Enable USDC deposits from Ethereum and Solana into Goldhord treasury accounts via Stargate Finance (LayerZero). Phase 1 embeds the Stargate widget; Phase 2 replaces it with native UI.

Phase 1 is explicitly **USDC-account-only**. Cross-chain deposit options are shown only when the selected receive account is the treasury's USDC account. Non-USDC accounts keep the existing Tempo-only receive flow.

See [prd.md](./prd.md) for user stories, flows, and mockups.

## 3. Key Technical Drivers

- **Widget-First:** Ship fast by embedding Stargate's web component. No custom bridge contract code. Widget handles wallet connection, signing, and execution.
- **USDC-Only Scope:** Goldhord accounts are token-specific today. To avoid deposits landing in wallets that are not surfaced by the assigned account token, Phase 1 enables cross-chain receive only for USDC accounts.
- **Documented Widget Surface Is Minimal:** The published `@layerzerolabs/stargate-ui` package documents theme/partner fee attributes only. It does not document transfer lifecycle callbacks, tx-hash events, or a `postMessage` contract.
- **Server-Reconciled Tracking:** Because the widget does not provide a documented initiation/completion callback, DB tracking starts from explicit source tx hash capture in the UI, then a server-side reconciler polls LayerZero Scan and updates the DB. The existing Tempo WebSocket remains a UX accelerator, not the source of truth.
- **Existing Receive Sheet Extension:** The chain selector is added to the existing receive sheet — not a new page. When Tempo is selected, behavior is identical to today.
- **Server-Side Safety:** Bridge deposits are tracked in DB. The server never initiates bridge transactions — all signing happens in the user's source chain wallet via the widget.

## 4. Current State

### 4.1. Receive Sheet

**`apps/web/src/domain/payments/components/receive-sheet.tsx`** — client component using the Sheet modal.

Props: `open`, `onClose`, `address`, `accounts?`, `selectedAccountId?`, `onAccountChange?`

Currently shows:
- Account selector (if 2+ accounts)
- QR code (via `qrcode.react`)
- Wallet address with copy button
- Helper text: "Send [Token] on Tempo to this address"

No chain selector — assumes Tempo.

### 4.2. Transaction Types

**`apps/web/src/lib/tempo/types.ts`** — defines `GroupedTransaction` discriminated union:

```
payment | internalTransfer | swap | fee
```

Bridge deposits need a new kind: `bridgeDeposit`.

### 4.3. WebSocket Subscriptions

**`apps/web/src/domain/accounts/hooks/use-multi-account-ws.ts`** — subscribes to TIP-20 Transfer events per account wallet via `eth_subscribe`. On detection: invalidates balance/transaction caches, shows toast.

Bridge completion will be detected here automatically (USDC arriving from the Stargate contract is a standard Transfer event). The WebSocket acts as a fallback for the Scan API polling.

### 4.4. Database Schema

**`apps/web/src/db/schema.ts`** — tables: `treasuries`, `accounts`, `multisigConfigs`, `multisigTransactions`, `multisigConfirmations`.

No bridge-related tables yet.

## 5. Proposed Solution

### 5.1. Receive Sheet — Chain Selector

Extend the receive sheet with a network dropdown above the existing content. The dropdown controls which view is shown:

- **Tempo (default):** Existing QR code + address + copy (unchanged)
- **Ethereum / Solana:** Stargate widget embed for USDC accounts only

```typescript
// apps/web/src/domain/payments/components/receive-sheet.tsx (modified)

interface ReceiveSheetProps {
  open: boolean;
  onClose: () => void;
  address: `0x${string}`;
  accounts?: AccountWithBalance[];
  selectedAccountId?: string;
  onAccountChange?: (accountId: string) => void;
}

// New state
const [selectedChain, setSelectedChain] = useState<"tempo" | "ethereum" | "solana">("tempo");
const isUsdcAccount = selectedAccount?.tokenSymbol === "USDC";

// Render logic:
// if selectedChain === "tempo" → existing QR code view
// else if isUsdcAccount → <StargateDeposit chain={selectedChain} destAddress={walletAddress} />
// else → keep Tempo-only view and disable external chains
```

Behavior notes:

- If the selected account token is not `USDC`, the chain selector renders only `Tempo`, or renders Ethereum/Solana disabled with helper text: "Cross-chain deposits are available for USDC accounts only."
- If the user switches from a USDC account to a non-USDC account while an external chain is selected, reset the selector back to `tempo`.

### 5.2. Chain Selector Component

**New file: `apps/web/src/domain/bridge/components/chain-selector.tsx`**

```typescript
const SUPPORTED_CHAINS = [
  { id: "tempo", name: "Tempo", icon: "⚡", badge: "Free · Instant" },
  { id: "ethereum", name: "Ethereum", icon: "🔷" },
  { id: "solana", name: "Solana", icon: "◈" },
] as const;

type ChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

interface ChainSelectorProps {
  value: ChainId;
  onChange: (chain: ChainId) => void;
  enableExternalChains: boolean;
}
```

Renders as a styled select dropdown. Tempo is highlighted as default with "Free · Instant" badge. Ethereum and Solana are hidden or disabled unless `enableExternalChains === true`.

### 5.3. Stargate Widget Integration

**New file: `apps/web/src/domain/bridge/components/stargate-widget.tsx`**

The Stargate widget (`@layerzerolabs/stargate-ui`) is a web component (`<stargate-widget>`). It must be loaded client-side with no SSR.

```typescript
"use client";

import { useEffect, useRef } from "react";

interface StargateDepositProps {
  chain: "ethereum" | "solana";
  destAddress: `0x${string}`;
}

export function StargateDeposit({ chain, destAddress }: StargateDepositProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamic import — web component registers itself on load
    import("@layerzerolabs/stargate-ui");
  }, []);

  return (
    <div ref={containerRef}>
      <stargate-widget theme="dark" />
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Bridge powered by Stargate (LayerZero).
        Funds arrive in ~1-5 minutes. Fee: ≈0.06%
      </p>
    </div>
  );
}
```

**Research note (2026-03-19):** The official [`@layerzerolabs/stargate-ui` package README](https://www.npmjs.com/package/@layerzerolabs/stargate-ui) documents `theme`, `partnerId`, `feeCollector`, and `tenthBps` attributes only. The official [Stargate user docs](https://docs.stargate.finance/user-docs/transfer) describe custom destination addresses in Advanced mode, and the official [LayerZero Scan API docs](https://docs.layerzero.network/v2/tools/layerzeroscan/api) document polling by tx hash, but we did not find any documented widget API for transfer callbacks, emitted tx-hash events, or `postMessage`.

**Limitation:** The widget should be treated as a self-contained UI. Goldhord must not assume documented support for:

- pre-setting destination chain/address/token via widget props
- receiving a source tx hash or LayerZero message hash callback
- receiving completion events from the widget

The Phase 1 UX therefore keeps the destination address visible above the widget and adds an explicit tracking form below it.

**Mitigation:** Show the destination wallet address prominently above the widget with a copy button, and add instructions:
```
Destination: 0x1234...abcd (Tempo)
1. Set destination chain to "Tempo" in the widget below
2. Paste the address above as the recipient
3. Enter amount and complete the bridge
4. Paste the source transaction hash below to track delivery in Goldhord
```

### 5.4. Bridge Deposit Tracking

Since the widget does not provide a documented tracking callback, Phase 1 tracking is explicit and server-reconciled.

#### A. Explicit Source Tx Hash Capture

After the user submits the bridge in the widget, Goldhord shows a small tracking form:

**New file: `apps/web/src/domain/bridge/components/bridge-track-form.tsx`**

```typescript
interface BridgeTrackFormProps {
  accountId: string;
  sourceChain: "ethereum" | "solana";
}

// Fields:
// - sourceTxHash (required)
// - amount (required, decimal USDC string)
// CTA: "Track deposit"
// Calls createBridgeDeposit(...)
```

The app does **not** try to infer bridge initiation from hidden widget internals.

#### B. Server-Side Reconciler

Pending bridge deposits are reconciled on the server by polling LayerZero Scan using the stored source tx hash.

**New file: `apps/web/src/domain/bridge/actions/reconcile-pending-deposits.ts`**

```typescript
const LZ_SCAN_API = "https://scan.layerzero-api.com/v1";

export async function reconcilePendingBridgeDeposits() {
  const pending = await db.query.bridgeDeposits.findMany({
    where: inArray(bridgeDeposits.status, ["pending", "bridging"]),
  });

  for (const deposit of pending) {
    const res = await fetch(`${LZ_SCAN_API}/messages/tx/${deposit.sourceTxHash}`);
    const data = await res.json();
    const message = data.data?.[0];
    if (!message) continue;

    if (message.status?.name === "DELIVERED") {
      await db
        .update(bridgeDeposits)
        .set({
          status: "completed",
          lzMessageHash: message.guid,
          tempoTxHash: message.destination?.tx?.txHash,
          completedAt: new Date(),
        })
        .where(eq(bridgeDeposits.id, deposit.id));
      continue;
    }

    if (message.status?.name === "FAILED") {
      await db
        .update(bridgeDeposits)
        .set({ status: "failed" })
        .where(eq(bridgeDeposits.id, deposit.id));
      continue;
    }

    await db
      .update(bridgeDeposits)
      .set({
        status: "bridging",
        lzMessageHash: message.guid ?? deposit.lzMessageHash,
      })
      .where(eq(bridgeDeposits.id, deposit.id));
  }
}
```

Run this reconciler from a scheduled server entrypoint (for example, a Vercel Cron route). Client components query bridge status from Goldhord's DB, not directly from LayerZero Scan.

#### C. WebSocket Detection (UX Accelerator)

The existing `use-multi-account-ws.ts` already detects incoming USDC transfers to account wallets. When USDC arrives from a bridge contract, the balance and transaction caches are invalidated automatically. This remains useful for fast UI refresh and completion toasts, but the authoritative bridge status lives in `bridge_deposits`.

### 5.5. Database Schema

**New table: `bridge_deposits`**

```typescript
// apps/web/src/db/schema.ts (addition)

export const bridgeDeposits = pgTable("bridge_deposits", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  sourceChain: text("source_chain").notNull(), // "ethereum" | "solana"
  amount: text("amount").notNull(), // USDC amount as string (decimal)
  status: text("status").notNull().default("pending"), // "pending" | "bridging" | "completed" | "failed"
  sourceTxHash: text("source_tx_hash").notNull(), // tx hash on source chain
  tempoTxHash: text("tempo_tx_hash"), // tx hash on Tempo (when arrived)
  lzMessageHash: text("lz_message_hash"), // LayerZero message hash
  bridgeFee: text("bridge_fee"), // fee as string (decimal)
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  uniqueIndex("bridge_deposits_source_tx_hash_idx").on(table.sourceTxHash),
  uniqueIndex("bridge_deposits_lz_message_hash_idx").on(table.lzMessageHash),
  index("bridge_deposits_account_status_idx").on(table.accountId, table.status),
]);
```

**Migration:** `bun run db:generate` → `bun run db:migrate`

### 5.6. Server Actions

**New file: `apps/web/src/domain/bridge/actions/track-deposit.ts`**

```typescript
"use server";

import { getSession } from "@/lib/session";
import { db } from "@/db";
import { bridgeDeposits, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function createBridgeDeposit(params: {
  accountId: string;
  sourceChain: "ethereum" | "solana";
  amount: string;
  sourceTxHash: string;
}) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  // Verify account belongs to session treasury
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.id, params.accountId),
      eq(accounts.treasuryId, session.treasuryId),
    ),
  });
  if (!account) throw new Error("Account not found");
  if (account.tokenSymbol !== "USDC") {
    throw new Error("Cross-chain deposits are available for USDC accounts only");
  }

  const [deposit] = await db
    .insert(bridgeDeposits)
    .values({
      accountId: params.accountId,
      sourceChain: params.sourceChain,
      amount: params.amount,
      sourceTxHash: params.sourceTxHash,
      status: "pending",
    })
    .returning();

  return deposit;
}
```

`updateBridgeDepositStatus` should not be exposed as a general client-callable server action. Status updates are performed by the server-side reconciler after it polls LayerZero Scan.

### 5.7. Queries

**New file: `apps/web/src/domain/bridge/queries/get-pending-deposits.ts`**

```typescript
import { db } from "@/db";
import { bridgeDeposits } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function getPendingDeposits(accountId: string) {
  return db.query.bridgeDeposits.findMany({
    where: and(
      eq(bridgeDeposits.accountId, accountId),
      ne(bridgeDeposits.status, "completed"),
      ne(bridgeDeposits.status, "failed"),
    ),
    orderBy: (deposits, { desc }) => [desc(deposits.initiatedAt)],
  });
}
```

### 5.8. Transaction History Integration

Add `bridgeDeposit` as a new transaction kind in the grouped transaction system.

This feature must be wired into the app's canonical grouped transaction path, not just a single leaf component:

- `apps/web/src/domain/accounts/hooks/use-all-transactions.ts`
- `apps/web/src/domain/accounts/utils/group-transactions.ts`
- `apps/web/src/app/dashboard/dashboard-recent-transactions.tsx`
- `apps/web/src/app/transactions/transactions-content.tsx`
- `apps/web/src/app/transactions/[id]/transaction-detail-content.tsx`
- `apps/web/src/app/accounts/[id]/account-detail-content.tsx`

**`apps/web/src/lib/tempo/types.ts`** (addition):

```typescript
interface BridgeDepositTransaction extends BaseGroupedTransaction {
  kind: "bridgeDeposit";
  txHashes: `0x${string}`[];
  direction: "received";
  accountId: string;
  accountName: string;
  sourceChain: string;
  amount: bigint;
  token: string;
  bridgeStatus: "pending" | "bridging" | "completed" | "failed";
  bridgeFee?: bigint;
}

type GroupedTransaction =
  | PaymentTransaction
  | InternalTransferTransaction
  | SwapTransaction
  | FeeTransaction
  | BridgeDepositTransaction;
```

Bridge deposits appear in the transaction feed with source chain indicator and bridge status. When status is "bridging", an animated indicator is shown. When "completed", it renders like a normal received payment with "Bridged via Stargate" label.

### 5.9. Cache Keys

**`apps/web/src/lib/constants.ts`** (addition):

```typescript
export const CACHE_KEYS = {
  // ... existing keys
  bridgeDeposits: (accountId: string) => ["bridge-deposits", accountId] as const,
} as const;
```

### 5.10. New Dependencies

```bash
bun add @layerzerolabs/stargate-ui
```

- `@layerzerolabs/stargate-ui` — Stargate bridge web component
- Use platform `fetch` against the official LayerZero Scan API from server-side reconciliation code

## 6. Component Structure

```
apps/web/src/
├── domain/
│   ├── bridge/                          # NEW DOMAIN
│   │   ├── components/
│   │   │   ├── chain-selector.tsx       # Network dropdown (Tempo, Ethereum, Solana)
│   │   │   ├── chain-selector.test.tsx
│   │   │   ├── stargate-deposit.tsx     # Widget wrapper + instructions
│   │   │   ├── stargate-deposit.test.tsx
│   │   │   ├── bridge-track-form.tsx    # Paste source tx hash + amount to start tracking
│   │   │   └── bridge-status-badge.tsx  # "Bridging..." / "Arrived" indicator
│   │   ├── hooks/
│   │   │   └── use-pending-deposits.ts  # Fetch pending bridge deposits from DB
│   │   ├── actions/
│   │   │   ├── track-deposit.ts         # Server action: create bridge_deposits
│   │   │   └── reconcile-pending-deposits.ts
│   │   └── queries/
│   │       └── get-pending-deposits.ts  # DB query for active deposits
│   ├── accounts/
│   │   ├── hooks/
│   │   │   └── use-all-transactions.ts  # MODIFIED: merge bridge_deposits into grouped feed
│   │   └── utils/
│   │       └── group-transactions.ts    # MODIFIED: add bridgeDeposit grouping
│   └── payments/
│       └── components/
│           └── receive-sheet.tsx         # MODIFIED: add chain selector + bridge view
├── db/
│   └── schema.ts                        # MODIFIED: add bridge_deposits table
├── lib/
│   ├── constants.ts                     # MODIFIED: add bridge cache keys
│   └── tempo/
│       └── types.ts                     # MODIFIED: add BridgeDepositTransaction type
├── app/
│   ├── dashboard/
│   │   └── dashboard-recent-transactions.tsx # MODIFIED
│   ├── transactions/
│   │   ├── transactions-content.tsx          # MODIFIED
│   │   └── [id]/
│   │       └── transaction-detail-content.tsx # MODIFIED
│   ├── accounts/
│   │   └── [id]/
│   │       └── account-detail-content.tsx    # MODIFIED
│   └── api/
│       └── internal/
│           └── bridge-reconcile/
│               └── route.ts             # Triggered by scheduled server job
└── drizzle/
    └── XXXX_add_bridge_deposits.sql     # NEW: migration file
```

## 7. Implementation Steps

### Step 1: Database

Add `bridge_deposits` table to schema. Generate and run migration.

### Step 2: Bridge Domain Scaffold

Create `domain/bridge/` with components, hooks, actions, queries directories. Implement `chain-selector.tsx` and supporting types.

### Step 3: Stargate Widget

Install `@layerzerolabs/stargate-ui`. Create `stargate-deposit.tsx` wrapper with dynamic import (no SSR). Add destination address instructions above the widget and a tracking form below it.

### Step 4: Receive Sheet Extension

Add chain selector state to receive sheet. When Tempo is selected, show existing QR view. When Ethereum/Solana is selected, show Stargate widget with instructions. Only enable Ethereum/Solana when the selected account token is `USDC`.

### Step 5: Server Actions + Queries

Implement `track-deposit.ts` server action for creating bridge deposit records from the explicit tracking form. Implement `get-pending-deposits.ts` query.

### Step 6: Bridge Status Tracking

Implement a scheduled server reconciler that polls LayerZero Scan for pending `bridge_deposits`. When status changes to `DELIVERED`, update the DB record and invalidate caches.

### Step 7: Transaction History

Add `BridgeDepositTransaction` type. Update the grouped transaction pipeline (`use-all-transactions.ts`, `group-transactions.ts`) and all grouped transaction surfaces (dashboard, account detail, transactions list, transaction detail) to render bridge deposits with source chain label, status badge, and "Bridged via Stargate" text.

### Step 8: Pending Deposits UI

Show active bridge deposits at the top of the dashboard or in the transaction feed with animated "Bridging..." indicator. Toast notification on completion.

## 8. Testing Strategy

### 8.1. Unit Tests (Vitest)

- **Chain selector:** Renders Tempo-only mode for non-USDC accounts and all 3 chains for USDC accounts
- **Tracking form:** Requires source tx hash and amount, submits `createBridgeDeposit`
- **Server actions:** Ownership validation, USDC-only validation, creates deposit record
- **Reconciler:** Polls LayerZero Scan for pending deposits and updates DB status correctly
- **Transaction rendering:** Bridge deposits show source chain, status badge, correct icon/color
- **Cache keys:** Bridge-specific cache keys generate correctly

### 8.2. Integration Tests

- **Full flow:** Paste source tx hash → create bridge deposit → reconciler marks it completed → verify cache invalidation
- **DB operations:** Insert bridge_deposits, update status, query pending deposits
- **WebSocket fallback:** Incoming USDC transfer triggers cache invalidation even without explicit bridge tracking

### 8.3. Manual Testing

- **Widget loads:** Stargate widget renders without errors in the receive sheet
- **Chain switching:** Toggling between Tempo/Ethereum/Solana shows correct view for USDC accounts; non-USDC accounts stay Tempo-only
- **Bridge execution:** Complete a real bridge from Ethereum testnet → Tempo testnet, paste the source tx hash, and verify server-side tracking

## 9. Definition of Done

### Universal

- [x] Unit tests pass (`bun run test`)
- [x] TypeScript compiles cleanly (`bun run typecheck`)
- [x] Biome lint passes (`bun run lint`)
- [x] Database migration is clean (`bun run db:generate` produces no diff)
- [ ] CI passes on PR

### Feature-Specific

- [x] Receive sheet has chain selector (Tempo, Ethereum, Solana)
- [x] Tempo selected: existing QR code + address view (unchanged)
- [x] Ethereum/Solana selected: Stargate widget loads with instructions for USDC accounts only
- [x] Non-USDC accounts remain Tempo-only for receive
- [x] Destination wallet address shown prominently above widget with copy button
- [x] Tracking form captures source tx hash and amount after widget submission
- [x] `bridge_deposits` table created with migration
- [x] Bridge deposits tracked in DB (create from explicit tracking form, update from server-side reconciliation)
- [x] LayerZero Scan API polled by a server-side reconciler for bridge message status
- [x] Bridge deposits appear across dashboard, account detail, transactions list, and transaction detail with source chain label
- [x] In-progress bridges show animated "Bridging..." indicator
- [x] Toast notification on bridge completion
- [x] WebSocket detects incoming USDC (existing behavior, no change needed)
- [x] No bridge-related code runs when Tempo is selected (zero overhead for native deposits)
