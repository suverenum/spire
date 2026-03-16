# Authentication Architecture

> Tiered, phishing-resistant authentication for a banking app on Tempo blockchain.

## Overview

The app uses a **3-tier authentication model** that leverages Tempo's protocol-level Account Keychain Precompile to attach multiple keys of different types to a single account. Each tier maps to a risk level, with stronger factors required for higher-value operations.

No passwords. No SMS OTP. Every factor is phishing-resistant.

```
┌─────────────────────────────────────────────────────────┐
│                    Tempo Account                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Passkey      │  │  Ledger      │  │  Recovery     │ │
│  │  (WebAuthn)   │  │  (Secp256k1) │  │  (Secp256k1)  │ │
│  │              │  │              │  │               │ │
│  │  Key type: 2  │  │  Key type: 0  │  │  Key type: 0  │ │
│  │  Root key     │  │  Access key   │  │  Access key   │ │
│  │  Spending     │  │  No spending  │  │  Recovery     │ │
│  │  limit: $500  │  │  limit        │  │  only         │ │
│  │  /day         │  │              │  │               │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
│                                                          │
│            Account Keychain Precompile                   │
│         0xAAAAAAAA00000000000000000000000000000000        │
└─────────────────────────────────────────────────────────┘
```

## Tempo Account Keychain Precompile

The [Account Keychain Precompile](https://docs.tempo.xyz/protocol/transactions/spec-tempo-transaction) is deployed at `0xAAAAAAAA00000000000000000000000000000000` on Tempo. It manages authorized access keys for accounts with the following capabilities:

- **Multiple keys per account** — a single account can have passkey, Ledger, and MetaMask keys simultaneously
- **Three key types:** Secp256k1 (`0`), P256 (`1`), WebAuthn (`2`)
- **Per-key spending limits** — scoped per TIP-20 token (e.g., "this key can spend max 500 AlphaUSD/day")
- **Key expiry** — auto-revoke access keys after a timestamp
- **Queryable on-chain** — `getKey()`, `getRemainingLimit()`, `getTransactionKey()`

When a Tempo Transaction is submitted, the protocol identifies the signing key from the transaction signature and validates its authorization via the keychain. This is enforced at the protocol level — not in application code.

## Tier 1: Daily Use (Passkey Only)

**When:** Login, viewing data, sending payments within the daily spending limit.

**Auth factor:** Passkey — fingerprint, Face ID, or Touch ID via WebAuthn.

**How it works:**
1. User creates a passkey during sign-up → registered as root key (type `2`) on the Tempo Account Keychain
2. Passkey is stored in the device's secure enclave, syncs via iCloud Keychain / Google Password Manager
3. The keychain enforces a per-token daily spending limit (e.g., $500/day)
4. Transactions within the limit require only the passkey signature
5. If the daily limit is reached, the keychain rejects the passkey-signed transaction and the app prompts for Tier 2

**Tempo keychain configuration:**
```
Key type:       WebAuthn (2)
Role:           Root key
Spending limit: 500 AlphaUSD / day (configurable per user)
Expiry:         None (permanent until rotated)
```

**Why passkey as primary:**
- Phishing-resistant (domain-bound, no shareable secret)
- Fastest auth method (biometric, <1 second)
- Syncs across devices (no single point of failure for daily use)
- 2026 banking industry standard — Chase, Finom, Chinabank all passkey-first

## Tier 2: Elevated Operations (Passkey + Ledger)

**When:** Payments exceeding the daily spending limit, batch payments, compliance policy changes, key management.

**Auth factors:** Passkey (biometric) + Ledger hardware wallet (physical button press).

**How it works:**
1. User links a Ledger hardware wallet during onboarding or later via Security settings
2. Ledger's public key is registered as an access key (type `0`) on the Tempo Account Keychain with no spending limit
3. For elevated operations, the app requires both signatures:
   - Passkey signs the transaction (proves identity via biometric)
   - Ledger signs the transaction (proves physical possession of hardware device)
4. Both signatures are submitted to Tempo as part of the Tempo Transaction
5. The keychain validates both keys are authorized for this account

**Tempo keychain configuration:**
```
Key type:       Secp256k1 (0)
Role:           Access key (elevated operations)
Spending limit: None (unlimited when combined with passkey)
Expiry:         None (permanent until removed)
```

**What triggers Tier 2:**
- Payment amount exceeds passkey daily spending limit
- Batch payments (always elevated, regardless of amount)
- Compliance policy changes (whitelist/blacklist)
- Key management (adding/removing keys, changing spending limits)

**Ledger connection options:**
- USB via `@ledgerhq/ledger-wagmi-connector`
- Bluetooth (Ledger Nano X)
- Via MetaMask bridge (Ledger connected to MetaMask, MetaMask connected to app via Wagmi)

**Why Ledger for elevated, not a second passkey:**
- Different security domain — passkey is software (secure enclave), Ledger is hardware (separate device)
- Physical confirmation — user must press a button on the Ledger, can't be triggered by malware
- Air-gapped signing — private key never leaves the Ledger device
- Industry standard — hardware wallets are the gold standard for high-value crypto operations

## Tier 3: Account Recovery (External Wallet + Email) — POST-MVP

> **Note:** This tier is deferred to post-MVP. The architecture is documented here for future implementation. For MVP, users who lose all passkey devices must contact support.

**When:** User has lost all passkey devices (all synced devices lost or iCloud/Google account compromised).

**Auth factors:** Pre-registered external EVM wallet (MetaMask) + email verification (app layer).

**How it works:**
1. During onboarding (or later), user registers an external EVM wallet as a recovery key
2. The wallet's public key is registered on the Tempo Account Keychain as a recovery-only access key
3. When recovery is needed:
   - User connects MetaMask on the recovery page
   - App verifies the wallet address matches the registered recovery key on-chain
   - App sends an email verification to the user's registered email address
   - User confirms email
   - App provisions a new passkey on the user's current device
   - New passkey is registered on the Tempo Account Keychain (root key rotation)
   - Old passkey is revoked
4. User regains full access with the new passkey

**Tempo keychain configuration:**
```
Key type:       Secp256k1 (0)
Role:           Access key (recovery only)
Spending limit: 0 (cannot send payments — recovery operations only)
Expiry:         None
```

**Why MetaMask + email (not just MetaMask):**
- MetaMask alone proves possession of the wallet — but the wallet could be stolen
- Email verification adds a second factor at the app layer
- Together they provide reasonable assurance of identity without being overly burdensome during an already stressful situation (lost device)

**Why not a second passkey for recovery:**
- If a user loses all synced devices, all passkeys are lost (same failure domain)
- MetaMask is a different failure domain — browser extension, separate seed phrase, can be on a different device
- Hardware wallet (Ledger) could also serve as recovery, but it's already used for Tier 2 — keeping recovery on a third key type maximizes resilience

## User Onboarding Flow

```
Step 1: Create Account (required)
  → Passkey creation via WebAuthn
  → Tempo account created on-chain
  → Passkey registered as root key on keychain

Step 2: Link Ledger (recommended, skippable)
  → Connect Ledger via USB/Bluetooth
  → Ledger public key registered on keychain
  → Without Ledger: elevated operations are unavailable
    (payments capped at daily spending limit)

Step 3 (POST-MVP): Register Recovery Wallet
  → Connect MetaMask
  → MetaMask address registered on keychain as recovery key
  → Without recovery wallet: lost passkey = contact support
```

Users can skip Step 2 during onboarding and complete it later via Security settings. The app shows a persistent nudge until Ledger is configured.

## Security Properties

| Property | How It's Achieved |
|---|---|
| Phishing-resistant (daily) | Passkey — domain-bound, no shareable secret |
| Phishing-resistant (elevated) | Ledger — hardware device, physical confirmation |
| No single point of failure | 3 independent keys across 3 failure domains |
| No seed phrase exposure | Passkey in secure enclave, Ledger air-gapped, MetaMask is user's own |
| Protocol-level enforcement | Spending limits and key auth enforced by Tempo keychain, not app code |
| Offline signing | Ledger signs offline — private key never touches the network |
| Automatic limit enforcement | Keychain rejects over-limit transactions — app doesn't need to trust itself |

## What's NOT in This Model

| Omitted | Why |
|---|---|
| **Passwords** | Phishable, poor UX, adds nothing when passkey is the primary |
| **SMS OTP** | Phishable (SIM swap), deprecated by banking industry in 2026 |
| **TOTP (authenticator app)** | Adds UX friction without meaningful security gain over passkey + Ledger |
| **Email-only auth** | Too weak for a banking app — email is used only as second factor in recovery |
| **Social login (Google/Apple)** | Introduces OAuth dependency, doesn't map to on-chain key model |

## Key Management on the Keychain

### Adding a Key

```typescript
// Register Ledger key on the account keychain
const tx = await tempoClient.writeContract({
  address: KEYCHAIN_PRECOMPILE,
  abi: keychainAbi,
  functionName: 'addKey',
  args: [
    0,                    // keyType: Secp256k1
    ledgerPublicKey,      // the Ledger's public key
    0,                    // expiry: 0 = no expiry
    [],                   // spendingLimits: none (elevated key)
  ],
});
```

### Querying Key Status

```typescript
// Check if a key is authorized
const isAuthorized = await tempoClient.readContract({
  address: KEYCHAIN_PRECOMPILE,
  abi: keychainAbi,
  functionName: 'getKey',
  args: [keyId],
});

// Check remaining daily spending limit for a passkey
const remaining = await tempoClient.readContract({
  address: KEYCHAIN_PRECOMPILE,
  abi: keychainAbi,
  functionName: 'getRemainingLimit',
  args: [passkeyId, ALPHA_USD_ADDRESS],
});
```

### Rotating a Key (Recovery)

```typescript
// During recovery: remove old passkey, add new one
// Requires recovery wallet signature
const tx = await tempoClient.writeContract({
  address: KEYCHAIN_PRECOMPILE,
  abi: keychainAbi,
  functionName: 'removeKey',
  args: [oldPasskeyId],
});

const tx2 = await tempoClient.writeContract({
  address: KEYCHAIN_PRECOMPILE,
  abi: keychainAbi,
  functionName: 'addKey',
  args: [
    2,                   // keyType: WebAuthn
    newPasskeyPublicKey,
    0,                   // no expiry
    dailySpendingLimits, // restore previous limits
  ],
});
```

## Integration with the App Stack

| Layer | Responsibility |
|---|---|
| **Tempo Keychain** | Key storage, spending limits, key type validation, transaction authorization |
| **Wagmi** | Wallet connections — MetaMask (injected), Ledger (`@ledgerhq/ledger-wagmi-connector`), WalletConnect |
| **WebAuthn browser API** | Passkey creation and authentication |
| **Next.js Middleware** | Session management, route protection (redirect unauthenticated users) |
| **App layer (Auth.js)** | Email verification for recovery flow, session cookies |
| **PostHog** | Risk scoring — track login patterns, flag anomalies (future enhancement) |

## Spending Limit UX

The daily spending limit is the boundary between Tier 1 and Tier 2. The app communicates this clearly:

- **Dashboard:** Shows remaining daily limit (e.g., "$327 / $500 remaining today")
- **Send form:** If amount exceeds remaining limit, shows "Ledger required" before user taps Confirm
- **Settings:** User can adjust their own daily limit (requires Ledger confirmation to change)
- **Reset:** Limit resets daily at midnight UTC (enforced by keychain)

## References

- [Tempo — Account Keychain Precompile (Spec)](https://docs.tempo.xyz/protocol/transactions/spec-tempo-transaction)
- [Tempo — Create & Use Accounts](https://docs.tempo.xyz/guide/use-accounts)
- [Tempo — Embed Passkey Accounts](https://docs.tempo.xyz/guide/use-accounts/embed-passkeys)
- [Tempo — WebAuthn & P256 Signatures](https://docs.tempo.xyz/guide/use-accounts/webauthn-p256-signatures)
- [Tempo — Connect to Wallets](https://docs.tempo.xyz/guide/use-accounts/connect-to-wallets)
- [Ledger Wagmi Connector](https://github.com/LedgerHQ/ledger-wagmi-connector)
- [Passkey Authentication in Payment Systems (2026)](https://www.craftingsoftware.com/passkey-authentication-in-payment-systems-a-practical-guide-for-2026)
- [Passkey-First Authentication: Phishing-Resistant MFA (2026)](https://wnesecurity.com/passkey-first-authentication-phishing-resistant-mfa-in-2026/)
- [5 Authentication Trends Defining 2026](https://www.authsignal.com/blog/articles/5-authentication-trends-that-will-define-2026-our-founders-perspective)
