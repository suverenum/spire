"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/lib/constants";
import type { Payment } from "@/lib/tempo/types";
import { sendPaymentAction } from "../actions/send-payment-action";
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

  return useMutation({
    mutationFn: async (params: SendPaymentParams) => {
      const formData = new FormData();
      formData.set("to", params.to);
      formData.set("amount", params.amount);
      formData.set("token", params.token);
      if (params.memo) formData.set("memo", params.memo);
      return sendPaymentAction(formData);
    },
    onMutate: async (params) => {
      const addr = fromAddress ?? ("" as `0x${string}`);
      await queryClient.cancelQueries({
        queryKey: CACHE_KEYS.transactions(addr),
      });
      const previous = queryClient.getQueryData<Payment[]>(
        CACHE_KEYS.transactions(addr),
      );

      const optimisticPayment: Payment = {
        id: `optimistic-${Date.now()}`,
        txHash: `0x${"0".repeat(64)}` as `0x${string}`,
        from: addr,
        to: params.to,
        amount: BigInt(Math.floor(parseFloat(params.amount) * 1e6)),
        token: params.token,
        memo: params.memo,
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
    onSuccess: (result, vars) => {
      if (result.success) {
        toast("Payment sent successfully!", "success");
        trackEvent(AnalyticsEvents.PAYMENT_SENT, {
          token: vars.token,
          amount: vars.amount,
        });
      } else {
        toast(result.error ?? "Payment failed", "error");
      }
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
  });
}
