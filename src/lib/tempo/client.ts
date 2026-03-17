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

  // Fetch events for all tokens in parallel
  const tokenResults = await Promise.allSettled(
    tokens.map(async (token) => {
      const logs = await client.getContractEvents({
        address: token.address,
        abi: tip20Abi,
        eventName: "Transfer",
        fromBlock: "earliest",
        toBlock: "latest",
      });
      return { token, logs };
    }),
  );

  const failures = tokenResults.filter((r) => r.status === "rejected").length;
  if (failures === tokens.length) {
    throw new Error("Failed to fetch transactions: all RPC calls failed");
  }

  // Collect matching logs and unique block numbers
  const addrLower = address.toLowerCase();
  const matchedLogs: Array<{
    log: (typeof tokenResults)[number] extends PromiseFulfilledResult<infer T>
      ? T["logs"][number]
      : never;
    token: string;
  }> = [];
  const blockNumbers = new Set<bigint>();

  for (const result of tokenResults) {
    if (result.status !== "fulfilled") continue;
    const { token, logs } = result.value;
    for (const log of logs) {
      const args = log.args as {
        from?: `0x${string}`;
        to?: `0x${string}`;
        value?: bigint;
      };
      if (
        args.from?.toLowerCase() === addrLower ||
        args.to?.toLowerCase() === addrLower
      ) {
        matchedLogs.push({ log, token: token.name });
        if (log.blockNumber != null) {
          blockNumbers.add(log.blockNumber);
        }
      }
    }
  }

  // Fetch all block timestamps in parallel
  const blockTimestamps = new Map<bigint, Date>();
  const blockEntries = await Promise.allSettled(
    [...blockNumbers].map(async (blockNumber) => {
      const block = await client.getBlock({ blockNumber });
      return {
        blockNumber,
        timestamp: new Date(Number(block.timestamp) * 1000),
      };
    }),
  );

  for (const entry of blockEntries) {
    if (entry.status === "fulfilled") {
      blockTimestamps.set(entry.value.blockNumber, entry.value.timestamp);
    }
  }

  // Build payment objects
  const allPayments: Payment[] = matchedLogs.map(({ log, token }) => {
    const args = log.args as {
      from?: `0x${string}`;
      to?: `0x${string}`;
      value?: bigint;
    };
    const blockNumber = log.blockNumber;
    return {
      id: `${log.transactionHash}-${log.logIndex ?? 0}`,
      txHash: log.transactionHash as `0x${string}`,
      from:
        args.from ??
        ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      to:
        args.to ??
        ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      amount: args.value ?? 0n,
      token,
      status: "confirmed",
      timestamp:
        blockNumber != null
          ? (blockTimestamps.get(blockNumber) ?? new Date())
          : new Date(),
    };
  });

  return allPayments.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}
