"use client";

import { formatBalance } from "@/lib/utils";

interface SwapQuoteDisplayProps {
	amountOut: bigint;
	tokenOut: string;
	rate: number;
	slippage: number;
	minAmountOut: bigint;
	isLoading: boolean;
}

export function SwapQuoteDisplay({
	amountOut,
	tokenOut,
	rate,
	slippage,
	minAmountOut,
	isLoading,
}: SwapQuoteDisplayProps) {
	if (isLoading) {
		return (
			<div className="border-border bg-background rounded-lg border p-3">
				<p className="text-muted-foreground text-sm">Fetching quote...</p>
			</div>
		);
	}

	return (
		<div className="border-border bg-background space-y-1 rounded-lg border p-3">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">You receive</p>
				<p className="text-sm font-medium">
					${formatBalance(amountOut, 6)} {tokenOut}
				</p>
			</div>
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-xs">Rate</p>
				<p className="text-muted-foreground text-xs">{rate.toFixed(4)}</p>
			</div>
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-xs">Slippage</p>
				<p className="text-muted-foreground text-xs">{(slippage * 100).toFixed(1)}%</p>
			</div>
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-xs">Min received</p>
				<p className="text-muted-foreground text-xs">${formatBalance(minAmountOut, 6)}</p>
			</div>
		</div>
	);
}
