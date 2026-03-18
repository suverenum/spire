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
	// with a different token (the output of the swap being moved)
	const swapFollowUps = new Map<string, TaggedPayment>();
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
			for (const [key, _swap] of swapsByKey) {
				if (
					key.startsWith(`swap-source-${fromAccount.id}-`) &&
					!swapFollowUps.has(key)
				) {
					swapFollowUps.set(key, tx);
					swapTxHashes.add(tx.txHash);
					break;
				}
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
