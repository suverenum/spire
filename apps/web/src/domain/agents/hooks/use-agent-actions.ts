"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS, SUPPORTED_TOKENS } from "@/lib/constants";
import { confirmTx } from "@/lib/tempo/confirm-tx";

// ─── Guardian ABI subset for owner actions ─────────────────────────

const GuardianOwnerAbi = [
	{
		type: "function",
		name: "updateLimits",
		inputs: [
			{ name: "_maxPerTx", type: "uint256" },
			{ name: "_dailyLimit", type: "uint256" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "addRecipient",
		inputs: [{ name: "r", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "removeRecipient",
		inputs: [{ name: "r", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "addToken",
		inputs: [{ name: "t", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "withdraw",
		inputs: [{ name: "token", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "approvePay",
		inputs: [{ name: "proposalId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "rejectPay",
		inputs: [{ name: "proposalId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "proposalCount",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "proposals",
		inputs: [{ name: "", type: "uint256" }],
		outputs: [
			{ name: "token", type: "address" },
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
			{ name: "status", type: "uint8" },
			{ name: "createdAt", type: "uint256" },
		],
		stateMutability: "view",
	},
	{
		type: "event",
		name: "PaymentProposed",
		inputs: [
			{ name: "proposalId", type: "uint256", indexed: true },
			{ name: "token", type: "address", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "amount", type: "uint256", indexed: false },
		],
	},
] as const;

const Tip20Abi = [
	{
		type: "function",
		name: "transfer",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "nonpayable",
	},
] as const;

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
