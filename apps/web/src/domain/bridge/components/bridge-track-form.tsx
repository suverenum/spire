"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import { createBridgeDeposit } from "../actions/track-deposit";

interface BridgeTrackFormProps {
	accountId: string;
	sourceChain: "ethereum" | "solana";
}

export function BridgeTrackForm({ accountId, sourceChain }: BridgeTrackFormProps) {
	const queryClient = useQueryClient();
	const [sourceTxHash, setSourceTxHash] = useState("");
	const [amount, setAmount] = useState("");
	const [isPending, setIsPending] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!sourceTxHash.trim() || !amount.trim()) return;

		setIsPending(true);
		try {
			await createBridgeDeposit({
				accountId,
				sourceChain,
				amount: amount.trim(),
				sourceTxHash: sourceTxHash.trim(),
			});
			toast("Deposit tracked! We'll monitor its progress.", "success");
			setSourceTxHash("");
			setAmount("");
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.bridgeDeposits(accountId) });
		} catch (err) {
			toast(err instanceof Error ? err.message : "Failed to track deposit", "error");
		} finally {
			setIsPending(false);
		}
	}

	const chainLabel = sourceChain === "ethereum" ? "Ethereum" : "Solana";

	return (
		<form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 p-3">
			<p className="text-sm font-medium">Track {chainLabel} Deposit</p>
			<div>
				<label htmlFor="source-tx-hash" className="mb-1 block text-xs text-gray-500">
					Source Transaction Hash
				</label>
				<Input
					id="source-tx-hash"
					type="text"
					placeholder="0x..."
					value={sourceTxHash}
					onChange={(e) => setSourceTxHash(e.target.value)}
					required
				/>
			</div>
			<div>
				<label htmlFor="bridge-amount" className="mb-1 block text-xs text-gray-500">
					Amount (USDC)
				</label>
				<Input
					id="bridge-amount"
					type="text"
					inputMode="decimal"
					placeholder="0.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					required
				/>
			</div>
			<Button
				type="submit"
				disabled={isPending || !sourceTxHash.trim() || !amount.trim()}
				className="w-full"
			>
				{isPending ? "Tracking..." : "Track deposit"}
			</Button>
		</form>
	);
}
