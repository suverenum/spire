"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
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
		<div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
			<div className="w-full max-w-sm text-center">
				<div className="mb-6">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-900">
						<Fingerprint className="h-10 w-10 text-white" />
					</div>
					<h1 className="text-2xl font-semibold">Goldhord</h1>
					<p className="mt-1 text-sm text-gray-500">Treasury management on Tempo blockchain</p>
				</div>

				{error && (
					<p className="mb-4 text-sm text-red-600" role="alert">
						{error}
					</p>
				)}

				<div className="space-y-3">
					<Button onClick={handleUnlock} disabled={isPending} size="lg" className="w-full">
						<Fingerprint className="h-5 w-5" />
						{isPending ? "Authenticating..." : "Unlock with Passkey"}
					</Button>

					<Button
						variant="outline"
						size="lg"
						className="w-full"
						onClick={() => router.push("/create")}
						disabled={isPending}
					>
						<Plus className="h-5 w-5" />
						Create Treasury
					</Button>
				</div>
			</div>
		</div>
	);
}
