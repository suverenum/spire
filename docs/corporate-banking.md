# Corporate Banking

How large corporations manage their finances — team structures, tooling, and pain points at scale.

*Part 2 of a 5-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Three Tiers of Corporate Finance

Large corporations aren't all the same. Their financial operations vary dramatically based on scale:

| Tier | Revenue | Examples | Mode of operation |
|------|---------|----------|-------------------|
| **Mid-market** | $0.5B–$5B | Crocs, Duolingo, Etsy | Heroic manual mode — all functions exist but much is still done by hand |
| **Large enterprise** | $5B–$50B | Autodesk, Under Armour, Rivian | Dedicated treasury infrastructure — specialized teams with professional tooling |
| **Mega-corporation** | $50B+ | Walmart, Microsoft, Disney | In-house mini-bank — centralized payment factory with direct connections to payment networks |

---

## Tier 1: Mid-Market ($0.5B–$5B)

### The setup

- **2–10 banks** across multiple countries (2–5 for domestic companies, 5–10 for internationally active ones)
- **ERP system** (typically NetSuite, SAP Business One/ByDesign, or Microsoft Dynamics 365) as the accounting backbone
- **No dedicated treasury function below ~$1B revenue** — the CFO handles treasury personally; by $2B+, a small treasury team typically exists

### The finance team

Industry benchmarks show ~79 finance FTEs per $1B revenue. At $500M that's ~40 people; at $3–5B it can be 200–400. The table below reflects the lower end (~$500M–$1B):

| Function | Size | What they do |
|----------|------|-------------|
| **VP Controller / Accounting** | 5–10 people | Accountants assigned per jurisdiction (each knows local tax rules), consolidate reporting in ERP, file taxes |
| **FP&A** (Financial Planning & Analysis) | 3–5 people | Build financial models, work with product teams on forecasts, track plan vs actuals |
| **Tax** | 2–3 people | Multi-jurisdiction tax calculations and compliance |
| **Treasury** | CFO personally (below ~$1B); small team at $2B+ | Cash positioning, balance management, FX |

### How FP&A works

FP&A teams build forecasts and business models, then track actuals against plan. Their tooling ranges from basic to sophisticated:

- **Basic:** Excel spreadsheets — still dominant; 96% of FP&A professionals use spreadsheets weekly (AFP 2025)
- **Professional:** Dedicated FP&A platforms like Anaplan, Workday Adaptive Planning, Pigment, OneStream, Board, or Planful

Models are either loaded manually into the ERP or integrated through connectors.

### The CFO's morning routine (treasury in heroic manual mode)

1. Log into 5–10 different banking portals
2. Export bank statements and balance reports
3. Upload into ERP (some automated, some manual)
4. Compile a cash position across all accounts
5. Figure out if there's enough cash for this week's payments
6. Check for excess balances that could be better allocated
7. Build a 12–13 week cash flow forecast
8. Manage any FX exposure manually

**The pain:** This entire process runs on stale data. Bank statements often update once per day. By the time the CFO has compiled the full picture, it's already hours old. Fee structures across banks are opaque. Integrations are fragile — different banks provide different file formats (BAI2, MT940, CSV), and some require manual downloads.

### Who you sell to

At this tier, the buyer is the **CFO directly**. They feel the pain every morning.

---

## Tier 2: Large Enterprise ($5B–$50B)

### The setup

- **15–30 banks** across 20+ countries
- **50–100+ bank accounts** (operating, payroll, tax, escrow, FX accounts)
- **ERP system** (often SAP S/4HANA) — sometimes **multiple ERPs** from acquisitions
- **Treasury Management System** (Kyriba, ION Treasury, GTreasury, or FIS) sitting between ERP and banks
- **Dedicated treasury team** (VP Treasury + 10–20 people)

### The finance team (100+ people)

| Function | Size | What they do |
|----------|------|-------------|
| **CFO** | 1 | Strategic — capital allocation, investor relations, board reporting |
| **VP Controller / Accounting** | 20–50 people | General ledger, month-end close, consolidated reporting across all entities |
| **VP FP&A** | 10–20 people | Forecasting, budgeting, variance analysis at scale |
| **VP Treasury** | 10–20 people | Cash management, FX hedging, bank relationships, liquidity optimization |
| **Tax** | 5–10 people | Transfer pricing, multi-jurisdiction compliance |
| **Internal Audit** | 5–10 people | SOX compliance, controls, fraud prevention |
| **Procurement** | Varies | Vendor management, purchasing |

### Inside the treasury function

The treasury team has specialized sub-functions:

| Sub-function | What they do |
|-------------|-------------|
| **Cash management** | Daily cash positioning, cash flow forecasting, moving money between accounts and entities |
| **FX risk management** | Building hedging models and strategies, executing FX trades to manage currency exposure |
| **Back office** | Processing transactions, reconciliation, settlement |

### How the day works

Similar rhythm to mid-market, but at much larger scale:

1. **Auto-import** bank data into ERP/TMS (some automated via SWIFT/APIs, some still manual uploads)
2. **Model** cash positions using Kyriba or GTreasury
3. **Produce daily cash position report** — balances across 15–30 banks, 50–100 accounts, 20+ countries
4. **Project** inflows and outflows for the coming weeks
5. **Execute** intercompany transfers to optimize cash across entities
6. **Manage FX** — execute hedging trades based on exposure analysis

### The multi-ERP problem

Large enterprises often carry **2–3 ERPs** as a result of M&A. They acquired a company that ran on NetSuite while the parent runs on SAP. Now they need connectors between ERPs, duplicated processes, and additional reconciliation. Migration is expensive and risky, so these multi-ERP setups persist for years.

### Hedging

Large enterprises have a formal **FX hedging policy**. This doesn't mean sophisticated automation — it means a documented strategy that the treasury team implements manually or semi-automatically:

- Identify currency exposures (e.g., EUR revenue, USD costs)
- Execute forward contracts or options with banking counterparties
- Track hedge effectiveness and report to CFO/board
- Comply with hedge accounting rules (ASC 815 / IFRS 9)

### Who you sell to

At this tier, buyers are the **VP Treasury** (for treasury tools), **VP Controller** (for accounting/ERP), and **IT/Procurement** (for evaluation and implementation). The CFO sets direction but doesn't evaluate tools personally.

---

## Tier 3: Mega-Corporation ($50B+)

### The setup

These companies have built what is effectively an **in-house bank**:

- **50–100+ people** in treasury alone
- **Payment Factory** — a centralized platform that processes all payments for every entity in the corporation
- **SWIFT connections** to payment networks — most via service bureaus, only the largest maintain direct infrastructure; local clearing system connections where justified
- **Custom-built infrastructure** — decades of investment in proprietary systems
- **Dedicated IT teams** maintaining and extending financial infrastructure

### What is a Payment Factory?

Instead of each subsidiary managing its own banking relationships and payments, the mega-corporation centralizes everything:

```
Subsidiary A (Germany) ──┐
Subsidiary B (Japan)  ───┤──→  Payment Factory  ──→  Payment Networks
Subsidiary C (Brazil) ───┤      (centralized)        (SWIFT, SEPA, ACH,
Subsidiary D (USA)    ───┘                             local rails)
```

Any entity that needs to make a payment submits it to the central payment factory, which routes it through the optimal channel. This gives the corporation:

- Negotiating leverage with banks (volume-based pricing)
- Standardized payment processes globally
- Central visibility into all payment flows
- Ability to net intercompany payments before settling

### The finance team (hundreds of people)

Same functions as large enterprise, but scaled up significantly. Additionally:

- **M&A team** — dedicated team for acquisitions and divestitures
- **Risk management** — separate from treasury, covering broader financial risks
- **Investor Relations** — dedicated team managing analyst and investor communication
- **Large IT organization** — maintaining and developing financial infrastructure

### Why mega-corps are a different market

- Very few companies at this scale (Fortune 500)
- They've built their infrastructure over decades — switching costs are enormous
- Custom in-house systems are deeply integrated into operations
- Sales cycles are extremely long (12–24+ months)
- Decisions involve procurement, IT, treasury, and C-suite

This tier is generally **not the target market** for new treasury solutions. The mid-market and large enterprise tiers represent the real opportunity.

---

## The Peripheral Software Stack

Across all three tiers, the ERP is the heart of the financial system. But companies layer additional specialized tools around it:

```
                    ┌──────────────────────┐
                    │     Spend Mgmt       │
                    │  (SAP Concur, Coupa, │
                    │   Ramp, Brex, Pleo)  │
                    └──────────┬───────────┘
                               │
┌───────────────┐    ┌────────▼────────┐    ┌───────────────┐
│    Treasury   │    │                  │    │    FP&A       │
│  Management   │◄──►│    ERP           │◄──►│  (Anaplan,    │
│  (Kyriba, ION │    │  (SAP, NetSuite, │    │   Pigment,    │
│   GTreasury)  │    │   Dynamics 365)  │    │   OneStream)  │
└───────┬───────┘    └────────▲────────┘    └───────────────┘
        │                     │
        ▼                     │
┌───────────────┐    ┌─────────────────────┐
│    Banks      │    │   Travel Mgmt       │
│  (5-30+       │    │  (Amex GBT, Navan,  │
│   portals)    │    │   SAP Concur)       │
└───────────────┘    └─────────────────────┘
```

All peripheral systems ultimately feed data into the ERP. The ERP is the system of record for accounting, tax, and consolidated reporting.

| Layer | Tools | What they do |
|-------|-------|-------------|
| **ERP** | SAP, NetSuite, Microsoft Dynamics 365, Workday, Sage Intacct | Accounting, consolidation, tax, system of record |
| **Treasury Management** | Kyriba, ION Treasury, GTreasury, FIS, SAP Treasury | Cash positioning, FX, bank connectivity, payment optimization |
| **Spend Management** | SAP Concur (~50% T&E market share), Coupa, SAP Ariba, Ramp, Brex, Pleo, Payhawk | Employee cards, expense reports, invoice processing, procurement |
| **Travel** | Amex GBT (largest TMC globally), Navan, SAP Concur | Travel booking, policy enforcement |
| **FP&A** | Anaplan, Workday Adaptive Planning, Pigment, OneStream, Board, Planful, Excel | Forecasting, budgeting, financial modeling |

---

## Universal Pain Points

Regardless of tier, large corporations share the same fundamental problems — they just feel them at different intensities.

### 1. Cross-border payments

Moving money between entities in different countries remains slow, expensive, and unreliable:

- **SWIFT transfers** — historically 1–3 business days; SWIFT gpi has improved this (90% now reach the destination bank within 1 hour), but some corridors still take 1–2+ days, and intermediary fees remain unpredictable
- **Correspondent banking chains** — a payment from Brazil to Japan might pass through 2–3 intermediary banks, each taking a cut
- **Opaque FX spreads** — banks mark up exchange rates with no transparency on the real cost
- **Failed payments** — incorrect formatting, sanctions screening delays, and compliance holds are common

### 2. Intercompany settlement (netting cycles)

Subsidiaries constantly transact with each other — shared services, internal loans, transfer pricing. A corporation with 200 entities worldwide runs continuous intercompany balances that need periodic settlement.

**Netting** reduces the number of actual payments: instead of Entity A paying Entity B $1M and Entity B paying Entity A $800K, they net to a single $200K payment. But even with netting, the settlements still flow through the same slow, expensive cross-border rails.

### 3. Trapped cash in emerging markets

In volatile markets (Argentina, Turkey, Nigeria, etc.), corporations face:

- **Currency volatility** — local currency can devalue 20–50% in a year
- **Capital controls** — governments restrict how much money can leave the country
- **Conversion limitations** — you might not be able to convert local currency to USD/EUR quickly or at a reasonable rate

Corporations want to hedge this exposure or hold value in stable currencies, but options are limited in these markets.

### 4. Poor visibility and manual processes

The root problem isn't the ERP — ERPs are capable software. The problem is **the integrations between banks and everything else**:

- Bank APIs are inconsistent, unreliable, and vary by country
- Bank statements often update only once per day (batch processing)
- Different banks use different formats, different authentication methods, different cutoff times
- Real-time cash visibility across all banks and countries remains elusive

If these integrations worked on modern, real-time rails, companies could have:

- Automated cash positioning and rebalancing
- Real-time consolidated reporting
- 24/7 payment processing (not limited to banking hours)
- Programmatic treasury management (rules-based, not manual)

### 5. FX management is under-automated

Even at large enterprises with dedicated FX teams, the process is largely manual:

- Exposure analysis done in spreadsheets or basic TMS modules
- Trade execution via bank portals or phone calls to FX desks
- Hedge tracking and effectiveness testing in separate systems
- No real-time view of net exposure across all entities

---

## The Opportunity

The most interesting segments for new treasury solutions are **mid-market** ($0.5B–$5B) and **large enterprise** ($5B–$50B):

- **Mid-market** feels the pain acutely but has no dedicated treasury tooling — the CFO is doing it manually
- **Large enterprise** has tooling (Kyriba, etc.) but it's clunky, expensive, and still requires significant manual work
- **Mega-corporations** have built custom infrastructure over decades and are unlikely to switch

The core problem across all segments is the same: **the banking layer is fragmented, slow, and opaque**. Every bank is a silo. Every integration is custom. Cross-border payments remain slow and expensive despite SWIFT gpi improvements. The ERP and TMS layers above are only as good as the banking data they receive — and that data is stale, incomplete, and inconsistent.

A solution that provides a **unified, real-time, programmable financial layer** — where money moves instantly between entities and countries, where balances are visible in real-time, where FX is transparent and automated — would collapse the entire stack of pain points that these corporations deal with daily.

---

*This is Part 2 of a 5-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **Corporate Banking** — How large corporations manage finances at scale *(this document)*
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **Crypto-Native Banking** — How crypto companies organize their financial operations
