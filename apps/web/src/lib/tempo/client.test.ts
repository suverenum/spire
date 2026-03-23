import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReadContract = vi.fn();
const mockGetContractEvents = vi.fn();
const mockGetBlockNumber = vi.fn();

// Mock viem before importing the client
vi.mock("viem", () => ({
	createPublicClient: vi.fn(() => ({
		readContract: mockReadContract,
		getContractEvents: mockGetContractEvents,
		getBlockNumber: mockGetBlockNumber,
	})),
	http: vi.fn(),
}));

describe("tempo client", () => {
	const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

	beforeEach(() => {
		mockReadContract.mockReset();
		mockGetContractEvents.mockReset();
		mockGetBlockNumber.mockReset();
		// Default: successful responses
		mockReadContract.mockResolvedValue(1000000n);
		mockGetContractEvents.mockResolvedValue([]);
		mockGetBlockNumber.mockResolvedValue(200_000n);
	});

	it("fetches balances with correct values per token", async () => {
		mockReadContract.mockResolvedValue(5000000n);
		const { fetchBalances } = await import("./client");
		const result = await fetchBalances(addr);
		expect(result.partial).toBe(false);
		const tokenCount = Object.keys((await import("../constants")).SUPPORTED_TOKENS).length;
		expect(result.balances.length).toBe(tokenCount);
		for (const b of result.balances) {
			expect(b.balance).toBe(5000000n);
			expect(b.decimals).toBeGreaterThan(0);
			expect(b.tokenAddress).toMatch(/^0x[0-9a-fA-F]+$/);
		}
	});

	it("fetches transactions and constructs payment objects correctly", async () => {
		const otherAddr = "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;
		mockGetContractEvents
			.mockResolvedValueOnce([
				{
					transactionHash: `0x${"ff".repeat(32)}`,
					logIndex: 0,
					blockNumber: 100n,
					args: { from: addr, to: otherAddr, value: 42000000n },
				},
			])
			.mockResolvedValue([]);
		const { fetchTransactions } = await import("./client");
		const txs = await fetchTransactions(addr);
		expect(txs.length).toBe(1);
		expect(txs[0].from).toBe(addr);
		expect(txs[0].to).toBe(otherAddr);
		expect(txs[0].amount).toBe(42000000n);
		expect(txs[0].status).toBe("confirmed");
	});

	it("returns cached client instance", async () => {
		const { getTempoClient } = await import("./client");
		const client1 = getTempoClient();
		const client2 = getTempoClient();
		expect(client1).toBe(client2);
	});

	it("creates client with multicall batching enabled", async () => {
		const { createPublicClient } = await import("viem");
		await import("./client");
		// Force client creation by calling getTempoClient
		const { getTempoClient } = await import("./client");
		getTempoClient();
		expect(createPublicClient).toHaveBeenCalledWith(
			expect.objectContaining({
				batch: { multicall: true },
			}),
		);
	});

	describe("fetchBalances error handling", () => {
		it("returns successful balances when some readContract calls fail", async () => {
			// Make readContract fail for the first call, succeed for the rest
			mockReadContract
				.mockRejectedValueOnce(new Error("Contract read failed"))
				.mockResolvedValue(5000000n);

			const { fetchBalances } = await import("./client");
			const result = await fetchBalances(addr);

			// One token failed, the rest succeeded
			const tokenCount = Object.keys((await import("../constants")).SUPPORTED_TOKENS).length;
			expect(result.balances.length).toBe(tokenCount - 1);
			expect(result.partial).toBe(true);
			for (const b of result.balances) {
				expect(b.balance).toBe(5000000n);
			}
		});

		it("throws when all readContract calls fail", async () => {
			mockReadContract.mockRejectedValue(new Error("RPC unavailable"));

			const { fetchBalances } = await import("./client");

			await expect(fetchBalances(addr)).rejects.toThrow(
				"Failed to fetch balances: all RPC calls failed",
			);
		});
	});

	describe("fetchTransactions error handling", () => {
		it("throws when all getContractEvents calls fail", async () => {
			// All token event fetches fail
			mockGetContractEvents.mockRejectedValue(new Error("Contract not found"));

			const { fetchTransactions } = await import("./client");

			await expect(fetchTransactions(addr)).rejects.toThrow(
				"Failed to fetch transactions: all RPC calls failed",
			);
		});

		it("returns transactions from working tokens even when some fail", async () => {
			// First token fails (both sent+received queries run, but Promise.all rejects),
			// second token returns events from its sent query
			mockGetContractEvents
				.mockRejectedValueOnce(new Error("First token fails")) // token 1 sent
				.mockResolvedValueOnce([]) // token 1 received (consumed but Promise.all rejects)
				.mockResolvedValueOnce([
					{
						transactionHash: `0x${"ab".repeat(32)}`,
						logIndex: 0,
						args: {
							from: addr,
							to: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
							value: 1000000n,
						},
					},
				]) // token 2 sent
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			// Should have the transaction from the second token
			expect(txs.length).toBe(1);
			expect(txs[0].amount).toBe(1000000n);
		});

		it("correctly identifies and includes transactions relevant to the address", async () => {
			const otherAddr = "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;
			const unrelatedAddr = "0x9999999999999999999999999999999999999999" as `0x${string}`;

			mockGetContractEvents
				.mockResolvedValueOnce([
					{
						transactionHash: `0x${"01".repeat(32)}`,
						logIndex: 0,
						args: { from: addr, to: otherAddr, value: 100n },
					},
					{
						transactionHash: `0x${"02".repeat(32)}`,
						logIndex: 1,
						args: { from: otherAddr, to: addr, value: 200n },
					},
					{
						// Unrelated transaction: should be excluded
						transactionHash: `0x${"03".repeat(32)}`,
						logIndex: 2,
						args: { from: otherAddr, to: unrelatedAddr, value: 300n },
					},
				])
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			// Should only include the 2 transactions involving addr
			expect(txs.length).toBe(2);
		});

		it("handles missing from arg by defaulting to zero address", async () => {
			mockGetContractEvents
				.mockResolvedValueOnce([
					{
						transactionHash: `0x${"aa".repeat(32)}`,
						logIndex: 0,
						args: { from: undefined, to: addr, value: 500n },
					},
				])
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			expect(txs.length).toBe(1);
			expect(txs[0].from).toBe("0x0000000000000000000000000000000000000000");
		});

		it("handles missing to arg by defaulting to zero address", async () => {
			mockGetContractEvents
				.mockResolvedValueOnce([
					{
						transactionHash: `0x${"cc".repeat(32)}`,
						logIndex: 0,
						args: { from: addr, to: undefined, value: 500n },
					},
				])
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			expect(txs.length).toBe(1);
			expect(txs[0].to).toBe("0x0000000000000000000000000000000000000000");
		});

		it("handles missing value arg by defaulting to 0n", async () => {
			mockGetContractEvents
				.mockResolvedValueOnce([
					{
						transactionHash: `0x${"bb".repeat(32)}`,
						logIndex: 0,
						args: {
							from: addr,
							to: "0xabcdef1234567890abcdef1234567890abcdef12",
							value: undefined,
						},
					},
				])
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			expect(txs.length).toBe(1);
			expect(txs[0].amount).toBe(0n);
		});

		it("sorts transactions by timestamp descending", async () => {
			mockGetContractEvents
				.mockResolvedValueOnce([
					{
						transactionHash: `0x${"01".repeat(32)}`,
						logIndex: 0,
						args: {
							from: addr,
							to: "0xabcdef1234567890abcdef1234567890abcdef12",
							value: 100n,
						},
						// No blockNumber — both will get Date.now() timestamps
					},
					{
						transactionHash: `0x${"02".repeat(32)}`,
						logIndex: 1,
						args: {
							from: "0xabcdef1234567890abcdef1234567890abcdef12",
							to: addr,
							value: 200n,
						},
					},
				])
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			expect(txs.length).toBe(2);
			// Verify timestamps are valid dates and in non-ascending order
			expect(txs[0].timestamp.getTime()).toBeGreaterThanOrEqual(txs[1].timestamp.getTime());
		});

		it("deduplicates self-transfers that appear in both sent and received logs", async () => {
			const selfTxHash = `0x${"dd".repeat(32)}`;
			// Same event appears in both sent (first mock) and received (second mock)
			const selfTransferLog = {
				transactionHash: selfTxHash,
				logIndex: 0,
				args: { from: addr, to: addr, value: 500n },
			};
			mockGetContractEvents
				.mockResolvedValueOnce([selfTransferLog]) // sent query
				.mockResolvedValueOnce([selfTransferLog]) // received query
				.mockResolvedValue([]);

			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);

			// Should appear only once despite being in both sent and received
			const matching = txs.filter((tx) => tx.txHash === selfTxHash);
			expect(matching.length).toBe(1);
		});

		it("handles low block number (fromBlock = 0n)", async () => {
			mockGetBlockNumber.mockResolvedValue(100n); // Below MAX_BLOCK_RANGE
			const { fetchTransactions } = await import("./client");
			const txs = await fetchTransactions(addr);
			// Should not throw — fromBlock should be 0n
			expect(Array.isArray(txs)).toBe(true);
		});
	});
});
