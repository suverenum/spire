# Goldhord

Corporate treasury management on blockchain. Replace NetSuite and Oracle with instant, transparent stablecoin operations.

**[goldhord.xyz](https://goldhord.xyz)**

---

## Agent Bank — On-Chain Guardrails for AI Agents

**New:** Agent Bank adds Guardian smart contracts that enforce spending rules for AI agents — per-transaction caps, daily limits, vendor allowlists, and lifetime spending caps — all enforced on-chain by the EVM. Works with any [MPP](https://mpp.dev) (Machine Payments Protocol) service. Zero changes to the mppx SDK.

> "We built a smart contract layer between AI agents and their wallets that enforces spending rules on-chain — so even a compromised agent can't overspend."

### Key Features

- **Guardian Contracts** — deploy per-agent wallets with spending rules enforced on-chain
- **Per-tx cap, daily limit, lifetime cap** — all checked in `Guardian.pay()` before every transfer
- **Vendor allowlist** — agent can only pay approved recipients
- **Encrypted key storage** — AES-256-GCM, reveal via passkey re-auth
- **MPP compatible** — uses standard `onChallenge` callback, invisible to vendors
- **Full management UI** — create, fund, configure, monitor, revoke from the dashboard

### Architecture

```
Treasury Manager (Goldhord UI)
    │
    ├── Create Agent Wallet → deploys Guardian contract via GuardianFactory
    ├── Configure Rules → addRecipient, addToken, updateLimits (on-chain)
    ├── Fund Guardian → transfer stablecoins to contract
    └── Monitor Spending → progress bar, balance, tx history

AI Agent (mppx SDK)
    │
    ├── Request vendor service → HTTP request
    ├── Receive 402 challenge → payment required
    ├── onChallenge → calls Guardian.pay() instead of direct transfer
    ├── Guardian checks rules → per-tx, daily, lifetime, vendor, token
    └── If approved → token.transfer() → vendor gets paid
```

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Node.js 22+
- PostgreSQL (local or Neon)
- [Foundry](https://book.getfoundry.sh/) (for contract compilation)

### 1. Clone & Install

```bash
git clone git@github.com:suverenum/spire.git
cd spire
bun install
```

### 2. Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
DATABASE_URL=postgresql://postgres:testpass@localhost:5432/goldhord
SESSION_SECRET=<generate-a-random-64-hex-string>
NEXT_PUBLIC_TEMPO_NETWORK=testnet
```

### 3. Database Setup

```bash
cd apps/web

# Create database
createdb goldhord

# Run migrations
bun run db:migrate

# Or manually create tables if migrations fail:
psql -d goldhord -f drizzle/0007_magenta_unus.sql
```

### 4. Development

```bash
bun run dev          # Start dev server (Turbopack)
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run Tests

```bash
bun run test         # 447 unit tests (Vitest)
bun run typecheck    # TypeScript check
bun run build        # Production build

# Forge contract tests (requires Foundry)
cd tempo-multisig/contracts && ~/.foundry/bin/forge test   # 238 tests

# On-chain integration tests (hits Moderato testnet)
cd tempo-mppx
VITE_NODE_ENV=testnet VITE_RPC_URL=https://rpc.moderato.tempo.xyz \
  npx vitest run src/tempo/server/Guardian.integration.test.ts --project node   # 6 tests

# E2E tests (requires Postgres + Playwright)
cd apps/web && bun run test:e2e   # 26 tests
```

---

## Production Deployment

### Build & Deploy with PM2

```bash
cd apps/web

# Build for production
NEXT_PUBLIC_TEMPO_NETWORK=testnet bun run build

# Create PM2 config (ecosystem.config.cjs)
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'goldhord',
    script: 'node_modules/.bin/next',
    args: 'start -p 11000',
    cwd: '/root/work/spire/apps/web',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_TEMPO_NETWORK: 'testnet',
      DATABASE_URL: 'postgresql://postgres:testpass@localhost:5432/goldhord',
      SESSION_SECRET: '<your-secret>',
    },
    max_memory_restart: '512M',
    autorestart: true,
  }]
};
EOF

# Start
pm2 start ecosystem.config.cjs
```

### HTTPS with Caddy (required for WebAuthn passkeys)

```bash
# Install Caddy
apt install caddy

# Configure reverse proxy with auto-SSL
cat > /etc/caddy/Caddyfile << 'EOF'
{
    https_port 6677
}

your-domain.com:6677 {
    reverse_proxy localhost:11000
}
EOF

# Or with .nip.io for IP-based SSL:
# 45.148.101.191.nip.io:6677 {
#     reverse_proxy localhost:11000
# }

systemctl reload caddy
```

Access at `https://your-domain.com:6677`

### Deploy Commands (after code changes)

```bash
cd apps/web
NEXT_PUBLIC_TEMPO_NETWORK=testnet bun run build
pm2 restart goldhord
```

---

## Network Configuration

The app supports testnet and mainnet via a single environment variable:

```env
NEXT_PUBLIC_TEMPO_NETWORK=testnet   # Tempo Moderato testnet (default)
NEXT_PUBLIC_TEMPO_NETWORK=mainnet   # Tempo mainnet (when ready)
```

All chain-specific values (RPC URLs, chain IDs, token addresses, contract addresses, explorer URLs) are derived from `src/lib/network-config.ts`.

| Setting | Testnet (Moderato) | Mainnet |
|---------|-------------------|---------|
| RPC | `rpc.moderato.tempo.xyz` | `rpc.tempo.xyz` |
| Chain ID | 42431 | 4217 |
| Explorer | `explore.moderato.tempo.xyz` | `explore.mainnet.tempo.xyz` |
| Tokens | AlphaUSD, BetaUSD, pathUSD, ThetaUSD | USDC |
| GuardianFactory | `0xeffb75d8...` | TBD (deploy separately) |
| Faucet | Available | N/A |

---

## Smart Contracts

### SimpleGuardian.sol

On-chain spending guardrails for AI agents.

| Function | Access | Description |
|----------|--------|-------------|
| `pay(token, to, amount)` | Agent only | Execute payment (checks all rules) |
| `addRecipient(addr)` | Owner only | Add vendor to allowlist |
| `removeRecipient(addr)` | Owner only | Remove vendor from allowlist |
| `addToken(addr)` | Owner only | Add token to allowlist |
| `removeToken(addr)` | Owner only | Remove token from allowlist |
| `updateLimits(maxPerTx, dailyLimit)` | Owner only | Update spending limits |
| `withdraw(token)` | Owner only | Emergency withdraw all funds |

**On-chain checks in `pay()`:**
1. `msg.sender == agent` — only the agent EOA can call
2. `allowedTokens[token]` — token must be whitelisted
3. `allowedRecipients[to]` — vendor must be whitelisted
4. `amount <= maxPerTx` — per-transaction cap
5. `spentToday + amount <= dailyLimit` — daily limit (resets each day)
6. `totalSpent + amount <= spendingCap` — lifetime cap (0 = unlimited)

### GuardianFactory.sol

Deploys Guardian instances via CREATE2 for deterministic addresses.

**Deployed on Moderato:** `0xeffb75d8e4e4622c523bd0b4f2b3ca9e3954b131`

### Compile Contracts

```bash
cd tempo-multisig/contracts
~/.foundry/bin/forge build
~/.foundry/bin/forge test   # 238 tests
```

---

## Demo

### CLI Demo (30 seconds)

```bash
cd tempo-mppx && npx tsx demo.ts
```

Deploys a fresh Guardian on Moderato testnet, makes a real MPP payment, then demonstrates vendor blocking and limit enforcement — all with explorer links.

### Demo Scripts

Located in `apps/web/scripts/demo/`:

| Script | Purpose | Command |
|--------|---------|---------|
| `demo.ts` | Full hackathon demo (deploy + pay + reject) | `cd tempo-mppx && npx tsx demo.ts` |
| `verify-wallet.ts` | Verify an existing wallet's on-chain state | `cd tempo-mppx && npx tsx verify-wallet.ts` |
| `fund-guardian.ts` | Transfer pathUSD to a Guardian contract | `cd tempo-mppx && npx tsx fund-guardian.ts` |

> **Note:** Scripts must run from the `tempo-mppx/` directory (mppx dependency).

### Demo Script (detailed walkthrough)

See [specs/mpp-integration/demo-script.md](./specs/mpp-integration/demo-script.md) for the full 3-minute hackathon demo script with narration.

---

## Project Structure

```
spire/
├── apps/web/                      # Main Next.js application
│   ├── src/
│   │   ├── app/                   # Routes (agents/, dashboard/, accounts/, etc.)
│   │   ├── domain/
│   │   │   ├── agents/            # Agent Bank feature
│   │   │   │   ├── actions/       # Server actions (create, reveal, revoke, limits, vendors)
│   │   │   │   ├── components/    # UI (wallet card, create dialog, reveal dialog, landing, demo)
│   │   │   │   ├── hooks/         # Deploy guardian, agent wallets, agent actions, guardian state
│   │   │   │   ├── queries/       # DB reads
│   │   │   │   └── utils/         # createGuardedMppx, code snippet
│   │   │   ├── auth/              # Passkey authentication
│   │   │   ├── payments/          # Send, receive, transaction history
│   │   │   ├── treasury/          # Treasury CRUD
│   │   │   ├── accounts/          # Multi-account management
│   │   │   ├── multisig/          # Multi-sig with approval policies
│   │   │   └── swap/              # Token swaps
│   │   ├── lib/
│   │   │   ├── network-config.ts  # Testnet/mainnet config (single source of truth)
│   │   │   ├── constants.ts       # Derived from network config
│   │   │   ├── crypto.ts          # AES-256-GCM encrypt/decrypt
│   │   │   ├── vendors.ts         # Vendor registry (OpenAI, Anthropic, etc.)
│   │   │   ├── session.ts         # HMAC cookie sessions
│   │   │   └── wagmi.ts           # Wallet config (passkey + fee sponsor)
│   │   └── db/
│   │       └── schema.ts          # Drizzle schema (treasuries, accounts, agent_wallets, multisig)
│   ├── scripts/demo/              # Demo scripts
│   ├── e2e/                       # Playwright E2E tests (26 tests)
│   └── drizzle/                   # SQL migrations
├── packages/
│   ├── ui/                        # Shared UI components
│   ├── utils/                     # Shared utilities
│   └── tsconfig/                  # TypeScript configs
├── specs/
│   └── mpp-integration/
│       ├── prd-agents-bank-tempo.md  # Product requirements
│       ├── test-plan-agent-bank.md   # Manual test plan (44 cases)
│       └── demo-script.md           # Hackathon demo script
├── tempo-multisig/                # Smart contracts (gitignored, cloned separately)
│   └── contracts/src/
│       ├── SimpleGuardian.sol
│       └── GuardianFactory.sol
└── tempo-mppx/                    # mppx SDK (gitignored, cloned separately)
```

## Key Technical Insight

The MPP server's push-mode verification checks **only 3 fields** in the Transfer event:
- `log.address` — token contract (must match `currency`)
- `log.args.to` — recipient (must match `recipient`)
- `log.args.amount` — amount (must match `amount`)

It does **NOT** check `log.args.from` (the sender) or `tx.from` (the transaction submitter). This means a Guardian contract can call `token.transfer(to, amount)` on behalf of the agent, and the MPP server accepts the resulting Transfer event — because it's emitted by the token contract, not the caller.

This is why Agent Bank works with **zero modifications** to the mppx SDK.

---

## Test Coverage

| Suite | Tests | Command |
|-------|-------|---------|
| Unit (Vitest) | 447 | `bun run test` |
| Forge contracts | 238 | `cd tempo-multisig/contracts && forge test` |
| On-chain integration | 6 | `cd tempo-mppx && vitest run Guardian.integration.test.ts` |
| E2E (Playwright) | 26 | `cd apps/web && bun run test:e2e` |
| **Total** | **717** | |

---

## What is Goldhord?

Large enterprises manage treasury across multiple business entities, countries, and bank accounts. Moving money between them is slow, expensive, and opaque. Traditional tools like NetSuite and Oracle help with visibility but don't solve the underlying banking friction.

Goldhord replaces this stack with stablecoin-based treasury management built on the [Tempo blockchain](https://tempo.xyz) (infrastructure built by Stripe). Each treasury account is a real on-chain wallet holding stablecoins — USDC, EURC, and more. Enterprises get:

- **Multiple accounts** per treasury, organized by entity, purpose, or currency
- **Instant transfers** between accounts — no wire delays, no intermediaries
- **Multi-currency** support with on-chain swaps (USDC ↔ EURC)
- **Full visibility** — every transaction is on-chain, auditable, real-time
- **Security by default** — blockchain guarantees, no custodial risk
- **Passkey authentication** — biometric sign-in, no seed phrases
- **Approval policies** — multi-signature with configurable threshold tiers
- **Agent Bank** — on-chain spending guardrails for AI agents

No banking license required. Trust is provided by the chain.

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | [Tempo](https://tempo.xyz) (L1 for stablecoin payments) |
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
| Testing | Vitest, Playwright, Forge |
| Deploy | PM2 + Caddy (self-hosted) or Vercel |

## License

Proprietary. All rights reserved.
