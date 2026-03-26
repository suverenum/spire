# On-chain treasury that replaces SWIFT for mid-market multinationals

## Move money between your subsidiaries in seconds, not days -- with on-chain approval policies and real-time ERP integration.

---

### Solution

Starting today, multi-entity companies can create a treasury where each legal entity gets its own stablecoin wallet. Intercompany transfers settle in seconds, for free. Off-ramp to local currency (USD, EUR, GBP, BRL, MXN, INR, and 50+ more) happens through local rails via Due Network. Per-entity approval policies are enforced on-chain -- configurable signing thresholds, whitelists, and role-based access that can't be bypassed. All transactions sync to NetSuite in real-time as standard accounting entries, or export as CSV/MT940/BAI2/CAMT.053 for any other ERP.

The CFO never touches crypto. They see stablecoin balances alongside traditional bank accounts in their existing dashboard.

**Delivery in three steps:**

- **Prototype (weeks 1-2):** Treasury with wallets, token transfers and swaps, cross-chain bridging, passkey auth, CSV export. Show to design partners.
- **MVP (month 1):** Fiat on/off-ramp across 50+ countries (Due Network), KYB onboarding (Sumsub), hardware Ledger + account recovery, fee management. First 1-2 paying customers.
- **V1 (months 2-3):** Multisig with per-entity policies and roles, whitelists and guardrails, NetSuite integration with standard export formats. 5-10 paying customers.

---

### Problem

Mid-market companies ($0.5B-$5B revenue) with subsidiaries across countries lose $1M-$3.5M/year to FX spreads and intermediary fees on emerging-market SWIFT corridors. Transfers take 1-3 business days. ~12,000 companies in the US and Europe have this problem.

No affordable treasury tooling exists for this segment. TMS platforms (Kyriba, GTreasury) cost $100K-$500K/year and take 6-18 months to deploy. Airwallex solves cross-border payments but has no per-entity governance, limited ERP depth (NetSuite and Xero only), and still charges FX spreads on every conversion. Multi-sig wallets (Safe, Squads) have no ERP integration, no bank connectivity, no treasury logic.

The second pain: integrating stablecoins with enterprise accounting is a mess. Crypto sub-ledger tools exist but are immature. Without clean ERP integration, on-chain treasury is a dead end for any serious finance team.

---

### Why us, why now

**Regulatory clarity arrived.** GENIUS Act (July 2025), MiCA live in EU, OCC granted five conditional charters (December 2025). **Payment infrastructure is institutional-grade.** Stripe/Bridge ($1.1B), Mastercard/BVNK ($1.8B), Visa Stablecoin Platform. **The incumbents validated the market.** Ripple acquired GTreasury for $1B (October 2025). 23% of large-company CFOs plan treasury crypto use within 2 years. B2B stablecoin payments at $226B annualized, 733% YoY growth.

Nobody has combined on-chain wallets + treasury governance + ERP integration in a product the mid-market can afford. We measure success by: active treasuries, monthly transaction volume (USDC moved between entities), off-ramp volume by corridor, and Net Revenue per customer.

---

### Customer quote

"We move $4M/month between our US HQ and Brazil subsidiary. SWIFT costs us $120K-$200K/year in FX spreads alone, and every transfer takes 2 days. If we could settle in seconds at 0.5%, that's $80K-$160K saved annually. But I'm not using a crypto wallet -- it needs to show up in NetSuite like any other bank account." -- CFO, mid-market tech company with LATAM operations.

---

### Out of scope

- Cards, expense management, invoice processing (Ramp, Brex, SAP Concur)
- Full accounting / general ledger (lives in ERP)
- Lending, credit facilities (Phase 3)
- SWIFT integration (defeats the purpose)
- Compliance/AML transaction monitoring (V2 -- rely on provider's compliance for V1)
- Entity-to-bank-account association UI (V2)
- Multiple off-ramp providers / redundancy (V2 -- Bridge added as second provider)
- Programmable payments -- scheduled transfers, auto-sweep (Year 1)
- Yield products on idle balances (Year 1)
- Intercompany netting, FX hedging, cash forecasting (Year 2-3)

---

### How to get started

1. Sign up with passkey. Create a treasury.
2. Add entities (US HQ, Germany subsidiary, Brazil subsidiary). Each gets a wallet.
3. Complete KYB once via Sumsub. Verification passes to Due Network.
4. Fund entity wallets -- on-ramp fiat via ACH, SEPA, or local bank transfer.
5. Move money between entities instantly (USDC, free).
6. Off-ramp to local currency when needed -- select bank account, see FX rate with markup, confirm.
7. (V1) Configure approval policies per entity. Connect NetSuite.

---

### FAQs

**Q: Why Due Network and not Bridge for MVP?**
A: Due Network covers US, EU, UK, LATAM, India, Africa, SEA through a single integration. Bridge is added in V2 for redundancy. One provider keeps MVP scope tight.

**Q: Why is compliance monitoring in V2?**
A: V1 relies on Due Network's built-in AML/KYC compliance. We add our own preventive monitoring in V2 to improve traffic quality and protect provider relationships.

**Q: Why NetSuite first?**
A: Dominant mid-market ERP (43K+ customers, sweet spot $5M-$500M revenue). Oracle Fusion Cloud, Dynamics 365, and Sage Intacct follow in Year 1.

**Q: How does signing work?**
A: Prototype: 1-of-1 via passkey. MVP: adds hardware Ledger for elevated operations + account recovery. V1: configurable multisig (e.g., 2-of-3 above $100K, whitelists, role-based access), enforced on-chain.

**Q: What chain?**
A: Tempo (tempo.xyz) -- purpose-built L1 for stablecoin payments, built by Stripe. Cross-chain bridging available from prototype.
