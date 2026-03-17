# SPEC: Spire — Treasury Management on Tempo

## 1. Meta Information

- **Branch:** feature/spire-mvp
- **Epic:** Spire MVP
- **PRD:** [prd.md](./prd.md)
- **Auth Architecture:** [authentication.md](./authentication.md)

## 2. Context

Spire is a single-wallet treasury management app built on the [Tempo blockchain](https://tempo.xyz/) — a purpose-built Layer 1 for stablecoin payments. One user manages one wallet: view stablecoin balances, send payments, receive payments, and browse transaction history. Authentication is passkey-only. No seed phrases, no gas tokens, no wallet extensions.

The architecture is designed to support future features (Ledger, multi-sig, compliance policies, sub-accounts, multi-user) without rewrites, but the MVP scope is intentionally minimal. See [prd.md](./prd.md) for the full MVP scope definition.

## 3. Key Technical Drivers

- **Seamless UX:** Users should experience a treasury app, not a blockchain app. No seed phrases, no gas token management. Passkey authentication and fee sponsorship abstract away chain complexity.
- **Instant Feel (inspired by Linear):** UI must respond instantly to user actions. Optimistic updates on mutations, persisted query cache for offline reads, and real-time push for incoming data — the app should never show a loading spinner for data the client already has.
- **Low Cost:** Tempo targets sub-millidollar transfer fees (<$0.001), making frequent payments viable.
- **Instant Settlement:** Sub-second finality enables real-time balance updates and payment confirmations.
- **Security:** No financial data visible before passkey authentication. 15-minute session timeout. Logout clears all cached data.
- **Reconciliation:** Native transfer memos on TIP-20 tokens enable payment tracking and reconciliation without off-chain infrastructure.
- **Future-Proof Architecture:** Single-user MVP, but data model, auth model, and component boundaries support Ledger, multi-sig, compliance (TIP-403), sub-accounts, and multi-user without rewrites.

## 4. Current State

This is a greenfield project. No existing banking infrastructure exists. The application will be built from scratch using:

### 4.1. Tempo Blockchain (Testnet)

- **Chain ID:** 42431
- **RPC:** `https://rpc.moderato.tempo.xyz`
- **Stablecoins available on testnet:** pathUSD, AlphaUSD, BetaUSD, ThetaUSD
- **Faucet:** `cast rpc tempo_fundAddress <ADDRESS>`
- **Explorer:** https://explore.tempo.xyz

### 4.2. Tempo SDK Ecosystem

- **TypeScript SDK:** `@tempoxyz/sdk` — primary integration point
- **Viem/Wagmi compatibility** — standard EVM tooling works
- **Key APIs:** `createTempoClient`, `transferWithMemo`, `transferSync`, batch transactions, fee sponsorship

## 5. Considered Options

### 5.1. Option 1: Full On-Chain (Tempo Smart Contracts + Client)

- **Description:** All account logic lives in Solidity smart contracts on Tempo. A thin Next.js frontend interacts directly via the TypeScript SDK. Accounts are Tempo passkey accounts. Balances are TIP-20 token balances.
- **Pros:** Fully decentralized, no backend to maintain, leverages all Tempo primitives natively.
- **Cons:** Limited flexibility for custom banking logic (e.g., account naming, transaction categorization), smart contract development overhead.

### 5.2. Option 2: Hybrid (Tempo for Payments + Backend for Account Management)

- **Description:** Use Tempo for all payment/transfer operations. A lightweight backend (Next.js API routes or server actions) manages user profiles, account metadata, transaction labels, and orchestrates Tempo interactions. Passkey accounts are created on Tempo, but the backend maps them to user profiles.
- **Pros:** Best of both worlds — chain-native payments with flexible account management. Easier to add features like transaction history search, categories, multi-account views.
- **Cons:** Requires a database and backend, introduces a centralized component.

### 5.3. Option 3: Custodial (Backend Controls All Wallets)

- **Description:** Backend creates and controls all Tempo wallets. Users interact only with the backend API. Funds are held in backend-managed accounts.
- **Pros:** Simplest UX, full control over transaction flow, easiest to add traditional banking features.
- **Cons:** Custodial risk, regulatory burden, single point of failure, defeats the purpose of using a blockchain.

### 5.4. Comparison

| Criteria/Driver          | Full On-Chain | Hybrid | Custodial |
| ------------------------ | ------------- | ------ | --------- |
| Seamless UX              | ✔️            | ✔️     | ✔️        |
| Low Cost                 | ✔️            | ✔️     | ✔️        |
| Instant Settlement       | ✔️            | ✔️     | ❌        |
| Compliance-Ready         | ✔️            | ✔️     | ✔️        |
| Flexible Account Mgmt   | ❌            | ✔️     | ✔️        |
| No Custodial Risk        | ✔️            | ✔️     | ❌        |
| Minimal Backend          | ✔️            | ❌     | ❌        |
| Feature Extensibility    | ❌            | ✔️     | ✔️        |

**Chosen Option:** Option 2 — Hybrid

## 6. Proposed Solution

Spire is a Next.js 16.1 application (App Router) using the hybrid approach: Tempo handles all on-chain payment operations while a lightweight backend manages treasury metadata. Single user, single wallet, passkey-only auth. Deployed on Vercel with Neon serverless Postgres. Optimized for instant-feeling performance via PPR, React Compiler, View Transitions, and service worker precaching.

### 6.1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│            Next.js 16.1 (App Router)             │
│   PPR: static shell (CDN) + streamed dynamic     │
│   React Compiler (auto-memoization)              │
│   View Transitions (GPU-accelerated navigations) │
│          shadcn/ui + Tailwind CSS v4             │
├─────────────────────────────────────────────────┤
│            Client State & Data Fetching          │
│   TanStack Query (server state + optimistic UI)  │
│   Persisted cache (IndexedDB) for offline reads  │
│              URL params (shareable)              │
├─────────────────────────────────────────────────┤
│           Service Worker + Real-Time             │
│   @serwist/next (app shell precache, offline)    │
│   WebSocket subscription for incoming payments   │
│   TanStack Query cache invalidation on events    │
├──────────────┬──────────────────────────────────┤
│  Server      │       Tempo Integration           │
│  Actions     │    @tempoxyz/sdk + viem           │
│  (mutations) │    (payments, balances)            │
├──────────────┴──────────────────────────────────┤
│                Data Layer                         │
│   Drizzle ORM + Neon Postgres (HTTP driver)       │
│   Co-located Vercel + Neon region (us-east-1)     │
│   Tempo RPC (balances, transactions)              │
├─────────────────────────────────────────────────┤
│            Observability & Analytics              │
│     Sentry (errors, performance, tracing)         │
│     PostHog (analytics, feature flags, replays)   │
├─────────────────────────────────────────────────┤
│              Infrastructure                       │
│       Vercel (hosting, edge, serverless)          │
│       Bun (runtime, package manager, scripts)     │
└─────────────────────────────────────────────────┘
```

### 6.2. Treasury Management Domain

**Responsibilities:** Treasury creation, passkey authentication, session management, treasury naming.

**MVP scope:** Single user, single wallet, passkey-only auth. No multi-user, no Ledger, no email/password.

**Key flows:**

1. **Treasury Creation**
   - User enters treasury name → WebAuthn passkey created via Tempo's passkey account system
   - Backend stores treasury profile (name) mapped to Tempo address
   - Server-side faucet call auto-funds the wallet (testnet only)
   - User redirected to dashboard with balances visible

2. **Authentication & Session**
   - Returning user sees lock screen (treasury name shown, no financial data)
   - Passkey prompt auto-triggered → biometric verification
   - On success: persisted TanStack Query cache renders last-known data immediately (see 6.10.2)
   - Fresh data streams in via PPR in the background
   - Session expires after 15 minutes of inactivity → lock screen
   - Logout clears session + persisted cache → lock screen

3. **Dashboard**
   - Query TIP-20 token balances via Tempo RPC (stale-while-revalidate, see 6.10.4)
   - Display aggregated balance across supported stablecoins
   - Show treasury name, wallet address (truncated, copyable), logout button
   - "Send" and "Receive" primary action buttons
   - Recent transactions with "View all →" link to full history

**Key types:**
```typescript
interface Treasury {
  id: string;
  name: string;                    // User-chosen treasury name
  tempoAddress: `0x${string}`;     // Passkey account address on Tempo
  createdAt: Date;
}

interface AccountBalance {
  token: string;          // e.g., "AlphaUSD"
  tokenAddress: `0x${string}`;
  balance: bigint;
  decimals: number;
}
```

### 6.3. Payments Domain

**Responsibilities:** Send/receive stablecoin payments, fee sponsorship, transaction history.

**MVP scope:** Send to address (no username lookup), receive with real-time push, transaction history with filtering. No batch payments, no transaction labels/categories.

**Key flows:**

1. **Send Payment**
   - User specifies recipient address, amount, stablecoin, and optional memo
   - Client-side validation: address format (`0x[a-fA-F0-9]{40}`), amount > 0, amount ≤ available balance
   - **Optimistic update:** Payment appears in transaction list as "pending" and balance decrements instantly (see 6.10.1)
   - App uses `@tempoxyz/sdk` `transferWithMemo` to submit the TIP-20 transfer
   - Fee sponsorship: app's fee payer account covers gas so user pays $0
   - Transaction confirmed in <1 second; optimistic entry replaced with confirmed data
   - On failure: optimistic update rolls back, user sees error toast

   ```typescript
   import { createTempoClient } from '@tempoxyz/sdk';
   import { http, parseUnits } from 'viem';

   const client = createTempoClient({
     transport: http('https://rpc.moderato.tempo.xyz')
   });

   const hash = await client.transferWithMemo({
     token: ALPHA_USD_ADDRESS,
     to: recipientAddress,
     amount: parseUnits('10', 6),
     memo: 'Invoice #1042'
   });
   ```

2. **Receive Payment**
   - **Share address:** Receive sheet shows wallet address + QR code, one-tap copy
   - **Real-time push:** WebSocket subscription to TIP-20 Transfer events for the wallet's address (see 6.10.3)
   - Incoming payment triggers surgical TanStack Query cache invalidation — balance and transaction list update without full page reload
   - Toast notification with amount, token, and sender
   - **Disconnect handling:** If WebSocket drops, show "Live updates paused" banner and fall back to polling every 15s

3. **Transaction History**
   - Full list of sent and received transactions from on-chain data
   - Each entry: date, time, direction (sent/received), counterparty address, amount, token, memo, status
   - Filterable by: All/Sent/Received tabs, address search
   - Transaction detail view with all fields + copyable addresses + tx hash + block explorer link
   - Infinite scroll with "Load more" pagination
   - Empty state with CTAs to Send and Receive

**Key types:**
```typescript
interface Payment {
  id: string;
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  token: string;
  memo?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}
```

### 6.4. Fee Sponsorship Service (MVP+)

> **Not built in MVP.** On testnet, transaction fees are near-zero (<$0.001) and users can pay directly in stablecoins. Fee sponsorship is added in MVP+ for a truly gasless experience.

**Responsibilities:** Subsidize user transaction fees to deliver a gasless experience.

- A server-side fee payer account (funded with stablecoins) co-signs transactions
- Uses Tempo's dual-signature fee sponsorship mechanism
- Rate limiting and budget controls prevent abuse

```typescript
// Server-side fee sponsorship (add in MVP+)
const receipt = await client.token.transferSync({
  amount: parseUnits('25', 6),
  to: recipientAddress,
  token: ALPHA_USD_ADDRESS,
  feePayer: feePayerAccount  // Server-managed private key account
});
```

### 6.5. Compliance Layer (Post-MVP)

> **Not built in MVP.** Architecture documented here for future reference.

Tempo's TIP-403 Policy Registry provides protocol-native compliance infrastructure:

- Configure whitelist/blacklist policies per token
- Enforce transfer policies (sender/recipient rules)
- Address-level receive policies for user-controlled incoming transfer rules
- No custom smart contracts needed — TIP-403 is built into the protocol

### 6.6. Data Access Layer (Drizzle ORM)

**Responsibilities:** Type-safe database access, schema management, and migrations for Neon Postgres.

[Drizzle ORM](https://orm.drizzle.team/) is a lightweight (~7.4kb), zero-dependency TypeScript ORM with SQL-like syntax and first-class Neon serverless driver support. It runs on Vercel Edge Functions and generates type-safe queries from the schema definition.

#### Schema Definition

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const treasuries = pgTable('treasuries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),                    // User-chosen treasury name
  tempoAddress: text('tempo_address').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

> **Future extensions (not built in MVP):**
> - `email` column — for recovery flow and notifications
> - `username` column — for username-based payment lookup
> - `transactionMeta` table — for labels, categories, enrichment
> - `approvals` table — for multi-sig approval queue

#### Client Setup (Neon Serverless)

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

#### Migrations

Drizzle Kit handles schema migrations. Migration files are generated from schema diffs and applied in CI.

```bash
bun run db:generate   # drizzle-kit generate — creates SQL migration from schema changes
bun run db:migrate    # drizzle-kit migrate — applies pending migrations
bun run db:studio     # drizzle-kit studio — visual database browser (dev only)
```

Neon branching enables safe migration testing: create a branch → apply migration → validate → merge to main → apply to production.

### 6.7. Security Hardening

#### 6.7.1. Security Headers

Applied via `next.config.ts` headers configuration:

```typescript
// next.config.ts (headers excerpt)
{
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
}
```

Content Security Policy (CSP) configured via `next.config.ts` to restrict script sources, connect sources (Tempo RPC, Neon, Sentry, PostHog), and frame ancestors.

#### 6.7.2. CSRF Protection

- **Server Actions:** Built-in protection — POST-only + Origin/Host header comparison (Next.js default since v14)
- **Custom API routes (if any):** `@edge-csrf/nextjs` middleware

#### 6.7.3. Input Validation

All server action inputs validated at the boundary with Zod. No raw user input reaches the database or Tempo RPC.

```typescript
const sendPaymentSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/),
  token: z.enum(['AlphaUSD', 'BetaUSD', 'pathUSD', 'ThetaUSD']),
  memo: z.string().max(256).optional(),
});
```

### 6.8. Observability & Analytics (MVP+)

> **Not built in MVP.** The app works without Sentry and PostHog. These are added in MVP+ once the core treasury flows are validated. Architecture is ready — just add the packages and env vars.

#### 6.8.1. Error Tracking — Sentry (MVP+)

[Sentry](https://sentry.io/) provides error and performance monitoring across the full Next.js stack (RSC, Server Actions, Edge, Client).

- **Source maps** uploaded on build for readable stack traces
- **Breadcrumbs** capture user actions leading to errors (navigation, clicks, Tempo RPC calls)
- **Performance tracing** for Server Actions and Tempo RPC round-trips
- **Release tracking** tied to Vercel deployments
- **Alerts** on new error types, error spikes, and performance regressions

```typescript
// sentry.client.config.ts (add in MVP+)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,     // 10% of transactions
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,  // 100% of error sessions
});
```

#### 6.8.2. Product Analytics & Feature Flags — PostHog (MVP+)

[PostHog](https://posthog.com/) provides product analytics, session replays, feature flags, and A/B testing in a single platform. Integrates with Vercel's Flags SDK.

- **Event tracking:** Treasury creation, payment sent/received, logout, error states
- **Session replays:** Debug UX issues by watching real user sessions (sampled)
- **Feature flags:** Safe rollout of new features (e.g., new stablecoin support, UI experiments)
- **Funnels:** Track conversion through signup → first payment → repeat usage
- **Self-hostable** for data sovereignty (important for a banking app)

```typescript
// PostHog feature flag usage (add in MVP+)
import { useFeatureFlagEnabled } from 'posthog-js/react';

const isBatchPaymentsEnabled = useFeatureFlagEnabled('batch-payments');
```

### 6.9. Prerequisites (Accounts & Access)

The following accounts and keys must be set up **before development begins**. All are free tier or testnet — no paid accounts required for MVP.

#### Accounts to Create

| Service | What to Create | How | Provides | MVP? |
|---|---|---|---|---|
| **GitHub** | Repository for `spire` | github.com/new | Source code hosting, CI triggers | **Yes** |
| **Vercel** | Project linked to GitHub repo | vercel.com → Import Git Repository | Hosting, `*.vercel.app` domain, preview deployments, env var storage | **Yes** |
| **Neon** | Postgres project (region: `aws-us-east-1`) | console.neon.tech → New Project | `DATABASE_URL` connection string | **Yes** |
| **Sentry** | Next.js project | sentry.io → Create Project → Next.js | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | MVP+ |
| **PostHog** | Project (cloud or self-hosted) | app.posthog.com → New Project | `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_PERSONAL_API_KEY` | MVP+ |
| **Tempo Testnet** | Fee payer account | Generate a new keypair, fund via faucet | `TEMPO_FEE_PAYER_KEY` (private key) | MVP+ (testnet txs near-free) |

> **Tempo RPC and faucet are public** — no account or API key needed.
> RPC: `https://rpc.moderato.tempo.xyz` · Faucet: `cast rpc tempo_fundAddress <ADDRESS>`

#### Setup Order

```
MVP:
1. Create GitHub repo                              ✅ done
2. Create Vercel project (link to GitHub repo)      ✅ done
3. Create Neon project → DATABASE_URL               ✅ done (via Vercel integration)
4. First deploy → verify *.vercel.app is live       ✅ done

MVP+ (add when ready):
5. Create Sentry project → copy DSN + auth token
6. Create PostHog project → copy keys
7. Generate Tempo fee payer keypair → fund via faucet → copy private key
8. Add MVP+ env vars to Vercel project settings
```

#### Environment Variables

Managed through Vercel Environment Variables with per-environment scoping:

| Variable | Scope | Description | Source | MVP? |
|---|---|---|---|---|
| `DATABASE_URL` | All | Neon Postgres connection string | Neon console → Connection Details | **Yes** |
| `TEMPO_FEE_PAYER_KEY` | Production, Preview | Fee payer account private key | Generated keypair | MVP+ (testnet txs are near-free without sponsorship) |
| `NEXT_PUBLIC_SENTRY_DSN` | All | Sentry DSN (public, client-safe) | Sentry → Project Settings → Client Keys | MVP+ |
| `SENTRY_AUTH_TOKEN` | CI only | Sentry source map upload | Sentry → Settings → Auth Tokens | MVP+ |
| `NEXT_PUBLIC_POSTHOG_KEY` | All | PostHog project API key (public) | PostHog → Project Settings | MVP+ |
| `POSTHOG_PERSONAL_API_KEY` | CI only | PostHog feature flag management | PostHog → Personal API Keys | MVP+ |

**Rules:**
- Never commit `.env` files — `.env.local` is in `.gitignore`
- `NEXT_PUBLIC_` prefix only for values safe to expose in client bundles
- `TEMPO_FEE_PAYER_KEY` is the most sensitive secret — Vercel encrypts it at rest, scoped to production + preview only
- For production hardening (post-MVP): migrate to a secrets manager (Doppler) for rotation, audit trails, and least-privilege access

#### Local Development

For local dev, copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

`.env.example` (committed to repo, no real values):
```
DATABASE_URL=
TEMPO_FEE_PAYER_KEY=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_PERSONAL_API_KEY=
```

### 6.10. UX Performance Patterns (Inspired by Linear)

Linear achieves instant-feeling UI by treating the client as the primary data source and syncing in the background. We apply the same principles using our existing stack — no custom sync engine needed.

#### 6.10.1. Optimistic Updates on Mutations

When a user sends a payment, the UI updates immediately before the Tempo transaction confirms. TanStack Query's `onMutate` callback inserts the pending payment into the cache; `onSuccess` replaces it with the confirmed version; `onError` rolls back.

```typescript
const sendPayment = useMutation({
  mutationFn: submitPaymentAction,
  onMutate: async (newPayment) => {
    await queryClient.cancelQueries({ queryKey: ['transactions'] });
    const previous = queryClient.getQueryData(['transactions']);

    // Optimistically add the payment as 'pending'
    queryClient.setQueryData(['transactions'], (old) => [
      { ...newPayment, status: 'pending', timestamp: new Date() },
      ...old,
    ]);

    return { previous };
  },
  onError: (_err, _vars, context) => {
    // Rollback on failure
    queryClient.setQueryData(['transactions'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['balances'] });
  },
});
```

**Why this matters:** Tempo confirms in <1s, but even that delay is perceptible. Optimistic updates make the app feel instant — the user sees their payment in the list and their balance decrement the moment they tap "Send."

#### 6.10.2. Persisted Query Cache (Offline Reads)

TanStack Query cache is persisted to IndexedDB via `@tanstack/query-persist-client-core` + an IndexedDB adapter. On app load, cached balances and transaction history render immediately while fresh data fetches in the background.

```typescript
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from '@/lib/idb-persister';

const persister = createIDBPersister('tempo-banking-cache');

// Wrap the app
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24h
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        // Only persist balances and transactions, not ephemeral data
        ['balances', 'transactions'].some((key) =>
          (query.queryKey as string[]).includes(key)
        ),
    },
  }}
>
```

**What this gives us:**
- App shell + last-known data renders in <100ms (no loading skeleton for returning users)
- Works on flaky connections — users can browse balances and history offline
- Background refetch keeps data fresh without blocking the UI

#### 6.10.3. Real-Time Push for Incoming Payments

Instead of polling, subscribe to TIP-20 transfer events via WebSocket (Tempo RPC supports `eth_subscribe`). When an incoming payment is detected, surgically invalidate the affected TanStack Query cache entries.

```typescript
// Subscribe to incoming transfers for the user's address
const useIncomingPayments = (address: `0x${string}`) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unwatch = tempoClient.watchContractEvent({
      address: ALPHA_USD_ADDRESS,
      abi: tip20Abi,
      eventName: 'Transfer',
      args: { to: address },
      onLogs: () => {
        // Surgical cache invalidation — only refetch what changed
        queryClient.invalidateQueries({ queryKey: ['balances', address] });
        queryClient.invalidateQueries({ queryKey: ['transactions', address] });
      },
    });

    return () => unwatch();
  }, [address, queryClient]);
};
```

**Why WebSocket over polling:**
- Instant notification of incoming payments (no 5-30s polling delay)
- Lower server load than frequent polling
- Battery-friendly on mobile — no recurring wake-ups

#### 6.10.4. Stale-While-Revalidate for Balances

Balance queries use short `staleTime` (5s) with long `gcTime` (5min). Stale data renders instantly while a background refetch runs. Combined with WebSocket invalidation, balances are always visually fresh.

```typescript
const useBalances = (address: `0x${string}`) =>
  useQuery({
    queryKey: ['balances', address],
    queryFn: () => fetchBalances(address),
    staleTime: 5_000,       // Fresh for 5s — no refetch on re-mount
    gcTime: 5 * 60_000,     // Keep in cache for 5min after unmount
    placeholderData: keepPreviousData,  // No flash on refetch
  });
```

### 6.11. Performance Architecture

The goal: every interaction feels instant. No spinners for data we have. Navigation indistinguishable from a native app. First load fast, repeat loads instantaneous.

#### 6.11.1. Partial Prerendering (PPR) + Cache Components

Next.js 16 made PPR stable. This is the single highest-impact performance optimization for our app.

**How it works:** Each page is split into a static shell (served instantly from Vercel's CDN edge) and dynamic holes (streamed in via Suspense). The dashboard layout, nav, sidebar, and headings are prerendered at build time. Balances and transactions stream in as they resolve.

```typescript
// next.config.ts
export default {
  cacheComponents: true, // Enables PPR + use cache
};
```

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { BalanceCards } from '@/domain/accounts/components/balance-cards';
import { TransactionList } from '@/domain/payments/components/transaction-list';
import { BalanceSkeleton, TransactionSkeleton } from '@/components/skeletons';

// This component is the static shell — served from CDN in ~45ms
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Dynamic hole — streams in when balance data resolves */}
      <Suspense fallback={<BalanceSkeleton />}>
        <BalanceCards />
      </Suspense>

      {/* Dynamic hole — streams in when transaction data resolves */}
      <Suspense fallback={<TransactionSkeleton />}>
        <TransactionList />
      </Suspense>
    </div>
  );
}
```

```tsx
// domain/accounts/components/balance-cards.tsx
'use cache';

import { fetchBalances } from '../queries/fetch-balances';

// This component is cached at the edge. 'use cache' tells Next.js
// to include it in the static shell when data hasn't changed.
export async function BalanceCards() {
  const balances = await fetchBalances();
  return (
    <div className="grid grid-cols-2 gap-4">
      {balances.map((b) => (
        <Card key={b.token} balance={b} />
      ))}
    </div>
  );
}
```

**Expected impact:**
- TTFB: ~450ms → ~45ms (static shell from CDN)
- LCP: ~1.2s → ~380ms (shell renders immediately, data streams in)
- Combined with persisted TanStack Query cache (6.10.2): returning users see cached data *inside the static shell* before the stream even arrives

#### 6.11.2. React Compiler (Automatic Memoization)

Stable since late 2025, running in production at Meta. One config line eliminates the need for manual `useMemo`, `useCallback`, and `React.memo`.

```typescript
// next.config.ts
export default {
  reactCompiler: true,
};
```

The compiler analyzes component code at build time and automatically inserts memoization where it's needed. Next.js further optimizes this with SWC — only files that benefit from the compiler are processed.

**Expected impact:**
- ~12% faster page loads, up to 2.5x faster interactions (Meta production benchmarks)
- 20–30% reduction in render time and re-render latency
- Zero code changes required — purely a build-time optimization

#### 6.11.3. View Transitions API (Native-Feel Navigation)

GPU-accelerated page transitions that run on the compositor thread at 60fps, even while JavaScript is executing.

```typescript
// next.config.ts
export default {
  viewTransition: true,
};
```

```tsx
// Usage in components — React handles timing, browser handles animation
import { ViewTransition } from 'react';

<ViewTransition name="dashboard-content">
  <main>{children}</main>
</ViewTransition>
```

**Behavior:**
- Default: smooth cross-fade between routes (no layout shift, no flash)
- Customizable via CSS (slide, morph, shared element transitions)
- Runs on GPU — doesn't block main thread
- Graceful degradation: Chromium browsers get smooth transitions, Firefox/Safari get instant navigation (no broken experience)

#### 6.11.4. Neon Edge Latency Optimization

Co-locate Vercel Functions and Neon Postgres in the same region to minimize round-trip time.

**Configuration:**
- Vercel project region: `iad1` (US East, Virginia)
- Neon project region: `aws-us-east-1`
- Use Neon HTTP driver (`@neondatabase/serverless` + `drizzle-orm/neon-http`) for single-shot queries — outperforms WebSocket for typical request/response patterns

**Expected impact:**
- Same-region queries: sub-10ms (with connection caching on proxy)
- 40% latency reduction vs default multi-region setup
- No code changes — already using HTTP driver via Drizzle (section 6.6, Client Setup)

#### 6.11.5. Aggressive Prefetching Strategy

Next.js auto-prefetches `<Link>` components in the viewport. We extend this with predictive prefetching for key user journeys.

```typescript
// Prefetch dashboard data during login (before navigation completes)
async function handleLoginSuccess(user: UserAccount) {
  // Start fetching in parallel — data is ready by the time dashboard renders
  router.prefetch('/dashboard');
  queryClient.prefetchQuery({
    queryKey: ['balances', user.tempoAddress],
    queryFn: () => fetchBalances(user.tempoAddress),
  });
  queryClient.prefetchQuery({
    queryKey: ['transactions', user.tempoAddress],
    queryFn: () => fetchTransactions(user.tempoAddress),
  });
  router.push('/dashboard');
}

// Prefetch transaction detail on hover (not click)
<Link
  href={`/transactions/${tx.id}`}
  onMouseEnter={() => router.prefetch(`/transactions/${tx.id}`)}
>
```

**Key patterns:**
- **Post-login prefetch:** Dashboard data starts loading during auth flow — zero wait on arrival
- **Hover prefetch:** Transaction details load on hover — click feels instant
- **Layout deduplication:** Next.js 16 downloads shared layouts once, not per-route

#### 6.11.6. Service Worker + App Shell (Instant Repeat Loads)

[`@serwist/next`](https://serwist.pages.dev/) (modern Workbox wrapper for Next.js) precaches the app shell and static assets. Repeat visits load in <200ms regardless of network conditions.

```typescript
// next.config.ts
import withSerwist from '@serwist/next';

export default withSerwist({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
})({
  // ... rest of next config
});
```

```typescript
// src/sw.ts
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST, // Auto-generated from Next.js build
  runtimeCaching: defaultCache,        // Smart defaults for RSC, static assets, fonts
  skipWaiting: true,
});

serwist.addEventListeners();
```

**What gets precached:**
- App shell HTML (layout, nav, sidebar)
- CSS and JS chunks (Tailwind, shadcn components)
- Fonts (via `next/font`, self-hosted)
- Static assets (icons, logos)

**Combined with persisted TanStack Query cache (6.10.2):**
- Service worker serves the app shell → instant paint
- IndexedDB serves cached balances and transactions → instant data
- Background fetch updates both → fresh data arrives silently
- Result: repeat visits feel like opening a native app, even offline

#### 6.11.7. Font Optimization

Self-host fonts at build time via `next/font`. Zero external font requests, no FOUT/FOIT.

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',          // Show fallback font immediately, swap when loaded
  variable: '--font-inter',
  weight: ['400', '500', '600'], // Only load weights we use
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

**What `next/font` does automatically:**
- Downloads font files at build time (no runtime Google Fonts requests)
- Inlines CSS `@font-face` declarations
- Applies `size-adjust` on fallback fonts (eliminates layout shift)
- Sets preload hints in `<head>`

#### 6.11.8. Bundle Size Discipline

RSC and Next.js App Router handle most of this automatically, but we enforce discipline:

- **Server Components by default** — 0 client JS unless `'use client'` is explicit
- **Route-based code splitting** — automatic in App Router, each page is a separate chunk
- **`React.lazy()`** for heavy client components loaded on demand:

```tsx
const BatchPaymentForm = lazy(() => import('./batch-payment-form'));
const TransactionChart = lazy(() => import('./transaction-chart'));
```

- **Bundle Analyzer** in CI to catch regressions:

```bash
ANALYZE=true bun run build  # Next.js 16.1 built-in Bundle Analyzer
```

- **Tree-shaking discipline:** Import specific functions, not entire libraries
  - `import { parseUnits } from 'viem'` not `import * as viem from 'viem'`
  - shadcn/ui is inherently tree-shakeable (only copied components exist)

#### 6.11.9. Performance Budget

Enforce measurable targets to prevent regression:

| Metric | Target | Measurement |
|---|---|---|
| TTFB (static shell) | < 50ms | Vercel Analytics |
| LCP | < 400ms | Lighthouse CI |
| INP (Interaction to Next Paint) | < 100ms | Sentry Performance |
| CLS | < 0.05 | Lighthouse CI |
| Repeat visit to interactive | < 200ms | Service worker + cache |
| Dashboard data (returning user) | < 100ms | Persisted TanStack Query cache |
| Route navigation | < 100ms | View Transitions + prefetch |
| DB query (same-region) | < 10ms | Sentry Performance |
| Tempo RPC round-trip | < 1s | Sentry Performance |
| Client JS bundle (initial) | < 100kb gzipped | Bundle Analyzer |

### 6.12. Tech Stack Summary

| Layer              | Technology                                                        |
| ------------------ | ----------------------------------------------------------------- |
| Language           | TypeScript (strict mode)                                          |
| Runtime / PM       | [Bun](https://bun.sh/) — runtime, package manager, script runner |
| Framework          | [Next.js 16.1](https://nextjs.org/docs) (App Router, RSC, Server Actions, `use cache`, PPR, React Compiler) |
| UI Components      | [shadcn/ui](https://ui.shadcn.com/) — copy-paste Radix primitives with full ownership |
| Styling            | [Tailwind CSS v4](https://tailwindcss.com/) — utility-first, CSS variables for theming |
| Client Data        | [TanStack Query](https://tanstack.com/query/latest) — server state, caching, optimistic updates |
| Blockchain SDK     | `@tempoxyz/sdk`, `viem`, `wagmi`                                  |
| Authentication     | WebAuthn / Passkeys (Tempo native)                                |
| Database           | [Neon](https://neon.com/) — serverless Postgres with branching, scale-to-zero, ~120ms cold starts |
| ORM                | [Drizzle ORM](https://orm.drizzle.team/) — lightweight, type-safe, SQL-like, edge-compatible |
| Migrations         | [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview) — schema diffing, SQL generation, visual studio |
| Validation         | Zod                                                               |
| Error Tracking     | [Sentry](https://sentry.io/) — errors, performance tracing, source maps, release tracking **(MVP+)** |
| Analytics / Flags  | [PostHog](https://posthog.com/) — product analytics, session replays, feature flags, A/B tests **(MVP+)** |
| Hosting            | [Vercel](https://vercel.com/) — edge network, serverless functions, preview deployments |
| Secrets            | Vercel Environment Variables (encrypted, per-environment scoping) |
| E2E Testing        | [Playwright](https://playwright.dev/) — cross-browser, parallel execution, built-in assertions |
| Unit Testing       | [Vitest](https://vitest.dev/) — Vite-native, Jest-compatible API, fast HMR-based watch mode |
| Linting            | [ESLint](https://eslint.org/) (flat config) + [next/core-web-vitals](https://nextjs.org/docs/app/api-reference/config/eslint) |
| Formatting         | [Prettier](https://prettier.io/) + [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) |
| Type Checking      | `tsc --noEmit` (strict mode, part of CI)                          |
| Page Transitions   | [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions) — GPU-accelerated, 60fps route transitions |
| Service Worker     | [`@serwist/next`](https://serwist.pages.dev/) — app shell precaching, offline support, runtime caching |
| Fonts              | [`next/font`](https://nextjs.org/docs/app/api-reference/components/font) — self-hosted, zero FOUT, preloaded |
| Git Hooks          | [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) (pre-commit: lint + format) |

### 6.13. Pros and Cons

- **Pros:**
  - Banking-grade UX with no seed phrases or gas management
  - Sub-second payment confirmations
  - Near-zero transaction costs
  - Native memo support for reconciliation
  - Architecture supports Ledger, multi-sig, compliance (TIP-403), batch payments, sub-accounts post-MVP — no rewrites
  - Instant-feeling UI via optimistic updates, persisted cache, and real-time push (Linear-inspired patterns, no custom sync engine needed)
  - Sub-50ms TTFB via PPR static shell served from CDN edge
  - Zero-effort performance wins: React Compiler (auto-memoization), View Transitions (GPU navigation), next/font (zero FOUT)
  - Offline-capable: service worker + persisted query cache = native app feel on repeat visits
  - Full observability from day one (Sentry errors + PostHog analytics + feature flags)
  - Type-safe database access end-to-end (Drizzle schema → TypeScript types → Zod validation)

- **Cons:**
  - Tempo is still on testnet — no mainnet yet
  - Requires a backend database for account metadata
  - Fee payer account requires funding and operational monitoring
  - SDK is early-stage; API surface may change
  - WebSocket subscription adds connection management complexity (reconnection, stale state)
  - Multiple third-party services (Neon, Sentry, PostHog, Vercel) — vendor dependency

- **Consequences:**
  - App architecture is portable — could migrate to Tempo mainnet or another EVM chain
  - Backend dependency means we need operational infrastructure beyond just the chain
  - Persisted cache means stale data is possible — must handle cache invalidation carefully to avoid showing incorrect balances

## 7. Testing Strategy

### 7.1. Unit Tests (Vitest)

Run with `bun run test`. Vitest provides Jest-compatible API with fast HMR-based watch mode.

- **Treasury domain:** Treasury creation validation, name persistence, passkey auth flow, session expiry logic
- **Payment domain:** Amount parsing/formatting, memo validation, address validation (`0x` format), balance-exceeds check
- **Fee sponsorship:** Budget tracking
- **TanStack Query hooks:** Query key generation, cache invalidation logic, optimistic update rollbacks, stale-while-revalidate behavior
- **Real-time layer:** WebSocket event → cache invalidation mapping, reconnection logic, polling fallback
- **Server Actions:** Input validation (Zod schemas), error handling, revalidation triggers
- **Drizzle queries:** Query builders, schema type inference, treasury CRUD

### 7.2. Integration Tests (Vitest)

- **Tempo SDK integration:** Send/receive payments on testnet, verify balances, confirm memos
- **Drizzle + Neon integration:** Treasury persistence, migration application (use Neon branching for isolated test databases)
- **API boundaries:** Server action → Tempo RPC → DB round-trips
- **Sentry integration:** Verify errors are captured and reported with correct context

### 7.3. E2E Tests (Playwright)

Run with `bun run test:e2e`. Playwright provides cross-browser (Chromium, Firefox, WebKit) testing with built-in assertions.

- **Treasury lifecycle:** Create treasury with name → passkey creation → auto-fund → see dashboard with balances
- **Returning user:** Lock screen shown → passkey auth → cached data renders → live data streams in
- **Logout:** Tap logout → session cleared → redirected to lock screen → no data accessible
- **Session expiry:** After 15 min inactivity → lock screen on next interaction
- **Send payment:** Fill form → verify validation errors (bad address, exceeds balance) → fix → confirm → optimistic update → confirmed
- **Optimistic rollback:** Send payment that fails → verify UI rolls back to previous state
- **Receive sheet:** Tap "Receive" → QR code + address shown → copy address
- **Real-time receive:** Send payment from second account → verify it appears without refresh
- **WebSocket disconnect:** Kill WebSocket → verify "Live updates paused" banner → verify polling fallback
- **Transaction history:** Navigate via "View all" → filter by Sent/Received → search by address → tap detail → verify all fields
- **Empty state:** New treasury → transaction history shows "No transactions yet" with CTAs
- **Offline resilience:** Load app → kill network → verify cached balances and transactions render
- **Error states:** Insufficient balance, invalid recipient, network errors
- **Performance:** Verify dashboard renders static shell before dynamic data arrives (PPR)
- **Service worker:** Verify app loads from cache on repeat visit with network disabled

### 7.4. Linting & Quality Gates (CI)

All checks run in CI on every PR via Vercel + GitHub Actions:

```bash
bun run lint          # ESLint (flat config + next/core-web-vitals)
bun run format:check  # Prettier (with Tailwind plugin)
bun run typecheck     # tsc --noEmit (strict)
bun run db:generate   # Drizzle Kit — verify no pending schema changes
bun run test          # Vitest (unit + integration)
bun run test:e2e      # Playwright (e2e)
bun run lighthouse    # Lighthouse CI (LCP, INP, CLS budget enforcement)
```

Pre-commit hooks (Husky + lint-staged) run `lint` and `format` on staged files to catch issues early.

### 7.5. Coverage Notes

- Tempo RPC calls mocked in unit tests; integration tests hit testnet
- WebAuthn/passkey flows tested in Playwright with WebAuthn virtual authenticator
- Neon branching provides isolated, disposable databases per test suite — no shared test state
- Fee payer account management tested with testnet funds

## 8. Definition of Done

### Universal (always required)

- [x] Unit & integration tests pass (`bun run test`)
- [x] E2E tests pass (`bun run test:e2e`)
- [x] 95% line coverage on new/changed code
- [x] TypeScript compiles cleanly (`bun run typecheck`)
- [x] Linter passes (`bun run lint`)
- [x] Formatting passes (`bun run format:check`)
- [x] Database migrations are clean (`bun run db:generate` produces no diff)
- [x] Spec updated to reflect implementation

### Feature-Specific

- [x] User can create a treasury with a name and passkey authentication
- [x] Treasury name displayed in header, editable in settings
- [x] No financial data visible before passkey authentication (lock screen)
- [x] Logout clears session + persisted cache → lock screen
- [x] Session expires after 15 minutes of inactivity → lock screen
- [x] Dashboard displays real-time stablecoin balances from Tempo
- [x] Dashboard renders cached data in <100ms for returning users (persisted query cache)
- [x] User can send a stablecoin payment with memo
- [x] Send form validates address format, balance, and required fields with inline errors
- [x] Send payment uses optimistic update — UI updates before chain confirmation
- [x] Optimistic update rolls back correctly on transaction failure
- [x] Receive sheet shows wallet address + QR code with one-tap copy
- [x] Incoming payments appear in real-time via WebSocket (no manual refresh)
- [x] "Live updates paused" banner shown when WebSocket disconnects, with polling fallback
- [ ] Payments are gasless (fee sponsorship working)
- [x] Transaction history with All/Sent/Received tabs and address search
- [x] Transaction detail view with copyable fields and block explorer link
- [x] Empty state shown when no transactions exist
- [x] "View all →" link on dashboard navigates to full transaction history
- [x] App is usable on flaky connections (cached balances + transaction history render offline)
- [x] Security headers present on all responses (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
- [ ] (MVP+) Sentry captures errors with source maps and breadcrumbs in preview + production
- [ ] (MVP+) PostHog tracks core events (treasury created, payment sent, payment received, logout)
- [x] PPR enabled: dashboard serves static shell from CDN, dynamic content streams via Suspense
- [x] React Compiler enabled (`reactCompiler: true`) — no manual useMemo/useCallback needed
- [x] View Transitions enabled — route changes animate smoothly (Chromium), degrade gracefully (Firefox/Safari)
- [x] Service worker precaches app shell — repeat visits load in <200ms
- [ ] Lighthouse CI: LCP < 400ms, INP < 100ms, CLS < 0.05
- [ ] Client JS bundle < 100kb gzipped (initial load)
- [ ] App deployed and accessible on a `*.vercel.app` domain

## 9. Post-MVP Roadmap (Deferred)

Items researched and validated but deferred from MVP scope. Architecture supports all of these without rewrites.

### Authentication & Security
- **Ledger hardware wallet:** Tiered auth (passkey daily + Ledger elevated) — see [authentication.md](./authentication.md) Tier 2
- **Account recovery:** External wallet (MetaMask) + email verification — see [authentication.md](./authentication.md) Tier 3
- **Multi-signature approvals:** App-layer approval queue for transactions above threshold
- **Rate Limiting:** Upstash Redis + `@upstash/ratelimit` in Next.js Edge Middleware
- **Secrets Manager:** Migrate from Vercel env vars to Doppler

### Features
- **Batch payments:** Multi-recipient in one atomic transaction (Tempo primitive available)
- **Compliance policies (TIP-403):** Admin whitelist/blacklist, user receive policies (protocol-native)
- **Multiple pockets (sub-accounts):** Same token in separate buckets
- **Multi-user management:** Roles, permissions, team access
- **Transaction labels / categories:** User-assigned metadata on transactions
- **Username-based lookup:** User directory for payment by username instead of address
- **Recurring payments:** Scheduled transfers (Tempo supports natively)

### Infrastructure
- **tRPC v11:** End-to-end type-safe API layer wrapping TanStack Query
- **Self-hosted PostHog:** Full data sovereignty for a treasury app
- **Mainnet deployment:** RPC URL + chain ID config swap
- **Fiat on/off-ramp:** Bank transfers, card funding (third-party integration)
- **Cross-chain transfers:** Bridge to Ethereum, etc.
- **Mobile native app:** iOS / Android (PWA covers mobile for now)

## 10. Alternatives Not Chosen

- **Full On-Chain (Option 1):** Rejected because pure smart-contract-based account management lacks flexibility for user profiles, transaction categorization, and other banking UX features.
- **Custodial (Option 3):** Rejected due to custodial risk, regulatory burden, and it undermines the benefits of building on a blockchain.
- **Other L1/L2 chains (Ethereum, Solana, Base):** Rejected because Tempo's purpose-built payment features (payment lanes, native memos, stablecoin gas, passkey accounts) provide significant advantages over general-purpose chains for a banking use case.
- **Prisma (over Drizzle):** Rejected for MVP. Prisma has better DX tooling but Drizzle is lighter (~7.4kb vs ~1.6MB), edge-compatible without extra config, and has first-class Neon serverless driver support. Prisma 7's WASM rewrite narrows the gap — re-evaluate post-MVP if Drizzle's migration tooling proves insufficient.

## 11. References

### Tempo

- [Tempo Documentation](https://docs.tempo.xyz/)
- [Tempo GitHub Repository](https://github.com/tempoxyz/tempo)
- [Tempo Transactions (Blog)](https://tempo.xyz/blog/tempo-transactions)
- [Send a Payment Guide](https://docs.tempo.xyz/guide/payments/send-a-payment)
- [Accept a Payment Guide](https://docs.tempo.xyz/guide/payments/accept-a-payment)
- [Transfer Memos Guide](https://docs.tempo.xyz/guide/payments/transfer-memos)
- [Fee Sponsorship Guide](https://docs.tempo.xyz/guide/payments/sponsor-user-fees)
- [Passkey Accounts Guide](https://docs.tempo.xyz/guide/use-accounts/embed-passkeys)
- [Create & Use Accounts](https://docs.tempo.xyz/guide/use-accounts)
- [Wallet Integration Guide](https://docs.tempo.xyz/quickstart/wallet-developers)
- [TIP-20 Token Standard](https://docs.tempo.xyz/protocol/transactions)
- [Tempo Architecture Analysis — Account Abstraction](https://medium.com/@organmo/tempo-architecture-analysis-1-tempos-account-abstraction-6babdeabc93e)

### Tech Stack

- [Next.js 16.1 Documentation](https://nextjs.org/docs)
- [Next.js 16.1 Release Blog](https://nextjs.org/blog/next-16-1)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Bun](https://bun.sh/)
- [Neon Serverless Postgres](https://neon.com/)
- [Vercel](https://vercel.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Drizzle + Neon Setup Guide](https://orm.drizzle.team/docs/tutorials/drizzle-with-neon)
- [Drizzle Kit (Migrations)](https://orm.drizzle.team/docs/kit-overview)

### Observability & Analytics

- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [PostHog](https://posthog.com/)
- [PostHog + Vercel Flags SDK](https://posthog.com/docs/libraries/vercel)
- [PostHog Next.js Integration](https://posthog.com/docs/libraries/next-js)

### Security

- [Next.js Security — Server Components & Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Security Hardening (2026)](https://medium.com/@widyanandaadi22/next-js-security-hardening-five-steps-to-bulletproof-your-app-in-2026-61e00d4c006e)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

### Performance

- [Next.js 16 — PPR & Cache Components](https://nextjs.org/docs/app/getting-started/cache-components)
- [Next.js `use cache` Directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [React Compiler v1.0 (Stable)](https://react.dev/blog/2025/10/07/react-compiler-1)
- [Next.js React Compiler Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)
- [Next.js View Transitions Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)
- [React `<ViewTransition>` Component](https://react.dev/reference/react/ViewTransition)
- [Neon Sub-10ms Queries for Vercel Edge](https://neon.com/blog/sub-10ms-postgres-queries-for-vercel-edge-functions)
- [Next.js Prefetching Guide](https://nextjs.org/docs/app/guides/prefetching)
- [Serwist (Service Worker for Next.js)](https://serwist.pages.dev/)
- [`next/font` Optimization](https://nextjs.org/docs/app/api-reference/components/font)
- [RSC Streaming Performance Guide (2026)](https://www.sitepoint.com/react-server-components-streaming-performance-2026/)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)

### Architecture Inspiration

- [The Story of Linear — Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/linear)
- [Reverse Engineering Linear's Sync Magic](https://marknotfound.com/posts/reverse-engineering-linears-sync-magic/)
- [Linear's Sync Engine Architecture (Fujimon)](https://www.fujimon.com/blog/linear-sync-engine)
- [TanStack Query Persist Client](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)

### Testing & Quality

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Next.js + Playwright Guide](https://nextjs.org/docs/app/guides/testing/playwright)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Husky](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/lint-staged/lint-staged)
