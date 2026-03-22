import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

const mockFindFirst = vi.fn();
const mockDelete = vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) }));

vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: { findFirst: (...args: unknown[]) => mockFindFirst(args[0]) },
		},
		delete: () => mockDelete(),
	},
}));

const mockFetchBalances = vi.fn();
vi.mock("@/lib/tempo/client", () => ({
	fetchBalances: (...args: unknown[]) => mockFetchBalances(...args),
}));

const ACCOUNT = {
	id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	treasuryId: DEFAULT_SESSION.treasuryId,
	walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
	tokenAddress: "0x20c0000000000000000000000000000000000001",
	tokenSymbol: "AlphaUSD",
	isDefault: false,
};

describe("prepareDeleteAccount", () => {
	test("returns ready when balance is zero", async () => {
		mockFindFirst.mockResolvedValue(ACCOUNT);
		mockFetchBalances.mockResolvedValue({
			balances: [{ tokenAddress: ACCOUNT.tokenAddress, token: "AlphaUSD", balance: 0n }],
			partial: false,
		});

		const { prepareDeleteAccount } = await import("./delete-account");
		const result = await prepareDeleteAccount(ACCOUNT.id);
		expect(result.status).toBe("ready");
	});

	test("returns blocked when assigned token has balance", async () => {
		mockFindFirst.mockResolvedValue(ACCOUNT);
		mockFetchBalances.mockResolvedValue({
			balances: [{ tokenAddress: ACCOUNT.tokenAddress, token: "AlphaUSD", balance: 5_000_000n }],
			partial: false,
		});

		const { prepareDeleteAccount } = await import("./delete-account");
		const result = await prepareDeleteAccount(ACCOUNT.id);
		expect(result.status).toBe("blocked");
	});

	test("throws for not authenticated", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);

		const { prepareDeleteAccount } = await import("./delete-account");
		await expect(prepareDeleteAccount(ACCOUNT.id)).rejects.toThrow("Not authenticated");
	});

	test("throws for default account", async () => {
		mockFindFirst.mockResolvedValue({ ...ACCOUNT, isDefault: true });

		const { prepareDeleteAccount } = await import("./delete-account");
		await expect(prepareDeleteAccount(ACCOUNT.id)).rejects.toThrow("Cannot delete default");
	});

	test("throws for invalid UUID", async () => {
		const { prepareDeleteAccount } = await import("./delete-account");
		await expect(prepareDeleteAccount("not-a-uuid")).rejects.toThrow("Invalid account ID");
	});
});

describe("confirmDeleteAccount", () => {
	test("deletes account when balance is zero", async () => {
		mockFindFirst.mockResolvedValue(ACCOUNT);
		mockFetchBalances.mockResolvedValue({
			balances: [{ tokenAddress: ACCOUNT.tokenAddress, token: "AlphaUSD", balance: 0n }],
			partial: false,
		});

		const { confirmDeleteAccount } = await import("./delete-account");
		const result = await confirmDeleteAccount({ accountId: ACCOUNT.id });
		expect(result.error).toBeUndefined();
		expect(mockDelete).toHaveBeenCalled();
	});

	test("returns error when assigned token has balance", async () => {
		mockFindFirst.mockResolvedValue(ACCOUNT);
		mockFetchBalances.mockResolvedValue({
			balances: [{ tokenAddress: ACCOUNT.tokenAddress, token: "AlphaUSD", balance: 1_000_000n }],
			partial: false,
		});

		const { confirmDeleteAccount } = await import("./delete-account");
		const result = await confirmDeleteAccount({ accountId: ACCOUNT.id });
		expect(result.error).toContain("still holds");
	});

	test("returns error for not authenticated", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);

		const { confirmDeleteAccount } = await import("./delete-account");
		const result = await confirmDeleteAccount({ accountId: ACCOUNT.id });
		expect(result.error).toBe("Not authenticated");
	});

	test("returns error for default account", async () => {
		mockFindFirst.mockResolvedValue({ ...ACCOUNT, isDefault: true });

		const { confirmDeleteAccount } = await import("./delete-account");
		const result = await confirmDeleteAccount({ accountId: ACCOUNT.id });
		expect(result.error).toContain("Cannot delete default");
	});
});
