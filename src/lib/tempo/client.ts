import { createPublicClient, http, type PublicClient } from "viem";
import { TEMPO_RPC_URL, TEMPO_CHAIN_ID, SUPPORTED_TOKENS } from "../constants";
import { tip20Abi } from "./abi";
import type { AccountBalance, Payment } from "./types";

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
): Promise<AccountBalance[]> {
  const client = getTempoClient();
  const tokens = Object.values(SUPPORTED_TOKENS);

  const balances = await Promise.all(
    tokens.map(async (token) => {
      try {
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
      } catch {
        return {
          token: token.name,
          tokenAddress: token.address,
          balance: 0n,
          decimals: token.decimals,
        };
      }
    }),
  );

  return balances;
}

export async function fetchTransactions(
  address: `0x${string}`,
): Promise<Payment[]> {
  const client = getTempoClient();
  const tokens = Object.values(SUPPORTED_TOKENS);

  const allPayments: Payment[] = [];

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

        if (from === address || to === address) {
          allPayments.push({
            id: `${log.transactionHash}-${log.logIndex}`,
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
            timestamp: new Date(),
          });
        }
      }
    } catch {
      // Token contract may not exist on testnet yet
    }
  }

  return allPayments.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}
