"use client";

import { useState, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIDBPersister } from "@/lib/idb-persister";
import { Toaster } from "@/components/ui/toast";
import { initPostHog } from "@/lib/posthog";

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
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              ["balances", "transactions"].some((key) =>
                (query.queryKey as string[]).includes(key),
              ),
          },
        }}
      >
        {children}
        <Toaster />
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
