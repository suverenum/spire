# Crypto-Native Banking

How crypto companies organize their finances — what's unique, what's the same as any other business, and what the pain points are.

*Part 5 of an 8-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Two Segments, Two Products

Previous lectures identified two potentially interesting segments for on-chain treasury:

1. **Crypto-native companies** — Teams that build on-chain and hold digital assets as part of their core business
2. **Multi-entity multinational corporations** — Traditional companies that could benefit from stablecoins for intercompany transfers

This lecture focuses on **crypto-native companies** specifically.

---

## What Makes Crypto Companies Different

At their core, crypto companies are **regular businesses** — they have employees, pay taxes, file reports, and need bank accounts. The difference is a single additional dimension: **they hold and transact in digital assets**.

This creates three layers of financial infrastructure:

```
┌─────────────────────────────────────────────┐
│           Standard Accounting               │
│  (QuickBooks, Xero, or NetSuite)            │
│  + crypto sub-ledger plugin                 │
├─────────────────────────────────────────────┤
│           Traditional Banking               │
│  (Mercury, Meow, Slash)                     │
│  + on/off-ramp capabilities                 │
├─────────────────────────────────────────────┤
│        Digital Asset Custody                │
│  (Safe, Squads, Fireblocks)                 │
│  Multi-sig wallets for on-chain assets      │
└─────────────────────────────────────────────┘
```

---

## Layer 1: Digital Asset Custody

Crypto companies hold tokens, stablecoins, and other digital assets that need secure storage with multi-party authorization. The solution depends on which chain(s) they operate on:

| Scenario | Solution | How it works |
|----------|----------|-------------|
| **EVM chains (Ethereum + 100 others)** | **Safe** (formerly Gnosis Safe) | Multi-sig wallet — requires M-of-N signers to approve transactions; supports Ethereum, Arbitrum, Polygon, Base, Optimism, and 100+ EVM-compatible networks |
| **Single chain (Solana)** | **Squads** | Multi-sig protocol native to Solana |
| **Cross-chain / high volume** | **Fireblocks** | MPC (Multi-Party Computation) — institutional-grade custody with key sharding across multiple parties |

**Who uses what:**
- Smaller crypto teams (DAOs, protocols) typically use **Safe** or **Squads** — simpler, cheaper, chain-native
- Larger crypto companies with cross-chain operations (exchanges, custodians) use **Fireblocks** — Revolut (Fireblocks' 100th customer in 2020), BNY, Galaxy, and other large players rely on it for institutional custody
- Some Solana-native teams like Kamino use **Squads** for treasury management

The choice is driven by which chains the company operates on, transaction volume, and security requirements.

---

## Layer 2: Traditional Banking

Crypto companies still need **traditional bank accounts** for:

- Paying salaries (in fiat)
- Paying vendors and contractors
- Receiving fiat revenue from customers
- Tax payments
- Corporate expenses and cards

### The onboarding problem

The biggest pain point is **getting a bank account in the first place**. Many banks refuse to onboard crypto companies due to perceived compliance risk. The options that do work:

| Bank/Service | Notes |
|-------------|-------|
| **Mercury** | Most popular choice for US-based crypto companies; relatively crypto-friendly |
| **Meow** (meow.com) | Treasury management platform for startups; USDC capabilities on Solana; backed by QED Investors |
| **Slash** (slash.com) | $150M+ annual revenue, 5,000+ business customers; stablecoin payment capabilities (USDC, USDT); Global USD account for non-US entities |

### What they need from a bank

Beyond basic business banking, crypto companies need **on-ramp and off-ramp** capabilities:

- **On-ramp:** Convert fiat → stablecoins (to fund on-chain treasury, pay on-chain contributors)
- **Off-ramp:** Convert stablecoins → fiat (to pay salaries, taxes, traditional vendors)

A bank that bundles both traditional banking + on/off-ramp in one place is valuable because it eliminates the need to maintain separate relationships for fiat and crypto flows.

---

## Layer 3: Accounting

Crypto companies use the **same accounting software as everyone else** — QuickBooks, Xero, or NetSuite for larger operations. The unique requirement is tracking digital assets alongside traditional financials.

### The crypto accounting challenge

Digital assets create specific accounting needs:

- **Asset valuation** — What are the tokens worth at any given point? (Mark-to-market, cost basis tracking)
- **Capital gains/losses** — When tokens are bought, sold, or swapped, gains and losses must be calculated
- **On-chain transaction history** — Every on-chain transaction needs to be pulled, categorized, and reconciled
- **Multi-chain complexity** — Assets may be spread across Ethereum, Solana, and other chains

### Crypto sub-ledger solutions

Specialized tools bridge the gap between on-chain activity and traditional accounting systems:

| Product | What it does |
|---------|-------------|
| **Bitwave** | Crypto sub-ledger; syncs on-chain transactions into NetSuite (Built for NetSuite certified), Sage Intacct (approved MPP integration), QuickBooks, Xero |
| **Cryptio** | Full ERP platform for digital assets — accounting, reconciliation, compliance; 450+ institutional clients (Circle, Gemini, Uniswap); SOC 1 & SOC 2 audited by PwC; $45M Series B (March 2026) |
| **Tres Finance** | Crypto accounting and reporting; supports 220+ blockchains; serves DeFi protocols, DAOs, exchanges, and asset managers; SOC 1 & SOC 2 compliant |
| **Cryptoworth** | Crypto accounting and bookkeeping (reconciliation, month-end close, ERP sync); supports 200+ blockchains, 80+ exchanges; SOC 2 certified |
| **CoinTracker** | Primarily tax-focused; capital gains calculation, IRS Form 8949 generation; 3M+ users; targets individual investors more than enterprises |

These tools pull transaction data from chains, calculate cost basis and capital gains, categorize transactions, and push the results into the company's accounting system as journal entries.

### Current limitations

- Most of these tools are **early-stage** with varying quality
- **New chain support** is inconsistent — a tool that works well for Ethereum may not support newer chains (e.g., Tempo)
- Integration with accounting software can be fragile
- The market is small, so tooling lags behind what exists for traditional finance

---

## The Full Picture

Putting it all together, a crypto company's financial stack looks like:

| Layer | What they use | Same as traditional? |
|-------|-------------|---------------------|
| **Accounting** | QuickBooks, Xero, or NetSuite | Yes — identical |
| **Crypto sub-ledger** | Bitwave, Cryptio, Tres Finance | No — unique to crypto |
| **Banking** | Mercury, Meow, Slash | Mostly — same products but harder to onboard |
| **On/off-ramp** | Bundled with bank, or separate service | No — unique to crypto |
| **Expense management** | Ramp, Brex (native stablecoin payments since 2025), etc. | Yes — standard tools; Brex has crypto-specific features |
| **Digital asset custody** | Safe, Squads, Fireblocks | No — unique to crypto |

**The key insight:** Crypto companies are 80% identical to any other small-to-mid business. The 20% that's different is digital asset custody and the accounting bridge between on-chain activity and traditional books.

---

## Pain Points

### 1. On/off-ramp is improving but still painful for business flows

Moving between fiat and stablecoins has improved rapidly — Bridge (acquired by Stripe for $1.1B) now offers stablecoin financial accounts in 101 countries, Mastercard partnered with MoonPay and Paxos for stablecoin transactions at 150M+ merchant locations, and MoonPay has 20M+ KYC'd users. However, **high-volume business flows** — like paying a contractor in India with USDC and off-ramping directly to their local bank — still involve friction: fees typically range 0.5–5%, bank transfers are cheaper but slower, and coverage remains uneven in emerging markets. Crypto companies feel this acutely because they operate on both sides of the fiat/crypto divide daily.

### 2. Bank account access is precarious

Crypto companies live in fear of losing their bank accounts. A House Financial Services Committee report (December 2025) documented at least **30 digital asset entities** losing banking access between 2022–2024 under what the industry calls "Operation Choke Point 2.0." Account closures occurred with as little as 24–72 hours notice. The collapse of Silvergate Bank and seizure of Signature Bank in 2023 further reduced options. The Trump Administration has since reversed key policies, but the historical pattern created lasting operational anxiety. Even Mercury, the most popular option, has documented cases of closing crypto company accounts.

### 3. Crypto accounting tooling is immature

The crypto sub-ledger space is early. Tools break, new chains aren't supported, integrations are unreliable. For a crypto company on a newer chain, there may be no tooling at all — leaving them to manually track on-chain activity and reconcile it with their accounting system.

### 4. No unified view

Crypto companies manage money across:
- Traditional bank accounts (Mercury, etc.)
- On-chain wallets (Safe, Squads, Fireblocks)
- Possibly multiple chains
- Possibly multiple stablecoins and tokens

There's no single dashboard that shows the full picture — fiat + crypto, across all chains and banks, in real-time.

---

## What Can Be Learned for Enterprise

While crypto companies are a small market, their experience highlights patterns relevant to building on-chain treasury for larger enterprises:

1. **Accounting integration is non-negotiable** — On-chain transactions must flow into existing accounting systems (QuickBooks, Xero, NetSuite). If they don't, adoption won't happen.

2. **On/off-ramp quality determines adoption** — The bridge between fiat and stablecoins is the bottleneck. Fast, cheap, reliable on/off-ramp is the killer feature.

3. **Custody is a solved problem** — Multi-sig and MPC solutions already exist and work well. No need to reinvent this.

4. **The real product is infrastructure, not interface** — Crypto companies don't want another portal. They want their existing tools (accounting software, banking) to seamlessly include on-chain activity.

---

*This is Part 5 of an 8-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **Crypto-Native Banking** — How crypto companies organize their financial operations *(this document)*
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
