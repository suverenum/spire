"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { useState } from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountGrid } from "@/domain/accounts/components/account-grid";
import { CreateAccountForm } from "@/domain/accounts/components/create-account-form";
import { DeleteDialog } from "@/domain/accounts/components/delete-dialog";
import { RenameDialog } from "@/domain/accounts/components/rename-dialog";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { useAllTransactions } from "@/domain/accounts/hooks/use-all-transactions";
import { useMultiAccountWs } from "@/domain/accounts/hooks/use-multi-account-ws";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { ReceiveSheet } from "@/domain/payments/components/receive-sheet";
import { SendPaymentForm } from "@/domain/payments/components/send-payment-form";
import { WebSocketBanner } from "@/domain/payments/components/websocket-banner";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord, AccountWithBalance } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";
import { DashboardRecentTransactions } from "./dashboard-recent-transactions";

interface DashboardContentProps {
	treasuryName: string;
	tempoAddress: `0x${string}`;
	authenticatedAt: number;
	treasuryId: string;
}

export function DashboardContent({
	treasuryName,
	tempoAddress,
	authenticatedAt,
	treasuryId,
}: DashboardContentProps) {
	const queryClient = useQueryClient();
	const [sendOpen, setSendOpen] = useState(false);
	const [receiveOpen, setReceiveOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [renameAccount, setRenameAccount] = useState<AccountWithBalance | null>(
		null,
	);
	const [deleteAccount, setDeleteAccount] = useState<AccountWithBalance | null>(
		null,
	);
	const [selectedSendAccount, setSelectedSendAccount] =
		useState<AccountWithBalance | null>(null);
	const [selectedReceiveAccount, setSelectedReceiveAccount] =
		useState<AccountWithBalance | null>(null);

	const { data: rawAccounts = [] } = useQuery({
		queryKey: CACHE_KEYS.accounts(treasuryId),
		queryFn: () => getAccounts(),
	});

	const accounts: AccountRecord[] = rawAccounts.map((a) => ({
		...a,
		createdAt: new Date(a.createdAt),
	}));

	const { accounts: accountsWithBalances, totalBalance } =
		useAllBalances(accounts);

	const { transactions } = useAllTransactions(accounts);
	const { isConnected } = useMultiAccountWs(accounts);

	// Default to highest-balance account for send/receive; ties break by creation order
	const sorted = [...accountsWithBalances].sort((a, b) => {
		const diff = b.balance - a.balance;
		if (diff !== 0n) return diff > 0n ? 1 : -1;
		return a.createdAt.getTime() - b.createdAt.getTime();
	});
	const highestBalanceAccount = sorted[0] ?? null;

	function handleSendOpen() {
		setSelectedSendAccount(highestBalanceAccount);
		setSendOpen(true);
	}

	function handleReceiveOpen() {
		setSelectedReceiveAccount(highestBalanceAccount);
		setReceiveOpen(true);
	}

	const sendFromAddress =
		(selectedSendAccount?.walletAddress as `0x${string}`) ?? tempoAddress;
	const receiveAddress =
		(selectedReceiveAccount?.walletAddress as `0x${string}`) ?? tempoAddress;

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<WebSocketBanner isConnected={isConnected} />

				<Card className="mb-6">
					<p className="text-sm text-gray-500">Total Balance</p>
					<p className="text-3xl font-semibold">
						${formatBalance(totalBalance, 6)}
					</p>
				</Card>

				<div className="mb-6 flex gap-3">
					<Button onClick={handleSendOpen} className="flex-1" size="lg">
						<ArrowUpRight className="h-5 w-5" />
						Send
					</Button>
					<Button
						onClick={handleReceiveOpen}
						variant="outline"
						className="flex-1"
						size="lg"
					>
						<ArrowDownLeft className="h-5 w-5" />
						Receive
					</Button>
					<Button
						onClick={() => setCreateOpen(true)}
						variant="outline"
						size="lg"
					>
						<Plus className="h-5 w-5" />
					</Button>
				</div>

				<div className="mb-6">
					<h2 className="mb-3 text-lg font-semibold">Accounts</h2>
					<AccountGrid
						accounts={accountsWithBalances}
						maxItems={4}
						showViewAll
						onRename={setRenameAccount}
						onDelete={setDeleteAccount}
					/>
				</div>

				<DashboardRecentTransactions
					transactions={transactions}
					accounts={accounts}
				/>

				<SendPaymentForm
					open={sendOpen}
					onClose={() => setSendOpen(false)}
					fromAddress={sendFromAddress}
					accounts={accountsWithBalances}
					selectedAccountId={selectedSendAccount?.id}
					onAccountChange={(id) => {
						const acct = accountsWithBalances.find((a) => a.id === id);
						if (acct) setSelectedSendAccount(acct);
					}}
				/>
				<ReceiveSheet
					open={receiveOpen}
					onClose={() => setReceiveOpen(false)}
					address={receiveAddress}
					accounts={accountsWithBalances}
					selectedAccountId={selectedReceiveAccount?.id}
					onAccountChange={(id) => {
						const acct = accountsWithBalances.find((a) => a.id === id);
						if (acct) setSelectedReceiveAccount(acct);
					}}
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
					onTransferBalance={(acct) => {
						setSelectedSendAccount(acct);
						setSendOpen(true);
					}}
				/>
			</SidebarLayout>
		</SessionGuard>
	);
}
