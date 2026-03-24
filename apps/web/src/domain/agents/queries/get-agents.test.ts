import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

const mockWhere = vi.fn();
const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

vi.mock("@/db", () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
	},
}));

const MOCK_ROW = {
	id: "w-1",
	accountId: "acc-1",
	label: "Bot",
	guardianAddress: "0x4444",
	agentKeyAddress: "0x3333",
	spendingCap: 50000000n,
	dailyLimit: 10000000n,
	maxPerTx: 2000000n,
	allowedVendors: [] as string[],
	status: "active",
	deployedAt: new Date("2025-06-01"),
	tokenSymbol: "AlphaUSD",
	tokenAddress: "0x20c0",
};

describe("getAgentWallets", () => {
	beforeEach(() => {
		mockSelect.mockClear();
		mockFrom.mockClear();
		mockInnerJoin.mockClear();
		mockWhere.mockClear();
	});

	test("returns wallets belonging to current treasury via JOIN", async () => {
		mockWhere.mockResolvedValue([MOCK_ROW]);
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets).toHaveLength(1);
		expect(wallets[0].label).toBe("Bot");
		expect(wallets[0].spendingCap).toBe("50000000");
		expect(wallets[0].tokenSymbol).toBe("AlphaUSD");
	});

	test("uses a single query (no N+1)", async () => {
		mockWhere.mockResolvedValue([MOCK_ROW]);
		const { getAgentWallets } = await import("./get-agents");
		await getAgentWallets();
		// Verify: one select call, one from, one innerJoin, one where
		expect(mockSelect).toHaveBeenCalledTimes(1);
		expect(mockFrom).toHaveBeenCalledTimes(1);
		expect(mockInnerJoin).toHaveBeenCalledTimes(1);
	});

	test("returns empty array when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets).toEqual([]);
	});

	test("converts BigInt fields to strings", async () => {
		mockWhere.mockResolvedValue([
			{
				...MOCK_ROW,
				spendingCap: 999999999n,
				dailyLimit: 888888888n,
				maxPerTx: 777777777n,
			},
		]);
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets[0].spendingCap).toBe("999999999");
		expect(wallets[0].dailyLimit).toBe("888888888");
		expect(wallets[0].maxPerTx).toBe("777777777");
	});

	test("returns empty array when no wallets exist", async () => {
		mockWhere.mockResolvedValue([]);
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets).toEqual([]);
	});

	test("converts deployedAt to ISO string", async () => {
		mockWhere.mockResolvedValue([MOCK_ROW]);
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets[0].deployedAt).toBe("2025-06-01T00:00:00.000Z");
	});
});
