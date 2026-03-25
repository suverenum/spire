# Security architecture for a blockchain treasury app

**A stablecoin treasury management app can achieve bank-grade security by layering an MPC co-signer as an invisible guardian on top of its existing passkey + Ledger + recovery keychain, combined with off-chain transaction staging, per-counterparty deposit addresses, and smart-contract-enforced spending policies.** This model borrows proven patterns from neobanks like Revolut (ML fraud scoring in under 50ms), institutional custody platforms like Fireblocks (policy engines inside hardware enclaves), and on-chain recovery systems like Argent and Safe. The result is a defense-in-depth architecture where no single compromised layer can drain the treasury.

The sections below cover each security layer with practical implementation patterns, real-world precedents, and concrete architecture decisions.

*Part 10 of an 11-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## 1. The MPC co-signer acts as an invisible, un-bypassable fraud guardian

The core pattern is straightforward: the app operator holds one key share in a server-side MPC node. That node **refuses to co-sign** any transaction that fails a policy check — effectively vetoing it without any on-chain multisig overhead. On-chain, the resulting signature looks identical to a single-key ECDSA/EdDSA signature, preserving privacy and keeping gas costs low.

**Architecture options.** Fireblocks' embedded wallet uses a **2-of-2 MPC scheme** where one share lives on the user's device and the second runs inside an Intel SGX enclave on Fireblocks' servers. The server share won't participate unless the Transaction Authorization Policy (TAP) engine approves. For institutional setups, a **2-of-3 scheme** distributes shares across the user device, a Fireblocks server, and a customer-operated API Co-Signer running in AWS Nitro — giving the customer programmatic control over approval logic. ZenGo's consumer model places the third share in cold backup storage for recovery.

**Fireblocks TAP engine — the gold standard.** Every transaction passes through TAP before MPC signing occurs. Rules evaluate across six dimensions: initiator role, source vault, destination (whitelisted or not), asset type, per-transaction amount, and **cumulative amount over a rolling time window** (e.g., max $50K per 24 hours from a given vault). Actions are allow, block, or require N-of-M human approval via mobile app. Critically, TAP runs inside an SGX secure enclave — even a compromised server OS cannot alter governance rules. Policy changes themselves require an admin quorum, preventing a rogue admin from weakening security. Compliance partners like Chainalysis and Elliptic integrate directly, auto-screening every transaction against AML risk profiles.

**Neobank fraud signals to replicate in the policy engine.** Revolut's "Sherlock" system scores every card transaction in **under 50ms** using CatBoost gradient-boosted trees retrained nightly. It catches **96% of fraudulent transactions** at 30% precision, losing just 1 cent per $100 transacted. Wise runs **7 million checks per day** across 110+ data points, combining ML models with static rules for regulatory explainability. The fraud signals most applicable to a crypto treasury app are:

- **Amount deviation** from the user's historical pattern per counterparty, category, and time-of-day
- **New destination** detection — first-time recipient addresses trigger enhanced monitoring
- **Velocity checks** — too many transactions in a rolling window
- **Time-of-day anomalies** — transactions at unusual hours for the user's timezone
- **Device fingerprinting** — hardware model, OS build, TLS stack traits, and sensor data
- **Behavioral biometrics** — keystroke dynamics, touch pressure, scroll rhythm, and navigation flow (BioCatch tracks 3,000+ signals per session)
- **Impossible travel** — transactions from two distant geolocations in rapid succession

For the treasury app specifically, the MPC policy engine should flag: transfers exceeding a percentile threshold of the user's 30-day history, any transfer to a non-whitelisted address above a configurable floor, rapid sequential outflows (potential account takeover), and contract calls to unverified smart contracts.

---

## 2. Per-counterparty deposit addresses shield the main treasury

Exchanges operate a **four-tier wallet structure**: per-user deposit addresses, hot wallets for daily operations, cold wallets for reserves, and withdrawal wallets for outbound flows. The deposit address layer is the privacy shield — counterparties never see or interact with the treasury directly.

**How Coinbase does it.** Coinbase generates a **new deposit address after every transaction** — the most aggressive rotation among major exchanges. All prior addresses remain permanently mapped to the user and continue accepting funds. Coinbase Prime's API exposes `Create Wallet Deposit Address` for institutional clients who need unique addresses per end-user or invoice, with `transfer_to.address` in every deposit transaction enabling precise reconciliation. Underneath, these use **HD wallets (BIP-32/BIP-44)** — a single master `xpub` derives an infinite tree of addresses deterministically, with each new address derived by incrementing a derivation index.

**Coinbase Commerce's pattern is elegant for invoice-level addresses.** Each charge deploys a **minimal proxy contract** (EIP-1167) on Ethereum that delegates to a master implementation — extremely cheap to deploy. This gives every payment a unique on-chain address while keeping the architecture lightweight. BTCPay Server achieves the same result with xpub-based HD derivation, auto-generating a unique address per invoice without manual tracking.

**Stealth addresses (ERC-5564) offer cryptographic privacy.** The recipient publishes a stealth meta-address containing a spending public key and a viewing public key. The sender generates an ephemeral key pair, computes a shared secret via ECDH, and derives a one-time destination address. An Announcement event (emitted from a singleton contract at `0x5564...`) contains the ephemeral public key and a 1-byte view tag for fast scanning. The recipient monitors announcements using their viewing key and derives the spending key for any matching deposits. Implementations include Umbra Cash and Fluidkey. The main operational challenge is that spending from stealth addresses requires ETH for gas, which can deanonymize the recipient — ERC-4337 paymasters solve this.

**Operational challenges to plan for.** Sweeping ERC-20 tokens from deposit addresses requires pre-funding each address with ETH for gas. Fireblocks' Gas Station automates this — detecting incoming ERC-20 deposits and spraying just enough ETH for the sweep. The reconciliation pattern is an internal database mapping `{deposit_address → counterparty_id/invoice_id}`, with user balances credited in the internal ledger only after sweep confirmation, not upon deposit detection.

---

## 3. Payment delays work through off-chain staging, not on-chain timelocks

Blockchain finality makes true "undo" impossible after broadcast. The practical pattern is **off-chain transaction staging** — holding the signed transaction in an internal queue and only broadcasting after a delay window expires without cancellation.

**Neobank precedents.** Mercury offers an explicit **30-minute cancellation window** for international wires, with a "Made a mistake?" prompt and a "Cancel payment" button on the confirmation screen. Wise implements a **multi-stage pipeline** where the cancel button appears during "set up but not paid" and "paid but waiting" states, then disappears once processing begins. Revolut's card payments enter a pending state for **7–8 days** while merchants claim them, with auto-reversion if unclaimed. None of these platforms use a Gmail-style countdown timer — the dominant UX patterns are status-based cancel buttons and time-limited cancel windows.

**For the blockchain treasury app, the recommended architecture is:**

1. User initiates transfer → passkey authenticates → MPC policy engine evaluates
2. If approved, transaction enters a **staging queue** with a configurable delay (5–30 minutes for routine transfers, 24 hours for large or first-time-destination transfers)
3. User sees a status screen with a countdown and prominent "Cancel" button
4. During the delay, the app can run additional async checks: AML screening, velocity recalculation, notification to co-approvers
5. At delay expiry, the transaction is signed and broadcast
6. Once broadcast, the transaction shows "Processing" → "Confirmed" states

**The tradeoff is explicit: counterparty risk vs. fraud prevention.** During staging, funds are technically still under the app's control — a compromised server could theoretically redirect them. Mitigations include running the staging logic inside a TEE (as Fireblocks does with SGX), requiring the user's passkey signature before broadcast (not just at initiation), and publishing commitment hashes on-chain during staging so tampering is detectable.

**On-chain timelocks serve a different purpose.** OpenZeppelin's `TimelockController` enforces a minimum delay between proposing and executing governance operations. Operations progress through `Unset → Waiting → Ready → Done` states, with designated cancellers able to abort during the wait. This pattern suits **high-value treasury movements and protocol upgrades** — not individual user payments where the overhead of on-chain scheduling, execution, and gas costs per transaction is impractical. Safe's spending limit module similarly operates on-chain but for policy enforcement rather than payment delays.

| Dimension | Off-chain staging | On-chain timelock |
|---|---|---|
| **Enforcement** | Server-side; protected by TEE | Smart contract; tamper-proof |
| **Flexibility** | ML-based fraud detection, complex rules | Rules coded in Solidity |
| **Cost** | No gas for policy checks | Gas for schedule, execute, cancel |
| **Cancel mechanism** | Instant via API | Requires on-chain transaction |
| **Best for** | Individual user payments | Governance, high-value treasury ops |

---

## 4. Spam and dust filtering requires a layered defense

Dust attacks send tiny amounts to thousands of addresses to **deanonymize users through transaction graph analysis**. On UTXO chains, when a wallet later spends funds, it automatically co-spends the dust UTXO, linking wallet clusters via the common-input-ownership heuristic. On account-based chains like Ethereum and Solana, spam manifests as fake token airdrops, phishing NFTs, and address-poisoning attacks (sending from look-alike addresses to contaminate transaction history).

**Solana is particularly vulnerable** — transaction fees below $0.001 make mass spam trivial, and each spam token locks ~0.002 SOL in rent on the recipient's account. Phantom wallet addresses this with an ML-based spam model that auto-hides flagged tokens, learns from user reports, and uses Blowfish-powered transaction simulation for real-time warnings. Ethereum's higher gas costs act as a natural economic filter, but EIP-7702 smart accounts introduced new risks where a single transaction can batch multiple token drains.

**Recommended filtering stack for the treasury app:**

- **Minimum threshold filtering** — ignore incoming transactions below a configurable value per asset (e.g., <$0.10 equivalent). Bitcoin Core's `dustrelayfee` does this at the node level
- **Token contract verification** — use Alchemy's `isSpamContract` API or equivalent to check if tokens break their ERC standard, mint to honeypot wallets, or lie about total supply
- **Sender reputation scoring** — integrate Chainalysis or Elliptic risk scores; freeze inbound from high-risk wallets for compliance review before crediting
- **Address allowlisting** — for a treasury app with known counterparties, default to displaying only transactions from recognized addresses
- **UTXO coin control** — mark dust UTXOs as "do not spend" to prevent co-spending (critical for Bitcoin privacy). Wallets like Wasabi, Samourai, and Sparrow implement this; Ledger's default interface lacks it
- **UI segregation** — auto-hide flagged tokens in a separate "hidden" folder with manual override, following Phantom's pattern. Never display URLs embedded in token names (phishing vector)

Fireblocks' institutional approach combines Blockaid-powered NFT spam detection (which found **19% of NFT airdrops were phishing attacks**) with compliance-layer screening of all inbound transactions and policy-engine-gated crediting.

---

## 5. Recovery needs multiple independent paths, not just seed phrases

Institutional key recovery has moved decisively beyond seed phrases toward **distributed, threshold-based systems** where the full private key never exists in one place.

**Argent's guardian model is the best consumer reference.** When you create an Argent wallet, a smart contract deploys on Ethereum with a single signing key for daily use. Guardians — other wallets you own, trusted contacts, or Argent's built-in 2FA — provide recovery without fund access. Recovery requires a **majority of guardians** (2-of-3, 3-of-5, etc.) and enforces a **48-hour timelock** before the new signing key activates, giving the original owner time to cancel unauthorized recovery attempts. Any single guardian can **lock the wallet instantly**, preventing transactions if a phone is stolen. Crucially, guardians cannot move funds or see other guardians, limiting collusion and theft risk. Vitalik Buterin recommends a minimum of 7 guardians for high-security setups.

**Safe's RecoveryHub extends this for organizations.** Launched with Sygnum Bank and Coincover (a UK-regulated recovery provider), it implements recovery as a pluggable module on Safe's multisig. Recovery options span self-custodial (personal backup devices), social (family/colleagues), and custodial (institutional partners). Only the Safe account can cancel a recovery attempt, and configurable timelocks provide a window for owner intervention. The module calls `swapOwner` to replace a lost owner address, requiring confirmation from all designated recovery parties.

**The dead man's switch pattern handles incapacitation.** Sarcophagus protocol (raised $5.47M) implements this on Ethereum + Arweave: the user encrypts data, uploads it to permanent storage, and must periodically "re-wrap" (check in) to prove liveness. If the re-wrap deadline passes, economically-incentivized node operators ("archaeologists") decrypt the outer layer, and the designated recipient decrypts the inner layer with their private key. The simpler smart contract version tracks `block.timestamp` of the owner's last activity and allows designated recovery addresses to claim after an inactivity threshold (e.g., 12 months), with any owner activity resetting the clock.

**For the treasury app, the recommended recovery architecture is:**

1. **Primary**: Passkey + Ledger (2-of-3 without MPC server) — works if the app goes down
2. **Social**: 3-of-5 guardian approval with 48-hour timelock — handles lost devices
3. **Institutional**: Recovery key share held by a regulated custodian (Coincover, Sygnum) — backstop for catastrophic loss
4. **Inheritance**: Time-locked recovery after 12 months of inactivity, triggerable by pre-designated addresses

**Shamir's Secret Sharing (SSS) is appropriate only for cold backup**, not active operations. Unlike MPC, SSS reconstructs the full key in memory on a single device during every signing — creating a repeated attack window. Trezor Model T uses SSS (SLIP-39) for hardware wallet backup, but institutional custody has migrated to MPC-TSS where the key is never assembled.

---

## 6. Forced security policies blend on-chain modules with off-chain engines

The question of where to enforce policies — smart contract or server — has a clear practical answer: **both, for different purposes**. Complex compliance logic (AML screening, ML risk scores, behavioral analysis) belongs off-chain in a TEE-protected policy engine. Immutable financial guardrails (spending limits, timelocks, address whitelists) belong on-chain in smart contract modules.

**Tiered approval workflows are the institutional standard.** Fireblocks implements configurable tiers: auto-approve below $1K with basic compliance screening, require one approval for $1K–$10K with whitelisted addresses, require two approvals from different groups for $10K–$100K with AML checks, and require board-level approval plus a 24-hour timelock for transfers exceeding $1M. Policy changes themselves require an admin quorum, creating governance over governance.

**Safe's Spending Limit Module enforces caps on-chain.** Deployed as a module alongside the core multisig, it lets owners grant beneficiary addresses specific token allowances — one-time or periodic (daily/weekly/monthly) with automatic reset. Beneficiaries can spend within limits **without collecting multisig signatures**, while the module contract reverts any attempt to exceed the allowance. This is ideal for operational expenses where a team member needs autonomy within bounds.

**ERC-4337 account abstraction enables policy enforcement in the account itself.** Over **40 million smart accounts** have been deployed since the March 2023 launch, processing 100M+ UserOperations. The `validateUserOp` function is where all security checks execute: spending limits, multi-approval thresholds, address whitelisting, session key restrictions, and time-locked operations — all enforced by blockchain consensus rather than a server. Session keys are particularly powerful: a delegated key can be scoped to "spend up to $100/day, only to these 3 addresses, expiring in 7 days" — enabling automated operations with strict guardrails.

For the treasury app, the recommended approach is a **smart contract wallet (ERC-4337 compatible)** with modular policies: on-chain spending limits and address whitelists as immutable guardrails, plus an off-chain MPC policy engine (inside SGX/Nitro) for real-time fraud scoring, AML checks, and behavioral analysis. The on-chain layer ensures security even if the off-chain system is compromised.

---

## 7. The MPC + keychain hybrid model brings everything together

The most practical architecture layers MPC co-signing on top of the existing protocol-native keychain through a **smart contract wallet with 2-of-3 signer logic**, where each signer is a different type of key:

**Signer 1 — Passkey (daily use).** Generated and stored in the device's Secure Enclave, authenticated via biometrics. Always available for routine low-value transactions. Dfns is the most natural provider here — they pioneered passkey-native authentication for wallet signing with sub-100ms signing latency.

**Signer 2 — Ledger hardware wallet (elevated operations).** Required for high-value transfers, adding new recipients, changing security settings, and key rotations. Physical confirmation on the device provides an air-gapped verification step.

**Signer 3 — MPC server co-signer (invisible guardian).** Held by the app operator in a TEE. Participates automatically in signing if policy checks pass; refuses to sign if they don't. The user never interacts with this signer directly — it's invisible infrastructure.

**Transaction flows under this model:**

- **Daily transactions**: Passkey + MPC server = 2-of-3 quorum. The user taps biometrics; the MPC server validates policy rules silently. Sub-second UX.
- **Elevated operations**: Ledger + MPC server = 2-of-3 quorum. User physically confirms on Ledger; MPC server applies stricter policy rules.
- **Recovery (server down)**: Passkey + Ledger = 2-of-3 quorum. User can transact without the server, though a smart contract timelock may enforce a waiting period for safety.
- **Fraud veto**: MPC server refuses its share → no 2-of-3 quorum possible without both remaining signers. Suspicious transaction blocked.

**Why smart contract wallet over pure MPC-TSS?** Passkeys and Ledger devices weren't designed for multi-round MPC communication protocols. Running distributed key generation and threshold signing across a WebAuthn authenticator, a Ledger Nano, and a cloud server introduces severe complexity. The practical path is **Option C**: each device holds an independent key, and a smart contract (ERC-4337 account) requires 2-of-3 signatures. The MPC server uses TSS internally for its own key security, but externally it's simply one signer in a multi-key scheme.

**Co-signing-as-a-service providers** for the guardian role:

| Provider | Best fit | Key differentiator |
|---|---|---|
| **Fireblocks** | Institutional standard | TAP policy engine in SGX, 1,800+ clients, acquired Dynamic |
| **Dfns** | Passkey-native architecture | Sub-100ms signing, Key Orchestration Service, NIST contributor |
| **Lit Protocol** | Programmable co-signing | JavaScript "Lit Actions" gate signing with arbitrary logic, decentralized |
| **Turnkey** | TEE-based (non-MPC) | Built by ex-Coinbase Custody team, policies enforced inside enclave |
| **Cobo** | Flexible M-of-N configs | $200B+ processed, zero breaches, API Co-Signer with auto-approve rules |
| **Fordefi** | DeFi-native operations | Pre-signing transaction simulation, acquired by Paxos |

**Dfns stands out** for the passkey + MPC guardian use case specifically: their Key Orchestration Service supports splitting MPC key shares across customer infrastructure and Dfns cloud, and their passkey-native authentication aligns directly with the app's existing WebAuthn setup. **Lit Protocol** offers the most programmable co-signing — Lit Actions are JavaScript functions that can call external APIs, check arbitrary conditions, and then sign, enabling complex fraud detection logic at the signing layer.

---

## Conclusion

The security model described here creates **five independent barriers** an attacker must overcome: biometric-gated passkey authentication, hardware wallet confirmation for elevated operations, an MPC guardian policy engine evaluating every transaction against neobank-grade fraud signals, smart-contract-enforced spending limits and timelocks, and a social recovery system with guardian-based key rotation. No single layer's failure compromises the treasury.

The key architectural insight is that **MPC co-signing and smart contract policies are complementary, not competing**. MPC provides invisible, gas-free, cross-chain fraud prevention at the signing layer. Smart contract modules provide tamper-proof, transparent, on-chain guardrails that persist even if the off-chain systems are compromised. The off-chain staging pattern for payment delays, per-counterparty deposit addresses for privacy, and layered spam filtering complete the defensive perimeter. This hybrid approach — borrowing Revolut's ML fraud scoring, Fireblocks' policy architecture, Argent's guardian recovery, and Safe's modular enforcement — represents the current state of the art for blockchain treasury security.

---

*This is Part 10 of an 11-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **[MPC 101](./mpc.md)** — Multi-Party Computation, threshold signatures, and custody architecture
10. **Security Architecture** — Defense-in-depth security for a blockchain treasury app *(this document)*
11. **[Custody Models](./custody.md)** — Custodial vs. self-custodial, regulatory implications, and the path to licensed custodian