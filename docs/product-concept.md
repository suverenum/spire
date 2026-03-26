# Corporate Finance, Rebuilt on Stablecoin Rails

*Codename: Goldhord*

**Cross-border settlement is the wedge. The primary corporate account is the destination.**

---

## 1. The Problem

Mid-market companies ($0.5B-$5B revenue) with subsidiaries across countries need to move money between their own entities constantly -- funding operations, settling intercompany balances, paying local vendors. On developed corridors (US-US, US-EU, EU-UK) this works fine. But the moment money needs to flow to Latin America, India, Africa, or Southeast Asia, SWIFT breaks down:

- **It's slow.** Cross-border payments through correspondent banking take 1-3 business days, sometimes longer. Cash gets trapped in transit.
- **It's expensive.** FX spreads and intermediary fees on emerging-market corridors run 2-7% per transaction. For a company moving $50M/year between entities, that's $1M-$3.5M lost to the banking layer.
- **It's opaque.** Intermediary fees are unpredictable, FX markups are hidden, and failed payments from formatting errors or compliance holds are common.

This is the core pain: **moving money between your own subsidiaries across broken corridors costs too much and takes too long.**

A second pain compounds this: **integrating stablecoins with enterprise accounting is a mess.** Companies experimenting with on-chain payments struggle to get transactions into their ERP (NetSuite, SAP, Dynamics). Crypto sub-ledger tools exist but are immature and clunky. Without clean ERP integration, on-chain treasury is a dead end for any serious finance team.

**~12,000 companies in the US and Europe have this problem -- multi-entity, multi-country, stuck on broken corridors, and underserved by every existing solution.**

---

## 2. Existing Solutions

The default option is **SWIFT** -- slow (1-3 days on emerging-market corridors), expensive (2-7% all-in on FX spreads and intermediary fees), and opaque (you don't know the final cost until the money arrives). It works fine for US-EU and EU-UK. It breaks down on LATAM, India, Africa, and Southeast Asia.

The real alternative today is **neobanks with global local accounts -- primarily Airwallex** ($800M-$1B ARR, 60+ countries) and to a lesser extent Revolut Business (EEA/UK only). Airwallex is a serious product: local accounts on both sides of a corridor let entities bypass SWIFT via internal book transfers. They have multi-entity visibility, unified approval workflows, and ERP integration (NetSuite, Xero).

**Airwallex is the closest existing solution and the primary competitor.** What it doesn't do:

- **Limited ERP depth.** NetSuite and Xero only. No SAP S/4HANA, no Dynamics 365 -- the two dominant ERPs for the upper end of mid-market.
- **LATAM coverage still building.** Brazil and Mexico entered in 2025. Not all corridors are live with local rails.

On the crypto side, **on-chain multi-sig wallets** (Safe: $100B+ secured assets, Squads: $10B+ on Solana) offer smart contract accounts with basic approval logic. But they have no ERP integration, no bank connectivity, and no treasury logic -- built for DAOs and crypto-native teams, not CFOs.

The other notable development is **bank blockchain rails** -- JPMorgan Kinexys ($5B+/day), Citi Token Services. Real institutional settlement, but only available to large institutional clients with existing banking relationships. Opaque, bespoke pricing. Mid-market is locked out entirely. Indirect access via intermediaries (Corpay, regional bank consortia) is emerging but 2-3 years away.

**The gap:** Airwallex solves cross-border payments but not treasury management. Bank blockchain rails solve settlement but exclude the mid-market. We build the treasury layer on top of stablecoin rails -- intercompany netting, per-entity governance, deep ERP integration -- with near-zero settlement cost and no institutional gatekeeping.

---

## 3. The Solution

Goldhord replaces SWIFT on the corridors where it fails. Each legal entity in the corporation gets its own stablecoin wallet. Intercompany transfers settle in seconds -- not days -- and cost near-zero instead of 2-7%. When money needs to become local currency (for payroll, taxes, local vendors), it off-ramps through local rails at the destination: PIX in Brazil, SPEI in Mexico, UPI in India.

On top of the payment rails, Goldhord adds what neobanks don't have: **programmable treasury policies and custom approval flows.** Per-entity spending limits enforced on-chain. Configurable approval chains -- e.g., transfers under $10K auto-approved, $10K-$100K requires the local controller, above $100K requires CFO + CEO. Different rules per entity, per currency, per destination. The policies are transparent, auditable, and can't be bypassed -- they're enforced by smart contracts, not a server that someone can override.

The entire system appears inside the company's existing ERP as just another set of bank accounts. The CFO sees USDC balances alongside their Deutsche Bank and HSBC accounts in NetSuite or SAP. Transactions flow into the general ledger automatically as standard accounting entries. No manual reconciliation, no clunky crypto sub-ledgers.

The CFO never needs to learn crypto. The stablecoin rails are invisible infrastructure -- the experience is faster, cheaper intercompany payments with real governance, that just show up in the ERP.

---

## 4. Vision

Today, moving money between your own subsidiaries across borders feels like the 1990s -- fax-era infrastructure underneath a digital veneer. SWIFT was designed for banks talking to banks, not for companies managing their own multi-entity cash flows. Every intermediary takes a cut. Every conversion adds delay. Every reconciliation is manual.

Goldhord's vision is a world where **intercompany settlement is instant, free, and invisible** -- the same way internal transfers between accounts at the same bank work today, but across any entity, any country, any currency.

**Phase 1: B2B payments -- replace SWIFT on broken corridors.** Start where the pain is sharpest -- LATAM, India, Africa, Southeast Asia. Stablecoin rails for intercompany transfers, with local off-ramp at the destination. Deep ERP integration so it's invisible to the finance team.

**Phase 2: Treasury -- become the financial layer.** As trust builds and balances grow, add treasury governance -- programmable policies, cash forecasting, FX tools. Yield on idle balances through RWA products. Obtain custodial licenses (MiCA, US trust charter). Companies move from transactional use to storing operating reserves on-platform.

**Phase 3: Become the primary corporate account.** Full banking capabilities -- local currency accounts, cards, vendor payments, payroll, credit. Licensed across key jurisdictions (EU banking license, US trust charter). Companies consolidate from 5-10 bank relationships to Goldhord as the primary account, with legacy banks as secondary.

**Phase 4: Financial control center.** If we hold the money and process the payments, we have all the financial data. In the AI age, that's the foundation for replacing the financial modules of the ERP -- cash forecasting, AP/AR automation, consolidated reporting, tax optimization -- not as a dumb ledger, but as an intelligent system that acts on the data it already has. The mid-market ERP financial module ($10K-$100K/year for NetSuite alone) is ripe for disruption by a system that doesn't just record transactions but originates them.

The end state: Goldhord is the financial operating system for mid-market multinationals -- primary bank, treasury, and financial control center in one. From payments to reporting to forecasting, powered by the data advantage of being where the money actually lives.

---

## 5. Why Now

Three things changed in 2025 that make this possible today but not two years ago:

**1. Regulatory clarity arrived.** The GENIUS Act (signed July 2025) created the first US federal framework for payment stablecoins. MiCA went live in the EU. The OCC granted conditional charter approvals to five crypto companies in a single day (December 2025). For the first time, a CFO can adopt stablecoin rails without betting on regulatory uncertainty.

**2. Payment infrastructure became institutional-grade.** Stripe acquired Bridge for $1.1B (February 2025) and built stablecoin financial accounts in 101 countries. Mastercard is acquiring BVNK for up to $1.8B (March 2026). Visa launched its Stablecoin Platform. The on/off-ramp layer is no longer a startup experiment -- it's backed by the largest payment companies in the world.

**3. The incumbents validated the market.** Ripple acquired GTreasury (the treasury management system) for $1B (October 2025) -- an explicit bet that blockchain and corporate treasury are converging. Fireblocks acquired TRES Finance for $130M (January 2026) to bridge custody and ERP. 23% of large-company CFOs plan treasury crypto use within 2 years. B2B stablecoin payments hit $226B annualized with 733% YoY growth -- from a near-zero base.

The rails are ready, the regulation is clear, and the incumbents are moving -- but nobody has built the product yet. The window is open.

---

## 6. Moat & Unfair Advantage

**The moat is the combination, not any single feature.** Neobanks have payment rails. TMS vendors have treasury logic. Multi-sig wallets have on-chain accounts. Nobody has all three in one product for the mid-market.

**Switching costs compound over time.** Once installed, the product becomes hard to rip out:
- All entity accounts, signers, and approval policies are configured
- Bank details are distributed to counterparties
- ERP integration is wired into month-end close processes
- Historical transaction data and audit trails live in the system

**On-chain policies are a structural advantage.** Approval flows and spending limits enforced by smart contracts can't be bypassed by a rogue admin or a compromised server. This is a security and governance guarantee that no neobank or TMS can match -- their policies live on servers they control. For a CFO managing a multi-entity treasury, "the rules are enforced by code, not by trust" is a tangible differentiator that gets stronger with regulation.

**Network effects emerge as adoption grows.** When two companies on Goldhord pay each other, both sides get instant, near-free settlement -- creating incentive for CFOs to recommend it to counterparties. Each new company on the network makes the product more valuable for everyone already on it.

**Yield on idle balances creates retention.** Treasury wallets holding USDC between payment cycles can earn yield through RWA or deposit products -- a financial incentive to keep balances on-platform that traditional bank accounts can't match at comparable rates.

---

## 7. Go-to-Market

**Target segment:** Mid-market multi-entity companies ($0.5B-$5B revenue), 2+ countries, using NetSuite/SAP/Dynamics. ~12,000 companies in US + Europe. The subset with heavy emerging-market operations and frequent cross-border payments is the initial wedge.

**Early adopters:** Tech companies with technical CFOs and emerging-market exposure. SpaceX already uses Bridge (Stripe) for stablecoin-based Starlink payments in emerging markets. Tech companies have less institutional inertia, are comfortable with on-chain concepts, and their CFOs evaluate new tools independently.

**The buyer:** The CFO. Below ~$500M revenue, the CFO *is* the treasury manager -- no dedicated team. They feel the cross-border pain every day. Decision chain: CFO (champion) → IT/CIO (security review) → CEO sign-off. Legal/Compliance review likely given novelty. Deal timeline: weeks to low single-digit months.

**Sales motion:** Direct B2B SaaS -- webinars, conferences, whitepapers, direct outreach. No PLG shortcut. These are established companies, not startups signing up for free tiers. The pain is specific and quantifiable ($1M-$3.5M/year lost to FX and intermediary fees on $50M in cross-border volume), which makes ROI conversations concrete.

---

## 8. Market Size

**The macro context:** Stablecoin supply exceeded $300B in 2025 (135% YoY). On-chain transfer volume hit $33 trillion. B2B stablecoin payments reached $226B annualized with 733% YoY growth -- but still less than 0.5% of global B2B flows. The defining trend: payment giants are acquiring stablecoin infra (Stripe/Bridge $1.1B, Mastercard/BVNK $1.8B, Ripple/GTreasury $1B). The rails are being built. The application layer is wide open.

**The economics: 10x cheaper than banks, still large revenue per client.**

Banks earn $1.2M-$2M/year from a mid-market client (McKinsey) -- deposit spreads, FX markups of 3-5%, treasury fees, lending. We undercut them dramatically while still building a large revenue base:

| Revenue stream | What banks charge | What we charge | Our take |
|---|---|---|---|
| **Cross-border FX** | 3-5% spread ($150K-$500K/yr on $50M volume) | 0.5-1% ($50K-$100K) | **5-10x cheaper** |
| **Treasury/platform fees** | $150K-$400K/yr | $24K-$60K/yr | **3-6x cheaper** |
| **Payment processing** | $25K-$75K/yr | Near-zero (on-chain) | **~Free** |
| **Wire/correspondent fees** | $10K-$50K/yr | $0 (no intermediaries) | **Eliminated** |
| **Yield on idle balances** | NIM kept by bank | Shared with client, 0.5% margin to us | Client earns too |
| **Total cost to client** | **$1.2M-$2M/yr** | **$100K-$200K/yr** | **~10x cheaper** |

Our revenue per client: **$100K-$200K/year** (platform + FX/off-ramp + yield margin). The client saves $1M+/year vs. their bank. That's the sales pitch.

**TAM (Total Addressable Market):** ~16,000-28,000 mid-market companies with multi-entity international operations in US + Europe. At $150K average revenue per client: **$2.4B-$4.2B/year.** Kyriba alone processes $15T in annual payments across 3,400 clients. Even capturing a fraction of mid-market cross-border volume creates a large revenue base.

**SAM (Serviceable Available Market):** ~12,000 companies -- the subset with genuine multi-entity cross-border operations (45-60% of the full mid-market band). At $150K average: **$1.8B/year.** For context: NetSuite has 43,000+ customers, Dynamics 365 Business Central has 50,000+.

**SOM (Serviceable Obtainable Market):** In years 1-3, targeting ~2,000-3,000 companies with heavy emerging-market exposure, tech-forward CFOs, and acute cross-border pain. At $150K average: **$300M-$450M/year** obtainable revenue.

**Expansion vectors:**
- **Downmarket** ($100M-$500M) -- treasury pain is acute, budgets are smaller but volume is large
- **Upmarket** ($5B-$50B) -- as the product matures, move into large enterprise
- **Phase 3 revenue** -- as we become the primary account (lending, cards, full banking), revenue per client approaches $500K-$800K -- still 2-3x cheaper than banks, but much higher ARPU

---

## 9. How It Works

```
                        GOLDHORD TREASURY
   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │  Entity A (US HQ)     Entity B (Germany)        │
   │  ┌───────────────┐    ┌───────────────┐        │
   │  │ USDC wallet   │◄──►│ USDC wallet   │        │
   │  │ On-ramp: ACH  │    │ On-ramp: SEPA │  ...   │
   │  │ Off-ramp: USD │    │ Off-ramp: EUR │        │
   │  │ Signers: CFO  │    │ Signers: EU   │        │
   │  │         CEO   │    │  Controller   │        │
   │  └───────────────┘    └───────────────┘        │
   │          instant, free transfers (USDC)         │
   └──────────────────────┬──────────────────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          ERP sync    On/off-ramp   Approval
        (NetSuite,   (Bridge,      policies
         SAP, D365)   Bitso)       & compliance
```

1. **Company creates a treasury** with one wallet per legal entity
2. **CFO configures approval policies per entity** -- spending limits, approval chains, role-based access, all enforced on-chain
3. **Each entity on-ramps fiat** through virtual accounts (ACH, SEPA) into USDC
4. **Intercompany transfers settle instantly** -- USDC moves between entity wallets in seconds, for free, after passing approval rules
5. **Off-ramp to local currency** when needed for payroll, taxes, or vendor payments -- through local rails (PIX in Brazil, SPEI in Mexico)
6. **All transactions sync to the ERP in real-time** as standard accounting entries

---

## 10. Key Building Blocks

**1. Treasury on crypto wallets**
- Create a treasury with multiple wallets holding stablecoins (USDC, USDT, USDG, EURC)
- Move tokens between wallets within the treasury
- Swap tokens (e.g., USDT → EURC)
- Send and receive tokens to/from external Tempo wallets
- Send and receive tokens from/to other chains (bridging)
- Basic contact/recipient book (chain, address)

**2. Multisig with policies and roles**
- Configurable policy per wallet or treasury -- signers, amounts, order, limits
- Whitelists and guardrails per wallet or treasury -- only between own accounts, only allowed addresses, only allowed networks
- Simple, easy-to-understand role model for non-crypto users

**3. On/off-ramp**
- Off-ramp: send money to physical bank accounts in local currency
- On-ramp: receive money from fiat into stablecoin wallets
- Extended contact book with fiat accounts, address validation, payment details validation
- Associate wallets with legal entities and their bank accounts
- Document and data collection for payment screening and regulation

**4. KYB (enabler for #3)**
- Client onboarding via Sumsub
- Pass verified KYB data to multiple payment providers

**5. Fee management**
- No fees for moving between own accounts
- Fees on off-ramp, no fees on on-ramp
- Transparent FX rate with our markup
- Limits on free transfers; no limits for active accounts

**6. Compliance checks**
- On-chain address screening (sanctions, risk scoring)
- Automatic counterparty/supplier checks
- Transaction monitoring (velocity, patterns, anomalies)

**7. Yield products**
- Simple yield on idle balances (e.g., BlackRock tokenized deposits / RWA)

**8. ERP integration**
- Real-time sync with NetSuite, Oracle Fusion Cloud, Dynamics 365, Sage Intacct
- Standard export formats (MT940, BAI2, CAMT.053)
- Stablecoin transactions appear as standard accounting entries

**9. Programmable payments**
- Trigger → Condition → Action (rule-based automation)
- Scheduled transfers, auto-sweep, conditional approvals, recurring payments

**10. Account security**
- Passkeys as the base authentication layer
- Hardware Ledger for elevated operations
- OTP with second factor as an option

**11. Custodian capabilities (future)**
- Ability to block transactions and freeze accounts (mandatory for licensed custody)
- Co-signer becomes mandatory -- compliance checks enforced, no admin override
- Architecture designed as contract upgrade, not rebuild (optional co-signer → mandatory co-signer)
- Custodial license (MiCA in EU, state trust charter in US)
- Insurance coverage for client assets
- SOC 2 Type II certification

**12. Insights & analytics (future)**
- Cash position reporting across all entities in real-time
- Cash flow forecasting -- short-term (weekly), medium-term (13-week rolling)
- FX exposure analysis and hedging recommendations
- Intercompany netting optimization -- suggest net settlements to minimize transactions
- Corridor cost analytics -- compare FX rates across providers, track savings vs. SWIFT
- The foundation for Phase 4 (financial control center) -- AI-driven AP/AR automation, consolidated reporting, tax optimization

---

## 11. Roadmap

### Prototype (weeks 1-2): On-chain treasury

Demonstrate the core loop end-to-end on mainnet:

- Create a treasury with 2-3 wallets (entities)
- Move USDC between wallets
- Basic passkey authentication (#10)
- Simple 1-of-1 signing (no multisig yet)
- **Treasury with wallets** (#1) -- create treasury, multiple wallets, hold USDC, move tokens between wallets, basic contact book
- Send and receive tokens to/from external Tempo wallets
- Token swaps (e.g., USDT → USDC, USDC → EURC)
- Cross-chain send/receive (bridging)
- Simple UI for the CFO -- balances, transaction history, send/receive
- CSV/Excel export for manual import into accounting systems (QuickBooks, Xero, NetSuite)
- Shows to early design partners

### MVP (month 1): Payments and security

First real transactions on mainnet with 1-2 friendly customers:

- **Account security** (#10) -- passkeys + hardware Ledger
- **KYB** (#4) -- client onboarding via Sumsub, pass data to payment providers
- **On/off-ramp** (#3) -- fiat on-ramp and off-ramp across multiple countries via Due Network (single provider, broad coverage including US, EU, UK, LATAM, India, Africa, SEA)
- **Fee management** (#5) -- free intercompany transfers, transparent FX markup on off-ramp

### V1 (months 2-3): Policies and ERP

Usable product for 5-10 paying customers:

- **Multisig with policies** (#2) -- per-wallet signing policies, role model, whitelists
- **ERP integration** (#8) -- NetSuite connector, standard export formats (MT940, BAI2, CAMT.053)

### V2 (months 4-6): Compliance

Production-grade for mid-market, LATAM corridors live:

- **Compliance** (#6) -- on-chain address screening, counterparty checks, transaction monitoring (velocity, patterns, anomalies)
- **Entity-wallet association** (#3) -- link wallets to legal entities and their bank accounts; second off-ramp provider (Bridge) for redundancy
- Document/data collection for payment screening
- Extended contact book with fiat accounts and payment details validation

### Year 1 (months 7-12)

Scale to 20-50 customers, expand corridors and integrations:

- **Programmable payments** (#9) -- scheduled transfers, recurring payments, auto-sweep
- **ERP expansion** (#8) -- Oracle Fusion Cloud, Dynamics 365, Sage Intacct
- **Yield products** (#7) -- yield on idle balances (BlackRock tokenized deposits / RWA)
- SOC 2 Type II certification

### Year 2-3: Treasury layer

- **Insights & analytics** (#12) -- cash position reporting, cash flow forecasting, FX exposure analysis, netting optimization
- **Advanced analytics** (#12) -- netting automation, corridor cost analytics, hedging recommendations
- **Advanced programmable payments** (#9) -- conditional approvals, trigger-based automation
- **Custodian capabilities** (#11) -- licensed custodian (MiCA in EU, state trust charter in US), mandatory compliance, insurance, tx blocking, account freezing

