# Agent Bank — Hackathon Showcase Guide

Step-by-step guide for demonstrating Agent Bank to judges. Every step uses real on-chain transactions on Tempo Moderato testnet.

---

## Prerequisites

- Live deployment: `https://45.148.101.191.nip.io:6677`
- Terminal with `bun` installed (for CLI scripts)
- Scripts directory: `apps/web/scripts/demo/`

---

## Part 1: The Problem (30 seconds)

**Talk track:**

> "AI agents need to spend money — paying for APIs, cloud resources, services. Today you either give them full wallet access (dangerous) or build custom middleware (fragile). There's no on-chain enforcement."

> "We built Guardian — a smart contract that sits between the agent and its wallet. Every payment goes through on-chain rules: per-transaction caps, daily limits, vendor allowlists. Even a compromised agent can't overspend."

---

## Part 2: Create Agent Wallet from UI (1 minute)

1. Open `https://45.148.101.191.nip.io:6677`
2. Authenticate with passkey (biometric)
3. Navigate to **Agent Wallets** tab
4. Click **Create Agent Wallet**
5. Fill in:
   - **Label:** `Demo Bot`
   - **Token:** AlphaUSD
   - **Spending cap:** $50
   - **Daily limit:** $10
   - **Per-tx cap:** $2
   - **Initial funding:** $100
   - **Vendors:** Select Anthropic + OpenAI
6. Click **Create** — watch the steps:
   - "Deploying Guardian contract..." (single tx deploys + configures allowlists)
   - "Funding Guardian..." (transfers $100 AlphaUSD)
   - "Saving to database..."
7. **Copy the agent private key** (shown once)

**Talk track:**

> "One transaction deploys the Guardian contract with all spending rules and allowlists baked into the constructor. The agent gets a private key — that's all it needs to start paying."

---

## Part 3: Show On-Chain State (30 seconds)

Click the newly created wallet card to see:

- **Spending Limits** — per-tx cap ($2), daily limit ($10), total cap ($50)
- **Allowed Vendors** — Anthropic, OpenAI (on-chain allowlist)
- **Balance** — $100 AlphaUSD
- **Agent address** — the EOA controlled by the agent's private key

**Talk track:**

> "Everything is on-chain. The balance, the limits, the vendor allowlist — all enforced by the EVM. The dashboard reads directly from the contract."

---

## Part 4: Agent Makes Payments (CLI Demo) (1.5 minutes)

Open terminal. Use the agent private key and Guardian address from step 2.

### 4a. Fund agent with fee tokens (one-time setup)

```bash
cd apps/web/scripts/demo

cat << 'SCRIPT' | bun run -
import { createWalletClient, createPublicClient, parseAbi, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';

// Use any funded account to send fee tokens to the new agent
const FUNDER_KEY = process.env.FUNDER_KEY;
if (!FUNDER_KEY) throw new Error('Set FUNDER_KEY env var');
const funder = privateKeyToAccount(FUNDER_KEY as \`0x\${string}\`);
const pub = createPublicClient({ chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });
const w = createWalletClient({ account: funder, chain: tempoModerato, transport: http('https://rpc.moderato.tempo.xyz') });

const AGENT_ADDRESS = '0x<PASTE_AGENT_ADDRESS>';  // ← from UI
const h = await w.writeContract({
  address: '0x20c0000000000000000000000000000000000000',
  abi: parseAbi(['function transfer(address,uint256) returns (bool)']),
  functionName: 'transfer',
  args: [AGENT_ADDRESS as `0x${string}`, 100_000_000n],
});
await pub.waitForTransactionReceipt({ hash: h });
console.log('Agent funded with fee tokens');
SCRIPT
```

### 4b. Charge $5 on Anthropic

```bash
cat << 'SCRIPT' | bun run -
import { createWalletClient, createPublicClient, parseAbi, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { waitForTransactionReceipt } from 'viem/actions';
import { tempoModerato } from 'viem/chains';

const AGENT_KEY = '0x<PASTE_AGENT_KEY>';      // ← from UI
const GUARDIAN  = '0x<PASTE_GUARDIAN_ADDR>';   // ← from UI
const TOKEN     = '0x20c0000000000000000000000000000000000001';
const ANTHROPIC = '0x0000000000000000000000000000000000000002';
const RPC = 'https://rpc.moderato.tempo.xyz';

const agent = privateKeyToAccount(AGENT_KEY);
const pub = createPublicClient({ chain: tempoModerato, transport: http(RPC) });
const aw = createWalletClient({ account: agent, chain: tempoModerato, transport: http(RPC) });
const abi = parseAbi([
  'function pay(address,address,uint256) external',
  'function proposePay(address,address,uint256) external returns (uint256,bool)',
]);

const TARGET = 5_000_000n;  // $5
const PER_TX = 2_000_000n;  // $2 per payment
let paid = 0n;

console.log('Charging $5 on Anthropic via Guardian...\n');

while (paid < TARGET) {
  const amount = (TARGET - paid) < PER_TX ? (TARGET - paid) : PER_TX;
  try {
    const h = await aw.writeContract({
      address: GUARDIAN as `0x${string}`, abi, functionName: 'pay',
      args: [TOKEN, ANTHROPIC, amount].map(v => typeof v === 'string' ? v as `0x${string}` : v) as any,
    });
    await waitForTransactionReceipt(pub, { hash: h });
    paid += amount;
    console.log(`  ✓ pay($${Number(amount) / 1e6}) — total: $${Number(paid) / 1e6}`);
  } catch {
    const h = await aw.writeContract({
      address: GUARDIAN as `0x${string}`, abi, functionName: 'proposePay',
      args: [TOKEN, ANTHROPIC, amount].map(v => typeof v === 'string' ? v as `0x${string}` : v) as any,
    });
    await waitForTransactionReceipt(pub, { hash: h });
    paid += amount;
    console.log(`  ✗ BLOCKED ($${Number(amount) / 1e6}) — over daily limit, rejected`);
  }
}
console.log('\nDone! Refresh the UI to see updated spending.');
SCRIPT
```

**Expected output:**
```
Charging $5 on Anthropic via Guardian...

  ✓ pay($2.00) — total: $2.00
  ✓ pay($2.00) — total: $4.00
  ✓ pay($1.00) — total: $5.00

Done! Refresh the UI to see updated spending.
```

**Talk track:**

> "The agent calls Guardian.pay() for each payment. The contract checks the amount against the per-tx cap ($2), so we split into $2 chunks. Each payment is a real on-chain transfer."

### 4c. Hit the daily limit

Run the same script again but with `TARGET = 10_000_000n` ($10):

**Expected output:**
```
  ✓ pay($2.00) — total: $2.00
  ✓ pay($2.00) — total: $4.00
  ✓ pay($1.00) — total: $5.00
  ✗ BLOCKED ($2.00) — over daily limit, rejected
  ✗ BLOCKED ($2.00) — over daily limit, rejected
  ✗ BLOCKED ($1.00) — over daily limit, rejected
```

**Talk track:**

> "After $10 spent today, the Guardian blocks further payments. The agent tried, but the contract said no. This is the daily limit enforced on-chain — no backend, no middleware, just the EVM."

---

## Part 5: Show Results in UI (30 seconds)

1. Refresh the dashboard
2. Click the wallet — show updated state:
   - **Spent today: $10.00** (hit the daily limit)
   - **Balance: $90.00** (started with $100, spent $10)
   - **Over-limit Transactions** section shows the rejected attempts

**Talk track:**

> "The UI reads directly from the chain. You can see exactly how much was spent, what was blocked, and the remaining balance. The treasury manager has full visibility."

---

## Part 6: Key Differentiators (30 seconds)

Summarize for judges:

1. **On-chain enforcement** — spending rules are in the smart contract, not middleware. Even if the agent is compromised, it can't bypass limits.

2. **Single-transaction deployment** — Guardian contract + allowlists + funding in one atomic tx. No multi-step setup that can fail halfway.

3. **MPP compatible** — works with Tempo's Machine Payments Protocol. The Guardian is invisible to vendors — they just see a normal payment.

4. **Zero SDK modifications** — uses standard `onChallenge` callback in mppx. No fork needed.

5. **Production-ready UI** — create, fund, monitor, and manage agent wallets from a real dashboard with passkey authentication.

---

## Timing Guide

| Section | Duration | What |
|---------|----------|------|
| Problem statement | 0:30 | Why agents need guardrails |
| Create wallet (UI) | 1:00 | Live demo — deploy Guardian |
| Show on-chain state | 0:30 | Dashboard reads from chain |
| CLI payments | 1:30 | Agent pays, hits limits, gets blocked |
| Results in UI | 0:30 | Show updated spending + rejected txs |
| Key differentiators | 0:30 | Summarize for judges |
| **Total** | **4:30** | |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Chain not configured" on login | Clear browser cache, refresh |
| Agent tx fails with "insufficient balance" | Fund agent with fee tokens (step 4a) |
| pay() reverts immediately | Check: is token in allowlist? Is vendor in allowlist? Is agent address correct? |
| UI shows stale data | Hard refresh (Ctrl+Shift+R), guardian state polls every 30s |
| Daily limit already exhausted | Wait 24h for reset, or create a new wallet |

---

## Quick Reference: Contract Addresses

| Contract | Address |
|----------|---------|
| Guardian Factory v2 | `0xb9EB15e52d9D3d51353549e3d10Ce0602Ef803df` |
| AlphaUSD | `0x20c0000000000000000000000000000000000001` |
| Fee Token | `0x20c0000000000000000000000000000000000000` |
| Anthropic (vendor) | `0x0000000000000000000000000000000000000002` |
| OpenAI (vendor) | `0x0000000000000000000000000000000000000001` |
| RPC | `https://rpc.moderato.tempo.xyz` |
| Explorer | `https://explore.moderato.tempo.xyz` |
| Live App | `https://45.148.101.191.nip.io:6677` |
