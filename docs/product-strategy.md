# Product Strategy

So what? After analyzing every segment, here's what to build, for whom, and why — with a competitive landscape map and open research questions.

*Part 8 of an 8-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Starting Position

The previous seven lectures identified several potential segments:

| Segment | Verdict |
|---------|---------|
| Crypto-native companies | Too small, pulls toward full-stack banking |
| Importers & exporters | Deep incumbent competition, not defensible |
| Emerging-market businesses | Crowded infrastructure, per-country complexity |
| Multi-entity multinational corporations | Most promising — but which tier? |

The multi-entity segment maps to the three tiers defined in [Corporate Banking](./corporate-banking.md):

```
┌──────────────────────────────────────────────────────────────┐
│  MEGA-CORPORATION ($50B+ revenue)                            │
│  SAP S/4HANA, in-house payment factory, 50+ banks            │
│  Sales cycle: 12+ months, committee decisions                │
│  ❌ Unrealistic — too slow to sell, too complex to serve     │
├──────────────────────────────────────────────────────────────┤
│  LARGE ENTERPRISE ($5B–$50B revenue)                         │
│  SAP/Oracle, dedicated VP Treasury + 10–20 person team       │
│  Sales cycle: 6–12 months, multiple stakeholders             │
│  ⚠️ Possible expansion target — not starting point          │
├──────────────────────────────────────────────────────────────┤
│  MID-MARKET ($0.5B–$5B revenue)                              │
│  NetSuite, SAP S/4HANA, Dynamics 365 F&O, Workday, Infor    │
│  CFO handles treasury personally (no dedicated team <$500M)  │
│  Sales cycle: 1–3 months, CFO is the decision-maker         │
│  ✅ SWEET SPOT — this is where to start                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Why Mid-Market Multi-Entity Companies

### Selection criteria

Five criteria for choosing a target segment:

| # | Criterion | Question |
|---|-----------|----------|
| 1 | **Ease of building** | Can we ship a useful product in months, not years? |
| 2 | **Ease of selling** | Can we close deals in weeks/months, not years? |
| 3 | **Market size** | Is this big enough to matter? |
| 4 | **Defensibility** | Can we hold position once competitors notice? |
| 5 | **Moat potential** | Does the product get stickier over time? |

### How mid-market scores

**1. Ease of building — Good**

What's needed: a treasury with on/off-ramp, approval policies, and ERP integration. This is simpler than what large corporations require (complex ERP landscapes, advanced policy engines) but slightly harder than a pure payments product (need ledgers, approval logic, multi-entity structure).

Estimated build time for MVP:
- Treasury core (ledgers, multi-entity, approval logic): ~1–2 months
- On-ramp / off-ramp integration: ~1–2 months
- ERP integration (NetSuite, SAP S/4HANA, Dynamics 365 Finance & Operations, Workday): ~1–2 months

A working first version is achievable in a few months — not the years required for a full banking suite or the 6+ month enterprise integration cycle.

**2. Ease of selling — Best available**

Below ~$500M revenue, the CFO typically **is** the treasury manager — there's no dedicated treasury team. Even at $0.5B–$1B, treasury teams average just 3–4 FTEs (AFP benchmarking data shows ~3.9 FTEs per $1B revenue). The CFO manually reconciles cash positions across entities. They hate it.

The decision chain:

```
Mega-corp:    Treasury analyst → VP Treasury → CFO → CTO → Procurement → Board
Large:        VP Treasury → CFO → CTO review
Mid-market:   CFO (champion) → IT/CIO (security review) → CEO sign-off
              Likely also: Legal/Compliance review (especially for crypto/novel assets)
```

The CFO is the champion and primary buyer. But at this scale, IT/CIO will review security and integration, and Legal/Compliance will almost certainly be involved given the novelty of on-chain treasury. For significant expenditures ($100K+), board or audit committee visibility is likely. Still far simpler than the large enterprise decision chain, but not a single-person sale.

Standard B2B SaaS motion — not fundamentally different from selling to an importer/exporter (same CFO-led decision chain), but the pain is higher for multi-entity companies than for single-entity importers, so conversion should be better.

Sales channels: webinars, conferences, whitepapers, direct outreach. No PLG shortcut here — these are established companies, not startups signing up for free tiers. Revolut Business and Monzo were built on acquiring businesses at incorporation time; that doesn't apply here.

Deal timeline: weeks to low single-digit months. Much faster than selling to large corporations with procurement processes, but not instant.

**3. Market size — ~12,000 companies**

In the US, roughly 8,000–13,000 companies fall in the $0.5B–$5B revenue band (extrapolated from Census data and RSM segmentation, against ~200,000 companies in the $10M–$1B range per the National Center for the Middle Market). Europe adds roughly 8,000–15,000 in an equivalent range. Of those, an estimated 45–60% have genuine multi-entity international operations (not all mid-market companies operate across borders). Combined US + Europe TAM: approximately **7,600–17,550 companies**, with a mid-point of **~12,000**.

This is modest by venture scale. For context, ERP customer counts across the segment: NetSuite has 43,000+ customers (mostly below $500M), Dynamics 365 Business Central has 50,000+ (mostly SMB), Sage Intacct has ~14,000. These are broad numbers including companies outside the target segment — the multi-entity international filter narrows it significantly.

The ~12,000 figure means meaningful penetration requires either demonstrating expansion potential (downward into $100M–$500M where treasury pain is acute but budgets are smaller, or upward as the product matures) or high ARPU from the core segment. The subset with heavy emerging-market operations, volatile FX exposure, and frequent cross-border payments represents the most compelling initial wedge.

**4. Defensibility — Strong for the segment**

See competitive analysis below. The key insight: this segment sits in a gap between what big banks/TMS vendors serve (too expensive for these companies) and what multi-sig wallets offer (no ERP integration, no treasury logic). Occupying this gap first creates a defensible position.

**5. Moat potential — Standard B2B SaaS + financial infrastructure**

Once installed, the product becomes hard to rip out:
- All entity accounts, signers, and policies are configured
- Bank details are distributed to counterparties
- ERP integration is wired into month-end close processes
- Historical transaction data lives in the system

Same switching cost dynamics as any financial infrastructure. Additionally:
- **Network effects**: If companies pay each other on-chain through the product, both sides benefit from instant, free intercompany transfers — creating incentive for CFOs to recommend it to counterparties
- **Yield products**: RWA or deposit products on idle treasury balances create retention through financial incentive
- **Monetization**: Transaction fees, FX spread on off-ramp conversions, yield margin on deposits

---

## Early Adopter Profile

### Who adopts new financial technology first?

Most likely: **tech-savvy companies** — IT/software companies, fintech-adjacent businesses, companies with technical CFOs. The same profile that adopts any new B2B SaaS tool early.

SpaceX is the most prominent example — it uses Bridge (Stripe) to collect Starlink payments in emerging markets via stablecoins, avoiding FX risk, then converts back to USD. Tech companies are comfortable with on-chain concepts, have less institutional inertia, and their CFOs are more likely to evaluate new tools independently.

### The crypto-to-mainstream gap

Current stablecoin treasury adoption is **almost entirely crypto-native**. Coinshift serves 300+ organizations managing $1B+ in Safe accounts — named customers include Aave, Starknet, Gitcoin, Biconomy, and UNI Grants. Request Finance serves 2,300+ businesses processing $1.3B+ lifetime volume, with 88–90% of payments in stablecoins — named customers include The Sandbox, MakerDAO, The Graph, Polygon Foundation, and Decentraland.

**No documented case exists of a traditional mid-market company ($0.5B–$5B) adopting these tools for corporate treasury.** Coinshift has notably pivoted toward issuing csUSDL, a yield-bearing stablecoin that hit $100M TVL within four months — suggesting even the leading crypto treasury platform found more traction in DeFi yields than in corporate treasury management.

Broader corporate stablecoin adoption (Visa settlement pilots, Siemens using JPM Coin, SpaceX using Bridge) flows through enterprise-grade infrastructure providers like Fireblocks, not crypto-native treasury tools. Industries most likely to cross the gap first: **cross-border payments operators, companies with large distributed global workforces, firms in emerging markets facing currency volatility, and fintech/payments companies** already building on stablecoin rails.

This gap is the product's central challenge. The strategy needs a concrete theory for why traditional mid-market CFOs would adopt — regulatory clarity (GENIUS Act), FX cost savings, and real-time visibility may not individually overcome the inertia of existing bank relationships and ERP-integrated treasury workflows. But in combination, for companies with painful cross-border corridors, the value proposition may be compelling enough.

The likely starting subsegment: **CFOs of tech companies in the $0.5B–$5B revenue range with operations in 2+ countries, especially those with significant emerging-market exposure.**

---

## Competitive Landscape

Six categories of potential competitors, assessed by likelihood and risk:

### 1. Fintechs (Revolut Business, Wise Business, Mercury, etc.)

**Risk: Low**

Fintechs are built on traditional payment rails. They can add stablecoin payments (and will), but building multi-entity treasury management with on-chain wallets, approval policies, and ERP integration is a fundamentally different product.

They don't have:
- Multi-entity treasury architecture
- On-chain wallet management with signing policies
- ERP integration depth for treasury use cases

They'll serve single-entity importers/exporters well. Multi-entity on-chain treasury is outside their core competency.

### 2. Large banks with blockchain initiatives (JPMorgan Kinexys, Citi, etc.)

**Risk: Medium**

JPMorgan's Kinexys (formerly the Onyx division, rebranded November 2024; JPM Coin is a specific product within it) and similar institutional blockchain solutions are real and growing fast — Kinexys processes $3T+ cumulative volume, $5B+ daily. Citi Token Services targets "some of its largest global clients" — named adopters include Mars, Inc. and Maersk. But they are **firmly positioned for large institutional clients** and are not currently accessible to mid-market companies as standalone customers.

JPMorgan's JPMD deposit token is "available only to approved-listed entities that are institutional customers of J.P. Morgan." Citi runs on a private permissioned blockchain requiring no new tech from clients but requires an existing Citi institutional banking relationship. Named Kinexys customers include Siemens, BlackRock, Ant International, and Corpay. Pricing for both is completely opaque — bespoke and relationship-based.

**Indirect mid-market access is emerging but distant.** Corpay (S&P 500) uses Kinexys rails for cross-border FX conversions serving its own mid-market client base. The Cari Network (a consortium of Huntington, First Horizon, M&T Bank, KeyCorp, and Old National) is building tokenized deposit infrastructure for regional banks. BMO announced plans in March 2026 to extend tokenized deposits to broader B2B payments. The trajectory points toward downstream mid-market accessibility by 2027–2028, but today the mid-market is effectively locked out of direct access.

**Why medium risk, not high:**
- They'll focus on their existing large client base first (upmarket, not down)
- Their solutions are expensive, opaque, and require existing institutional banking relationships
- The same tiering that exists in ERP will exist here — they'll serve the top, leaving mid-market underserved
- Downstream access via intermediaries (Corpay, regional banks) is coming but is years away

**How to defend:** Be the standardized, self-service, affordable tier — while they serve the institutional top.

### 3. Payment rails and off-ramp/on-ramp providers (Bridge/Stripe, Thunes, CurrencyCloud, etc.)

**Risk: Low to Medium**

Two sub-categories:

**Blockchain rails (Tempo, Solana, etc.):** Infrastructure providers. Historical precedent: Visa and Mastercard never successfully built end-user banking products. Rail providers will focus on institutional partnerships, not end-user treasury products. They may sell to megacorps building in-house banks, but not to the mid-market segment.

**Off-ramp/on-ramp providers (Bridge, Thunes, CurrencyCloud, etc.):** All three operate B2B infrastructure models and do not sell directly to mid-market companies for their own payment needs:

- **Bridge (Stripe)** follows a developer-first API model, selling to fintechs and enterprises building stablecoin-powered products. Named customers: SpaceX, Coinbase, Airtm, Phantom.
- **Thunes** operates a "Network Members" model, selling to financial institutions, PSPs, gig platforms, and MTOs. Members include Uber, Deliveroo, Grab, WeChat. Coverage: 130+ countries, 80+ currencies.
- **CurrencyCloud (Visa Cross-Border Solutions)** targets banks, fintechs, and FX brokers. Visa is consolidating all money movement brands under a relaunched "Visa Direct" umbrella.

They have the payments piece but would need to build all the treasury management, approval policies, and ERP integration from scratch. That's a different competency.

**How to defend:** These providers become your infrastructure partners, not competitors. You build on top of their APIs.

### 4. ERP vendors (Oracle/NetSuite, SAP, Microsoft, Workday, Infor, etc.)

**Risk: Medium**

ERP vendors will logically want to upsell treasury capabilities to their existing customer base. They have the relationship, the data, and the integration.

**Why they probably won't succeed quickly:**
- Their products are already massively complex legacy systems
- Adding a new, technically sophisticated capability (blockchain, on-chain wallets, stablecoin management) to a legacy ERP is slow
- Historical pattern: ERPs always try to absorb adjacent functionality, and specialized tools keep winning because ERP-native versions are mediocre
- The TMS market exists precisely because ERPs couldn't do treasury well enough

**How to defend:** Same playbook as any ERP-adjacent software — better UX, faster iteration, deeper specialization. Build excellent ERP integration so you're the complement, not the replacement.

### 5. Treasury Management Systems (Kyriba, GTreasury, ION, etc.)

**Risk: Medium to High**

TMS vendors are the most natural competitors. They already understand treasury, they have bank connectivity, and Ripple's $1B acquisition of GTreasury signals that blockchain-TMS convergence is coming.

**Why the risk is manageable:**
- TMS solutions target large corporations — enterprise deployments run $100K–$500K+ annually (on-premise implementations can reach $500K–$2M+ upfront), with total cost of ownership averaging ~$646K over five years. Mid-market cloud TMS options exist at $40K–$100K/year but are still expensive for this segment
- They don't serve the mid-market segment today because it's not worth their sales effort at current price points
- Adding stablecoin/on-chain capabilities to existing TMS platforms requires significant re-architecture
- They'll focus on upselling to existing customers first, then expanding — not moving downmarket immediately

**How to defend:** Occupy the underserved lower tier. Be affordable, easy to set up (days to weeks, not months), and self-service. By the time TMS vendors look downmarket, you've built switching costs through ERP integration and transaction history.

**Critical development:** In January 2026, Fireblocks acquired **TRES Finance for $130M** specifically to bridge blockchain infrastructure and enterprise financial systems. TRES converts blockchain activity into structured financial records compatible with ERP systems and general ledgers, serving 230+ clients including PwC and a16z. Before this acquisition, no major custody provider offered native ERP integration. Fireblocks also has a $699/month starter plan (including $1M outbound volume) and 1,800+ customers — making it the most accessible institutional provider for mid-market companies. This means **ERP integration is no longer an uncontested differentiator** — the question becomes whether to partner with Fireblocks for custody/MPC and compete on the treasury management layer, or build a fully integrated stack.

### 6. Multi-sig wallets (Safe, Squads, etc.)

**Risk: Low to Medium**

**Safe** has made an aggressive enterprise push — $100B+ in secured assets, $600B in 2025 transaction volume, $10M+ annualized revenue (5x YoY growth). Safe Labs GmbH was established in October 2025 as a dedicated commercial subsidiary. Treasury features now include role-based access, spending limits, transaction simulation (Safe Shield), batching, and multi-chain team collaboration. Major enterprise adopters include the Ethereum Foundation (~$650M treasury), Circle ($2.5B USDC), Ledger, and Bitpanda. Safe is targeting $100M ARR by 2030. However, its features remain DAO/protocol-oriented — no native cash forecasting, FX hedging, bank connectivity, or ERP integration.

**Squads** operates four products sharing a single smart account primitive: Multisig ($10B+ secured, 350+ teams on Solana), Altitude (stablecoin business accounts), Fuse (consumer wallet), and Grid (developer APIs with ACH/Wire/SEPA/SWIFT across 100+ countries). The strategy is broad rather than unclear, but four simultaneous products across very different market segments is ambitious for a $17.2M-funded startup, and the Solana-only limitation constrains addressable market vs. Safe's multi-chain approach.

Neither has ERP integration or full corporate treasury capabilities (cash forecasting, intercompany netting, cash position reporting).

**Why the risk is manageable:**
- Neither has ERP integration — a completely different domain from on-chain wallet management
- Their current focus is crypto-native users (DAOs, protocols), not traditional businesses
- Building treasury management logic for mid-market CFOs (multi-entity ledgers, compliance, bank connectivity) is outside their competency
- Safe's TRES-like capabilities would need to come via partnerships or acquisitions

**How to defend:** Be first to market with the combination of on-chain wallets + treasury logic + ERP integration. The combination is the moat, not any single piece.

### Competitive landscape summary

| Competitor type | Risk | Why | Defense |
|----------------|------|-----|---------|
| **Fintechs** | Low | Can't do multi-entity on-chain treasury | Different product category |
| **Big banks (Kinexys, etc.)** | Medium | Will focus on large/megacorp first | Be the affordable, standardized tier |
| **Payment rails / off-ramp providers** | Low–Medium | Different competency (payments, not treasury) | Use them as infrastructure partners |
| **ERP vendors** | Medium | Legacy systems, slow to add new capabilities | Better UX, faster iteration, specialization |
| **TMS vendors** | Medium–High | Most natural competitor, but expensive and upmarket | Occupy underserved lower tier, easy setup |
| **Multi-sig wallets (Safe, Squads)** | Medium | Safe is aggressive ($100B+ AUC, enterprise push) but no ERP integration or bank connectivity | Full combination of treasury + ERP + on/off-ramp |

---

## What to Build

### The product in one sentence

On-chain treasury management for mid-market multi-entity companies — with ERP integration, approval policies, and on/off-ramp built in. Easy to set up, easy to use, no dedicated treasury team required.

### Core product requirements

| Component | What it does | Why it matters |
|-----------|-------------|----------------|
| **Multi-entity treasury** | One treasury, multiple wallets (one per legal entity), each with its own signers and policies | Maps to how these companies are structured |
| **Approval policies** | Per-entity signing rules, approval thresholds, role-based access | CFO needs control without complexity |
| **On-ramp / off-ramp** | Virtual accounts for fiat in, linked bank accounts for fiat out | Bridge between traditional banking and on-chain |
| **ERP integration** | Real-time sync with NetSuite, SAP S/4HANA, Dynamics 365 Finance & Operations, Workday | The killer differentiator vs. multi-sig wallets — CFO sees on-chain treasury as just another bank account |
| **Intercompany transfers** | Instant, free USDC transfers between entity wallets | The core value proposition — bypass SWIFT for cross-entity payments |
| **Simple onboarding** | Set up in days to weeks, not months | Why they can't use TMS (too expensive, too slow) |

### What makes this defensible

The moat is not any single feature — it's the **combination**:

```
Multi-sig wallets       On-chain wallets ✓   Signing policies ✓
(Safe, Squads)          ERP integration ✗    Treasury logic ✗
                        Bank connectivity ✗   Affordable ✓

TMS vendors             Treasury logic ✓      ERP integration ✓
(Kyriba, GTreasury)     Bank connectivity ✓   On-chain wallets ✗
                        Affordable ✗

MPC custody             On-chain wallets ✓   ERP integration ✓ (Fireblocks/TRES)
(Fireblocks)            Treasury logic ✗     Affordable ⚠️ ($699/mo starter)
                        Mid-market focus ✗

This product            On-chain wallets ✓   Signing policies ✓
                        Treasury logic ✓      ERP integration ✓
                        On/off-ramp ✓         Affordable, self-service ✓
                        Mid-market focus ✓
```

> **Note:** Fireblocks' TRES acquisition (January 2026) means ERP integration alone is no longer an uncontested differentiator. The strategic question is whether to partner with Fireblocks for custody/MPC and compete on the treasury management layer, or build a fully integrated stack.

### Product principles

- **Set up in days, not months** — the reason TMS doesn't serve this segment is complexity and cost
- **CFO-friendly interface** — not a crypto product, a treasury product that happens to use stablecoins
- **Real-time ERP sync** — the CFO should see on-chain balances in their existing dashboard, not a separate portal
- **Training built in** — video walkthroughs, clear documentation, guided setup. These are not crypto-native users
- **Standard integrations** — pre-built connectors for the ERP systems this segment actually uses (NetSuite, SAP S/4HANA, Microsoft Dynamics 365 F&O, Workday, Infor)

---

## Research Findings and Open Questions

Six areas were investigated. Key findings and remaining unknowns:

| # | Question | Finding | Status |
|---|----------|---------|--------|
| 1 | **Market sizing** | ~12,000 target companies in US + Europe (mid-point of 7,600–17,550 range). Modest by venture scale — requires high ARPU or segment expansion. | Answered (validate with S&P Capital IQ / D&B) |
| 2 | **Early adopters** | Current stablecoin treasury users are almost entirely crypto-native (DAOs, protocols). No documented case of a traditional mid-market company adopting these tools. Cross-border-heavy tech companies are the most likely bridge. | Answered — gap is the central challenge |
| 3 | **Bank blockchain products** | Kinexys and Citi Token Services serve only large institutional clients. Mid-market locked out of direct access. Indirect access via intermediaries (Corpay, regional bank consortia) emerging but 2027–2028 timeline. | Confirmed — not a near-term competitor for mid-market |
| 4 | **Off-ramp/on-ramp providers** | Bridge, Thunes, CurrencyCloud all operate B2B infrastructure models. They sell to fintechs, banks, and platforms — not to mid-market companies directly. | Confirmed — infrastructure partners, not competitors |
| 5 | **MPC/custody and ERP** | Fireblocks acquired TRES Finance ($130M, Jan 2026) for ERP integration. $699/month starter plan, 1,800+ customers. ERP integration gap is now being addressed by incumbents. Other custody providers (Copper, Anchorage, Hex Trust) still lack ERP integration. | Answered — Fireblocks is a real competitive factor |
| 6 | **Custodial vs. self-custodial** | Mid-market companies will almost certainly demand custodial or hybrid MPC-based models. Self-custody requires specialized hardware, facilities, and personnel that mid-market treasury teams (3–4 FTEs) cannot support. Post-FTX, institutions prefer regulated third-party custodians. OCC Letter 1184 (May 2025) reaffirms banks' authority to provide crypto custody. A custodial or hybrid-custody model with a regulated partner is likely a prerequisite, not an option. | Answered — custodial/hybrid MPC required |

---

## Summary

**Target segment:** Mid-market multi-entity companies ($0.5B–$5B revenue, 2+ countries, using NetSuite/SAP S/4HANA/Dynamics 365 F&O/Workday). Tech companies with emerging-market exposure first as early adopters. TAM: ~12,000 companies in US + Europe.

**Why this segment:**
- **Buildable** — Treasury + on/off-ramp + ERP integration, shippable in months
- **Sellable** — CFO is the champion, standard B2B SaaS sales motion, 1–3 month deal cycles
- **Defensible** — Sits in gap between expensive TMS (too complex) and multi-sig wallets (no ERP/treasury logic)
- **Sticky** — Financial infrastructure with high switching costs, network effects from on-chain intercompany payments

**What to build:** An affordable, self-service on-chain treasury with multi-entity support, approval policies, on/off-ramp, custodial/hybrid MPC custody, and deep ERP integration. Set up in days, not months. CFO-friendly, not crypto-native.

**Central challenge:** No traditional mid-market company has adopted stablecoin treasury tools yet. Current adoption is entirely crypto-native. The product must bridge this gap — likely through companies with painful cross-border corridors where the FX cost savings and real-time visibility are compelling enough to overcome inertia.

**Primary competitive threats:** TMS vendors moving downmarket (medium-high risk), and Fireblocks expanding from custody into treasury management with TRES acquisition (medium risk). Defense: occupy the underserved mid-market first with a standardized, affordable product and build switching costs before incumbents arrive.

---

*This is Part 8 of an 8-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **Product Strategy** — What to build, for whom, and why *(this document)*
