# PRD: Agent Bank — On-Chain Guardrails for AI Agent Payments

## 1. Meta Information

- **Created Date:** 2026-03-19
- **Epic:** Agent Bank (Tempo MPP Hackathon)
- **Depends on:** [Multi-Account PRD](../multi-accounts/prd.md), [MVP Authentication](../mvp/authentication.md)
- **Repo:** Goldspire (fork of Goldhord)

## 2. What

A platform that lets users create **guardrailed wallets for AI agents** with on-chain spending controls enforced by a Guardian smart contract. Users fund a wallet, set rules (daily limits, per-transaction caps, vendor allowlists), and receive a private key to give to their agent. The agent uses standard MPP (`mppx`) to pay for AI services — the Guardian contract intercepts every payment and enforces all rules on-chain before releasing funds. If rules are violated, the transaction reverts. The user can view spending, revoke keys, and adjust limits through a web dashboard.

## 3. Motivation

AI agents are gaining the ability to pay for services via the Machine Payments Protocol (MPP). But today, giving an agent a funded wallet means giving it **unrestricted access to all funds** — there are no guardrails. If an agent is compromised, misconfigured, or simply overspends, there's no safety net.

Current MPP wallets have no:
- Spending limits (daily, per-transaction)
- Vendor restrictions (agent can pay anyone)
- Emergency kill switches
- Visibility into what the agent spent and where

We're building the **first on-chain treasury layer for AI agents** — a bank where you create accounts for your agents with built-in policies, fully enforced by smart contracts on the Tempo blockchain. Not application-level checks. Not SDK-level checks. On-chain, tamper-proof, cryptographically enforced spending rules.

### Why On-Chain Matters

| Approach | Enforcement | Tamper-proof? | Works if agent code is modified? |
|---|---|---|---|
| Application-layer checks | In your backend | No | No — agent can bypass |
| SDK-level checks (onChallenge) | In the agent process | No | No — agent can use raw fetch |
| **Guardian smart contract** | **On the blockchain** | **Yes** | **Yes — funds are in the contract** |

The agent's private key can only call `Guardian.pay()`. The actual USDC sits inside the Guardian contract, not in the agent's wallet. Even a fully compromised agent key can only spend within the rules the owner set.

### Technical Validation

**Verified:** The Guardian contract approach works with standard mppx without any SDK modifications. The `onChallenge` callback intercepts 402 challenges, routes payment through the Guardian contract in push mode, and MPP servers accept the resulting Transfer event. Claude Code integration test confirmed end-to-end on Tempo testnet.

## 4. User Stories

### Treasury & Agent Wallet Setup

1. As a **treasury owner**, I want to create a treasury with a passkey so that I have a secure home base for managing agent funds.

2. As a **treasury owner**, I want to fund my treasury's main account with stablecoins so that I have money available to allocate to agents.

3. As a **treasury owner**, I want to create an agent wallet by setting a label, spending cap, daily limit, per-transaction cap, and allowed vendors so that each agent has clearly defined boundaries.

4. As a **treasury owner**, I want the system to deploy a Guardian smart contract on-chain for each agent wallet so that spending rules are enforced cryptographically, not by application trust.

5. As a **treasury owner**, I want the system to generate a private key for the agent and show it to me once after wallet creation so that I can paste it into my agent's configuration.

6. As a **treasury owner**, I want a "Copy Key" button with a clear warning ("Save this now — you won't see the full key again") so that I don't lose the key.

### Key Management

7. As a **treasury owner**, I want to reveal an agent's private key later by re-authenticating with my passkey so that I can recover the key if I need it again.

8. As a **treasury owner**, I want to revoke an agent's key at any time so that I can immediately cut off a compromised or misbehaving agent.

9. As a **treasury owner**, I want to see the status of each agent wallet (active, expired, revoked) so that I know which agents are operational.

### Spending Controls (On-Chain via Guardian Contract)

10. As a **treasury owner**, I want to set a **total spending cap** per agent wallet so that the agent can never spend more than a fixed amount in its lifetime.

11. As a **treasury owner**, I want to set a **daily spending limit** that resets every 24 hours so that runaway agents are contained per day.

12. As a **treasury owner**, I want to set a **per-transaction cap** so that no single payment can be unexpectedly large.

13. As a **treasury owner**, I want to define an **allowed vendor list** (e.g., only OpenAI and Stability AI) so that the agent can't pay arbitrary recipients.

14. As a **treasury owner**, I want to set an **allowed token list** (e.g., only pathUSD) so that the agent can't spend unexpected token types.

15. As a **treasury owner**, I want all these rules enforced **on-chain** so that even if the agent's code is modified, the rules still hold.

### Spending Visibility

16. As a **treasury owner**, I want to see a transaction log per agent wallet showing every payment (amount, vendor, timestamp, tx hash) so that I can audit agent spending.

17. As a **treasury owner**, I want to see a spending progress bar per agent wallet ("$3.50 / $10.00 daily limit used") so that I can glance at utilization.

18. As a **treasury owner**, I want to see the remaining balance inside each Guardian contract so that I know how much fuel each agent has left.

### Limit Management

19. As a **treasury owner**, I want to increase or decrease an agent's daily limit after creation so that I can adjust as needs change.

20. As a **treasury owner**, I want to add or remove vendors from the allowlist after creation so that I can expand or restrict what the agent can access.

21. As a **treasury owner**, I want to top up an agent wallet's balance (transfer more stablecoins to the Guardian contract) so that the agent can continue operating.

22. As a **treasury owner**, I want an emergency withdraw function that pulls all funds from a Guardian contract back to my main account so that I have a kill switch.

### Agent-Side Experience

23. As an **agent developer**, I want a simple code snippet showing how to use the agent key with mppx + Guardian so that integration takes minutes, not hours.

24. As an **agent developer**, I want clear error messages when the Guardian rejects a payment ("Daily limit exceeded", "Recipient not allowed") so that my agent can handle failures gracefully.

25. As an **agent developer**, I want the Guardian to work with any MPP service without changes on the service side so that I'm not limited to specific vendors.

### Landing Page & Demo

26. As a **visitor**, I want a landing page explaining "Bank for your AI Agents" with a clear value proposition so that I understand what this product does in 10 seconds.

27. As a **visitor**, I want an interactive demo where I paste an agent key and a prompt, and the system generates an image via a real MPP service so that I can see the product working live.

28. As a **visitor**, I want to see the payment receipt (tx hash, amount, vendor) after the demo so that I trust the system is real and on-chain.

### Notifications (Stretch)

29. As a **treasury owner**, I want to receive an email when an agent's payment is rejected due to a spending limit so that I know something needs attention.

30. As a **treasury owner**, I want the email to contain a link to increase the limit so that I can fix the issue in one click.

## 5. User Flows

### 5.1. Treasury Creation + First Agent Wallet

```
User opens app
  → Lands on landing page ("Bank for your AI Agents")
  → Clicks "Create Agent Treasury"
  → Enters treasury name
  → Browser prompts for passkey creation
  → Tempo passkey account created on-chain
  → Treasury funded via faucet (testnet) or deposit (mainnet)
  → Redirected to dashboard
  → Clicks "Create Agent Wallet"
  → Dialog opens:
    → Enters label ("Marketing Bot")
    → Sets spending cap ($50)
    → Sets daily limit ($10)
    → Sets per-tx cap ($2)
    → Selects vendors (Stability AI, fal.ai)
    → Clicks "Create"
  → System:
    → Generates secp256k1 key pair
    → Deploys Guardian contract on-chain with all rules
    → Adds vendor addresses to Guardian allowlist
    → Adds pathUSD to Guardian token allowlist
    → Transfers initial funding from main account to Guardian contract
    → Encrypts private key and stores in DB
  → Shows success screen:
    → Big private key display (copyable, one-time full view)
    → "Save this key now — you won't see it in full again"
    → "Copy Key" button
    → Confetti animation
  → User copies key → closes dialog
  → Dashboard shows new agent wallet card with spending limits
```

### 5.2. Agent Makes a Payment (Sequence)

```
Agent                   mppx client              Guardian Contract          MPP Service
  │                         │                          │                        │
  │  fetch(url, opts)       │                          │                        │
  ├────────────────────────►│                          │                        │
  │                         │  GET /resource           │                        │
  │                         ├─────────────────────────────────────────────────►│
  │                         │                          │                        │
  │                         │  402 + WWW-Authenticate  │                        │
  │                         │◄─────────────────────────────────────────────────┤
  │                         │                          │                        │
  │                         │  onChallenge fires       │                        │
  │                         │  parse amount, recipient │                        │
  │                         │                          │                        │
  │                         │  Guardian.pay(token,     │                        │
  │                         │    recipient, amount)    │                        │
  │                         ├─────────────────────────►│                        │
  │                         │                          │                        │
  │                         │                  ON-CHAIN CHECKS:                 │
  │                         │                  ✓ token in allowlist?            │
  │                         │                  ✓ recipient in allowlist?        │
  │                         │                  ✓ amount ≤ per-tx cap?           │
  │                         │                  ✓ daily limit not exceeded?      │
  │                         │                  ✓ total cap not exceeded?        │
  │                         │                          │                        │
  │                         │                  IF ALL PASS:                     │
  │                         │                  USDC.transfer(recipient, amount) │
  │                         │                          ├──────── settles ──────►│
  │                         │                          │                        │
  │                         │  tx hash                 │                        │
  │                         │◄─────────────────────────┤                        │
  │                         │                          │                        │
  │                         │  Retry with push-mode credential (tx hash)       │
  │                         ├─────────────────────────────────────────────────►│
  │                         │                          │                        │
  │                         │  200 OK + Receipt        │                        │
  │                         │◄─────────────────────────────────────────────────┤
  │                         │                          │                        │
  │  Response               │                          │                        │
  │◄────────────────────────┤                          │                        │
```

### 5.3. Key Reveal Flow

```
User clicks "Reveal Key" on agent wallet card
  → Dialog opens: "Authenticate to reveal key"
  → Browser prompts passkey (Touch ID / Face ID)
  → Server decrypts stored key using session-derived encryption key
  → Dialog shows:
    → Masked key: 0x7a3f...••••••••••••••••••
    → "Show full key" toggle
    → Click toggle → full key visible
    → "Copy" button
  → Auto-hides after 30 seconds
```

### 5.4. Limit Increase Flow

```
Agent payment rejected (Guardian reverts: "Daily limit exceeded")
  → Agent receives error
  → (If notifications enabled) System sends email:
    → "Your agent 'Marketing Bot' hit its $10/day limit on Stability AI"
    → "Increase Limit →" button
  → Owner clicks link → opens /agents/{id}/limits
  → Authenticates with passkey
  → Sees current limits + usage
  → Adjusts daily limit to $20
  → Clicks "Update Limit"
  → System calls Guardian.updateLimits() on-chain (owner-only function)
  → Tx confirms
  → Agent can retry and succeed
```

### 5.5. Emergency Withdraw

```
Owner clicks "Emergency Withdraw" on agent wallet
  → Confirmation dialog: "This will pull ALL funds back to your main account"
  → Owner confirms
  → System calls Guardian.withdraw(token) on-chain
  → All USDC transferred from Guardian → owner's main account
  → Agent wallet shows $0 balance
  → Agent's subsequent payments will fail (insufficient funds in Guardian)
```

## 6. Architecture

### 6.1. Smart Contract: Guardian

```solidity
contract AgentGuardian {
    address public immutable owner;       // Treasury owner (deploys contract)
    address public immutable agent;       // Agent's key (can only call pay())

    uint256 public maxPerTx;              // Max per single payment
    uint256 public dailyLimit;            // Max per day (resets every 24h)
    uint256 public spentToday;            // Tracks daily spend
    uint256 public lastResetDay;          // Day counter for reset logic

    mapping(address => bool) public allowedRecipients;  // Vendor allowlist
    mapping(address => bool) public allowedTokens;      // Token allowlist

    // Agent calls this — all checks enforced on-chain
    function pay(address token, address to, uint256 amount) external onlyAgent { ... }

    // Owner-only management functions
    function addRecipient(address r) external onlyOwner { ... }
    function removeRecipient(address r) external onlyOwner { ... }
    function addToken(address t) external onlyOwner { ... }
    function updateLimits(uint256 _maxPerTx, uint256 _dailyLimit) external onlyOwner { ... }
    function withdraw(address token) external onlyOwner { ... }
}
```

### 6.2. Client Wrapper: createGuardedMppx

```typescript
import { Credential } from 'mppx'
import { Mppx, tempo } from 'mppx/client'

function createGuardedMppx(params: {
  agentKey: `0x${string}`
  guardianAddress: `0x${string}`
  rpcUrl: string
  chainId: number
}) {
  const account = privateKeyToAccount(params.agentKey)
  const walletClient = createWalletClient({ account, transport: http(params.rpcUrl) })
  const publicClient = createPublicClient({ transport: http(params.rpcUrl) })

  return Mppx.create({
    polyfill: false,
    methods: [tempo({ account })],
    async onChallenge(challenge) {
      const { amount, currency, recipient } = challenge.request

      // Route through Guardian instead of direct transfer
      const hash = await walletClient.writeContract({
        address: params.guardianAddress,
        abi: GUARDIAN_ABI,
        functionName: 'pay',
        args: [currency, recipient, BigInt(amount)],
      })
      await publicClient.waitForTransactionReceipt({ hash })

      // Return push-mode credential — standard MPP format
      return Credential.serialize({
        challenge,
        payload: { hash, type: 'hash' },
        source: `did:pkh:eip155:${params.chainId}:${account.address}`,
      })
    },
  })
}
```

### 6.3. Data Model

```
┌─────────────┐      ┌──────────────┐      ┌───────────────────┐
│  treasuries  │──1:N─│   accounts   │──1:1─│  agent_wallets    │
│              │      │              │      │                   │
│  id          │      │  id          │      │  id               │
│  name        │      │  treasury_id │      │  account_id       │
│  tempoAddress│      │  name        │      │  label            │
│  created_at  │      │  token_*     │      │  guardian_address  │
│              │      │  wallet_addr │      │  agent_key_address │
└─────────────┘      │  is_default  │      │  encrypted_key    │
                      └──────────────┘      │  spending_cap     │
                                            │  daily_limit      │
                                            │  max_per_tx       │
                                            │  allowed_vendors  │
                                            │  status           │
                                            │  deployed_at      │
                                            └───────────────────┘
```

### 6.4. New Domain: `agents`

```
src/domain/agents/
├── actions/
│   ├── create-agent-wallet.ts     # Generate key, deploy Guardian, store encrypted key
│   ├── reveal-agent-key.ts        # Decrypt key with passkey session
│   ├── revoke-agent-key.ts        # Mark revoked in DB + on-chain
│   ├── update-agent-limits.ts     # Call Guardian.updateLimits()
│   ├── add-vendor.ts              # Call Guardian.addRecipient()
│   ├── remove-vendor.ts           # Call Guardian.removeRecipient()
│   ├── top-up-agent.ts            # Transfer funds to Guardian contract
│   └── emergency-withdraw.ts      # Call Guardian.withdraw()
├── components/
│   ├── create-agent-wallet-dialog.tsx
│   ├── agent-wallet-card.tsx
│   ├── agent-wallets-page.tsx
│   ├── reveal-key-dialog.tsx
│   ├── vendor-select.tsx
│   ├── spending-progress.tsx
│   └── limit-editor.tsx
└── hooks/
    ├── use-deploy-guardian.ts      # Deploy contract + setup on-chain
    ├── use-agent-wallets.ts        # TanStack Query for wallet list
    └── use-guardian-state.ts       # Read on-chain state (spent, limits)
```

## 7. Phased Implementation Plan

### Phase 1: Foundation (2 hours) — MUST SHIP

**Goal:** Working agent wallet creation with Guardian contract deployed on-chain.

| # | Task | Type | Est | Description |
|---|---|---|---|---|
| 1.1 | DB schema: `agent_wallets` table | BE | 15m | Add table with guardian_address, encrypted_key, limits, allowed_vendors. Generate + run migration. |
| 1.2 | Vendor registry | BE | 10m | `src/lib/vendors.ts` — hardcoded map of vendor IDs → names, domains, known MPP recipient addresses. |
| 1.3 | Crypto utils | BE | 15m | `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt for storing agent private keys in DB. |
| 1.4 | Guardian Solidity contract | SC | 30m | Write, compile, get ABI + bytecode. Minimal: pay(), addRecipient(), addToken(), updateLimits(), withdraw(). |
| 1.5 | Deploy Guardian hook | FE | 20m | `use-deploy-guardian.ts` — deploys contract, calls addRecipient/addToken, funds it. Uses wagmi writeContract. |
| 1.6 | Create agent wallet action | BE | 20m | Server action: generate key pair, encrypt, insert DB row. Returns wallet + raw key (one-time). |
| 1.7 | Create agent wallet dialog | FE | 30m | Form: label, spending cap, daily limit, per-tx cap, vendor multi-select, expiry. On submit: action → deploy hook → show key. |
| 1.8 | Agent wallet card | FE | 20m | Card: label, status, spending progress bar, vendor tags, reveal/revoke buttons. |
| 1.9 | Agent wallets page | FE | 15m | Grid of cards + "Create Agent Wallet" button. TanStack Query. |
| 1.10 | Key reveal flow | FE+BE | 20m | Dialog + server action: passkey re-auth → decrypt → show key in copyable field. |
| 1.11 | Sidebar update | FE | 5m | Add "Agent Wallets" nav item with Bot icon. |
| 1.12 | Revoke agent key | FE+BE | 15m | Mark revoked in DB. (On-chain: owner can withdraw all funds as kill switch.) |

### Phase 2: Landing + Demo (1.5 hours) — MUST SHIP

**Goal:** Public-facing page with live working demo.

| # | Task | Type | Est | Description |
|---|---|---|---|---|
| 2.1 | Landing page | FE | 40m | Hero ("Bank for your AI Agents"), how-it-works steps, vendor grid, CTAs. |
| 2.2 | Agent demo widget | FE | 40m | Client-side: paste key + prompt → mppx + Guardian → Stability AI generates image → show result + receipt. |
| 2.3 | Demo code snippet | FE | 10m | Copyable `createGuardedMppx()` usage example on landing page for developers. |

### Phase 3: Limit Management (1 hour) — SHOULD SHIP

**Goal:** Owner can adjust limits and manage vendors after creation.

| # | Task | Type | Est | Description |
|---|---|---|---|---|
| 3.1 | Limit editor UI | FE | 20m | Inline editing of daily limit, per-tx cap, spending cap on agent wallet detail page. |
| 3.2 | Update limits on-chain | FE+BE | 20m | Call Guardian.updateLimits() via wagmi. Server action updates DB. |
| 3.3 | Vendor management | FE+BE | 20m | Add/remove vendors → calls Guardian.addRecipient()/removeRecipient(). |

### Phase 4: Notifications (30 min) — NICE TO HAVE

| # | Task | Type | Est | Description |
|---|---|---|---|---|
| 4.1 | Limit exceeded API | BE | 15m | POST endpoint: agent reports failure → look up wallet → send email. |
| 4.2 | Email template | BE | 15m | "Your agent hit its limit" with "Increase Limit →" link. |

### Phase 5: Polish & Deploy (1 hour) — MUST DO

| # | Task | Type | Est | Description |
|---|---|---|---|---|
| 5.1 | End-to-end test | QA | 20m | Create wallet → fund → use key in demo → verify on-chain. |
| 5.2 | Mainnet deploy | INFR | 20m | Switch RPC to mainnet, fund with real USDC, deploy Guardian. |
| 5.3 | Demo script prep | QA | 20m | Rehearse 3-minute demo flow. Pre-create treasury for backup. |

## 8. Definition of Done

### Must Have (for hackathon submission)

1. Given a treasury owner, when they create an agent wallet with spending rules, then a Guardian contract is deployed on-chain with those exact rules.
2. Given an agent wallet, when the agent makes an MPP payment within limits, then the payment succeeds and the vendor receives funds.
3. Given an agent wallet, when the agent attempts to pay a non-allowlisted vendor, then the Guardian contract reverts the transaction.
4. Given an agent wallet, when the agent exceeds the daily spending limit, then the Guardian contract reverts the transaction.
5. Given a treasury owner, when they click "Reveal Key" and authenticate with their passkey, then the agent's private key is displayed.
6. Given a visitor on the landing page, when they paste a key and run the demo, then a real MPP payment is made and an image is generated.
7. Given a treasury owner, when they click "Emergency Withdraw", then all funds are pulled from the Guardian contract back to the main account.

### Should Have

8. Given a treasury owner, when they update spending limits in the UI, then the Guardian contract is updated on-chain.
9. Given a treasury owner, when they add a vendor after creation, then the Guardian contract's allowlist is updated on-chain.
10. Given an agent payment rejection, when notifications are enabled, then the owner receives an email with a direct link to increase limits.

## 9. Out of Scope

- **Multisig approval for individual transactions** — MPP challenges expire in ~5 min, human-in-the-loop approval is too slow. Deferred to post-hackathon when we can build async approval with retry.
- **Oracle for dynamic vendor addresses** — Vendors may change their receiving addresses. For now, we hardcode known addresses. Oracle-based dynamic resolution is a post-hackathon research item.
- **Mobile app** — Web-only for hackathon. PWA covers mobile use cases.
- **Multiple tokens per Guardian** — Each Guardian is single-token (pathUSD) for simplicity. Multi-token support is a contract upgrade.
- **Audit of Guardian contract** — This is a hackathon demo. Production deployment requires a formal security audit.

## 10. mppx Contribution (PR)

After the hackathon, we'll submit a PR to the mppx repo adding a `guardian` option to `tempo.charge()`:

```typescript
// Proposed API
tempo.charge({
  account: agentAccount,
  guardian: '0xGuardianAddress', // NEW: routes payment through Guardian contract
})
```

This replaces the direct `transferCall` in `src/tempo/client/Charge.ts` with a `Guardian.pay()` call when `guardian` is set. Everything else in the SDK stays the same. The PR makes the Guardian pattern a first-class citizen in mppx.

## 11. FAQs

### Does this require changes to MPP or mppx?

No. We use the existing `onChallenge` callback and push mode (`{ hash, type: 'hash' }` credential). The MPP server only checks that a valid Transfer event happened on-chain. It doesn't care if it came from an EOA or a contract. Verified by integration test on Tempo testnet.

### Why not just use the Account Keychain?

The Keychain today only supports total spending cap + expiry. Daily limits and destination scoping are coming in TIP-1011 but require a **hardfork** — not available yet. The Guardian contract gives us daily limits, per-tx caps, AND vendor allowlists today.

### What if a vendor changes their wallet address?

For the hackathon, addresses are hardcoded. The owner can add new addresses via the UI (calls `Guardian.addRecipient()`). Post-hackathon, an Oracle service can dynamically resolve vendor addresses from their MPP endpoints.

### Can the agent bypass the Guardian?

No. The agent's private key can only call `Guardian.pay()`. The actual stablecoins sit inside the Guardian contract, not in the agent's EOA. The agent's EOA only has enough gas to call the contract. Even a fully compromised key can only spend within the rules.

### What's the gas overhead?

Deploy: ~$0.07-$1.28 (one-time). Per payment: slightly higher than a direct transfer because of the contract call overhead. On Tempo, gas is near-zero and paid in stablecoins, so this is negligible.

## 12. Appendix

### Supported Vendors (Initial Hardcoded List)

| Vendor | Domain | Services |
|---|---|---|
| OpenAI | openai.com | GPT-4, DALL·E, Whisper |
| Anthropic | anthropic.com | Claude API |
| Stability AI | stability.ai | Stable Diffusion |
| fal.ai | fal.ai | Fast ML inference (Flux, SDXL) |
| Perplexity | perplexity.ai | AI search |

### Tempo Testnet Details

| Item | Value |
|---|---|
| Chain ID | 42431 |
| RPC | `https://rpc.moderato.tempo.xyz` |
| Explorer | https://explore.tempo.xyz |
| Faucet | `cast rpc tempo_fundAddress <ADDRESS>` or `Actions.faucet.fundSync()` |
| pathUSD | `0x20c0000000000000000000000000000000000000` |
| AlphaUSD | `0x20c0000000000000000000000000000000000001` |
| Keychain Precompile | `0xAAAAAAAA00000000000000000000000000000000` |

### Agent Integration Code (Copy-Paste Ready)

```typescript
import { Credential } from 'mppx'
import { Mppx, tempo } from 'mppx/client'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'

const GUARDIAN_ABI = parseAbi([
  'function pay(address token, address to, uint256 amount) external',
])

// Setup — paste your agent key and guardian address
const agentKey = '0x...'          // From Agent Bank dashboard
const guardianAddress = '0x...'   // From Agent Bank dashboard
const chainId = 42431

const account = privateKeyToAccount(agentKey)
const walletClient = createWalletClient({
  account,
  transport: http('https://rpc.moderato.tempo.xyz'),
})
const publicClient = createPublicClient({
  transport: http('https://rpc.moderato.tempo.xyz'),
})

// Create guarded mppx client
const mppx = Mppx.create({
  polyfill: false,
  methods: [tempo({ account })],
  async onChallenge(challenge) {
    const { amount, currency, recipient } = challenge.request
    const hash = await walletClient.writeContract({
      address: guardianAddress,
      abi: GUARDIAN_ABI,
      functionName: 'pay',
      args: [currency, recipient, BigInt(amount)],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    return Credential.serialize({
      challenge,
      payload: { hash, type: 'hash' },
      source: `did:pkh:eip155:${chainId}:${account.address}`,
    })
  },
})

// Use it — any fetch through mppx is now guarded
const res = await mppx.fetch('https://stability.mpp.paywithlocus.com/generate', {
  method: 'POST',
  body: formData,
})
```

### Demo Script (3 minutes)

1. **[0:00]** Open landing page. "This is Agent Bank — a bank for your AI agents."
2. **[0:15]** Show dashboard. "I created a treasury and set up an agent wallet for my image generation bot."
3. **[0:30]** Click into agent wallet. "It has a $10 daily limit, $2 per-transaction cap, and can only pay Stability AI. All enforced on-chain by this Guardian contract." Point to contract address link.
4. **[0:45]** Click "Reveal Key". Authenticate. Show key. "I paste this into my agent's config."
5. **[1:00]** Scroll to demo section. Paste key. Type: "A futuristic city on Tempo blockchain."
6. **[1:15]** Click Generate. Wait for image. "The 402 challenge came in, the Guardian verified the rules on-chain, and the payment went through."
7. **[1:30]** Show receipt. Click tx hash → Tempo explorer. "Real on-chain transaction. $0.10 paid to Stability AI."
8. **[1:45]** Back to dashboard. "The spending bar updated. $0.10 of my $10 daily limit used."
9. **[2:00]** "Now watch what happens when I try something not allowed." Change vendor to OpenAI in demo. Click Generate. Error: "Recipient not allowed."
10. **[2:15]** "The Guardian contract rejected it on-chain. My agent can't go rogue."
11. **[2:30]** "We also built this as a contribution back to mppx — a PR adding native Guardian support to the SDK."
12. **[2:45]** End slide: "Agent Bank. On-chain guardrails for the agentic economy."
