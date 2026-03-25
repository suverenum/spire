# Synthesis: Key Learnings & Actionable Steps

What the 12-part research series tells us about the opportunity, what to build, and what it takes.

---

## The Opportunity

### Where the market gap is

1. **Mid-market multi-entity companies ($0.5B-$5B revenue) have no adequate treasury tooling.** The CFO manually reconciles cash across 5-10 bank portals daily. Dedicated TMS platforms (Kyriba, ION) are too expensive ($100K-$500K+/year) and take 6-18 months to deploy. Multi-sig wallets (Safe, Squads) lack ERP integration, bank connectivity, and treasury logic. Nobody occupies the middle.

2. **Cross-border payments remain broken on specific corridors.** US/EU to Latin America, India, Africa, and Southeast Asia are slow, expensive, and opaque. SWIFT GPI improved developed-market corridors, but emerging-market corridors still cost 2-7% for B2B and take days. Stablecoins solve this where traditional rails fail.

3. **The banking layer is the root cause of enterprise pain.** Every bank is a silo. Every integration is custom. Data is stale (end-of-day statements). Formats are inconsistent (MT940, BAI2, CSV). A unified, real-time, programmable financial layer would collapse the entire stack of corporate treasury pain points.

4. **Convergence signals are strong.** Ripple acquired GTreasury for $1B (Oct 2025). Fireblocks acquired TRES Finance for $130M (Jan 2026). 23% of large-company CFOs plan treasury crypto use within 2 years. B2B stablecoin payments are at $226B annualized with 733% YoY growth. Payment incumbents are acquiring stablecoin infra: Stripe/Bridge ($1.1B), Mastercard/BVNK ($1.8B).

### What the opportunity is NOT

5. **Not full-stack banking.** Every specialist segment (importers/exporters, emerging-market businesses, crypto companies) pulls toward building a full bank (cards, invoicing, payroll, local compliance). That is where incumbents are strongest and where startups die.

6. **Not replacing the ERP.** ERP is the system of record. Even neobanks never managed to replace accounting software. The on-chain treasury must appear as "just another bank account" inside SAP/NetSuite/Dynamics.

7. **Not a crypto product.** No traditional mid-market company has adopted stablecoin treasury tools yet. Current users are entirely DAOs and crypto-native organizations. Bridging this gap is the central product challenge.

### Target segment

8. **~12,000 companies in US + Europe.** Mid-market ($0.5B-$5B), multi-entity, multi-country. Tech companies with emerging-market exposure are the likeliest early adopters. The CFO is the buyer -- 1-3 month deal cycles, standard B2B SaaS sales motion.

---

## What to Build

### The product in one line

An affordable, self-service on-chain treasury for mid-market multi-entity companies -- with ERP integration, approval policies, and on/off-ramp built in.

### MVP feature set

| # | Feature | Why it matters |
|---|---------|----------------|
| 1 | **Multi-entity treasury** | One treasury, multiple wallets (one per legal entity), each with its own signers and policies. Maps to how companies are structured. |
| 2 | **Approval policies** | Per-entity signing rules, approval thresholds, role-based access. CFO needs control without complexity. |
| 3 | **On-ramp / off-ramp** | Virtual accounts for fiat in (USD, EUR via ACH/SEPA), linked bank accounts for fiat out. Bridge between traditional banking and on-chain. |
| 4 | **Intercompany transfers** | Instant, free USDC transfers between entity wallets. The core value proposition -- bypass SWIFT. |
| 5 | **Tier 1 corridors** | US, Europe, UK, LATAM (Mexico, Brazil, Colombia, Argentina, Chile). Stablecoin advantage only matters where traditional rails are broken. |
| 6 | **ERP integration** | Real-time sync with NetSuite, SAP S/4HANA, Dynamics 365 F&O, Workday. The killer differentiator vs. multi-sig wallets. CFO sees on-chain accounts in their existing dashboard. |
| 7 | **USDC as primary stablecoin** | Corporate compliance standard. USDT as secondary. EURC lacks institutional liquidity -- hold USDC, convert at off-ramp. |

### Explicitly out of scope

- Cards, expense management, invoice processing (handled by Ramp, Brex, SAP Concur)
- SWIFT integration (defeats the purpose)
- Full accounting (lives in ERP)
- Full banking suite (leads to indefensible position)

### Post-MVP expansion

- Tier 2 corridors (India, Africa, Southeast Asia, Middle East)
- FX rate transparency and hedging tools
- Netting automation for intercompany settlements
- Yield on idle USDC balances
- Cash flow forecasting and FX exposure reporting

---

## How to Build It

### Architecture decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Custody model** | Start self-custodial, evolve to licensed custodian | Phase 1: smart contract wallet with optional co-signer, no license needed. Phase 2: mandatory compliance, custodial license (MiCA in EU, state licenses in US). Design as a contract upgrade, not a rebuild. |
| **Key management** | 2-of-3 smart contract wallet (passkey + Ledger + MPC server co-signer) | Passkey for daily use, Ledger for elevated operations, MPC co-signer as invisible fraud guardian. Recovery: passkey + Ledger works without the server. |
| **Co-signer approach** | Smart contracts preferred over pure MPC for mid-market | On-chain code is auditable, builds trust with CFOs. Mature audit ecosystem, larger developer pool. MPC layered later for cross-chain support. |
| **Security model** | Defense-in-depth: 5 independent barriers | Passkey auth, hardware wallet, MPC guardian with neobank-grade fraud signals, smart contract spending limits/timelocks, social recovery with guardian-based key rotation. |
| **Off-chain staging** | Payment delays via server-side queue, not on-chain timelocks | 5-30 min delay for routine transfers, 24h for large/first-time-destination. Cancel button during delay. On-chain timelocks reserved for governance operations. |
| **ERP positioning** | Infrastructure, not interface | The product is a payment rail. Finance teams should never leave their ERP. All data flows automatically into the general ledger. |

### Payment infrastructure partners

| Provider | Coverage | Role |
|----------|----------|------|
| **Bridge (Stripe)** | US, Europe, UK, LATAM (101 countries) | Primary on/off-ramp |
| **Bitso** | Mexico, Brazil, Colombia, Argentina | LATAM-specific local rails (PIX, SPEI) |
| **Dlocal** | 44 markets, LATAM + Africa + Asia | Broader emerging-market coverage |
| **Due Network** | India, Africa, Southeast Asia, Middle East | Tier 2 expansion corridors |

### Co-signing / custody providers to evaluate

| Provider | Strength | Fit |
|----------|----------|-----|
| **Dfns** | Passkey-native, sub-100ms signing, Key Orchestration Service | Best fit for passkey + MPC guardian model |
| **Fireblocks** | TAP policy engine in SGX, 1,800+ clients, TRES acquisition for ERP | Institutional standard, but expensive; potential partner or competitor |
| **Lit Protocol** | Programmable JS co-signing, decentralized | Most flexible fraud detection at signing layer |
| **Turnkey** | TEE-based (non-MPC), ex-Coinbase Custody team | Simpler architecture alternative |

---

## What's Required

### To launch (Phase 1 -- self-custodial)

| Requirement | Details |
|-------------|---------|
| **Product build** | Treasury core + on/off-ramp + ERP integration. Estimated 3-6 months for MVP. |
| **Formal legal opinions** | Regulatory posture per jurisdiction. Money transmitter status is "facts and circumstances" -- not settled by self-labeling. |
| **OFAC sanctions screening** | Legal obligation for all US persons. Strict liability -- cannot delegate to providers alone. Exodus (non-custodial wallet) paid $3.1M OFAC settlement. |
| **KYB collection system** | Multi-entity onboarding is semi-manual. 10 entities = 10 separate KYB processes, each with relevant payment providers. |
| **Transaction documentation** | Collect purpose-of-payment, invoices, contracts for qualifying transfers. Same docs companies already provide for SWIFT. |
| **Preventive transaction monitoring** | Flag suspicious patterns before they reach providers. Provider relationship quality depends on traffic quality. |
| **Travel Rule compliance** | US: originator/beneficiary data for $3,000+ transfers. EU: no threshold (all crypto transfers). |
| **ERP connectors** | NetSuite, SAP S/4HANA, Dynamics 365 F&O, Workday. Pre-built connectors for the systems this segment actually uses. Must generate MT940, BAI2, CAMT.053 export formats. |

### To scale (Phase 2 -- licensed custodian)

| Requirement | Details |
|-------------|---------|
| **Custodial license (EU)** | MiCA CASP registration. Cost: $150K-$500K for straightforward licensing; $1M-$5M for large-scale operations. Single license covers all EU member states. |
| **Custodial license (US)** | State-by-state money transmitter licenses + FinCEN MSB registration. Or: state trust company charter ($2M+). Or: OCC bank charter ($5M-$20M+, 2-4 years). |
| **SOC 2 Type II** | Effectively a prerequisite for institutional business. Not legally required, but auditors and counterparties expect it. |
| **Insurance** | Coverage for client assets once in custodial model. |
| **Co-signer upgrade** | Remove admin override, make compliance checks mandatory, attach insurance. Contract upgrade, not rebuild. |

---

## Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **No traditional mid-market company has adopted yet** | High | Start with tech companies with painful cross-border corridors. FX cost savings + real-time visibility as the wedge. Validate fast. |
| **TMS vendors moving downmarket** | Medium-High | Be first with standardized, affordable product. Build switching costs through ERP integration and transaction history before incumbents arrive. |
| **Fireblocks expanding into treasury management** | Medium | TRES acquisition signals intent. Decision: partner with Fireblocks for custody or build integrated stack. The combination of treasury logic + ERP + on/off-ramp + mid-market pricing is the moat, not any single piece. |
| **Regulatory uncertainty** | Medium | Operate as application layer routing through licensed providers. Get formal legal opinions. Build OFAC screening regardless. Consider FinCEN MSB registration as protective measure. |
| **Stablecoin tax/accounting complexity** | Medium | IRS classifies stablecoins as property (capital gains per transaction). FASB guidance not expected until mid-2026. No FDIC insurance. Must educate clients on these differences vs. SWIFT. |
| **EU bank stablecoin support** | Low-Medium | Coming, but 3+ year timeline. Only 17 authorized EMT issuers, 25 approved stablecoins. Window is longer than "any day now," but not permanent. |
| **Provider dependency** | Medium | Single off-ramp provider failure kills corridors. Use multiple providers per corridor (Bridge + Bitso for LATAM). Provider compliance quality = our user experience. |

---

## The Bet in One Paragraph

Mid-market multi-entity companies ($0.5B-$5B) have acute treasury pain -- manual processes, stale data, expensive cross-border payments -- but no affordable, modern tooling. TMS is too expensive and slow to deploy. Multi-sig wallets lack treasury logic and ERP integration. The product sits in this gap: an affordable, self-service on-chain treasury that integrates into their existing ERP as "just another bank account" -- but one that's instant, transparent, and programmable. Start self-custodial with smart contract wallets and optional co-signer, grow into a licensed custodian as trust and balances build. The moat is the combination of on-chain wallets + treasury logic + ERP integration + mid-market pricing -- not any single feature. The central challenge: no traditional company has adopted yet. The central bet: tech companies with painful emerging-market corridors will cross the gap first, and the rest will follow.
