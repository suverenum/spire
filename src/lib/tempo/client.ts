import { createPublicClient, http, type PublicClient } from "viem";
import { TEMPO_RPC_URL, TEMPO_CHAIN_ID, SUPPORTED_TOKENS } from "../constants";
import { tip20Abi } from "./abi";
import type { AccountBalance, BalancesResult, Payment } from "./types";

const tempoChain = {
  id: TEMPO_CHAIN_ID,
  name: "Tempo Testnet",
  nativeCurrency: { name: "TEMPO", symbol: "TEMPO", decimals: 18 },
  rpcUrls: {
    default: { http: [TEMPO_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Tempo Explorer", url: "https://explore.tempo.xyz" },
  },
} as const;

let clientInstance: PublicClient | null = null;

export function getTempoClient(): PublicClient {
  if (!clientInstance) {
    clientInstance = createPublicClient({
      chain: tempoChain,
      transport: http(TEMPO_RPC_URL),
    });
  }
  return clientInstance;
}

export async function fetchBalances(
  address: `0x${string}`,
): Promise<BalancesResult> {
  const client = getTempoClient();
  const tokens = Object.values(SUPPORTED_TOKENS);

  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const balance = (await client.readContract({
        address: token.address,
        abi: tip20Abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      return {
        token: token.name,
        tokenAddress: token.address,
        balance,
        decimals: token.decimals,
      };
    }),
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === results.length) {
    throw new Error("Failed to fetch balances: all RPC calls failed");
  }

  const balances: AccountBalance[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      balances.push(r.value);
    }
  }
  return { balances, partial: failures.length > 0 };
}

export async function fetchTransactions(
  address: `0x${string}`,
): Promise<Payment[]> {
  const client = getTempoClient();
  const tokens = Object.values(SUPPORTED_TOKENS);

  const allPayments: Payment[] = [];
  const blockTimestamps = new Map<bigint, Date>();

  let failures = 0;
  for (const token of tokens) {
    try {
      const logs = await client.getContractEvents({
        address: token.address,
        abi: tip20Abi,
        eventName: "Transfer",
        fromBlock: "earliest",
        toBlock: "latest",
      });

      for (const log of logs) {
        const args = log.args as {
          from?: `0x${string}`;
          to?: `0x${string}`;
          value?: bigint;
        };
        const from = args.from;
        const to = args.to;

        const addrLower = address.toLowerCase();
        if (
          from?.toLowerCase() === addrLower ||
          to?.toLowerCase() === addrLower
        ) {
          const blockNumber = log.blockNumber;
          if (blockNumber != null && !blockTimestamps.has(blockNumber)) {
            try {
              const block = await client.getBlock({ blockNumber });
              blockTimestamps.set(
                blockNumber,
                new Date(Number(block.timestamp) * 1000),
              );
            } catch {
              blockTimestamps.set(blockNumber, new Date());
            }
          }

          allPayments.push({
            id: `${log.transactionHash}-${log.logIndex ?? 0}`,
            txHash: log.transactionHash as `0x${string}`,
            from:
              from ??
              ("0x0000000000000000000000000000000000000000" as `0x${string}`),
            to:
              to ??
              ("0x0000000000000000000000000000000000000000" as `0x${string}`),
            amount: args.value ?? 0n,
            token: token.name,
            status: "confirmed",
            timestamp:
              blockNumber != null
                ? (blockTimestamps.get(blockNumber) ?? new Date())
                : new Date(),
          });
        }
      }
    } catch (err) {
      failures++;
      console.error(`Failed to fetch ${token.name} transactions:`, err);
    }
  }

  if (failures === tokens.length) {
    throw new Error("Failed to fetch transactions: all RPC calls failed");
  }

  return allPayments.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}
