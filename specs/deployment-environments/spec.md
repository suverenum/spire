# SPEC: Deployment Environments & CI/CD

## 1. Meta Information

- **Branch:** feature/deployment-environments
- **Epic:** Deployment Environments
- **PRD:** [prd.md](./prd.md)
- **Depends on:** [Monorepo Migration](../monorepo-migration/spec.md)

## 2. Context

Set up environment-aware infrastructure so the same codebase deploys to Tempo testnet (Moderato) on `goldhord.dev` and Tempo mainnet on `goldhord.xyz`. All chain-specific values (RPC URLs, chain ID, token addresses, contract addresses) become environment variables instead of hardcoded constants. Dev auto-deploys from `main`; Production deploys via manual GitHub Action.

See [prd.md](./prd.md) for full scope, environment variable tables, and Vercel configuration steps.

## 3. Key Technical Drivers

- **Environment Parity:** Same code, different config. No `if (isTestnet)` forks in business logic — environment variables select the right values at build time.
- **Build-Time Resolution:** All `NEXT_PUBLIC_*` variables are inlined at build time by Next.js. The app cannot read them at runtime — each environment gets its own build with baked-in values.
- **Type Safety:** Token config parsed from JSON env var with Zod validation at startup. Invalid config crashes the build, not the user.
- **CSP Security:** Content-Security-Policy headers must whitelist the correct RPC/sponsor domains per environment, not all domains globally.

## 4. Current State

### 4.1. Hardcoded Testnet Values

All chain-specific values are hardcoded for Tempo Moderato (testnet):

**`apps/web/src/lib/constants.ts`** — central constants file:
- Line 1-2: RPC URL `https://rpc.moderato.tempo.xyz` and derived WSS URL
- Line 3: Chain ID `42431`
- Line 4: Explorer URL `https://explore.tempo.xyz`
- Lines 6-31: `SUPPORTED_TOKENS` object with 4 testnet tokens (AlphaUSD, BetaUSD, pathUSD, ThetaUSD) and their `0x20c...` addresses
- Line 36: `ACCOUNT_TOKENS` hardcoded to `[AlphaUSD]`
- Line 39: `DEFAULT_ACCOUNTS` hardcoded to `[{ name: "Main", tokenSymbol: "AlphaUSD" }]`

**`apps/web/src/lib/wagmi.ts`** — Wagmi config:
- Line 1: imports `tempoModerato` chain from `viem/chains`
- Line 7: uses `tempoModerato` in `chains[]`
- Line 15: hardcodes `https://sponsor.moderato.tempo.xyz` in transport

**`apps/web/src/lib/tempo/client.ts`** — Viem public client:
- Line 8: chain name `"Tempo Testnet"`
- Line 14: explorer URL `https://explore.tempo.xyz` duplicated from constants

**`apps/web/src/lib/validations.ts`** — Zod schemas:
- Line 13: `z.enum(["AlphaUSD", "BetaUSD", "pathUSD", "ThetaUSD"])` in send payment schema
- Line 28: `z.enum(["AlphaUSD", "BetaUSD"])` in create account schema

**`apps/web/src/domain/multisig/hooks/use-create-multisig.ts`** — multisig contracts:
- Lines 28-29: factory addresses hardcoded for "Tempo Testnet v2 deployment"

**`apps/web/src/domain/treasury/hooks/use-setup-default-accounts.ts`** — faucet:
- Lines 49-57, 134-143: calls `tempo_fundAddress` RPC method (testnet-only, doesn't exist on mainnet)

**`apps/web/next.config.ts`** — CSP headers:
- Line 40: `connect-src` whitelists `rpc.moderato.tempo.xyz`, `wss://rpc.moderato.tempo.xyz`, `sponsor.moderato.tempo.xyz`

### 4.2. Current CI/CD

**`.github/workflows/ci.yml`** — runs on PRs to `main` only:
- Lint (Biome) → Type check → Test (Vitest) → Build
- Uses `TURBO_TOKEN`/`TURBO_TEAM` for remote caching

**`.github/workflows/claude.yml`** — Claude code review on PRs

**`turbo.json`** — uses `passThroughEnv` (not `env`) for build tasks. Lists Neon Postgres vars, Sentry, PostHog. Does **not** list any Tempo chain vars — meaning Turborepo doesn't know to invalidate cache when chain config changes.

### 4.3. Architecture

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── constants.ts       # ← All hardcoded chain values live here
│   │   ├── wagmi.ts           # ← Hardcoded tempoModerato chain + sponsor
│   │   ├── validations.ts     # ← Hardcoded token name enums
│   │   └── tempo/
│   │       └── client.ts      # ← Hardcoded chain name + explorer in custom chain def
│   └── domain/
│       ├── treasury/hooks/
│       │   └── use-setup-default-accounts.ts  # ← Faucet calls (testnet-only)
│       └── multisig/hooks/
│           └── use-create-multisig.ts         # ← Hardcoded factory addresses
├── next.config.ts             # ← Hardcoded CSP connect-src domains
└── .env.example               # ← Missing all NEXT_PUBLIC_TEMPO_* vars
```

## 5. Proposed Solution

### 5.1. Environment Variable Schema

Create a typed, validated environment config that reads all chain-specific values from `NEXT_PUBLIC_*` env vars. Fail at build time if any required value is missing.

**New file: `apps/web/src/lib/env.ts`**

```typescript
import { z } from "zod";

const tokenSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const envSchema = z.object({
  // Chain
  NEXT_PUBLIC_TEMPO_CHAIN_ID: z.coerce.number(),
  NEXT_PUBLIC_TEMPO_RPC_HTTP: z.string().url(),
  NEXT_PUBLIC_TEMPO_RPC_WS: z.string().startsWith("wss://"),
  NEXT_PUBLIC_TEMPO_SPONSOR_URL: z.string().url(),
  NEXT_PUBLIC_TEMPO_EXPLORER_URL: z.string().url(),

  // Tokens (JSON string → parsed array)
  NEXT_PUBLIC_TOKENS: z.string().transform((s) => z.array(tokenSchema).parse(JSON.parse(s))),
  NEXT_PUBLIC_DEFAULT_TOKEN: z.string(),

  // Contracts
  NEXT_PUBLIC_MULTISIG_FACTORY: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  NEXT_PUBLIC_GUARD_FACTORY: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  // App
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Validated at module load time — build fails if invalid
export const env = envSchema.parse({
  NEXT_PUBLIC_TEMPO_CHAIN_ID: process.env.NEXT_PUBLIC_TEMPO_CHAIN_ID,
  NEXT_PUBLIC_TEMPO_RPC_HTTP: process.env.NEXT_PUBLIC_TEMPO_RPC_HTTP,
  NEXT_PUBLIC_TEMPO_RPC_WS: process.env.NEXT_PUBLIC_TEMPO_RPC_WS,
  NEXT_PUBLIC_TEMPO_SPONSOR_URL: process.env.NEXT_PUBLIC_TEMPO_SPONSOR_URL,
  NEXT_PUBLIC_TEMPO_EXPLORER_URL: process.env.NEXT_PUBLIC_TEMPO_EXPLORER_URL,
  NEXT_PUBLIC_TOKENS: process.env.NEXT_PUBLIC_TOKENS,
  NEXT_PUBLIC_DEFAULT_TOKEN: process.env.NEXT_PUBLIC_DEFAULT_TOKEN,
  NEXT_PUBLIC_MULTISIG_FACTORY: process.env.NEXT_PUBLIC_MULTISIG_FACTORY,
  NEXT_PUBLIC_GUARD_FACTORY: process.env.NEXT_PUBLIC_GUARD_FACTORY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const IS_PRODUCTION = env.NEXT_PUBLIC_APP_ENV === "production";
export const IS_TESTNET = !IS_PRODUCTION;
```

### 5.2. Refactor `constants.ts`

Replace hardcoded values with env-derived constants. The file's exports keep the same names so downstream consumers don't change.

**`apps/web/src/lib/constants.ts`** (after):

```typescript
import { env } from "./env";

// ─── Chain ───────────────────────────────────────────────────────────
export const TEMPO_RPC_URL = env.NEXT_PUBLIC_TEMPO_RPC_HTTP;
export const TEMPO_WS_URL = env.NEXT_PUBLIC_TEMPO_RPC_WS;
export const TEMPO_CHAIN_ID = env.NEXT_PUBLIC_TEMPO_CHAIN_ID;
export const TEMPO_EXPLORER_URL = env.NEXT_PUBLIC_TEMPO_EXPLORER_URL;

// ─── Tokens ──────────────────────────────────────────────────────────
// Parsed from NEXT_PUBLIC_TOKENS JSON env var
const tokenList = env.NEXT_PUBLIC_TOKENS;

export const SUPPORTED_TOKENS = Object.fromEntries(
  tokenList.map((t) => [t.name, { ...t, address: t.address as `0x${string}` }]),
) as Record<string, {
  name: string;
  symbol: string;
  decimals: number;
  address: `0x${string}`;
}>;

export type TokenName = string;

// Tokens available for account creation
export const ACCOUNT_TOKENS = tokenList.map((t) => ({
  ...t,
  address: t.address as `0x${string}`,
}));

// Default accounts provisioned when a new treasury is created
const defaultTokenName = env.NEXT_PUBLIC_DEFAULT_TOKEN;
export const DEFAULT_ACCOUNTS = [
  { name: "Main", tokenSymbol: defaultTokenName as TokenName },
] as const;

// ─── Precompile addresses (same on all Tempo networks) ──────────────
export const DEX_ADDRESS = "0xDEc0000000000000000000000000000000000000" as `0x${string}`;
export const FEE_MANAGER_ADDRESS = "0xfeec000000000000000000000000000000000000" as `0x${string}`;
export const KEYCHAIN_ADDRESS = "0xAAAAAAAA00000000000000000000000000000000" as `0x${string}`;

// ─── App constants (not environment-dependent) ──────────────────────
export const SESSION_MAX_AGE_MS = 15 * 60 * 1000;
export const SESSION_COOKIE_NAME = "goldhord-session";

export const CACHE_KEYS = {
  balances: (address: string) => ["balances", address] as const,
  transactions: (address: string) => ["transactions", address] as const,
  accounts: (treasuryId: string) => ["accounts", treasuryId] as const,
  accountBalance: (walletAddress: string, tokenAddress: string) =>
    ["accountBalance", walletAddress, tokenAddress] as const,
  multisigConfig: (accountId: string) => ["multisig-config", accountId] as const,
  pendingTransactions: (accountId: string) => ["pending-transactions", accountId] as const,
} as const;
```

**Key design choice:** `SUPPORTED_TOKENS` changes from a const object with known keys (`AlphaUSD`, `BetaUSD`) to a dynamic `Record<string, Token>`. This means:
- `TokenName` becomes `string` instead of a union type
- Downstream code that does `SUPPORTED_TOKENS.AlphaUSD` must use `SUPPORTED_TOKENS[tokenName]` with a lookup
- Zod enums in validations must derive from the runtime token list (see 5.4)

### 5.3. Refactor `wagmi.ts`

Replace `tempoModerato` import with a custom chain definition built from env vars.

**`apps/web/src/lib/wagmi.ts`** (after):

```typescript
import { type Chain } from "viem";
import { withFeePayer } from "viem/tempo";
import { createConfig, http } from "wagmi";
import { KeyManager, webAuthn } from "wagmi/tempo";
import { env } from "./env";

const tempoChain: Chain = {
  id: env.NEXT_PUBLIC_TEMPO_CHAIN_ID,
  name: env.NEXT_PUBLIC_APP_ENV === "production" ? "Tempo" : "Tempo Testnet",
  nativeCurrency: { name: "TEMPO", symbol: "TEMPO", decimals: 18 },
  rpcUrls: {
    default: { http: [env.NEXT_PUBLIC_TEMPO_RPC_HTTP] },
  },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: env.NEXT_PUBLIC_TEMPO_EXPLORER_URL },
  },
};

export const wagmiConfig = createConfig({
  chains: [tempoChain],
  connectors: [
    webAuthn({
      keyManager: KeyManager.localStorage(),
    }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    [tempoChain.id]: withFeePayer(http(), http(env.NEXT_PUBLIC_TEMPO_SPONSOR_URL)),
  },
});
```

**What this eliminates:**
- `import { tempoModerato } from "viem/chains"` — no longer needed
- Hardcoded sponsor URL — comes from env
- The separate `tempoChain` definition in `tempo/client.ts` becomes redundant (see 5.5)

### 5.4. Refactor `validations.ts`

Replace hardcoded token name enums with dynamic validation derived from the runtime token list.

**`apps/web/src/lib/validations.ts`** (after):

```typescript
import z from "zod";
import { SUPPORTED_TOKENS, ACCOUNT_TOKENS } from "./constants";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format (0x...)");

// Derive valid token names from runtime config
const allTokenNames = Object.keys(SUPPORTED_TOKENS) as [string, ...string[]];
const accountTokenNames = ACCOUNT_TOKENS.map((t) => t.name) as [string, ...string[]];

export const sendPaymentSchema = z.object({
  to: addressSchema,
  amount: z
    .string()
    .regex(/^(0|[1-9]\d*)(\.\d{1,6})?$/, "Amount must be a valid number")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
  token: z.enum(allTokenNames),
  memo: z
    .string()
    .refine((v) => new TextEncoder().encode(v).length <= 32, "Memo must be 32 bytes or less")
    .optional(),
});

export const createTreasurySchema = z.object({
  name: z.string().min(1).max(100),
});

export const accountNameSchema = z.string().min(1).max(100);

export const createAccountSchema = z.object({
  name: accountNameSchema,
  tokenSymbol: z.enum(accountTokenNames),
});

export const renameAccountSchema = z.object({
  accountId: z.string().uuid(),
  name: accountNameSchema,
});
```

### 5.5. Refactor `tempo/client.ts`

Remove the duplicated chain definition. Import the shared chain config from `wagmi.ts` or build from env directly.

**`apps/web/src/lib/tempo/client.ts`** (after):

```typescript
import { createPublicClient, http, type PublicClient } from "viem";
import { SUPPORTED_TOKENS, TEMPO_CHAIN_ID, TEMPO_RPC_URL, TEMPO_EXPLORER_URL } from "../constants";
import { tip20Abi } from "./abi";
import type { AccountBalance, BalancesResult, Payment } from "./types";

const tempoChain = {
  id: TEMPO_CHAIN_ID,
  name: "Tempo",
  nativeCurrency: { name: "TEMPO", symbol: "TEMPO", decimals: 18 },
  rpcUrls: {
    default: { http: [TEMPO_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: TEMPO_EXPLORER_URL },
  },
} as const;

// ... rest of file unchanged (fetchBalances, fetchTransactions)
```

**Changes:** Explorer URL now comes from constants (which comes from env) instead of being hardcoded a second time.

### 5.6. Refactor Multisig Factory Addresses

**`apps/web/src/domain/multisig/hooks/use-create-multisig.ts`** (change):

```typescript
// Before:
const FACTORY_ADDRESS = "0xf6888688CAAed87352E975964400493429930342" as Address;
const GUARD_FACTORY_ADDRESS = "0x53AbdcC50268bd4283187Bef5a48942E9e1aa161" as Address;

// After:
import { env } from "@/lib/env";
const FACTORY_ADDRESS = env.NEXT_PUBLIC_MULTISIG_FACTORY as Address;
const GUARD_FACTORY_ADDRESS = env.NEXT_PUBLIC_GUARD_FACTORY as Address;
```

### 5.7. Gate Faucet Calls

The `tempo_fundAddress` RPC method only exists on testnet. On mainnet, calling it would fail silently (fire-and-forget) but it's wasted network traffic and confusing in logs.

**`apps/web/src/domain/treasury/hooks/use-setup-default-accounts.ts`** (change):

```typescript
import { IS_TESTNET } from "@/lib/env";

// In both useSetupDefaultAccounts and useRetryDefaultAccountSetup:
// Wrap faucet calls:
if (IS_TESTNET) {
  fetch(TEMPO_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tempo_fundAddress",
      params: [walletAddress],
      id: 1,
    }),
  }).catch(() => {});
}
```

Two call sites: `useSetupDefaultAccounts` (line 48) and `useRetryDefaultAccountSetup` (line 133).

### 5.8. Dynamic CSP Headers

**`apps/web/next.config.ts`** (change):

```typescript
// Before:
"connect-src 'self' https://rpc.moderato.tempo.xyz wss://rpc.moderato.tempo.xyz https://sponsor.moderato.tempo.xyz https://*.ingest.sentry.io https://us.i.posthog.com",

// After:
`connect-src 'self' ${process.env.NEXT_PUBLIC_TEMPO_RPC_HTTP} ${process.env.NEXT_PUBLIC_TEMPO_RPC_WS} ${process.env.NEXT_PUBLIC_TEMPO_SPONSOR_URL} https://*.ingest.sentry.io https://us.i.posthog.com`,
```

`next.config.ts` runs at build time in Node.js, so `process.env` works directly — no need to import the Zod schema here.

### 5.9. Update `turbo.json`

Add Tempo env vars so Turborepo invalidates cache when chain config changes between environments. Use `env` (not just `passThroughEnv`) for vars that affect build output.

**Add to `build:deploy` and `build` tasks:**

```json
"env": [
  "NEXT_PUBLIC_TEMPO_CHAIN_ID",
  "NEXT_PUBLIC_TEMPO_RPC_HTTP",
  "NEXT_PUBLIC_TEMPO_RPC_WS",
  "NEXT_PUBLIC_TEMPO_SPONSOR_URL",
  "NEXT_PUBLIC_TEMPO_EXPLORER_URL",
  "NEXT_PUBLIC_TOKENS",
  "NEXT_PUBLIC_DEFAULT_TOKEN",
  "NEXT_PUBLIC_MULTISIG_FACTORY",
  "NEXT_PUBLIC_GUARD_FACTORY",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL"
]
```

**Why `env` in addition to `passThroughEnv`:** `passThroughEnv` makes vars available to the build process but doesn't use them as cache keys. `env` does both — Turborepo hashes these values and busts the cache when they change. Since `NEXT_PUBLIC_*` vars are inlined into the build output, changing them must produce a new build.

### 5.10. Update `.env.example`

Add all new environment variables with testnet defaults:

```bash
# Chain
NEXT_PUBLIC_TEMPO_CHAIN_ID=42431
NEXT_PUBLIC_TEMPO_RPC_HTTP=https://rpc.moderato.tempo.xyz
NEXT_PUBLIC_TEMPO_RPC_WS=wss://rpc.moderato.tempo.xyz
NEXT_PUBLIC_TEMPO_SPONSOR_URL=https://sponsor.moderato.tempo.xyz
NEXT_PUBLIC_TEMPO_EXPLORER_URL=https://explore.tempo.xyz

# Tokens (JSON array)
NEXT_PUBLIC_TOKENS=[{"name":"AlphaUSD","symbol":"AUSD","decimals":6,"address":"0x20c0000000000000000000000000000000000001"},{"name":"BetaUSD","symbol":"BUSD","decimals":6,"address":"0x20c0000000000000000000000000000000000002"}]
NEXT_PUBLIC_DEFAULT_TOKEN=AlphaUSD

# Contracts
NEXT_PUBLIC_MULTISIG_FACTORY=0xf6888688CAAed87352E975964400493429930342
NEXT_PUBLIC_GUARD_FACTORY=0x53AbdcC50268bd4283187Bef5a48942E9e1aa161

# App
NEXT_PUBLIC_APP_ENV=development

# Infrastructure (existing)
DATABASE_URL=
SESSION_SECRET=
TEMPO_FEE_PAYER_KEY=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 5.11. GitHub Actions: Production Deploy Workflow

**New file: `.github/workflows/deploy-production.yml`**

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      ref:
        description: 'Git ref to deploy (commit SHA, tag, or branch)'
        required: false
        default: 'main'
        type: string

concurrency:
  group: production-deploy
  cancel-in-progress: false

jobs:
  ci:
    name: Lint, Type Check, Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint + Format (Biome)
        run: bun run lint

      - name: Type check
        run: bun run typecheck

      - name: Tests
        run: bun run test

    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

  deploy:
    name: Deploy to Production
    needs: ci
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}

      - uses: oven-sh/setup-bun@v2

      - name: Install Vercel CLI
        run: bun add -g vercel

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Difference from PRD draft:** Added a `ci` job that runs lint/typecheck/tests before deploy. The `deploy` job has `needs: ci` so it only runs if CI passes.

### 5.12. Update CI Workflow

Add push trigger to `main` so merges are validated:

**`.github/workflows/ci.yml`** (change):

```yaml
# Before:
on:
  pull_request:
    branches: [main]

# After:
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

## 6. Migration Plan

This is an incremental refactor. Each step can be merged independently, and the app works at every stage.

### Step 1: Add `env.ts` + update `.env.example` + `.env.local`

Create the Zod schema. Add all `NEXT_PUBLIC_TEMPO_*` vars to `.env.example` with testnet defaults. Update local `.env.local` with the same testnet values. At this point, `env.ts` exists but nothing imports it yet.

### Step 2: Refactor `constants.ts` to read from `env.ts`

Replace hardcoded chain values (RPC, chain ID, explorer) with env-derived values. Keep the same export names. All downstream consumers continue to work without changes.

Replace hardcoded `SUPPORTED_TOKENS` with JSON-parsed env var. `TokenName` becomes `string`. Update `ACCOUNT_TOKENS` and `DEFAULT_ACCOUNTS`.

### Step 3: Refactor `validations.ts`

Replace hardcoded `z.enum()` token lists with dynamic enums derived from `SUPPORTED_TOKENS`.

### Step 4: Refactor `wagmi.ts`

Replace `tempoModerato` import with custom chain from env. Replace hardcoded sponsor URL.

### Step 5: Refactor `tempo/client.ts`

Remove duplicated chain name and explorer URL. Import from constants.

### Step 6: Refactor multisig factory addresses

Replace hardcoded addresses in `use-create-multisig.ts` with env vars.

### Step 7: Gate faucet calls

Wrap `tempo_fundAddress` calls with `IS_TESTNET` check in both `useSetupDefaultAccounts` and `useRetryDefaultAccountSetup`.

### Step 8: Dynamic CSP headers

Replace hardcoded moderato domains in `next.config.ts` CSP with env var interpolation.

### Step 9: Update `turbo.json`

Add `env` array with all `NEXT_PUBLIC_TEMPO_*` vars to `build` and `build:deploy` tasks.

### Step 10: Set Vercel environment variables

Configure all vars in Vercel dashboard for Dev (testnet values) and Production (mainnet values).

### Step 11: Add CI push trigger + production deploy workflow

Update `.github/workflows/ci.yml` with push trigger. Create `.github/workflows/deploy-production.yml`.

### Step 12: Configure Vercel environments

- Verify Dev custom environment tracks `main`
- Assign `goldhord.dev` domain to Dev environment
- Assign `goldhord.xyz` domain to Production environment
- Disable auto-assign production domains
- Enable Skew Protection

## 7. Component Structure

```
apps/web/
├── src/lib/
│   ├── env.ts                 # NEW — Zod-validated environment config
│   ├── constants.ts           # MODIFIED — reads from env.ts instead of hardcoded values
│   ├── validations.ts         # MODIFIED — dynamic token enums from constants
│   ├── wagmi.ts               # MODIFIED — custom chain from env, no tempoModerato import
│   └── tempo/
│       └── client.ts          # MODIFIED — chain name + explorer from constants
├── src/domain/
│   ├── treasury/hooks/
│   │   └── use-setup-default-accounts.ts  # MODIFIED — faucet gated behind IS_TESTNET
│   └── multisig/hooks/
│       └── use-create-multisig.ts         # MODIFIED — factory addresses from env
├── next.config.ts             # MODIFIED — dynamic CSP connect-src
├── .env.example               # MODIFIED — all NEXT_PUBLIC_TEMPO_* vars added
└── .env.local                 # MODIFIED — testnet values for local dev
.github/workflows/
├── ci.yml                     # MODIFIED — added push trigger on main
└── deploy-production.yml      # NEW — manual production deploy
turbo.json                     # MODIFIED — env array added to build tasks
```

## 8. Testing Strategy

### 8.1. Unit Tests (Vitest)

- **`env.ts` validation:** Test that missing required vars throw, that `NEXT_PUBLIC_TOKENS` JSON parsing works, that invalid addresses are rejected, that defaults are applied for optional vars
- **`constants.ts` derived values:** Test that `SUPPORTED_TOKENS` is correctly built from parsed JSON, that `ACCOUNT_TOKENS` contains the right subset, that `DEFAULT_ACCOUNTS` uses `NEXT_PUBLIC_DEFAULT_TOKEN`
- **`validations.ts` dynamic enums:** Test that `sendPaymentSchema` accepts tokens from the runtime config and rejects unknown tokens
- **Faucet gating:** Test that `IS_TESTNET` correctly reflects `NEXT_PUBLIC_APP_ENV`

### 8.2. Build Verification

- **Testnet build:** `NEXT_PUBLIC_APP_ENV=development bun run build` succeeds with testnet env vars
- **Mainnet build:** `NEXT_PUBLIC_APP_ENV=production bun run build` succeeds with mainnet env vars (once available)
- **Missing var build:** Build fails with clear Zod error when a required `NEXT_PUBLIC_TEMPO_*` var is missing
- **CSP headers:** Verify built app serves correct `connect-src` domains per environment

### 8.3. Smoke Tests

- **Dev deployment:** Push to `main` → verify `goldhord.dev` serves the app with testnet RPC
- **Production deployment:** Trigger GitHub Action → verify `goldhord.xyz` serves the app with mainnet RPC
- **Faucet:** Verify faucet is called on testnet treasury creation, not called on production

## 9. Definition of Done

### Universal

- [ ] Unit tests pass (`bun run test`)
- [ ] TypeScript compiles cleanly (`bun run typecheck`)
- [ ] Biome lint + format passes (`bun run lint`)
- [ ] CI passes on PR
- [ ] App builds successfully with testnet env vars
- [ ] App builds successfully with mainnet env vars (stubbed if mainnet token addresses not yet available)
- [ ] Build fails with clear error when required env vars are missing

### Feature-Specific

- [ ] Zero hardcoded chain-specific values in source code (RPC URLs, chain ID, token addresses, factory addresses, sponsor URL)
- [ ] Precompile addresses (DEX, FEE_MANAGER, KEYCHAIN) remain hardcoded (same on all networks)
- [ ] `SUPPORTED_TOKENS` parsed from `NEXT_PUBLIC_TOKENS` JSON env var
- [ ] `DEFAULT_ACCOUNTS` uses `NEXT_PUBLIC_DEFAULT_TOKEN`
- [ ] Zod validation schemas derive token enums from runtime config
- [ ] Wagmi config uses custom chain from env (no `tempoModerato` import)
- [ ] CSP `connect-src` uses env vars for RPC/sponsor domains
- [ ] Faucet calls (`tempo_fundAddress`) gated behind `IS_TESTNET`
- [ ] `turbo.json` lists all `NEXT_PUBLIC_TEMPO_*` vars in `env` array
- [ ] `.env.example` documents all new vars with testnet defaults
- [ ] CI runs on both PRs and pushes to `main`
- [ ] Production deploy workflow exists and is triggered via `workflow_dispatch`
- [ ] Production deploy runs CI checks before deploying
- [ ] `goldhord.dev` auto-deploys from `main` with testnet config
- [ ] `goldhord.xyz` deploys only via manual GitHub Action with mainnet config
