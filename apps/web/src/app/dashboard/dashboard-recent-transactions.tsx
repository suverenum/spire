"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Globe, Receipt } from "lucide-react";
import Link from "next/link";
import { BridgeStatusBadge } from "@/domain/bridge/components/bridge-status-badge";
import type { GroupedTransaction } from "@/lib/tempo/types";
import { cn, formatBalance, formatDate, truncateAddress } from "@/lib/utils";

interface DashboardRecentTransactionsProps {
	transactions: GroupedTransaction[];
	accountId?: string;
}

function getLinkId(tx: GroupedTransaction): string {
	if (tx.kind === "bridgeDeposit") return tx.groupId;
	return tx.txHashes[0];
}

function GroupedTransactionRow({ tx }: { tx: GroupedTransaction }) {
	if (tx.kind === "payment") {
		const isSent = tx.direction === "sent";
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-full",
						isSent ? "bg-red-100" : "bg-green-100",
					)}
				>
					{isSent ? (
						<ArrowUpRight className="h-5 w-5 text-red-600" />
					) : (
						<ArrowDownLeft className="h-5 w-5 text-green-600" />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">
						{isSent ? "Sent" : "Received"} {tx.token}
					</p>
					<p className="truncate text-xs text-gray-500">
						{tx.accountName} &middot; {isSent ? "To" : "From"}:{" "}
						{truncateAddress(isSent ? tx.to : tx.from)}
					</p>
				</div>
				<div className="text-right">
					<p className={cn("text-sm font-medium", isSent ? "text-red-600" : "text-green-600")}>
						{isSent ? "-" : "+"}
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-gray-400">
						{tx.status === "pending" ? "Pending" : formatDate(tx.timestamp)}
					</p>
				</div>
			</Link>
		);
	}

	if (tx.kind === "internalTransfer") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
					<ArrowLeftRight className="h-5 w-5 text-blue-600" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Internal Transfer</p>
					<p className="truncate text-xs text-gray-500">
						{tx.fromAccountName} &rarr; {tx.toAccountName}
					</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-gray-900">
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
				</div>
			</Link>
		);
	}

	if (tx.kind === "fee") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
					<Receipt className="h-5 w-5 text-gray-500" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Network Fee</p>
					<p className="truncate text-xs text-gray-500">{tx.accountName}</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-gray-500">
						-{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
				</div>
			</Link>
		);
	}

	if (tx.kind === "bridgeDeposit") {
		const chainLabel = tx.sourceChain === "ethereum" ? "Ethereum" : "Solana";
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
					<Globe className="h-5 w-5 text-emerald-600" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Bridge Deposit</p>
					<p className="truncate text-xs text-gray-500">
						{tx.accountName} &middot; From {chainLabel} via Stargate
					</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-green-600">
						+{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<BridgeStatusBadge status={tx.bridgeStatus} />
				</div>
			</Link>
		);
	}

	// Swap
	return (
		<Link
			href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
			className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
		>
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
				<ArrowLeftRight className="h-5 w-5 text-purple-600" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">Swap</p>
				<p className="truncate text-xs text-gray-500">
					{tx.fromAccountName} ({tx.tokenIn}) &rarr; {tx.toAccountName} ({tx.tokenOut})
				</p>
			</div>
			<div className="text-right">
				<p className="text-sm font-medium text-gray-900">
					{formatBalance(tx.amountIn, 6)} {tx.tokenIn}
				</p>
				<p className="text-xs text-gray-400">{formatDate(tx.timestamp)}</p>
			</div>
		</Link>
	);
}

export function DashboardRecentTransactions({
	transactions,
	accountId,
}: DashboardRecentTransactionsProps) {
	const recent = transactions.slice(0, 5);

	if (recent.length === 0) {
		return (
			<div className="py-12 text-center">
				<p className="text-gray-500">No transactions yet</p>
				<p className="mt-1 text-sm text-gray-400">Send or receive a payment to get started.</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-lg font-semibold">Recent Transactions</h2>
				<Link
					href={accountId ? `/transactions?account=${accountId}` : "/transactions"}
					className="text-sm text-gray-500 hover:text-gray-700"
				>
					View all &rarr;
				</Link>
			</div>
			<div className="space-y-2">
				{recent.map((tx) => (
					<GroupedTransactionRow key={tx.groupId} tx={tx} />
				))}
			</div>
		</div>
	);
}
