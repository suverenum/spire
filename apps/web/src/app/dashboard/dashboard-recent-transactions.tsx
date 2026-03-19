"use client";

import Link from "next/link";
import { SendIcon, TransactionsIcon, TransferIcon } from "@/components/icons";
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
				className="grid grid-cols-[100px_1fr_120px_100px] items-center gap-x-8 border-b border-white/[0.06] py-4 transition-colors hover:bg-white/[0.02]"
			>
				<span className="text-muted-foreground text-sm">
					{tx.status === "pending" ? "Pending" : formatDate(tx.timestamp)}
				</span>
				<span className="flex items-center gap-3">
					<span
						className={cn(
							"flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
							isSent ? "bg-red-500/10" : "bg-green-500/10",
						)}
					>
						<SendIcon
							className={cn("h-4 w-4", isSent ? "rotate-180 text-red-400" : "text-green-400")}
						/>
					</span>
					<span className="text-foreground truncate text-sm font-medium">
						{isSent ? `To ${truncateAddress(tx.to)}` : `From ${truncateAddress(tx.from)}`}
					</span>
				</span>
				<span
					className={cn(
						"text-right text-sm font-medium",
						isSent ? "text-foreground" : "text-green-400",
					)}
				>
					{isSent ? "-" : ""}
					{formatBalance(tx.amount, 6)}
				</span>
				<span className="text-muted-foreground text-right text-sm">{tx.accountName}</span>
			</Link>
		);
	}

	if (tx.kind === "internalTransfer") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="grid grid-cols-[100px_1fr_120px_100px] items-center gap-x-8 border-b border-white/[0.06] py-4 transition-colors hover:bg-white/[0.02]"
			>
				<span className="text-muted-foreground text-sm">{formatDate(tx.timestamp)}</span>
				<span className="flex items-center gap-3">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
						<TransferIcon className="h-4 w-4 text-blue-400" />
					</span>
					<span className="text-foreground truncate text-sm font-medium">
						{tx.fromAccountName} &rarr; {tx.toAccountName}
					</span>
				</span>
				<span className="text-foreground text-right text-sm font-medium">
					{formatBalance(tx.amount, 6)}
				</span>
				<span className="text-muted-foreground text-right text-sm">{tx.fromAccountName}</span>
			</Link>
		);
	}

	if (tx.kind === "fee") {
		return (
			<Link
				href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
				className="grid grid-cols-[100px_1fr_120px_100px] items-center gap-x-8 border-b border-white/[0.06] py-4 transition-colors hover:bg-white/[0.02]"
			>
				<span className="text-muted-foreground text-sm">{formatDate(tx.timestamp)}</span>
				<span className="flex items-center gap-3">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
						<TransactionsIcon className="text-muted-foreground h-4 w-4" />
					</span>
					<span className="text-muted-foreground truncate text-sm font-medium">Network Fee</span>
				</span>
				<span className="text-muted-foreground text-right text-sm font-medium">
					-{formatBalance(tx.amount, 6)}
				</span>
				<span className="text-muted-foreground text-right text-sm">{tx.accountName}</span>
			</Link>
		);
	}

	// Swap
	return (
		<Link
			href={`/transactions/${encodeURIComponent(getLinkId(tx))}`}
			className="grid grid-cols-[100px_1fr_120px_100px] items-center gap-x-8 border-b border-white/[0.06] py-4 transition-colors hover:bg-white/[0.02]"
		>
			<span className="text-muted-foreground text-sm">{formatDate(tx.timestamp)}</span>
			<span className="flex items-center gap-3">
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
					<TransferIcon className="h-4 w-4 text-purple-400" />
				</span>
				<span className="text-foreground truncate text-sm font-medium">
					{tx.tokenIn} &rarr; {tx.tokenOut}
				</span>
			</span>
			<span className="text-foreground text-right text-sm font-medium">
				{formatBalance(tx.amountIn, 6)}
			</span>
			<span className="text-muted-foreground text-right text-sm">{tx.fromAccountName}</span>
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
				<p className="text-muted-foreground mt-1 text-sm">
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
					className="text-muted-foreground hover:text-foreground text-sm"
				>
					View all &rarr;
				</Link>
			</div>
			<div>
				<div className="text-muted-foreground grid grid-cols-[100px_1fr_120px_100px] gap-x-8 border-b border-white/[0.06] py-2 text-xs">
					<span>Date</span>
					<span>To/From</span>
					<span className="text-right">Amount</span>
					<span className="text-right">Account</span>
				</div>
				{recent.map((tx) => (
					<GroupedTransactionRow key={tx.groupId} tx={tx} />
				))}
			</div>
		</div>
	);
}
