"use client";

const SUPPORTED_CHAINS = [
	{ id: "tempo", name: "Tempo", badge: "Free \u00b7 Instant" },
	{ id: "ethereum", name: "Ethereum" },
	{ id: "solana", name: "Solana" },
] as const;

export type ChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

interface ChainSelectorProps {
	value: ChainId;
	onChange: (chain: ChainId) => void;
	enableExternalChains: boolean;
}

export function ChainSelector({ value, onChange, enableExternalChains }: ChainSelectorProps) {
	return (
		<div className="w-full">
			<label htmlFor="chain-selector" className="mb-1 block text-sm font-medium">
				Source Network
			</label>
			<select
				id="chain-selector"
				value={value}
				onChange={(e) => onChange(e.target.value as ChainId)}
				className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
			>
				{SUPPORTED_CHAINS.map((chain) => {
					const disabled = chain.id !== "tempo" && !enableExternalChains;
					return (
						<option key={chain.id} value={chain.id} disabled={disabled}>
							{chain.name}
							{"badge" in chain ? ` (${chain.badge})` : ""}
							{disabled ? " - USDC accounts only" : ""}
						</option>
					);
				})}
			</select>
			{!enableExternalChains && (
				<p className="mt-1 text-xs text-gray-400">
					Cross-chain deposits are available for USDC accounts only.
				</p>
			)}
		</div>
	);
}
