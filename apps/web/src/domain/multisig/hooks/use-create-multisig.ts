"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	type Address,
	encodeFunctionData,
	encodePacked,
	type Hex,
	keccak256,
	type PublicClient,
	parseEventLogs,
	type WalletClient,
} from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import {
	assertCanCreateMultisigAccount,
	finalizeMultisigAccountCreate,
	type MultisigAccountParams,
} from "../actions/create-multisig-account";

// ─── Contract addresses (from network config) ──────────────────────
import { MULTISIG_FACTORY_ADDRESS, POLICY_GUARD_FACTORY_ADDRESS } from "@/lib/constants";

const FACTORY_ADDRESS = MULTISIG_FACTORY_ADDRESS as Address;
const GUARD_FACTORY_ADDRESS = POLICY_GUARD_FACTORY_ADDRESS as Address;

// ─── Minimal ABIs (inlined to avoid SDK import dependency) ──────────
const MultisigFactoryAbi = [
	{
		type: "function",
		name: "createWallet",
		inputs: [
			{ name: "owners", type: "address[]" },
			{ name: "threshold", type: "uint256" },
			{ name: "salt", type: "bytes32" },
		],
		outputs: [{ name: "wallet", type: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "WalletCreated",
		inputs: [
			{ name: "wallet", type: "address", indexed: true },
			{ name: "owners", type: "address[]", indexed: false },
			{ name: "threshold", type: "uint256", indexed: false },
		],
	},
] as const;

const PolicyGuardFactoryAbi = [
	{
		type: "function",
		name: "createGuard",
		inputs: [
			{ name: "multisig_", type: "address" },
			{
				name: "tiers_",
				type: "tuple[]",
				components: [
					{ name: "maxValue", type: "uint256" },
					{ name: "requiredConfirmations", type: "uint256" },
				],
			},
			{ name: "defaultConfirmations_", type: "uint256" },
			{ name: "allowlistEnabled_", type: "bool" },
			{ name: "initialAllowlist_", type: "address[]" },
		],
		outputs: [{ name: "guard", type: "address" }],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "GuardCreated",
		inputs: [
			{ name: "multisig", type: "address", indexed: true },
			{ name: "guard", type: "address", indexed: true },
			{ name: "deployer", type: "address", indexed: true },
		],
	},
] as const;

const MultisigSingletonAbi = [
	{
		type: "function",
		name: "submitTransaction",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "data", type: "bytes" },
		],
		outputs: [{ name: "txId", type: "uint256" }],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "executeTransaction",
		inputs: [{ name: "txId", type: "uint256" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "setGuard",
		inputs: [{ name: "_guard", type: "address" }],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "TransactionSubmitted",
		inputs: [
			{ name: "txId", type: "uint256", indexed: true },
			{ name: "to", type: "address", indexed: true },
			{ name: "value", type: "uint256", indexed: false },
			{ name: "data", type: "bytes", indexed: false },
		],
	},
] as const;

// ─── Types ──────────────────────────────────────────────────────────

export type MultisigCreationStep =
	| "idle"
	| "validating"
	| "deploying-wallet"
	| "deploying-guard"
	| "setting-guard"
	| "finalizing"
	| "complete"
	| "error";

interface CreateMultisigParams {
	treasuryId: string;
	name: string;
	tokenSymbol: string;
	owners: string[];
	tiers: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
	allowlistEnabled: boolean;
	initialAllowlist: string[];
	agentPrivateKey?: Hex;
	agentAddress?: Address;
}

// ─── On-chain helpers ───────────────────────────────────────────────

async function deployMultisigWallet(
	publicClient: PublicClient,
	walletClient: WalletClient,
	owners: Address[],
	salt: Hex,
): Promise<Address> {
	const hash = await walletClient.writeContract({
		account: walletClient.account!,
		chain: walletClient.chain,
		address: FACTORY_ADDRESS,
		abi: MultisigFactoryAbi,
		functionName: "createWallet",
		args: [owners, 1n, salt], // threshold=1, guard is the real policy engine
	});
	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	const logs = parseEventLogs({
		abi: MultisigFactoryAbi,
		logs: receipt.logs,
		eventName: "WalletCreated",
	});
	if (logs.length === 0) throw new Error("WalletCreated event not found");
	return logs[0].args.wallet;
}

async function deployPolicyGuard(
	publicClient: PublicClient,
	walletClient: WalletClient,
	multisig: Address,
	tiers: Array<{ maxValue: bigint; requiredConfirmations: number }>,
	defaultConfirmations: number,
	allowlistEnabled: boolean,
	initialAllowlist: Address[],
): Promise<Address> {
	const hash = await walletClient.writeContract({
		account: walletClient.account!,
		chain: walletClient.chain,
		address: GUARD_FACTORY_ADDRESS,
		abi: PolicyGuardFactoryAbi,
		functionName: "createGuard",
		args: [
			multisig,
			tiers.map((t) => ({
				maxValue: t.maxValue,
				requiredConfirmations: BigInt(t.requiredConfirmations),
			})),
			BigInt(defaultConfirmations),
			allowlistEnabled,
			initialAllowlist,
		],
	});
	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	const logs = parseEventLogs({
		abi: PolicyGuardFactoryAbi,
		logs: receipt.logs,
		eventName: "GuardCreated",
	});
	if (logs.length === 0) throw new Error("GuardCreated event not found");
	return logs[0].args.guard;
}

async function setGuardOnWallet(
	publicClient: PublicClient,
	walletClient: WalletClient,
	walletAddress: Address,
	guardAddress: Address,
): Promise<void> {
	// Encode setGuard calldata for self-call
	const setGuardData = encodeFunctionData({
		abi: MultisigSingletonAbi,
		functionName: "setGuard",
		args: [guardAddress],
	});

	// Submit self-call (auto-confirmed since threshold=1)
	const submitHash = await walletClient.writeContract({
		account: walletClient.account!,
		chain: walletClient.chain,
		address: walletAddress,
		abi: MultisigSingletonAbi,
		functionName: "submitTransaction",
		args: [walletAddress, 0n, setGuardData],
	});
	const submitReceipt = await publicClient.waitForTransactionReceipt({
		hash: submitHash,
	});
	const submitLogs = parseEventLogs({
		abi: MultisigSingletonAbi,
		logs: submitReceipt.logs,
		eventName: "TransactionSubmitted",
	});
	if (submitLogs.length === 0) throw new Error("TransactionSubmitted event not found");
	const txId = submitLogs[0].args.txId;

	// Execute immediately (threshold=1, already confirmed)
	const execHash = await walletClient.writeContract({
		account: walletClient.account!,
		chain: walletClient.chain,
		address: walletAddress,
		abi: MultisigSingletonAbi,
		functionName: "executeTransaction",
		args: [txId],
	});
	await publicClient.waitForTransactionReceipt({ hash: execHash });
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Client mutation for multisig account creation.
 *
 * Orchestrates 3 on-chain transactions:
 * 1. Deploy multisig wallet (threshold=1) via MultisigFactory
 * 2. Deploy PolicyGuard with tiers + allowlist via PolicyGuardFactory
 * 3. Set guard on wallet via self-call (submit + execute)
 *
 * Then persists to DB via server action.
 */
export function useCreateMultisig() {
	const queryClient = useQueryClient();
	const config = useConfig();
	const [step, setStep] = useState<MultisigCreationStep>("idle");

	const mutation = useMutation({
		mutationFn: async (params: CreateMultisigParams) => {
			setStep("validating");

			// 1. Server-side validation
			const validation = await assertCanCreateMultisigAccount(params as MultisigAccountParams);
			if (validation.error) {
				throw new Error(validation.error);
			}

			// Get wagmi clients
			const publicClient = getPublicClient(config);
			const walletClient = await getWalletClient(config);
			if (!publicClient || !walletClient) {
				throw new Error("Wallet not connected");
			}

			// Generate a deterministic salt from the account name + timestamp
			const salt = keccak256(
				encodePacked(["string", "uint256"], [params.name, BigInt(Date.now())]),
			) as Hex;

			// 2. Deploy multisig wallet (threshold=1, guard is the real policy engine)
			setStep("deploying-wallet");
			const walletAddress = await deployMultisigWallet(
				publicClient,
				walletClient,
				params.owners as Address[],
				salt,
			);

			// 3. Deploy PolicyGuard with tiers + allowlist
			setStep("deploying-guard");
			const guardAddress = await deployPolicyGuard(
				publicClient,
				walletClient,
				walletAddress,
				params.tiers.map((t) => ({
					maxValue: BigInt(t.maxValue),
					requiredConfirmations: t.requiredConfirmations,
				})),
				params.defaultConfirmations,
				params.allowlistEnabled,
				params.initialAllowlist as Address[],
			);

			// 4. Set guard on wallet via self-call (threshold=1, auto-executes)
			setStep("setting-guard");
			await setGuardOnWallet(publicClient, walletClient, walletAddress, guardAddress);

			// 5. Persist to DB
			setStep("finalizing");
			const result = await finalizeMultisigAccountCreate({
				treasuryId: params.treasuryId,
				name: params.name,
				tokenSymbol: params.tokenSymbol,
				walletAddress,
				guardAddress,
				owners: params.owners,
				tiers: params.tiers,
				defaultConfirmations: params.defaultConfirmations,
				allowlistEnabled: params.allowlistEnabled,
				agentPrivateKey: params.agentPrivateKey,
				agentAddress: params.agentAddress,
			});

			if (result.error) {
				throw new Error(result.error);
			}

			setStep("complete");
			return result.account;
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
			toast("Multisig account created!", "success");
		},
		onError: (error) => {
			setStep("error");
			toast(error.message || "Failed to create multisig account", "error");
		},
	});

	return { ...mutation, step };
}
