"use client";

import { useQuery } from "@tanstack/react-query";

interface SwapQuote {
	tokenIn: `0x${string}`;
	tokenOut: `0x${string}`;
	amountIn: bigint;
	amountOut: bigint;
	rate: number;
	slippage: number;
	minAmountOut: bigint;
}

/**
 * Hook wrapping Tempo DEX quote.
 * In production this calls the DEX precompile's quoteSwapExactAmountIn.
 * For now it returns a simulated 1:1 stablecoin quote with 0.5% slippage.
 */
export function useSwapQuote({
	tokenIn,
	tokenOut,
	amountIn,
	enabled = true,
}: {
	tokenIn: `0x${string}` | undefined;
	tokenOut: `0x${string}` | undefined;
	amountIn: bigint | undefined;
	enabled?: boolean;
}) {
	return useQuery<SwapQuote | null>({
		queryKey: ["swapQuote", tokenIn, tokenOut, amountIn?.toString()],
		queryFn: async () => {
			if (!tokenIn || !tokenOut || !amountIn || amountIn <= 0n) return null;

			// Simulated stablecoin 1:1 quote with 0.5% slippage
			const slippage = 0.005;
			const rate = 0.999;
			const amountOut = (amountIn * 999n) / 1000n;
			const minAmountOut = (amountOut * 995n) / 1000n;

			return {
				tokenIn,
				tokenOut,
				amountIn,
				amountOut,
				rate,
				slippage,
				minAmountOut,
			};
		},
		enabled: enabled && !!tokenIn && !!tokenOut && !!amountIn,
		staleTime: 10_000,
	});
}
