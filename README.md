# Goldhord

Corporate treasury management on blockchain. Replace NetSuite and Oracle with instant, transparent stablecoin operations.

**[goldhord.xyz](https://goldhord.xyz)**

## What is Goldhord?

Large enterprises manage treasury across multiple business entities, countries, and bank accounts. Moving money between them is slow, expensive, and opaque. Traditional tools like NetSuite and Oracle help with visibility but don't solve the underlying banking friction.

Goldhord replaces this stack with stablecoin-based treasury management built on the [Tempo blockchain](https://tempo.xyz) (infrastructure built by Stripe). Each treasury account is a real on-chain wallet holding stablecoins — USDC, EURC, and more. Enterprises get:

- **Multiple accounts** per treasury, organized by entity, purpose, or currency
- **Instant transfers** between accounts — no wire delays, no intermediaries
- **Multi-currency** support with on-chain swaps (USDC <> EURC)
- **Full visibility** — every transaction is on-chain, auditable, real-time
- **Security by default** — blockchain guarantees, no custodial risk
- **Passkey authentication** — biometric sign-in, no seed phrases
- **Approval policies** — multi-signature, cold wallet (Ledger) integration

No banking license required. Trust is provided by the chain.

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | [Tempo](https://tempo.xyz) (L1 for stablecoin payments) |
| Frontend | Next.js 16, React 19, TypeScript |
| Database | Neon serverless Postgres, Drizzle ORM |
| Auth | WebAuthn passkeys (Tempo Account Keychain) |
| State | TanStack Query, Jotai |
| Styling | Tailwind CSS v4 |
| Monorepo | Bun workspaces, Turborepo |
| Linting | Biome |
| Testing | Vitest, Playwright |
| Deploy | Vercel |

## Getting Started

```bash
# Prerequisites: Bun (https://bun.sh), Node.js 22+

# Install dependencies
bun install

# Set up environment
cp apps/web/.env.example apps/web/.env.local
# Fill in DATABASE_URL and other values

# Start development
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
goldhord/
├── apps/web/              # Main Next.js application
├── packages/
│   ├── ui/                # Shared UI components
│   ├── utils/             # Shared utilities
│   └── tsconfig/          # Shared TypeScript configs
├── specs/                 # Product and technical specs
├── CLAUDE.md              # AI agent project instructions
├── AGENTS.md              # AI coding agent guidelines
├── biome.json             # Linting + formatting
└── turbo.json             # Build orchestration
```

## Development

```bash
bun run dev          # Start dev server
bun run test         # Run tests
bun run lint         # Lint (Biome)
bun run lint:fix     # Auto-fix issues
bun run typecheck    # TypeScript check
bun run build        # Production build
```

## Architecture

- **Domain-Driven Design** — business logic organized by feature domain
- **Server-first** — React Server Components by default
- **On-chain truth** — balances read directly from blockchain
- **Optimistic UI** — instant feedback with background chain confirmation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation.

## License

Proprietary. All rights reserved.
