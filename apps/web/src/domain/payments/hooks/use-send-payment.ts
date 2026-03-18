"use client";

import { useQueryClient } from "@tanstack/react-query";
import { pad, parseUnits, stringToHex } from "viem";
import { Hooks } from "wagmi/tempo";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS, SUPPORTED_TOKENS, type TokenName } from "@/lib/constants";
import { AnalyticsEvents, trackEvent } from "@/lib/posthog";
import type { BalancesResult, Payment } from "@/lib/tempo/types";

interface SendPaymentParams {
	to: `0x${string}`;
	amount: string;
	token: string;
	memo?: string;
	fromAddress: `0x${string}`;
}

export function useSendPayment(fromAddress: `0x${string}` | undefined) {
	const queryClient = useQueryClient();

	const transfer = Hooks.token.useTransferSync({
		mutation: {
			onMutate: async (vars) => {
				const addr = fromAddress ?? ("" as `0x${string}`);
				const tokenStr = String(vars.token).toLowerCase();
				await queryClient.cancelQueries({
					queryKey: CACHE_KEYS.transactions(addr),
				});
				await queryClient.cancelQueries({
					queryKey: CACHE_KEYS.balances(addr),
				});

				const previousTxs = queryClient.getQueryData<Payment[]>(CACHE_KEYS.transactions(addr));
				const previousBalances = queryClient.getQueryData<BalancesResult>(
					CACHE_KEYS.balances(addr),
				);

				const tokenName =
					Object.keys(SUPPORTED_TOKENS).find(
						(k) => SUPPORTED_TOKENS[k as TokenName].address.toLowerCase() === tokenStr,
					) ?? "Unknown";

				const optimisticPayment: Payment = {
					id: `optimistic-${Date.now()}`,
					txHash: `0x${"0".repeat(64)}`,
					from: addr,
					to: vars.to,
					amount: vars.amount,
					token: tokenName,
					status: "pending",
					timestamp: new Date(),
				};

				queryClient.setQueryData<Payment[]>(CACHE_KEYS.transactions(addr), (old) => [
					optimisticPayment,
					...(old ?? []),
				]);

				if (previousBalances) {
					queryClient.setQueryData<BalancesResult>(CACHE_KEYS.balances(addr), {
						...previousBalances,
						balances: previousBalances.balances.map((b) =>
							b.tokenAddress.toLowerCase() === tokenStr
								? {
										...b,
										balance: b.balance > vars.amount ? b.balance - vars.amount : 0n,
									}
								: b,
						),
					});
				}

				return { previousTxs, previousBalances };
			},
			onError: (_err, _vars, context) => {
				if (fromAddress) {
					if (context?.previousTxs) {
						queryClient.setQueryData(CACHE_KEYS.transactions(fromAddress), context.previousTxs);
					}
					if (context?.previousBalances) {
						queryClient.setQueryData(CACHE_KEYS.balances(fromAddress), context.previousBalances);
					}
				}
				toast("Payment failed. Please try again.", "error");
			},
			onSuccess: (_data, vars) => {
				const successTokenStr = String(vars.token).toLowerCase();
				const tokenName =
					Object.keys(SUPPORTED_TOKENS).find(
						(k) => SUPPORTED_TOKENS[k as TokenName].address.toLowerCase() === successTokenStr,
					) ?? "";
				toast("Payment sent successfully!", "success");
				trackEvent(AnalyticsEvents.PAYMENT_SENT, {
					token: tokenName,
				});
			},
			onSettled: () => {
				if (fromAddress) {
					void queryClient.invalidateQueries({
						queryKey: CACHE_KEYS.transactions(fromAddress),
					});
					void queryClient.invalidateQueries({
						queryKey: CACHE_KEYS.balances(fromAddress),
					});
				}
			},
		},
	});

	// Destructure mutateAsync out so it's not exposed - callers must use the wrapped mutate
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { mutate: rawMutate, mutateAsync, ...rest } = transfer;

	return {
		...rest,
		mutate: (params: SendPaymentParams, options?: { onSuccess?: () => void }) => {
			const tokenConfig = SUPPORTED_TOKENS[params.token as TokenName];
			if (!tokenConfig) {
				toast("Unsupported token", "error");
				return;
			}

			rawMutate(
				{
					to: params.to,
					token: tokenConfig.address,
					amount: parseUnits(params.amount, tokenConfig.decimals),
					memo: params.memo ? pad(stringToHex(params.memo), { size: 32 }) : undefined,
				},
				{ onSuccess: options?.onSuccess },
			);
		},
	};
}
