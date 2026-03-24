# Business Banking 101

A practical overview of banking services across company lifecycle stages — what businesses need, why, and what solutions exist today.

---

## Company Lifecycle Stages

Every company can grow through these stages, each bringing new financial complexity:

| Stage | Size | Example |
|-------|------|---------|
| **Micro-business** | 1–10 people | Solo trader, freelancer, early startup |
| **Small business** | 10–100 people | Incorporated company (LLC, C-Corp, Ltd) |
| **Medium business** | 100–500 people | Multi-entity company, multiple jurisdictions |
| **Large enterprise** | 500–5,000+ people | Complex org with dedicated finance teams |
| **Multinational corporation** | 1,000+ people, multiple countries | Transnational operations (Uber, Maersk, KLM) |

The vast majority of businesses (~90%) are micro-businesses. But as companies grow, their financial needs compound — more people, more transactions, more entities, more countries, more complexity.

> **Note:** Size boundaries are approximate and vary by region (EU, US, OECD all define them differently). These stages reflect practical differences in financial needs rather than official classifications.

---

## Stage 1: Micro-Business (1–10 people)

### What they need

At the most basic level, a micro-business needs to **separate personal finances from business finances** for tax purposes. That's it.

Typical setup:
- **A business bank account** (or 2–3 accounts: operating, receiving, tax savings)
- **Payment cards** for the owner (and maybe a co-founder)
- **Basic payment acceptance** — invoicing by bank details, Stripe for web payments, or a card terminal
- **Outsourced accountant** who reviews everything quarterly or annually

### Who manages finances

The owner does everything day-to-day. They've read some articles, maybe had an accountant consultation, and understand their tax obligations well enough. A part-time external accountant checks their work and helps prepare tax filings.

### Banking access model

Very simple — 1–2 people with full access:
- Owner (full access)
- Co-founder, if any (full access)
- External accountant (read-only or limited access)

### What the banking product looks like

This is essentially **consumer banking with a business wrapper**. Every neobank that entered SMB banking (Monzo Business, Revolut Business) started exactly here — they forked their consumer product, added business entity onboarding (different KYB documents), and bolted on basic multi-user functionality with two permission levels: *full access* and *read-only*.

### Accounting integration

Most micro-businesses use **QuickBooks** or **Xero**. These tools connect to the bank via the **Open Banking protocol** (mandatory and mature in Europe via PSD2; nascent and voluntary in the US) to pull in transaction feeds. The accountant then reconciles transactions — matching bank entries to invoices and expenses.

### Solutions in this space

Mercury, Revolut Business, Monzo Business, Qonto, and dozens of others.

---

## Stage 2: Small Business (10–100 people)

### What changes

Fundamentally, the needs are the same — payments in, payments out, cards, accounting. But the key difference: **a dedicated finance function appears inside the company**.

The owner can no longer manage finances alone. There's an in-house accountant handling daily transactions, and often a CFO (who may also cover legal). The volume of transactions grows, and separation of duties becomes necessary.

### Typical finance team

- **CFO** — oversees finances and often legal; approves payments
- **Accountant** (in-house) — creates and processes transactions, manages records
- **Founders** — retain approval rights for large payments

### Role-based access becomes real

No longer just "full access" vs "read-only." Now you need actual permissions:

| Role | Can view | Can create transactions | Can approve | Can execute |
|------|----------|----------------------|-------------|-------------|
| Accountant | Yes | Yes (initiate) | No | Yes (after approval) |
| CFO | Yes | Yes | Yes | Yes |
| Founder | Yes | Yes | Yes | Yes |

The accountant can enter payroll, create payment batches, and prepare everything — but the CFO or founder must approve before money moves.

### Multi-bank setup

Small businesses typically use **2–3 banks** for redundancy and different product strengths. All bank feeds connect into QuickBooks/Xero, giving the finance team a consolidated view of transactions across banks.

### What's still painful

The accounting tools (QuickBooks, Xero) work well for a **single legal entity**. If the company has started adding entities (which some do at this stage), consolidating reports across entities is extra manual work.

### Solutions

Same neobanks as micro, but now the multi-user features, role management, and approval workflows matter.

---

## Stage 3: Medium Business (100–500 people)

### The big shift: multi-entity

This is where things get materially more complex. A medium business typically operates **2–3+ legal entities** for structural, tax, or operational reasons:

- **Operating entity** — day-to-day business, travel, expenses
- **R&D entity** — employing engineers, development costs
- **Holding company** — owns the subsidiaries, manages group finances

**Real-world example:** A Fintech Startup (even with only 200–300 people) has subsidiaries in Cyprus (employing Cyprus-based staff), Germany (German staff), Netherlands (Dutch staff), plus regulated entities for banking licenses in Luxembourg, and a holding company in Ireland.

### Finance team structure

- **CFO** — access to all entities, all banks
- **Accountant per jurisdiction** — each knows local tax rules
- **Founders** — oversight and approval on large items

Each accountant manages 1–2 entities. They create transactions, the CFO approves, founders sign off on anything significant.

### The multi-entity pain

Each entity has its own bank accounts, its own accounting instance. The CFO needs visibility across everything, but:

- **No unified interface** — 4–5 different bank logins, different UIs
- **No unified reporting** — QuickBooks/Xero are designed for single-entity bookkeeping
- **Manual consolidation** — group-level reporting is done in Excel, or through janky plugins

Tax reporting is generally per-entity (taxes are filed per legal entity), though exceptions exist — US consolidated federal returns, EU fiscal unity regimes, and group VAT registrations in some jurisdictions. For most companies at this stage, per-entity works fine. However, answering "how much cash does our group have right now?" or "what's our consolidated revenue?" requires painful manual work pulling data from multiple accounting systems.

### Expense Management emerges

With more employees comes a new category of spend: **employee expenses**. Sales people traveling, teams attending conferences, departments buying software. This creates demand for:

**Expense Management (employee spend):**
- Issue cards to employees with spending limits and policies
- Limits by amount, category (travel, hotels, Uber only), or time period
- Automated receipt capture — employees photograph receipts via mobile app
- OCR extracts VAT/tax data (critical for tax deductions)
- Approval workflows — auto-approve under threshold, manager approval above
- All data flows back to accounting automatically

**Invoice Management (Accounts Payable):**
- Shared inbox for incoming invoices from vendors and partners
- Approval workflows with designated owners
- One-click payment after approval
- Automatic reconciliation with accounting

### Solutions for this segment

| Category | Products | Focus |
|----------|----------|-------|
| Expense Management | Brex, Ramp, Pleo, Soldo, Payhawk | Cards + expense automation |
| Accounting | QuickBooks, Xero | Bookkeeping + tax reporting |
| Hybrid | Brex, Ramp (expanding into accounting) | Cards + expense + basic accounting |

These overlap and compete. Brex/Ramp started from corporate cards and expanded into expense management, now adding accounting features. QuickBooks/Xero started from accounting and added basic expense features. Companies typically use a mix: Ramp for expenses and cards, QuickBooks for bookkeeping and tax.

### Geographic fragmentation

- **US-primary:** Ramp, Mercury
- **US + Europe:** Brex (EU payment license since 2025, phased rollout — fully operational in EU expected early 2026; local card issuance in 45+ countries and 20+ currencies)
- **Europe-primary:** Pleo (16 European countries), Soldo (UK + EU/EEA)
- **Europe + US:** Payhawk (32+ countries including US)
- **Multi-region fintechs:** Airwallex (150K+ businesses, 200+ countries), Wise Business (630K+ business customers), Jeeves (US + Europe + LatAm)

Despite rapid expansion, no single fintech has equally deep, locally-licensed operations across all major regions. Enterprise platforms like SAP Concur (150+ countries) span globally but lack the modern UX and card-issuing capabilities of newer players.

---

## Stage 4: Large Enterprise (500+ people)

### The ERP becomes unavoidable

Many companies start adopting ERPs like NetSuite already at the medium stage (50–200 employees), but at 500+ the complexity makes centralized systems unavoidable. Everything from medium business applies, but scaled up:

- More entities, more banks, more countries
- Multiple currencies → **currency risk** emerges
- Need to move capital between subsidiaries efficiently
- More transactions, more people, more approvals
- Excel consolidation completely breaks down

At this scale, companies adopt **ERP (Enterprise Resource Planning)** systems with financial modules, or dedicated **Treasury Management Systems (TMS)**.

**What an ERP financial module does:**
- Connects to all banks across all entities via APIs
- Centralizes all transaction data in one place
- Unified reporting across entities, currencies, and jurisdictions
- Manages purchase orders, approvals, and expense workflows at scale
- Handles multi-currency accounting and consolidated financial statements

**Key distinction:** An ERP like NetSuite is **not a bank** — it's a software connector. It aggregates data from your banks and provides a unified operational layer. It earns revenue from software licenses, not banking services.

Similarly, spend management platforms like Brex and Ramp are **also not banks** — neither holds a bank charter. They partner with licensed banks (Brex with Column and Choice Financial Group; Ramp with First Internet Bank of Indiana) and earn revenue from interchange fees and SaaS subscriptions. The difference: ERPs are pure software, while Brex/Ramp bundle software with card issuance and payment processing through their banking partners.

### Solutions

| Product | Type | Starting price | Notes |
|---------|------|---------------|-------|
| **NetSuite** (Oracle) | ERP | ~$12K–$100K+/year | Sweet spot: 50–500 employees, $5M–$500M revenue |
| **SAP Concur** | Expense, Travel + Invoice | Enterprise pricing | ~50% market share in T&E; part of SAP ecosystem |
| **SAP S/4HANA** | Full ERP | Enterprise pricing | For the largest enterprises |
| **Workday** | HCM + Finance | Enterprise pricing | Strong in HR + financial planning |

Companies typically start considering NetSuite when they outgrow QuickBooks/Xero, usually around **50–200 employees**. 83–86% of NetSuite customers have fewer than 1,000 employees.

---

## Stage 5: Multinational Corporation

### What makes it different

A multinational is a medium or large business (200–5,000+ people) with **operations in multiple countries** — different subsidiaries, different jurisdictions, different banks, different currencies, different regulations.

Think logistics companies (Maersk), ride-sharing (Uber), airlines (KLM), or any company with regional subsidiaries across continents.

### The core challenge

Geographic coverage is improving but still fragmented:

- **Brex** payments infrastructure covers 200+ countries and 60+ currencies, but local card issuance is limited to 45+ countries; EU operations still in phased rollout
- **Airwallex** covers Asia-Pacific, US, and Europe ($1B+ annualized revenue)
- **Jeeves** spans US, Europe, and Latin America with local card issuance
- **Wise Business** handles cross-border payments in 40+ currencies
- Enterprise incumbents like **SAP Concur** cover 150+ countries but lack modern fintech UX

Most multinationals still use an **ERP or TMS as their central nervous system**, with regional fintechs and local banks as endpoints.

### Treasury Management becomes critical

For multinationals, treasury management involves:

- **Cash visibility** — "How much money do we have, across all entities, all countries, right now?"
- **Intercompany transfers** — Moving money between subsidiaries (with proper documentation)
- **FX management** — Handling multiple currencies, hedging currency risk
- **Cash positioning** — Ensuring each subsidiary has enough liquidity
- **Consolidated reporting** — Group-level financial statements across all entities

---

## Summary: Needs by Company Stage

| Need | Micro | Small | Medium | Large | Multinational |
|------|:-----:|:-----:|:------:|:-----:|:------------:|
| Basic bank account | x | x | x | x | x |
| Payment cards | x | x | x | x | x |
| Payment acceptance | x | x | x | x | x |
| Multi-user access | | x | x | x | x |
| Role-based permissions | | x | x | x | x |
| Approval workflows | | | x | x | x |
| Multi-entity setup | | | x | x | x |
| Expense management | | | x | x | x |
| Invoice management | | | x | x | x |
| Multi-bank aggregation | | x | x | x | x |
| Consolidated reporting | | | x | x | x |
| Multi-currency / FX | | | | x | x |
| Intercompany transfers | | | x | x | x |
| ERP / TMS integration | | | x | x | x |
| Cross-border treasury | | | | | x |

---

## Landscape Overview

```
                     MICRO        SMALL        MEDIUM       LARGE        MULTINATIONAL
                     (1-10)       (10-100)     (100-500)    (500+)       (Multi-country)

Banking              ┌────────────────────────┐
                     │  Mercury, Revolut,     │
                     │  Qonto                 │
                     └────────────────────────┘

Expense /            ┌─────────────────────────────────────────────────────────────┐
Spend Mgmt           │  Brex (US+EU), Ramp (US), Pleo (EU), Payhawk (EU+US),     │
                     │  BILL/Divvy (US), Navan (travel+expense)                    │
                     └─────────────────────────────────────────────────────────────┘

Accounting           ┌───────────────────────────────────────────┐
                     │  QuickBooks, Xero                         │
                     └───────────────────────────────────────────┘

Cross-border                                ┌──────────────────────────────────────┐
Payments                                    │  Airwallex, Wise Business, Jeeves,  │
                                            │  Tipalti                             │
                                            └──────────────────────────────────────┘

ERP / Treasury                              ┌──────────────────────────────────────┐
                                            │  NetSuite, SAP, Workday             │
                                            └──────────────────────────────────────┘
```

---

*This is Part 1 of a 4-part series:*
1. **Business Banking 101** — Overview of banking services by company stage *(this document)*
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **Crypto Treasury** — How stablecoins and on-chain infrastructure change the game for enterprise finance
