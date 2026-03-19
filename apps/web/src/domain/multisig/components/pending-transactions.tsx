"use client";

import { Check, Clock, Play } from "lucide-react";
import type { PendingTransactionData } from "../queries/get-pending-transactions";
import { decodeTransactionDescription } from "../utils/decode-transaction";

interface PendingTransactionsProps {
	transactions: PendingTransactionData[];
	walletAddress: string;
	currentUserAddress?: string;
	onConfirm?: (txId: string) => void;
	onExecute?: (txId: string) => void;
}

export function PendingTransactions({
	transactions,
	walletAddress,
	currentUserAddress,
	onConfirm,
	onExecute,
}: PendingTransactionsProps) {
	if (transactions.length === 0) {
		return (
			<div data-testid="no-pending" className="text-muted-foreground py-8 text-center text-sm">
				No pending transactions
			</div>
		);
	}

	return (
		<div data-testid="pending-list" className="space-y-3">
			{transactions.map((tx) => {
				const description = decodeTransactionDescription(tx.to, tx.data, tx.value, walletAddress);
				const canExecute = tx.currentConfirmations >= tx.requiredConfirmations;
				const alreadyConfirmed = currentUserAddress
					? tx.confirmations.some(
							(c) => c.signerAddress.toLowerCase() === currentUserAddress.toLowerCase(),
						)
					: false;

				return (
					<div
						key={tx.id}
						data-testid={`pending-tx-${tx.onChainTxId}`}
						className="border-border bg-muted rounded-lg border p-4"
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-foreground text-sm font-medium">{description}</p>
								<div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
									<Clock className="h-3 w-3" />
									<span>
										{tx.currentConfirmations}/{tx.requiredConfirmations} confirmations
									</span>
								</div>
							</div>
							<div className="flex gap-2">
								{onConfirm && !alreadyConfirmed && (
									<button
										type="button"
										data-testid={`confirm-btn-${tx.onChainTxId}`}
										onClick={() => onConfirm(tx.onChainTxId)}
										className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20"
									>
										<Check className="h-3 w-3" />
										Confirm
									</button>
								)}
								{onExecute && (
									<button
										type="button"
										data-testid={`execute-btn-${tx.onChainTxId}`}
										onClick={() => onExecute(tx.onChainTxId)}
										disabled={!canExecute}
										className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
									>
										<Play className="h-3 w-3" />
										Execute
									</button>
								)}
							</div>
						</div>
						{tx.confirmations.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1">
								{tx.confirmations.map((c) => (
									<span
										key={c.signerAddress}
										className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-400"
									>
										{c.signerAddress.slice(0, 6)}...{c.signerAddress.slice(-4)}
									</span>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
