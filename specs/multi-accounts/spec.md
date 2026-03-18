# SPEC: Multi-Account Management

## 1. Meta Information

- **Branch:** feature/multi-accounts
- **Epic:** Multi-Account Management
- **PRD:** [prd.md](./prd.md)
- **Depends on:** [MVP Spec](../mvp/spec.md)

## 2. Context

Extend Goldhord from a single-wallet treasury to a multi-account model. Each account is a separate Tempo wallet on-chain, holding one token type. A single root passkey controls all account wallets via Tempo's Account Keychain Precompile. Users can create, rename, delete accounts, transfer between them, and swap tokens via Tempo's native DEX.

See [prd.md](./prd.md) for full scope, user stories, flows, and mockups.

## 3. Key Technical Drivers

- **On-Chain Truth:** Each account = real Tempo wallet. Balance is always what the chain says. No app-layer accounting.
- **One Passkey, Many Wallets:** Root passkey registered on every account wallet's keychain. One biometric scan signs for any account.
- **Parallel Data Fetching:** Dashboard fetches N wallets' balances and transactions in parallel. Per-wallet caching and WebSocket subscriptions.
- **DEX Integration:** Swaps use Tempo's enshrined DEX precompile. Routing through pathUSD is automatic.

## 4. Current State

MVP provides multi-treasury support with passkey auth, send/receive, and transaction history. The singleton guard has been removed — each passkey creates its own treasury. Login looks up treasury by wallet address. The landing page shows both "Unlock with Passkey" and "Create Treasury" buttons.

This feature extends it with:

- Multiple wallets per treasury (accounts table in DB)
- Account CRUD (create, rename, delete)
- Account selector in send flow
- Internal transfers (same token, different wallets)
- Swaps (different tokens via Tempo DEX)
- Dashboard with multi-account cards and unified transaction feed

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
- Auth model (passkey, session, logout, multi-treasury support)
- Performance patterns (PPR, persisted cache, optimistic updates, WebSocket)
- Security (headers, CSRF, Zod validation)
- Monorepo structure (apps/web, packages/ui, packages/utils)
- Tooling (Biome, Turborepo, Vitest, Playwright)

**Treasury identity anchor:**
- `treasuries.tempoAddress` remains the canonical on-chain identity for login, session restore, and treasury ownership checks
- Multiple treasuries are supported — each passkey maps to one treasury
- Account wallets are spend/receive wallets only; they do not replace the treasury-level auth principal

### 6.2. Database Schema

```typescript
// Existing (from MVP — singleton guard removed, multi-treasury supported)
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
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  treasuryNameUnique: uniqueIndex('accounts_treasury_name_idx').on(table.treasuryId, table.name),
  walletAddressUnique: uniqueIndex('accounts_wallet_address_idx').on(table.walletAddress),
}));
```

**Schema rollout from MVP:** There is no live MVP user data yet, so this is a schema reset rather than a balance migration:
1. Keep `treasuries.tempoAddress` as the treasury's controller/root account for auth
2. Create `accounts` table with real DB-level unique indexes on `(treasury_id, name)` and `wallet_address`
3. For fresh treasury creation, create two default account wallets ("Main AlphaUSD", "Main BetaUSD")
4. Do not auto-convert the legacy single-wallet treasury into a token-scoped account wallet

### 6.3. Token Configuration

Centralized token config — swap this file for mainnet:

```typescript
// apps/web/src/lib/constants.ts (updated)
export const ACCOUNT_TOKENS = [
  {
    symbol: 'AlphaUSD',
    name: 'AlphaUSD',
    address: '0x20c0000000000000000000000000000000000001' as `0x${string}`,
    decimals: 6,
    currency: 'USD',
  },
  {
    symbol: 'BetaUSD',
    name: 'BetaUSD',
    address: '0x20c0000000000000000000000000000000000002' as `0x${string}`,
    decimals: 6,
    currency: 'USD',
  },
] as const;

export const DEX_ADDRESS = '0xDEc0000000000000000000000000000000000000' as `0x${string}`;
export const KEYCHAIN_ADDRESS = '0xAAAAAAAA00000000000000000000000000000000' as `0x${string}`;
```

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

**Server responsibility:** `finalizeAccountCreate` must catch `accounts_treasury_name_idx` violations and return `"Name already taken"` so concurrent requests cannot create duplicate names.

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

  return { transactions: merged, isLoading: queries.some((q) => q.isLoading) };
};
```

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
      fromAccount,
      toAccount,
      amountIn,
      minAmountOut,
    }: SwapParams) => {
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
async function deleteAccount(accountId: string) {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, accountId),
  });

  if (!account) throw new Error('Account not found');
  if (account.isDefault) throw new Error('Cannot delete default account');

  // Check all detectable token balances for this wallet, not just the configured token
  const balances = await fetchDetectableTokenBalances(account.walletAddress);
  const nonZeroBalances = balances.filter((balance) => balance.amount > 0n);

  if (nonZeroBalances.length > 0) {
    throw new Error('Account wallet still holds funds. Transfer all detected assets before deleting.');
  }

  // Remove from DB only — wallet still exists on-chain
  await db.delete(accounts).where(eq(accounts.id, accountId));
}
```

> **Delete safety note:** Deletion is blocked if the wallet holds any supported or otherwise detectable token balance. We do not allow deleting a tracked wallet while it still contains unassigned assets.

### 6.10. Internal Transfer

Simple TIP-20 transfer between two wallets owned by the same treasury:

```typescript
async function internalTransfer({
  fromAccountId,
  toAccountId,
  amount,
}: TransferParams) {
  const fromAccount = await getAccount(fromAccountId);
  const toAccount = await getAccount(toAccountId);

  // Validation
  if (fromAccount.tokenAddress !== toAccount.tokenAddress) {
    throw new Error('Accounts must hold the same token. Use swap for different tokens.');
  }
  if (fromAccount.id === toAccount.id) {
    throw new Error('Cannot transfer to the same account.');
  }

  // Execute TIP-20 transfer from fromAccount's wallet to toAccount's wallet
  const hash = await tempoClient.writeContract({
    address: fromAccount.tokenAddress as `0x${string}`,
    abi: tip20Abi,
    functionName: 'transfer',
    args: [toAccount.walletAddress, amount],
    account: fromAccount.walletAddress, // Root passkey signs
  });

  return hash;
}
```

## 7. Component Structure

```
apps/web/src/
├── domain/
│   ├── accounts/
│   │   ├── actions/
│   │   │   ├── create-account.ts      # Server action: validate + persist after client wallet provisioning
│   │   │   ├── rename-account.ts      # Server action: update name in DB
│   │   │   └── delete-account.ts      # Server action: check all detectable balances + remove
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
│   │   ├── components/
│   │   │   ├── swap-form.tsx          # From/To account selectors + amount + quote
│   │   │   └── swap-quote.tsx         # Live quote display from DEX
│   │   └── hooks/
│   │       ├── use-execute-swap.ts    # Client mutation: approve + swap, then transfer output
│   │       └── use-swap-quote.ts      # Tempo DEX quote hook wrapper
│   └── payments/                       # Extended from MVP
│       └── components/
│           └── send-form.tsx          # Updated: account selector added
├── app/
│   ├── dashboard/
│   │   └── page.tsx                   # Updated: multi-account cards + filter
│   ├── accounts/
│   │   ├── page.tsx                   # Accounts management page
│   │   └── [id]/
│   │       └── page.tsx               # Account detail page
│   └── swap/
│       └── page.tsx                   # Swap page
└── lib/
    └── constants.ts                   # Token addresses, DEX address, keychain address (updated)
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

// Transaction tagged with source account
interface AccountTransaction {
  txHash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  token: string;
  memo?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  accountName: string;  // Which account this tx belongs to
  accountId: string;
}
```

## 9. Testing Strategy

### 9.1. Unit Tests (Vitest — colocated with source files)

- **Account CRUD:** Name uniqueness validation, duplicate-index error mapping, default account protection, delete blocked on any detected balance
- **Token config:** Supported token lookup, address resolution
- **Balance aggregation:** Total balance calculation (1:1 USD), parallel query merging
- **Transaction merging:** Multi-wallet feed merge, timestamp sorting, account tagging
- **Swap quote:** Rate calculation, slippage tolerance, min amount out
- **Swap execution:** Receipt parsing for `amountOut`, second-step transfer payload, partial-failure recovery state
- **Transfer validation:** Same-token check, same-account rejection, amount validation

### 9.2. Integration Tests (Vitest)

- **Account creation on-chain:** Create wallet, register passkey on keychain, persist account row, verify key is authorized
- **DEX swap:** Quote → approve + swap → parse receipt → transfer output to destination wallet → verify both balances
- **Internal transfer:** TIP-20 transfer between two wallets, verify both balances
- **Delete account safety:** Wallet with unsupported/detected token balance cannot be deleted
- **DB operations:** Account CRUD with Neon branching and unique index enforcement

### 9.3. E2E Tests (Playwright — apps/web/e2e/)

- **Treasury creation:** Verify two default accounts created with funded balances
- **Create account:** Token selection → name → create → verify new card on dashboard with $0
- **Duplicate name:** Enter existing name → verify "Name already taken" error
- **Rename account:** ⋯ menu → Rename → enter new name → verify updated everywhere
- **Delete account (zero balance):** ⋯ menu → Delete → confirm → verify removed
- **Delete account (has balance):** ⋯ menu → Delete → verify blocked with transfer prompt
- **Delete account (unsupported asset):** Send non-configured token to wallet → verify delete is blocked
- **Delete default:** ⋯ menu → verify Delete option not shown
- **Send with account selector:** Open send → select account → verify token/balance update
- **Internal transfer:** Transfer form → select From/To → verify To filtered to same token
- **Swap:** Select From/To → verify quote appears → confirm → verify swap tx then transfer tx complete and both balances update
- **Swap partial failure:** Force second step failure → verify output remains on source wallet and recovery CTA is shown
- **Dashboard filter:** Tap account filter chip → verify feed narrows to one account
- **Account detail:** Tap card → verify detail page with correct address and transactions

## 10. Definition of Done

### Universal

- [ ] Unit & integration tests pass (`bun run test`)
- [ ] E2E tests pass (from `apps/web/`: `bun run test:e2e`)
- [ ] 90% coverage thresholds met (`bun run test:coverage` from `apps/web/`)
- [ ] TypeScript compiles cleanly (`bun run typecheck`)
- [ ] Biome passes (`bun run lint`)
- [ ] Database migrations are clean (`bun run db:generate` produces no diff from `apps/web/`)
- [ ] Spec updated to reflect implementation
- [ ] CI passes (lint, typecheck, test, build)
- [ ] App deployed and accessible on Vercel

### Feature-Specific

- [ ] Treasury creation creates two default account wallets (Main AlphaUSD, Main BetaUSD) with root passkey on each keychain
- [ ] Treasury auth/session remains anchored to `treasuries.tempoAddress` as the controller/root account
- [ ] Default accounts funded via faucet on creation
- [ ] User can create additional accounts (new on-chain wallet per account)
- [ ] Multiple accounts with same token supported (each with unique wallet address)
- [ ] Account names unique per treasury (enforced by app validation and DB unique index)
- [ ] Default accounts renamable but not deletable
- [ ] Non-default accounts deletable only when all detectable wallet balances are zero
- [ ] Dashboard shows all account cards with name, token, balance, address
- [ ] Total balance shown in USD (all tokens 1:1)
- [ ] Unified transaction feed merges all account wallets, sorted by time
- [ ] Transaction feed filterable by account
- [ ] Account detail page shows balance, address, QR, scoped transactions
- [ ] Send form has account selector (pre-selects when opened from account detail)
- [ ] Internal transfer works between same-token accounts
- [ ] Transfer button hidden when <2 accounts of same token
- [ ] Swap executes via Tempo DEX with quote preview, then transfers output into the destination account wallet
- [ ] Swap form enforces different token types for From/To
- [ ] If the swap transfer step fails, output funds remain recoverable in the source wallet and the UI surfaces that state
- [ ] Swap appears in both accounts' transaction histories
- [ ] Accounts management page lists all accounts with CRUD actions
- [ ] WebSocket subscriptions run per-wallet
- [ ] Receive sheet shows per-account wallet address and QR

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

- [MVP Spec](../mvp/spec.md)
- [MVP PRD](../mvp/prd.md)
- [Authentication Architecture](../mvp/authentication.md)
- [Monorepo Migration Spec](../monorepo-migration/spec.md)
