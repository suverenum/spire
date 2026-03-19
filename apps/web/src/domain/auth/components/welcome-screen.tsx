"use client";

import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConnect, useDisconnect } from "wagmi";
import { PasskeyIcon } from "@/components/icons";
import { fetchBalancesClient } from "@/domain/payments/hooks/use-balances";
import { fetchTransactionsClient } from "@/domain/payments/hooks/use-transactions";
import { CACHE_KEYS } from "@/lib/constants";
import { loginAction } from "../actions/auth-actions";

export function WelcomeScreen() {
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const { connectAsync, connectors } = useConnect();
	const { disconnectAsync } = useDisconnect();
	const queryClient = useQueryClient();
	const router = useRouter();

	function handleUnlock() {
		setError(null);
		startTransition(async () => {
			try {
				if (!connectors[0]) {
					setError("Passkey authentication is not available in this browser");
					return;
				}
				await disconnectAsync().catch(() => {});
				const result = await connectAsync({ connector: connectors[0] });
				const address = result.accounts[0];
				if (!address) {
					setError("No account returned from passkey");
					return;
				}

				const loginResult = await loginAction(address);
				if (loginResult?.error) {
					setError(loginResult.error);
					return;
				}

				const tempoAddress = loginResult.tempoAddress ?? address;

				// Prefetch dashboard data so it's ready on arrival
				void queryClient.prefetchQuery({
					queryKey: CACHE_KEYS.balances(tempoAddress),
					queryFn: () => fetchBalancesClient(tempoAddress),
				});
				void queryClient.prefetchQuery({
					queryKey: CACHE_KEYS.transactions(tempoAddress),
					queryFn: () => fetchTransactionsClient(tempoAddress),
				});

				router.push("/dashboard");
			} catch (err) {
				setError(err instanceof Error ? err.message : "Passkey authentication failed");
			}
		});
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-[rgb(10,10,10)]">
			<div className="w-full max-w-[240px] text-center">
				<div className="mb-8">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
						<Image src="/icon.svg" alt="Goldhord" width={62} height={62} priority />
					</div>
					<h1 className="text-2xl font-semibold">Goldhord</h1>
					<p className="mt-2 text-sm text-muted-foreground">Home for your AI agent wallets</p>
				</div>

				{error && (
					<p className="mb-4 text-sm text-red-600" role="alert">
						{error}
					</p>
				)}

				<div className="flex flex-col gap-3">
					<button
						type="button"
						onClick={handleUnlock}
						disabled={isPending}
						className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
					>
						<span className="flex items-center justify-center gap-2">
							<PasskeyIcon className="h-5 w-5" />
							{isPending ? "Authenticating..." : "Login with Passkey"}
						</span>
					</button>

					<button
						type="button"
						onClick={() => router.push("/create")}
						disabled={isPending}
						className="w-full cursor-pointer rounded-lg bg-[rgb(28,28,29)] px-4 py-2.5 text-[13px] font-medium text-white/80 transition-all hover:opacity-80 disabled:opacity-50"
					>
						Sign up
					</button>
				</div>
			</div>
		</div>
	);
}
