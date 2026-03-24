"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { AccountGrid } from "@/domain/accounts/components/account-grid";
import { DeleteDialog } from "@/domain/accounts/components/delete-dialog";
import { RenameDialog } from "@/domain/accounts/components/rename-dialog";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord, AccountWithBalance } from "@/lib/tempo/types";

interface CashAccountsContentProps {
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

export function CashAccountsContent({
	treasuryName,
	authenticatedAt,
	treasuryId,
}: CashAccountsContentProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [renameAccount, setRenameAccount] = useState<AccountWithBalance | null>(null);
	const [deleteAccount, setDeleteAccount] = useState<AccountWithBalance | null>(null);

	const { data: rawAccounts = [] } = useQuery({
		queryKey: CACHE_KEYS.accounts(treasuryId),
		queryFn: () => getAccounts(),
	});

	const accounts: AccountRecord[] = rawAccounts.map((a) => ({
		...a,
		createdAt: new Date(a.createdAt),
	}));

	const { accounts: accountsWithBalances } = useAllBalances(accounts);
	const cashAccounts = accountsWithBalances.filter((a) => a.walletType === "eoa");

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<div className="mb-4">
					<h1 className="text-2xl font-semibold">Cash accounts</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						New cash account creation is temporarily unavailable.
					</p>
				</div>

				<AccountGrid
					accounts={cashAccounts}
					onRename={setRenameAccount}
					onDelete={setDeleteAccount}
				/>
				<RenameDialog
					open={!!renameAccount}
					onClose={() => setRenameAccount(null)}
					account={renameAccount}
					onSuccess={() => {
						void queryClient.invalidateQueries({
							queryKey: CACHE_KEYS.accounts(treasuryId),
						});
					}}
				/>
				<DeleteDialog
					open={!!deleteAccount}
					onClose={() => setDeleteAccount(null)}
					account={deleteAccount}
					onSuccess={() => {
						void queryClient.invalidateQueries({
							queryKey: CACHE_KEYS.accounts(treasuryId),
						});
					}}
					onTransferBalance={(acct) => {
						setDeleteAccount(null);
						router.push(`/accounts/${acct.id}`);
					}}
				/>
			</SidebarLayout>
		</SessionGuard>
	);
}
