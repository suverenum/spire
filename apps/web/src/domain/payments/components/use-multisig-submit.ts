"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { encodeFunctionData, parseEventLogs, parseUnits } from "viem";
import { useConfig } from "wagmi";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { toast } from "@/components/ui/toast";
import { MultisigAbi, Tip20Abi } from "@/domain/agents/abis";
import {
	addMultisigConfirmation,
	upsertMultisigTransaction,
} from "@/domain/multisig/actions/sync-multisig-state";
import { CACHE_KEYS, SUPPORTED_TOKENS, type TokenName } from "@/lib/constants";
import { FEE_TOKEN } from "@/lib/wagmi";

export interface MultisigSubmitResult {
	txId: string;
	requiredConfirmations: number;
	totalSigners: number;
}

interface MultisigConfig {
	owners: string[];
	tiersJson: Array<{ maxValue: string; requiredConfirmations: number }>;
	defaultConfirmations: number;
}

export function useMultisigSubmit() {
	const wagmiConfig = useConfig();
	const queryClient = useQueryClient();
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<MultisigSubmitResult | null>(null);

	async function submit(params: {
		accountId: string;
		walletAddress: `0x${string}`;
		token: TokenName;
		to: string;
		amount: string;
		multisigConfig: MultisigConfig;
	}) {
		setSubmitting(true);
		try {
			const publicClient = getPublicClient(wagmiConfig);
			const walletClient = await getWalletClient(wagmiConfig);
			if (!publicClient || !walletClient) {
				toast("Wallet not connected", "error");
				return;
			}

			const tokenConfig = SUPPORTED_TOKENS[params.token];
			const parsedAmount = parseUnits(params.amount, tokenConfig.decimals);

			const transferData = encodeFunctionData({
				abi: Tip20Abi,
				functionName: "transfer",
				args: [params.to as `0x${string}`, parsedAmount],
			});

			const hash = await walletClient.writeContract({
				account: walletClient.account!,
				chain: walletClient.chain,
				address: params.walletAddress,
				abi: MultisigAbi,
				functionName: "submitTransaction",
				args: [tokenConfig.address, 0n, transferData],
				...(FEE_TOKEN ? { feeToken: FEE_TOKEN } : {}),
			});

			const receipt = await publicClient.waitForTransactionReceipt({ hash });
			const logs = parseEventLogs({
				abi: MultisigAbi,
				logs: receipt.logs,
				eventName: "TransactionSubmitted",
			});

			if (logs.length === 0) throw new Error("TransactionSubmitted event not found");
			const txId = logs[0].args.txId.toString();

			const amountUsd = Number(params.amount);
			const sortedTiers = [...params.multisigConfig.tiersJson].sort(
				(a, b) => Number(a.maxValue) - Number(b.maxValue),
			);
			let reqConf = params.multisigConfig.defaultConfirmations;
			for (const tier of sortedTiers) {
				if (amountUsd * 1e6 <= Number(tier.maxValue)) {
					reqConf = tier.requiredConfirmations;
					break;
				}
			}

			const { id: dbTxId } = await upsertMultisigTransaction({
				accountId: params.accountId,
				onChainTxId: BigInt(txId),
				to: tokenConfig.address,
				value: "0",
				data: transferData,
				requiredConfirmations: reqConf,
				currentConfirmations: 1,
				executed: false,
			});

			if (walletClient.account) {
				await addMultisigConfirmation({
					multisigTransactionId: dbTxId,
					signerAddress: walletClient.account.address,
				});
			}

			setResult({
				txId,
				requiredConfirmations: reqConf,
				totalSigners: params.multisigConfig.owners.length,
			});

			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.pendingTransactions(params.accountId),
			});

			toast("Transaction submitted for approval", "success");
		} catch (err) {
			toast(err instanceof Error ? err.message : "Submission failed", "error");
		} finally {
			setSubmitting(false);
		}
	}

	return { submit, submitting, result, setResult };
}
