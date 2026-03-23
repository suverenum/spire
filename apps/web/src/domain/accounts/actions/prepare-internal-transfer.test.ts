import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

const mockFindFirst = vi.fn();

vi.mock("@/db", () => ({
	db: {
		query: { accounts: { findFirst: (...args: unknown[]) => mockFindFirst(...args) } },
	},
}));

vi.mock("@/lib/constants", () => ({
	SUPPORTED_TOKENS: {
		AlphaUSD: {
			name: "AlphaUSD",
			symbol: "AlphaUSD",
			decimals: 6,
			address: "0x20c0000000000000000000000000000000000001",
		},
		BetaUSD: {
			name: "BetaUSD",
			symbol: "BetaUSD",
			decimals: 6,
			address: "0x20c0000000000000000000000000000000000002",
		},
	},
}));

const FROM_ACCOUNT = {
	id: "acc-1",
	treasuryId: DEFAULT_SESSION.treasuryId,
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x20c0000000000000000000000000000000000001",
	walletAddress: "0x1111111111111111111111111111111111111111",
};
const TO_ACCOUNT = {
	id: "acc-2",
	treasuryId: DEFAULT_SESSION.treasuryId,
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x20c0000000000000000000000000000000000001",
	walletAddress: "0x2222222222222222222222222222222222222222",
};

describe("prepareInternalTransfer", () => {
	test("returns both accounts for valid same-token transfer", async () => {
		mockFindFirst.mockResolvedValueOnce(FROM_ACCOUNT).mockResolvedValueOnce(TO_ACCOUNT);
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-2",
		});
		expect(result.error).toBeUndefined();
		expect(result.fromAccount).toBeDefined();
		expect(result.toAccount).toBeDefined();
	});

	test("rejects same source and destination", async () => {
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-1",
		});
		expect(result.error).toBe("Cannot transfer to the same account");
	});

	test("rejects when source not found", async () => {
		mockFindFirst.mockResolvedValueOnce(null);
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "nonexistent",
			toAccountId: "acc-2",
		});
		expect(result.error).toBe("One or both accounts not found");
	});

	test("allows transfer between accounts with different primary tokens", async () => {
		mockFindFirst.mockResolvedValueOnce(FROM_ACCOUNT).mockResolvedValueOnce({
			...TO_ACCOUNT,
			tokenSymbol: "BetaUSD",
			tokenAddress: "0x20c0000000000000000000000000000000000002",
		});
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-2",
		});
		expect(result.error).toBeUndefined();
		expect(result.fromAccount?.tokenSymbol).toBe("AlphaUSD");
	});

	test("uses explicit tokenSymbol and resolves address from SUPPORTED_TOKENS", async () => {
		mockFindFirst.mockResolvedValueOnce(FROM_ACCOUNT).mockResolvedValueOnce(TO_ACCOUNT);
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-2",
			tokenSymbol: "BetaUSD",
		});
		expect(result.error).toBeUndefined();
		expect(result.fromAccount?.tokenSymbol).toBe("BetaUSD");
		expect(result.fromAccount?.tokenAddress).toBe("0x20c0000000000000000000000000000000000002");
		expect(result.toAccount?.tokenSymbol).toBe("BetaUSD");
	});

	test("rejects unsupported tokenSymbol", async () => {
		mockFindFirst.mockResolvedValueOnce(FROM_ACCOUNT).mockResolvedValueOnce(TO_ACCOUNT);
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-2",
			tokenSymbol: "FakeToken",
		});
		expect(result.error).toBe("Unsupported token: FakeToken");
	});

	test("falls back to fromAccount primary token when tokenSymbol not provided", async () => {
		mockFindFirst.mockResolvedValueOnce(FROM_ACCOUNT).mockResolvedValueOnce(TO_ACCOUNT);
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-2",
		});
		expect(result.fromAccount?.tokenSymbol).toBe("AlphaUSD");
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { prepareInternalTransfer } = await import("./prepare-internal-transfer");
		const result = await prepareInternalTransfer({
			fromAccountId: "acc-1",
			toAccountId: "acc-2",
		});
		expect(result.error).toBe("Not authenticated");
	});
});
