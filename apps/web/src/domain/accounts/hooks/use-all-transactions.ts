"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchTransactionsClient } from "@/domain/payments/hooks/use-transactions";
import { CACHE_KEYS } from "@/lib/constants";
import type {
	AccountRecord,
	GroupedTransaction,
	Payment,
} from "@/lib/tempo/types";
import { groupTransactions } from "../utils/group-transactions";

export function useAllTransactions(accounts: AccountRecord[]) {
	const queries = useQueries({
		queries: accounts.map((account) => ({
			queryKey: CACHE_KEYS.transactions(account.walletAddress),
			queryFn: () => fetchTransactionsClient(account.walletAddress),
			staleTime: 5_000,
			enabled: accounts.length > 0,
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

	const grouped: GroupedTransaction[] = groupTransactions(
		rawTransactions,
		accounts,
	);

	return {
		transactions: grouped,
		isLoading: queries.some((q) => q.isLoading),
	};
}
