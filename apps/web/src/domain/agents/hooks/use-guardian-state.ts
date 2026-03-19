"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbi } from "viem";
import { tempo } from "viem/chains";
import { TEMPO_RPC_URL } from "@/lib/constants";

const GuardianReadAbi = parseAbi([
	"function spentToday() external view returns (uint256)",
	"function dailyLimit() external view returns (uint256)",
	"function maxPerTx() external view returns (uint256)",
	"function lastResetDay() external view returns (uint256)",
]);

const Tip20ReadAbi = parseAbi(["function balanceOf(address) external view returns (uint256)"]);

const publicClient = createPublicClient({
	chain: tempo,
	transport: http(TEMPO_RPC_URL),
});

export interface GuardianOnChainState {
	spentToday: bigint;
	dailyLimit: bigint;
	balance: bigint;
}

/**
 * Reads on-chain Guardian state: spentToday, dailyLimit, and token balance.
 */
export function useGuardianState(
	guardianAddress: `0x${string}` | undefined,
	tokenAddress: `0x${string}` | undefined,
) {
	return useQuery<GuardianOnChainState | null>({
		queryKey: ["guardian-state", guardianAddress, tokenAddress],
		queryFn: async () => {
			if (!guardianAddress || !tokenAddress) return null;

			try {
				const [spentToday, dailyLimit, balance] = await Promise.all([
					publicClient.readContract({
						address: guardianAddress,
						abi: GuardianReadAbi,
						functionName: "spentToday",
					}),
					publicClient.readContract({
						address: guardianAddress,
						abi: GuardianReadAbi,
						functionName: "dailyLimit",
					}),
					publicClient.readContract({
						address: tokenAddress,
						abi: Tip20ReadAbi,
						functionName: "balanceOf",
						args: [guardianAddress],
					}),
				]);

				return { spentToday, dailyLimit, balance };
			} catch {
				return null;
			}
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
		enabled: !!guardianAddress && !!tokenAddress,
	});
}
