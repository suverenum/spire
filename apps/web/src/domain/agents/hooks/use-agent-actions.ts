"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS, SUPPORTED_TOKENS } from "@/lib/constants";
import { confirmTx } from "@/lib/tempo/confirm-tx";
import { FEE_TOKEN } from "@/lib/wagmi";
import { GuardianOwnerAbi, Tip20Abi } from "../abis";

/**
 * Hook for topping up an agent wallet (transferring more tokens to Guardian contract).
 */
export function useTopUpAgent(treasuryId: string) {
	const config = useConfig();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guardianAddress,
			tokenSymbol,
			amount,
		}: {
			guardianAddress: Address;
			tokenSymbol: string;
			amount: bigint;
		}) => {
			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			const token = SUPPORTED_TOKENS[tokenSymbol as keyof typeof SUPPORTED_TOKENS];
			if (!token) throw new Error("Invalid token");

			const hash = await walletClient.writeContract({
				address: token.address,
				abi: Tip20Abi,
				functionName: "transfer",
				args: [guardianAddress, amount],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			await confirmTx(publicClient, hash, "top up");
			return hash;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.agentWallets(treasuryId) });
			toast("Agent wallet topped up", "success");
		},
		onError: (error) => toast(error.message, "error"),
	});
}

/**
 * Hook for emergency withdrawal (pulling all funds from Guardian back to owner).
 */
export function useEmergencyWithdraw(treasuryId: string) {
	const config = useConfig();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guardianAddress,
			tokenSymbol,
		}: {
			guardianAddress: Address;
			tokenSymbol: string;
		}) => {
			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			const token = SUPPORTED_TOKENS[tokenSymbol as keyof typeof SUPPORTED_TOKENS];
			if (!token) throw new Error("Invalid token");

			const hash = await walletClient.writeContract({
				address: guardianAddress,
				abi: GuardianOwnerAbi,
				functionName: "withdraw",
				args: [token.address],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			await confirmTx(publicClient, hash, "withdraw");
			return hash;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.agentWallets(treasuryId) });
			toast("Funds withdrawn from Guardian", "success");
		},
		onError: (error) => toast(error.message, "error"),
	});
}

/**
 * Hook for updating Guardian limits on-chain.
 */
export function useUpdateGuardianLimits(treasuryId: string) {
	const config = useConfig();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guardianAddress,
			maxPerTx,
			dailyLimit,
		}: {
			guardianAddress: Address;
			maxPerTx: bigint;
			dailyLimit: bigint;
		}) => {
			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			const hash = await walletClient.writeContract({
				address: guardianAddress,
				abi: GuardianOwnerAbi,
				functionName: "updateLimits",
				args: [maxPerTx, dailyLimit],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			await confirmTx(publicClient, hash, "update limits");
			return hash;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.agentWallets(treasuryId) });
			toast("Limits updated on-chain", "success");
		},
		onError: (error) => toast(error.message, "error"),
	});
}

/**
 * Hook for approving a pending over-limit payment on-chain.
 */
export function useApprovePay(treasuryId: string) {
	const config = useConfig();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guardianAddress,
			proposalId,
		}: {
			guardianAddress: Address;
			proposalId: bigint;
		}) => {
			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			const hash = await walletClient.writeContract({
				address: guardianAddress,
				abi: GuardianOwnerAbi,
				functionName: "approvePay",
				args: [proposalId],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			await confirmTx(publicClient, hash, "approve payment");
			return hash;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.agentWallets(treasuryId) });
			queryClient.invalidateQueries({ queryKey: ["guardian-state"] });
			toast("Payment approved and executed on-chain", "success");
		},
		onError: (error: Error) => toast(error.message, "error"),
	});
}

/**
 * Hook for rejecting a pending over-limit payment on-chain.
 */
export function useRejectPay(treasuryId: string) {
	const config = useConfig();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guardianAddress,
			proposalId,
		}: {
			guardianAddress: Address;
			proposalId: bigint;
		}) => {
			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			const hash = await walletClient.writeContract({
				address: guardianAddress,
				abi: GuardianOwnerAbi,
				functionName: "rejectPay",
				args: [proposalId],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			await confirmTx(publicClient, hash, "reject payment");
			return hash;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.agentWallets(treasuryId) });
			queryClient.invalidateQueries({ queryKey: ["guardian-state"] });
			toast("Payment rejected", "success");
		},
		onError: (error: Error) => toast(error.message, "error"),
	});
}

/**
 * Hook for adding a token to the Guardian's allowlist on-chain.
 */
export function useAddToken(treasuryId: string) {
	const config = useConfig();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			guardianAddress,
			tokenAddress,
		}: {
			guardianAddress: Address;
			tokenAddress: Address;
		}) => {
			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			const hash = await walletClient.writeContract({
				address: guardianAddress,
				abi: GuardianOwnerAbi,
				functionName: "addToken",
				args: [tokenAddress],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			await confirmTx(publicClient, hash, "add token");
			return hash;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CACHE_KEYS.agentWallets(treasuryId) });
			queryClient.invalidateQueries({ queryKey: ["guardian-state"] });
			toast("Token added to allowlist", "success");
		},
		onError: (error: Error) => toast(error.message, "error"),
	});
}
