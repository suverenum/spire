"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toast } from "@/components/ui/toast";
import { CACHE_KEYS } from "@/lib/constants";
import { assertCanCreateAccount, finalizeAccountCreate } from "../actions/create-account";

interface CreateAccountParams {
	treasuryId: string;
	tokenSymbol: string;
	name: string;
}

export type AccountCreationStep =
	| "idle"
	| "validating"
	| "generating"
	| "persisting"
	| "complete"
	| "error";

/**
 * Client mutation for account creation with real keypair generation.
 *
 * Flow:
 * 1. validating  — Server-side auth + name/token validation
 * 2. generating  — Generate secp256k1 keypair (real address, not placeholder)
 * 3. persisting  — Save to DB with wallet address and encrypted private key
 * 4. complete    — Account created successfully
 *
 * The generated private key is encrypted server-side using AES-256-GCM
 * (same pattern as agent wallet keys) and stored for future use with
 * Tempo Account Keychain access key registration.
 */
export function useCreateAccount() {
	const queryClient = useQueryClient();
	const [step, setStep] = useState<AccountCreationStep>("idle");

	const mutation = useMutation({
		mutationFn: async ({ treasuryId, tokenSymbol, name }: CreateAccountParams) => {
			try {
				// Step 1: Server-side validation
				setStep("validating");
				const validation = await assertCanCreateAccount({
					treasuryId,
					tokenSymbol,
					name,
				});
				if (validation.error) {
					throw new Error(validation.error);
				}

				// Step 2: Generate real secp256k1 keypair
				setStep("generating");
				const privateKey = generatePrivateKey();
				const account = privateKeyToAccount(privateKey);
				const walletAddress = account.address;

				// Step 3: Persist with real address + encrypted key
				setStep("persisting");
				const result = await finalizeAccountCreate({
					treasuryId,
					name,
					tokenSymbol,
					walletAddress,
					walletType: "smart-account",
					privateKey,
				});

				if (result.error) {
					throw new Error(result.error);
				}

				setStep("complete");
				return result.account;
			} catch (err) {
				setStep("error");
				throw err;
			}
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
			toast("Account created!", "success");
			// Reset step after brief delay so UI can show completion
			setTimeout(() => setStep("idle"), 1500);
		},
		onError: (error) => {
			toast(error.message || "Failed to create account", "error");
			setTimeout(() => setStep("idle"), 2000);
		},
	});

	return { ...mutation, step };
}
