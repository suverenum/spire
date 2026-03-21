"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { DashboardRecentTransactions } from "@/app/dashboard/dashboard-recent-transactions";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useAllBalances } from "@/domain/accounts/hooks/use-all-balances";
import { useAllTransactions } from "@/domain/accounts/hooks/use-all-transactions";
import { useInternalTransfer } from "@/domain/accounts/hooks/use-internal-transfer";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { MultisigAbi } from "@/domain/agents/abis";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import {
	addMultisigConfirmation,
	upsertMultisigTransaction,
} from "@/domain/multisig/actions/sync-multisig-state";
import { getMultisigConfig } from "@/domain/multisig/queries/get-multisig-config";
import { getPendingTransactions } from "@/domain/multisig/queries/get-pending-transactions";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord } from "@/lib/tempo/types";
import { FEE_TOKEN } from "@/lib/wagmi";
import { MultisigInfoSection } from "./multisig-info-section";
import { TransferSheet } from "./transfer-sheet";

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
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
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
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
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
					<p className="text-muted-foreground">Account not found</p>
				</SidebarLayout>
			</SessionGuard>
		);
	}

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<div className="mb-6">
					<h1 className="text-2xl font-semibold">{account.name}</h1>
					<p className="text-muted-foreground text-sm">{account.tokenSymbol}</p>
				</div>

				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Card>
						<p className="text-muted-foreground text-sm">Balance</p>
						<p className="text-2xl font-semibold">{account.balanceFormatted}</p>
					</Card>
					<Card>
						<p className="text-muted-foreground mb-1 text-sm">Wallet Address</p>
						<div className="flex items-center gap-2">
							<code className="min-w-0 flex-1 truncate text-xs">{account.walletAddress}</code>
							<button
								type="button"
								onClick={handleCopy}
								className="text-muted-foreground hover:text-muted-foreground shrink-0"
							>
								<Copy className="h-4 w-4" />
							</button>
						</div>
					</Card>
				</div>

				<div className="mb-6 flex justify-center">
					<div className="border-border bg-muted rounded-xl border p-4">
						<QRCodeSVG value={account.walletAddress} size={160} level="M" />
					</div>
				</div>

				{isMultisig && multisigConfig && (
					<MultisigInfoSection
						multisigConfig={multisigConfig}
						pendingTxs={pendingTxs}
						walletAddress={account.walletAddress}
						tempoAddress={tempoAddress}
						onConfirm={handleConfirm}
						onExecute={handleExecute}
					/>
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

				<TransferSheet
					open={transferOpen}
					onClose={() => setTransferOpen(false)}
					accountName={account.name}
					accountBalance={account.balance}
					accountTokenSymbol={account.tokenSymbol}
					accountId={accountId}
					accounts={accountsWithBalances}
					transferToId={transferToId}
					onTransferToSelect={setTransferToId}
					transferAmount={transferAmount}
					onTransferAmountChange={setTransferAmount}
					transferError={transferError}
					onTransfer={handleTransfer}
					isPending={transferMutation.isPending}
				/>
			</SidebarLayout>
		</SessionGuard>
	);
}
