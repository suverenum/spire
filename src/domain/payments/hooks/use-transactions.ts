"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { CACHE_KEYS } from "@/lib/constants";
import type { Payment } from "@/lib/tempo/types";

async function fetchTransactionsClient(address: string): Promise<Payment[]> {
  const res = await fetch(
    `/api/transactions?address=${encodeURIComponent(address)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch transactions");
  const data = await res.json();
  return data.transactions.map(
    (t: {
      id: string;
      txHash: string;
      from: string;
      to: string;
      amount: string;
      token: string;
      memo?: string;
      status: string;
      timestamp: string;
    }) => ({
      ...t,
      amount: BigInt(t.amount),
      timestamp: new Date(t.timestamp),
    }),
  );
}

export function useTransactions(address: `0x${string}` | undefined) {
  return useQuery({
    queryKey: CACHE_KEYS.transactions(address ?? ""),
    queryFn: () => fetchTransactionsClient(address!),
    enabled: !!address,
    placeholderData: keepPreviousData,
  });
}
