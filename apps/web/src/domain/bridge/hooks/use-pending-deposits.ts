"use client";

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/lib/constants";
import { getPendingDeposits } from "../queries/get-pending-deposits";

export function usePendingDeposits(accountId: string | undefined) {
	return useQuery({
		queryKey: CACHE_KEYS.bridgeDeposits(accountId ?? ""),
		queryFn: () => getPendingDeposits(accountId!),
		enabled: !!accountId,
		refetchInterval: 30_000, // Poll every 30s for status updates
	});
}
