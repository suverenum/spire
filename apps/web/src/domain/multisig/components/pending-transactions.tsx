"use client";

import { Check, Clock, Play } from "lucide-react";
import type { PendingTransactionData } from "../queries/get-pending-transactions";
import { decodeTransactionDescription } from "../utils/decode-transaction";

interface PendingTransactionsProps {
	transactions: PendingTransactionData[];
	walletAddress: string;
	onConfirm?: (txId: string) => void;
	onExecute?: (txId: string) => void;
}

export function PendingTransactions({
	transactions,
	walletAddress,
	onConfirm,
	onExecute,
}: PendingTransactionsProps) {
	if (transactions.length === 0) {
		return (
			<div data-testid="no-pending" className="py-8 text-center text-sm text-gray-500">
				No pending transactions
			</div>
		);
	}

	return (
		<div data-testid="pending-list" className="space-y-3">
			{transactions.map((tx) => {
				const description = decodeTransactionDescription(tx.to, tx.data, tx.value, walletAddress);
				const canExecute = tx.currentConfirmations >= tx.requiredConfirmations;

				return (
					<div
						key={tx.id}
						data-testid={`pending-tx-${tx.onChainTxId}`}
						className="rounded-lg border border-gray-200 bg-white p-4"
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-medium text-gray-900">{description}</p>
								<div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
									<Clock className="h-3 w-3" />
									<span>
										{tx.currentConfirmations}/{tx.requiredConfirmations} confirmations
									</span>
								</div>
							</div>
							<div className="flex gap-2">
								{onConfirm && (
									<button
										type="button"
										data-testid={`confirm-btn-${tx.onChainTxId}`}
										onClick={() => onConfirm(tx.onChainTxId)}
										className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
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
										className="inline-flex items-center gap-1 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
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
										className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700"
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
