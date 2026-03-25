# Enterprise Resource Planning (ERP)

What ERP systems are, why companies adopt them, and what this means for building on-chain treasury products.

*Part 4 of an 11-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Why ERP Exists

Every company has financial activity — bank accounts, transactions, invoices. Every company must pay taxes and file reports. The question is: what system do they use to manage all of this?

### The natural progression

1. **Excel** — The founder tracks everything in a spreadsheet. Works for a handful of transactions per month.
2. **Accounting software** (QuickBooks, Xero) — When transactions reach dozens per month, you move to a proper accounting system. It handles the general ledger, tax calculations, and basic reporting. This works for a surprisingly long time.
3. **ERP** — When the business becomes complex enough — multi-entity, multi-country, manufacturing, inventory, or IPO preparation — the accounting software hits its limits and companies migrate to an ERP.

### What triggers the move to ERP

- **Multi-entity setup** — 2+ legal entities that need consolidated reporting
- **Manufacturing or inventory** — Need to track production, warehouses, supply chain
- **IPO preparation** — Auditing requirements, SOX compliance, more rigorous financial controls
- **M&A** — Acquired a company, now need to consolidate two sets of books
- **International operations** — Multi-currency, multi-jurisdiction tax compliance

QuickBooks and Xero were originally designed for **single-entity bookkeeping**. They've added multi-entity support through plugins and upgrades, and for a company with 2–3 entities and nothing too complex, you can make it work without an ERP. But ERP was built for this complexity from the start.

---

## ERP Is Not Just a Bigger QuickBooks

A useful analogy from the software world:

- **QuickBooks/Xero** is like **Trello** — simple, effective for basic task management, handles the core job well
- **ERP** is like **Jira** — project management, support tickets, roadmaps, integrations, resource planning, multiple teams, workflows — a full business operating system that spans departments (finance, HR, supply chain, manufacturing), unlike Jira which stays within engineering

ERP stands for **Enterprise Resource Planning**. It's not just financial software — it's an operating system for the entire business. The financial/accounting module is a huge part of it, but ERP also covers:

| Module | What it does |
|--------|-------------|
| **Finance & Accounting** | General ledger, AP/AR, consolidation, financial reporting, tax |
| **Manufacturing** | Production planning, bill of materials, shop floor management |
| **Inventory & Warehouse** | Stock tracking, warehouse management, fulfillment |
| **Supply Chain** | Demand planning, logistics, sourcing |
| **Procurement** | Purchase orders, vendor management, contract management, sourcing |
| **CRM** | Customer management, sales pipeline (often replaced by Salesforce/HubSpot) |
| **HR & Payroll** | Employee management, payroll (often replaced by ADP, Gusto, Deel) |
| **Project Management** | Resource planning, time tracking, project costing |
| **Analytics & BI** | Dashboards, financial reporting, performance management |

### The integration hub model

Every ERP has baseline functionality for each module. But companies routinely replace specific modules with best-of-breed tools and integrate them back:

| ERP module | Often replaced by | Why |
|-----------|-------------------|-----|
| CRM | Salesforce, HubSpot | More powerful, already in use |
| Payroll | ADP, Paychex, Gusto, Deel, Remote, Rippling | Better localization, contractor support |
| Tax calculation | Avalara, Vertex | More accurate, jurisdiction-specific |
| Expense management | Ramp, Brex, SAP Concur | Better UX, card issuance |
| Treasury | Kyriba, ION Treasury | Deeper cash management, bank connectivity |

Integration happens via **REST APIs** (increasingly GraphQL and webhooks too), **middleware/iPaaS platforms** (MuleSoft, Celigo, Boomi, Workato), **EDI** (critical for B2B supply chain), or basic **CSV/XML file imports and exports**.

---

## The ERP Landscape

Different ERPs target different company segments:

| Product | Target segment | Typical company |
|---------|---------------|-----------------|
| **SAP S/4HANA** | Large to mega-corporations | Dominant in Fortune 500; also targeting mid-market ($100M–$500M) via GROW with SAP cloud initiative |
| **Oracle Fusion Cloud** | Mid-market to large | $500M+ revenue typically, though sold down to $100M for complex operations |
| **NetSuite** (Oracle) | Small to mid-market | 41,000+ customers; sweet spot is $5M–$500M revenue, though 36% of users have <50 employees |
| **Microsoft Dynamics 365** | Mid-market to large | Broad range, strong in manufacturing and retail |
| **SAP Business One** | Small to mid-market | Smaller companies needing ERP-level features |
| **Sage Intacct** | Small to mid-market | Professional services, nonprofits, SaaS companies |

**Important:** ERP adoption is driven by **business complexity, not company size**. A 100-person manufacturing company with inventory and international suppliers may need an ERP, while a 500-person pure-software company might get by with QuickBooks. That said, virtually all large corporations ($500M+ revenue), multinational corporations, and companies preparing for IPO run on ERP.

### Market convergence

These two worlds are moving toward each other:

- **ERP vendors moving downmarket** — NetSuite, Dynamics 365, SAP Business One targeting smaller companies
- **Accounting software moving upmarket** — In September 2024, Intuit launched **Intuit Enterprise Suite**, explicitly described as "a modern, AI-native ERP solution" targeting companies with $3M–$100M revenue. Xero continues adding multi-entity support through third-party apps and acquisitions.

But they come from fundamentally different starting points and a significant price gap persists (QuickBooks Online starts at ~$30/month vs. NetSuite at ~$10,000+/year). ERP was built for complexity; accounting software was built for simplicity. The DNA shows in the product.

---

## How Companies Actually Work With ERP

### The ERP is the system of record

Here's a crucial insight for anyone building financial products: **the ERP is the system of record** — the data backbone that all other financial tools feed into. It's where the general ledger lives, where consolidation happens, where auditors look.

In practice, finance teams work across **multiple tools daily** — ERP, Excel (still dominant for analysis and modeling — 96% of FP&A professionals use spreadsheets weekly per AFP 2025), banking portals, TMS, and spend management platforms. The ERP is not necessarily where they spend most of their time, but it is where all the data must ultimately land.

The typical payment workflow:

1. A payment need is identified (invoice in AP, expense approval, payroll run)
2. The ERP generates a payment instruction
3. That instruction flows to the bank (via TMS or direct integration) or the user is redirected to a bank portal for final approval
4. Bank statements flow back into the ERP (automatically or via manual upload) for reconciliation

The bank's interface is secondary in large enterprises with modern ERP-bank integrations, though many mid-market firms still log into multiple banking portals daily. In all cases, the bank is the execution layer — the "payment rail" — and the ERP is the system of record.

### The work reality

Finance professionals work across a mix of tools daily:

- **Excel** — Still the dominant working interface for analysis, reporting, and ad-hoc modeling
- **ERP** — Transaction processing, AP/AR, month-end close, consolidated reporting
- **Banking portals** — Payment approvals, balance checks (especially at mid-market)
- **TMS** — Cash positioning, FX management (at larger companies)
- **Spend management** — Expense reviews, invoice approvals
- **Email and messaging** — Coordination, exceptions, approvals

The key point: all financial data from all these tools must ultimately flow into the ERP. It's the hub, even if it's not always the primary screen.

---

## What This Means for On-Chain Treasury

### What you cannot do

**You cannot replace the ERP.** This is not a matter of ambition — it's structural:

- Even in the simplest case (micro-business, single entity), neobanks never managed to replace accounting software. They built complementary features — expense coding, receipt capture, GL suggestions — but these were always designed to feed into QuickBooks/Xero, not replace them. Accountants are trained on these systems, tax algorithms are deeply embedded, regulatory reporting is built in. Neobanks ended up positioning themselves as automation layers between spending and the general ledger, with deep integrations into accounting software. The reverse also happens: Xero acquired Melio (a payments fintech) for $2.5B in 2025.
- For large enterprises with multi-entity, multi-jurisdiction, manufacturing, and audit requirements — replacing the ERP is completely unrealistic. These implementations took years and cost millions. They're deeply integrated into every business process.

**You also cannot replace the peripheral tools** — expense management (Ramp, Brex), invoice processing, TMS, payroll. Each of these has its own specialists, its own workflows, its own reasons for existing. Attempting to build all of this is a recipe for building a mediocre version of everything.

### What you can do

On-chain treasury for enterprises is a **payment rail and treasury infrastructure** — not a financial management platform. Specifically:

- **A treasury** that the corporation creates, with multiple accounts tied to different legal entities
- **Stablecoin holdings** (USDC, EURC, etc.) visible per entity, per currency
- **Instant transfers** between entities — the intercompany settlement problem, solved
- **On/off-ramp capabilities** — converting between fiat and stablecoins
- **Approval workflows and policies** — role-based access, spending limits, multi-sig
- **Deep ERP integration** — so all of this shows up as just another set of accounts in SAP, NetSuite, or Dynamics

The enterprise finance team should never need to leave their ERP to use on-chain treasury. The stablecoin accounts should appear alongside traditional bank accounts in their existing dashboards. Transactions should flow into the general ledger automatically. It should be **invisible infrastructure**, not another portal to log into.

### The positioning

**For established companies (mid-market and above):**

The product is infrastructure, not interface. It's a payment rail that integrates into their existing ERP and TMS stack. The value proposition is faster intercompany settlement, real-time cash visibility, lower cross-border costs, and transparent FX — not a new financial management experience.

**For startups and small companies:**

The value proposition is less clear. These companies can use Mercury, Revolut, Brex, Airwallex — established products that solve their banking needs well. A stablecoin-based account for a small single-entity company offers no meaningful advantage over a traditional business bank account. The real value of on-chain treasury only emerges when you have multi-entity, multi-currency, cross-border complexity — which is an enterprise problem.

**For crypto-native companies:**

This is a distinct segment with different needs. Companies that already operate primarily on-chain need crypto-native banking — but their requirements are different enough to warrant a separate product and analysis.

---

## Summary

| Layer | What it is | Can you replace it? |
|-------|-----------|-------------------|
| **ERP** | Operating system for the business — accounting, manufacturing, supply chain, reporting | No. Integrate with it. |
| **Peripheral tools** | Expense mgmt, payroll, CRM, tax, TMS — specialized tools integrated into ERP | No. Coexist with them. |
| **Payment rail** | How money actually moves between accounts, entities, and countries | **Yes. This is the opportunity.** |
| **Bank accounts** | Where money is held, statements are generated, payments are executed | Partially. Add on-chain accounts alongside traditional ones. |

The on-chain treasury opportunity is at the **payment rail and account layer** — not the software layer above it. Build the best possible financial infrastructure, integrate it seamlessly with existing enterprise systems, and let the ERP remain the interface.

---

*This is Part 4 of an 11-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **ERP** — What Enterprise Resource Planning systems are and why they matter *(this document)*
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **[MPC 101](./mpc.md)** — Multi-Party Computation, threshold signatures, and custody architecture
10. **[Security Architecture](./cosigner-security-models.md)** — Defense-in-depth security for a blockchain treasury app
11. **[Custody Models](./custody.md)** — Custodial vs. self-custodial, regulatory implications, and the path to licensed custodian
