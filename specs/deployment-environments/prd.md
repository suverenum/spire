# PRD: Deployment Environments & CI/CD

## 1. Meta Information

- **Created Date:** 2026-03-19
- **Epic:** Deployment Environments
- **Depends on:** [Monorepo Migration](../monorepo-migration/spec.md) (Turborepo + Bun workspaces)

## 2. What

Set up two distinct deployment environments for Goldhord on Vercel:

| Environment | Domain | Network | Deploys |
|---|---|---|---|
| **Dev** | `goldhord.dev` | Tempo testnet (Moderato) | Auto on push to `main` |
| **Production** | `goldhord.xyz` | Tempo mainnet | Manual via GitHub Action |

Dev is the always-current build from `main` on testnet. Production is a manually promoted build on mainnet. Preview deployments continue to work for all feature branches on testnet.

## 3. Motivation

We currently have a single deployment target with no environment separation. This creates two problems:

1. **No mainnet/testnet split** — we can't test against testnet while serving production traffic on mainnet. Environment variables (RPC URLs, token addresses, fee payer keys) differ per network.
2. **No deployment control** — pushing to `main` shouldn't immediately affect production users. We need a deliberate promotion step for production releases.

## 4. Key Decisions

### Use Vercel's Native Environment System (Not Separate Projects)

Vercel supports Production, Preview, and Custom Environments within a single project. Each environment has independent environment variables, domain assignments, and branch tracking.

**Why single project over two separate Vercel projects:**
- Shared deployment history and rollback capability
- Single Turborepo remote cache (no duplication)
- Unified settings, headers, redirects
- Promotion between environments is built-in

### Production Uses Vercel Staged Builds with Manual Promotion

Rather than auto-deploying `main` to production, we use Vercel's **staged production build** pattern:

1. Push/merge to `main` → auto-deploys to **Dev** (`goldhord.dev`) with testnet vars
2. Same push creates a **Staged** production build (built with production env vars, but NOT serving on `goldhord.xyz`)
3. When ready for mainnet → Vercel dashboard → **Deployments** → find the staged build → **"..." → Promote**
4. `goldhord.xyz` now serves that build

**Setup:** Settings → Environments → Production → Branch Tracking → disable "Auto-assign Custom Production Domains"

**Rollback:** Deployments → select a previous production deployment → "..." → Promote (instant, no rebuild)

### Dev Environment Uses Vercel Custom Environment with Branch Tracking

Custom Environment "Dev" (already created) tracks the `main` branch. This gives us:
- Dedicated `goldhord.dev` domain
- Separate environment variables (testnet RPC, test tokens, dev database)
- Auto-deploy on every push to `main`

### Preview Deployments Stay on Testnet

All preview deployments (feature branches, PRs) use the same testnet config as Dev. They get auto-generated `*.vercel.app` URLs. No custom domain needed.

### Enable Skew Protection

Skew Protection prevents version mismatches when deploying while users have the app open. Enabled by default on newer Vercel projects. We ensure it stays on for Production.

**Trade-off:** Causes Turborepo cache misses due to `VERCEL_DEPLOYMENT_ID` changing per deploy. Acceptable — correctness over cache speed.

## 5. Environment Variables Strategy

### Network & Chain

| Variable | Dev (testnet) | Production (mainnet) |
|---|---|---|
| `NEXT_PUBLIC_TEMPO_CHAIN_ID` | `42431` (Moderato) | `4217` |
| `NEXT_PUBLIC_TEMPO_RPC_HTTP` | `https://rpc.moderato.tempo.xyz` | `https://rpc.tempo.xyz` |
| `NEXT_PUBLIC_TEMPO_RPC_WS` | `wss://rpc.moderato.tempo.xyz` | `wss://rpc.tempo.xyz` |
| `NEXT_PUBLIC_TEMPO_SPONSOR_URL` | `https://sponsor.moderato.tempo.xyz` | TBD (mainnet sponsor) |
| `NEXT_PUBLIC_TEMPO_EXPLORER_URL` | `https://explore.tempo.xyz` | `https://explore.tempo.xyz` (verify) |

### Tokens

Testnet uses AlphaUSD/BetaUSD. Mainnet uses real stablecoins (USDC, EURC). Token config must be environment-driven.

| Variable | Dev (testnet) | Production (mainnet) |
|---|---|---|
| `NEXT_PUBLIC_TOKENS` | JSON: AlphaUSD (`0x20c...0001`), BetaUSD (`0x20c...0002`) | JSON: USDC (TBD address), EURC (TBD address) |
| `NEXT_PUBLIC_DEFAULT_TOKEN` | `AlphaUSD` | `USDC` |

### Contracts

| Variable | Dev (testnet) | Production (mainnet) |
|---|---|---|
| `NEXT_PUBLIC_MULTISIG_FACTORY` | `0xf688...0342` (testnet v2) | TBD (mainnet deployment) |
| `NEXT_PUBLIC_GUARD_FACTORY` | `0x53Ab...a161` (testnet v2) | TBD (mainnet deployment) |

Note: Precompile addresses (DEX, FEE_MANAGER, KEYCHAIN) are the same on both networks — they're baked into the Tempo protocol.

### App & Infrastructure

| Variable | Dev (testnet) | Production (mainnet) |
|---|---|---|
| `NEXT_PUBLIC_APP_ENV` | `development` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://goldhord.dev` | `https://goldhord.xyz` |
| `DATABASE_URL` | Dev Neon branch | Production Neon branch |
| `SESSION_SECRET` | Dev secret | Production secret |
| `TEMPO_FEE_PAYER_KEY` | Testnet fee payer | Mainnet fee payer |
| `NEXT_PUBLIC_SENTRY_DSN` | Same DSN, different env tag | Same DSN, different env tag |
| `NEXT_PUBLIC_POSTHOG_KEY` | Same or separate project | Same or separate project |

Variables that stay the same:
- `SENTRY_AUTH_TOKEN` (CI-only, for source maps)
- `TURBO_TOKEN`, `TURBO_TEAM` (build cache)
- Precompile addresses: `DEX_ADDRESS`, `FEE_MANAGER_ADDRESS`, `KEYCHAIN_ADDRESS`

### Hardcoded Values to Refactor

The following are currently hardcoded and must become environment-driven:

| What | File | Issue |
|---|---|---|
| Chain ID `42431` | `apps/web/src/lib/constants.ts:3` | Hardcoded, needs env var |
| RPC URL `rpc.moderato.tempo.xyz` | `apps/web/src/lib/constants.ts:1-2` | Hardcoded, needs env var |
| Sponsor URL `sponsor.moderato.tempo.xyz` | `apps/web/src/lib/wagmi.ts:15` | Hardcoded in transport config |
| Token addresses (`0x20c...`) | `apps/web/src/lib/constants.ts:6-31` | Testnet-only tokens, needs env-driven config |
| Token names (AlphaUSD, BetaUSD) | `apps/web/src/lib/constants.ts`, `apps/web/src/lib/validations.ts:13,28` | Zod enums hardcode testnet token names |
| Default account token (AlphaUSD) | `apps/web/src/lib/constants.ts:36,39` | Should be USDC on mainnet |
| Multisig factory addresses | `apps/web/src/domain/multisig/hooks/use-create-multisig.ts:28-29` | Hardcoded testnet contracts |
| `tempoModerato` chain import | `apps/web/src/lib/wagmi.ts:1,7,15` | Imports testnet chain from viem, used in chains[] and transports |
| Chain name "Tempo Testnet" | `apps/web/src/lib/tempo/client.ts:8` | Hardcoded in custom chain definition |
| Explorer URL in chain def | `apps/web/src/lib/tempo/client.ts:14` | Hardcoded `explore.tempo.xyz` (also in constants.ts:4) |
| CSP connect-src domains | `apps/web/next.config.ts:40` | Hardcoded moderato RPC + sponsor domains |
| Faucet RPC `tempo_fundAddress` | `apps/web/src/domain/treasury/hooks/use-setup-default-accounts.ts:49-57` | Testnet-only method, must be gated or removed on mainnet |

### Turborepo Environment Declaration

Environment-dependent variables must be declared in `turbo.json` so Turborepo invalidates cache when they change between environments:

```json
{
  "tasks": {
    "build:deploy": {
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
        "NEXT_PUBLIC_APP_URL",
        "DATABASE_URL"
      ]
    }
  }
}
```

## 6. Implementation

### 6.1 Vercel Project Configuration

1. **Disable auto-deploy to Production** — Settings → Git → Production Branch: uncheck "Auto-assign Custom Production Domains" so pushes to `main` build but don't serve on `goldhord.xyz`
2. ~~**Create Custom Environment "Dev"**~~ — Already created. Verify Branch Tracking is set to `main`
3. **Assign domains:**
   - Production environment → `goldhord.xyz`
   - Dev environment → `goldhord.dev`
4. **Set environment variables** per environment (see table above)
5. **Enable Skew Protection** — Settings → Advanced → Skew Protection → On

### 6.2 Deployment Protection

| Environment | Protection |
|---|---|
| Production (`goldhord.xyz`) | Public (end users access it) |
| Dev (`goldhord.dev`) | Vercel Authentication (team members only, free on all plans) |
| Preview (`*.vercel.app`) | Standard Protection (default, free) |

### 6.3 Update CI to Run on Push to Main

Current CI only runs on PRs. Add push trigger so Dev deployments are validated:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]  # Add this
```

### 6.4 App-Level Environment Awareness

Add a shared config that reads `NEXT_PUBLIC_APP_ENV` so components can conditionally render environment indicators:

```typescript
// src/lib/env.ts
export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'
export const IS_PRODUCTION = APP_ENV === 'production'
export const IS_DEV = APP_ENV === 'development'
```

Use this to:
- Show a "TESTNET" banner on Dev
- Conditionally enable debug tools
- Select correct token contract addresses per network

## 7. DNS Configuration

| Domain | Record Type | Value |
|---|---|---|
| `goldhord.xyz` | A | `76.76.21.21` (Vercel) |
| `goldhord.dev` | CNAME | `cname.vercel-dns.com` |

Both domains must be added and verified in Vercel project settings.

## 8. Rollback Strategy

- **Dev:** Automatic — revert the commit on `main`, next push redeploys
- **Production:** Use Vercel's **Instant Rollback** — Deployments → select previous production deployment → "Promote to Production". No rebuild, instant domain reassignment

## 9. Future Considerations

- **Neon database branching** — Neon supports branch-per-preview for isolated DB testing. Evaluate when preview deployments need DB isolation
- **E2E tests in CI** — run Playwright against the Dev deployment URL after deploy, gate production promotion on E2E passing
