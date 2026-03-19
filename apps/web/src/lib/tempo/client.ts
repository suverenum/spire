import { createPublicClient, http, type PublicClient } from "viem";
import { SUPPORTED_TOKENS, TEMPO_CHAIN_ID, TEMPO_RPC_URL } from "../constants";
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

export async function fetchBalances(address: `0x${string}`): Promise<BalancesResult> {
	const client = getTempoClient();
	const tokens = Object.values(SUPPORTED_TOKENS);

	const results = await Promise.allSettled(
		tokens.map(async (token) => {
			const balance = await client.readContract({
				address: token.address,
				abi: tip20Abi,
				functionName: "balanceOf",
				args: [address],
			});
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

const MAX_BLOCK_RANGE = 99_000n;

export async function fetchTransactions(address: `0x${string}`): Promise<Payment[]> {
	const client = getTempoClient();
	const tokens = Object.values(SUPPORTED_TOKENS);

	const latestBlock = await client.getBlockNumber();
	const fromBlock = latestBlock > MAX_BLOCK_RANGE ? latestBlock - MAX_BLOCK_RANGE : 0n;

	// Fetch sent and received events per token using indexed topic filters
	// so the RPC node filters by address instead of returning all chain events
	const tokenResults = await Promise.allSettled(
		tokens.map(async (token) => {
			const [sentLogs, receivedLogs] = await Promise.all([
				client.getContractEvents({
					address: token.address,
					abi: tip20Abi,
					eventName: "Transfer",
					args: { from: address },
					fromBlock,
					toBlock: latestBlock,
				}),
				client.getContractEvents({
					address: token.address,
					abi: tip20Abi,
					eventName: "Transfer",
					args: { to: address },
					fromBlock,
					toBlock: latestBlock,
				}),
			]);
			// Deduplicate self-transfers that appear in both queries
			const seen = new Set<string>();
			const logs = [...sentLogs, ...receivedLogs].filter((log) => {
				const key = `${log.transactionHash}-${log.logIndex ?? 0}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
			return { token, logs };
		}),
	);

	const rejections = tokenResults.filter((r) => r.status === "rejected");
	if (rejections.length > 0) {
		for (const r of rejections) {
			console.error("RPC call failed:", (r as PromiseRejectedResult).reason);
		}
	}
	if (rejections.length === tokens.length) {
		throw new Error("Failed to fetch transactions: all RPC calls failed");
	}

	// Collect matching logs and unique block numbers
	const addrLower = address.toLowerCase();
	type FulfilledTokenResult = Extract<(typeof tokenResults)[number], { status: "fulfilled" }>;
	const matchedLogs: Array<{
		log: FulfilledTokenResult["value"]["logs"][number];
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
			if (args.from?.toLowerCase() === addrLower || args.to?.toLowerCase() === addrLower) {
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
			txHash: log.transactionHash,
			from: args.from ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
			to: args.to ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
			amount: args.value ?? 0n,
			token,
			status: "confirmed",
			timestamp:
				blockNumber != null ? (blockTimestamps.get(blockNumber) ?? new Date()) : new Date(),
		};
	});

	return allPayments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
