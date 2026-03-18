import type {
	AccountRecord,
	GroupedTransaction,
	Payment,
} from "@/lib/tempo/types";

interface TaggedPayment extends Payment {
	accountName: string;
	accountId: string;
}

/**
 * Groups raw per-wallet transactions into grouped entries:
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

	for (const tx of transactions) {
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
