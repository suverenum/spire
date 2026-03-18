"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import {
	assertCanCreateAccount,
	finalizeAccountCreate,
} from "../actions/create-account";

interface CreateAccountParams {
	treasuryId: string;
	tokenSymbol: string;
	name: string;
}

/**
 * Client mutation for account creation.
 * In production, this would provision an on-chain wallet and register the passkey.
 * For now, it validates server-side and persists to DB with a placeholder wallet address.
 */
export function useCreateAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			treasuryId,
			tokenSymbol,
			name,
		}: CreateAccountParams) => {
			// 1. Server-side auth + validation
			const validation = await assertCanCreateAccount({
				treasuryId,
				tokenSymbol,
				name,
			});
			if (validation.error) {
				throw new Error(validation.error);
			}

			// 2. In production: create wallet, register passkey on keychain
			// For now, generate a placeholder wallet address
			const walletAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

			// 3. Persist after chain provisioning
			const result = await finalizeAccountCreate({
				treasuryId,
				name,
				tokenSymbol,
				walletAddress,
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
			toast("Account created!", "success");
		},
		onError: (error) => {
			toast(error.message || "Failed to create account", "error");
		},
	});
}
