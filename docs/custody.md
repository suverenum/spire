# Custody Models

Custodial vs. self-custodial — who holds the keys, what it means for regulation, insurance, and product strategy, and why the answer for mid-market companies is "start self-custodial, become a custodian."

*Part 11 of an 11-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Who Holds the Keys

The fundamental question in crypto asset management: **who controls the private keys that authorize transactions?**

| Model | Who holds keys | Analogy | Example |
|-------|---------------|---------|---------|
| **Custodial** | A third-party provider | Traditional bank — they hold your money and execute on your behalf | Anchorage, BitGo, Fireblocks Trust Company, Coinbase Custody |
| **Self-custodial** | The company/user themselves | Safe deposit box — you manage your own keys and security | Safe, Squads, Fireblocks Essentials |
| **Hybrid** | Shared between provider and client | Co-signing arrangement — neither party can act alone | Liminal, Utila, Fordefi |

---

## Custodial: The Bank Model

### How it works

A custodian holds the keys and executes transactions on your behalf, just like a traditional bank. You are their client — they manage the security, operations, and compliance around your assets. In exchange, they provide insurance, regulatory compliance, and operational guarantees.

Custodians go through extensive audits, maintain regulatory licenses, and carry insurance policies. The client trusts them the same way they trust a bank.

### Who uses custodial today

- **Institutional investors** — hedge funds, family offices, asset managers who need regulated custody
- **Exchanges** — Coinbase, Revolut, Binance hold assets for millions of retail users
- **Banks** — traditional banks entering crypto offer custody to their clients. BNY Mellon launched its Digital Asset Custody Platform in October 2022 and was selected as custodian for Ripple USD reserves (July 2025). State Street launched a digital asset platform in January 2026 (via Taurus SA), initially focused on tokenized deposits and stablecoins rather than direct Bitcoin/Ethereum custody
- **Large enterprises** — companies holding significant crypto reserves who want insurance and compliance guarantees

### What it costs

Custodial solutions are expensive. Pricing is typically based on Assets Under Management (AUM):

| AUM range | Typical annual cost | Cost as % of AUM |
|-----------|-------------------|------------------|
| $5M–$25M | $17.5K–$150K | 0.35%–0.60% typical (Fidelity 0.35%, Coinbase ~0.50%, BitGo ~0.60%) |
| $25M–$100M | $87.5K–$500K | 0.1%–0.5% (negotiated, declines with scale) |
| $100M+ | Negotiated | 0.05%–0.25% |

### What it takes to become one

Becoming a licensed custodian is a **multi-year, multi-million dollar undertaking**:

**United States:**
- State-by-state money transmitter licenses (each state has its own requirements, timeline, and fees)
- Or: OCC bank charter (Anchorage Digital is the first federally chartered crypto bank)
- Or: Trust company charter under state law (e.g., New York Trust Company — BitGo, Gemini)
- SOC 2 Type II certification — not legally required, but effectively a prerequisite for institutional business (the SEC's September 2025 no-action letter frames it as a due diligence expectation for qualified custodians)
- Estimated total cost of entry: **$5M–$20M+** over 2–4 years for comprehensive nationwide licensing (a firm could begin with a single state trust charter for under $2M)

**Europe:**
- Single license under MiCA covers all EU member states — significantly simpler than the US
- CASP (Crypto Asset Service Provider) registration
- Estimated cost: **$150K–$500K** for straightforward CASP licensing in cost-efficient jurisdictions (Czech Republic, Lithuania, Poland); **$500K–$1M+** for complex multi-service operations in stricter jurisdictions (Germany, Netherlands). Total cost of entry including infrastructure and staffing can reach $1M–$5M for large-scale operations

**Key licensed custodians:**

| Provider | License type | Clients | Notes |
|----------|-------------|---------|-------|
| **Anchorage Digital** | OCC federal bank charter (Jan 2021) | Institutions | First federally chartered crypto bank, $4.2B valuation (Feb 2026 Tether investment) |
| **BitGo** | OCC national trust bank (Dec 2025, converting from South Dakota trust) | 4,600+ total clients | $100B+ Assets on Platform, IPO'd Jan 2026 (NYSE: BTGO, $18/share) |
| **Coinbase Custody** | NY limited purpose trust company (Oct 2018) | Institutions | OCC national trust charter application pending |
| **Fireblocks** | NYDFS-regulated trust company (Fireblocks Trust Company, LLC, launched 2024) + infrastructure provider | 2,400+ clients | $8B valuation, Essentials plan $699/mo (first 6 months, then $18K+/year) |

> **Note:** The OCC regulatory landscape shifted dramatically on December 12, 2025, when it granted conditional charter approvals to five companies — Ripple, Circle, BitGo, Fidelity Digital Assets, and Paxos — in a single day. Anchorage remains the only fully operational OCC-chartered crypto bank, but the field is rapidly expanding.

---

## Self-Custodial: Full Control, Full Responsibility

### How it works

The company manages its own keys, signing infrastructure, and security. No third party can execute or block transactions. Full autonomy, but full responsibility.

### Who uses self-custodial today

Primarily **crypto-native companies** — DAOs, DeFi protocols, blockchain foundations. They have the in-house expertise, are comfortable with the technology, and often philosophically prefer self-sovereignty over third-party trust.

| Solution | Chain support | Model |
|----------|-------------|-------|
| **Safe** | EVM-only (contracts deployed on 480+ networks including testnets; ~15–30+ mainnets with full UI support) | Smart contract multi-sig |
| **Squads** | Solana/SVM (including SVM-based chains like Eclipse; overwhelmingly Solana mainnet in practice) | Smart contract multi-sig |
| **Fireblocks Essentials** | 80+ chains | MPC-based self-custody |

### The expertise requirement

Self-custody demands operational security expertise that most businesses don't have:

- Key generation and backup procedures
- Hardware security module (HSM) management
- Signer device security and rotation
- Incident response for key compromise
- Disaster recovery testing
- Ongoing security monitoring

For a crypto-native team with engineers who live on-chain, this is manageable. For a mid-market CFO who just wants to move money between subsidiaries, it's an unreasonable burden.

---

## What Mid-Market Companies Need

### The honest assessment

Mid-market companies ($0.5B–$5B revenue) entering on-chain treasury are in a position very similar to when they first started using banks:

- **No in-house crypto security expertise** — their IT team manages corporate networks, not blockchain key management
- **No budget for dedicated custody operations** — they're not going to hire a key ceremony specialist
- **They want insurance** — if something goes wrong, someone needs to make them whole
- **They want SOC 2 compliance** — not legally required, but their auditors and institutional counterparties will expect it as a due diligence baseline
- **They want key recovery** — if a signer leaves the company, they need to recover access

All of this points toward **custodial**. It's the same reason they use banks instead of stuffing cash in a vault.

### But the market is nascent

Here's the tension: mid-market companies would prefer custodial, but:

1. **Licensed custodians are expensive** — $50K–$200K/year for a $25M treasury is significant
2. **The market is just starting** — these companies won't immediately load their entire treasury on-chain
3. **Initial use case is transactional, not storage** — they want to move money between entities (intercompany payments, B2B payments), not park large reserves on-chain

This means the initial product doesn't need to be a vault for storing large balances. It needs to be a **hot wallet for operational payments** — more like a corporate debit card than a savings account.

### Risk profile by use case

| Use case | Typical balance | Risk tolerance | Custody model |
|----------|----------------|---------------|--------------|
| **Intercompany transfers** | Transient (funds flow through) | Medium | Self-custodial sufficient |
| **B2B payments** | Small hot wallet balance | Medium | Self-custodial sufficient |
| **Operating reserves** | $1M–$10M | Low | Custodial preferred |
| **Treasury reserves** | $10M+ | Very low | Custodial required |

For the initial product focused on payments and intercompany transfers, **self-custodial is sufficient** because the risk exposure is limited — money flows through the system rather than sitting in it.

---

## The Co-Signer Question: Regulatory Implications

### When does a co-signer become a custodian?

This is the critical regulatory question. The answer depends on what the co-signer can do:

| Co-signer capability | Regulatory status | Rationale |
|---------------------|-------------------|-----------|
| **Optional compliance checks** — advisory only, user can override or disable | **Not custodial** | No ability to execute or block transactions on behalf of client |
| **Mandatory compliance checks with admin override** — blocks suspicious transactions but a designated admin can override | **Gray area** — varies by jurisdiction | Can temporarily prevent transactions, but ultimate control remains with client |
| **Execute or block transactions on behalf of client** — no client override possible | **Custodial** | Meets the definition of having control over client assets |

### The architecture that works

The co-signer should be **optional and overridable** in the initial product:

1. **Compliance checks run automatically** — screen transactions against AML/KYT databases, check velocity limits, flag anomalies
2. **Flagged transactions pause** — the co-signer withholds its signature pending review
3. **Admin override exists** — a designated admin (e.g., the company founder or CFO) can force the transaction through
4. **The feature is opt-in** — companies can disable the co-signer entirely and operate purely self-custodial

This aligns with **FinCEN's 2019 guidance (FIN-2019-G001)**, which states that a multi-sig participant without "total independent control" over value is not a money transmitter. However, the regulatory landscape is nuanced — the SEC uses different criteria under the Advisers Act, and its December 2025 draft on "Custody Rule Modernization" explores multi-signature arrangements where a signer's role is "administrative, not discretionary." MPC wallets create additional gray areas. No bright-line test exists across jurisdictions, and the determination depends on the specific arrangement's key structure, governance, and override mechanisms.

### Smart contracts vs. MPC for the co-signer

Both can implement the co-signer pattern, but they have different tradeoffs:

| Dimension | Smart contract co-signer | MPC co-signer |
|-----------|------------------------|---------------|
| **Transparency** | Fully on-chain, auditable by anyone | Off-chain, requires trust in provider |
| **Audit ecosystem** | Mature — many firms audit Solidity/Move contracts | Smaller — fewer firms audit MPC implementations |
| **Developer ecosystem** | Large — many engineers know smart contracts | Small — MPC expertise is rare |
| **Flexibility** | Logic is public and deterministic | Can incorporate ML models, external APIs |
| **Gas cost** | Each policy check costs gas | No on-chain cost for policy checks |
| **Upgradeability** | Requires contract upgrade (on-chain tx) | Server-side update (instant) |
| **Chain support** | Chain-specific (different contracts per chain) | Protocol-agnostic (one system, all chains) |

**The preference for mid-market treasury: smart contracts.** Why:

- On-chain code is auditable and verifiable — builds trust with CFOs who don't understand MPC cryptography
- The audit ecosystem for smart contracts is mature and well-understood
- The developer ecosystem is dramatically larger — easier to hire, easier to maintain
- On-chain enforcement means security persists even if the off-chain provider disappears
- For a product initially focused on one or two chains, the cross-chain advantage of MPC isn't critical yet

MPC can be layered on later as the product matures and needs cross-chain support or more sophisticated off-chain fraud detection.

---

## Long-Term Vision: From Self-Custodial to Custodian

### The progression

```
Phase 1: SELF-CUSTODIAL (now)
├── Smart contract wallet with optional co-signer
├── Compliance checks are advisory, admin can override
├── No custodial license required
├── Target: transactional use (payments, intercompany transfers)
├── Hot wallet model — limited balances, money flows through
└── Revenue: transaction fees, FX spread on off-ramp

          ↓ (as trust builds, balances grow)

Phase 2: LICENSED CUSTODIAN (future)
├── Same smart contract wallet, but co-signer becomes mandatory
├── Compliance checks are enforced — no override
├── Full custodial license (MiCA in EU, state licenses in US)
├── Insurance coverage for client assets
├── Target: operating reserves + treasury storage
├── SOC 2 Type II certified
└── Revenue: AUM fees + transaction fees + yield products
```

### How the upgrade works

The product architecture should be designed so the transition from Phase 1 to Phase 2 is a **contract upgrade, not a rebuild**:

1. In Phase 1, the co-signer module is deployed as an optional smart contract module
2. Companies opt in to compliance checks but retain admin override
3. When the company obtains a custodial license, the co-signer module is upgraded:
   - Admin override is removed
   - Compliance checks become mandatory
   - Insurance is attached to the custody relationship
4. Existing clients upgrade their smart contract to the new module
5. The product now offers: "Upgrade to full custody — insured, regulated, enforced compliance"

### Why this path makes sense

The market for on-chain treasury is nascent. Companies will dip their toes in with small, transactional amounts before committing reserves. A self-custodial product with optional compliance is the right entry point because:

- **Lower barrier to entry** — no custodial license needed to launch
- **Matches current demand** — companies want payments, not vaults
- **Builds trust incrementally** — as they see the product work, they'll want to store more
- **Creates the upgrade path** — when balances grow, the custodial upgrade is natural
- **Avoids premature investment** — comprehensive custodial licensing costs $5M–$20M (though a single-state trust charter can be under $2M); don't spend it before product-market fit

The companies that will use on-chain treasury first are exploring cautiously. They won't load $50M on day one. They'll move $100K through, see that it works, move $500K, see that it works, and gradually increase. The custody model should match this adoption curve — start light (self-custodial), become serious (custodial) as the market matures.

---

*This is Part 11 of an 11-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **[MPC 101](./mpc.md)** — Multi-Party Computation, threshold signatures, and custody architecture
10. **[Security Architecture](./cosigner-security-models.md)** — Defense-in-depth security for a blockchain treasury app
11. **Custody Models** — Custodial vs. self-custodial, regulatory implications, and the path from self-custody to licensed custodian *(this document)*
