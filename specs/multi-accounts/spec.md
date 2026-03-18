# SPEC: Multi-Account Management

## 1. Meta Information

- **Branch:** feature/multi-accounts
- **Epic:** Multi-Account Management
- **PRD:** [prd.md](./prd.md)
- **Depends on:** [MVP PRD](../mvp/prd.md), [Authentication Architecture](../mvp/authentication.md)

## 2. Context

Extend Goldhord from a single-wallet treasury to a multi-account model. Each account is a separate Tempo wallet on-chain, holding one token type. A single root passkey controls all account wallets via Tempo's Account Keychain Precompile. Users can create, rename, delete accounts, transfer between them, and swap tokens via Tempo's native DEX.

See [prd.md](./prd.md) for full scope, user stories, flows, and mockups.

## 3. Key Technical Drivers

- **On-Chain Truth:** Each account = real Tempo wallet. Balance is always what the chain says. No app-layer accounting.
- **One Passkey, Many Wallets:** Root passkey registered on every account wallet's keychain. One biometric scan signs for any account.
- **Parallel Data Fetching:** Dashboard fetches N wallets' balances and transactions in parallel. Per-wallet caching and WebSocket subscriptions.
- **DEX Integration:** Swaps use Tempo's enshrined DEX precompile. Routing through pathUSD is automatic.

## 4. Current State

MVP provides multi-treasury support with passkey auth, send/receive, and transaction history. Key changes already implemented:

- **Singleton guard removed** — each passkey creates its own treasury, multiple treasuries supported
- **Login by address** — looks up treasury by `tempoAddress`, not by ID
- **Welcome screen** — landing page shows both "Unlock with Passkey" and "Create Treasury"
- **Single wallet per treasury** — the root `tempoAddress` currently holds all tokens and serves as both auth identity and spend wallet

This feature extends it with:

- **Separate account wallets** — each treasury gets N per-account wallets, each holding one token
- **accounts table in DB** — maps account names to on-chain wallet addresses
- **Account CRUD** — create, rename, delete
- **Account selector in send flow** — token determined by selected account
- **Internal transfers** — same token, different wallets
- **Swaps** — different tokens via Tempo DEX
- **Dashboard overhaul** — multi-account cards + merged recent transaction feed

> **Note:** Treasury creation currently only creates a root wallet and funds it via faucet. This feature adds two default account wallets during treasury setup, each provisioned on-chain with the root passkey registered on their keychain. Their protected status is tracked by immutable DB metadata, not by their current display name.

### 4.1. Current Architecture

The project is a **bun monorepo** with Turborepo orchestration:

```
goldhord/
├── apps/web/              # Next.js 16 app (App Router, Turbopack)
│   ├── src/
│   │   ├── app/           # Routes (thin orchestration)
│   │   ├── domain/        # Business logic (auth, payments, treasury)
│   │   ├── components/    # Cross-domain UI + shadcn components
│   │   ├── db/            # Drizzle schema + queries
│   │   └── lib/           # Tempo client, session, constants, wagmi
│   ├── drizzle/           # SQL migrations
│   └── e2e/               # Playwright tests
├── packages/
│   ├── ui/                # @goldhord/ui — shared UI components
│   ├── utils/             # @goldhord/utils — shared utilities
│   └── tsconfig/          # @goldhord/tsconfig — shared TS configs
├── biome.json             # Linting + formatting (replaces ESLint + Prettier)
└── turbo.json             # Task orchestration + remote caching
```

### 4.2. Tech Stack

- **Runtime:** Bun 1.3+
- **Framework:** Next.js 16.1 (App Router, Turbopack, PPR, React Compiler)
- **Database:** Neon serverless Postgres + Drizzle ORM
- **Auth:** WebAuthn passkeys via Wagmi/Viem Tempo integration
- **State:** TanStack Query (server state) + React useState (local UI)
- **Linting:** Biome (single tool for lint + format)
- **Testing:** Vitest + React Testing Library (colocated tests)
- **CI:** GitHub Actions (lint, typecheck, test, build) + Claude code review
- **Deploy:** Vercel with Turborepo remote caching
- **Observability:** Sentry (tracing, replay, logs) + PostHog (analytics)

## 5. Tempo Primitives Used

### 5.1. Account Keychain Precompile

**Address:** `0xAAAAAAAA00000000000000000000000000000000`

Manages authorized access keys per wallet. Used to register the root passkey on each new account wallet.

**Key operations:**

```typescript
// Register root passkey on a new wallet's keychain
// The new wallet's initial key provisions the root passkey as an access key
await client.writeContract({
  address: '0xAAAAAAAA00000000000000000000000000000000',
  abi: keychainAbi,
  functionName: 'addKey',
  args: [
    2,                    // keyType: WebAuthn
    rootPasskeyPublicKey, // the user's passkey
    0,                    // expiry: none
    [],                   // spendingLimits: none
  ],
});
```

**Key types:** Secp256k1 (`0`), P256 (`1`), WebAuthn (`2`)

**Query functions:**
- `getKey(keyId)` — check if a key is authorized
- `getRemainingLimit(keyId, tokenAddress)` — check spending limits
- `getTransactionKey()` — which key signed the current tx

### 5.2. Stablecoin DEX Precompile

**Address:** `0xDEc0000000000000000000000000000000000000`

Enshrined orderbook DEX for swapping between stablecoins. Routes through pathUSD automatically.

**Swap functions:**

```typescript
// Get quote (view, no gas)
const amountOut = await client.readContract({
  address: '0xDEc0000000000000000000000000000000000000',
  abi: dexAbi,
  functionName: 'quoteSwapExactAmountIn',
  args: [tokenIn, tokenOut, amountIn],
});

// Execute swap
const result = await client.writeContract({
  address: '0xDEc0000000000000000000000000000000000000',
  abi: dexAbi,
  functionName: 'swapExactAmountIn',
  args: [tokenIn, tokenOut, amountIn, minAmountOut],
});
```

**Key details:**
- All amounts are `uint128` with 6 decimals (100 tokens = `100000000`)
- Routing: AlphaUSD → pathUSD → BetaUSD (automatic, both orderbooks need liquidity)
- Slippage: 0.5–1% typical for stablecoin pairs
- Requires token approval before swap (`approve(dexAddress, amount)`)

### 5.3. Wagmi + Viem Tempo Integration

Wagmi has first-class Tempo support (v2.x+, viem >= 2.43.3):

```typescript
import { createConfig, http } from 'wagmi';
import { tempoModerato } from 'viem/chains';
import { withFeePayer } from 'viem/tempo';
import { KeyManager, webAuthn } from 'wagmi/tempo';

export const wagmiConfig = createConfig({
  chains: [tempoModerato],
  connectors: [
    webAuthn({ keyManager: KeyManager.localStorage() }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    [tempoModerato.id]: withFeePayer(
      http(),
      http("https://sponsor.moderato.tempo.xyz"),
    ),
  },
});
```

**Tempo-specific Wagmi hooks:**
- `useSendTransactionSync` — decorated with `calls` (batch), `feePayer`, `nonceKey`
- `Hooks.dex.useBuyQuote` — get DEX quote (tokenIn, tokenOut, amountOut)
- `Hooks.dex.useSellQuote` — get DEX quote (tokenIn, tokenOut, amountIn)
- `useSendCallsSync` — batch approve + swap in one transaction

**Account creation via viem:**

```typescript
import { Account } from 'viem/tempo';
import { generatePrivateKey } from 'viem/accounts';

// Create a new P256 account (for new wallet)
const newWalletKey = generatePrivateKey();
const newAccount = Account.fromP256(newWalletKey);

// Create access key for parent account
const accessKey = Account.fromP256(generatePrivateKey(), {
  access: parentAccount,
});
```

> **Note for production:** `KeyManager.localStorage()` stores keys on the client device. Keys are lost if storage is cleared. For production, use `KeyManager.http()` with a remote key manager.

## 6. Proposed Solution

### 6.1. Architecture Changes from MVP

```
MVP:                          Multi-Account:
┌──────────┐                  ┌──────────────────┐
│ Treasury │                  │    Treasury       │
│          │                  │                    │
│ 1 wallet │                  │ ┌────────┐ ┌────────┐ ┌────────┐
│ N tokens │                  │ │ Acct 1 │ │ Acct 2 │ │ Acct 3 │
│          │                  │ │ wallet │ │ wallet │ │ wallet │
└──────────┘                  │ │ 1 token│ │ 1 token│ │ 1 token│
                              │ └───┬────┘ └───┬────┘ └───┬────┘
                              │     └──────┬───┘──────────┘
                              │        Root Passkey
                              └──────────────────┘
```

**What changes:**
- Treasury keeps a single `tempoAddress` as its controller/root account for auth and session restore
- User funds no longer live on `treasuries.tempoAddress` — they live on N account wallets, each with its own address
- DB gains `accounts` table
- Dashboard fetches N wallet balances in parallel
- Send form gets account selector
- New flows: internal transfer, swap, account CRUD

**What doesn't change:**
- Auth model (passkey, session, logout, multi-treasury support via address lookup)
- Performance patterns (PPR, persisted cache, optimistic updates, WebSocket)
- Security (headers, CSRF, Zod validation)
- Monorepo structure (apps/web, @goldhord/ui, @goldhord/utils)
- Tooling (Biome for lint/format, Turborepo with remote caching, Vitest, Playwright)

**Treasury identity anchor:**
- `treasuries.tempoAddress` remains the canonical on-chain identity for login, session restore, and treasury ownership checks
- Multiple treasuries are supported — each passkey maps to one treasury
- Account wallets are spend/receive wallets only; they do not replace the treasury-level auth principal

#### Treasury Setup Orchestration

The existing [`createTreasuryAction`](/Users/ivorobiev/Desktop/repos/spire/apps/web/src/domain/treasury/actions/treasury-actions.ts) remains the server entry point for creating the treasury row and session, but the two default account wallets must be provisioned in a follow-up client mutation because the signing material lives in the browser.

1. `/create` performs passkey sign-up and obtains the controller/root address
2. `createTreasuryAction` inserts the treasury row, creates the session, and returns the new `treasuryId`
3. `useSetupDefaultAccounts` provisions the default AlphaUSD and BetaUSD wallets on the client, registers the root passkey on each keychain, calls the faucet for each default wallet, and persists the DB rows with `isDefault: true`
4. Redirect to `/dashboard` after the setup attempt completes
5. If one default account slot failed, the dashboard exposes `retryDefaultAccountSetup`, which detects the missing default slot by immutable metadata (`isDefault` + `tokenSymbol`) and provisions only the missing wallet

The root/controller wallet remains the auth anchor. Default account wallets are faucet-funded directly during setup; displayed treasury balances are not first funded on the root wallet and then transferred out.

### 6.2. Database Schema

```typescript
// Existing (from MVP — singleton guard column dropped, multi-treasury supported)
// Multiple treasuries allowed, one per passkey. tempoAddress unique constraint
// prevents duplicate passkeys but allows N treasury rows.
export const treasuries = pgTable('treasuries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  tempoAddress: text('tempo_address').notNull().unique(), // root/controller account for auth
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// New
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  treasuryId: uuid('treasury_id').references(() => treasuries.id).notNull(),
  name: text('name').notNull(),
  tokenSymbol: text('token_symbol').notNull(),     // "AlphaUSD" or "BetaUSD"
  tokenAddress: text('token_address').notNull(),   // TIP-20 contract address
  walletAddress: text('wallet_address').notNull(),
  isDefault: boolean('is_default').default(false).notNull(), // immutable system-default flag
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  treasuryNameUnique: uniqueIndex('accounts_treasury_name_idx').on(table.treasuryId, table.name),
  walletAddressUnique: uniqueIndex('accounts_wallet_address_idx').on(table.walletAddress),
}));
```

`isDefault` is used together with `tokenSymbol` to identify protected default accounts. Rename updates `name` only; delete protection and missing-default repair never depend on the current label.

#### Server Ownership Validation

Every account-scoped operation must derive the current treasury from the session and verify ownership server-side before any DB write or on-chain side effect.

- **Create account:** `assertCanCreateAccount` verifies the requested `treasuryId` matches the active session treasury
- **Rename / delete:** the referenced `accountId` must belong to `session.treasuryId`
- **Internal transfer / swap:** both referenced accounts must belong to `session.treasuryId`

Prefer a shared helper such as `assertTreasuryAccountAccess({ treasuryId, accountIds })` so all mutations use the same ownership gate.

**Rollout assumption:** This is a greenfield launch. No migration path is needed.
1. Keep `treasuries.tempoAddress` as the treasury's controller/root account for auth
2. Create `accounts` table with real DB-level unique indexes on `(treasury_id, name)` and `wallet_address`
3. For fresh treasury creation, create two default account wallets ("Main AlphaUSD", "Main BetaUSD")

### 6.3. Token Configuration

The codebase currently defines `SUPPORTED_TOKENS` as an object with 4 tokens (AlphaUSD, BetaUSD, pathUSD, ThetaUSD) in `apps/web/src/lib/constants.ts`. Per the PRD, only **AlphaUSD and BetaUSD** are valid for account creation. pathUSD and ThetaUSD may appear as unassigned tokens but are not selectable when creating accounts.

Add to `apps/web/src/lib/constants.ts`:

```typescript
// Tokens available for account creation (subset of SUPPORTED_TOKENS)
export const ACCOUNT_TOKENS = [
  SUPPORTED_TOKENS.AlphaUSD,
  SUPPORTED_TOKENS.BetaUSD,
] as const;

export const DEX_ADDRESS = '0xDEc0000000000000000000000000000000000000' as `0x${string}`;
export const KEYCHAIN_ADDRESS = '0xAAAAAAAA00000000000000000000000000000000' as `0x${string}`;
```

- **`SUPPORTED_TOKENS`** (existing) — all tokens the app can display balances for
- **`ACCOUNT_TOKENS`** (new) — tokens available in the "Create Account" dropdown
- **`DEX_ADDRESS`** (new) — Tempo stablecoin DEX precompile
- **`KEYCHAIN_ADDRESS`** (new) — Tempo Account Keychain precompile

### 6.4. Account Creation Flow (Client Provisioning + Server Finalize)

Creating an account involves browser-held signing keys, so the on-chain steps run in a client mutation. The server action only validates ownership and persists metadata after chain provisioning succeeds.

```typescript
const useCreateAccount = () => {
  const { sendTransactionSync } = useSendTransactionSync();

  return useMutation({
    mutationFn: async ({ treasuryId, tokenSymbol, name }: CreateAccountInput) => {
      // 1. Server-side auth + validation before any chain work
      await assertCanCreateAccount({ treasuryId, tokenSymbol, name });

      // 2. Create the new account wallet locally
      const newWalletKey = generatePrivateKey();
      const newWallet = Account.fromP256(newWalletKey);
      const rootPasskeyPublicKey = await getCurrentPasskeyPublicKey();

      // 3. Provision the new wallet's keychain using the new wallet's initial key
      await sendTransactionSync({
        account: newWallet,
        to: KEYCHAIN_ADDRESS,
        data: encodeFunctionData({
          abi: keychainAbi,
          functionName: 'addKey',
          args: [2, rootPasskeyPublicKey, 0, []],
        }),
      });

      // 4. Persist only after on-chain provisioning succeeds
      return await finalizeAccountCreate({
        treasuryId,
        name,
        tokenSymbol,
        walletAddress: newWallet.address,
      });
    },
  });
};
```

**Server responsibility:** `assertCanCreateAccount` must validate session ownership before any chain work, and `finalizeAccountCreate` must catch `accounts_treasury_name_idx` violations and return `"Name already taken"` so concurrent requests cannot create duplicate names.

**Error handling:** If on-chain wallet provisioning or keychain registration fails, the mutation throws and no account row is saved to DB. The UI shows an error state with a "Try Again" button that retries the full creation flow. No partial state is possible — the DB insert only happens after on-chain success.

### 6.5. Multi-Wallet Balance Fetching

Fetch all account balances in parallel:

```typescript
// Fetch balances for all accounts
const useAllBalances = (accounts: Account[]) => {
  return useQueries({
    queries: accounts.map((account) => ({
      queryKey: ['balance', account.walletAddress, account.tokenAddress],
      queryFn: () => fetchTokenBalance(account.walletAddress, account.tokenAddress),
      staleTime: 5_000,
      gcTime: 5 * 60_000,
    })),
  });
};

// Total balance (all tokens 1:1 USD)
const totalBalance = balances.reduce((sum, b) => sum + b.value, 0n);
```

### 6.6. Multi-Wallet Transaction Feed

Merge transactions from all account wallets:

```typescript
const useAllTransactions = (accounts: Account[]) => {
  const queries = useQueries({
    queries: accounts.map((account) => ({
      queryKey: ['transactions', account.walletAddress],
      queryFn: () => fetchTransactions(account.walletAddress),
      staleTime: 5_000,
    })),
  });

  // Merge, tag with account name, sort by timestamp
  const merged = queries
    .flatMap((q, i) =>
      (q.data ?? []).map((tx) => ({
        ...tx,
        accountName: accounts[i].name,
        accountId: accounts[i].id,
      }))
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  const grouped = groupTransactions(merged, accounts);

  return { transactions: grouped, isLoading: queries.some((q) => q.isLoading) };
};
```

Before rendering, collapse any transaction where both `from` and `to` belong to treasury-owned wallets into a single grouped `internalTransfer` entry keyed by tx hash. Swap rows remain grouped separately: the DEX swap and the follow-up transfer render as one `swap` entry with references to both hashes.

Grouped internal transfers and swaps must carry `visibleAccountIds` for both involved accounts so they can appear in both account-detail histories and in account-filtered `/transactions` views without duplication.

### 6.7. Multi-Wallet WebSocket Subscriptions

One WebSocket subscription per account wallet:

```typescript
const useMultiAccountPayments = (accounts: Account[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unwatchers = accounts.map((account) =>
      tempoClient.watchContractEvent({
        address: account.tokenAddress as `0x${string}`,
        abi: tip20Abi,
        eventName: 'Transfer',
        args: { to: account.walletAddress },
        onLogs: () => {
          // Surgical invalidation — only this account's data
          void queryClient.invalidateQueries({
            queryKey: ['balance', account.walletAddress],
          });
          void queryClient.invalidateQueries({
            queryKey: ['transactions', account.walletAddress],
          });
        },
      })
    );

    return () => unwatchers.forEach((unwatch) => unwatch());
  }, [accounts, queryClient]);
};
```

### 6.8. Swap Implementation

Approve + swap can be batched into the first transaction, but routing the output into the destination account requires a second transaction after the swap receipt reveals the actual `amountOut`.

```typescript
const useSwap = () => {
  const { sendCallsSync } = useSendCallsSync();

  return useMutation({
    mutationFn: async ({
      fromAccountId,
      toAccountId,
      amountIn,
      minAmountOut,
    }: SwapParams) => {
      // 0. Server-side ownership + token validation using the active session
      const { fromAccount, toAccount } = await prepareSwap({
        fromAccountId,
        toAccountId,
      });

      // Tx 1: approve DEX + execute swap from the source wallet
      const swapHash = await sendCallsSync({
        calls: [
          {
            to: fromAccount.tokenAddress,
            data: encodeFunctionData({
              abi: tip20Abi,
              functionName: 'approve',
              args: [DEX_ADDRESS, amountIn],
            }),
          },
          {
            to: DEX_ADDRESS,
            data: encodeFunctionData({
              abi: dexAbi,
              functionName: 'swapExactAmountIn',
              args: [
                fromAccount.tokenAddress,
                toAccount.tokenAddress,
                amountIn,
                minAmountOut,
              ],
            }),
          },
        ],
        account: fromAccount.walletAddress,
      });

      const swapReceipt = await waitForTransactionReceipt({ hash: swapHash });
      const amountOut = parseSwapAmountOut(swapReceipt, {
        walletAddress: fromAccount.walletAddress,
        tokenOut: toAccount.tokenAddress,
      });

      // Tx 2: move the received output token to the destination account wallet
      const transferHash = await sendCallsSync({
        calls: [
          {
            to: toAccount.tokenAddress,
            data: encodeFunctionData({
              abi: tip20Abi,
              functionName: 'transfer',
              args: [toAccount.walletAddress, amountOut],
            }),
          },
        ],
        account: fromAccount.walletAddress,
      });

      return { swapHash, transferHash, amountOut };
    },
  });
};
```

> **DEX routing note:** `swapExactAmountIn` routes through pathUSD automatically.
> The output token arrives in the sender's wallet. Moving it to the destination
> account is a second transaction, not part of the initial batch.
> This flow is not fully atomic: if the transfer step fails, the funds remain in
> `fromAccount` as `tokenOut` and the UI must surface a recovery action.

### 6.9. Account Delete Flow

```typescript
type DeleteAccountPreparation =
  | { status: 'blocked'; assignedBalance: bigint; tokenSymbol: string }
  | { status: 'warn'; unassignedBalances: DetectedTokenBalance[] }
  | { status: 'ready' };

async function prepareDeleteAccount(accountId: string): Promise<DeleteAccountPreparation> {
  const session = await getSession();
  if (!session) throw new Error('Not authenticated');

  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.id, accountId),
      eq(accounts.treasuryId, session.treasuryId),
    ),
  });

  if (!account) throw new Error('Account not found');
  if (account.isDefault) throw new Error('Cannot delete default account');

  const balances = await fetchDetectableTokenBalances(account.walletAddress);
  const assignedBalance =
    balances.find((balance) => balance.tokenAddress === account.tokenAddress)?.amount ?? 0n;
  const unassignedBalances = balances.filter(
    (balance) => balance.tokenAddress !== account.tokenAddress && balance.amount > 0n
  );

  if (assignedBalance > 0n) {
    return {
      status: 'blocked',
      assignedBalance,
      tokenSymbol: account.tokenSymbol,
    };
  }

  if (unassignedBalances.length > 0) {
    return {
      status: 'warn',
      unassignedBalances,
    };
  }

  return { status: 'ready' };
}

async function confirmDeleteAccount({
  accountId,
  acknowledgeUnassignedAssets = false,
}: {
  accountId: string;
  acknowledgeUnassignedAssets?: boolean;
}) {
  const preflight = await prepareDeleteAccount(accountId);

  if (preflight.status === 'blocked') {
    throw new Error('Account wallet still holds assigned-token funds. Transfer them before deleting.');
  }

  if (preflight.status === 'warn' && !acknowledgeUnassignedAssets) {
    throw new Error('Deletion requires acknowledging unassigned assets.');
  }

  await db.delete(accounts).where(eq(accounts.id, accountId));
}
```

> **Delete safety note:** The UI must call `prepareDeleteAccount` before opening the dialog. `confirmDeleteAccount` re-checks the state before the final delete so balance changes or concurrent edits cannot bypass the guard.
> Deletion is blocked only when the configured account token still has funds, because that is the asset the app can move today. Detectable unassigned assets should trigger a warning in the confirmation UI, but they do not block deletion.

### 6.10. Internal Transfer

Simple TIP-20 transfer between two wallets owned by the same treasury. The "Transfer" button is only shown on the **account detail page** (not the dashboard), and only when 2+ accounts of the same token exist.

```typescript
const useInternalTransfer = () => {
  const { sendTransactionSync } = useSendTransactionSync();

  return useMutation({
    mutationFn: async ({ fromAccountId, toAccountId, amount }: TransferParams) => {
      // 0. Server-side ownership + same-token validation using the active session
      const { fromAccount, toAccount } = await prepareInternalTransfer({
        fromAccountId,
        toAccountId,
      });

      return await sendTransactionSync({
        account: fromAccount.walletAddress,
        to: fromAccount.tokenAddress,
        data: encodeFunctionData({
          abi: tip20Abi,
          functionName: 'transfer',
          args: [toAccount.walletAddress, amount],
        }),
      });
    },
  });
};
```

`prepareInternalTransfer` must reject requests where either account does not belong to the active treasury, where the token types differ, or where both selectors point to the same account.

### 6.11. Transactions Page

The `/transactions` page shows a merged feed from all account wallets with filtering:

```typescript
// URL state for filters (shareable, bookmarkable)
// /transactions?account=all&address=&dateFrom=&dateTo=&minAmount=&maxAmount=&tab=all
interface TransactionFilters {
  account: string;   // account ID or "all"
  address: string;   // sender or recipient address substring
  dateFrom?: string; // ISO date
  dateTo?: string;   // ISO date
  minAmount?: string;
  maxAmount?: string;
  tab: 'all' | 'sent' | 'received';
}

// Reuses useAllTransactions hook from 6.6, then filters client-side
const filtered = grouped
  .filter((tx) => filters.account === 'all' || tx.visibleAccountIds.includes(filters.account))
  .filter((tx) => filters.tab === 'all' || (tx.kind === 'payment' && tx.direction === filters.tab))
  .filter((tx) => !filters.address || matchesAddressFilter(tx, filters.address))
  .filter((tx) => !filters.dateFrom || tx.timestamp >= new Date(filters.dateFrom))
  .filter((tx) => !filters.dateTo || tx.timestamp <= new Date(filters.dateTo))
  .filter((tx) => !filters.minAmount || getComparableAmount(tx) >= parseUnits(filters.minAmount, 6))
  .filter((tx) => !filters.maxAmount || getComparableAmount(tx) <= parseUnits(filters.maxAmount, 6));
```

Account filter chips are derived from the accounts list. Address, date, amount, and direction filters combine. Internal transfers render as one grouped row keyed by tx hash. Tapping any grouped row opens a transaction detail page that shows the grouped summary plus the underlying tx hash list.

`matchesAddressFilter` checks the relevant wallet addresses for each transaction kind. On `/transactions`, the `Sent` and `Received` tabs apply only to external payment rows; grouped internal transfers and swaps stay in the `All` tab because they are treasury-internal movements rather than inbound/outbound counterparties.

### 6.12. Transaction Detail Page

The transaction detail page renders grouped entries, not raw wallet rows:

- **Payment:** direction, counterparty, amount, token, memo, timestamp, tx hash
- **Internal transfer:** from account, to account, amount, token, timestamp, tx hash
- **Swap:** source account, destination account, amount in, amount out, swap tx hash, follow-up transfer tx hash
- **Swap partial failure:** source wallet retains `tokenOut`; the page surfaces a recovery action

## 7. Component Structure

```
apps/web/src/
├── domain/
│   ├── accounts/
│   │   ├── actions/
│   │   │   ├── create-account.ts      # Server action: validate + persist after client wallet provisioning
│   │   │   ├── rename-account.ts      # Server action: update name in DB
│   │   │   ├── delete-account.ts      # Server actions: preflight delete state + confirmed delete
│   │   │   └── prepare-internal-transfer.ts # Server action: ownership + same-token validation
│   │   ├── queries/
│   │   │   ├── get-accounts.ts        # Fetch all accounts for a treasury
│   │   │   ├── get-account.ts         # Fetch single account by ID
│   │   │   └── get-balances.ts        # Fetch on-chain balances (parallel)
│   │   ├── components/
│   │   │   ├── account-card.tsx       # Dashboard card (name, token, balance, address)
│   │   │   ├── account-card.test.tsx
│   │   │   ├── account-selector.tsx   # Dropdown for send/transfer/swap forms
│   │   │   ├── account-grid.tsx       # Dashboard grid of account cards
│   │   │   ├── create-account-form.tsx
│   │   │   ├── rename-dialog.tsx
│   │   │   ├── delete-dialog.tsx
│   │   │   └── account-menu.tsx       # "⋯" context menu (rename, delete)
│   │   └── hooks/
│   │       ├── use-create-account.ts  # Client mutation: provision wallet + finalize DB entry
│   │       ├── use-all-balances.ts    # Parallel balance fetching
│   │       ├── use-all-transactions.ts # Merged multi-wallet feed
│   │       ├── use-internal-transfer.ts # Client mutation: TIP-20 transfer between wallets
│   │       └── use-multi-account-ws.ts # Per-wallet WebSocket subscriptions
│   ├── swap/
│   │   ├── actions/
│   │   │   └── prepare-swap.ts        # Server action: ownership + token mismatch validation
│   │   ├── components/
│   │   │   ├── swap-form.tsx          # From/To account selectors + amount + quote
│   │   │   └── swap-quote.tsx         # Live quote display from DEX
│   │   └── hooks/
│   │       ├── use-execute-swap.ts    # Client mutation: approve + swap, then transfer output
│   │       └── use-swap-quote.ts      # Tempo DEX quote hook wrapper
│   ├── treasury/
│   │   ├── actions/
│   │   │   └── treasury-actions.ts    # Create treasury row/session, update name, retry missing default setup
│   │   └── hooks/
│   │       └── use-setup-default-accounts.ts # Client mutation: provision/fund default wallets during create flow
│   └── payments/                       # Extended from MVP
│       └── components/
│           └── send-form.tsx          # Updated: account selector added
├── components/
│   ├── sidebar.tsx                    # Nav sidebar (treasury name, links, logout)
│   └── sidebar-layout.tsx            # Layout wrapper: sidebar + content area
├── app/
│   ├── layout.tsx                     # Updated: wraps authenticated pages with sidebar layout
│   ├── dashboard/
│   │   └── page.tsx                   # Updated: top 4 account cards + recent transactions
│   ├── transactions/
│   │   ├── page.tsx                   # Full transaction list with account/address/date/amount filters + tabs
│   │   └── [id]/
│   │       └── page.tsx               # Grouped transaction detail page
│   ├── accounts/
│   │   ├── page.tsx                   # Accounts management page
│   │   └── [id]/
│   │       └── page.tsx               # Account detail page
│   └── swap/
│       └── page.tsx                   # Swap page
└── lib/
    └── constants.ts                   # ACCOUNT_TOKENS, DEX_ADDRESS, KEYCHAIN_ADDRESS added to existing file
```

## 8. Key Types

```typescript
interface Treasury {
  id: string;
  name: string;
  tempoAddress: `0x${string}`; // controller/root account used for auth
  createdAt: Date;
}

// Account (from DB + on-chain balance)
interface Account {
  id: string;
  treasuryId: string;
  name: string;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  walletAddress: `0x${string}`;
  isDefault: boolean;
  createdAt: Date;
}

interface AccountWithBalance extends Account {
  balance: bigint;
  balanceFormatted: string; // e.g., "$1,000,000.00"
}

// Swap quote from Tempo DEX
interface SwapQuote {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  amountOut: bigint;
  rate: number;          // e.g., 0.999
  slippage: number;      // e.g., 0.005 (0.5%)
  minAmountOut: bigint;  // amountOut * (1 - slippage)
}

interface BaseGroupedTransaction {
  groupId: string;
  kind: 'payment' | 'internalTransfer' | 'swap';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  visibleAccountIds: string[];
}

interface PaymentTransaction extends BaseGroupedTransaction {
  kind: 'payment';
  txHashes: [`0x${string}`];
  accountId: string;
  accountName: string;
  direction: 'sent' | 'received';
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  token: string;
  memo?: string;
}

interface InternalTransferTransaction extends BaseGroupedTransaction {
  kind: 'internalTransfer';
  txHashes: [`0x${string}`];
  direction: 'internal';
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  fromWalletAddress: `0x${string}`;
  toWalletAddress: `0x${string}`;
  amount: bigint;
  token: string;
}

interface SwapTransaction extends BaseGroupedTransaction {
  kind: 'swap';
  txHashes: `0x${string}`[];
  direction: 'internal';
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  sourceWalletAddress: `0x${string}`;
  destinationWalletAddress: `0x${string}`;
  amountIn: bigint;
  amountOut?: bigint;
  tokenIn: string;
  tokenOut: string;
  recoveryRequired: boolean;
}

type GroupedTransaction =
  | PaymentTransaction
  | InternalTransferTransaction
  | SwapTransaction;
```

## 9. Testing Strategy

### 9.1. Unit Tests (Vitest — colocated with source files)

- **Account CRUD:** Name uniqueness validation, duplicate-index error mapping, default account protection, delete preflight vs confirm behavior, ownership validation on every account-scoped action
- **Token config:** Supported token lookup, address resolution
- **Balance aggregation:** Total balance calculation (1:1 USD), parallel query merging
- **Transaction merging:** Multi-wallet feed merge, timestamp sorting, account tagging, internal-transfer grouping by tx hash, grouped visibility across both participating accounts
- **Swap quote:** Rate calculation, slippage tolerance, min amount out
- **Swap execution:** Receipt parsing for `amountOut`, second-step transfer payload, partial-failure recovery state
- **Transfer validation:** Same-token check, same-account rejection, treasury ownership validation, amount validation

### 9.2. Integration Tests (Vitest)

- **Treasury setup:** Create treasury row, provision two default wallets, fund them directly via faucet, persist default account rows, retry only the missing default slot on partial failure
- **Account creation on-chain:** Create wallet, register passkey on keychain, persist account row, verify key is authorized
- **DEX swap:** Quote → approve + swap → parse receipt → transfer output to destination wallet → verify both balances
- **Internal transfer:** TIP-20 transfer between two wallets, verify both balances
- **Delete account safety:** Preflight returns blocked/warn/ready states; confirm re-checks state; assigned-token balance blocks delete; unassigned assets trigger a warning only
- **DB operations:** Account CRUD with Neon branching and unique index enforcement

### 9.3. E2E Tests (Playwright — apps/web/e2e/)

- **Treasury creation:** Verify two default accounts created with funded balances
- **Treasury setup retry:** Force one default account setup failure → verify dashboard exposes retry and only the missing default slot is provisioned
- **Create account:** Token selection → name → create → verify new card on dashboard with $0
- **Duplicate name:** Enter existing name → verify "Name already taken" error
- **Rename account:** ⋯ menu → Rename → enter new name → verify updated everywhere
- **Delete account (zero balance):** ⋯ menu → Delete → confirm → verify removed
- **Delete account (has balance):** ⋯ menu → Delete → verify blocked with transfer prompt
- **Delete account (unassigned asset):** Send non-configured token to wallet → verify warning is shown but delete is still allowed
- **Delete default:** ⋯ menu → verify Delete option not shown
- **Send with account selector:** Open send → select account → verify token/balance update
- **Internal transfer:** Transfer form → select From/To → verify To filtered to same token
- **Swap:** Select From/To → verify quote appears → confirm → verify swap tx then transfer tx complete and both balances update
- **Swap partial failure:** Force second step failure → verify output remains on source wallet and recovery CTA is shown
- **Transactions page:** Navigate via "View all →" → verify account, address, date, amount, and sent/received filters work; grouped internal transfers/swaps only appear in `All`
- **Transaction detail:** Tap grouped transfer/swap row → verify grouped summary and tx hashes render correctly
- **Account detail:** Tap card → verify detail page with correct address and transactions

## 10. Definition of Done

### Universal

- [x] Unit & integration tests pass (`bun run test` — runs via Turborepo across all packages)
- [x] E2E tests pass (from `apps/web/`: `bun run test:e2e`)
- [x] 90% coverage thresholds met (lines, functions, branches, statements)
- [x] TypeScript compiles cleanly (`bun run typecheck`)
- [x] Biome lint + format passes (`bun run lint`)
- [x] Database migrations are clean (`bun run db:generate` from `apps/web/` produces no diff)
- [x] Spec updated to reflect implementation
- [ ] CI passes on PR (lint, typecheck, test, build via GitHub Actions)
- [ ] App deployed and accessible on Vercel

### Feature-Specific

- [x] Treasury creation creates two default account wallets (Main AlphaUSD, Main BetaUSD) with root passkey on each keychain
- [x] Treasury auth/session remains anchored to `treasuries.tempoAddress` as the controller/root account
- [x] Default accounts funded via faucet on creation
- [x] Treasury setup uses `createTreasuryAction` + client default-account provisioning; partial setup exposes retry for only the missing default slot
- [x] User can create additional accounts (new on-chain wallet per account)
- [x] Multiple accounts with same token supported (each with unique wallet address)
- [x] Account names unique per treasury (enforced by app validation and DB unique index)
- [x] Default accounts tracked by immutable DB metadata, so they remain protected after rename
- [x] Default accounts renamable but not deletable
- [x] Non-default accounts deletable when assigned-token balance is zero
- [x] Detectable unassigned assets trigger a delete warning but do not block deletion
- [x] Delete uses preflight + confirm so warning state is shown before the final delete
- [x] Delete "Transfer Balance" opens transfer form (if same-token accounts exist) or send form (if not)
- [x] Account creation error shows "Try Again" with no partial DB state
- [x] Sidebar navigation with treasury name, Dashboard/Transactions/Accounts/Settings links, logout
- [x] Sidebar always visible on desktop, collapsed hamburger on mobile
- [x] Dashboard shows top 4 account cards (sorted by balance, highest first)
- [x] "View all accounts →" link shown on dashboard when more than 4 accounts exist
- [x] Total balance shown in USD (all tokens 1:1)
- [x] Dashboard "Recent Transactions" shows merged feed from all accounts (no filters)
- [x] Transactions page (`/transactions`) has account, sender/recipient address, date, amount, and sent/received filters
- [x] Grouped internal transfers and swaps carry both participating account IDs so they appear in both account histories without duplication
- [x] Dashboard send/receive defaults to the highest-balance account; ties break by creation order
- [x] Account detail page shows balance, address, QR, scoped transactions
- [x] Send form has account selector (pre-selects when opened from account detail)
- [x] Internal transfer works between same-token accounts
- [x] Internal transfer and swap preflight validate that both referenced accounts belong to the active treasury
- [x] Transfer button on account detail page only, hidden when <2 accounts of same token
- [x] Internal transfers render as one grouped row in merged feeds
- [x] Swap executes via Tempo DEX with quote preview, then transfers output into the destination account wallet
- [x] Swap form enforces different token types for From/To
- [x] If the swap transfer step fails, output funds remain recoverable in the source wallet and the UI surfaces that state
- [x] Swap appears in both accounts' transaction histories
- [x] Transaction detail page shows grouped transfer/swap summaries and underlying tx hashes
- [x] Accounts management page lists all accounts sorted by balance (highest first) with CRUD actions
- [x] WebSocket subscriptions run per-wallet
- [x] Receive sheet has account selector (pre-selects when opened from account detail, default highest-balance account from dashboard)
- [x] Changing account in receive sheet updates QR code, address, and helper text

## 11. References

### Tempo

- [Account Keychain Precompile](https://docs.tempo.xyz/protocol/transactions/spec-tempo-transaction)
- [Stablecoin DEX — Executing Swaps](https://docs.tempo.xyz/guide/stablecoin-dex/executing-swaps)
- [Stablecoin Exchange Protocol](https://docs.tempo.xyz/protocol/exchange)
- [DEX Swap Tutorial (Chainstack)](https://docs.chainstack.com/docs/tempo-tutorial-dex-swap-foundry)
- [Embed Passkey Accounts](https://docs.tempo.xyz/guide/use-accounts/embed-passkeys)
- [Create & Use Accounts](https://docs.tempo.xyz/guide/use-accounts)
- [Faucet — Token Addresses](https://docs.chainstack.com/reference/tempo-tempo-fundaddress)

### Wagmi + Viem Tempo

- [Wagmi Tempo Getting Started](https://wagmi.sh/tempo)
- [Viem Tempo Account.fromP256](https://viem.sh/tempo/accounts/account.fromP256)
- [Wagmi DEX Hooks](https://docs.tempo.xyz/guide/stablecoin-dex/executing-swaps)

### App Stack

- [MVP PRD](../mvp/prd.md)
- [Authentication Architecture](../mvp/authentication.md)
- [Monorepo Migration Spec](../monorepo-migration/spec.md)
