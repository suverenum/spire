<p align="center">
  <img src=".github/logo.png" width="300" alt="Goldhord" />
  <br /><br />
  <strong>Home for your AI agent wallets</strong>
</p>

<p align="center">
  <a href="https://github.com/suverenum/spire/actions/workflows/ci.yml"><img src="https://github.com/suverenum/spire/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://goldhord.xyz">goldhord.xyz</a> (Tempo mainnet) · <a href="https://goldhord.dev">goldhord.dev</a> (Tempo testnet)
</p>

---

## What is Goldhord?

Many people use OpenAI, Claude, and other AI agents today. They have wallets and bank accounts — but their agents don't. Goldhord gives every agent its own on-chain wallet so you stay in control of what they spend, where, and how much.

## Key Features

- **Per-agent wallets** — each agent gets its own on-chain wallet, funded with stablecoins
- **On-chain spending policies** — per-transaction caps, daily limits, and lifetime spending caps enforced by smart contracts
- **Approval thresholds** — transactions above a set amount require human approval before execution
- **MPP compatible** — works with any [Machine Payments Protocol](https://mpp.dev) service, zero SDK modifications
- **Passkey authentication** — biometric sign-in, no seed phrases

## How It Works

Goldhord deploys a **Guardian** smart contract for each agent wallet. When an agent makes a payment via MPP, the Guardian checks all spending rules on-chain before executing the transfer.

```
Treasury Manager (Goldhord UI)
    │
    ├── Create Agent Wallet → deploys Guardian contract
    ├── Set Spending Limits → per-tx cap, daily limit, lifetime cap
    ├── Fund Guardian → transfer stablecoins to contract
    └── Monitor Spending → progress bar, balance, tx history

AI Agent (mppx SDK)
    │
    ├── Request vendor service → HTTP request
    ├── Receive 402 challenge → payment required
    ├── onChallenge → calls Guardian.pay() instead of direct transfer
    ├── Guardian checks rules → per-tx, daily, lifetime caps
    └── If approved → token.transfer() → vendor gets paid
```

All MPP services route payments through a single escrow address, so the Guardian automatically allowlists it during deployment. The Guardian is invisible to the payment protocol — vendors don't know it exists.

## Using with MPP

To route MPP payments through a Guardian, use the `onChallenge` callback:

```typescript
import { Mppx, tempo } from "mppx/client";

const mppx = Mppx.create({
  methods: [tempo({ account, getClient: () => publicClient })],

  async onChallenge(challenge) {
    const { amount, currency, recipient } = challenge.request;

    // Route through Guardian instead of direct transfer
    const hash = await walletClient.writeContract({
      address: guardianAddress,
      abi: parseAbi(["function pay(address,address,uint256) external"]),
      functionName: "pay",
      args: [currency, recipient, BigInt(amount)],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return Credential.serialize(
      Credential.from({ challenge, payload: { hash, type: "hash" } }),
    );
  },
});

// All fetches through this client are now guarded
const res = await mppx.fetch("https://openai.mpp.tempo.xyz/v1/chat/completions", {
  method: "POST",
  body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "Hello" }] }),
});
```

This works because the MPP server verifies only the Transfer event fields (token, recipient, amount) — not who initiated the transfer. The Guardian calls `token.transfer()` on the agent's behalf, and the resulting event is accepted by the MPP server.

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | [Tempo](https://tempo.xyz) (L1 for stablecoin payments, built by Stripe) |
| Payments | [MPP](https://mpp.dev) (Machine Payments Protocol by Stripe + Tempo) |
| Frontend | Next.js 16, React 19, TypeScript |
| Database | Neon serverless Postgres, Drizzle ORM |
| Auth | WebAuthn passkeys (Tempo Account Keychain) |
| Wallet | Wagmi + Viem with Tempo support |
| State | TanStack Query |
| Styling | Tailwind CSS v4 |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Monorepo | Bun workspaces, Turborepo |
| Linting | Biome |
| Deploy | Vercel |

## Quick Start

```bash
# Prerequisites: Bun (https://bun.sh), Node.js 22+

bun install
cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL etc.
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

```bash
bun run dev          # Start dev server
bun run test         # Run tests
bun run lint         # Lint (Biome)
bun run lint:fix     # Auto-fix issues
bun run typecheck    # TypeScript check
bun run build        # Production build
```

## Project Structure

```
spire/
├── apps/web/              # Main Next.js application
│   ├── src/
│   │   ├── app/           # Next.js routes (thin orchestration)
│   │   ├── domain/        # Business logic by feature (DDD)
│   │   │   ├── agents/    # Agent wallets (Guardian deploy, spending, keys)
│   │   │   ├── auth/      # Passkey authentication
│   │   │   ├── payments/  # Send, receive, transaction history
│   │   │   ├── accounts/  # Multi-account management
│   │   │   └── swap/      # Token swaps via Tempo DEX
│   │   ├── db/            # Drizzle schema + migrations
│   │   └── lib/           # Constants, crypto, session, wagmi
│   └── e2e/               # Playwright E2E tests
├── contracts/             # Guardian smart contracts (Solidity)
├── packages/
│   ├── ui/                # Shared UI components
│   ├── utils/             # Shared utilities
│   └── tsconfig/          # Shared TypeScript configs
└── specs/                 # Product and technical specs
```

## License

[MIT](./LICENSE) — Copyright (c) 2026 Ilya Vorobyev, Dmitry Polishuk
