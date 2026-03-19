"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TransactionsIcon } from "@/components/icons";
import type { GroupedTransaction } from "@/lib/tempo/types";
import { cn, formatBalance, formatDate, truncateAddress } from "@/lib/utils";

interface DashboardRecentTransactionsProps {
	transactions: GroupedTransaction[];
	accountId?: string;
}

function getLinkId(tx: GroupedTransaction): string {
	return tx.txHashes[0];
}

function GroupedTransactionRow({ tx }: { tx: GroupedTransaction }) {
	if (tx.kind === "payment") {
		const isSent = tx.direction === "sent";
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-background"
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
					<p className="truncate text-xs text-muted-foreground">
						{tx.accountName} &middot; {isSent ? "To" : "From"}:{" "}
						{truncateAddress(isSent ? tx.to : tx.from)}
					</p>
				</div>
				<div className="text-right">
					<p className={cn("text-sm font-medium", isSent ? "text-red-600" : "text-green-600")}>
						{isSent ? "-" : "+"}
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-muted-foreground">
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
				className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-background"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
					<ArrowLeftRight className="h-5 w-5 text-blue-600" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Internal Transfer</p>
					<p className="truncate text-xs text-muted-foreground">
						{tx.fromAccountName} &rarr; {tx.toAccountName}
					</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-foreground">
						{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-muted-foreground">{formatDate(tx.timestamp)}</p>
				</div>
			</Link>
		);
	}

	if (tx.kind === "fee") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-background"
			>
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
					<TransactionsIcon className="h-5 w-5 text-muted-foreground" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium">Network Fee</p>
					<p className="truncate text-xs text-muted-foreground">{tx.accountName}</p>
				</div>
				<div className="text-right">
					<p className="text-sm font-medium text-muted-foreground">
						-{formatBalance(tx.amount, 6)} {tx.token}
					</p>
					<p className="text-xs text-muted-foreground">{formatDate(tx.timestamp)}</p>
				</div>
			</Link>
		);
	}

	// Swap
	return (
		<Link
			href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
			className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-background"
		>
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
				<ArrowLeftRight className="h-5 w-5 text-purple-600" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">Swap</p>
				<p className="truncate text-xs text-muted-foreground">
					{tx.fromAccountName} ({tx.tokenIn}) &rarr; {tx.toAccountName} ({tx.tokenOut})
				</p>
			</div>
			<div className="text-right">
				<p className="text-sm font-medium text-foreground">
					{formatBalance(tx.amountIn, 6)} {tx.tokenIn}
				</p>
				<p className="text-xs text-muted-foreground">{formatDate(tx.timestamp)}</p>
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
				<p className="text-muted-foreground">No transactions yet</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Send or receive a payment to get started.
				</p>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-lg font-semibold">Recent Transactions</h2>
				<Link
					href={accountId ? `/transactions?account=${accountId}` : "/transactions"}
					className="text-sm text-muted-foreground hover:text-foreground"
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
