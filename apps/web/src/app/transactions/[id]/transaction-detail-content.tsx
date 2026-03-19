"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useAllTransactions } from "@/domain/accounts/hooks/use-all-transactions";
import { getAccounts } from "@/domain/accounts/queries/get-accounts";
import { SessionGuard } from "@/domain/auth/components/session-guard";
import { BridgeStatusBadge } from "@/domain/bridge/components/bridge-status-badge";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountRecord, GroupedTransaction } from "@/lib/tempo/types";
import { formatBalance, formatDate, truncateAddress } from "@/lib/utils";

interface TransactionDetailContentProps {
	transactionId: string;
	treasuryName: string;
	authenticatedAt: number;
	treasuryId: string;
}

function CopyableField({ label, value }: { label: string; value: string }) {
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(value);
			toast("Copied!", "success");
		} catch {
			toast("Failed to copy", "error");
		}
	}

	return (
		<div className="flex items-center justify-between py-2">
			<p className="text-sm text-gray-500">{label}</p>
			<div className="flex items-center gap-1">
				<code className="text-sm">{truncateAddress(value)}</code>
				<button type="button" onClick={handleCopy} className="text-gray-400 hover:text-gray-600">
					<Copy className="h-3 w-3" />
				</button>
			</div>
		</div>
	);
}

function PaymentDetail({ tx }: { tx: GroupedTransaction & { kind: "payment" } }) {
	const isSent = tx.direction === "sent";
	return (
		<Card>
			<div className="divide-y divide-gray-100">
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Type</p>
					<p className="text-sm font-medium">{isSent ? "Sent" : "Received"}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Account</p>
					<p className="text-sm">{tx.accountName}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Amount</p>
					<p className="text-sm font-medium">
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
				</div>
				<CopyableField label={isSent ? "To" : "From"} value={isSent ? tx.to : tx.from} />
				{tx.memo && (
					<div className="flex items-center justify-between py-2">
						<p className="text-sm text-gray-500">Memo</p>
						<p className="text-sm">{tx.memo}</p>
					</div>
				)}
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Status</p>
					<p className="text-sm">{tx.status}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Date</p>
					<p className="text-sm">{formatDate(tx.timestamp)}</p>
				</div>
				<CopyableField label="Tx Hash" value={tx.txHashes[0]} />
			</div>
		</Card>
	);
}

function InternalTransferDetail({ tx }: { tx: GroupedTransaction & { kind: "internalTransfer" } }) {
	return (
		<Card>
			<div className="divide-y divide-gray-100">
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Type</p>
					<p className="text-sm font-medium">Internal Transfer</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">From Account</p>
					<p className="text-sm">{tx.fromAccountName}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">To Account</p>
					<p className="text-sm">{tx.toAccountName}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Amount</p>
					<p className="text-sm font-medium">
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Date</p>
					<p className="text-sm">{formatDate(tx.timestamp)}</p>
				</div>
				<CopyableField label="Tx Hash" value={tx.txHashes[0]} />
			</div>
		</Card>
	);
}

function SwapDetail({ tx }: { tx: GroupedTransaction & { kind: "swap" } }) {
	return (
		<Card>
			<div className="divide-y divide-gray-100">
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Type</p>
					<p className="text-sm font-medium">Swap</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">From Account</p>
					<p className="text-sm">
						{tx.fromAccountName} ({tx.tokenIn})
					</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">To Account</p>
					<p className="text-sm">
						{tx.toAccountName} ({tx.tokenOut})
					</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Amount In</p>
					<p className="text-sm font-medium">
						{formatBalance(tx.amountIn, 6)} {tx.tokenIn}
					</p>
				</div>
				{tx.amountOut !== undefined && (
					<div className="flex items-center justify-between py-2">
						<p className="text-sm text-gray-500">Amount Out</p>
						<p className="text-sm font-medium">
							{formatBalance(tx.amountOut, 6)} {tx.tokenOut}
						</p>
					</div>
				)}
				{tx.recoveryRequired && (
					<div className="flex items-center justify-between py-2">
						<p className="text-sm text-yellow-600">
							Recovery Required - Output remains in source wallet
						</p>
					</div>
				)}
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Date</p>
					<p className="text-sm">{formatDate(tx.timestamp)}</p>
				</div>
				<div className="py-2">
					<p className="mb-1 text-sm text-gray-500">Transaction Hashes</p>
					{tx.txHashes.map((hash, i) => (
						<CopyableField key={hash} label={i === 0 ? "Swap" : "Transfer"} value={hash} />
					))}
				</div>
			</div>
		</Card>
	);
}

function BridgeDepositDetail({ tx }: { tx: GroupedTransaction & { kind: "bridgeDeposit" } }) {
	const chainLabel = tx.sourceChain === "ethereum" ? "Ethereum" : "Solana";
	return (
		<Card>
			<div className="divide-y divide-gray-100">
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Type</p>
					<p className="text-sm font-medium">Bridge Deposit</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Source Chain</p>
					<p className="text-sm">{chainLabel}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Account</p>
					<p className="text-sm">{tx.accountName}</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Amount</p>
					<p className="text-sm font-medium">
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Bridge Status</p>
					<BridgeStatusBadge status={tx.bridgeStatus} />
				</div>
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Date</p>
					<p className="text-sm">{formatDate(tx.timestamp)}</p>
				</div>
				<CopyableField label={`${chainLabel} Tx Hash`} value={tx.sourceTxHash} />
				{tx.txHashes.length > 0 && <CopyableField label="Tempo Tx Hash" value={tx.txHashes[0]} />}
				<div className="flex items-center justify-between py-2">
					<p className="text-sm text-gray-500">Bridge</p>
					<p className="text-sm">Stargate (LayerZero)</p>
				</div>
			</div>
		</Card>
	);
}

export function TransactionDetailContent({
	transactionId,
	treasuryName,
	authenticatedAt,
	treasuryId,
}: TransactionDetailContentProps) {
	const { data: rawAccounts = [] } = useQuery({
		queryKey: CACHE_KEYS.accounts(treasuryId),
		queryFn: () => getAccounts(),
	});

	const accounts: AccountRecord[] = rawAccounts.map((a) => ({
		...a,
		createdAt: new Date(a.createdAt),
	}));

	const { transactions, isLoading } = useAllTransactions(accounts);

	// Find the grouped transaction by matching any tx hash or exact group ID
	const tx = transactions.find(
		(t) => t.txHashes.some((h) => h === transactionId) || t.groupId === transactionId,
	);

	return (
		<SessionGuard authenticatedAt={authenticatedAt}>
			<SidebarLayout treasuryName={treasuryName}>
				<h1 className="mb-4 text-2xl font-semibold">Transaction Detail</h1>
				{isLoading && !tx ? (
					<p className="text-gray-500">Loading transaction...</p>
				) : tx ? (
					<>
						{tx.kind === "payment" && <PaymentDetail tx={tx} />}
						{tx.kind === "internalTransfer" && <InternalTransferDetail tx={tx} />}
						{tx.kind === "swap" && <SwapDetail tx={tx} />}
						{tx.kind === "bridgeDeposit" && <BridgeDepositDetail tx={tx} />}
					</>
				) : (
					<p className="text-gray-500">Transaction not found.</p>
				)}
			</SidebarLayout>
		</SessionGuard>
	);
}
