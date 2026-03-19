"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { parseUnits } from "viem";
import { Hooks } from "wagmi/tempo";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import { prepareInternalTransfer } from "../actions/prepare-internal-transfer";

interface TransferParams {
	fromAccountId: string;
	toAccountId: string;
	amount: string;
	treasuryId: string;
}

interface TransferContext {
	treasuryId: string;
	fromWallet: string;
	toWallet: string;
	tokenAddress: string;
}

export function useInternalTransfer() {
	const queryClient = useQueryClient();
	const [isPreparing, setIsPreparing] = useState(false);
	const contextRef = useRef<TransferContext | null>(null);

	const transfer = Hooks.token.useTransferSync({
		mutation: {
			onSuccess: () => {
				toast("Transfer completed!", "success");
			},
			onError: (error) => {
				toast(error.message || "Transfer failed", "error");
			},
			onSettled: () => {
				const ctx = contextRef.current;
				if (!ctx) return;
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.accounts(ctx.treasuryId),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.transactions(ctx.fromWallet),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.balances(ctx.fromWallet),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.transactions(ctx.toWallet),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.balances(ctx.toWallet),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.accountBalance(ctx.fromWallet, ctx.tokenAddress),
				});
				void queryClient.invalidateQueries({
					queryKey: CACHE_KEYS.accountBalance(ctx.toWallet, ctx.tokenAddress),
				});
				contextRef.current = null;
			},
		},
	});

	return {
		isPending: isPreparing || transfer.isPending,
		mutate: (
			params: TransferParams,
			options?: { onSuccess?: () => void; onError?: (err: Error) => void },
		) => {
			setIsPreparing(true);

			prepareInternalTransfer({
				fromAccountId: params.fromAccountId,
				toAccountId: params.toAccountId,
			})
				.then((result) => {
					if (result.error || !result.fromAccount || !result.toAccount) {
						const err = new Error(result.error ?? "Failed to prepare transfer");
						toast(err.message, "error");
						options?.onError?.(err);
						setIsPreparing(false);
						return;
					}

					const { fromAccount, toAccount } = result;

					contextRef.current = {
						treasuryId: params.treasuryId,
						fromWallet: fromAccount.walletAddress,
						toWallet: toAccount.walletAddress,
						tokenAddress: fromAccount.tokenAddress,
					};

					setIsPreparing(false);

					transfer.mutate(
						{
							to: toAccount.walletAddress as `0x${string}`,
							token: fromAccount.tokenAddress as `0x${string}`,
							amount: parseUnits(params.amount, 6),
						},
						{
							onSuccess: () => options?.onSuccess?.(),
							onError: (err) => options?.onError?.(err),
						},
					);
				})
				.catch((err) => {
					setIsPreparing(false);
					const error = err instanceof Error ? err : new Error("Transfer failed");
					toast(error.message, "error");
					options?.onError?.(error);
				});
		},
	};
}
