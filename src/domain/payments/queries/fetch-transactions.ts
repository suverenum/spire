import { fetchTransactions as tempoFetchTransactions } from "@/lib/tempo/client";
import type { Payment } from "@/lib/tempo/types";

export async function fetchTransactionsForAddress(
  address: `0x${string}`,
): Promise<Payment[]> {
  return tempoFetchTransactions(address);
}
