import { fetchBalances as tempoFetchBalances } from "@/lib/tempo/client";
import type { AccountBalance } from "@/lib/tempo/types";

export async function fetchBalancesForAddress(
  address: `0x${string}`,
): Promise<AccountBalance[]> {
  return tempoFetchBalances(address);
}
