# Agent Bank — Hackathon Demo Script

> **Duration:** 3 minutes
> **Server:** https://45.148.101.191.nip.io:6677
> **Explorer:** https://explore.moderato.tempo.xyz
> **CLI:** `cd tempo-mppx && npx tsx demo.ts`

---

## Option A: CLI Demo (30 seconds, technical judges)

Just run:

```bash
cd /root/work/spire/tempo-mppx && npx tsx demo.ts
```

Deploys a fresh Guardian, makes a real payment, shows rejection cases. All on-chain with explorer links. No setup needed.

---

## Option B: Full Live Demo (3 minutes, mixed audience)

### 0:00–0:15 — Problem Statement

> "AI agents need to make payments — for compute, for APIs, for inference. But giving an agent unrestricted access to a wallet is dangerous. If the agent is compromised, your funds are gone. Application-level limits can be bypassed. SDK-level checks can be patched around. We need enforcement at the only layer that can't be hacked — the blockchain itself."

### 0:15–0:30 — Solution Overview

> "Agent Bank creates Guardian smart contracts — on-chain wallets with spending guardrails. Per-transaction caps, daily limits, vendor allowlists — all enforced by the EVM. The agent's key can only spend within the rules you set. Works with any MPP service — no vendor-side changes needed."

### 0:30–1:00 — Show the Dashboard

1. Open `https://45.148.101.191.nip.io:6677/agents`
2. Point out the Marketing Bot card:
   - Green "active" badge
   - $2.00 per-tx cap, $10.00 daily limit, $50.00 lifetime cap
   - Vendor tags: OpenAI, Anthropic, Stability AI, fal.ai, Perplexity
   - Spending progress bar
   - Guardian balance
3. Click into the detail page — show full configuration

### 1:00–1:15 — Show Key Management

1. Click "Reveal Key"
2. Show masked key → "Show full key" → full hex visible
3. "Copy" → toast confirms
4. Close dialog

> "The key is encrypted with AES-256-GCM in our database. You can reveal it anytime with your passkey."

### 1:15–1:30 — Show Fund Management

1. Point out "Top Up" button — "Treasury manager can add more funds anytime"
2. Point out "Emergency Withdraw" button — "One click to pull everything back"
3. Show "Edit" on limits — "Limits are updated on-chain, not just in the database"
4. Show "Add" vendor — "Vendor allowlist is also on-chain"

### 1:30–2:15 — CLI Demo (The Money Shot)

Switch to terminal:

```bash
cd /root/work/spire/tempo-mppx && npx tsx demo.ts
```

**Narrate as it runs:**

- **Step 1:** "Deploying a Guardian contract on Tempo with our spending rules..."
- **Step 2:** "Funding it with $10 pathUSD..."
- **Step 3:** "Agent makes a payment through MPP — the 402 challenge is intercepted, routed through Guardian.pay(), Guardian checks all rules, approves, and the vendor gets paid."
- **Step 4:** "Now the agent tries to pay a vendor NOT in the allowlist — Guardian reverts on-chain: 'Recipient not allowed'. The transaction never goes through."
- **Step 5:** "Agent tries a $5 payment with a $2 cap — Guardian reverts: 'Exceeds per-tx limit'. All enforced at the EVM level."

### 2:15–2:30 — Verify On-Chain

1. Click one of the explorer links from the CLI output
2. Show the real transaction on `explore.moderato.tempo.xyz`
3. Show the Transfer event in the receipt

> "This is a real transaction on Tempo Moderato testnet. Not a mock. Not a simulation."

### 2:30–2:45 — Technical Highlight

> "The key insight: mppx's server-side verification only checks three fields in the Transfer event — token address, recipient, and amount. It does NOT check who sent the transfer. So the Guardian contract can call token.transfer() on behalf of the agent, and the MPP server accepts it. Zero changes to the mppx SDK. Zero changes on the vendor side. The Guardian is invisible to the payment protocol."

### 2:45–3:00 — Closing

> "Agent Bank — on-chain guardrails for the agentic economy. Per-transaction caps. Daily limits. Vendor allowlists. Lifetime spending caps. All enforced by smart contracts, not application code. Even a compromised agent key can only spend within the Guardian's rules."

---

## Pre-Demo Checklist

- [ ] Server running: `pm2 status` shows goldhord online
- [ ] Open browser to `https://45.148.101.191.nip.io:6677/agents`
- [ ] Marketing Bot wallet visible with correct data
- [ ] Terminal ready in `tempo-mppx/` directory
- [ ] `npx tsx demo.ts` tested once before going live (warm up the faucet)
- [ ] Explorer tab open: `https://explore.moderato.tempo.xyz`
- [ ] Backup: have a screen recording of the CLI demo in case network is slow

## Backup Plan

If live demo fails (testnet down, network issues):

1. Show the Playwright E2E test screenshot at `/tmp/agents-final.png`
2. Show the forge test results: `cd tempo-multisig/contracts && ~/.foundry/bin/forge test -v --match-contract GuardianFactoryTest`
3. Show the Guardian integration test: `cd tempo-mppx && VITE_NODE_ENV=testnet VITE_RPC_URL=https://rpc.moderato.tempo.xyz npx vitest run src/tempo/server/Guardian.integration.test.ts --project node`

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Smart contracts | SimpleGuardian.sol + GuardianFactory.sol |
| On-chain rules | Per-tx cap, daily limit, lifetime cap, vendor allowlist, token allowlist |
| Tests | 717 total (447 unit + 238 forge + 6 integration + 26 E2E) |
| Lines of code | ~3,000 (28 new files in Goldhord + 2 Solidity contracts) |
| GuardianFactory | `0xeffb75d8e4e4622c523bd0b4f2b3ca9e3954b131` on Moderato |
| mppx modifications | Zero — works via standard `onChallenge` callback |
| Key discovery | Server verification checks only (token, recipient, amount) — ignores `from` field |

---

## One-Liner Pitch

> "We built a smart contract layer between AI agents and their wallets that enforces spending rules on-chain — so even a compromised agent can't overspend."
