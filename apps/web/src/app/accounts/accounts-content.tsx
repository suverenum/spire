"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { AccountGrid } from "@/domain/accounts/components/account-grid";
import { CreateAccountForm } from "@/domain/accounts/components/create-account-form";
import { DeleteDialog } from "@/domain/accounts/components/delete-dialog";
import { RenameDialog } from "@/domain/accounts/components/rename-dialog";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord, AccountWithBalance } from "@/lib/tempo/types";

interface AccountsContentProps {
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

export function AccountsContent({
	treasuryName,
	authenticatedAt,
	treasuryId,
}: AccountsContentProps) {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [renameAccount, setRenameAccount] = useState<AccountWithBalance | null>(
		null,
	);
	const [deleteAccount, setDeleteAccount] = useState<AccountWithBalance | null>(
		null,
	);

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
				<div className="mb-4 flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Accounts</h1>
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4" />
						Create Account
					</Button>
				</div>

				<AccountGrid
					accounts={accountsWithBalances}
					onRename={setRenameAccount}
					onDelete={setDeleteAccount}
				/>

				<CreateAccountForm
					open={createOpen}
					onClose={() => setCreateOpen(false)}
					treasuryId={treasuryId}
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
				/>
			</SidebarLayout>
		</SessionGuard>
	);
}
