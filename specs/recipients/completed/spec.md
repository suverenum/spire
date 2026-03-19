# SPEC: Recipients (Contact Book)

## 1. Meta Information

- **Branch:** feature/recipients
- **Epic:** Recipients
- **PRD:** [prd.md](./prd.md)
- **Depends on:** [Multi-Account Spec](../multi-accounts/spec.md)

## 2. Context

Add a per-treasury contact book for saving on-chain addresses with nicknames. Recipients integrate with the send flow (picker), transaction history (name resolution), and a dedicated management page with cached turnover stats.

See [prd.md](./prd.md) for full scope, user stories, flows, and mockups.

## 3. Key Technical Drivers

- **DB-Only Metadata:** Recipients are stored in Postgres, not on-chain. CRUD is instant — no chain transactions.
- **Cached Stats:** Turnover and last active are derived from full transaction history, then cached in a `recipient_stats` table for fast reads.
- **Address Safety:** Format validation, EIP-55 checksum, treasury-owned address blocking, and Tempo activity check.
- **Nickname Normalization:** Case-insensitive uniqueness via a `nickname_normalized` column.

## 4. Current State

Multi-account management provides the foundation:
- Multiple treasury accounts with per-wallet transaction feeds
- Merged transaction history across all accounts
- Send form with account selector
- Sidebar navigation (Dashboard, Transactions, Accounts, Settings)

This feature adds:
- `recipients` and `recipient_stats` tables
- Recipients CRUD (create, edit, delete) with address + nickname uniqueness
- Recipient picker in send flow
- Name resolution in transaction list and detail
- Ad-hoc save prompt after sending to new addresses
- `/recipients` page in sidebar

## 5. Database Schema

```typescript
export const recipients = pgTable('recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  treasuryId: uuid('treasury_id').references(() => treasuries.id).notNull(),
  address: text('address').notNull(),                    // lowercase 0x address
  nickname: text('nickname').notNull(),                  // display value, trimmed
  nicknameNormalized: text('nickname_normalized').notNull(), // lower(trim(nickname))
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  treasuryAddressUnique: uniqueIndex('recipients_treasury_address_idx')
    .on(table.treasuryId, table.address),
  treasuryNicknameUnique: uniqueIndex('recipients_treasury_nickname_idx')
    .on(table.treasuryId, table.nicknameNormalized),
}));

export const recipientStats = pgTable('recipient_stats', {
  recipientId: uuid('recipient_id')
    .references(() => recipients.id, { onDelete: 'cascade' })
    .primaryKey(),
  turnoverUsd6: bigint('turnover_usd_6', { mode: 'bigint' }).notNull().default(0n),
  lastActiveAt: timestamp('last_active_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Normalization Rules

- **Address:** `address.toLowerCase()` before insert/compare
- **Nickname:** store display value as-is (trimmed), store `nicknameNormalized = nickname.trim().toLowerCase()` for uniqueness

## 6. Proposed Solution

### 6.1. Recipient CRUD Server Actions

```typescript
// apps/web/src/domain/recipients/actions/create-recipient.ts
'use server';

export async function createRecipientAction(input: {
  address: string;
  nickname: string;
}): Promise<{ error?: string; recipient?: Recipient }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const address = input.address.toLowerCase();
  const nickname = input.nickname.trim();
  const nicknameNormalized = nickname.toLowerCase();

  // Validate format
  if (!ADDRESS_RE.test(address)) return { error: 'Invalid address format' };

  // Block treasury-owned addresses
  const ownedAccounts = await db.query.accounts.findMany({
    where: eq(accounts.treasuryId, session.treasuryId),
  });
  if (ownedAccounts.some(a => a.walletAddress.toLowerCase() === address)) {
    return { error: 'Cannot save your own account as a recipient. Use internal transfer instead.' };
  }

  try {
    const [recipient] = await db.insert(recipients).values({
      treasuryId: session.treasuryId,
      address,
      nickname,
      nicknameNormalized,
    }).returning();

    // Trigger async stats backfill
    void backfillRecipientStats(recipient.id, address, session.treasuryId);

    return { recipient };
  } catch (err: unknown) {
    const pgCode = (err as { code?: string })?.code;
    if (pgCode === '23505') {
      // Determine which constraint was violated
      const existing = await db.query.recipients.findFirst({
        where: and(
          eq(recipients.treasuryId, session.treasuryId),
          or(
            eq(recipients.address, address),
            eq(recipients.nicknameNormalized, nicknameNormalized),
          ),
        ),
      });
      if (existing?.address === address) {
        return { error: `This address is already saved as "${existing.nickname}"` };
      }
      return { error: `This name is already used for ${truncateAddress(existing!.address)}` };
    }
    throw err;
  }
}
```

```typescript
// apps/web/src/domain/recipients/actions/update-recipient.ts
'use server';

export async function updateRecipientAction(input: {
  id: string;
  nickname: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const nickname = input.nickname.trim();
  const nicknameNormalized = nickname.toLowerCase();

  // Verify ownership
  const recipient = await db.query.recipients.findFirst({
    where: and(
      eq(recipients.id, input.id),
      eq(recipients.treasuryId, session.treasuryId),
    ),
  });
  if (!recipient) return { error: 'Recipient not found' };

  try {
    await db.update(recipients)
      .set({ nickname, nicknameNormalized, updatedAt: new Date() })
      .where(eq(recipients.id, input.id));
    return {};
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === '23505') {
      return { error: `This name is already used by another recipient` };
    }
    throw err;
  }
}
```

```typescript
// apps/web/src/domain/recipients/actions/delete-recipient.ts
'use server';

export async function deleteRecipientAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const result = await db.delete(recipients).where(
    and(
      eq(recipients.id, id),
      eq(recipients.treasuryId, session.treasuryId),
    ),
  );
  // recipient_stats row cascades automatically

  return {};
}
```

### 6.2. Stats Backfill

```typescript
// apps/web/src/domain/recipients/actions/backfill-stats.ts

async function backfillRecipientStats(
  recipientId: string,
  address: string,
  treasuryId: string,
) {
  // Fetch all accounts for this treasury
  const treasuryAccounts = await db.query.accounts.findMany({
    where: eq(accounts.treasuryId, treasuryId),
  });

  // Fetch full transaction history from all account wallets
  const allTxs = await Promise.all(
    treasuryAccounts.map(a => fetchTransactions(a.walletAddress as `0x${string}`)),
  );

  const addressLower = address.toLowerCase();
  let turnover = 0n;
  let lastActiveAt: Date | null = null;

  for (const txs of allTxs) {
    for (const tx of txs) {
      const isCounterparty =
        tx.from.toLowerCase() === addressLower ||
        tx.to.toLowerCase() === addressLower;

      // Skip treasury-internal transactions
      const isInternal = treasuryAccounts.some(
        a => a.walletAddress.toLowerCase() === tx.from.toLowerCase(),
      ) && treasuryAccounts.some(
        a => a.walletAddress.toLowerCase() === tx.to.toLowerCase(),
      );

      if (isCounterparty && !isInternal) {
        turnover += tx.amount;
        if (!lastActiveAt || tx.timestamp > lastActiveAt) {
          lastActiveAt = tx.timestamp;
        }
      }
    }
  }

  await db.insert(recipientStats)
    .values({ recipientId, turnoverUsd6: turnover, lastActiveAt })
    .onConflictDoUpdate({
      target: recipientStats.recipientId,
      set: { turnoverUsd6: turnover, lastActiveAt, updatedAt: new Date() },
    });
}
```

### 6.3. Stats Refresh

Stats are refreshed when transactions are invalidated (after send, receive, or WebSocket event):

```typescript
// After transaction cache invalidation, refresh stats for affected recipients
async function refreshAffectedRecipientStats(
  treasuryId: string,
  affectedAddresses: string[],
) {
  const matched = await db.query.recipients.findMany({
    where: and(
      eq(recipients.treasuryId, treasuryId),
      inArray(recipients.address, affectedAddresses.map(a => a.toLowerCase())),
    ),
  });

  await Promise.all(
    matched.map(r => backfillRecipientStats(r.id, r.address, treasuryId)),
  );
}
```

### 6.4. Address Validation

```typescript
// apps/web/src/domain/recipients/utils/validate-address.ts

import { getAddress, isAddress } from 'viem';

export function validateRecipientAddress(
  address: string,
  ownedWalletAddresses: string[],
): { valid: boolean; error?: string } {
  // Format check
  if (!isAddress(address)) {
    return { valid: false, error: 'Invalid address format (0x...)' };
  }

  // EIP-55 checksum (if mixed case)
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
    try {
      getAddress(address); // throws if checksum invalid
    } catch {
      return { valid: false, error: 'Invalid address checksum. Check for typos.' };
    }
  }

  // Treasury-owned check
  const normalized = address.toLowerCase();
  if (ownedWalletAddresses.some(a => a.toLowerCase() === normalized)) {
    return { valid: false, error: 'This is your own account. Use internal transfer instead.' };
  }

  return { valid: true };
}
```

### 6.5. Wallet Activity Check

```typescript
// apps/web/src/domain/recipients/hooks/use-activity-check.ts

export function useActivityCheck(address: string | undefined) {
  return useQuery({
    queryKey: ['activity-check', address],
    queryFn: async () => {
      if (!address || !isAddress(address)) return null;

      try {
        const nonce = await tempoClient.getTransactionCount({
          address: address as `0x${string}`,
        });
        return { active: nonce > 0, available: true };
      } catch {
        return { active: false, available: false };
      }
    },
    enabled: !!address && isAddress(address),
    staleTime: 5 * 60_000, // cache for 5 min
  });
}
```

### 6.6. Recipient Name Resolution

Recipient lookup for transaction rendering is a client-side map lookup:

```typescript
// apps/web/src/domain/recipients/hooks/use-recipient-map.ts

export function useRecipientMap(treasuryId: string) {
  const { data: recipients } = useQuery({
    queryKey: ['recipients', treasuryId],
    queryFn: () => fetchRecipients(treasuryId),
    staleTime: 30_000,
  });

  // Address → nickname map for O(1) lookup
  const recipientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recipients ?? []) {
      map.set(r.address.toLowerCase(), r.nickname);
    }
    return map;
  }, [recipients]);

  return recipientMap;
}

// Usage in transaction rendering:
const nickname = recipientMap.get(tx.to.toLowerCase());
// "To: Acme Corp · 0x9f3a…" or "To: 0x9f3a…"
```

### 6.7. Send Flow Integration

The recipient picker is a sheet component that reads from the recipients query:

```typescript
// apps/web/src/domain/recipients/components/recipient-picker.tsx

interface RecipientPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (recipient: RecipientWithStats) => void;
}

export function RecipientPicker({ open, onClose, onSelect }: RecipientPickerProps) {
  const [search, setSearch] = useState('');
  const { data: recipients } = useRecipientsWithStats();

  const filtered = useMemo(() => {
    if (!search) return recipients ?? [];
    const q = search.toLowerCase();
    return (recipients ?? []).filter(
      r => r.nickname.toLowerCase().includes(q) || r.address.includes(q),
    );
  }, [recipients, search]);

  // Sorted by turnover (highest first) — already sorted from query
  // ...render Sheet with search + list
}
```

### 6.8. Ad-Hoc Save After Send

After a successful send to an address not in the contact book:

```typescript
// In send mutation onSuccess callback:
onSuccess: (data, vars) => {
  const addressLower = vars.to.toLowerCase();
  const isRecipient = recipientMap.has(addressLower);
  const isOwnAccount = ownedAddresses.includes(addressLower);

  if (!isRecipient && !isOwnAccount) {
    // Show save prompt
    setSavePrompt({ address: vars.to, show: true });
  }
}
```

### 6.9. WebSocket Notification Enhancement

Extend the existing incoming payment handler:

```typescript
// In useIncomingPayments / useMultiAccountPayments:
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'eth_subscription') {
    const senderAddress = parseSenderFromLog(data.params.result);
    const nickname = recipientMap.get(senderAddress?.toLowerCase() ?? '');

    if (nickname) {
      toast(`Payment received from ${nickname}!`, 'success');
    } else {
      toast('Payment received!', 'success');
    }

    // Refresh stats for the sender if they're a recipient
    if (nickname && senderAddress) {
      void refreshAffectedRecipientStats(treasuryId, [senderAddress]);
    }

    invalidateData();
  }
};
```

## 7. Component Structure

```
apps/web/src/
├── domain/
│   └── recipients/
│       ├── actions/
│       │   ├── create-recipient.ts         # Server action: validate + insert + trigger backfill
│       │   ├── update-recipient.ts         # Server action: update nickname with uniqueness check
│       │   ├── delete-recipient.ts         # Server action: ownership check + delete (stats cascade)
│       │   └── backfill-stats.ts           # Compute turnover + last active from full tx history
│       ├── queries/
│       │   ├── get-recipients.ts           # Fetch all recipients with stats for a treasury
│       │   └── get-recipient-map.ts        # Address → nickname map for tx rendering
│       ├── components/
│       │   ├── recipients-list.tsx         # Recipients page list with ⋯ menu
│       │   ├── recipients-list.test.tsx
│       │   ├── recipient-form.tsx          # Add/Edit dialog (shared)
│       │   ├── recipient-form.test.tsx
│       │   ├── recipient-picker.tsx        # Send flow picker sheet
│       │   ├── recipient-picker.test.tsx
│       │   ├── save-recipient-prompt.tsx   # Post-send ad-hoc save toast
│       │   └── delete-recipient-dialog.tsx
│       ├── hooks/
│       │   ├── use-recipients.ts           # TanStack Query for recipients + stats
│       │   ├── use-recipient-map.ts        # Address → nickname map
│       │   └── use-activity-check.ts       # Tempo activity check for address
│       └── utils/
│           └── validate-address.ts         # Format, checksum, treasury-owned check
├── app/
│   └── recipients/
│       └── page.tsx                        # Recipients management page
```

## 8. Key Types

```typescript
interface Recipient {
  id: string;
  treasuryId: string;
  address: string;
  nickname: string;
  nicknameNormalized: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RecipientStats {
  recipientId: string;
  turnoverUsd6: bigint;
  lastActiveAt: Date | null;
  updatedAt: Date;
}

interface RecipientWithStats extends Recipient {
  turnoverUsd6: bigint;
  lastActiveAt: Date | null;
  statsLoading: boolean; // true during backfill
}

interface ActivityCheckResult {
  active: boolean;     // has on-chain history
  available: boolean;  // RPC check succeeded
}
```

## 9. Testing Strategy

### 9.1. Unit Tests (Vitest — colocated)

- **Address validation:** format, checksum, treasury-owned rejection, normalization
- **Nickname normalization:** trim, case-insensitive comparison, display preservation
- **Recipient map:** O(1) lookup, lowercase matching, empty map handling
- **Stats computation:** turnover aggregation, last active selection, internal tx exclusion
- **Picker search:** name filter, address filter, combined, empty results

### 9.2. Integration Tests (Vitest)

- **CRUD:** create with unique address/nickname, duplicate address error, duplicate nickname error, edit nickname, delete with stats cascade
- **Treasury ownership:** reject treasury-owned address on create, reject cross-treasury access
- **Stats backfill:** compute from transaction history, exclude internal transfers, handle no history
- **Stats refresh:** update after new transaction, only refresh affected recipients

### 9.3. E2E Tests (Playwright)

- **Add recipient:** enter address + nickname → verify appears in list with stats loading → stats populate
- **Duplicate address:** enter existing address → verify error with existing nickname shown
- **Duplicate nickname:** enter existing nickname → verify error with existing address shown
- **Edit nickname:** ⋯ → Edit → change name → verify updated in list and transaction history
- **Delete recipient:** ⋯ → Delete → confirm → verify removed, transactions show raw address
- **Send with picker:** open send → tap 📇 → search → select → verify address filled
- **Ad-hoc save:** send to new address → verify save prompt → enter name → verify recipient created
- **Activity check:** enter unused address → verify warning shown
- **Treasury-owned block:** enter own account address → verify error with transfer suggestion
- **View Transactions:** ⋯ → View Transactions → verify /transactions opens filtered
- **Transaction names:** send to recipient → verify transaction shows nickname
- **Empty state:** no recipients → verify "Add your first recipient" CTA
- **Incoming payment notification:** receive from saved recipient → verify toast shows nickname

## 10. Definition of Done

### Universal

- [x] Unit & integration tests pass (`bun run test`)
- [x] E2E tests pass (from `apps/web/`: `bun run test:e2e`)
- [x] 90% coverage thresholds met (lines, functions, branches, statements)
- [x] TypeScript compiles cleanly (`bun run typecheck`)
- [x] Biome lint + format passes (`bun run lint`)
- [x] Database migrations are clean (`bun run db:generate` from `apps/web/` produces no diff)
- [x] Spec updated to reflect implementation
- [x] CI passes on PR (lint, typecheck, test, build via GitHub Actions)
- [x] App deployed and accessible on Vercel

### Feature-Specific

- [x] Recipients CRUD with address uniqueness (lowercase, DB index)
- [x] Recipients CRUD with nickname uniqueness (trimmed, case-insensitive, DB index on normalized)
- [x] Duplicate address shows existing recipient name and offers edit
- [x] Duplicate nickname shows which address uses the name and blocks save
- [x] Address format + EIP-55 checksum validation inline
- [x] Treasury-owned address blocked on create and send, with pointer to internal transfer
- [x] Wallet activity check: warning when no prior Tempo activity (non-blocking)
- [x] Activity check unavailable: neutral status shown (non-blocking)
- [x] Recipients page sorted by turnover with nickname, address, turnover, last active
- [x] Recipients page empty state with "Add your first recipient" CTA
- [x] ⋯ menu on each recipient: Edit, Delete, View Transactions
- [x] View Transactions opens `/transactions` filtered to recipient address
- [x] Recipient picker in send form (📇 icon), sorted by turnover, searchable by name/address
- [x] Selecting recipient fills address + shows nickname above field
- [x] Editing address after selection clears the nickname/selection state
- [x] Ad-hoc save prompt after sending to a new (non-recipient, non-treasury) address
- [x] Transaction list shows recipient nickname next to address for matching counterparties
- [x] Transaction detail page shows recipient name when counterparty is saved
- [x] Internal transfers and swaps do not show recipient names (they use account names)
- [x] Incoming payment WebSocket toast shows "Payment received from [nickname]!" for saved recipients
- [x] Stats cached in `recipient_stats` table, refreshed after transaction sync
- [x] Stats backfill triggers immediately on recipient create, shows loading state until complete
- [x] Deleting recipient cascades stats row
- [x] "Recipients" appears in sidebar between "Accounts" and "Settings"

## 11. References

- [PRD: Recipients](./prd.md)
- [Multi-Account Spec](../multi-accounts/spec.md)
- [Multi-Account PRD](../multi-accounts/prd.md)
- [viem isAddress](https://viem.sh/docs/utilities/isAddress)
- [viem getAddress (EIP-55)](https://viem.sh/docs/utilities/getAddress)
