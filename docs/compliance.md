# Cross-Border Compliance

What regulatory requirements apply to cross-border payments, who bears the compliance burden, and what this means for a treasury app that sits on the application layer.

*Part 12 of a 12-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Three Questions

This lecture answers three questions:

1. **What requirements apply to companies making cross-border payments?**
2. **What requirements apply to the institutions processing those payments?**
3. **What requirements apply to us — a treasury application layer?**

---

## The Regulatory Framework

### Every country has its own rules, with some common threads

Cross-border payment regulations vary dramatically by jurisdiction — and not just in thresholds. Some countries classify crypto as currency, others as securities, others as property. China maintains a complete ban on all crypto transactions. El Salvador mandates merchant acceptance of Bitcoin. India allows trading but bans payments and applies a punitive 30% flat tax. The EU prohibits algorithmic stablecoins and yield on payment stablecoins under MiCA. The US fragments oversight across SEC, CFTC, Treasury, and IRS with no unified framework.

Despite these fundamental divergences, most regulating jurisdictions share common elements:

| Component | What it means |
|-----------|--------------|
| **Transaction reporting** | Above jurisdiction-specific thresholds, cross-border payments trigger mandatory information collection (thresholds vary significantly — see below) |
| **KYB/KYC on counterparties** | The institution processing the payment must verify the identity of both sender and receiver |
| **Source of funds documentation** | The payer must explain what the payment is for — contract, invoice, intercompany agreement |
| **AML screening** | Every transaction is screened against sanctions lists and risk databases |
| **Regulatory reporting** | The institution files reports with the relevant regulator (SAR, CTR, etc.) |

This is not a bank's choice — it's **the law**. Banks and payment providers are instruments of state compliance. They collect this information because regulators require it.

### What triggers enhanced scrutiny

Thresholds vary significantly by jurisdiction and report type:

**Travel Rule thresholds (originator/beneficiary data must accompany the transfer):**

| Jurisdiction | Threshold | Source |
|-------------|-----------|--------|
| **United States** | **$3,000** | 31 CFR 1010.410(e)/(f), confirmed by FinCEN guidance FIN-2019-G001 |
| **EU (Transfer of Funds Regulation)** | **€0 — no threshold** | TFR Regulation 2023/1113, Recital 30: "regardless of their amount" |
| **FATF Recommendation 16** | USD/EUR 1,000 (recommended, not binding) | FATF updated guidance, October 2021 |

> **Common confusion:** The $1,000 FATF recommendation is often cited as the US threshold — it is not. The US threshold is $3,000. The EU has no threshold at all for crypto transfers, making it materially stricter than both FATF and the US.

**SAR filing thresholds (when suspicious activity is detected):**
- **Banks (suspect identified):** $5,000+
- **Banks (no suspect identified):** $25,000+
- **MSBs including crypto exchanges:** **$2,000+** (31 CFR 1022.320)
- Institutions may voluntarily file below these thresholds under BSA safe harbor

**CTR threshold:** $10,000 for **cash transactions only** (31 CFR 1010.311). CTRs do not apply to on-chain stablecoin transfers — only to scenarios involving physical cash (e.g., crypto ATM operators dispensing cash).

### The standard documentation package

For a cross-border payment above the reporting threshold, the institution typically collects:

| Information | Purpose |
|------------|---------|
| **Who** is sending | Verified identity of the sender (KYB/KYC) |
| **Who** is receiving | Verified identity of the recipient |
| **Where** from / **where** to | Origin and destination countries, accounts |
| **How much** | Transaction amount and currency |
| **Why** | Purpose of payment — this is the key compliance item |
| **Supporting documents** | Contract, invoice, intercompany agreement, or other justification |

For **intercompany transfers** (between subsidiaries of the same corporation), this is relatively straightforward — the intercompany agreement and transfer pricing documentation usually suffice.

For **vendor payments**, it's more involved — invoice, purchase order, contract, and sometimes additional explanation of the business relationship.

### Key compliance forms and rules

| Form / Rule | What it is | Who files it |
|------------|-----------|-------------|
| **SAR** (Suspicious Activity Report) | Filed when a transaction appears suspicious above applicable thresholds ($2,000 for MSBs, $5,000 for banks) | The institution (bank, payment provider) |
| **CTR** (Currency Transaction Report) | Filed for **physical cash** transactions exceeding $10,000 (US). Does not apply to on-chain stablecoin transfers | The institution |
| **Travel Rule** | Requires originator and beneficiary information to travel with the transaction. US threshold: $3,000. EU: no threshold (all crypto transfers). | Both the originating and receiving institution |
| **FinCEN MSB registration** | Federal registration as a Money Services Business — required for all money transmitters in addition to state MTLs. Operating unregistered is a federal crime (18 U.S.C. § 1960) | The institution |
| **AML program** | Comprehensive anti-money laundering controls, monitoring, and reporting | The institution |

---

## What This Means for Each Party

### For the payment institution (the off-ramp/on-ramp provider)

The institution that processes the actual fiat-to-stablecoin or stablecoin-to-fiat conversion bears the heaviest compliance burden:

- **Must be licensed** — Money Transmitter License (US, state-by-state in 49 states + DC), FinCEN MSB registration (federal), EMI/PI or CASP license (EU under MiCA), or equivalent per country
- **Must run an AML program** — Transaction monitoring, sanctions screening, suspicious activity reporting
- **Must comply with the Travel Rule** — Collect and transmit originator/beneficiary information with every qualifying transfer ($3,000+ in US, all transfers in EU)
- **Must file regulatory reports** — SARs, CTRs (for cash), and jurisdiction-specific filings
- **Must maintain OFAC sanctions compliance** — Screen all transactions against sanctions lists (strict liability — applies regardless of business model)

This is an entire business in itself. Stablecoin-native infrastructure providers (Bridge/Stripe, Bitso) are purpose-built for this. Traditional payment processors (Thunes, dLocal) have recently layered stablecoin capabilities on top of their existing fiat infrastructure — they are primarily traditional payment networks, not crypto-native providers. All have dedicated compliance teams, licensing in multiple jurisdictions, and partnerships with partner banks. Some operate on their own licenses; others use a partner bank's license as the regulated entity.

### For the business (our client)

The business making cross-border payments has a familiar, bounded set of obligations:

- **Pass KYB onboarding** — Verify their identity, beneficial ownership, business purpose. This is the same KYB they already do with every bank and payment provider.
- **Provide transaction documentation** — Purpose of payment, supporting documents (invoices, contracts, intercompany agreements). This is the same information they already provide for SWIFT transfers.
- **Maintain records** — Keep documentation for audit purposes

**The KYB and documentation requirements are familiar** — any company that currently makes international payments through SWIFT already provides this information. However, switching to stablecoin rails does introduce material differences that businesses need to account for:

- **Tax treatment**: The IRS classifies stablecoins as property, not cash. Every stablecoin transaction can trigger a taxable event with capital gains tracking. As of January 2025, brokers must report digital asset transactions on Form 1099-DA. A SWIFT wire has no capital gains dimension.
- **Accounting treatment**: FASB voted in October 2025 to add stablecoin accounting to its technical agenda, but guidance is not expected until mid-2026. Until then, stablecoins may need classification as short-term investments or intangible assets — not simply cash. The GENIUS Act (signed July 2025) makes it illegal to treat non-compliant payment stablecoins as "cash or cash equivalents."
- **No FDIC insurance**: Stablecoin balances are not FDIC-insured, unlike traditional bank deposits.
- **Provider licensing verification**: The business should verify that the payment provider holds appropriate crypto-specific licenses (CASP under MiCA, state MTLs in the US).

The compliance *process* (KYB, invoices, contracts) is the same. The financial reporting, tax, and risk implications are not.

### For us (the treasury application layer)

The initial assumption is that **we operate as an application layer routing through licensed payment providers** — but this position carries real legal risk and must be validated by formal legal opinions.

| What we do | What we delegate to licensed providers |
|-----------|-----------------|
| Collect KYB information from clients | Fiat-to-crypto conversions |
| Gather transaction documentation (invoices, contracts) | SAR/CTR filing |
| Pass this information to the payment provider via API | Travel Rule compliance on the fiat side |
| Run preventive transaction monitoring | Regulated custody of fiat |
| **Maintain our own OFAC sanctions screening** | — |

> **Critical legal warning:** The claim that a software routing layer bears no licensing or compliance liability is **not settled law** and has been contradicted by enforcement actions. FinCEN's 2019 guidance (FIN-2019-G001) states that whether a person is a money transmitter is "a matter of facts and circumstances" — not a matter of self-labeling. If a platform exercises custody, control, or decision-making authority over funds at any point, it may be a money transmitter. In December 2025, OFAC settled with Exodus Movement for **$3.1 million** — and Exodus was a non-custodial software wallet provider. OFAC stated that sanctions obligations apply "even though Exodus operated a non-custodial wallet and relied on third-party exchanges."
>
> **Minimum requirements regardless of licensing status:**
> - Formal legal opinions on MTL obligations per state
> - Independent OFAC sanctions screening program (strict liability — applies to all US persons)
> - Proportionate AML/KYC controls
> - Consider FinCEN MSB registration as a protective measure
> - The "agent of the payee" exemption is recognized in only ~half of US states and is commonly misapplied

The legal structure: in all client-facing agreements, the licensed payment provider is identified as the entity providing the regulated service. But this contractual framing does not by itself eliminate regulatory risk. This model is used by many fintechs — Revolut initially operated on partner bank licenses — but each must independently establish its regulatory posture.

### What we need to build

Regardless of final licensing determination, we need compliance tooling — both for business reasons (maintaining provider relationships) and as a protective measure against regulatory risk:

| Tooling | Why |
|---------|-----|
| **KYB collection** | Gather and store client identity documents, beneficial ownership, business verification — then pass to providers |
| **Transaction documentation collection** | Collect purpose-of-payment, invoices, contracts for each qualifying transaction |
| **Transaction monitoring** | Preventive screening to avoid sending problematic transactions to providers. If we consistently send low-quality traffic, providers will terminate the relationship |
| **Travel Rule data transmission** | Ensure originator/beneficiary information accompanies every qualifying transfer via provider APIs |
| **Audit trail** | Maintain records of all compliance data collected, for our own protection and provider audits |
| **OFAC sanctions screening** | Independent screening of all transactions against OFAC SDN list — strict liability, cannot be delegated to providers alone |

### Why preventive monitoring matters

Beyond OFAC sanctions screening (which is a legal obligation for all US persons), we have a strong business obligation to monitor transaction quality. Payment providers evaluate their distribution partners on traffic quality. If our clients consistently trigger SARs, if transactions fail compliance checks, or if our user base has a high-risk profile, the provider will:

1. Increase scrutiny on all our transactions (slower processing)
2. Raise fees to compensate for compliance overhead
3. Ultimately terminate the partnership

Preventive monitoring — flagging suspicious patterns before they reach the provider — is table stakes for maintaining good provider relationships.

---

## Choosing Payment Providers

### What to evaluate

When selecting off-ramp/on-ramp providers, the compliance dimension matters as much as pricing:

| Criterion | Why it matters |
|-----------|---------------|
| **Licensing coverage** | Which countries and corridors are they licensed in? Gaps mean we can't serve those corridors. |
| **Fee structure and FX rates** | All-in cost including compliance fees, FX markup, and transaction fees — must be transparent and predictable |
| **API quality** | Can we programmatically submit KYB, transaction documentation, and Travel Rule data? Or is it manual? |
| **Compliance friction** | How long do compliance reviews take? What's the rejection rate? A provider with great coverage but 48-hour review times kills the user experience. |
| **Onboarding process** | How do they onboard our clients? Can we white-label it, or do clients interact with the provider directly? |
| **Partner bank relationships** | Do they operate on their own licenses or through partner banks? Partner bank models add another layer of compliance and potential friction. |

### The ideal provider

The ideal payment provider for an application-layer treasury product:

- Has its own licenses (not dependent on partner banks that could change terms)
- Offers a comprehensive API for KYB submission, transaction documentation, and Travel Rule compliance
- Provides **frictionless compliance** — fast review times, clear rejection reasons, predictable processing
- Has transparent, competitive fee and FX rate structures
- Covers the corridors that matter for our target segment (US, EU, UK, LATAM per [Part 6](./payment-corridors.md))

The provider's compliance infrastructure is, in effect, our compliance infrastructure. Their quality directly determines our user experience.

---

## Summary

| Party | Compliance burden | What changes with stablecoin rails? |
|-------|------------------|-------------------------------------|
| **Payment institution** | Heavy — licenses (state MTLs + FinCEN MSB + CASP), AML programs, Travel Rule, regulatory reporting | Adds crypto-specific regulations on top of existing payment regulations |
| **Business (our client)** | Moderate — KYB, transaction documentation, record-keeping | Same compliance process, but adds tax implications (stablecoins = property for IRS), unresolved accounting treatment, no FDIC insurance |
| **Us (application layer)** | Moderate — OFAC sanctions screening (legal obligation), plus tooling for provider relationships | Must build KYB collection, OFAC screening, document management, preventive monitoring, Travel Rule data. Regulatory posture requires formal legal opinions per jurisdiction |

The bottom line: **the compliance process is familiar for the business** — they already provide KYB, invoices, and contracts for SWIFT. But stablecoin rails add tax, accounting, and insurance differences they must account for. For us, the key strategic decisions are: (1) establishing our regulatory posture with formal legal opinions, (2) building OFAC sanctions screening as a minimum legal requirement, (3) choosing payment providers with excellent compliance infrastructure, and (4) building tooling that makes us a high-quality distribution partner.

> **This document is a strategic framework, not legal advice.** Any treasury application should engage qualified legal counsel to establish its specific regulatory obligations per jurisdiction before launch.

---

*This is Part 12 of a 12-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **[MPC 101](./mpc.md)** — Multi-Party Computation, threshold signatures, and custody architecture
10. **[Security Architecture](./cosigner-security-models.md)** — Defense-in-depth security for a blockchain treasury app
11. **[Custody Models](./custody.md)** — Custodial vs. self-custodial, regulatory implications, and the path to licensed custodian
12. **Cross-Border Compliance** — Regulatory requirements, who bears the burden, and what tooling to build *(this document)*
