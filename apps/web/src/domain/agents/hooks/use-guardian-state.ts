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
	"function proposalCount() external view returns (uint256)",
	"function proposals(uint256) external view returns (address token, address to, uint256 amount, uint8 status, uint256 createdAt)",
]);

const Tip20ReadAbi = parseAbi(["function balanceOf(address) external view returns (uint256)"]);

const publicClient = createPublicClient({
	chain: tempo,
	transport: http(TEMPO_RPC_URL),
});

export interface Proposal {
	id: number;
	token: string;
	to: string;
	amount: bigint;
	status: number; // 0=pending, 1=approved, 2=rejected
	createdAt: bigint;
}

export interface GuardianOnChainState {
	spentToday: bigint;
	dailyLimit: bigint;
	balance: bigint;
	proposals: Proposal[];
}

/**
 * Reads on-chain Guardian state: spentToday, dailyLimit, token balance, and proposals.
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
				const [spentToday, dailyLimit, balance, proposalCount] = await Promise.all([
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
					publicClient.readContract({
						address: guardianAddress,
						abi: GuardianReadAbi,
						functionName: "proposalCount",
					}),
				]);

				// Read each proposal
				const proposals: Proposal[] = [];
				const count = Number(proposalCount);
				for (let i = 1; i <= count; i++) {
					try {
						const [token, to, amount, status, createdAt] = await publicClient.readContract({
							address: guardianAddress,
							abi: GuardianReadAbi,
							functionName: "proposals",
							args: [BigInt(i)],
						});
						proposals.push({
							id: i,
							token,
							to,
							amount,
							status,
							createdAt,
						});
					} catch {
						// Skip unreadable proposals
					}
				}

				return { spentToday, dailyLimit, balance, proposals };
			} catch {
				return null;
			}
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
		enabled: !!guardianAddress && !!tokenAddress,
	});
}
