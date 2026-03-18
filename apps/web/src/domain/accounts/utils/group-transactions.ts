import { DEX_ADDRESS } from "@/lib/constants";
import type {
	AccountRecord,
	GroupedTransaction,
	Payment,
	SwapTransaction,
} from "@/lib/tempo/types";

interface TaggedPayment extends Payment {
	accountName: string;
	accountId: string;
}

const DEX_ADDR_LOWER = DEX_ADDRESS.toLowerCase();

// Maximum time gap (ms) between a DEX swap and its follow-up transfer
// to consider them part of the same operation. Tempo settles in seconds,
// so 60s is generous while still preventing mis-association.
const SWAP_FOLLOWUP_WINDOW_MS = 60_000;

/**
 * Groups raw per-wallet transactions into grouped entries:
 * - Swaps (transactions involving the DEX address) group into one swap row
 * - Internal transfers (both from and to are treasury wallets) collapse into one row
 * - Regular payments remain as-is but tagged with account info
 * - Sorted by timestamp descending
 */
export function groupTransactions(
	transactions: TaggedPayment[],
	accounts: AccountRecord[],
): GroupedTransaction[] {
	const walletToAccount = new Map<string, AccountRecord>();
	for (const account of accounts) {
		walletToAccount.set(account.walletAddress.toLowerCase(), account);
	}

	const grouped = new Map<string, GroupedTransaction>();

	// First pass: detect swap-related transactions (involving DEX address)
	const swapTxHashes = new Set<string>();
	const swapsByKey = new Map<
		string,
		{ dexTx: TaggedPayment; sourceAccount: AccountRecord }
	>();

	for (const tx of transactions) {
		const toAddr = tx.to.toLowerCase();
		const fromAddr = tx.from.toLowerCase();

		if (toAddr === DEX_ADDR_LOWER || fromAddr === DEX_ADDR_LOWER) {
			const accountAddr = fromAddr === DEX_ADDR_LOWER ? toAddr : fromAddr;
			const account = walletToAccount.get(accountAddr);
			if (account) {
				const key = `swap-source-${account.id}-${tx.txHash}`;
				swapsByKey.set(key, { dexTx: tx, sourceAccount: account });
				swapTxHashes.add(tx.txHash);
			}
		}
	}

	// Second pass: find follow-up internal transfers from swap source to destination
	// with a different token (the output of the swap being moved).
	// Group swaps and candidate transfers by source account, sort both by timestamp,
	// then match 1-to-1 in chronological order. This avoids mis-association when
	// multiple swaps from the same source happen close together — the client executes
	// each swap-then-transfer sequentially, so follow-ups are in the same order as swaps.
	const swapFollowUps = new Map<string, TaggedPayment>();

	// Collect candidate follow-up transfers grouped by source account ID
	const candidatesBySource = new Map<string, TaggedPayment[]>();
	for (const tx of transactions) {
		if (swapTxHashes.has(tx.txHash)) continue;

		const fromAddr = tx.from.toLowerCase();
		const toAddr = tx.to.toLowerCase();
		const fromAccount = walletToAccount.get(fromAddr);
		const toAccount = walletToAccount.get(toAddr);

		if (
			fromAccount &&
			toAccount &&
			fromAccount.tokenSymbol !== toAccount.tokenSymbol
		) {
			let arr = candidatesBySource.get(fromAccount.id);
			if (!arr) {
				arr = [];
				candidatesBySource.set(fromAccount.id, arr);
			}
			arr.push(tx);
		}
	}

	// Group swaps by source account ID
	const swapKeysBySource = new Map<string, string[]>();
	for (const [key, swap] of swapsByKey) {
		const accountId = swap.sourceAccount.id;
		let arr = swapKeysBySource.get(accountId);
		if (!arr) {
			arr = [];
			swapKeysBySource.set(accountId, arr);
		}
		arr.push(key);
	}

	// For each source account, sort swaps and candidates by timestamp, then match in order
	for (const [accountId, keys] of swapKeysBySource) {
		const candidates = candidatesBySource.get(accountId);
		if (!candidates || candidates.length === 0) continue;

		// Sort swaps by timestamp ascending
		keys.sort(
			(a, b) =>
				swapsByKey.get(a)!.dexTx.timestamp.getTime() -
				swapsByKey.get(b)!.dexTx.timestamp.getTime(),
		);

		// Sort candidate transfers by timestamp ascending
		candidates.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		let candidateIdx = 0;
		for (const key of keys) {
			const swap = swapsByKey.get(key)!;
			// Find the first unmatched candidate that is after the swap and within the window
			while (candidateIdx < candidates.length) {
				const tx = candidates[candidateIdx];
				const timeDiffMs =
					tx.timestamp.getTime() - swap.dexTx.timestamp.getTime();

				if (timeDiffMs < 0) {
					// Transfer is before this swap — skip it (can't be a follow-up)
					candidateIdx++;
					continue;
				}

				if (timeDiffMs > SWAP_FOLLOWUP_WINDOW_MS) {
					// Transfer is too far after — no match for this swap
					break;
				}

				// Valid match — assign and advance
				swapFollowUps.set(key, tx);
				swapTxHashes.add(tx.txHash);
				candidateIdx++;
				break;
			}
		}
	}

	// Build swap grouped entries
	for (const [key, swap] of swapsByKey) {
		const followUp = swapFollowUps.get(key);
		const destAccount = followUp
			? walletToAccount.get(followUp.to.toLowerCase())
			: undefined;

		const txHashes: `0x${string}`[] = [swap.dexTx.txHash];
		if (followUp) txHashes.push(followUp.txHash);

		const groupKey = `swap-${txHashes.join("-")}`;
		if (!grouped.has(groupKey)) {
			const entry: SwapTransaction = {
				groupId: groupKey,
				kind: "swap",
				txHashes,
				direction: "internal",
				status: swap.dexTx.status,
				timestamp: swap.dexTx.timestamp,
				visibleAccountIds: destAccount
					? [swap.sourceAccount.id, destAccount.id]
					: [swap.sourceAccount.id],
				fromAccountId: swap.sourceAccount.id,
				fromAccountName: swap.sourceAccount.name,
				toAccountId: destAccount?.id ?? swap.sourceAccount.id,
				toAccountName: destAccount?.name ?? swap.sourceAccount.name,
				sourceWalletAddress: swap.sourceAccount.walletAddress as `0x${string}`,
				destinationWalletAddress: (destAccount?.walletAddress ??
					swap.sourceAccount.walletAddress) as `0x${string}`,
				amountIn: swap.dexTx.amount,
				amountOut: followUp?.amount,
				tokenIn: swap.sourceAccount.tokenSymbol,
				tokenOut: destAccount?.tokenSymbol ?? swap.sourceAccount.tokenSymbol,
				recoveryRequired: !followUp,
			};
			grouped.set(groupKey, entry);
		}
	}

	for (const tx of transactions) {
		// Skip transactions already grouped as swaps
		if (swapTxHashes.has(tx.txHash)) continue;

		const fromAddr = tx.from.toLowerCase();
		const toAddr = tx.to.toLowerCase();
		const fromAccount = walletToAccount.get(fromAddr);
		const toAccount = walletToAccount.get(toAddr);

		// Internal transfer: both from and to belong to treasury wallets
		if (fromAccount && toAccount) {
			const key = `internal-${tx.txHash}`;
			if (!grouped.has(key)) {
				grouped.set(key, {
					groupId: key,
					kind: "internalTransfer",
					txHashes: [tx.txHash],
					direction: "internal",
					status: tx.status,
					timestamp: tx.timestamp,
					visibleAccountIds: [fromAccount.id, toAccount.id],
					fromAccountId: fromAccount.id,
					fromAccountName: fromAccount.name,
					toAccountId: toAccount.id,
					toAccountName: toAccount.name,
					fromWalletAddress: tx.from,
					toWalletAddress: tx.to,
					amount: tx.amount,
					token: tx.token,
				});
			}
			continue;
		}

		// Regular payment
		const isSent = !!fromAccount;
		const account = fromAccount ?? toAccount;
		if (!account) continue;

		const key = `payment-${tx.txHash}-${tx.accountId}`;
		if (!grouped.has(key)) {
			grouped.set(key, {
				groupId: key,
				kind: "payment",
				txHashes: [tx.txHash],
				accountId: account.id,
				accountName: account.name,
				direction: isSent ? "sent" : "received",
				status: tx.status,
				timestamp: tx.timestamp,
				visibleAccountIds: [account.id],
				from: tx.from,
				to: tx.to,
				amount: tx.amount,
				token: tx.token,
				memo: tx.memo,
			});
		}
	}

	return Array.from(grouped.values()).sort(
		(a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
	);
}
