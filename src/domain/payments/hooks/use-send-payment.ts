"use client";

import { useQueryClient } from "@tanstack/react-query";
import { parseUnits, pad, stringToHex } from "viem";
import { Hooks } from "wagmi/tempo";
import { CACHE_KEYS, SUPPORTED_TOKENS, type TokenName } from "@/lib/constants";
import type { Payment } from "@/lib/tempo/types";
import { toast } from "@/components/ui/toast";
import { trackEvent, AnalyticsEvents } from "@/lib/posthog";

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
        await queryClient.cancelQueries({
          queryKey: CACHE_KEYS.transactions(addr),
        });
        const previous = queryClient.getQueryData<Payment[]>(
          CACHE_KEYS.transactions(addr),
        );

        const tokenName =
          Object.keys(SUPPORTED_TOKENS).find(
            (k) =>
              SUPPORTED_TOKENS[k as TokenName].address.toLowerCase() ===
              vars.token.toLowerCase(),
          ) ?? "Unknown";

        const optimisticPayment: Payment = {
          id: `optimistic-${Date.now()}`,
          txHash: `0x${"0".repeat(64)}` as `0x${string}`,
          from: addr,
          to: vars.to,
          amount: vars.amount,
          token: tokenName,
          status: "pending",
          timestamp: new Date(),
        };

        queryClient.setQueryData<Payment[]>(
          CACHE_KEYS.transactions(addr),
          (old) => [optimisticPayment, ...(old ?? [])],
        );

        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous && fromAddress) {
          queryClient.setQueryData(
            CACHE_KEYS.transactions(fromAddress),
            context.previous,
          );
        }
        toast("Payment failed. Please try again.", "error");
      },
      onSuccess: (_data, vars) => {
        const tokenName =
          Object.keys(SUPPORTED_TOKENS).find(
            (k) =>
              SUPPORTED_TOKENS[k as TokenName].address.toLowerCase() ===
              vars.token.toLowerCase(),
          ) ?? "";
        toast("Payment sent successfully!", "success");
        trackEvent(AnalyticsEvents.PAYMENT_SENT, {
          token: tokenName,
        });
      },
      onSettled: () => {
        if (fromAddress) {
          queryClient.invalidateQueries({
            queryKey: CACHE_KEYS.transactions(fromAddress),
          });
          queryClient.invalidateQueries({
            queryKey: CACHE_KEYS.balances(fromAddress),
          });
        }
      },
    },
  });

  return {
    ...transfer,
    mutate: (
      params: SendPaymentParams,
      options?: { onSuccess?: () => void },
    ) => {
      const tokenConfig = SUPPORTED_TOKENS[params.token as TokenName];
      if (!tokenConfig) {
        toast("Unsupported token", "error");
        return;
      }

      transfer.mutate(
        {
          to: params.to,
          token: tokenConfig.address,
          amount: parseUnits(params.amount, tokenConfig.decimals),
          memo: params.memo
            ? pad(stringToHex(params.memo), { size: 32 })
            : undefined,
        },
        { onSuccess: options?.onSuccess },
      );
    },
  };
}
