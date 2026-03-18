"use client";

import { useQueries } from "@tanstack/react-query";
import { fetchBalancesClient } from "@/domain/payments/hooks/use-balances";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord, AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";

export function useAllBalances(accounts: AccountRecord[]) {
	const queries = useQueries({
		queries: accounts.map((account) => ({
			queryKey: CACHE_KEYS.accountBalance(account.walletAddress, account.tokenAddress),
			queryFn: async () => {
				const result = await fetchBalancesClient(account.walletAddress);
				const tokenBalance = result.balances.find(
					(b) => b.tokenAddress.toLowerCase() === account.tokenAddress.toLowerCase(),
				);
				return tokenBalance?.balance ?? 0n;
			},
			staleTime: 5_000,
			gcTime: 5 * 60_000,
			enabled: accounts.length > 0,
		})),
	});

	const accountsWithBalances: AccountWithBalance[] = accounts.map((account, i) => {
		const balance = queries[i]?.data ?? 0n;
		return {
			...account,
			balance,
			balanceFormatted: `$${formatBalance(balance, 6)}`,
		};
	});

	const totalBalance = accountsWithBalances.reduce((sum, a) => sum + a.balance, 0n);

	const isLoading = queries.some((q) => q.isLoading);
	const isError = queries.some((q) => q.isError);

	return {
		accounts: accountsWithBalances,
		totalBalance,
		isLoading,
		isError,
	};
}
