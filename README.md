<p align="center">
  <img src=".github/logo.png" width="300" alt="Goldhord" />
  <br /><br />
  <strong>Wallets for your AI agents. Secure, simple, controllable.</strong>
</p>

<p align="center">
  <a href="https://github.com/suverenum/spire/actions/workflows/ci.yml"><img src="https://github.com/suverenum/spire/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://goldhord.xyz">goldhord.xyz</a> (mainnet) · <a href="https://goldhord.dev">goldhord.dev</a> (testnet)
</p>

---

Many people use OpenAI, Claude, and other AI agents today. They have wallets and bank accounts — but their agents don't.

Goldhord gives every agent its own on-chain wallet so you stay in control of what they spend, where, and how much.

## Key Features

- **Per-agent wallets** — each agent gets its own on-chain wallet, funded with stablecoins
- **On-chain policies** — set spending limits, approved vendors, and usage rules enforced by the chain
- **Approval thresholds** — transactions above a set amount require human approval before execution

<!-- Add screenshot or GIF here: -->
<!-- ![Goldhord dashboard](docs/screenshot.png) -->

## Quick Start

```bash
# Prerequisites: Bun (https://bun.sh), Node.js 22+

bun install
cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL etc.
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | [Tempo](https://tempo.xyz) (L1 for stablecoin payments, built by Stripe) |
| Frontend | Next.js 16, React 19, TypeScript |
| Database | Neon serverless Postgres, Drizzle ORM |
| Auth | WebAuthn passkeys (Tempo Account Keychain) |
| State | TanStack Query |
| Styling | Tailwind CSS v4 |
| Monorepo | Bun workspaces, Turborepo |
| Linting | Biome |
| Testing | Vitest, Playwright |
| Deploy | Vercel |

## Project Structure

```
goldhord/
├── apps/web/              # Main Next.js application
├── packages/
│   ├── ui/                # Shared UI components
│   ├── utils/             # Shared utilities
│   └── tsconfig/          # Shared TypeScript configs
├── specs/                 # Product and technical specs
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

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](./LICENSE) — Copyright (c) 2026 Ilya Vorobyev, Dmitry Polishuk
