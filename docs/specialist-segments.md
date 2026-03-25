# Specialist Segments

Why importers/exporters, emerging-market businesses, and crypto companies are weaker segments for on-chain treasury — and what that means for product strategy.

*Part 7 of a 7-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

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
- **Costs are high** — Not just the wire fee itself, but the FX markup. Total cost through SWIFT to emerging markets can reach up to 50% when markups are included (stablecoins: 1–3%), though this needs verification per corridor
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

**First-world side (senders/importers):** This would be a **secondary bank** for them. They already have Revolut Business, Mercury, traditional banks. They don't have a burning problem — their banks work, just not optimally for certain corridors. Low urgency.

**Third-world side (receivers/exporters):** Higher urgency because they often lack dollar access entirely. But serving them means:
- Building in local languages
- Understanding local regulations
- Competing with 5–10 existing players who have a 2–3 year head start
- Building a full banking suite (not just payments)

### Why this segment is weak

**From the European/US side:** Not a burning problem. Competitors like Revolut Business can add stablecoin payment support relatively easily. Once EU banks support stablecoin transfers (which is technically trivial for them), this advantage evaporates. **Not defensible.**

**From the emerging-market side:** The need is real, but the market is already crowded with stablecoin banking solutions. You'd be runner #11 entering a race that's been going for 2–3 years. Each country is a small market requiring localization. **Painful to enter, hard to scale.**

---

## Segment 2: Emerging-Market Businesses

### The problem they have

In countries with weak, volatile local currencies, businesses want:

1. **Access to USD** — Hold value in a stable currency
2. **Dollar-denominated banking** — Not just payments, but accounts, cards, the full stack
3. **On-ramp / off-ramp** — Convert between local currency and stablecoins

### Why it looks like an opportunity

There's genuine demand. In countries like Argentina, Nigeria, Turkey, and others, holding stablecoins is sometimes the only practical way to preserve purchasing power. Local businesses would pay for reliable dollar access.

### Why it's a trap

This segment requires building a **full-stack bank**, not a treasury product:

| What they need | Why it's painful to build |
|---------------|--------------------------|
| Dollar accounts | Regulatory complexity per country |
| Cards | Partnership, licensing, compliance |
| Full banking suite | Invoicing, payroll, expense management |
| Local language support | Per-country localization |
| Local payment methods | PIX, SPEI, M-Pesa — different per market |
| Local compliance | Banking licenses or partnerships per jurisdiction |

### Competitive landscape

The market is already saturated:

- **Local crypto banks** have sprouted "like mushrooms" across LATAM and Africa
- **Global players** (Revolut, etc.) are aggressively expanding into these markets
- **Crypto exchanges** (Binance, etc.) already serve as de facto dollar accounts
- Each country is a separate, relatively small market

### The squeeze

Emerging-market banking is a **two-front war**:

```
Local players                    Global players
(2-3 year head start,            (Revolut, Mercury, etc.
local knowledge,                  entering with brand,
local languages)                  capital, existing infra)
        ↘                      ↙
         Crowded, low-margin
         market per country
```

You'd be entering late, competing against both entrenched local players and well-funded global ones expanding downmarket.

---

## Segment 3: Crypto-Native Companies (Revisited)

[Part 5](./crypto-native-banking.md) covered how crypto companies organize their finances. Here's the strategic assessment of why they're a weak primary segment.

### The core proposition

Crypto companies can't get bank accounts → you onboard them when others won't → you charge a premium for compliance risk.

### Why it's fragile

| Risk | Impact |
|------|--------|
| **Small market** | Despite attractive transaction volumes, the actual number of companies is limited |
| **Hard to acquire** | Crypto companies are skeptical, well-networked, and shop aggressively |
| **Compliance dependency** | Your entire moat is willingness to take compliance risk |
| **Competitor policy change** | If Mercury loosens KYB rules tomorrow, your customers leave |
| **Full suite demanded** | Because they've been rejected everywhere, they want everything — invoicing, cards, the works |
| **Multi-sig already solved** | Safe, Squads, Fireblocks already exist; on-chain custody is not a differentiator |

### The business model problem

This becomes a **compliance arbitrage business**, not a product business:

1. You take on higher KYB/KYC risk than competitors
2. You charge more because of that risk
3. Your "moat" is willingness to accept risk others won't
4. If risk appetite shifts across the industry, your moat disappears

That's an inherently unstable position. One regulatory change or one competitor policy update can collapse the entire value proposition.

---

## Ranking the Segments

Comparing all three specialist segments against the core target (multi-entity corporations):

| Criteria | Multi-entity corps | Importers/Exporters | Emerging-market biz | Crypto companies |
|----------|-------------------|--------------------|--------------------|-----------------|
| **Problem severity** | High | Medium | High | High |
| **Willingness to pay** | High | Medium | Medium | High |
| **Defensibility** | Strong (complex product) | Weak (commodity) | Weak (local competition) | Weak (compliance play) |
| **Competition** | Low (enterprise is hard) | High | Very high | High |
| **Product complexity** | Manageable (treasury) | Low (payments) | Very high (full bank) | High (full suite) |
| **Scalability** | Good (English, global) | Limited (per-corridor) | Limited (per-country) | Limited (small market) |
| **Time to revenue** | Longer | Shorter | Longer | Medium |

### Verdict

**None of these three segments should be the primary target.** Each has fundamental problems:

1. **Importers/exporters** — Not defensible. Traditional banks and fintechs will add stablecoin payments. You're building a commodity.

2. **Emerging-market businesses** — Requires building a full bank per country. Local competition, language barriers, small individual markets. You're entering a crowded race late.

3. **Crypto companies** — Compliance arbitrage isn't a moat. Small addressable market. One competitor policy change kills the business.

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

### The pattern across all specialist segments

Every specialist segment, when examined closely, reveals the same dynamic:

> The businesses that most need stablecoin access are the ones that require the **most** surrounding infrastructure (full bank, cards, invoicing, local compliance). And that infrastructure is exactly where incumbents have the strongest advantage.

The right strategy is to serve businesses where the **treasury product itself** is the value — not the banking suite around it. That points back to multi-entity corporations, where the complexity of managing money across entities and jurisdictions is the actual problem, and where a focused treasury product (not a full bank) is what's needed.

---

*This is Part 7 of a 7-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **Specialist Segments** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets *(this document)*
