"use client";

import Link from "next/link";
import { SendIcon, TransactionsIcon, TransferIcon } from "@/components/icons";
import type { GroupedTransaction } from "@/lib/tempo/types";
import { cn, formatBalance, formatDate, truncateAddress } from "@/lib/utils";

export const rowClass =
	"grid grid-cols-[100px_1fr_120px_100px] gap-x-8 items-center border-b border-white/[0.06] py-4 transition-colors hover:bg-white/[0.02]";

export function TransactionRow({ tx }: { tx: GroupedTransaction }) {
	const linkId = tx.txHashes[0];

	if (tx.kind === "payment") {
		const isSent = tx.direction === "sent";
		return (
			<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
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
			<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
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
			<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
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
		<Link href={`/transactions/${encodeURIComponent(linkId)}`} className={rowClass}>
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
