"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { Toaster } from "@/components/ui/toast";
import { createIDBPersister } from "@/lib/idb-persister";
import { initPostHog } from "@/lib/posthog";
import { wagmiConfig } from "@/lib/wagmi";

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5_000,
				gcTime: 5 * 60_000,
				retry: 2,
				refetchOnWindowFocus: true,
			},
		},
	});
}

let browserPersister: ReturnType<typeof createIDBPersister> | null = null;

function getPersister() {
	if (typeof window === "undefined") return null;
	if (!browserPersister) {
		browserPersister = createIDBPersister("spire-cache");
	}
	return browserPersister;
}

export async function clearPersistedCache() {
	try {
		const persister = getPersister();
		if (persister) {
			await persister.removeClient();
		}
	} catch {
		// IndexedDB may not be available in all environments
	}
}

export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(makeQueryClient);
	const persister = getPersister();

	useEffect(() => {
		initPostHog();
	}, []);

	if (persister) {
		return (
			<WagmiProvider config={wagmiConfig}>
				<PersistQueryClientProvider
					client={queryClient}
					persistOptions={{
						persister,
						maxAge: 1000 * 60 * 60 * 24,
						dehydrateOptions: {
							shouldDehydrateQuery: (query) => {
								const prefix = query.queryKey[0];
								return (
									query.state.status === "success" &&
									(prefix === "balances" || prefix === "transactions")
								);
							},
						},
					}}
				>
					{children}
					<Toaster />
				</PersistQueryClientProvider>
			</WagmiProvider>
		);
	}

	return (
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				{children}
				<Toaster />
			</QueryClientProvider>
		</WagmiProvider>
	);
}
