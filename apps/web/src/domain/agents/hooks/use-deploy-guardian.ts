"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Address, keccak256, parseEventLogs, toHex } from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { toast } from "@/components/ui/toast";
import {
	CACHE_KEYS,
	GUARDIAN_FACTORY_ADDRESS,
	MPP_ESCROW_ADDRESS,
	SUPPORTED_TOKENS,
} from "@/lib/constants";
import { confirmTx } from "@/lib/tempo/confirm-tx";
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
			{ name: "spendingCap", type: "uint256" },
			{ name: "salt", type: "bytes32" },
			{ name: "recipients", type: "address[]" },
			{ name: "tokens", type: "address[]" },
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
			{ name: "spendingCap", type: "uint256", indexed: false },
		],
	},
] as const;

const GuardianReadAbi = [
	{
		type: "function",
		name: "allowedRecipients",
		inputs: [{ name: "", type: "address" }],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "allowedTokens",
		inputs: [{ name: "", type: "address" }],
		outputs: [{ name: "", type: "bool" }],
		stateMutability: "view",
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
	| "funding"
	| "persisting"
	| "complete"
	| "error";

export interface DeployGuardianParams extends AgentWalletParams {
	/** Agent's EOA address (derived from agentPrivateKey) */
	agentAddress: Address;
	/** Agent's private key (generated client-side, passed to finalize for encryption) */
	agentPrivateKey: `0x${string}`;
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

			// Step 2: Deploy Guardian via factory with allowlists in constructor
			// This configures recipients + tokens in a single tx, avoiding the
			// Tempo fee-payer issue where separate addRecipient/addToken calls
			// revert because msg.sender differs between transactions.
			setStep("deploying");
			const salt = keccak256(toHex(`${params.label}-${Date.now()}`));

			const selectedToken = SUPPORTED_TOKENS[params.tokenSymbol as keyof typeof SUPPORTED_TOKENS];
			const tokenAddress =
				selectedToken?.address ?? SUPPORTED_TOKENS[Object.keys(SUPPORTED_TOKENS)[0]]?.address;

			const deployHash = await walletClient.writeContract({
				address: GUARDIAN_FACTORY_ADDRESS,
				abi: GuardianFactoryAbi,
				functionName: "createGuardian",
				args: [
					params.agentAddress,
					BigInt(params.maxPerTx),
					BigInt(params.dailyLimit),
					BigInt(params.spendingCap),
					salt,
					[MPP_ESCROW_ADDRESS],
					[tokenAddress],
				],
			} as Parameters<typeof walletClient.writeContract>[0]);
			const deployReceipt = await confirmTx(publicClient, deployHash, "Guardian deployment");

			const logs = parseEventLogs({
				abi: GuardianFactoryAbi,
				logs: deployReceipt.logs,
				eventName: "GuardianCreated",
			});
			if (logs.length === 0) throw new Error("GuardianCreated event not found");
			const guardianAddress = logs[0].args.guardian;

			// Verify on-chain: read back allowlists to confirm they were set
			const [tokenOk, escrowOk] = await Promise.all([
				publicClient.readContract({
					address: guardianAddress,
					abi: GuardianReadAbi,
					functionName: "allowedTokens",
					args: [tokenAddress],
				}),
				publicClient.readContract({
					address: guardianAddress,
					abi: GuardianReadAbi,
					functionName: "allowedRecipients",
					args: [MPP_ESCROW_ADDRESS],
				}),
			]);

			if (!tokenOk) {
				throw new Error(`On-chain verification failed: token ${tokenAddress} not in allowlist`);
			}
			if (!escrowOk) {
				throw new Error("On-chain verification failed: MPP escrow not in allowlist");
			}

			// Step 3: Fund Guardian with initial tokens
			if (params.fundingAmount > 0n) {
				setStep("funding");
				const token = SUPPORTED_TOKENS[params.tokenSymbol as keyof typeof SUPPORTED_TOKENS];
				if (!token) throw new Error("Invalid token");

				const fundHash = await walletClient.writeContract({
					address: token.address,
					abi: Tip20Abi,
					functionName: "transfer",
					args: [guardianAddress, params.fundingAmount],
				} as Parameters<typeof walletClient.writeContract>[0]);
				await confirmTx(publicClient, fundHash, "fund Guardian");
			}

			// Step 4: Persist to DB (encrypts the SAME key used for Guardian deployment)
			setStep("persisting");
			const result = await finalizeAgentWalletCreate({
				treasuryId: params.treasuryId,
				label: params.label,
				tokenSymbol: params.tokenSymbol,
				guardianAddress,
				allowedVendors: [MPP_ESCROW_ADDRESS.toLowerCase()],
				spendingCap: params.spendingCap,
				dailyLimit: params.dailyLimit,
				maxPerTx: params.maxPerTx,
				agentPrivateKey: params.agentPrivateKey,
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
