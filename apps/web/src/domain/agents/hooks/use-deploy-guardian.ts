"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Address, keccak256, parseEventLogs, toHex } from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS, GUARDIAN_FACTORY_ADDRESS, SUPPORTED_TOKENS } from "@/lib/constants";
import {
	type AgentWalletParams,
	assertCanCreateAgentWallet,
	finalizeAgentWalletCreate,
} from "../actions/create-agent-wallet";

// ─── Minimal ABIs ──────────────────────────────────────────────────

const GuardianFactoryAbi = [
	{
		type: "function",
		name: "createGuardian",
		inputs: [
			{ name: "agent", type: "address" },
			{ name: "maxPerTx", type: "uint256" },
			{ name: "dailyLimit", type: "uint256" },
			{ name: "salt", type: "bytes32" },
		],
		outputs: [{ name: "guardian", type: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "GuardianCreated",
		inputs: [
			{ name: "guardian", type: "address", indexed: true },
			{ name: "owner", type: "address", indexed: true },
			{ name: "agent", type: "address", indexed: true },
			{ name: "maxPerTx", type: "uint256", indexed: false },
			{ name: "dailyLimit", type: "uint256", indexed: false },
		],
	},
] as const;

const GuardianAbi = [
	{
		type: "function",
		name: "addRecipient",
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
] as const;

// ─── TIP-20 transfer for funding ──────────────────────────────────
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

// ─── Creation steps ───────────────────────────────────────────────

export type AgentCreationStep =
	| "idle"
	| "validating"
	| "deploying"
	| "configuring"
	| "funding"
	| "persisting"
	| "complete"
	| "error";

export interface DeployGuardianParams extends AgentWalletParams {
	/** Agent's EOA address (generated server-side in finalize, but we need a placeholder for the factory) */
	agentAddress: Address;
	/** Initial funding amount in token base units */
	fundingAmount: bigint;
}

export function useDeployGuardian() {
	const config = useConfig();
	const queryClient = useQueryClient();
	const [step, setStep] = useState<AgentCreationStep>("idle");

	const mutation = useMutation({
		mutationFn: async (params: DeployGuardianParams) => {
			// Step 1: Server-side validation
			setStep("validating");
			const validation = await assertCanCreateAgentWallet(params);
			if (validation.error) throw new Error(validation.error);

			const walletClient = await getWalletClient(config);
			const publicClient = await getPublicClient(config);
			if (!walletClient || !publicClient) throw new Error("Wallet not connected");

			// Step 2: Deploy Guardian via factory
			setStep("deploying");
			const salt = keccak256(toHex(`${params.label}-${Date.now()}`));
			const deployHash = await walletClient.writeContract({
				address: GUARDIAN_FACTORY_ADDRESS,
				abi: GuardianFactoryAbi,
				functionName: "createGuardian",
				args: [params.agentAddress, BigInt(params.maxPerTx), BigInt(params.dailyLimit), salt],
			});

			const deployReceipt = await publicClient.waitForTransactionReceipt({
				hash: deployHash,
			});
			const logs = parseEventLogs({
				abi: GuardianFactoryAbi,
				logs: deployReceipt.logs,
				eventName: "GuardianCreated",
			});
			if (logs.length === 0) throw new Error("GuardianCreated event not found");
			const guardianAddress = logs[0].args.guardian;

			// Step 3: Configure allowlists
			setStep("configuring");
			for (const vendorAddr of params.allowedVendors) {
				const hash = await walletClient.writeContract({
					address: guardianAddress,
					abi: GuardianAbi,
					functionName: "addRecipient",
					args: [vendorAddr as Address],
				});
				await publicClient.waitForTransactionReceipt({ hash });
			}

			// Add pathUSD as allowed token
			const tokenAddress = SUPPORTED_TOKENS.pathUSD.address;
			const addTokenHash = await walletClient.writeContract({
				address: guardianAddress,
				abi: GuardianAbi,
				functionName: "addToken",
				args: [tokenAddress],
			});
			await publicClient.waitForTransactionReceipt({ hash: addTokenHash });

			// Step 4: Fund Guardian with initial tokens
			if (params.fundingAmount > 0n) {
				setStep("funding");
				const token = SUPPORTED_TOKENS[params.tokenSymbol as keyof typeof SUPPORTED_TOKENS];
				if (!token) throw new Error("Invalid token");

				const fundHash = await walletClient.writeContract({
					address: token.address,
					abi: Tip20Abi,
					functionName: "transfer",
					args: [guardianAddress, params.fundingAmount],
				});
				await publicClient.waitForTransactionReceipt({ hash: fundHash });
			}

			// Step 5: Persist to DB (generates agent key, encrypts, stores)
			setStep("persisting");
			const result = await finalizeAgentWalletCreate({
				treasuryId: params.treasuryId,
				label: params.label,
				tokenSymbol: params.tokenSymbol,
				guardianAddress,
				allowedVendors: params.allowedVendors,
				spendingCap: params.spendingCap,
				dailyLimit: params.dailyLimit,
				maxPerTx: params.maxPerTx,
			});

			if (result.error) throw new Error(result.error);

			setStep("complete");
			return {
				guardianAddress,
				rawPrivateKey: result.rawPrivateKey!,
				accountId: result.account!.id,
			};
		},
		onSuccess: (_data, params) => {
			queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(params.treasuryId),
			});
			queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.agentWallets(params.treasuryId),
			});
			toast("Agent wallet created successfully", "success");
		},
		onError: (error) => {
			setStep("error");
			toast(error.message, "error");
		},
	});

	return { ...mutation, step };
}
