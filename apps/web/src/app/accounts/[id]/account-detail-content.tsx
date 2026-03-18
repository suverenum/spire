"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { DashboardRecentTransactions } from "@/app/dashboard/dashboard-recent-transactions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { AccountSelector } from "@/domain/accounts/components/account-selector";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { useAllTransactions } from "@/domain/accounts/hooks/use-all-transactions";
import { useInternalTransfer } from "@/domain/accounts/hooks/use-internal-transfer";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord } from "@/lib/tempo/types";
import { formatBalance } from "@/lib/utils";

interface AccountDetailContentProps {
	accountId: string;
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

export function AccountDetailContent({
	accountId,
	treasuryName,
	authenticatedAt,
	treasuryId,
}: AccountDetailContentProps) {
	const [transferOpen, setTransferOpen] = useState(false);
	const [transferToId, setTransferToId] = useState("");
	const [transferAmount, setTransferAmount] = useState("");
	const [transferError, setTransferError] = useState("");

	const { data: rawAccounts = [] } = useQuery({
		queryKey: CACHE_KEYS.accounts(treasuryId),
		queryFn: () => getAccounts(),
	});

	const accounts: AccountRecord[] = rawAccounts.map((a) => ({
		...a,
		createdAt: new Date(a.createdAt),
	}));

	const { accounts: accountsWithBalances } = useAllBalances(accounts);
	const { transactions } = useAllTransactions(accounts);

	const account = accountsWithBalances.find((a) => a.id === accountId);

	// Filter transactions to only those involving this account
	const scopedTransactions = transactions.filter((tx) =>
		tx.visibleAccountIds.includes(accountId),
	);

	// Same-token accounts for transfer eligibility
	const sameTokenAccounts = account
		? accountsWithBalances.filter(
				(a) => a.id !== accountId && a.tokenSymbol === account.tokenSymbol,
			)
		: [];

	const transferMutation = useInternalTransfer();

	async function handleCopy() {
		if (!account) return;
		try {
			await navigator.clipboard.writeText(account.walletAddress);
			toast("Address copied!", "success");
		} catch {
			toast("Failed to copy", "error");
		}
	}

	function handleTransfer() {
		setTransferError("");
		if (!account || !transferToId || !transferAmount) {
			setTransferError("Fill in all fields");
			return;
		}

		transferMutation.mutate(
			{
				fromAccountId: accountId,
				toAccountId: transferToId,
				amount: transferAmount,
				treasuryId,
			},
			{
				onSuccess: () => {
					setTransferOpen(false);
					setTransferToId("");
					setTransferAmount("");
				},
				onError: (err) => {
					setTransferError(err.message);
				},
			},
		);
	}

	if (!account) {
		return (
			<SessionGuard authenticatedAt={authenticatedAt}>
				<SidebarLayout treasuryName={treasuryName}>
					<p className="text-gray-500">Account not found</p>
				</SidebarLayout>
			</SessionGuard>
		);
	}

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<div className="mb-6">
					<h1 className="text-2xl font-semibold">{account.name}</h1>
					<p className="text-sm text-gray-500">{account.tokenSymbol}</p>
				</div>

				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Card>
						<p className="text-sm text-gray-500">Balance</p>
						<p className="text-2xl font-semibold">{account.balanceFormatted}</p>
					</Card>
					<Card>
						<p className="mb-1 text-sm text-gray-500">Wallet Address</p>
						<div className="flex items-center gap-2">
							<code className="min-w-0 flex-1 truncate text-xs">
								{account.walletAddress}
							</code>
							<button
								type="button"
								onClick={handleCopy}
								className="shrink-0 text-gray-400 hover:text-gray-600"
							>
								<Copy className="h-4 w-4" />
							</button>
						</div>
					</Card>
				</div>

				<div className="mb-6 flex justify-center">
					<div className="rounded-xl border border-gray-200 bg-white p-4">
						<QRCodeSVG value={account.walletAddress} size={160} level="M" />
					</div>
				</div>

				{sameTokenAccounts.length > 0 && (
					<div className="mb-6">
						<Button onClick={() => setTransferOpen(true)} variant="outline">
							<ArrowLeftRight className="h-4 w-4" />
							Transfer
						</Button>
					</div>
				)}

				<DashboardRecentTransactions
					transactions={scopedTransactions}
					accounts={accounts}
				/>

				<Sheet
					open={transferOpen}
					onClose={() => setTransferOpen(false)}
					title="Internal Transfer"
				>
					<div className="space-y-4">
						<div>
							<p className="text-sm text-gray-500">
								From: {account.name} ($
								{formatBalance(account.balance, 6)})
							</p>
						</div>
						<AccountSelector
							accounts={accountsWithBalances}
							selectedAccountId={transferToId}
							onSelect={setTransferToId}
							label="To"
							filterToken={account.tokenSymbol}
							excludeAccountId={accountId}
						/>
						<div>
							<label
								htmlFor="transfer-amount"
								className="mb-1 block text-sm font-medium"
							>
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
						{transferError && (
							<p className="text-sm text-red-600">{transferError}</p>
						)}
						<Button
							onClick={handleTransfer}
							disabled={transferMutation.isPending}
							className="w-full"
							size="lg"
						>
							{transferMutation.isPending ? "Transferring..." : "Transfer"}
						</Button>
					</div>
				</Sheet>
			</SidebarLayout>
		</SessionGuard>
	);
}
