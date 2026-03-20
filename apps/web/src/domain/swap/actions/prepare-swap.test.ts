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

const ALPHA_ACCOUNT = {
	id: "acc-1",
	treasuryId: DEFAULT_SESSION.treasuryId,
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x20c0000000000000000000000000000000000001",
	walletAddress: "0x1111111111111111111111111111111111111111",
};
const BETA_ACCOUNT = {
	id: "acc-2",
	treasuryId: DEFAULT_SESSION.treasuryId,
	tokenSymbol: "BetaUSD",
	tokenAddress: "0x20c0000000000000000000000000000000000002",
	walletAddress: "0x2222222222222222222222222222222222222222",
};

describe("prepareSwap", () => {
	test("returns accounts for valid different-token swap", async () => {
		mockFindFirst.mockResolvedValueOnce(ALPHA_ACCOUNT).mockResolvedValueOnce(BETA_ACCOUNT);
		const { prepareSwap } = await import("./prepare-swap");
		const result = await prepareSwap({ fromAccountId: "acc-1", toAccountId: "acc-2" });
		expect(result.error).toBeUndefined();
		expect(result.fromAccount).toBeDefined();
		expect(result.toAccount).toBeDefined();
	});

	test("rejects same account", async () => {
		const { prepareSwap } = await import("./prepare-swap");
		const result = await prepareSwap({ fromAccountId: "acc-1", toAccountId: "acc-1" });
		expect(result.error).toBe("Cannot swap to the same account");
	});

	test("rejects same token type (use internal transfer instead)", async () => {
		mockFindFirst.mockResolvedValueOnce(ALPHA_ACCOUNT).mockResolvedValueOnce({
			...ALPHA_ACCOUNT,
			id: "acc-3",
			walletAddress: "0x3333333333333333333333333333333333333333",
		});
		const { prepareSwap } = await import("./prepare-swap");
		const result = await prepareSwap({ fromAccountId: "acc-1", toAccountId: "acc-3" });
		expect(result.error).toContain("Swap requires different token types");
	});

	test("rejects when source not found", async () => {
		mockFindFirst.mockResolvedValueOnce(null);
		const { prepareSwap } = await import("./prepare-swap");
		const result = await prepareSwap({ fromAccountId: "nonexistent", toAccountId: "acc-2" });
		expect(result.error).toBe("One or both accounts not found");
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { prepareSwap } = await import("./prepare-swap");
		const result = await prepareSwap({ fromAccountId: "acc-1", toAccountId: "acc-2" });
		expect(result.error).toBe("Not authenticated");
	});
});
