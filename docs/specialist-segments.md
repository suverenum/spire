# Specialist Segments

Why importers/exporters, emerging-market businesses, and crypto companies are weaker segments for on-chain treasury — and what that means for product strategy.

*Part 7 of an 11-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Three Specialist Segments

Previous lectures established that the strongest segment for on-chain treasury is **multi-entity multinational corporations** moving money between subsidiaries. But there are three other segments that look appealing on the surface. This lecture examines each one and explains why none of them is a strong primary target.

| Segment | Core need | Why it looks attractive |
|---------|-----------|----------------------|
| **Importers & exporters** | B2B cross-border payments | Broken SWIFT corridors, high fees |
| **Emerging-market businesses** | Dollar access, stable currency | Volatile local currencies, capital controls |
| **Crypto-native companies** | Bank account + compliance | Most banks refuse to onboard them |

---

## Segment 1: Importers & Exporters

### The problem they have

Importers and exporters deal with the same broken payment corridors discussed in [Part 6](./payment-corridors.md) — Europe/US to Latin America, Africa, Asia. The problems are real:

- **SWIFT is slow** — Cross-border payments through correspondent banking take days
- **Costs are high** — Not just the wire fee itself, but the FX markup. World Bank data (Q1 2025) puts the global average cost of sending $200 through banks at 14.55%, with Sub-Saharan Africa averaging 8.4%. Typical bank-to-bank costs to emerging markets run 6–15% for small transactions, dropping to 2–7% for larger B2B amounts. Enterprise stablecoin users with direct mint-and-burn relationships achieve 0.5–3% all-in, though SMBs going through exchanges face 2–5% when including on/off-ramp fees and FX conversion
- **Access is limited** — In some countries, businesses have difficulty converting local currency to USD due to capital controls and banking restrictions

### What they actually need

Importers and exporters don't need complex treasury management. They need a **B2B payment rail on stablecoins**:

| Need | Priority |
|------|----------|
| B2B stablecoin payments | **Critical** — this is the entire value proposition |
| On-ramp / off-ramp | **Critical** — must bridge fiat and stablecoins both ways |
| Accounting integration (QuickBooks, Xero) | **High** — they need transactions in their books |
| Basic account security | **Medium** — Ledger-level protection, not complex multi-sig |
| Cards, expense management | **Low** — they get this from their primary bank |
| Advanced approval policies | **Low** — operations are simple, not multi-entity complexity |

### Two sides of the corridor

There's a question of which leg to focus on — the sender or the receiver:

```
First World (sender)              Third World (receiver)
┌─────────────────────┐           ┌─────────────────────┐
│  European importer   │           │  Brazilian exporter  │
│                     │    ───→   │                     │
│  Has banks, has     │   USDC    │  Needs dollar access │
│  options, this is   │           │  Higher urgency      │
│  secondary tool     │           │  Fewer alternatives  │
└─────────────────────┘           └─────────────────────┘
```

**First-world side (senders/importers):** This would be a **secondary bank** for them. They already have deep, established alternatives — Wise Business (697K business customers, $185B+ cross-border volume in FY2025), Airwallex ($800M–$1B ARR, $130B+ annualized TPV), Payoneer (5M+ users, 190+ countries), plus specialized players like Convera, Corpay, Ebury, iBanFirst, and Banking Circle. They don't have a burning problem — their banks and fintechs work, just not optimally for certain corridors. Low urgency.

**Third-world side (receivers/exporters):** Higher urgency because they often lack dollar access entirely. But serving them means:
- Building in local languages
- Understanding local regulations
- Competing with 5–10 existing players who have a 2–3 year head start
- Building a full banking suite (not just payments)

### Why this segment is weak

**From the European/US side:** Not a burning problem. The cross-border B2B payments space is deep and well-established — Wise, Airwallex, Payoneer, Convera, Corpay, Revolut Business (767K business customers, $5.2B total revenue in 2025) all serve this market today. EU banks will eventually add stablecoin support, though this is a multi-year infrastructure challenge — not trivial. Société Générale-Forge took 3+ years from initial licensing to MiCA-compliant stablecoin operations. A nine-bank consortium (ING, UniCredit, CaixaBank, Danske Bank) announced in September 2025 expects launch no earlier than H2 2026. Only 17 authorized EMT issuers exist across 10 EU countries with just 25 approved stablecoins total. So the window is longer than "any day now" — but the competitive moat is still thin because the incumbent cross-border payment players are strong. **Not defensible long-term.**

**From the emerging-market side:** The need is real, but the infrastructure layer is crowded. In LATAM alone, 15+ companies compete for enterprise B2B stablecoin clients — Conduit ($10B annualized volume), Bitso ($6.5B in US-Mexico crypto remittances in 2024), Mural, Bridge/Stripe, and others. In Africa: Yellow Card, Chipper Cash (5M+ customers), AZA Finance, Flutterwave. That said, the market is not truly "saturated" — 63% of Africa's population remains unbanked, and B2B stablecoin payments represent less than 0.5% of global B2B flows. But the space is volatile: Buenbit cut 45% of staff, Lemon Cash cut 38%, Bitso laid off ~100 employees. Each country remains a small market requiring localization. **Crowded infrastructure, painful to enter.**

---

## Segment 2: Emerging-Market Businesses

### The problem they have

In countries with weak, volatile local currencies, businesses want:

1. **Access to USD** — Hold value in a stable currency
2. **Dollar-denominated banking** — Not just payments, but accounts, cards, the full stack
3. **On-ramp / off-ramp** — Convert between local currency and stablecoins

### Why it looks like an opportunity

There's genuine demand. In Argentina, over 60% of crypto users regularly convert pesos to stablecoins for dollar savings. In Venezuela, residents colloquially call stablecoin holdings "Binance dollars." A 2024 Visa survey found 47% of crypto users in emerging markets cited saving in USD as a primary motivation. Sub-Saharan Africa processed ~$54 billion in stablecoin transactions in 2024, nearly 50% of all regional crypto activity. LATAM crypto adoption grew 63% between mid-2024 and mid-2025.

### Why it's a trap

This segment pulls you toward building **full business banking**, not a treasury product. The dominant multi-country model is licensing + partnerships (not building a bank per country — dLocal serves 40+ countries through a single API using 30+ country-specific payment licenses), but even this lighter approach is complex:

| What they need | Why it's painful |
|---------------|--------------------------|
| Dollar accounts | Each country requires separate regulatory compliance — Brazil mandates local incorporation (R$2–7M capital), Nigeria requires CBN licensing (₦2B capital for payment service banks) |
| Cards | Partnership, licensing, compliance per jurisdiction |
| Full banking suite | Invoicing, payroll, expense management — the demands expand fast |
| Local language support | Per-country localization |
| Local payment methods | PIX, SPEI, M-Pesa — different per market |
| Local compliance | Payment/fintech licenses are sufficient (not full banking licenses), but still require country-by-country work. Brazil's new VASP rules (February 2026) require foreign companies to establish local entities |

The good news: you don't literally need to build a "full-stack bank" per country. Airwallex operates across 60 countries, pursuing full banking licenses only in key hubs (U.S., U.K.) while using payment licenses elsewhere. But the complexity is still significant and capital-intensive.

### Competitive landscape

The infrastructure layer is crowded (though not truly saturated — 63% of Africa remains unbanked, only 12.1% of LATAM holds digital currencies):

- **Local stablecoin fintechs** have proliferated across LATAM and Africa — Yellow Card, Chipper Cash (5M+ customers), Breet (250K+ active users in Nigeria), Lemon Cash (5M users in Argentina)
- **Global players** (Revolut, etc.) are aggressively expanding into these markets
- **Crypto exchanges** serve as savings vehicles for individuals hedging currency depreciation, but lack real business banking features (no invoicing, payroll, tax reporting, deposit insurance). Binance exited Nigeria in March 2024 after government detained executives and filed an $81.5B lawsuit
- **Payment incumbents acquiring stablecoin infra** — Stripe acquired Bridge ($1.1B, Feb 2025), Mastercard acquiring BVNK (up to $1.8B, March 2026), Visa launched Stablecoin Platform
- Each country is a separate, relatively small market with volatile local players (Buenbit cut 45% of staff, Lemon Cash cut 38%)

### The squeeze

Emerging-market banking is a **two-front war**:

```
Local players                    Global players + incumbents
(2-3 year head start,            (Revolut, Stripe/Bridge,
local knowledge,                  Mastercard/BVNK, Visa entering
local languages)                  with brand, capital, existing infra)
        ↘                      ↙
         Crowded infrastructure,
         volatile market per country
```

You'd be entering late, competing against both entrenched local players and well-funded global ones (including Stripe/Bridge, Mastercard/BVNK, and Visa) expanding downmarket.

---

## Segment 3: Crypto-Native Companies (Revisited)

[Part 5](./crypto-native-banking.md) covered how crypto companies organize their finances. Here's the strategic assessment of why they're a weak primary segment.

### The core proposition

Crypto companies face **structural, political exclusion** from mainstream banking — not just stricter KYB. A House Financial Services Committee report documented at least 30 digital asset entities losing banking access during 2022–2024 under "Operation Choke Point 2.0." The FDIC sent "pause letters" to ~24 banks requesting they halt crypto activities. AIMA data shows 98% of crypto-focused hedge funds facing account termination received no justification. Companies with pristine compliance reputations were systematically debanked.

The proposition: you onboard them when others won't, providing both banking access and specialized crypto-native financial tooling.

### Why it's fragile

| Risk | Impact |
|------|--------|
| **Small market** | Despite attractive transaction volumes, the actual number of companies is limited |
| **Hard to acquire** | Crypto companies are skeptical, well-networked, and shop aggressively |
| **Regulatory shifts** | Trump administration reversed Operation Choke Point 2.0 (rescinded SAB 121, signed GENIUS Act July 2025) — banks remain cautious, but the structural barrier is eroding |
| **Competitor policy change** | Mercury now markets to crypto companies (basic USD banking only — no stablecoin holding, no on/off-ramps, 3% foreign transaction fee). If it or others expand crypto support, customers leave |
| **Full suite demanded** | Because they've been rejected everywhere, they want everything — invoicing, cards, the works |
| **Custody is complex, not "solved"** | Safe (EVM-only, $50–100B+ AUC), Squads (Solana-only, $10B+), and Fireblocks ($8B valuation, 80+ blockchains, $200B/month) serve different markets with different technologies. Fireblocks uses MPC (multi-party computation), not multi-sig — a fundamentally different approach. The Bybit hack ($1.5B, February 2025) compromised even cold storage with multisig, proving custody security remains an active, unsolved problem. But the existence of these players means custody alone is not a differentiator |

### The real value proposition

The "compliance arbitrage" framing is too simplistic. Crypto-native companies have **genuinely distinct financial needs** that traditional banking cannot address: multi-chain treasury management, token payroll with vesting schedules, 24/7 settlement, DeFi yield management, smart contract risk monitoring, and on-chain accounting.

The problem is that even with genuine specialized needs, the business model has structural risks:

1. The debanking problem is political, not permanent — regulatory winds have already shifted
2. Specialized tooling (Coinshift, Request Finance, Superfluid) already exists for crypto-native treasury, but monetization is hard — Parcel shut down in 2025 despite processing $250M in payments, Multis was acqui-hired by Safe
3. The market is small and the full banking suite they demand is expensive to build
4. One regulatory change or competitor policy update can shift the landscape rapidly

The opportunity is real but narrow — and building for it pulls you into full-stack banking rather than focused treasury.

---

## Ranking the Segments

Comparing all three specialist segments against the core target (multi-entity corporations):

| Criteria | Multi-entity corps | Importers/Exporters | Emerging-market biz | Crypto companies |
|----------|-------------------|--------------------|--------------------|-----------------|
| **Problem severity** | High | Medium | High | High |
| **Willingness to pay** | High | Medium | Medium | High |
| **Defensibility** | Strong (complex product) | Weak (deep incumbent competition) | Weak (crowded infra + local players) | Weak (political, not structural moat) |
| **Competition** | Low (enterprise is hard) | Very high (Wise, Airwallex, Payoneer, etc.) | High (local + global incumbents entering) | High (Safe, Fireblocks + neobanks expanding) |
| **Product complexity** | Manageable (treasury) | Low (payments) | High (licensing + partnerships per country) | High (full suite + specialized tooling) |
| **Scalability** | Good (English, global) | Limited (per-corridor) | Limited (per-country) | Limited (small market) |
| **Time to revenue** | Longer | Shorter | Longer | Medium |
| **Current readiness** | Medium-term (tools serve DAOs today, not Fortune 500) | Near-term | Long-term | Near-term but narrow |

### Verdict

**None of these three segments should be the primary target.** Each has fundamental problems:

1. **Importers/exporters** — The cross-border B2B payments space already has deep, well-funded competitors (Wise, Airwallex, Payoneer, Convera, Corpay). EU bank stablecoin support is coming — not overnight (3+ year timelines), but inevitably. You're building into an established competitive landscape.

2. **Emerging-market businesses** — The infrastructure layer is crowded, but the business banking layer has enormous unmet demand (63% of Africa unbanked). The issue isn't market size — it's that serving it requires per-country licensing, local partnerships, localization, and increasingly a full banking suite. Payment incumbents (Stripe/Bridge, Mastercard/BVNK) are entering with billions in capital.

3. **Crypto companies** — The debanking problem is real and political, not mere compliance arbitrage. Crypto companies have genuine specialized needs (multi-chain treasury, token payroll, 24/7 settlement). But the regulatory winds are shifting (GENIUS Act, SAB 121 rescinded), the market is small, and existing tooling has struggled to monetize.

**Important caveat on multi-entity corps:** This is a compelling **medium-term** opportunity, not today's proven market. Current on-chain treasury tools (Coinshift, Request Finance, Superfluid) primarily serve DAOs and crypto-native companies. Parcel shut down in 2025, Multis was acqui-hired. 56% of corporates want stablecoin solutions embedded in existing treasury platforms, and ~70% demand ERP integration — capabilities no on-chain tool offers yet. Traditional TMS platforms like Kyriba (3,400 clients, $15T in annual payments) are deeply entrenched. But validation signals are strong: 23% of large-company CFOs plan treasury crypto use within 2 years (39% among $10B+ revenue), and Ripple's $1B acquisition of GTreasury (October 2025) confirms blockchain-TMS convergence is coming.

---

## What's Worth Keeping

### European importers as a stepping stone

There may be a **tactical** (not strategic) play: European importers who need to pay suppliers in emerging markets could use a simple stablecoin payment product as a **secondary bank**.

What this looks like:

| Feature | Notes |
|---------|-------|
| Simple treasury (fewer features than enterprise product) | No complex approval policies needed |
| B2B stablecoin payments | Core use case |
| Basic account security | Ledger or simple signing, not multi-sig |
| On-ramp / off-ramp | SEPA in, local currency out |
| Accounting sync | QuickBooks, Xero integration |

This should **not** be the target segment. But it could serve as:
- An early validation of the payment infrastructure
- Revenue while building the enterprise product
- A way to test corridors and off-ramp providers

The moment it starts requiring cards, full banking suite, or local-language support — stop. That's scope creep into an indefensible market.

### Market context: stablecoin B2B payments are real but early

The underlying market is growing fast from a tiny base:

- Total stablecoin supply exceeded **$300 billion** (135% increase from 2024), with on-chain transfer volume hitting **$33 trillion** in 2025
- B2B stablecoin payments are at **$226 billion annualized** with **733% year-over-year growth**
- But this is still **less than 0.5%** of global B2B flows
- **75% of CFOs** have no immediate plans to use digital money (Bain & Company, October 2025)
- The defining trend is payment incumbents acquiring stablecoin infrastructure: Stripe/Bridge ($1.1B), Mastercard/BVNK ($1.8B), Ripple/GTreasury ($1B), Visa Stablecoin Platform ($225M+ settled)

The opportunity is real — but it's rapidly consolidating around payment giants, which makes it harder for startups to compete on the payments layer alone.

### The pattern across all specialist segments

Every specialist segment, when examined closely, reveals the same dynamic:

> The businesses that most need stablecoin access are the ones that require the **most** surrounding infrastructure (full bank, cards, invoicing, local compliance). And that infrastructure is exactly where incumbents have the strongest advantage.

The right strategy is to serve businesses where the **treasury product itself** is the value — not the banking suite around it. That points back to multi-entity corporations, where the complexity of managing money across entities and jurisdictions is the actual problem, and where a focused treasury product (not a full bank) is what's needed. This is a medium-term bet — current tooling serves crypto-native orgs, not Fortune 500 — but the convergence signals (Ripple/GTreasury, 23% of large-company CFOs planning crypto treasury use) are the strongest in the market.

---

*This is Part 7 of an 11-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **Specialist Segments** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets *(this document)*
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **[MPC 101](./mpc.md)** — Multi-Party Computation, threshold signatures, and custody architecture
10. **[Security Architecture](./cosigner-security-models.md)** — Defense-in-depth security for a blockchain treasury app
11. **[Custody Models](./custody.md)** — Custodial vs. self-custodial, regulatory implications, and the path to licensed custodian
