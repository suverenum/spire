import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/db", () => ({
	db: {
		query: {
			agentWallets: { findMany: () => mockFindMany() },
			accounts: { findFirst: vi.fn((..._args: unknown[]) => mockFindFirst()) },
		},
	},
}));

describe("getAgentWallets", () => {
	test("returns wallets belonging to current treasury", async () => {
		mockFindMany.mockResolvedValue([
			{
				id: "w-1",
				accountId: "acc-1",
				label: "Bot",
				guardianAddress: "0x4444",
				agentKeyAddress: "0x3333",
				spendingCap: 50000000n,
				dailyLimit: 10000000n,
				maxPerTx: 2000000n,
				allowedVendors: [],
				status: "active",
				deployedAt: new Date("2025-06-01"),
				createdAt: new Date("2025-06-01"),
			},
		]);
		mockFindFirst.mockResolvedValue({
			id: "acc-1",
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			tokenAddress: "0x20c0",
		});
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets).toHaveLength(1);
		expect(wallets[0].label).toBe("Bot");
		expect(wallets[0].spendingCap).toBe("50000000");
	});

	test("filters out wallets from other treasuries", async () => {
		mockFindMany.mockResolvedValue([
			{
				id: "w-1",
				accountId: "acc-1",
				label: "My Bot",
				guardianAddress: "0x4444",
				agentKeyAddress: "0x3333",
				spendingCap: 50000000n,
				dailyLimit: 10000000n,
				maxPerTx: 2000000n,
				allowedVendors: [],
				status: "active",
				deployedAt: new Date(),
				createdAt: new Date(),
			},
		]);
		mockFindFirst.mockResolvedValue({
			id: "acc-1",
			treasuryId: "different-treasury",
			tokenSymbol: "AlphaUSD",
			tokenAddress: "0x20c0",
		});
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets).toHaveLength(0);
	});

	test("returns empty array when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets).toEqual([]);
	});

	test("converts BigInt fields to strings", async () => {
		mockFindMany.mockResolvedValue([
			{
				id: "w-1",
				accountId: "acc-1",
				label: "Bot",
				guardianAddress: "0x4444",
				agentKeyAddress: "0x3333",
				spendingCap: 999999999n,
				dailyLimit: 888888888n,
				maxPerTx: 777777777n,
				allowedVendors: [],
				status: "active",
				deployedAt: new Date("2025-01-01"),
				createdAt: new Date(),
			},
		]);
		mockFindFirst.mockResolvedValue({
			id: "acc-1",
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			tokenAddress: "0x20c0",
		});
		const { getAgentWallets } = await import("./get-agents");
		const wallets = await getAgentWallets();
		expect(wallets[0].spendingCap).toBe("999999999");
		expect(wallets[0].dailyLimit).toBe("888888888");
		expect(wallets[0].maxPerTx).toBe("777777777");
	});
});
