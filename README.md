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

### Step-by-Step: Working with Agent Wallets

#### 1. Create an Agent Wallet (UI)

1. Go to the Agent Bank page (`/agents`)
2. Click **Create Agent Wallet**
3. Fill in: Label, Token (AlphaUSD), Spending limits, Allowed vendors
4. Click **Create** — deploys Guardian contract with allowlists in a single transaction
5. **Save the agent private key** — shown only once

#### 2. Check Guardian State

```typescript
import { createPublicClient, parseAbi, http } from 'viem';
import { tempoModerato } from 'viem/chains';

const GUARDIAN = '0x1a446DAe9D1343c51E9D1f7710C052deFDFc7187';
const TOKEN   = '0x20c0000000000000000000000000000000000001'; // AlphaUSD
const VENDOR  = '0x0000000000000000000000000000000000000002'; // Anthropic

const pub = createPublicClient({ chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });
const abi = parseAbi([
  'function allowedTokens(address) view returns (bool)',
  'function allowedRecipients(address) view returns (bool)',
  'function maxPerTx() view returns (uint256)',
  'function dailyLimit() view returns (uint256)',
  'function spendingCap() view returns (uint256)',
  'function spentToday() view returns (uint256)',
  'function totalSpent() view returns (uint256)',
]);
const tip20 = parseAbi(['function balanceOf(address) view returns (uint256)']);

const [tokenOk, vendorOk, balance, maxPerTx, dailyLimit, spentToday] = await Promise.all([
  pub.readContract({ address: GUARDIAN, abi, functionName: 'allowedTokens', args: [TOKEN] }),
  pub.readContract({ address: GUARDIAN, abi, functionName: 'allowedRecipients', args: [VENDOR] }),
  pub.readContract({ address: TOKEN, abi: tip20, functionName: 'balanceOf', args: [GUARDIAN] }),
  pub.readContract({ address: GUARDIAN, abi, functionName: 'maxPerTx' }),
  pub.readContract({ address: GUARDIAN, abi, functionName: 'dailyLimit' }),
  pub.readContract({ address: GUARDIAN, abi, functionName: 'spentToday' }),
]);
// AlphaUSD has 6 decimals — divide by 1e6 for dollar amounts
```

#### 3. Make a Payment (within limits)

```typescript
import { createWalletClient, parseAbi, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';

const agent = privateKeyToAccount('0x<agent-private-key>');
const wallet = createWalletClient({ account: agent, chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });

// Pay $1.00 (1_000_000 = 1 USD with 6 decimals)
const hash = await wallet.writeContract({
  address: GUARDIAN,
  abi: parseAbi(['function pay(address,address,uint256) external']),
  functionName: 'pay',
  args: [TOKEN, VENDOR, 1_000_000n],
});
// ✓ Succeeds if: amount <= maxPerTx AND spentToday + amount <= dailyLimit
```

#### 4. Charge Multiple Dollars (loop with auto-reject on over-limit)

```typescript
const abi = parseAbi([
  'function pay(address,address,uint256) external',
  'function proposePay(address,address,uint256) external returns (uint256,bool)',
]);

const TARGET = 10_000_000n; // $10
const PER_TX = 2_000_000n;  // $2 per payment (must be <= maxPerTx)
let paid = 0n;

while (paid < TARGET) {
  const amount = (TARGET - paid) < PER_TX ? (TARGET - paid) : PER_TX;
  try {
    // Try direct payment first
    const h = await wallet.writeContract({
      address: GUARDIAN, abi, functionName: 'pay', args: [TOKEN, VENDOR, amount],
    });
    await pub.waitForTransactionReceipt({ hash: h });
    paid += amount;
  } catch {
    // Over daily limit — proposePay records the rejected over-limit tx
    const h = await wallet.writeContract({
      address: GUARDIAN, abi, functionName: 'proposePay', args: [TOKEN, VENDOR, amount],
    });
    await pub.waitForTransactionReceipt({ hash: h });
    paid += amount;
  }
}
```

#### 5. Important: Agent Needs Fee Tokens

Agents need fee tokens at `0x20c0...0000` to pay Tempo gas:

```typescript
await fundedWallet.writeContract({
  address: '0x20c0000000000000000000000000000000000000',
  abi: parseAbi(['function transfer(address,uint256) returns (bool)']),
  functionName: 'transfer',
  args: [agentAddress, 50_000_000n],
});
```

#### 6. Key Addresses

| Item | Address |
|------|---------|
| AlphaUSD token | `0x20c0000000000000000000000000000000000001` |
| Anthropic (vendor) | `0x0000000000000000000000000000000000000002` |
| OpenAI (vendor) | `0x0000000000000000000000000000000000000001` |
| Guardian Factory v2 | `0xb9EB15e52d9D3d51353549e3d10Ce0602Ef803df` |
| Fee token (gas) | `0x20c0000000000000000000000000000000000000` |
| RPC | `https://rpc.moderato.tempo.xyz` |

#### 7. Spending Limits Explained

| Limit | Check | What happens when exceeded |
|-------|-------|---------------------------|
| **Per-tx cap** | `amount <= maxPerTx` | `pay()` reverts, use `proposePay()` |
| **Daily limit** | `spentToday + amount <= dailyLimit` | Resets every 24h |
| **Spending cap** | `totalSpent + amount <= spendingCap` | Lifetime limit, never resets |

### How We Use MPP — Complete Integration

Agent Bank is built on top of the [Machine Payments Protocol (MPP)](https://mpp.dev) by Stripe and Tempo. Here's exactly how the 402 payment flow works with our Guardian contracts:

#### The Standard MPP Flow (without Agent Bank)

```
Agent → fetch("https://vendor.com/api")
     ← 402 Payment Required
        WWW-Authenticate: Payment {amount: "1.00", currency: "0x20c0...", recipient: "0x..."}
     → Agent signs token.transfer(to, amount) directly
     → Retry with Authorization: Payment <credential>
     ← 200 OK + Payment-Receipt header
```

#### The Agent Bank Flow (with Guardian guardrails)

```
Agent → mppx.fetch("https://vendor.com/api")
     ← 402 Payment Required (same as standard MPP)
     → onChallenge() intercepts:
        │
        ├── Guardian.pay(token, to, amount)     ← on-chain, checks ALL rules
        │   ├── Is token in allowlist?          ✓ or revert
        │   ├── Is recipient in allowlist?      ✓ or revert
        │   ├── amount ≤ maxPerTx?              ✓ or revert
        │   ├── spentToday + amount ≤ daily?    ✓ or revert
        │   └── totalSpent + amount ≤ cap?      ✓ or revert
        │
        ├── If ALL pass → token.transfer(to, amount)
        │   └── Transfer event emitted by TOKEN contract
        │
        ├── If over limits → proposePay() creates on-chain proposal
        │   └── Owner approves/rejects from dashboard
        │
        └── Build credential: { hash: txHash, type: "hash" }
     → Retry with Authorization: Payment <credential>
     ← Server verifies Transfer event (token ✓, recipient ✓, amount ✓)
     ← 200 OK — vendor doesn't know Guardian exists
```

#### Why This Works (The Key Insight)

The MPP server verification in `mppx/server` checks **only 3 fields** from the on-chain Transfer event:

```typescript
// From tempo-mppx/src/tempo/server/Charge.ts (lines 164-169)
const match = [...transferLogs, ...memoLogs].find(
  (log) =>
    isAddressEqual(log.address, currency) &&   // ✓ token contract
    isAddressEqual(log.args.to, recipient) &&   // ✓ recipient
    log.args.amount.toString() === amount,       // ✓ amount
)
```

It does **NOT** check:
- `log.args.from` — who sent the tokens (Guardian contract, not agent EOA)
- `tx.from` — who submitted the transaction (agent EOA)
- `credential.source` — the optional DID field

This means the Guardian contract can call `token.transfer(to, amount)` on behalf of the agent, and the MPP server accepts it — because the Transfer event is emitted by the token contract, not the caller. **The Guardian is invisible to the payment protocol.**

#### Code: The `onChallenge` Integration

```typescript
// apps/web/src/domain/agents/utils/create-guarded-mppx.ts

import { Credential } from "mppx";
import { Mppx, tempo } from "mppx/client";

export function createGuardedMppx({ agentKey, guardianAddress }) {
  const account = privateKeyToAccount(agentKey);
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });

  return Mppx.create({
    methods: [tempo({ account, getClient: () => publicClient })],

    // THIS IS THE KEY PART — intercepts every 402 payment challenge
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

      // Standard MPP push-mode credential
      return Credential.serialize(
        Credential.from({
          challenge,
          payload: { hash, type: "hash" },
        }),
      );
    },
  });
}

// Usage — any fetch through this client is now guarded
const mppx = createGuardedMppx({ agentKey: "0x...", guardianAddress: "0x..." });
const res = await mppx.fetch("https://vendor.com/api", { method: "POST", body });
```

#### Code: Over-Limit Approval Flow

When `Guardian.pay()` would revert (over per-tx cap, daily limit, or spending cap), the agent uses `proposePay()` instead:

```typescript
// From apps/web/scripts/demo/demo.ts — Step 6

// Agent calls proposePay — if within limits, auto-executes
// If over limits, creates an on-chain proposal for owner approval
const hash = await agentWallet.writeContract({
  address: guardianAddress,
  abi: GuardianAbi,
  functionName: "proposePay",
  args: [token, recipient, amount],
});
// → Proposal #1 created on-chain (status: pending)

// Owner reviews and approves from the Goldhord dashboard
// → passkey authentication → approvePay(1) on-chain → payment executes
```

#### Files Where MPP Integration Lives

| File | Role |
|------|------|
| `apps/web/src/domain/agents/utils/create-guarded-mppx.ts` | Core utility — `onChallenge` routes payments through Guardian |
| `apps/web/src/domain/agents/hooks/use-deploy-guardian.ts` | Deploys Guardian via factory + configures allowlists |
| `apps/web/src/domain/agents/hooks/use-agent-actions.ts` | On-chain hooks: approvePay, rejectPay, topUp, withdraw |
| `apps/web/src/domain/agents/hooks/use-guardian-state.ts` | Reads proposals + spending state from chain |
| `contracts/src/SimpleGuardian.sol` | Guardian contract: pay, proposePay, approvePay, rejectPay |
| `contracts/src/GuardianFactory.sol` | CREATE2 factory for deploying Guardians |
| `tests/integration/Guardian.integration.test.ts` | 6 on-chain tests proving mppx + Guardian works |
| `apps/web/scripts/demo/demo.ts` | Full CLI demo with 6 steps |

#### Verified On-Chain (Real Transactions)

Every claim is backed by real on-chain transactions on Tempo Moderato testnet:

- **Guardian Factory:** [`0xb9EB15e52d9D3d51353549e3d10Ce0602Ef803df`](https://explore.moderato.tempo.xyz/address/0xb9EB15e52d9D3d51353549e3d10Ce0602Ef803df)
- **Example Guardian:** [`0x9CA7B94a0322f225e8e35cf87aA70FC515F4B049`](https://explore.moderato.tempo.xyz/address/0x9CA7B94a0322f225e8e35cf87aA70FC515F4B049)
- **MPP Payment through Guardian:** [`0x1386d720...`](https://explore.moderato.tempo.xyz/tx/0x1386d7206cbe6ed17592040e8ea5daa14d648acd6f37dc7056ab69c4c1a4beff) — $2.00 AlphaUSD via Guardian.pay()
- **Over-limit Proposal:** [`0x67009b69...`](https://explore.moderato.tempo.xyz/tx/0x67009b69f27526f95cecd198e968c2d8ce053fd426e835b96a8f2c55feaf7198) — $5.00 proposePay() creating on-chain approval

#### Zero mppx Modifications

We did **not** fork or modify the mppx SDK. The entire integration uses the standard `onChallenge` callback that mppx provides for custom payment handling. The Guardian contract is transparent to both the mppx client and the MPP server.

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

**Deployed on Moderato:** `0xb9EB15e52d9D3d51353549e3d10Ce0602Ef803df`

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
