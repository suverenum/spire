# Open Source Strategy

Should we open-source the treasury platform? Pros, cons, risks, and timing.

---

## What the product actually consists of

The business has three layers, and they have very different defensibility:

| Layer | Defensibility | Open-sourceable? |
|-------|--------------|-----------------|
| **Software** | Commodity. Any competent team can build the same features. | Yes -- this is the candidate |
| **Operations & compliance** | Hard to copy. Licenses, KYB processes, provider relationships, custodian status. | No -- this is operational, not code |
| **Client base** | Hard to copy. Trust, integrations wired into ERPs, switching costs. | No -- this is the moat |

The software itself is not the moat. The moat is the licensed operations layer and the client base. Fighting to keep commodity software proprietary is the wrong battle.

---

## Arguments for open-sourcing

### 1. Trust and security credibility

Every serious security product is open source: Signal, Safe Wallet, Ledger firmware, Telegram (client), Bitcoin Core. The pattern is: **open source + independent audit = trust**. For a product that holds corporate treasury funds, this is not optional -- it's expected. CFOs and their security teams will ask "can we see the code?" and "has it been audited?". Open source answers both.

### 2. Brand and positioning

Open-sourcing positions us as the reference implementation -- "Open Treasury." Other projects reference us, build on us, cite us. This is how Safe became the standard for on-chain multi-sig: the code is open, everyone can verify it, and that verification IS the brand.

### 3. Competitors can copy anyway

The software is commodity. Competitors are already building similar features. Holding the code closed doesn't prevent competition -- it just means we don't get the trust and brand benefits. Better to lead the race openly than to pretend proprietary code is a moat when it isn't.

### 4. Discipline

Open-sourcing forces engineering discipline: clean code, no secrets in the repo, proper documentation, clear architecture. No "we'll clean it up later." This is a forcing function for quality that pays dividends regardless of the open-source decision.

### 5. Clients can't self-operate anyway

Even with full source code, a client can't run this in isolation without licenses (payment provider agreements, KYB infrastructure, compliance programs, potentially custodial licenses). The open-source code is like a bank's software without the banking license -- theoretically useful, practically impossible to operate independently. So open-sourcing gives security transparency without giving away the business.

---

## Arguments against

### 1. Vulnerability exposure

Attackers can study the code to find vulnerabilities. This is the standard objection, but the counterargument is well-established: open source means MORE eyes finding bugs, not fewer. Signal, Linux, Bitcoin all operate this way. With security audits on top, the net effect is positive.

### 2. IP and employment risk

Current employment contract includes a non-compete clause prohibiting work on similar/competitive products during employment. No explicit IP assignment clause, but given proximity to the domain, the employer could argue the work constitutes a work assignment. **This is the binding constraint on timing -- nothing can be public until after the employment ends.** The approach: stealth mode during employment, open-source after departure (2-3 months). A clean-room rewrite at that point eliminates any IP overlap argument.

### 3. Competitive intelligence

Competitors see exactly how we implement everything. But again -- the software is commodity. The implementation details aren't the moat. And we see what they build too.

**Verdict: no real argument against, except the IP/employment risk which is a legal check, not a strategic objection.**

---

## What about banks and TMS vendors?

No bank open-sources its core software. But banks don't sell security -- they sell trust backed by regulation and insurance. We ARE selling security (on-chain, verifiable, auditable). The analogy is closer to Signal or Safe than to JPMorgan.

TMS vendors (Kyriba, GTreasury) are proprietary. But their moat is 9,000+ bank integrations built over decades, not their dashboard code. Our moat will be operations + clients, not code.

---

## Timing

**Don't open-source now.** The codebase isn't ready, and there's no audience yet.

### The plan

| Phase | Action |
|-------|--------|
| **Now → MVP** | Stealth mode. Private repo. Build fast, prove the concept, get first customers. Nothing public. |
| **Post-employment (2-3 months)** | Clean-room rewrite of core components. Proper architecture, no secrets, documentation. Eliminates any IP overlap argument. |
| **V1 → V2** | Open-source the treasury and smart contract code. Announce as a positioning move. Keep operations/compliance proprietary. |

### What to open-source

- Smart contract wallet code (the part that holds funds -- this MUST be auditable)
- Treasury logic (multi-entity, policies, roles)
- ERP connectors (standard formats, sync logic)
- Client application (dashboard, UI)

### What stays proprietary

- Compliance engine internals (fraud detection rules, risk scoring models)
- Provider integration specifics (API keys, pricing agreements, onboarding flows)
- Internal operations tooling

---

## Risk: stealth during early phase

Open-sourcing before we have traction means competitors see everything while we have nothing to show. Early-stage stealth is valuable -- test with real customers, iterate fast, don't broadcast your approach to every competitor watching GitHub.

**After MVP with paying customers, open-sourcing becomes a strength, not a vulnerability.** At that point, the code is proven, the client base exists, and the open-source announcement is a credibility event, not a giveaway.

---

## Conclusion

**Yes, open-source -- but after employment ends and a clean-room rewrite, not before.**

The software is commodity. The moat is operations, compliance, and clients. Open-sourcing the commodity layer buys trust, brand, and security credibility without giving away the business. No client can self-operate without licenses. No competitor gains meaningful advantage from seeing commodity code.

The binding constraint is the current employment non-compete. The plan: stealth mode now, clean-room rewrite after departure (2-3 months), then open-source as a positioning event.
