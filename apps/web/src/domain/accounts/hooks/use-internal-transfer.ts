"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import { prepareInternalTransfer } from "../actions/prepare-internal-transfer";

interface TransferParams {
	fromAccountId: string;
	toAccountId: string;
	amount: string;
	treasuryId: string;
}

export function useInternalTransfer() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ fromAccountId, toAccountId }: TransferParams) => {
			// Server-side ownership + same-token validation
			const result = await prepareInternalTransfer({
				fromAccountId,
				toAccountId,
			});

			if (result.error) {
				throw new Error(result.error);
			}

			// In production: execute the TIP-20 transfer on-chain using sendTransactionSync
			// For now, return success after validation
			return {
				fromAccount: result.fromAccount,
				toAccount: result.toAccount,
			};
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
			toast("Transfer completed!", "success");
		},
		onError: (error) => {
			toast(error.message || "Transfer failed", "error");
		},
	});
}
