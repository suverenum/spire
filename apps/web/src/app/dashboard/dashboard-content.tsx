"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon, SendIcon, TransferIcon } from "@/components/icons";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { AccountGrid } from "@/domain/accounts/components/account-grid";
import { AccountSelector } from "@/domain/accounts/components/account-selector";
import { CreateAccountForm } from "@/domain/accounts/components/create-account-form";
import { DeleteDialog } from "@/domain/accounts/components/delete-dialog";
import { RenameDialog } from "@/domain/accounts/components/rename-dialog";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { useAllTransactions } from "@/domain/accounts/hooks/use-all-transactions";
import { useInternalTransfer } from "@/domain/accounts/hooks/use-internal-transfer";
import { useMultiAccountWs } from "@/domain/accounts/hooks/use-multi-account-ws";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { ReceiveSheet } from "@/domain/payments/components/receive-sheet";
import { SendPaymentForm } from "@/domain/payments/components/send-payment-form";
import { WebSocketBanner } from "@/domain/payments/components/websocket-banner";
import { useRetryDefaultAccountSetup } from "@/domain/treasury/hooks/use-setup-default-accounts";
import { ACCOUNT_TOKENS, CACHE_KEYS } from "@/lib/constants";
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
	const dashboardRouter = useRouter();
	const [sendOpen, setSendOpen] = useState(false);
	const [receiveOpen, setReceiveOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [renameAccount, setRenameAccount] = useState<AccountWithBalance | null>(null);
	const [deleteAccount, setDeleteAccount] = useState<AccountWithBalance | null>(null);
	const [transferOpen, setTransferOpen] = useState(false);
	const [transferFromId, setTransferFromId] = useState("");
	const [transferToId, setTransferToId] = useState("");
	const [transferAmount, setTransferAmount] = useState("");
	const [transferError, setTransferError] = useState("");
	const [, setSelectedSendAccount] = useState<AccountWithBalance | null>(null);
	const [selectedReceiveAccount, setSelectedReceiveAccount] = useState<AccountWithBalance | null>(
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

	const { accounts: accountsWithBalances, totalBalance } = useAllBalances(accounts);

	const { transactions } = useAllTransactions(accounts);
	const { isConnected } = useMultiAccountWs(accounts);
	const retryDefaults = useRetryDefaultAccountSetup();

	const defaultAccountCount = accounts.filter((a) => a.isDefault).length;
	const hasAllDefaults = defaultAccountCount >= 1;

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

	const defaultAccount = accountsWithBalances.find((a) => a.isDefault) ?? null;

	function handleReceiveOpen() {
		setSelectedReceiveAccount(defaultAccount);
		setReceiveOpen(true);
	}

	const transferMutation = useInternalTransfer();

	function handleTransfer() {
		setTransferError("");
		if (!transferFromId || !transferToId || !transferAmount) {
			setTransferError("Fill in all fields");
			return;
		}
		transferMutation.mutate(
			{
				fromAccountId: transferFromId,
				toAccountId: transferToId,
				amount: transferAmount,
				treasuryId,
			},
			{
				onSuccess: () => {
					setTransferOpen(false);
					setTransferFromId("");
					setTransferToId("");
					setTransferAmount("");
				},
				onError: (err) => {
					setTransferError(err.message);
				},
			},
		);
	}

	const transferFromAccount = accountsWithBalances.find((a) => a.id === transferFromId);

	const receiveAddress = (selectedReceiveAccount?.walletAddress as `0x${string}`) ?? tempoAddress;

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<WebSocketBanner isConnected={isConnected} />

				{!hasAllDefaults && (
					<Card className="mb-4 border-amber-500/20 bg-amber-500/10">
						<p className="text-sm text-amber-400">Some default accounts failed to set up.</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2"
							disabled={retryDefaults.isPending}
							onClick={() =>
								retryDefaults.mutate({
									treasuryId,
									tempoAddress,
									existingAccounts: accounts.map((a) => ({
										tokenSymbol: a.tokenSymbol,
										isDefault: a.isDefault,
									})),
								})
							}
						>
							{retryDefaults.isPending ? "Retrying..." : "Retry Setup"}
						</Button>
					</Card>
				)}

				<Card className="mb-6">
					<p className="text-muted-foreground text-sm">Total Balance</p>
					<p className="text-3xl font-semibold">
						{formatBalance(totalBalance, 6)} {ACCOUNT_TOKENS[0].name}
					</p>
				</Card>

				<div className="mb-6 flex gap-3">
					<Button onClick={handleReceiveOpen} className="flex-1" size="lg">
						<PlusIcon className="h-5 w-5" />
						Deposit
					</Button>
					<Button onClick={handleSendOpen} variant="outline" className="flex-1" size="lg">
						<SendIcon className="h-5 w-5" />
						Withdraw
					</Button>
					{accountsWithBalances.length > 1 && (
						<Button
							onClick={() => setTransferOpen(true)}
							variant="outline"
							className="flex-1"
							size="lg"
						>
							<TransferIcon className="h-5 w-5" />
							Move
						</Button>
					)}
				</div>

				<div className="mb-6">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-lg font-semibold">Agent wallets</h2>
						<Link href="/accounts" className="text-muted-foreground hover:text-foreground text-sm">
							View all &rarr;
						</Link>
					</div>
					<AccountGrid
						accounts={accountsWithBalances}
						maxItems={4}
						showViewAll
						onRename={setRenameAccount}
						onDelete={setDeleteAccount}
					/>
				</div>

				<DashboardRecentTransactions transactions={transactions} />

				<SendPaymentForm
					open={sendOpen}
					onClose={() => setSendOpen(false)}
					fromAddress={(defaultAccount?.walletAddress as `0x${string}`) ?? tempoAddress}
					accounts={defaultAccount ? [defaultAccount] : []}
					selectedAccountId={defaultAccount?.id}
					onAccountChange={(id) => {
						const acct = accountsWithBalances.find((a) => a.id === id);
						if (acct) setSelectedSendAccount(acct);
					}}
				/>
				<ReceiveSheet
					open={receiveOpen}
					onClose={() => setReceiveOpen(false)}
					address={receiveAddress}
					accounts={defaultAccount ? [defaultAccount] : []}
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
						const sameTokenAccounts = accountsWithBalances.filter(
							(a) => a.tokenSymbol === acct.tokenSymbol && a.id !== acct.id,
						);
						if (sameTokenAccounts.length > 0) {
							dashboardRouter.push(`/accounts/${acct.id}`);
						} else {
							setSelectedSendAccount(acct);
							setSendOpen(true);
						}
					}}
				/>
				<Sheet
					open={transferOpen}
					onClose={() => {
						setTransferOpen(false);
						setTransferFromId("");
						setTransferToId("");
						setTransferAmount("");
						setTransferError("");
					}}
					title="Move Funds"
				>
					<div className="space-y-4">
						<AccountSelector
							accounts={accountsWithBalances}
							selectedAccountId={transferFromId}
							onSelect={(id) => {
								setTransferFromId(id);
								if (id === transferToId) setTransferToId("");
							}}
							label="From"
						/>
						{transferFromAccount && (
							<p className="text-muted-foreground text-xs">
								Available: {formatBalance(transferFromAccount.balance, 6)}{" "}
								{transferFromAccount.tokenSymbol}
							</p>
						)}
						<AccountSelector
							accounts={accountsWithBalances}
							selectedAccountId={transferToId}
							onSelect={setTransferToId}
							label="To"
							excludeAccountId={transferFromId}
						/>
						<div>
							<label htmlFor="transfer-amount" className="mb-1 block text-sm font-medium">
								Amount
							</label>
							<Input
								id="transfer-amount"
								type="text"
								inputMode="decimal"
								placeholder="0.00"
								value={transferAmount}
								onChange={(e) => setTransferAmount(e.target.value)}
							/>
						</div>
						{transferError && <p className="text-sm text-red-600">{transferError}</p>}
						<Button
							onClick={handleTransfer}
							disabled={transferMutation.isPending}
							className="w-full"
							size="lg"
						>
							{transferMutation.isPending ? "Moving..." : "Move"}
						</Button>
					</div>
				</Sheet>
			</SidebarLayout>
		</SessionGuard>
	);
}
