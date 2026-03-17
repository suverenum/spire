"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/lib/constants";
import type { AccountBalance } from "@/lib/tempo/types";

async function fetchBalancesClient(address: string): Promise<AccountBalance[]> {
  const res = await fetch(
    `/api/balances?address=${encodeURIComponent(address)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch balances");
  const data = await res.json();
  return data.balances.map(
    (b: {
      token: string;
      tokenAddress: string;
      balance: string;
      decimals: number;
    }) => ({
      ...b,
      balance: BigInt(b.balance),
    }),
  );
}

export function useBalances(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: CACHE_KEYS.balances(address ?? ""),
    queryFn: () => fetchBalancesClient(address!),
    enabled: !!address,
    placeholderData: keepPreviousData,
  });
}
