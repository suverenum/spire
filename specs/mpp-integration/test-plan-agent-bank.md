# Agent Bank — Manual Test Plan

> **Network:** Tempo Moderato Testnet
> **Explorer:** https://explore.moderato.tempo.xyz
> **Server:** localhost:3000 (PM2 managed)

---

## 1. Authentication & Navigation

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Login with passkey | Open `/`, click "Unlock with Passkey" | Redirects to `/dashboard` |
| 1.2 | Sidebar shows Agent Wallets | After login, check sidebar | "Agent Wallets" with Bot icon visible between Accounts and Settings |
| 1.3 | Navigate to agents | Click "Agent Wallets" in sidebar | URL changes to `/agents`, page loads |
| 1.4 | Session timeout | Wait 15 min idle | Auto-redirects to `/` |

---

## 2. Agent Wallets Page (Empty State)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Empty state | Visit `/agents` with no wallets | Shows "No agent wallets yet" with Bot icon and CTA |
| 2.2 | Create button | Check top-right | "Create Agent Wallet" button visible |

---

## 3. Create Agent Wallet

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Open dialog | Click "Create Agent Wallet" | Sheet slides up with form |
| 3.2 | Form fields | Check form | Label, Token dropdown, Spending cap/Daily limit/Per-tx cap inputs, Funding amount, Vendor pills |
| 3.3 | Vendor selection | Click "OpenAI" pill | Pill turns blue (selected). Click again → deselects |
| 3.4 | Select multiple vendors | Click OpenAI + Stability AI | Both blue |
| 3.5 | Submit empty label | Leave label blank, click Create | Toast error: "Enter a label" |
| 3.6 | Submit no vendors | Fill label, select no vendors | Toast error: "Select at least one vendor" |
| 3.7 | **Happy path creation** | Fill: label="Marketing Bot", cap=$50, daily=$10, per-tx=$2, funding=$5, select OpenAI+Anthropic. Click Create | Progress steps shown (Validating → Deploying → Configuring → Funding → Saving). Passkey prompt for on-chain txs. |
| 3.8 | Key shown once | After creation succeeds | Yellow box with private key, "Save this key now" warning, Copy button |
| 3.9 | Copy key | Click "Copy Key" | Toast: "Key copied!", key in clipboard |
| 3.10 | Close dialog | Click "Done" | Dialog closes, new wallet card appears in grid |

---

## 4. Agent Wallet Card

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Card displays | Check the new card | Shows: label, guardian address (truncated), "active" green badge |
| 4.2 | Spending limits | Check card | Per-tx cap: $2.00, Daily limit: $10.00, Total cap: $50.00 |
| 4.3 | Spending progress | If on-chain state loads | Blue progress bar: "$0.00 / $10.00" daily spending, Balance: "$5.00" |
| 4.4 | Vendor tags | Check card | Shows "OpenAI", "Anthropic" pills |
| 4.5 | Action buttons | Check card bottom | "Reveal Key" and "Revoke" buttons visible |

---

## 5. Agent Wallet Detail Page

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Navigate to detail | Click on wallet card or go to `/agents/[id]` | Full detail page with header, limits, vendors, agent info |
| 5.2 | Spending limits section | Check | Per-tx cap, Daily limit, Total cap with Edit button |
| 5.3 | Edit limits | Click Edit → change Daily limit to $20 → click "Save & Update On-Chain" | Passkey prompt → "Updating on-chain..." → toast success |
| 5.4 | Vendor section | Check | Shows vendor pills with "x" remove button, "Add" button |
| 5.5 | Add vendor | Click Add → click "+ Stability AI" | Vendor added to list |
| 5.6 | Remove vendor | Click "x" on a vendor pill | Vendor removed from list |
| 5.7 | Agent details | Check | Agent address, Token, Deployed date |

---

## 6. Fund Management

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | Top-up button | Click "Top Up" | Amount input appears |
| 6.2 | Top-up flow | Enter $5, click "Top Up" | Passkey prompt → "Sending..." → toast success, balance increases |
| 6.3 | Emergency withdraw button | Click "Emergency Withdraw" | Red confirmation: "Pull ALL funds back?" |
| 6.4 | Confirm withdraw | Click "Confirm" | Passkey prompt → "Withdrawing..." → toast success, balance goes to $0 |
| 6.5 | Cancel withdraw | Click "Cancel" instead | Confirmation disappears, no action |

---

## 7. Key Reveal

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Reveal dialog | Click "Reveal Key" on card or detail page | Dialog opens: "Agent Private Key", masked key |
| 7.2 | Show full key | Click "Show full key" | Full hex key visible |
| 7.3 | Hide key | Click "Hide" | Key masked again |
| 7.4 | Copy key | Click "Copy" | Toast: "Key copied to clipboard" |
| 7.5 | Auto-hide | Wait 30 seconds | Dialog auto-closes |

---

## 8. Revoke Agent

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | Revoke | Click "Revoke" button | Toast: "Agent wallet revoked" |
| 8.2 | Status changes | Check card | Badge changes to red "revoked" |
| 8.3 | Buttons disabled | Check card | "Reveal Key" and "Revoke" buttons greyed out/disabled |
| 8.4 | Detail page disabled | Navigate to detail | Edit, Add vendor, Top Up, Withdraw all disabled |

---

## 9. On-Chain Verification

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1 | Guardian on explorer | Copy guardian address → open `https://explore.moderato.tempo.xyz/address/[addr]` | Contract visible with transactions |
| 9.2 | Payment tx on explorer | After making a payment, click explorer link | Transaction with Transfer event visible |
| 9.3 | Spending cap enforcement | Use the agent key with createGuardedMppx to pay > spending cap | Guardian reverts: "Spending cap exceeded" |
| 9.4 | Daily limit enforcement | Use agent key to pay > daily limit | Guardian reverts: "Daily limit exceeded" |
| 9.5 | Vendor enforcement | Use agent key to pay non-allowlisted address | Guardian reverts: "Recipient not allowed" |

---

## 10. CLI Demo Script

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Run demo | `cd tempo-mppx && npx tsx demo.ts` | All 5 steps complete with green checkmarks |
| 10.2 | Explorer links | Click any explorer link from output | Transaction visible on `explore.moderato.tempo.xyz` |
| 10.3 | Blocked vendor | Step 4 output | "Guardian REVERTED: Recipient not allowed" |
| 10.4 | Over-limit | Step 5 output | "Guardian REVERTED: Exceeds per-tx limit" |
| 10.5 | Timing | Full run | Completes in under 60 seconds |

---

## 11. Demo API Endpoint

```bash
# Valid request
curl -X POST http://localhost:3000/api/agents/demo \
  -H 'Content-Type: application/json' \
  -d '{"agentKey":"0x0000000000000000000000000000000000000000000000000000000000000001","guardianAddress":"0x0000000000000000000000000000000000000001","prompt":"test"}'
# Expected: 200 with { imageUrl, txHash, amount, vendor }

# Missing fields
curl -X POST http://localhost:3000/api/agents/demo \
  -H 'Content-Type: application/json' -d '{}'
# Expected: 400 with error message

# Invalid key format
curl -X POST http://localhost:3000/api/agents/demo \
  -H 'Content-Type: application/json' \
  -d '{"agentKey":"bad","guardianAddress":"0x0000000000000000000000000000000000000001","prompt":"test"}'
# Expected: 400 "Invalid agent key format"
```

---

## Priority for Hackathon Demo

### Must Verify (live demo flow)
- [ ] 3.7-3.10 — Create wallet + see key
- [ ] 4.1-4.5 — Card renders correctly
- [ ] 10.1-10.4 — CLI demo works end-to-end
- [ ] 9.1-9.2 — Explorer links resolve to real transactions

### Should Verify
- [ ] 5.3-5.6 — Limit + vendor management
- [ ] 6.1-6.4 — Top-up + emergency withdraw
- [ ] 7.1-7.5 — Key reveal flow
- [ ] 8.1-8.3 — Revoke flow

### Nice to Verify
- [ ] 1.1-1.4 — Auth + navigation
- [ ] 2.1-2.2 — Empty state
- [ ] 3.5-3.6 — Validation errors
- [ ] 11.1-11.3 — Demo API endpoint

---

## Automated Test Coverage

| Suite | Count | Command |
|-------|-------|---------|
| Unit tests (Vitest) | 447 | `bun run test` |
| Forge contract tests | 238 | `cd tempo-multisig/contracts && ~/.foundry/bin/forge test` |
| Guardian on-chain integration | 6 | `cd tempo-mppx && VITE_NODE_ENV=testnet VITE_RPC_URL=https://rpc.moderato.tempo.xyz npx vitest run src/tempo/server/Guardian.integration.test.ts --project node` |
| E2E Playwright | 26 | `cd apps/web && bun run test:e2e` (requires Postgres + clean port 3000) |
| **Total** | **717** | All green as of `v0.1.0-agent-bank` tag |

---

## Network Configuration

The app uses `NEXT_PUBLIC_TEMPO_NETWORK` env var to select testnet/mainnet:

```bash
# Testnet (default)
NEXT_PUBLIC_TEMPO_NETWORK=testnet

# Mainnet (when ready)
NEXT_PUBLIC_TEMPO_NETWORK=mainnet
```

All chain-specific values (RPC URLs, chain IDs, token addresses, contract addresses, explorer URLs) are derived from `src/lib/network-config.ts`.
