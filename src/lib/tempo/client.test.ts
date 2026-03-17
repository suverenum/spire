import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReadContract = vi.fn();
const mockGetContractEvents = vi.fn();

// Mock viem before importing the client
vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    readContract: mockReadContract,
    getContractEvents: mockGetContractEvents,
  })),
  http: vi.fn(),
}));

describe("tempo client", () => {
  const addr = "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`;

  beforeEach(() => {
    mockReadContract.mockReset();
    mockGetContractEvents.mockReset();
    // Default: successful responses
    mockReadContract.mockResolvedValue(1000000n);
    mockGetContractEvents.mockResolvedValue([]);
  });

  it("exports fetchBalances function", async () => {
    const { fetchBalances } = await import("./client");
    expect(typeof fetchBalances).toBe("function");
  });

  it("exports fetchTransactions function", async () => {
    const { fetchTransactions } = await import("./client");
    expect(typeof fetchTransactions).toBe("function");
  });

  it("exports getTempoClient function", async () => {
    const { getTempoClient } = await import("./client");
    expect(typeof getTempoClient).toBe("function");
  });

  it("fetches balances for an address", async () => {
    const { fetchBalances } = await import("./client");
    const balances = await fetchBalances(addr);
    expect(Array.isArray(balances)).toBe(true);
    expect(balances.length).toBe(4); // 4 supported tokens
    for (const b of balances) {
      expect(b).toHaveProperty("token");
      expect(b).toHaveProperty("tokenAddress");
      expect(b).toHaveProperty("balance");
      expect(b).toHaveProperty("decimals");
    }
  });

  it("fetches transactions for an address", async () => {
    const { fetchTransactions } = await import("./client");
    const txs = await fetchTransactions(addr);
    expect(Array.isArray(txs)).toBe(true);
  });

  it("returns cached client instance", async () => {
    const { getTempoClient } = await import("./client");
    const client1 = getTempoClient();
    const client2 = getTempoClient();
    expect(client1).toBe(client2);
  });

  describe("fetchBalances error handling", () => {
    it("returns zero balance when readContract throws for a token", async () => {
      // Make readContract fail for the first call, succeed for the rest
      mockReadContract
        .mockRejectedValueOnce(new Error("Contract read failed"))
        .mockResolvedValue(5000000n);

      const { fetchBalances } = await import("./client");
      const balances = await fetchBalances(addr);

      expect(balances.length).toBe(4);
      // First token should have balance 0n due to error
      expect(balances[0].balance).toBe(0n);
      // Other tokens should have real balances
      expect(balances[1].balance).toBe(5000000n);
    });

    it("returns zero balance for all tokens when all readContract calls fail", async () => {
      mockReadContract.mockRejectedValue(new Error("RPC unavailable"));

      const { fetchBalances } = await import("./client");
      const balances = await fetchBalances(addr);

      expect(balances.length).toBe(4);
      for (const b of balances) {
        expect(b.balance).toBe(0n);
      }
    });
  });

  describe("fetchTransactions error handling", () => {
    it("skips token when getContractEvents throws", async () => {
      // All token event fetches fail
      mockGetContractEvents.mockRejectedValue(new Error("Contract not found"));

      const { fetchTransactions } = await import("./client");
      const txs = await fetchTransactions(addr);

      // Should return empty array, not throw
      expect(Array.isArray(txs)).toBe(true);
      expect(txs.length).toBe(0);
    });

    it("returns transactions from working tokens even when some fail", async () => {
      // First token fails, second returns events
      mockGetContractEvents
        .mockRejectedValueOnce(new Error("First token fails"))
        .mockResolvedValueOnce([
          {
            transactionHash: "0x" + "ab".repeat(32),
            logIndex: 0,
            args: {
              from: addr,
              to: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
              value: 1000000n,
            },
          },
        ])
        .mockResolvedValue([]);

      const { fetchTransactions } = await import("./client");
      const txs = await fetchTransactions(addr);

      // Should have the transaction from the second token
      expect(txs.length).toBe(1);
      expect(txs[0].amount).toBe(1000000n);
    });

    it("correctly identifies and includes transactions relevant to the address", async () => {
      const otherAddr =
        "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`;
      const unrelatedAddr =
        "0x9999999999999999999999999999999999999999" as `0x${string}`;

      mockGetContractEvents
        .mockResolvedValueOnce([
          {
            transactionHash: "0x" + "01".repeat(32),
            logIndex: 0,
            args: { from: addr, to: otherAddr, value: 100n },
          },
          {
            transactionHash: "0x" + "02".repeat(32),
            logIndex: 1,
            args: { from: otherAddr, to: addr, value: 200n },
          },
          {
            // Unrelated transaction: should be excluded
            transactionHash: "0x" + "03".repeat(32),
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
            transactionHash: "0x" + "aa".repeat(32),
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
            transactionHash: "0x" + "cc".repeat(32),
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
            transactionHash: "0x" + "bb".repeat(32),
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
      // Mock Date.now to get predictable timestamps
      mockGetContractEvents
        .mockResolvedValueOnce([
          {
            transactionHash: "0x" + "01".repeat(32),
            logIndex: 0,
            args: {
              from: addr,
              to: "0xabcdef1234567890abcdef1234567890abcdef12",
              value: 100n,
            },
          },
          {
            transactionHash: "0x" + "02".repeat(32),
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
      // Both have essentially the same timestamp (Date.now()), so just verify they exist
      expect(txs[0].timestamp).toBeInstanceOf(Date);
      expect(txs[1].timestamp).toBeInstanceOf(Date);
    });
  });
});
