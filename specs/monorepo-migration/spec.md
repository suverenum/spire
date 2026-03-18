# SPEC: Monorepo Migration

## 1. Meta Information

- **Created:** 2026-03-17
- **Epic:** Developer Experience
- **Depends on:** MVP (current single-package structure)

## 2. Context

Spire is currently a single-package Next.js app. As we add a shared UI kit, shared utilities, and potentially other apps (admin dashboard, marketing site), a monorepo structure becomes necessary. This spec defines the target structure and migration path.

## 3. Key Decisions

### Bun Workspaces (No pnpm needed)

Bun has native workspace support via the standard `"workspaces"` field in `package.json`. It uses `workspace:*` protocol for inter-package dependencies, same as pnpm. No need for pnpm — bun handles installs 3-5x faster and has workspace filtering via `bun --filter`.

### Turborepo for Task Orchestration

Bun handles package management but not build orchestration. Turborepo adds:
- **Intelligent caching** — skips unchanged packages
- **Parallel execution** — respects dependency graph
- **Vercel integration** — automatic build skipping for unchanged apps

### Internal Packages Use TypeScript Source (No Build Step)

Shared packages (`@spire/ui`, `@spire/utils`) export raw TypeScript. Consuming apps transpile them via `transpilePackages` in `next.config.ts`. This avoids maintaining separate build pipelines for internal packages.

### Test Colocation

Tests live next to source files (`Button.tsx` + `Button.test.tsx`). This is the industry standard for 2025+:
- Easy to spot missing tests
- Refactoring moves code + tests together
- Vitest/Jest patterns support this natively

E2E tests remain in a top-level `e2e/` directory since they test the deployed app, not individual packages.

### Shared Config Packages

ESLint, TypeScript, and Tailwind configs are shared internal packages. Each app/package extends them, avoiding config duplication.

## 4. Target Structure

```
spire/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── claude.yml
│
├── apps/
│   └── web/                              # Main Next.js app (current src/)
│       ├── src/
│       │   ├── app/                      # Next.js App Router (thin routing)
│       │   ├── domain/                   # Business logic by feature
│       │   │   ├── auth/
│       │   │   │   ├── actions/
│       │   │   │   ├── components/
│       │   │   │   │   ├── welcome-screen.tsx
│       │   │   │   │   └── welcome-screen.test.tsx
│       │   │   │   └── hooks/
│       │   │   ├── payments/
│       │   │   ├── treasury/
│       │   │   ├── accounts/             # (multi-accounts feature)
│       │   │   └── swap/                 # (multi-accounts feature)
│       │   ├── components/               # Cross-domain app components
│       │   ├── context/                  # Jotai atoms, providers
│       │   ├── db/                       # Drizzle schema + migrations
│       │   └── lib/                      # App-specific utilities
│       ├── drizzle/                      # Migration SQL files
│       ├── e2e/                          # Playwright E2E tests
│       ├── next.config.ts
│       ├── vitest.config.ts
│       ├── playwright.config.ts
│       ├── drizzle.config.ts
│       ├── sentry.client.config.ts
│       ├── sentry.server.config.ts
│       ├── sentry.edge.config.ts
│       ├── tsconfig.json                 # extends @spire/tsconfig/next
│       └── package.json
│
├── packages/
│   ├── ui/                               # Shared UI component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button/
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── button.test.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── card/
│   │   │   │   ├── input/
│   │   │   │   ├── sheet/
│   │   │   │   ├── tabs/
│   │   │   │   └── toast/
│   │   │   ├── hooks/                    # UI-specific hooks
│   │   │   └── index.ts                  # Main barrel export
│   │   ├── tsconfig.json                 # extends @spire/tsconfig/react
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   ├── utils/                            # Shared utilities
│   │   ├── src/
│   │   │   ├── format.ts                 # formatBalance, formatDate
│   │   │   ├── address.ts                # truncateAddress, addressSchema
│   │   │   ├── cn.ts                     # Tailwind class merge
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   ├── eslint-config/                    # Shared ESLint flat config
│   │   ├── src/
│   │   │   ├── base.mjs                  # Base rules (TS, import)
│   │   │   └── next.mjs                  # Next.js-specific rules
│   │   └── package.json
│   │
│   ├── tsconfig/                         # Shared TypeScript configs
│   │   ├── base.json
│   │   ├── react.json                    # extends base, adds JSX
│   │   ├── next.json                     # extends react, adds Next.js plugin
│   │   └── package.json
│   │
│   └── tailwind-config/                  # Shared Tailwind config
│       ├── src/
│       │   └── index.ts                  # Theme, tokens, plugins
│       └── package.json
│
├── specs/                                # Product specs (not a package)
│   ├── mvp/
│   ├── multi-accounts/
│   └── monorepo-migration/
│
├── turbo.json                            # Turborepo task config
├── package.json                          # Root workspace config
├── tsconfig.json                         # Root TS config (references)
├── eslint.config.mjs                     # Root ESLint (imports shared)
├── .prettierrc
├── bun.lock
└── CLAUDE.md
```

## 5. Package Definitions

### Root `package.json`

```json
{
  "name": "spire",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "turbo": "^2",
    "prettier": "^3",
    "prettier-plugin-tailwindcss": "^0.6",
    "husky": "^9"
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "outputs": [".next/**", "dist/**"],
      "dependsOn": ["^build"]
    },
    "test": {
      "outputs": ["coverage/**"],
      "dependsOn": ["^build"]
    },
    "lint": {
      "outputs": [".eslintcache"]
    },
    "typecheck": {
      "outputs": []
    }
  }
}
```

### `packages/ui/package.json`

```json
{
  "name": "@spire/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./styles": "./src/styles/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^3",
    "lucide-react": "^0.500"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@spire/tsconfig": "workspace:*",
    "@spire/eslint-config": "workspace:*",
    "typescript": "^5",
    "vitest": "^4",
    "@testing-library/react": "^16"
  }
}
```

### `packages/utils/package.json`

```json
{
  "name": "@spire/utils",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@spire/tsconfig": "workspace:*",
    "@spire/eslint-config": "workspace:*",
    "typescript": "^5",
    "vitest": "^4"
  }
}
```

### `apps/web/package.json`

```json
{
  "name": "@spire/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "drizzle-kit migrate && next build",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@spire/ui": "workspace:*",
    "@spire/utils": "workspace:*",
    "next": "^16",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@spire/tsconfig": "workspace:*",
    "@spire/eslint-config": "workspace:*",
    "@spire/tailwind-config": "workspace:*"
  }
}
```

### `apps/web/next.config.ts`

```typescript
const nextConfig = {
  transpilePackages: ["@spire/ui", "@spire/utils"],
  // ... rest of config
};
```

## 6. App Internal Structure

### Domain-Driven Design (Already Established)

The current `src/domain/` pattern is correct and stays. Each domain is self-contained:

```
domain/
├── auth/
│   ├── actions/          # Server actions
│   ├── components/       # Domain-specific UI (colocated tests)
│   └── hooks/            # Client-side hooks
├── payments/
│   ├── actions/
│   ├── components/
│   └── hooks/
├── treasury/
│   ├── actions/
│   └── components/
├── accounts/             # Future: multi-accounts
└── swap/                 # Future: token swaps
```

### `app/` Routes Stay Thin

Pages are orchestration only — fetch data, pass to domain components:

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <DashboardContent {...session} />;
}
```

### What Moves to Shared Packages

| Current Location | Target Package | Why |
|---|---|---|
| `src/components/ui/*` (Button, Card, Input, Sheet, Tabs, Toast) | `@spire/ui` | Reusable across apps |
| `src/lib/utils.ts` (cn, truncateAddress, formatBalance, formatDate) | `@spire/utils` | Reusable across apps |
| `src/components/skeletons.tsx` | `@spire/ui` | UI primitives |
| `eslint.config.mjs` rules | `@spire/eslint-config` | Shared across packages |
| `tsconfig.json` base config | `@spire/tsconfig` | Shared across packages |
| `tailwind.config` theme/tokens | `@spire/tailwind-config` | Shared across packages |

### What Stays in the App

| Location | Why |
|---|---|
| `src/domain/*` | App-specific business logic |
| `src/app/*` | App-specific routes |
| `src/db/*` | App-specific database schema |
| `src/lib/session.ts` | App-specific auth |
| `src/lib/tempo/*` | App-specific chain client |
| `src/lib/wagmi.ts` | App-specific wallet config |
| `src/lib/posthog.ts` | App-specific analytics |
| `src/lib/constants.ts` | App-specific constants |
| `src/components/providers.tsx` | App-specific providers |

## 7. Vercel Deployment

### Configuration

- **Root Directory:** `apps/web`
- **Build Command:** `cd ../.. && turbo build --filter=@spire/web`
- **Install Command:** `bun install`
- **Framework:** Next.js (auto-detected)

### Smart Build Skipping

Vercel auto-detects workspace dependencies. If only `packages/ui` changes, only apps that depend on it rebuild. Requires:
- `"workspaces"` field in root `package.json`
- Unique `"name"` in each package
- Explicit `workspace:*` dependencies

### Environment Variables

Set per-project in Vercel dashboard:
- `DATABASE_URL` — Neon connection string
- `SESSION_SECRET` — HMAC signing key
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry client DSN
- `SENTRY_AUTH_TOKEN` — Sentry source maps (CI only)
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project key

## 8. CI Updates

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Lint, Type Check, Test, Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: turbo lint

      - name: Format check
        run: bun run format:check

      - name: Type check
        run: turbo typecheck

      - name: Tests
        run: turbo test

      - name: Build
        run: turbo build
        env:
          DATABASE_URL: postgresql://fake:fake@localhost:5432/fake
```

Turborepo caches results — if a package hasn't changed, its lint/test/build is skipped.

### Pre-commit Hook

```bash
# .husky/pre-commit
npx lint-staged
turbo typecheck
turbo test
```

## 9. Migration Steps

1. **Install Turborepo** — `bun add -d turbo`, create `turbo.json`
2. **Create `apps/web/`** — move current `src/`, `drizzle/`, `e2e/`, app configs
3. **Create `packages/ui/`** — move `src/components/ui/*`, add `package.json` with exports
4. **Create `packages/utils/`** — move `cn`, `truncateAddress`, `formatBalance`, `formatDate`
5. **Create `packages/tsconfig/`** — extract base/react/next configs
6. **Create `packages/eslint-config/`** — extract shared rules
7. **Create `packages/tailwind-config/`** — extract theme/tokens
8. **Update imports** — change `@/components/ui/button` → `@spire/ui`
9. **Update `next.config.ts`** — add `transpilePackages`
10. **Update root `package.json`** — add `workspaces`, workspace scripts
11. **Update CI** — use `turbo` commands
12. **Update Vercel** — set root directory to `apps/web`
13. **Verify** — all tests pass, build succeeds, deploy works

## 10. Out of Scope

| Item | Why | Future? |
|---|---|---|
| Storybook | Not needed until UI kit has multiple consumers | Yes — add when second app is built |
| Published packages | All packages are private/internal | Only if open-sourcing UI kit |
| Multiple apps | Only `web` for now | Yes — admin dashboard, marketing site |
| Changesets | No versioning needed for private packages | Only if publishing |
