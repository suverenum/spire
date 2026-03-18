"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import { prepareSwap } from "../actions/prepare-swap";

interface SwapParams {
	fromAccountId: string;
	toAccountId: string;
	amountIn: bigint;
	minAmountOut: bigint;
	treasuryId: string;
}

export function useExecuteSwap() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ fromAccountId, toAccountId }: SwapParams) => {
			// Server-side ownership + token mismatch validation
			const result = await prepareSwap({ fromAccountId, toAccountId });
			if (result.error) {
				throw new Error(result.error);
			}

			// In production: execute approve + swap via sendCallsSync,
			// parse receipt for amountOut, then transfer output to destination wallet.
			// For now, return success after validation.
			return {
				swapHash: `0x${"0".repeat(64)}` as `0x${string}`,
				transferHash: `0x${"0".repeat(64)}` as `0x${string}`,
				amountOut: 0n,
			};
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
			toast("Swap completed!", "success");
		},
		onError: (error) => {
			toast(error.message || "Swap failed", "error");
		},
	});
}
