"use client";

import { Copy } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { truncateAddress } from "@/lib/utils";

interface StargateDepositProps {
	chain: "ethereum" | "solana";
	destAddress: `0x${string}`;
}

export function StargateDeposit({ chain, destAddress }: StargateDepositProps) {
	useEffect(() => {
		// Dynamic import — web component registers itself on load
		import("@layerzerolabs/stargate-ui").catch(() => {
			// Widget may fail to load in non-browser environments
		});
	}, []);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(destAddress);
			toast("Address copied!", "success");
		} catch {
			toast("Failed to copy", "error");
		}
	}

	const chainLabel = chain === "ethereum" ? "Ethereum" : "Solana";

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
				<p className="mb-2 text-sm font-medium text-blue-900">
					Destination: Tempo ({truncateAddress(destAddress)})
				</p>
				<div className="flex items-center gap-2">
					<code className="min-w-0 flex-1 truncate text-xs text-blue-800">{destAddress}</code>
					<Button variant="ghost" size="icon" onClick={handleCopy}>
						<Copy className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
				<p className="mb-1 font-medium">Instructions:</p>
				<ol className="list-inside list-decimal space-y-1 text-xs">
					<li>Set destination chain to &quot;Tempo&quot; in the widget below</li>
					<li>Paste the address above as the recipient</li>
					<li>Enter amount and complete the bridge</li>
					<li>After bridging, paste the source transaction hash below to track delivery</li>
				</ol>
			</div>

			<div className="rounded-lg border border-gray-200 p-2">
				{/* @ts-expect-error -- stargate-widget is a web component */}
				<stargate-widget theme="dark" />
			</div>

			<p className="text-center text-xs text-gray-400">
				Bridge from {chainLabel} powered by Stargate (LayerZero). Funds arrive in ~1-5 minutes. Fee:
				~0.06%
			</p>
		</div>
	);
}
