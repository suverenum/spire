import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockFindFirstWallet = vi.fn();
const mockFindFirstAccount = vi.fn();
const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("@/db", () => ({
	db: {
		query: {
			agentWallets: { findFirst: (...args: unknown[]) => mockFindFirstWallet(...args) },
			accounts: { findFirst: (...args: unknown[]) => mockFindFirstAccount(...args) },
		},
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

const WALLET = { id: "w-1", accountId: "acc-1" };
const ACCOUNT = { id: "acc-1", treasuryId: DEFAULT_SESSION.treasuryId };

describe("updateAgentLimits", () => {
	test("updates limits successfully with BigInt conversion", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { updateAgentLimits } = await import("./update-agent-limits");
		const result = await updateAgentLimits({
			walletId: "w-1",
			maxPerTx: "2000000",
			dailyLimit: "10000000",
		});
		expect(result.error).toBeUndefined();
		// Verify BigInt conversion happened
		expect(mockSet).toHaveBeenCalledWith({
			maxPerTx: 2000000n,
			dailyLimit: 10000000n,
		});
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { updateAgentLimits } = await import("./update-agent-limits");
		const result = await updateAgentLimits({
			walletId: "w-1",
			maxPerTx: "2000000",
			dailyLimit: "10000000",
		});
		expect(result.error).toBe("Not authenticated");
	});

	test("rejects when wallet not found", async () => {
		mockFindFirstWallet.mockResolvedValue(null);
		const { updateAgentLimits } = await import("./update-agent-limits");
		const result = await updateAgentLimits({
			walletId: "nonexistent",
			maxPerTx: "2000000",
			dailyLimit: "10000000",
		});
		expect(result.error).toBe("Agent wallet not found");
	});

	test("rejects when not authorized", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue({ ...ACCOUNT, treasuryId: "wrong" });
		const { updateAgentLimits } = await import("./update-agent-limits");
		const result = await updateAgentLimits({
			walletId: "w-1",
			maxPerTx: "2000000",
			dailyLimit: "10000000",
		});
		expect(result.error).toBe("Not authorized");
	});

	test("handles large BigInt values correctly", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { updateAgentLimits } = await import("./update-agent-limits");
		const result = await updateAgentLimits({
			walletId: "w-1",
			maxPerTx: "999999999999999999",
			dailyLimit: "999999999999999999999",
		});
		expect(result.error).toBeUndefined();
		expect(mockSet).toHaveBeenCalledWith({
			maxPerTx: 999999999999999999n,
			dailyLimit: 999999999999999999999n,
		});
	});
});
