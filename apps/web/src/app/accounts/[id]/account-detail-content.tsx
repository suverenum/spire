"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Bot, Copy, Shield, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
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
import {
	addMultisigConfirmation,
	upsertMultisigTransaction,
} from "@/domain/multisig/actions/sync-multisig-state";
import { PendingTransactions } from "@/domain/multisig/components/pending-transactions";
import { getMultisigConfig } from "@/domain/multisig/queries/get-multisig-config";
import { getPendingTransactions } from "@/domain/multisig/queries/get-pending-transactions";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord } from "@/lib/tempo/types";
import { formatBalance, truncateAddress } from "@/lib/utils";

const MultisigAbi = [
	{
		type: "function",
		name: "confirmTransaction",
		inputs: [{ name: "txId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "executeTransaction",
		inputs: [{ name: "txId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
] as const;

interface AccountDetailContentProps {
	accountId: string;
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
	tempoAddress: string;
}

export function AccountDetailContent({
	accountId,
	treasuryName,
	authenticatedAt,
	treasuryId,
	tempoAddress,
}: AccountDetailContentProps) {
	const wagmiConfig = useConfig();
	const queryClient = useQueryClient();
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
	const isMultisig = account?.walletType === "multisig";

	const { data: multisigConfig } = useQuery({
		queryKey: CACHE_KEYS.multisigConfig(accountId),
		queryFn: () => getMultisigConfig(accountId),
		enabled: isMultisig,
	});

	const { data: pendingTxs = [] } = useQuery({
		queryKey: CACHE_KEYS.pendingTransactions(accountId),
		queryFn: () => getPendingTransactions(accountId),
		enabled: isMultisig,
	});

	async function handleConfirm(onChainTxId: string) {
		if (!account) return;
		try {
			const publicClient = getPublicClient(wagmiConfig);
			const walletClient = await getWalletClient(wagmiConfig);
			if (!publicClient || !walletClient) {
				toast("Wallet not connected", "error");
				return;
			}
			const hash = await walletClient.writeContract({
				account: walletClient.account!,
				chain: walletClient.chain,
				address: account.walletAddress as `0x${string}`,
				abi: MultisigAbi,
				functionName: "confirmTransaction",
				args: [BigInt(onChainTxId)],
			});
			await publicClient.waitForTransactionReceipt({ hash });
			// Sync confirmation to DB
			const pendingTx = pendingTxs.find((tx) => tx.onChainTxId === onChainTxId);
			if (pendingTx && walletClient.account) {
				await addMultisigConfirmation({
					multisigTransactionId: pendingTx.id,
					signerAddress: walletClient.account.address,
				});
				await upsertMultisigTransaction({
					accountId,
					onChainTxId: BigInt(onChainTxId),
					to: pendingTx.to,
					value: pendingTx.value,
					data: pendingTx.data,
					requiredConfirmations: pendingTx.requiredConfirmations,
					currentConfirmations: pendingTx.currentConfirmations + 1,
					executed: false,
				});
			}
			toast("Transaction confirmed", "success");
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.pendingTransactions(accountId),
			});
		} catch (err) {
			toast(err instanceof Error ? err.message : "Confirmation failed", "error");
		}
	}

	async function handleExecute(onChainTxId: string) {
		if (!account) return;
		try {
			const publicClient = getPublicClient(wagmiConfig);
			const walletClient = await getWalletClient(wagmiConfig);
			if (!publicClient || !walletClient) {
				toast("Wallet not connected", "error");
				return;
			}
			const hash = await walletClient.writeContract({
				account: walletClient.account!,
				chain: walletClient.chain,
				address: account.walletAddress as `0x${string}`,
				abi: MultisigAbi,
				functionName: "executeTransaction",
				args: [BigInt(onChainTxId)],
			});
			await publicClient.waitForTransactionReceipt({ hash });
			// Mark as executed in DB
			const executedTx = pendingTxs.find((tx) => tx.onChainTxId === onChainTxId);
			if (executedTx) {
				await upsertMultisigTransaction({
					accountId,
					onChainTxId: BigInt(onChainTxId),
					to: executedTx.to,
					value: executedTx.value,
					data: executedTx.data,
					requiredConfirmations: executedTx.requiredConfirmations,
					currentConfirmations: executedTx.currentConfirmations,
					executed: true,
				});
			}
			toast("Transaction executed", "success");
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.pendingTransactions(accountId),
			});
		} catch (err) {
			toast(err instanceof Error ? err.message : "Execution failed", "error");
		}
	}

	// Filter transactions to only those involving this account
	const scopedTransactions = transactions.filter((tx) => {
		return tx.visibleAccountIds.includes(accountId);
	});

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
							<code className="min-w-0 flex-1 truncate text-xs">{account.walletAddress}</code>
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

				{isMultisig && multisigConfig && (
					<div className="mb-6 space-y-4">
						{/* Agent Info */}
						{multisigConfig.agentAddress && (
							<Card>
								<div className="mb-2 flex items-center gap-2">
									<Bot className="h-4 w-4 text-blue-600" />
									<p className="text-sm font-medium">Agent</p>
								</div>
								<div className="space-y-2">
									<div>
										<p className="text-xs text-gray-500">Agent Address</p>
										<p className="font-mono text-xs text-gray-600">{multisigConfig.agentAddress}</p>
									</div>
								</div>
							</Card>
						)}

						{/* Signers */}
						<Card>
							<div className="mb-2 flex items-center gap-2">
								<Users className="h-4 w-4 text-gray-500" />
								<p className="text-sm font-medium">Signers ({multisigConfig.owners.length})</p>
							</div>
							<div className="space-y-1">
								{multisigConfig.owners.map((owner) => (
									<p key={owner} className="font-mono text-xs text-gray-600">
										{truncateAddress(owner)}
										{owner.toLowerCase() === tempoAddress.toLowerCase() && " (you)"}
										{owner.toLowerCase() === multisigConfig.agentAddress?.toLowerCase() &&
											" (agent)"}
									</p>
								))}
							</div>
						</Card>

						{/* Approval Policy */}
						<Card>
							<div className="mb-2 flex items-center gap-2">
								<Shield className="h-4 w-4 text-blue-600" />
								<p className="text-sm font-medium">Approval Policy</p>
							</div>
							<div className="space-y-1 text-sm text-gray-600">
								{multisigConfig.tiersJson.map((tier) => (
									<p key={tier.maxValue}>
										Up to {(Number(tier.maxValue) / 1e6).toLocaleString()} AlphaUSD:{" "}
										{tier.requiredConfirmations}/{multisigConfig.owners.length} approvals
									</p>
								))}
								<p>
									Above all tiers: {multisigConfig.defaultConfirmations}/
									{multisigConfig.owners.length} approvals
								</p>
								{multisigConfig.allowlistEnabled && (
									<p className="text-amber-600">Only allowlisted addresses can receive</p>
								)}
							</div>
						</Card>

						{/* Pending Transactions */}
						<div>
							<h2 className="mb-2 text-lg font-semibold">Pending Approvals</h2>
							<PendingTransactions
								transactions={pendingTxs}
								walletAddress={account.walletAddress}
								currentUserAddress={tempoAddress}
								onConfirm={handleConfirm}
								onExecute={handleExecute}
							/>
						</div>
					</div>
				)}

				{sameTokenAccounts.length > 0 && (
					<div className="mb-6">
						<Button onClick={() => setTransferOpen(true)} variant="outline">
							<ArrowLeftRight className="h-4 w-4" />
							Transfer
						</Button>
					</div>
				)}

				<DashboardRecentTransactions transactions={scopedTransactions} accountId={accountId} />

				<Sheet open={transferOpen} onClose={() => setTransferOpen(false)} title="Internal Transfer">
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
							{transferMutation.isPending ? "Transferring..." : "Transfer"}
						</Button>
					</div>
				</Sheet>
			</SidebarLayout>
		</SessionGuard>
	);
}
