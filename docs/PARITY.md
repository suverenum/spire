# Goldhord Treasury Platform

## Product Requirements Document

## 1. Executive Summary

Goldhord Treasury Platform is a corporate treasury operating system built on Tempo L1. It evolves from the current Spire architecture, which is centered around per-agent wallets protected by a Guardian smart contract, into a broader treasury platform designed for organizations.

The product is intended to serve three primary customer segments:

1. Crypto-native companies managing on-chain treasuries, grants, and token operations.
2. Web3 builders managing program budgets, protocol deployment, and governance-linked execution.
3. Traditional enterprises managing multi-currency treasuries with fiat rails, internal controls, and compliance workflows.

The core architectural principle is that a treasury is not just a wallet. A treasury is a container that holds different financial artifacts: token balances, fiat balances, accounts, programs, budgets, and operational policies. Management of all of these artifacts should rely on the same control primitives: multisig, policy rules, approvals, and execution workflows.

Goldhord should provide a single extensible foundation that supports crypto treasury management and enterprise treasury management using the same design patterns.

---

## 2. Product Vision

Goldhord becomes the system of record and system of control for modern treasury operations.

It should allow an organization to:

* Hold and manage digital assets and fiat-linked balances.
* Define multiple account structures under one treasury.
* Enforce policy-based transaction approval.
* Support internal workflows across multiple entities and departments.
* Provide auditability, compliance readiness, and operational security.
* Extend into cards, FX, yield, program management, and API-driven treasury automation.

The long-term vision is to make treasury programmable without sacrificing control.

---

## 3. Problem Statement

The current Spire model is optimized for AI agent wallets. It assumes:

* one Guardian contract per wallet,
* one owner model with a limited approval flow,
* simple transaction caps,
* a narrow token/payment flow.

That model does not scale cleanly to corporate treasury use cases, where organizations require:

* multiple legal entities,
* multiple accounts per treasury,
* layered authorization,
* role-based access,
* fiat integrations,
* card-based spend,
* compliance workflows,
* reporting and accounting support.

The platform must move from wallet management to treasury orchestration.

---

## 4. Target Segments

### 4.1 Crypto-native Companies

These customers need on-chain treasury control, stablecoin operations, token management, grants, governance-linked execution, and high transparency.

### 4.2 Web3 Builders

These customers need program budgets, multi-wallet execution, deployment controls, grants disbursement, and policy-driven approvals for protocol-related activity.

### 4.3 Traditional Enterprises

These customers need a treasury system with stablecoins, fiat rails, virtual IBANs, multi-entity structures, card controls, compliance, audit logs, and department-level budgeting.

---

## 5. Core Product Principles

### Treasury as a Container

A treasury is the top-level financial object. It contains accounts, balances, programs, budgets, permissions, and policies.

### Unified Control Layer

All treasury actions must be governed through the same foundation:

* multisig approval,
* threshold logic,
* conditional policies,
* execution controls,
* recovery and emergency procedures.

### Extensibility

The platform must support future modules without architectural redesign. Examples include:

* token operations,
* cards,
* FX,
* yield,
* governance execution,
* banking integrations.

### Shared Patterns Across Segments

Crypto-native firms and traditional enterprises should use the same conceptual model even if integrations differ.

---

## 6. Goals

The product must:

* support multi-account treasury structures,
* support multi-asset treasury operations,
* provide configurable multisig and policy enforcement,
* support fiat on/off ramps,
* integrate cards with real-time controls,
* support KYC, KYB, and AML workflows,
* provide enterprise-grade RBAC,
* support multiple legal entities,
* provide reporting and accounting exports,
* expose APIs and webhooks for external systems.

---

## 7. Non-Goals for Initial Foundation

The first foundation release will not attempt to solve all financial services problems at once. It will not initially provide:

* proprietary banking infrastructure,
* fully automated derivatives-based FX execution,
* advanced DeFi portfolio optimization,
* jurisdiction-specific accounting automation for every market,
* full governance protocol tooling beyond treasury-linked execution.

These may be introduced in later phases.

---

## 8. Product Scope by Pillar

## Pillar 1: Basic Treasury / Accounts / Swaps

### Requirements

The platform must support:

* multiple account types inside one treasury,
* accounts such as Operating, Payroll, and Program accounts,
* support for USDC and EURC initially,
* an asset model open to any ERC-20,
* internal transfers between accounts,
* gas abstraction for internal treasury movement where possible,
* token swaps through Tempo DEX or approved DEX aggregators.

### Key Outcomes

Users should be able to move capital across treasury accounts, rebalance operational funds, and execute token conversion flows under policy control.

---

## Pillar 2: Multisig & Policies

### Requirements

The platform must support:

* 1-of-1, 2-of-3, 3-of-5, and general n-of-m schemes,
* amount-based policy tiers,
* conditional rules,
* time locks for high-risk transactions,
* emergency pause,
* recovery mechanisms such as social recovery or designated recovery admins.

### Example Policy

* Under $1,000: auto-execute
* $1,000 to $10,000: two approvals
* Above $10,000: three approvals plus delay

### Key Outcomes

The platform moves from static caps to a treasury-grade policy engine.

---

## Pillar 3: Off/On Ramp

### Requirements

The platform must support:

* virtual IBAN generation per account,
* SEPA and SWIFT rails via external providers,
* fiat deposit and withdrawal workflows,
* fiat-to-stablecoin and stablecoin-to-fiat conversion,
* support for multiple providers with fallback routing.

### Key Outcomes

Treasury users should be able to move between bank rails and blockchain assets without leaving the system.

---

## Pillar 4: Cards

### Requirements

The platform must support:

* virtual cards,
* physical corporate cards,
* real-time spend checks,
* merchant controls,
* card-level limits,
* mapping card activity to treasury accounts and policy rules.

### Key Outcomes

Cards become a controlled spending interface on top of treasury policies, not a separate financial silo.

---

## Pillar 5: KYC / KYB / AML

### Requirements

The platform must support:

* personal identity verification,
* business verification,
* UBO workflows,
* ongoing AML screening,
* risk checks for high-value transactions,
* travel rule readiness for large transfers.

### Key Outcomes

Goldhord becomes compliance-ready for fiat-linked treasury operations.

---

## Pillar 6: Account Security

### Requirements

The platform must support:

* passkeys,
* hardware security keys,
* recovery email and controlled recovery flows,
* session management,
* immutable audit trails,
* emergency freeze and unfreeze workflows.

### Key Outcomes

The security model must evolve from user login to treasury-grade operational security.

---

## Pillar 7: Deposits / Yield

### Requirements

The platform must support:

* yield-bearing stablecoin or tokenized treasury products,
* tokenized T-bill integrations,
* optional DeFi lending integrations,
* configurable risk settings,
* idle cash optimization logic.

### Key Outcomes

Treasury balances should be able to generate yield without breaking policy and reporting controls.

---

## Pillar 8: Roles & Permissions

### Requirements

The platform must support:

* predefined roles,
* custom roles,
* granular permission scopes,
* department-based visibility,
* account-level and program-level restrictions.

### Default Roles

* Admin
* Treasury Manager
* Approver
* Viewer
* Accountant
* Agent

### Key Outcomes

The platform must support corporate access patterns, not just wallet ownership.

---

## Pillar 9: FX Risk Management

### Requirements

The platform must support:

* consolidated exposure view by currency,
* analytics for base currency mismatch,
* provider integrations for hedging,
* automated strategy support in future phases.

### Key Outcomes

Treasury leaders should understand and manage currency exposure inside the same platform where they move capital.

---

## Pillar 10: Multi-Entity

### Requirements

The platform must support:

* multiple legal entities inside one organization,
* entity-specific accounts,
* separate policy sets,
* cross-entity transfer workflows,
* inter-company loan style flows.

### Key Outcomes

Goldhord must support treasury groups, not just single companies.

---

## Pillar 11: Reporting & Accounting

### Requirements

The platform must support:

* a treasury ledger,
* transaction history with approver data,
* audit logs,
* CSV and accounting system exports,
* account-level and treasury-level reporting.

### Key Outcomes

Finance and accounting teams must be able to reconcile operations without reconstructing events from chain data manually.

---

## Pillar 12: Extensibility & API

### Requirements

The platform must support:

* public APIs,
* webhooks,
* event-driven integrations,
* SDK support,
* downstream connections into ERP, accounting, analytics, and internal automation.

### Key Outcomes

Goldhord becomes a treasury platform, not just a UI.

---

## 9. System Architecture Principles

## 9.1 On-Chain Responsibilities

The smart contract layer should enforce:

* account ownership and multisig thresholds,
* proposal lifecycle,
* execution authorization,
* policy enforcement that requires trustless guarantees,
* emergency pause,
* immutable execution records.

## 9.2 Off-Chain Responsibilities

The application and backend layer should manage:

* RBAC metadata,
* organization and entity structure,
* compliance workflows,
* fiat provider references,
* KYC and KYB records,
* card metadata,
* reporting,
* notifications,
* integrations and webhook handling.

## 9.3 Boundary Principle

Only logic that must be trust-minimized should live on-chain.
Operational logic that depends on provider integrations, low latency, or mutable workflows should remain off-chain.

---

## 10. Smart Contract Architecture Direction

The current Guardian contract is too narrow for long-term corporate treasury use.

The recommended foundation is:

* TreasuryFactory
* AccountRegistry
* TreasurySmartAccount
* PolicyEngine modules
* SpendingLimit module
* Timelock module
* Execution module
* Recovery / Pause module

### Design Principle

Existing Guardian wallets may remain supported as a legacy compatibility mode, but new treasury functionality should be built on a new account model rather than forcing Guardian into a role it was not designed for.

---

## 11. Data Model Direction

The current database model focused on agents and wallets should expand to include:

* organizations
* entities
* treasuries
* treasury_accounts
* account_memberships
* roles
* permissions
* policies
* proposals
* approvals
* executions
* programs
* budgets
* compliance_profiles
* banking_connections
* bank_accounts
* card_holders
* cards
* provider_events
* audit_log

The data model should remain additive where possible, but treasury-specific domains should become first-class instead of being embedded inside the agent model.

---

## 12. Integration Architecture

### Banking

Providers such as CurrencyCloud or Banking Circle should be abstracted behind a provider service layer.

### KYC / KYB

SumSub or equivalent providers should plug into a compliance orchestration layer with provider-specific adapters.

### Cards

Stripe Issuing should connect through a real-time authorization service that checks treasury policies and account state before approval.

### Payments

MPP and existing payment workflows should be integrated into the treasury execution framework rather than stay as a separate path.

---

## 13. Security Model

The security model must assume that treasury misuse can happen through:

* compromised credentials,
* unauthorized approvals,
* policy misconfiguration,
* unsafe integrations,
* relayer abuse,
* bad contract execution targets.

### Required Protections

* signer threshold enforcement,
* fine-grained roles,
* immutable audit trails,
* secure session management,
* emergency pause,
* real-time anomaly alerts,
* security review for execution allowlists,
* strong secret and environment management.

---

## 14. Non-Functional Requirements

The platform must provide:

* high reliability for treasury-critical flows,
* deterministic policy enforcement,
* low-latency approval UX,
* strong auditability,
* scalability to many accounts per treasury,
* modular integrations,
* maintainable smart contract upgrade path,
* enterprise-grade observability.

---

## 15. MVP Scope

### MVP

The MVP should include:

* treasury foundation,
* multi-account support,
* multisig approvals,
* policy-based execution,
* RBAC,
* audit logs,
* token support beyond one stablecoin,
* basic reporting,
* basic fiat integration path,
* card architecture groundwork.

### Phase 2

* virtual IBANs,
* deeper banking workflows,
* virtual cards,
* program budgets,
* multi-entity controls,
* automated policy escalations.

### Phase 3

* physical cards,
* yield products,
* FX risk controls,
* advanced accounting exports,
* automated treasury strategies.

---

## 16. Success Metrics

Key product and business metrics include:

* number of active treasuries,
* assets under management,
* number of active accounts per treasury,
* number of policy-governed transactions,
* approval turnaround time,
* percentage of spend executed under policy without manual escalation,
* number of fiat-linked accounts,
* card spend processed through policy engine,
* customer retention,
* enterprise expansion across entities and departments.

---

## 17. Key Risks

### Architectural Risk

Over-extending the current Guardian model may slow delivery and create long-term debt.

### Migration Risk

Breaking existing agent-wallet users would create trust and adoption problems.

### Integration Risk

Fiat, cards, and compliance introduce operational dependencies that differ from on-chain flows.

### Security Risk

Arbitrary execution, relayers, and policy engines expand the attack surface.

### Organizational Risk

Trying to ship all pillars at once may dilute execution and delay time-to-market.

---

## 18. Recommended Product Direction

The recommended direction is to build a new treasury foundation while preserving compatibility for existing Guardian wallets.

This means:

* keep current agent-wallet functionality operational,
* introduce a new TreasurySmartAccount architecture for new treasury customers,
* migrate shared infrastructure gradually,
* reuse frontend patterns, auth patterns, and chain client components where possible,
* avoid forcing enterprise workflows into the existing Guardian ABI.

This approach minimizes long-term architectural friction while preserving current users.

---

## 19. Conceptual Domain Model

Organization
→ Entities
→ Treasuries
→ Accounts
→ Assets
→ Policies
→ Members
→ Proposals
→ Approvals
→ Executions
→ Programs
→ Budgets
→ Reports
→ Compliance Artifacts
→ Banking Integrations
→ Card Controls

---

## 20. Conclusion

Goldhord should not be built as a slightly more advanced wallet product. It should be built as a treasury operating system.

The correct foundation is:

* treasury-first,
* multi-account,
* multi-entity,
* multi-asset,
* policy-driven,
* extensible,
* enterprise-grade.

That foundation allows the same platform to serve crypto-native firms, builders, and traditional enterprises without maintaining separate products.
