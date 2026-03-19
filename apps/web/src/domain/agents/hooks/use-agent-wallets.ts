"use client";

import { useQuery } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/lib/constants";
import { type AgentWalletData, getAgentWallets } from "../queries/get-agents";

export function useAgentWallets(treasuryId: string) {
	return useQuery<AgentWalletData[]>({
		queryKey: CACHE_KEYS.agentWallets(treasuryId),
		queryFn: () => getAgentWallets(),
		staleTime: 30_000,
	});
}
