"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { finalizeAccountCreate } from "@/domain/accounts/actions/create-account";
import { CACHE_KEYS, DEFAULT_ACCOUNTS, TEMPO_RPC_URL } from "@/lib/constants";

interface SetupDefaultAccountsParams {
	treasuryId: string;
	tempoAddress: string;
}

/**
 * Client mutation to provision default account wallets during treasury creation.
 * The default Main account uses the passkey address as its wallet — this is the
 * user's on-chain identity and the address that holds tokens.
 */
export function useSetupDefaultAccounts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ treasuryId, tempoAddress }: SetupDefaultAccountsParams) => {
			const results: { name: string; success: boolean; error?: string }[] = [];

			for (const defaultAccount of DEFAULT_ACCOUNTS) {
				try {
					// Use the passkey address as the wallet for the default account
					const walletAddress = tempoAddress;

					// Persist DB row
					const result = await finalizeAccountCreate({
						treasuryId,
						name: defaultAccount.name,
						tokenSymbol: defaultAccount.tokenSymbol,
						walletAddress,
						isDefault: true,
					});

					if (result.error) {
						results.push({
							name: defaultAccount.name,
							success: false,
							error: result.error,
						});
						continue;
					}

					// Fund via faucet (fire-and-forget)
					fetch(TEMPO_RPC_URL, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							jsonrpc: "2.0",
							method: "tempo_fundAddress",
							params: [walletAddress],
							id: 1,
						}),
					}).catch(() => {
						// Faucet failure is non-fatal on testnet
					});

					results.push({ name: defaultAccount.name, success: true });
				} catch (err) {
					results.push({
						name: defaultAccount.name,
						success: false,
						error: err instanceof Error ? err.message : "Unknown error",
					});
				}
			}

			return results;
		},
		onSuccess: (results, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
			const failed = results.filter((r) => !r.success);
			if (failed.length > 0) {
				toast(
					`Some default accounts failed to create: ${failed.map((f) => f.name).join(", ")}`,
					"error",
				);
			}
		},
	});
}

/**
 * Retry setup for missing default accounts only.
 * Checks which default accounts already exist and provisions only the missing ones.
 */
export function useRetryDefaultAccountSetup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			treasuryId,
			tempoAddress,
			existingAccounts,
		}: {
			treasuryId: string;
			tempoAddress: string;
			existingAccounts: { tokenSymbol: string; isDefault: boolean }[];
		}) => {
			const existingDefaults = new Set(
				existingAccounts.filter((a) => a.isDefault).map((a) => a.tokenSymbol),
			);

			const missing = DEFAULT_ACCOUNTS.filter((d) => !existingDefaults.has(d.tokenSymbol));

			if (missing.length === 0) return [];

			const results: { name: string; success: boolean }[] = [];

			for (const defaultAccount of missing) {
				try {
					const walletAddress = tempoAddress;

					const result = await finalizeAccountCreate({
						treasuryId,
						name: defaultAccount.name,
						tokenSymbol: defaultAccount.tokenSymbol,
						walletAddress,
						isDefault: true,
					});

					if (result.error) {
						results.push({ name: defaultAccount.name, success: false });
						continue;
					}

					// Fund via faucet
					fetch(TEMPO_RPC_URL, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							jsonrpc: "2.0",
							method: "tempo_fundAddress",
							params: [walletAddress],
							id: 1,
						}),
					}).catch(() => {});

					results.push({ name: defaultAccount.name, success: true });
				} catch {
					results.push({ name: defaultAccount.name, success: false });
				}
			}

			return results;
		},
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: CACHE_KEYS.accounts(variables.treasuryId),
			});
		},
	});
}
