"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { finalizeAccountCreate } from "@/domain/accounts/actions/create-account";
import { CACHE_KEYS, TEMPO_RPC_URL } from "@/lib/constants";

interface SetupDefaultAccountsParams {
	treasuryId: string;
}

const DEFAULT_ACCOUNTS = [
	{ name: "Main AlphaUSD", tokenSymbol: "AlphaUSD" },
	{ name: "Main BetaUSD", tokenSymbol: "BetaUSD" },
] as const;

/**
 * Client mutation to provision default account wallets during treasury creation.
 * In production: creates on-chain wallets, registers root passkey on each keychain,
 * calls faucet for each wallet, then persists DB rows with isDefault: true.
 */
export function useSetupDefaultAccounts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ treasuryId }: SetupDefaultAccountsParams) => {
			const results: { name: string; success: boolean; error?: string }[] = [];

			for (const defaultAccount of DEFAULT_ACCOUNTS) {
				try {
					// In production: create wallet on-chain, register passkey
					const walletAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

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
			existingAccounts,
		}: {
			treasuryId: string;
			existingAccounts: { tokenSymbol: string; isDefault: boolean }[];
		}) => {
			const existingDefaults = new Set(
				existingAccounts.filter((a) => a.isDefault).map((a) => a.tokenSymbol),
			);

			const missing = DEFAULT_ACCOUNTS.filter(
				(d) => !existingDefaults.has(d.tokenSymbol),
			);

			if (missing.length === 0) return [];

			const results: { name: string; success: boolean }[] = [];

			for (const defaultAccount of missing) {
				try {
					const walletAddress = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

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
