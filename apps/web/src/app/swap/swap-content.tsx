"use client";

import { useQuery } from "@tanstack/react-query";
import { SidebarLayout } from "@/components/sidebar-layout";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { SwapForm } from "@/domain/swap/components/swap-form";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord } from "@/lib/tempo/types";

interface SwapContentProps {
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

export function SwapContent({ treasuryName, authenticatedAt, treasuryId }: SwapContentProps) {
	const { data: rawAccounts = [] } = useQuery({
		queryKey: CACHE_KEYS.accounts(treasuryId),
		queryFn: () => getAccounts(),
	});

	const accounts: AccountRecord[] = rawAccounts.map((a) => ({
		...a,
		createdAt: new Date(a.createdAt),
	}));

	const { accounts: accountsWithBalances } = useAllBalances(accounts);

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<h1 className="mb-6 text-2xl font-semibold">Swap</h1>
				<div className="mx-auto max-w-md">
					<SwapForm accounts={accountsWithBalances} treasuryId={treasuryId} />
				</div>
			</SidebarLayout>
		</SessionGuard>
	);
}
