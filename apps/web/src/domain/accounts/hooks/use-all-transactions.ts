"use client";

import { useQueries } from "@tanstack/react-query";
import { getBridgeDepositsForAccount } from "@/domain/bridge/queries/get-pending-deposits";
import { fetchTransactionsClient } from "@/domain/payments/hooks/use-transactions";
import { CACHE_KEYS } from "@/lib/constants";
import type {
	AccountRecord,
	BridgeDepositTransaction,
	GroupedTransaction,
	Payment,
} from "@/lib/tempo/types";
import { groupTransactions } from "../utils/group-transactions";

/** Parse a decimal USDC string (e.g. "100.50") into micro-units bigint without floating-point. */
function parseDecimalToMicroUnits(value: string): bigint {
	const [whole = "0", frac = ""] = value.split(".");
	const paddedFrac = frac.padEnd(6, "0").slice(0, 6);
	return BigInt(whole) * 1_000_000n + BigInt(paddedFrac);
}

export function useAllTransactions(accounts: AccountRecord[]) {
	const queries = useQueries({
		queries: accounts.map((account) => ({
			queryKey: CACHE_KEYS.transactions(account.walletAddress),
			queryFn: () => fetchTransactionsClient(account.walletAddress),
			staleTime: 5_000,
			enabled: accounts.length > 0,
		})),
	});

	// Fetch bridge deposits for USDC accounts
	const usdcAccounts = accounts.filter((a) => a.tokenSymbol === "USDC");
	const bridgeQueries = useQueries({
		queries: usdcAccounts.map((account) => ({
			queryKey: CACHE_KEYS.bridgeDeposits(account.id),
			queryFn: () => getBridgeDepositsForAccount(account.id),
			staleTime: 10_000,
			refetchInterval: 15_000,
			enabled: usdcAccounts.length > 0,
		})),
	});

	const rawTransactions: (Payment & {
		accountName: string;
		accountId: string;
	})[] = queries.flatMap((q, i) =>
		(q.data ?? []).map((tx) => ({
			...tx,
			accountName: accounts[i].name,
			accountId: accounts[i].id,
		})),
	);

	const grouped: GroupedTransaction[] = groupTransactions(rawTransactions, accounts);

	// Merge bridge deposits into the grouped transaction list
	const bridgeTransactions: BridgeDepositTransaction[] = bridgeQueries.flatMap((q, i) => {
		const account = usdcAccounts[i];
		return (q.data ?? []).map((deposit) => {
			const bridgeStatus = deposit.status as "pending" | "bridging" | "completed" | "failed";
			return {
				groupId: `bridge-${deposit.id}`,
				kind: "bridgeDeposit" as const,
				txHashes: (deposit.tempoTxHash
					? [deposit.tempoTxHash as `0x${string}`]
					: []) as `0x${string}`[],
				direction: "received" as const,
				status:
					bridgeStatus === "completed"
						? ("confirmed" as const)
						: bridgeStatus === "failed"
							? ("failed" as const)
							: ("pending" as const),
				timestamp: new Date(deposit.initiatedAt),
				visibleAccountIds: [account.id],
				accountId: account.id,
				accountName: account.name,
				sourceChain: deposit.sourceChain,
				sourceTxHash: deposit.sourceTxHash,
				amount: parseDecimalToMicroUnits(deposit.amount),
				token: "USDC",
				bridgeStatus,
				bridgeFee: deposit.bridgeFee ? parseDecimalToMicroUnits(deposit.bridgeFee) : undefined,
			};
		});
	});

	// Deduplicate: remove on-chain payments whose tx hash matches a completed bridge deposit's tempoTxHash
	const bridgeTxHashes = new Set(
		bridgeTransactions.filter((bt) => bt.bridgeStatus === "completed").flatMap((bt) => bt.txHashes),
	);
	const deduplicatedGrouped =
		bridgeTxHashes.size > 0
			? grouped.filter(
					(tx) => tx.kind !== "payment" || !tx.txHashes.some((h) => bridgeTxHashes.has(h)),
				)
			: grouped;

	const allTransactions = [...deduplicatedGrouped, ...bridgeTransactions].sort(
		(a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
	);

	return {
		transactions: allTransactions,
		isLoading: queries.some((q) => q.isLoading) || bridgeQueries.some((q) => q.isLoading),
	};
}
