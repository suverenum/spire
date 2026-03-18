# CLAUDE.md

## Project Overview

Goldhord (goldhord.xyz) is a corporate treasury management platform for large enterprises, built on the Tempo blockchain (tempo.xyz). It replaces traditional treasury tools (NetSuite, Oracle) with a stablecoin-based system where trust and security are guaranteed by the chain — no banking license required.

**Core idea:** Each treasury account is a real on-chain wallet holding stablecoins (USDC, EURC). Enterprises get the same capabilities as corporate banking — multiple accounts, multi-currency, cross-entity transfers — but with instant settlement, full transparency, and no intermediaries.

**Target users:** CFOs, treasury managers, and finance teams at large enterprises with multiple business entities across countries.

## Tech Stack

- **Blockchain:** Tempo (tempo.xyz) — purpose-built L1 for stablecoin payments, built by Stripe
- **Framework:** Next.js 16 (App Router, Turbopack, React Compiler, PPR)
- **Language:** TypeScript (strict mode)
- **Monorepo:** Bun workspaces + Turborepo
- **Database:** Neon serverless Postgres + Drizzle ORM
- **State:** TanStack Query (server state) + React useState (local UI state)
- **Auth:** WebAuthn passkeys via Tempo's Account Keychain
- **Wallet:** Wagmi + Viem with Tempo support
- **Styling:** Tailwind CSS v4 + custom UI components
- **Linting:** Biome (replaces ESLint + Prettier)
- **Testing:** Vitest + React Testing Library + Playwright
- **Deployment:** Vercel
- **Observability:** Sentry + PostHog

## Monorepo Structure

```
goldhord/
├── apps/web/          # Main Next.js app
│   ├── src/
│   │   ├── app/       # Next.js routes (thin, orchestration only)
│   │   ├── domain/    # Business logic by feature (DDD)
│   │   ├── components/# Cross-domain UI components
│   │   ├── db/        # Drizzle schema + queries
│   │   └── lib/       # App utilities, Tempo client, session
│   ├── drizzle/       # SQL migrations
│   └── e2e/           # Playwright tests
├── packages/
│   ├── ui/            # Shared UI components (@goldhord/ui)
│   ├── utils/         # Shared utilities (@goldhord/utils)
│   └── tsconfig/      # Shared TypeScript configs
└── specs/             # Product specs (PRDs + technical specs)
```

## Essential Commands

```bash
bun run dev            # Start dev server (Turbopack)
bun run build          # Build all packages
bun run test           # Run all tests (Vitest via Turborepo)
bun run lint           # Lint all packages (Biome)
bun run lint:fix       # Auto-fix lint + format issues
bun run typecheck      # TypeScript check all packages
bun run format         # Sort Tailwind classes (Prettier)
bun run format:check   # Check Tailwind class order

# App-specific (run from apps/web/)
bun run db:generate    # Generate Drizzle migration
bun run db:migrate     # Run migrations
bun run test:coverage  # Tests with coverage report
bun run test:e2e       # Playwright E2E tests
```

## Architecture Principles

1. **Server-first** — React Server Components by default, `"use client"` only when needed
2. **Domain-driven design** — business logic in `src/domain/`, routes are thin orchestration
3. **On-chain truth** — balances and transactions come from the chain, not a DB
4. **One passkey, many wallets** — single biometric controls all treasury accounts
5. **Event-driven state** — TanStack Query for server state, optimistic updates, WebSocket for real-time
6. **No blocking renders** — persisted cache, skeletons, progressive hydration

## Domain Structure

Each domain is self-contained:

```
domain/
├── auth/           # Passkey authentication, session management
├── payments/       # Send, receive, transaction history
├── treasury/       # Treasury CRUD, header, settings
├── accounts/       # Multi-account management (create, rename, delete, transfer, grouping)
└── swap/           # Token swaps via Tempo DEX
```

## Key Patterns

- **Server actions** for mutations (`domain/*/actions/`)
- **Colocated tests** next to source files (`*.test.tsx`)
- **Internal packages** export raw TypeScript (no build step)
- **Biome** handles both linting and formatting in one pass
- **Turborepo** caches and parallelizes across packages

## Environment Variables

```
DATABASE_URL          # Neon Postgres connection string
SESSION_SECRET        # HMAC key for session cookies
NEXT_PUBLIC_SENTRY_DSN # Sentry client DSN
SENTRY_AUTH_TOKEN     # Sentry source maps (CI)
NEXT_PUBLIC_POSTHOG_KEY # PostHog analytics
ANTHROPIC_API_KEY     # Claude code review (CI)
TURBO_TOKEN           # Turborepo remote cache
TURBO_TEAM            # Vercel team for remote cache
```
