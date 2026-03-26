# Use Cases: Goldhord Year 1

All requirements through Year 1 (months 1-12), organized by building block.

---

## 1. Treasury on Crypto Wallets

### User Stories

1. As a **CFO**, I want to create a treasury so that I have a top-level container for all my entity wallets.
2. As a **CFO**, I want to add multiple wallets to my treasury (one per legal entity) so that each subsidiary has its own account.
3. As a **CFO**, I want to name and label wallets (e.g., "US HQ", "Germany GmbH") so that I can identify them easily.
4. As a **CFO**, I want to hold multiple stablecoins per wallet (USDC, USDT, USDG, EURC) so that I can manage different currencies.
5. As a **CFO**, I want to move tokens between wallets within my treasury so that I can fund subsidiaries instantly.
6. As a **CFO**, I want to swap tokens within a wallet (e.g., USDT → USDC, USDC → EURC) so that I can convert between stablecoins.
7. As a **CFO**, I want to send tokens to external Tempo wallet addresses so that I can pay counterparties on-chain.
8. As a **CFO**, I want to receive tokens from external Tempo wallet addresses so that counterparties can pay me on-chain.
9. As a **CFO**, I want to send and receive tokens from other chains (bridging) so that I can move value across networks.
10. As a **CFO**, I want to maintain a contact book of recipient addresses (chain, address, label) so that I can send to known counterparties quickly.
11. As a **CFO**, I want to view a consolidated dashboard showing all entity wallet balances so that I have a real-time treasury overview.
12. As a **CFO**, I want to view transaction history per wallet (incoming, outgoing, swaps) so that I can track all movements.

### User Flow

```
CFO signs up → creates treasury → adds entity wallets
    → funds wallets (on-ramp or receive tokens)
    → moves tokens between wallets / sends to external addresses
    → views balances and history on dashboard
```

### Definition of Done

1. Given a new user, When they sign up, Then they can create a treasury and add named wallets.
2. Given a treasury with 2+ wallets, When the CFO moves USDC from Wallet A to Wallet B, Then the transfer settles in seconds and both balances update.
3. Given a wallet holding USDT, When the CFO swaps to USDC, Then the swap executes at market rate and the balance updates.
4. Given a wallet, When the CFO sends tokens to an external Tempo address from the contact book, Then the recipient receives the tokens.
5. Given a wallet on Tempo, When the CFO initiates a cross-chain transfer, Then the tokens arrive on the destination chain.
6. Given a treasury, When the CFO opens the dashboard, Then all wallets are listed with real-time balances and token breakdown.
7. Given a wallet, When the CFO opens transaction history, Then all transactions are listed with date, amount, counterparty, and status.

---

## 2. Multisig with Policies and Roles

*Milestone: V1 (months 2-3)*

### User Stories

13. As a **CFO**, I want to configure a signing policy per wallet (required signers, approval thresholds, amount limits) so that corporate governance is enforced on-chain.
14. As a **CFO**, I want to set tiered approval rules (e.g., <$10K auto-approve, $10K-$100K requires controller, >$100K requires CFO + CEO) so that small transfers move fast and large ones have oversight.
15. As a **CFO**, I want to define roles (admin, controller, viewer) with different permissions per wallet so that my team has appropriate access.
16. As a **CFO**, I want to whitelist allowed destination addresses per wallet so that funds can only go to approved recipients.
17. As a **CFO**, I want to restrict transfers to only between own accounts, or only to allowed networks so that I have guardrails against errors and fraud.
18. As an **admin**, I want to add and remove signers from a wallet policy so that I can manage team changes.
19. As a **viewer**, I want to see balances and transaction history but not initiate transfers so that I have read-only access.

### User Flow

```
CFO navigates to wallet settings → configures signing policy:
    - threshold tiers (amount → required signers)
    - whitelists (allowed addresses, allowed networks)
    - roles (admin, controller, viewer)
    → policy deployed on-chain via smart contract
    → all future transactions from this wallet enforce the policy
```

### Definition of Done

8. Given a wallet with a 2-of-3 policy for amounts >$100K, When a $150K transfer is initiated, Then it requires 2 of 3 designated signers before executing.
9. Given a wallet with a whitelist, When someone attempts a transfer to a non-whitelisted address, Then the smart contract rejects the transaction.
10. Given a user with the "viewer" role, When they attempt to initiate a transfer, Then the action is blocked.
11. Given a wallet with tiered policies, When a $5K transfer is initiated (below threshold), Then it executes with a single signer.
12. Given an admin, When they add a new signer to a wallet policy, Then the on-chain policy updates and the new signer can participate in approvals.

---

## 3. On/Off-Ramp

*Milestone: MVP (month 1) + V2 (months 4-6)*

### User Stories

20. As a **CFO**, I want to on-ramp fiat (USD, EUR, GBP, BRL, MXN, INR, etc.) into USDC via bank transfer so that I can fund my treasury from traditional banking.
21. As a **CFO**, I want to off-ramp USDC to a physical bank account in local currency so that my subsidiaries can pay local expenses.
22. As a **CFO**, I want on/off-ramp coverage across US, EU, UK, LATAM, India, Africa, and SEA so that all my entities can participate.
23. As a **CFO**, I want to associate wallets with my legal entities and their bank accounts so that off-ramps go to the correct destination. *(V2)*
24. As a **CFO**, I want an extended contact book with fiat accounts, address validation, and payment details validation so that off-ramp errors are prevented. *(V2)*
25. As a **CFO**, I want to upload documents and data required for payment screening so that my off-ramp transactions pass compliance. *(V2)*
26. As a **CFO**, I want a second off-ramp provider (Bridge) for redundancy so that no single provider failure blocks my corridors. *(V2)*

### User Flow

```
On-ramp:
    CFO selects entity wallet → initiates on-ramp
    → receives virtual account details (ACH/SEPA/local)
    → sends fiat from entity's bank account
    → Due Network converts to USDC → USDC arrives in wallet

Off-ramp:
    CFO selects entity wallet → initiates off-ramp
    → selects destination bank account (from contact book or manual entry)
    → sees FX rate with transparent markup → confirms
    → USDC sent to Due Network → local currency arrives in bank account
```

### Definition of Done

13. Given a verified entity, When they initiate a fiat on-ramp via SEPA, Then USDC arrives in their entity wallet.
14. Given a wallet with USDC, When the CFO initiates an off-ramp to a linked BRL bank account, Then BRL arrives in the bank account.
15. Given an off-ramp to an emerging-market corridor, When Due Network processes it, Then the local currency is delivered via local rails (PIX, SPEI, UPI, etc.).
16. Given a V2 entity-wallet association, When the CFO selects an entity for off-ramp, Then only that entity's linked bank accounts are shown.
17. Given a V2 contact book entry with invalid bank details, When the CFO attempts to off-ramp, Then validation catches the error before submission.

---

## 4. KYB

*Milestone: MVP (month 1)*

### User Stories

27. As a **CFO**, I want to complete KYB onboarding once so that I don't repeat verification for each payment provider.
28. As a **CFO**, I want KYB to cover all my legal entities (each entity verified separately) so that all entities can on/off-ramp.
29. As a **CFO**, I want a clear onboarding flow that tells me what documents are needed so that I can prepare everything upfront.

### User Flow

```
CFO initiates KYB → Sumsub collects documents per entity
    → beneficial ownership, business verification, entity structure
    → Sumsub verifies → data passed to Due Network (and Bridge in V2)
    → entity status: pending → verified → can on/off-ramp
```

### Definition of Done

18. Given a new customer with 3 entities, When they complete KYB via Sumsub, Then all 3 entities are verified and can on/off-ramp.
19. Given a verified entity, When the CFO attempts to on-ramp, Then the operation is allowed without re-verification.
20. Given an entity with incomplete KYB, When they attempt to off-ramp, Then the action is blocked with a clear message about what's missing.

---

## 5. Fee Management

*Milestone: MVP (month 1)*

### User Stories

30. As a **CFO**, I want free transfers between my own entity wallets so that intercompany settlement has no cost.
31. As a **CFO**, I want to see transparent FX rates with our markup clearly separated so that I know exactly what I'm paying on off-ramp.
32. As a **CFO**, I want no fees on on-ramp so that funding my treasury is free.
33. As a **CFO**, I want to understand any limits on free transfers and how to qualify for unlimited transfers so that I can plan accordingly.

### Definition of Done

21. Given two wallets in the same treasury, When USDC moves between them, Then no fee is charged.
22. Given an off-ramp transaction, When the FX conversion happens, Then the CFO sees: mid-market rate, our markup, and total cost before confirming.
23. Given an on-ramp transaction, When fiat arrives, Then no fee is deducted from the converted USDC amount.

---

## 6. Compliance Checks

*Milestone: V2 (months 4-6)*

### User Stories

34. As a **compliance officer**, I want all destination addresses screened against sanctions lists before transactions execute so that we don't send funds to sanctioned entities.
35. As a **compliance officer**, I want automatic counterparty/supplier checks on first-time recipients so that we flag high-risk counterparties.
36. As a **compliance officer**, I want transaction monitoring for velocity, patterns, and anomalies so that suspicious activity is flagged before it reaches our off-ramp providers.
37. As a **CFO**, I want compliance checks to run silently without slowing down normal operations so that my team isn't burdened by compliance friction.

### Definition of Done

24. Given a transfer to a new address, When the compliance engine screens it, Then sanctioned addresses are blocked and the CFO is notified.
25. Given a counterparty's first transaction, When the auto-check runs, Then a risk score is assigned and high-risk counterparties are flagged for review.
26. Given unusual transaction patterns (e.g., 10x normal daily volume), When the monitoring system detects it, Then an alert is generated and the transaction is held for review.

---

## 7. Yield Products

*Milestone: Year 1 (months 7-12)*

### User Stories

38. As a **CFO**, I want to earn yield on idle USDC balances in my treasury wallets so that money waiting between payment cycles generates returns.
39. As a **CFO**, I want to see projected yield and current earnings in my dashboard so that I can track returns.
40. As a **CFO**, I want to opt in/out of yield per wallet so that I can choose which entity balances earn yield.

### Definition of Done

27. Given a wallet with idle USDC, When the CFO opts into yield, Then the balance earns yield via BlackRock tokenized deposits (or equivalent RWA product).
28. Given a wallet earning yield, When the CFO views the dashboard, Then current earnings and projected APY are displayed.
29. Given a wallet earning yield, When the CFO opts out, Then funds return to liquid USDC without penalty or delay.

---

## 8. ERP Integration

*Milestone: V1 (months 2-3) for NetSuite, Year 1 for expansion*

### User Stories

41. As a **CFO**, I want to export transactions as CSV/Excel so that I can manually import into any accounting system. *(Prototype)*
42. As a **CFO**, I want my on-chain treasury to appear as a bank account in NetSuite so that my finance team doesn't need a separate portal. *(V1)*
43. As a **CFO**, I want transactions to sync to my ERP general ledger in real-time as standard accounting entries so that reconciliation is automatic. *(V1)*
44. As a **CFO**, I want to export in standard formats (MT940, BAI2, CAMT.053) so that I can import into any ERP or TMS. *(V1)*
45. As a **CFO**, I want connectors for Oracle Fusion Cloud, Dynamics 365, and Sage Intacct so that my ERP is supported regardless of vendor. *(Year 1)*

### User Flow

```
V1 (NetSuite):
    CFO connects NetSuite via OAuth → maps entity wallets to GL accounts
    → every transaction auto-syncs as journal entry
    → CFO sees stablecoin balances in NetSuite alongside traditional bank accounts

Any ERP (export):
    CFO selects date range → exports MT940/BAI2/CAMT.053/CSV
    → imports into ERP manually
```

### Definition of Done

30. Given a treasury with transactions, When the CFO exports CSV, Then all transactions download with date, amount, counterparty, wallet, and status.
31. Given a NetSuite-connected treasury, When a transaction occurs, Then it appears in NetSuite as a standard accounting entry in real-time.
32. Given a treasury, When the CFO requests an MT940 export, Then a valid MT940 file is generated that imports into any ERP.
33. Given a Year 1 Oracle Fusion Cloud connector, When transactions occur, Then they sync to Oracle the same way they sync to NetSuite.

---

## 9. Programmable Payments

*Milestone: Year 1 (months 7-12)*

### User Stories

46. As a **CFO**, I want to schedule recurring transfers between entity wallets so that regular intercompany funding happens automatically.
47. As a **CFO**, I want to set up auto-sweep rules (e.g., if Wallet A balance > $500K, sweep excess to Wallet B) so that cash is optimally distributed.
48. As a **CFO**, I want recurring off-ramp payments (e.g., monthly $50K off-ramp from Brazil wallet to local bank account) so that predictable local expenses are automated.

### User Flow

```
CFO navigates to automation settings → creates rule:
    - Trigger: schedule (weekly) or condition (balance > threshold)
    - Action: transfer USDC between wallets, or initiate off-ramp
    → rule passes through approval policy like any manual transfer
    → executes automatically when triggered
```

### Definition of Done

34. Given a weekly scheduled transfer of $100K from Wallet A to Wallet B, When the schedule triggers, Then the transfer executes (subject to approval policy) and is logged.
35. Given an auto-sweep rule (balance > $500K), When Wallet A receives funds pushing it above threshold, Then the excess automatically transfers to Wallet B.
36. Given a recurring off-ramp, When the schedule triggers, Then the off-ramp initiates with the configured amount, destination, and currency.

---

## 10. Account Security

*Milestone: Prototype + MVP*

### User Stories

49. As a **CFO**, I want to authenticate with passkeys (biometric) so that login is fast and passwordless.
50. As a **CFO**, I want to connect a hardware Ledger for elevated operations (large transfers, policy changes) so that critical actions require physical confirmation.
51. As a **CFO**, I want OTP as an optional second factor so that I have a fallback authentication method.
52. As a **CFO**, I want account recovery (social recovery, guardian-based key rotation) so that I can regain access if I lose a device.
53. As a **CFO**, I want to see active sessions and revoke them so that I can maintain security if a device is compromised.

### Definition of Done

37. Given a new user, When they register with passkey (biometric), Then they can access their treasury without a password.
38. Given a user with a hardware Ledger, When they initiate a transfer above the elevated threshold, Then the transaction requires physical confirmation on the Ledger.
39. Given a user who lost their passkey device, When they initiate recovery via guardian approval, Then they can set up a new passkey and regain access after the timelock period.
40. Given a user with active sessions, When they view sessions and revoke one, Then that session is immediately terminated.

---

## 11. Custodian Capabilities

*Milestone: Year 1 preparation, full deployment Year 2-3*

### User Stories

54. As a **compliance officer**, I want the ability to block a specific transaction before it executes so that suspicious activity can be stopped in real-time.
55. As a **compliance officer**, I want to freeze an entity wallet entirely so that no funds can move in or out during an investigation.
56. As a **compliance officer**, I want to unfreeze a wallet after review so that normal operations resume without re-onboarding.
57. As a **CFO**, I want the co-signer to become mandatory (no admin override) so that my company meets custodial license requirements.
58. As a **CFO**, I want insurance coverage on assets held in the treasury so that we are protected against loss.
59. As an **auditor**, I want to verify that compliance checks are enforced on-chain (not bypassable) so that I can certify the custody arrangement.
60. As a **CFO**, I want the upgrade from optional co-signer to mandatory co-signer to be a contract upgrade, not a migration so that my treasury address and history are preserved.

### User Flow

```
Year 1 (preparation):
    Architecture supports optional co-signer → mandatory co-signer upgrade path
    → tx blocking and wallet freezing APIs built
    → SOC 2 Type II certification obtained

Year 2-3 (deployment):
    Custodial license obtained (MiCA in EU, state trust charter in US)
    → co-signer becomes mandatory for opted-in clients
    → compliance checks enforced on-chain, no admin override
    → insurance attached to custody relationship
    → clients upgrade smart contract module
```

### Definition of Done

41. Given a flagged transaction, When a compliance officer triggers a block, Then the transaction is prevented from executing.
42. Given a wallet under investigation, When a compliance officer freezes it, Then all outbound transactions are rejected until unfrozen.
43. Given a frozen wallet, When the compliance officer unfreezes it, Then the wallet resumes normal operation with full transaction history preserved.
44. Given a client on the optional co-signer, When they upgrade to mandatory co-signer, Then the same wallet address continues to work with enforced compliance and no admin override.

---

## Summary: Use Cases by Milestone

| Milestone | Building Blocks | Use Cases |
|-----------|----------------|-----------|
| **Prototype** (weeks 1-2) | #1 Treasury, #10 Security (passkey), #8 ERP (CSV export) | 1-12, 41, 49 |
| **MVP** (month 1) | #3 On/off-ramp, #4 KYB, #5 Fees, #10 Security (Ledger, recovery) | 20-22, 27-33, 50-53 |
| **V1** (months 2-3) | #2 Multisig/policies, #8 ERP (NetSuite) | 13-19, 42-44 |
| **V2** (months 4-6) | #6 Compliance, #3 On/off-ramp (entity association, Bridge) | 23-26, 34-37 |
| **Year 1** (months 7-12) | #7 Yield, #8 ERP (expansion), #9 Programmable payments, #11 Custodian (prep) | 38-40, 45-48, 54-60 |

**Total: 60 use cases across 11 building blocks.**
