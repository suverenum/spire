"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import {
	assertCanCreateMultisigAccount,
	finalizeMultisigAccountCreate,
	type MultisigAccountParams,
} from "../actions/create-multisig-account";

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
}

/**
 * Client mutation for multisig account creation.
 *
 * In production, this orchestrates 3 on-chain transactions:
 * 1. Deploy multisig wallet (threshold=1)
 * 2. Deploy PolicyGuard with tiers + allowlist
 * 3. Set guard on wallet via self-call
 *
 * For now, it validates server-side and persists to DB with placeholder addresses.
 * The on-chain deployment will be wired when the app integrates with wagmi.
 */
export function useCreateMultisig() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: CreateMultisigParams) => {
			// 1. Server-side validation
			const validation = await assertCanCreateMultisigAccount(
				params as MultisigAccountParams,
			);
			if (validation.error) {
				throw new Error(validation.error);
			}

			// 2. In production: deploy wallet, deploy guard, set guard
			// For now, generate placeholder addresses
			const walletAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
			const guardAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

			// 3. Persist after chain provisioning
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
			});

			if (result.error) {
				throw new Error(result.error);
			}

			return result.account;
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
			toast("Multisig account created!", "success");
		},
		onError: (error) => {
			toast(error.message || "Failed to create multisig account", "error");
		},
	});
}
