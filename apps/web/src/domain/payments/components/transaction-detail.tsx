"use client";

import { ArrowDownLeft, ArrowUpRight, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { TEMPO_EXPLORER_URL } from "@/lib/constants";
import type { Payment } from "@/lib/tempo/types";
import { cn, formatBalance, formatDate } from "@/lib/utils";

interface TransactionDetailProps {
	transaction: Payment;
	userAddress: string;
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
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0 flex-1">
				<p className="text-sm text-gray-500">{label}</p>
				<p className="truncate font-mono text-sm">{value}</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				onClick={handleCopy}
				className="shrink-0"
			>
				<Copy className="h-4 w-4" />
			</Button>
		</div>
	);
}

export function TransactionDetail({
	transaction: tx,
	userAddress,
}: TransactionDetailProps) {
	const isSent = tx.from.toLowerCase() === userAddress.toLowerCase();

	return (
		<Card className="space-y-4">
			<div className="flex items-center gap-3">
				<div
					className={cn(
						"flex h-12 w-12 items-center justify-center rounded-full",
						isSent ? "bg-red-100" : "bg-green-100",
					)}
				>
					{isSent ? (
						<ArrowUpRight className="h-6 w-6 text-red-600" />
					) : (
						<ArrowDownLeft className="h-6 w-6 text-green-600" />
					)}
				</div>
				<div>
					<p className="text-lg font-semibold">
						{isSent ? "Sent" : "Received"} {tx.token}
					</p>
					<p
						className={cn(
							"text-2xl font-semibold",
							isSent ? "text-red-600" : "text-green-600",
						)}
					>
						{isSent ? "-" : "+"}${formatBalance(tx.amount, 6)}
					</p>
				</div>
			</div>

			<div className="space-y-3 border-t border-gray-200 pt-4">
				<div>
					<p className="text-sm text-gray-500">Status</p>
					<p className="text-sm font-medium capitalize">{tx.status}</p>
				</div>
				<div>
					<p className="text-sm text-gray-500">Date</p>
					<p className="text-sm">{formatDate(tx.timestamp)}</p>
				</div>
				<CopyableField label="From" value={tx.from} />
				<CopyableField label="To" value={tx.to} />
				<CopyableField label="Transaction Hash" value={tx.txHash} />
				{tx.memo && (
					<div>
						<p className="text-sm text-gray-500">Memo</p>
						<p className="text-sm">{tx.memo}</p>
					</div>
				)}
			</div>

			<a
				href={`${TEMPO_EXPLORER_URL}/tx/${tx.txHash}`}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
			>
				View on Explorer <ExternalLink className="h-3 w-3" />
			</a>
		</Card>
	);
}
