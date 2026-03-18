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
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
				<p className="text-sm text-gray-500">Fetching quote...</p>
			</div>
		);
	}

	return (
		<div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3">
			<div className="flex items-center justify-between">
				<p className="text-sm text-gray-500">You receive</p>
				<p className="text-sm font-medium">
					${formatBalance(amountOut, 6)} {tokenOut}
				</p>
			</div>
			<div className="flex items-center justify-between">
				<p className="text-xs text-gray-400">Rate</p>
				<p className="text-xs text-gray-500">{rate.toFixed(4)}</p>
			</div>
			<div className="flex items-center justify-between">
				<p className="text-xs text-gray-400">Slippage</p>
				<p className="text-xs text-gray-500">{(slippage * 100).toFixed(1)}%</p>
			</div>
			<div className="flex items-center justify-between">
				<p className="text-xs text-gray-400">Min received</p>
				<p className="text-xs text-gray-500">${formatBalance(minAmountOut, 6)}</p>
			</div>
		</div>
	);
}
