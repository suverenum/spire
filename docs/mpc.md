# MPC 101: The Fintech Founder's Guide to Crypto Key Management

**Multi-Party Computation · Threshold Signatures · Institutional Custody**
**MPC vs Multisig · Fireblocks Architecture · Provider Landscape**

*Part 9 of a 12-part series. See [Business Banking 101](./business-banking-101.md) for the full lifecycle overview.*

---

## Table of Contents

1. [Introduction: Why MPC Matters](#introduction-why-mpc-matters)
2. [What MPC Actually Does](#what-mpc-actually-does)
3. [How Keys Are Born Distributed](#how-keys-are-born-distributed)
4. [How Fireblocks Implements MPC](#how-fireblocks-implements-mpc)
5. [MPC vs Multisig: Two Philosophies](#mpc-vs-multisig-two-philosophies)
6. [Alternative MPC Providers](#alternative-mpc-providers)
7. [Real Attack Vectors & Security Failures](#real-attack-vectors--security-failures)
8. [Conclusion: Architecture Decision Framework](#conclusion-architecture-decision-framework)

---

## Introduction: Why MPC Matters

Multi-Party Computation (MPC) has become the institutional standard for securing digital assets. Instead of trusting a single private key on a single device, MPC splits signing power across multiple parties so the **full key never exists in any one place**. This eliminates the catastrophic single point of failure that has led to billions in crypto losses.

For a fintech founder evaluating custody infrastructure, understanding MPC isn't optional — it's foundational to making the right build-vs-buy decision, choosing providers, and explaining your security model to investors and regulators.

> **What this guide covers:**
>
> 1. How MPC and threshold signing work from first principles
> 2. Fireblocks' MPC-CMP architecture in detail
> 3. MPC vs multisig — when to choose each
> 4. Alternative provider architectures (DFNS, Utila, Cubist, ZenGo, Lit, Sodot)
> 5. Real-world attack vectors and security failures

---

## What MPC Actually Does

### The Private Key Problem

In crypto, whoever holds the private key controls the assets. Traditionally, that key lives in one place — a hardware wallet, a server, a seed phrase on paper. This creates what cryptographers call a **single point of compromise**: one hack, one rogue employee, one lost device, and everything is gone.

MPC eliminates this by distributing signing authority across multiple independent parties, none of whom ever possesses the complete key.

### The Core Concept

Multi-Party Computation allows multiple parties — each holding their own secret data — to jointly compute a function over their combined inputs **without revealing their individual secrets to each other**. Think of it like three employees wanting to calculate their average salary without anyone revealing what they earn. Through clever math, they each contribute encrypted fragments, and the computation produces the correct average while every individual salary stays private.

### Threshold Signature Schemes (TSS)

Applied to crypto custody, MPC enables what's called a **Threshold Signature Scheme (TSS)**. Instead of one person signing with a full private key, multiple parties each hold a "key share" — a cryptographic fragment — and cooperate to produce a valid signature. The resulting signature is mathematically identical to one produced by a single key. The blockchain can't tell the difference.

> **Key Share vs Private Key**
>
> A **private key** like `8da4ef21b864d2cc...` is a 32-byte value that can unilaterally sign transactions. A **key share** is a fragment that reveals zero information about the actual key. You cannot use it alone to sign anything, derive the full key, or even make progress toward an attack.

### Common Threshold Configurations

| Threshold | Use Case | Tradeoff |
|-----------|----------|----------|
| 2-of-3 | Personal / small team wallets | Low latency, moderate resilience |
| 3-of-5 | Institutional custody | Good balance of security & availability |
| 4-of-7 | Enterprise treasuries | High resilience, slower signing |

---

## How Keys Are Born Distributed

### What Never Happens

The most important thing to understand about MPC is what **never happens**: the full private key is never created, never assembled, never exists — not during key generation, not during signing, not in memory, not on disk, not for a nanosecond.

### MPC-TSS vs Shamir's Secret Sharing

This is what separates MPC-TSS from an older technique called **Shamir's Secret Sharing (SSS)**. In SSS, a "dealer" generates the complete private key first, then splits it into shares. The full key existed briefly in one place — a fatal vulnerability. Worse, SSS requires reassembling the full key on a single machine to sign. **MPC-TSS has no dealer.**

### Distributed Key Generation (DKG)

Key shares are born distributed through a protocol called DKG:

1. **Independent generation:** Each participant independently generates random secret values and creates a mathematical polynomial.
2. **Cross-distribution:** Each party acts as a "mini-dealer," distributing evaluations of their polynomial to every other party using Verifiable Secret Sharing.
3. **Verification:** Cryptographic commitments let parties verify they received correct data without seeing each other's secrets.
4. **Combination:** Each party combines all received shares into their final key share. The overall private key is the sum of all individual secrets, but no party ever computes this sum.

### Signing Without Reconstruction

When a transaction needs signing, cooperating parties run an interactive protocol. Each party uses their key share and cryptographic techniques — including Paillier homomorphic encryption, Multiplicative-to-Additive (MtA) conversions, and zero-knowledge proofs — to produce a **partial signature**. These combine through Lagrange interpolation into a complete, valid signature.

### Key Refresh

Periodically, parties run a protocol that generates **entirely new shares** corresponding to the same underlying private key. Old shares become cryptographically useless. The public key and wallet address stay unchanged. An attacker who steals a share at time T₁ finds it worthless at time T₂. Fireblocks refreshes shares at **minutes-long intervals**, creating an extremely narrow attack window.

---

## How Fireblocks Implements MPC

Fireblocks is the market-leading MPC custody platform, processing transactions for over 1,800 institutional clients. Their architecture exemplifies how MPC theory translates into production infrastructure.

### The MPC-CMP Protocol

Fireblocks' signature innovation, developed by Prof. Ran Canetti, Nikolaos Makriyannis, and Udi Peled. Released in May 2020, it dramatically improved on earlier protocols:

| Metric | GG18 (Previous) | MPC-CMP |
|--------|-----------------|---------|
| Communication rounds | 9 rounds | 1 round (after pre-processing) |
| Cold storage support | Required online connectivity | Native air-gapped support |
| Key refresh | Separate protocol | Built-in automatic |
| Security proof | Standard model | Universal Composability |
| License | Proprietary | Patent-free, open-source (GitHub) |

### Key Share Distribution (Direct Custody)

Fireblocks uses a 3-of-3 scheme with three distinct parties:

- **Co-Signer #1:** Runs on Fireblocks infrastructure in a secure enclave within a tier-1 cloud environment.
- **Co-Signer #2:** Runs on a separate Fireblocks server in a different cloud environment, also enclave-protected.
- **Customer share:** Lives on the customer's side — either as a "hot" share (API co-signer), "warm" share (mobile device), or "cold" share (air-gapped with QR code scanning).

> ⚠️ **Critical distinction:** Neither Fireblocks alone (despite holding two shares) nor the customer alone can sign unilaterally. All three must participate.

### Intel SGX / TEE Enclaves

SGX creates hardware-isolated memory regions (enclaves) that are encrypted and inaccessible even to the host operating system, hypervisor, or system administrators. Fireblocks runs MPC key shares, the signing algorithm, policy engine logic, and API credentials inside SGX enclaves.

Fireblocks supports multiple TEE technologies across cloud providers:

- **Intel SGX** — Azure, IBM Cloud, Alibaba Cloud
- **AWS Nitro Enclaves**
- **Google Cloud Confidential Spaces**

### Transaction Authorization Policy (TAP)

The TAP engine sits on top of MPC signing as a governance layer. When a transaction is initiated, TAP evaluates rules before signing begins:

- Which users or API keys can initiate transactions
- Whitelisted destination addresses
- Per-transaction and time-based spending limits
- X-of-Y approval quorums (e.g., 2-of-5 designated approvers)
- Smart contract function-level access control
- Compliance screening via Chainalysis and Elliptic

### Certifications & Recovery

Fireblocks holds **SOC 2 Type II**, **ISO 27001**, and **CCSS Level 3** certifications. For disaster recovery, they provide an open-source key recovery tool on GitHub enabling customers to reconstruct keys and move assets independently if Fireblocks becomes unavailable.

---

## MPC vs Multisig: Two Philosophies

MPC and multisig solve the same fundamental problem — distributing trust so no single party can steal funds — but through radically different architectures.

### How Multisig Works

A multisig wallet like **Safe (formerly Gnosis Safe)** is a smart contract deployed on the blockchain that holds funds and enforces an M-of-N policy. When someone proposes a transaction, other owners sign it. Once enough signatures are collected, the contract verifies all signatures before executing. Safe reports over **$100 billion** in total value protected.

### Architectural Comparison

| Dimension | MPC-TSS | Multisig |
|-----------|---------|----------|
| Where it runs | Off-chain (before tx hits blockchain) | On-chain (smart contract verifies) |
| Chain support | Protocol-agnostic (ECDSA/EdDSA) | Protocol-dependent (varies per chain) |
| On-chain footprint | Standard single signature | Reveals signers, threshold, approvals |
| Gas cost | Same as normal transaction | Higher (contract verification overhead) |
| Key rotation | Off-chain, invisible, no cost | On-chain tx required (Bitcoin: fund migration) |
| Privacy | Full — governance is invisible | Transparent — all on-chain |
| Auditability | Requires off-chain logging | Fully on-chain, immutable |
| DeFi composability | Limited (EOA behavior) | Native (smart contract interactions) |

### When to Choose Each

**Choose MPC when:**

- Multi-chain institutional custody is required
- High-frequency automated operations
- Privacy requirements (don't want governance visible on-chain)
- Frequent signer changes
- Regulatory compliance workflows

**Choose Multisig when:**

- On-chain DAO governance requiring transparent decision-making
- DeFi composability (spending limits, time-locks, protocol interactions)
- Bitcoin-only cold storage (native multisig battle-tested since 2012)
- Trust in auditable code over vendor infrastructure

### Hybrid Architectures

The most common institutional pattern combines both: **MPC protects the individual signer keys** that serve as owners on a Safe multisig. The Safe enforces on-chain governance while MPC handles secure key management off-chain for each signer.

---

## Alternative MPC Providers

### DFNS — API-First, Network Hosted Keys

DFNS manages **all five key shares** (using a 3-of-5 threshold) across geographically distributed T3+/T4 data centers. Authentication credentials (passkeys, API keys) are completely separated from wallet keys, so compromised auth cannot derive wallet keys. DFNS supports MPC, HSMs, and TEEs through a single orchestration platform.

### Utila — Modular 2-of-2 MPC

Utila implements a **2-of-2 MPC** between themselves and the customer. Each party holds one share uniquely bound to specific users and devices. They process **$15B+ monthly** across 60+ blockchains, targeting fintechs, stablecoin issuers, and banks.

### Cubist (CubeSigner) — The Anti-MPC Position

**Cubist doesn't use MPC at all.** Instead, they store keys inside FIPS 140-certified HSMs and TEEs (AWS TPM 2.0), arguing that MPC introduces unnecessary complexity and that most implementations reintroduce single points of failure because they run identical software on virtually identical machines. Their signing latency is measured in **milliseconds** (versus seconds for MPC). Written entirely in memory-safe Rust.

### ZenGo — Consumer MPC Pioneer

Pioneered consumer MPC wallets in 2018, using 2-of-2 TSS with one share on the user's mobile device and one on ZenGo's servers. Eliminated seed phrases entirely, replacing them with 3-factor recovery. **2M+ customers and zero hacks** since launch. Maintains the world's largest open-source consumer MPC library.

### Lit Protocol — Decentralized MPC

A network of TEE-protected nodes running threshold MPC with no central operator. "Lit Actions" allow embedding arbitrary JavaScript logic into the signing process. Recently expanded into programmable key management for AI agents.

### Sodot — Self-Hosted MPC SDK

A pure self-hosted MPC SDK (not SaaS) that companies like BitGo and eToro use to build their own custody systems. Uses DKLs23 and FROST protocols. Represents the "bring your own infrastructure" approach.

### Provider Comparison

| Provider | Model | Threshold | Deployment | Open Source | Target |
|----------|-------|-----------|------------|-------------|--------|
| Fireblocks | SaaS | 3-of-3 | Cloud + SGX | MPC-CMP lib | Enterprise |
| DFNS | API/SaaS | 3-of-5 | Distributed DC | No | Developers |
| Utila | SaaS | 2-of-2 | Cloud | No | Fintechs |
| Cubist | SaaS | N/A (HSM) | AWS TEE | No | HFT/DeFi |
| ZenGo | Consumer | 2-of-2 | Mobile + Cloud | Yes | Retail |
| Sodot | SDK | Flexible | Self-hosted | No | Builders |

---

## Real Attack Vectors & Security Failures

### Implementation Bugs: The #1 Threat

The MPC algorithms themselves have **never been mathematically broken**. Every actual vulnerability discovered has been an implementation error.

> ⚠️ **BitForge (August 2023)**
>
> Fireblocks' research team found zero-day vulnerabilities in GG18, GG20, and Lindell17 implementations affecting **15+ major wallet providers** including Coinbase WaaS and ZenGo. A missing zero-knowledge proof would have allowed full private key exfiltration. No funds were stolen (responsible disclosure led to patches), but the vulnerabilities could have enabled attackers to drain millions of wallets in seconds.

### Collusion Risk

In a 2-of-3 scheme, if two share holders collude, they can sign any transaction. This is identical to multisig collusion risk, with one critical difference: multisig collusion leaves an on-chain trace, while MPC collusion produces a standard single signature with **no forensic evidence** of who participated.

### SGX/TEE Vulnerabilities

Academic researchers have demonstrated multiple side-channel attacks against Intel SGX: Foreshadow (2018), SGAxe (2020), Plundervolt (2020), and Crosstalk (2020). However, practical exploitation requires local machine access and specific conditions. No crypto custody system has been breached via SGX side-channels in practice.

### Catastrophic Operational Failures

| Incident | Loss | Type | Root Cause |
|----------|------|------|------------|
| Multichain (Jul 2023) | $125M+ | MPC | All MPC nodes controlled from a single person's cloud account. "Multi-party" was illusory. |
| WazirX (Jul 2024) | $235M | Multisig | Signers tricked into approving a malicious smart contract upgrade. UI showed legitimate tx. |
| Bybit (Feb 2025) | $1.34B | Multisig | Compromised signer devices manipulated the multisig approval process. Largest crypto theft in history. |

> ⚠️ **Key takeaway:** All three incidents had the cryptographic tools to prevent the attacks. What failed was the operational security, the independence of signing parties, and the verification of what was actually being signed. No amount of MPC sophistication can substitute for genuine separation of control.

---

## Conclusion: Architecture Decision Framework

The choice between MPC, multisig, hardware wallets, and HSM-based solutions is a spectrum determined by your operational requirements, chain coverage, transaction volume, and regulatory environment. Three insights stand out:

1. **Implementation quality matters more than protocol choice.** Every real-world MPC failure has been an implementation bug or operational security lapse, not a mathematical break. When evaluating providers, ask about audit history, open-source status, and vulnerability disclosure record.

2. **The market is bifurcating** between full-stack SaaS platforms (Fireblocks, Fordefi, Utila) and modular infrastructure layers (Sodot, DFNS, Lit Protocol). The choice between end-to-end platform and assembling your own stack has major implications for vendor lock-in, pricing, and operational independence.

3. **Hybrid is becoming the default for serious institutions.** MPC for operational speed and cross-chain coverage, multisig for on-chain governance and cold reserves, HSMs where regulatory compliance demands FIPS 140 certification, and policy engines layered across everything.

---

> ***The organizations that suffered the largest losses all had the cryptographic tools to prevent the attacks. What failed was the operational security.***

---

*This is Part 9 of a 12-part series:*
1. **[Business Banking 101](./business-banking-101.md)** — Overview of banking services by company stage
2. **[Corporate Banking](./corporate-banking.md)** — How large corporations manage finances at scale
3. **[Treasury Management Systems](./tms.md)** — What TMS platforms do and why they're hard to adopt
4. **[ERP](./erp.md)** — What Enterprise Resource Planning systems are and why they matter
5. **[Crypto-Native Banking](./crypto-native-banking.md)** — How crypto companies organize their financial operations
6. **[Payment Corridors](./payment-corridors.md)** — What multi-entity corporations need and which corridors matter
7. **[Specialist Segments](./specialist-segments.md)** — Why importers/exporters, emerging-market businesses, and crypto companies are weaker targets
8. **[Product Strategy](./product-strategy.md)** — What to build, for whom, and why
9. **MPC 101** — Multi-Party Computation, threshold signatures, and custody architecture *(this document)*
10. **[Security Architecture](./cosigner-security-models.md)** — Defense-in-depth security for a blockchain treasury app
11. **[Custody Models](./custody.md)** — Custodial vs. self-custodial, regulatory implications, and the path to licensed custodian
12. **[Cross-Border Compliance](./compliance.md)** — Regulatory requirements, who bears the burden, and what tooling to build
