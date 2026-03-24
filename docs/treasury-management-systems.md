# Treasury Management Systems

What TMS platforms actually do, how they work, why they're painful to adopt, and what this means for on-chain treasury.

*Part 3 of a 4-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Where TMS Fits in the Stack

In the enterprise financial stack, three layers work together:

```
┌─────────────────────────────────────────────────────┐
│                    ERP                               │
│  (SAP, Oracle, NetSuite, Microsoft Dynamics)         │
│  System of record — general ledger, accounting,      │
│  consolidation, reporting                            │
├─────────────────────────────────────────────────────┤
│                    TMS                               │
│  (Kyriba, ION Treasury, HighRadius, GTreasury,       │
│   Trovata)                                           │
│  Sits between ERP and banks — cash visibility,       │
│  forecasting, FX, payment routing                    │
├─────────────────────────────────────────────────────┤
│                   Banks                              │
│  (JPMorgan, HSBC, Citi, local banks...)              │
│  Execution layer — holds money, processes payments,  │
│  generates statements                                │
└─────────────────────────────────────────────────────┘
```

In practice, boundaries blur. ERP vendors (SAP, Oracle) have their own treasury modules. TMS vendors add accounting-like features. But the typical enterprise setup is: **ERP as system of record**, **TMS for treasury operations**, **banks for execution**.

---

## What a TMS Actually Does

### 1. Bank connectivity

The foundational — and hardest — part. A TMS connects to banks to pull in data and push out payments.

**How connections work:**

| Method | How it works | Coverage | Quality |
|--------|-------------|----------|---------|
| **SFTP file exchange** | Banks generate statement files (MT940, BAI2, CAMT.053); TMS pulls them on a schedule | Most banks globally | Batch — typically once per day |
| **Open Banking APIs** | Direct API connections to banks (PSD2 in Europe, emerging in US) | Strong in Europe, limited elsewhere | Near real-time where available |
| **SWIFT** | Standardized messaging network for cross-border banking (FIN for individual messages, FileAct for batch files) | Global | Message-by-message delivery; GPI delivers 50% of payments within 30 minutes |
| **Host-to-host** | Direct proprietary connections to specific banks | Large banks only | Varies |

**The reality:** SFTP file exchange remains the most prevalent protocol, especially in the US, though SWIFT, EBICS (standard in Germany/Austria/Switzerland/France), and Open Banking APIs are growing. In practice, most connections still rely on **SFTP file exchange** — banks generate files once per day, the TMS downloads and parses them. This means:

- Data is always **at least hours old**, often a full day behind
- Files come in **different formats** (MT940 in Europe, BAI2 in the US, CSV as fallback) that need normalization. Note: SWIFT is actively migrating from MT formats to ISO 20022 (CAMT.053), with MT940 being phased out
- Connections **break regularly** — format changes, authentication issues, bank-side outages
- Each new bank connection requires **custom integration work**

The leading TMS platforms maintain **9,000–10,000+ bank connections**. This connectivity library is their core moat — building it took years of painful, manual integration work.

### 2. Cash visibility

Once bank data is ingested, the TMS provides dashboards showing:

- Balances by bank, by account, by entity, by currency
- Consolidated cash position across the entire group
- Historical balance trends
- Intraday position updates (available from major banks via MT942/CAMT.052 formats, updating every 15 minutes to a few hours; less common from smaller banks)

This sounds simple, but for a company with 50–200 bank accounts across 15–30 banks in 20+ countries, just **seeing all your money in one place** is genuinely valuable and surprisingly hard to achieve without a TMS.

### 3. Cash flow forecasting

Using historical transaction data plus inputs from FP&A and AP/AR systems, the TMS projects future cash positions:

- Short-term (daily/weekly) — "Do we have enough cash in each account for this week's payments?"
- Medium-term (13-week rolling) — Standard treasury planning horizon
- Long-term (quarterly/annual) — Aligned with FP&A budget cycles

**Why this matters:** If the forecast shows a surplus in one entity and a deficit in another, treasury can proactively move money. Without forecasting, they discover shortfalls reactively — often when a payment fails.

### 4. FX risk management

For multinationals, the TMS helps model and manage currency exposure:

- Identify exposures across entities and currencies
- Model hedging scenarios (forward contracts, options)
- Track hedge positions and effectiveness
- Generate reports for hedge accounting compliance (ASC 815 / IFRS 9)

### 5. Payment routing

Since the TMS has connectivity to banks, it can also route outbound payments:

```
Purchase order created in ERP
        │
        ▼
Payment instruction sent to TMS
        │
        ▼
TMS applies approval workflow
        │
        ▼
TMS routes to optimal bank via connectivity layer
        │
        ▼
Bank executes payment
```

This centralizes payment execution and gives treasury visibility into all outbound payment flows.

---

## The Competitive Landscape

### Market leaders

| Product | Strength | Market position |
|---------|----------|----------------|
| **Kyriba** | Cash visibility — best bank coverage globally (9,900+ banks); dominant in standalone cloud TMS (~70% by installations) | Leader in standalone TMS |
| **ION Group** (Wallstreet Suite, Reval, IT2, Openlink) | FX risk management — strongest modules for currency trading and hedging | Largest overall TRM market share (~8.5% across full portfolio) |
| **HighRadius** | Primarily an AR/order-to-cash automation platform (Gartner MQ Leader 3 years running); treasury module includes AI-driven cash forecasting | $3.1B valuation; growing into treasury from AR strength |
| **GTreasury** | Pioneered the treasury workstation concept (founded 1986); modernized with SaaS, AI, APIs; acquired by Ripple for $1B (October 2025) | Established player with modern refresh |
| **Trovata** | Open Banking-first architecture (founded 2016) — built natively on wholesale banking APIs with direct partnerships (JPMorgan, Wells Fargo, Citi, HSBC) | Genuinely newest entrant; targeting companies underserved by legacy TMS |

### ERP-bundled treasury

ERP vendors sell their own treasury modules alongside the core product:

- **SAP Treasury and Risk Management** — deep integration with SAP S/4HANA; strong for SAP-centric enterprises
- **Oracle Cash Management** — part of Oracle Cloud ERP; good for Oracle shops
- **NetSuite Cash Management** — basic treasury features for mid-market

These bundled modules are convenient if you're already on the ERP, but generally less capable than standalone TMS platforms for complex treasury operations.

### Key differentiators

All TMS platforms do roughly the same things. They differentiate on:

1. **Bank connectivity coverage** — number and quality of bank integrations (Kyriba leads here)
2. **FX capabilities** — depth of hedging, trading, and risk modeling (ION Treasury leads)
3. **Forecasting intelligence** — AI/ML for cash flow prediction (HighRadius strong here, coming from AR/O2C expertise)
4. **UX and implementation speed** — modern interface, faster time-to-value (Trovata leads; GTreasury modernizing; newer SaaS players like Atlar target 4–6 week implementations)
5. **ERP integration depth** — how well they connect to specific ERPs

---

## Why Most Companies Don't Use One

Despite the value TMS platforms provide, **~67% of finance teams still rely heavily on spreadsheets and manual processes** (IMA survey) — often using Excel alongside other tools rather than exclusively, but with significant manual work remaining.

### The adoption barrier

| Factor | Reality |
|--------|---------|
| **Cost** | Legacy TMS: $400K–$1M+ for complex global deployments; median Kyriba buyer pays ~$23K/year for software (enterprise deployments $100K+/year). Modern SaaS alternatives (Trovata, Atlar) are significantly cheaper |
| **Implementation time** | Legacy TMS: 6–18 months (realistic 12–18 months for complex deployments). Modern SaaS: weeks to 90 days |
| **Where the money goes** | ~80% of cost is consulting, integration, and training — not software |
| **What takes time** | Bank connectivity setup, data normalization, testing feeds, user training |
| **ROI justification** | Hard to tie directly to revenue or cost savings — it's an operational efficiency play |

### Why it's a hard sell

Treasury teams struggle to justify TMS investment to CFOs because:

1. **No direct revenue impact** — "We'll see our cash balances faster" doesn't move the needle like "We'll save $2M in FX costs"
2. **Massive upfront commitment** — 12–18 months of implementation before any value is delivered
3. **Ongoing maintenance** — Bank connections break, formats change, new banks need to be added
4. **The Excel alternative works** — It's painful and slow, but it works. Most treasury teams have developed muscle memory around manual processes

### Who does buy

Companies most likely to adopt a TMS:

- **Large FX exposure** — Currency risk makes the hedging and modeling modules worth it
- **High payment volume** — Companies constantly moving money between entities (capital-intensive businesses)
- **Regulatory pressure** — SOX compliance, audit requirements that demand better controls
- **Post-M&A complexity** — Multiple ERPs, multiple banking setups that need unification

### What would change adoption

If a TMS could be delivered at **$2K–$10K/month** with setup in **days instead of months**, adoption would be dramatically higher. The product itself isn't the problem — the deployment model is. But the deployment model is driven by the underlying connectivity challenge: each bank integration is custom work that can't be eliminated, only amortized across customers.

---

## The Connectivity Problem Is the Whole Business

Here's the uncomfortable truth about TMS: **80% of the value and 80% of the cost is bank connectivity**. Everything else — the dashboards, the forecasting, the FX modeling — is straightforward software that any competent team could build.

The business model works like this:

1. **Build connectivity to thousands of banks** (years of work, massive operational overhead)
2. **Amortize that investment across many customers** (economy of scale on integrations)
3. **Layer software features on top** (the easy part)

But even with amortization, connectivity is fragile:

- Banks change file formats without warning
- SFTP endpoints go down
- New customers need banks that aren't yet integrated
- Custom bank connections are needed for local banks in emerging markets

This creates a business with a **large services component** — it's not pure SaaS. Implementation teams are constantly doing integration work, not just configuring software.

### NPS and satisfaction

TMS platforms generally have **mixed user satisfaction** (G2 and Capterra reviews show recurring complaints). Users complain about:

- Outdated interfaces (legacy systems built 10–20 years ago)
- Data that's not truly real-time (because bank feeds are batch)
- Integrations that break and require vendor support to fix
- Slow response times for adding new bank connections

The newer entrants (GTreasury, Trovata) are better on UX, but the underlying connectivity challenge remains the same for everyone.

---

## The Family Office Parallel

**Family offices** face a remarkably similar problem. A wealthy individual's family office is essentially a small corporation managing:

- Multiple bank accounts across countries
- Investment portfolios at various custodians
- Real estate holdings
- Business interests and equity stakes

The same data aggregation challenge applies — pulling financial data from many sources into one view. Family office software (Addepar, Masttro, PCR) struggles with the same connectivity issues as enterprise TMS, just at a smaller scale.

---

## Implications for On-Chain Treasury

### What crypto can't solve

A stablecoin-based treasury **does not replace TMS connectivity to traditional banks**. Companies will continue to have bank accounts, and those bank feeds still need to flow into their accounting and treasury systems. Building a bank connectivity layer is a separate, established business that's not worth entering.

### What crypto can solve

An on-chain treasury account becomes **one more data source** that flows into the existing stack — but a fundamentally better one:

| Dimension | Traditional banking (range) | On-chain treasury |
|-----------|---------------------------|-------------------|
| **Data freshness** | End-of-day statements (baseline); intraday updates every 15 min–few hours from major banks; near real-time via APIs (growing) | Real-time, continuous |
| **Data formats** | MT940, BAI2, CAMT.053, CSV — varies by bank and region | Standardized API |
| **Integration effort** | Custom integration per bank | One integration for all accounts |
| **Settlement speed** | Ranges widely: ACH 1–3 days, SWIFT GPI 50% within 30 min, Fedwire/RTP/FedNow instant | Settlement in seconds |
| **Fee transparency** | Intermediary fees, opaque FX spreads | Transparent, minimal fees |
| **Availability** | Generally banking hours; real-time rails (FedNow, RTP) are 24/7 but adoption is still growing | 24/7/365 |

### How it needs to integrate

For enterprises to adopt on-chain treasury, it **must integrate seamlessly with existing systems**:

1. **ERP integration** — Transactions on stablecoin accounts must flow into SAP, Oracle, NetSuite as standard accounting entries
2. **TMS integration** — On-chain balances and transactions must appear in Kyriba, ION Treasury, etc. alongside traditional bank data
3. **Export formats** — Must be able to generate MT940, BAI2, CAMT.053 files for systems that consume them
4. **API-first** — Real-time APIs for systems that can consume them directly

An on-chain treasury that lives in isolation from the existing financial stack is useless to enterprises. It needs to be **just another account** that the CFO sees in their existing dashboards — but one that happens to be instant, transparent, and programmable.

The positioning is not "replace your banks" but rather: **a global digital treasury account** — one more account alongside your traditional bank accounts, but one where all your entities are visible, stablecoin holdings are clear, transfers are instant, and the data feeds into your existing ERP and TMS in real-time with zero integration overhead.

---

*This is Part 3 of a 4-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **Treasury Management Systems** — What TMS platforms do and why they're hard to adopt *(this document)*
4. **Crypto Treasury** — How stablecoins and on-chain infrastructure change the game for enterprise finance
