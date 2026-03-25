# Payment Corridors

What multi-entity multinational corporations need from on-chain treasury — corridors, on/off-ramp, netting, and the MVP feature set.

*Part 6 of a 9-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## What Multi-Entity Corporations Need

Previous lectures established that the core on-chain treasury opportunity is with **multi-entity, multinational corporations** that need to move money between subsidiaries across countries. This lecture focuses on the specifics: what exactly needs to be built, which corridors matter, and how the product should work.

---

## Treasury Architecture

### The structure

A corporate on-chain treasury maps directly to their legal entity structure:

```
┌─────────────────────────────────────────────────────┐
│                    TREASURY                          │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Entity A     │  │  Entity B     │  │ Entity C  │ │
│  │  (US - HQ)    │  │  (Germany)    │  │ (Brazil)  │ │
│  │               │  │               │  │           │ │
│  │  Wallet       │  │  Wallet       │  │ Wallet    │ │
│  │  - USDC       │  │  - USDC       │  │ - USDC    │ │
│  │               │  │               │  │           │ │
│  │  On-ramp:     │  │  On-ramp:     │  │ On-ramp:  │ │
│  │  Virtual USD  │  │  Virtual EUR  │  │ Virtual   │ │
│  │  account      │  │  account      │  │ BRL acct  │ │
│  │               │  │               │  │           │ │
│  │  Off-ramp:    │  │  Off-ramp:    │  │ Off-ramp: │ │
│  │  Linked bank  │  │  Linked bank  │  │ Linked    │ │
│  │  accounts     │  │  accounts     │  │ bank acct │ │
│  │               │  │               │  │           │ │
│  │  Signers:     │  │  Signers:     │  │ Signers:  │ │
│  │  CEO, CFO     │  │  EU Controller│  │ LATAM     │ │
│  │               │  │  CFO          │  │ Controller│ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                     │
│  Instant transfers between any entities (USDC)      │
└─────────────────────────────────────────────────────┘
```

### Key components per entity

Each entity within the treasury needs:

| Component | What it is |
|-----------|-----------|
| **Wallet** | On-chain wallet holding stablecoins (primarily USDC) |
| **Virtual account (on-ramp)** | Bank details where the entity can send fiat to convert into stablecoins |
| **Linked bank accounts (off-ramp)** | The entity's existing bank accounts where stablecoins can be converted back to fiat |
| **Signing policy** | Who can authorize transactions — different signers per entity |
| **Visibility rules** | Who can view which entity's balances and transactions |

### How it appears in ERP

In the corporation's ERP (SAP, NetSuite, Dynamics), the on-chain treasury wallet shows up as **just another bank account**:

```
Entity: OOO Romashka (Germany)
├── Deutsche Bank - EUR operating account
├── HSBC - EUR payroll account
└── Tempo Treasury - USDC account     ← on-chain wallet
```

The finance team sees USDC balances alongside traditional bank balances. Transactions flow into the general ledger like any other bank feed.

---

## The Netting Insight

A critical behavior of multinational corporations: they practice **netting** — minimizing the number of actual cross-border payments by offsetting intercompany balances.

### How netting works

Instead of each subsidiary paying each other individually:

```
Before netting:
Entity A → Entity B: $500K
Entity B → Entity A: $300K
Entity A → Entity C: $200K
Entity C → Entity A: $150K

After netting:
Entity A → Entity B: $200K  (net of $500K - $300K)
Entity A → Entity C: $50K   (net of $200K - $150K)
```

### The base currency pattern

Companies run their internal intercompany accounting in a **single base currency** — typically USD for American corporations. They:

1. **Hold stablecoins in USDC** across all entities as long as possible
2. **Transfer between entities in USDC** — instant, free, on-chain
3. **Convert to local currency only when needed** — for local payroll, tax payments, local vendor payments

This means the on-chain treasury is primarily a **USDC treasury** with off-ramp to local currencies at the point of need. The corporation actively tries to minimize conversions and keep value in the base currency.

---

## Payment Corridors

### Which corridors matter

Not all cross-border payment corridors have problems. Some work fine with traditional banking:

| Corridor | Status | Notes |
|----------|--------|-------|
| **Within US** (ACH, Fedwire) | Works fine | No stablecoin advantage |
| **Within Europe** (SEPA) | Works fine | SEPA Instant mandated for all eurozone banks by Oct 2025; settles in <10 seconds, 24/7 |
| **EU ↔ UK** (SEPA/FPS) | Works fine | Minor friction but manageable |
| **US ↔ Europe** | Mostly fine | SWIFT GPI has improved this |
| **US/EU → Latin America** | Painful | Slow, expensive, opaque FX |
| **US/EU → India** | Painful | Compliance friction, FX controls |
| **US/EU → Africa** | Painful | Limited rails, high fees |
| **US/EU → Southeast Asia** | Painful | Fragmented, country-by-country |
| **US/EU → Middle East** | Varies | UAE relatively good; others harder |

**The stablecoin advantage only matters where traditional rails are broken** — primarily corridors into Latin America, India, Africa, and Southeast Asia.

### Tier 1: MVP corridors

The minimum viable set of payment corridors:

**Supported regions:**
- **US** — On-ramp and off-ramp via ACH/wire
- **Europe** — On-ramp and off-ramp via SEPA
- **UK** — On-ramp and off-ramp via FPS (Faster Payments)
- **Latin America** — Mexico, Brazil, Colombia, Argentina, Chile

**Payment providers for MVP:**
- **Bridge** (acquired by Stripe for $1.1B, Feb 2025) — Stablecoin financial accounts in 101 countries; core coverage: US, Europe, UK, LATAM; Visa stablecoin-linked cards in 18+ countries
- **Bitso** — LATAM's largest crypto platform (8M+ users, 1,700+ B2B clients); direct operations in Mexico, Brazil, Colombia, Argentina with local licenses
- **Dlocal** — 44 markets across LATAM, Africa, Asia, Middle East; 900+ local payment methods; $41B TPV in FY 2025; clients include Amazon, Uber, Netflix

**Supported stablecoins:**
- **USDC** — Primary. Considered the corporate compliance standard (Circle, regulated, transparent reserves)
- **USDT** — Secondary. Higher liquidity in some markets but less corporate-friendly
- **EURC** — Limited liquidity currently; most companies will hold USDC and convert to EUR at off-ramp

> **Note:** EURC and other non-USD stablecoins currently lack the liquidity for institutional use. The practical approach is to denominate everything in USDC and convert at the off-ramp point.

### Tier 2: Expansion corridors

After MVP, the next set of corridors to add:

- **India** — Large market, significant remittance flows, but complex FX controls
- **Africa** — Nigeria, Kenya, South Africa
- **Southeast Asia** — Singapore, Philippines, Vietnam
- **Middle East** — UAE/Dubai

**Payment provider for Tier 2:**
- **Due Network** — Covers India, Africa, Southeast Asia, Middle East; available through existing relationship (former Revolut colleague)

### What competitors miss

Squads (Solana multi-sig, $15B+ in secured assets) is building SWIFT access through its Altitude product, though as of early 2026 it's not yet live. The strategic direction is questionable: if you're routing through SWIFT, you get all of SWIFT's problems — speed, cost, intermediaries. The whole value proposition of on-chain treasury is to **bypass SWIFT for the corridors where it's worst** (LATAM, India, Africa, SEA) by using stablecoins as the transfer mechanism with local off-ramp at the destination.

Squads/Altitude supports ACH, Wire, and SEPA and claims availability in 150+ countries, but lacks **dedicated local LATAM fiat rails** (PIX in Brazil, SPEI in Mexico) that are essential for practical use in the corridors that actually need solving. Without local payment method support, "available in 150+ countries" means little for the off-ramp use case.

---

## Onboarding Complexity

### Multi-entity KYB

Onboarding a multinational corporation is not like onboarding a startup. Each legal entity needs its own KYB (Know Your Business) process:

- A corporation with 10 entities = 10 separate KYB processes
- Each entity needs to be onboarded with each relevant payment provider
- Some entities may need to be onboarded with multiple providers (e.g., Bridge for US/EU + Bitso for LATAM)

**This will be a semi-manual process.** The corporation provides documentation for all entities, and the onboarding team processes them through each provider. Full automation is unrealistic for early customers.

### Provider-entity matrix

| Entity | Bridge (US/EU/UK) | Bitso (LATAM) | Due Network (India/Africa/SEA) |
|--------|-------------------|---------------|------------------------|
| US HQ | Yes | Maybe | Maybe |
| Germany subsidiary | Yes | No | Maybe |
| Brazil subsidiary | Yes | Yes | No |
| India subsidiary | No | No | Yes |
| Nigeria subsidiary | No | No | Yes |

Each entity needs to be registered with the providers that cover its corridors.

---

## FX Considerations

### The conversion problem

When a US company off-ramps USDC to pay a Brazilian subsidiary's local expenses in BRL, there's a currency conversion involved:

```
USDC → USD → BRL
     (1:1)  (market rate + spread)
```

The FX spread is where companies get burned — especially in emerging markets:

- **Developed markets** (USD/EUR, USD/GBP): tight spreads, 0.1–0.5%
- **LATAM** (USD/BRL, USD/ARS, USD/MXN): wider spreads, 0.5–3%+
- **Emerging markets** (USD/NGN, USD/INR): widest spreads, 1–5%+, sometimes with parallel market rates

In Argentina specifically, the gap between official and market exchange rates (the "blue dollar" premium) was routinely **80–150%** during the 2019–2023 cepo period, peaking near 200% in October 2023. Even after Milei's 54% devaluation in December 2023, the gap fluctuated between 4–60% before capital controls were largely lifted on April 14, 2025. Post-liberalization, the gap has narrowed to 2–7%, but the historical pattern illustrates how extreme FX distortions can become in emerging markets.

### Future capabilities

For MVP, FX conversion happens at the off-ramp provider's rate. Future improvements:

- **Transparent FX comparison** — Show the corporation what rate each provider offers and route optimally
- **FX hedging tools** — Allow corporations to lock in forward rates for planned conversions
- **Rate monitoring** — Alerts when rates are favorable for planned off-ramps

---

## MVP Feature Set

Summarizing what's needed to serve a multi-entity corporation:

### Must have (MVP)

| Feature | Description |
|---------|-------------|
| **Multi-entity treasury** | Create a treasury with multiple wallets, one per legal entity |
| **Multi-sig with per-entity policies** | Different signers and approval thresholds per entity |
| **On-ramp** | Virtual accounts (USD, EUR) where entities can send fiat to fund their wallets |
| **Off-ramp** | Linked bank accounts where stablecoins can be converted to local fiat |
| **Intercompany transfers** | Instant USDC transfers between entity wallets within the treasury |
| **Tier 1 corridors** | US, Europe, UK, LATAM (Mexico, Brazil, Colombia, Argentina, Chile) |
| **USDC support** | Primary stablecoin; USDT as secondary |
| **Multi-entity KYB** | Semi-manual onboarding process for all entities |
| **Visibility controls** | Role-based access — who can see which entities |
| **ERP/TMS integration** | Export transaction data in standard formats; API for real-time data |

### Nice to have (post-MVP)

| Feature | Description |
|---------|-------------|
| **Tier 2 corridors** | India, Africa, Southeast Asia, Middle East |
| **FX rate transparency** | Compare rates across off-ramp providers |
| **Netting automation** | Automatically calculate and execute net intercompany settlements |
| **FX hedging** | Forward contracts for planned conversions |
| **Yield on idle balances** | Earn yield on USDC held in treasury wallets |
| **Advanced analytics** | Cash flow forecasting, FX exposure reporting |

### Explicitly out of scope

| Feature | Why |
|---------|-----|
| **Cards** | Handled by Ramp, Brex, SAP Concur — peripheral tool |
| **Expense management** | Same — lives in peripheral tools |
| **Invoice processing** | Same |
| **SWIFT integration** | Defeats the purpose — if you go through SWIFT, use a bank |
| **Full accounting** | Lives in ERP (SAP, NetSuite, QuickBooks) |

---

*This is Part 6 of a 9-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **Payment Corridors** — What multi-entity corporations need and which corridors matter *(this document)*
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **[MPC 101](./mpc.md)** — Multi-Party Computation, threshold signatures, and custody architecture
