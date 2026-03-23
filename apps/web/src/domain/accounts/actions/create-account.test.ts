import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/crypto", () => ({
	encrypt: vi.fn((val: string) => `encrypted:${val}`),
}));

const mockFindFirst = vi.fn(() => Promise.resolve(null));
const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "new-acc-id" }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: {
				findFirst: vi.fn((..._args: unknown[]) => mockFindFirst()),
			},
		},
		insert: vi.fn(() => mockInsert()),
	},
}));

describe("assertCanCreateAccount", () => {
	test("accepts valid params", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "Savings",
		});
		expect(result.error).toBeUndefined();
	});

	test("rejects treasury mismatch", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: "wrong",
			tokenSymbol: "AlphaUSD",
			name: "Savings",
		});
		expect(result.error).toBe("Treasury mismatch");
	});

	test("rejects empty name", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "",
		});
		expect(result.error).toBe("Account name must be 1-100 characters");
	});

	test("rejects invalid token", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "FakeToken",
			name: "Savings",
		});
		expect(result.error).toBe("Invalid token for account creation");
	});

	test("rejects duplicate name", async () => {
		mockFindFirst.mockResolvedValueOnce({ id: "existing" } as never);
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "Main",
		});
		expect(result.error).toBe("Name already taken");
	});
});

describe("finalizeAccountCreate", () => {
	test("creates account on success", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Savings",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBeUndefined();
		expect(result.account?.id).toBe("new-acc-id");
	});

	test("rejects invalid wallet address", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Savings",
			tokenSymbol: "AlphaUSD",
			walletAddress: "not-valid",
		});
		expect(result.error).toBe("Invalid wallet address");
	});

	test("creates smart-account with walletType and encrypted key", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Smart Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x2222222222222222222222222222222222222222",
			walletType: "smart-account",
			privateKey: "0xdeadbeef" as `0x${string}`,
		});
		expect(result.error).toBeUndefined();
		expect(result.account?.id).toBe("new-acc-id");
	});

	test("rejects invalid wallet type", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Bad Type",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
			walletType: "invalid-type",
		});
		expect(result.error).toBe("Invalid wallet type");
	});

	test("handles PG unique constraint for wallet address", async () => {
		mockInsertReturning.mockRejectedValueOnce({
			code: "23505",
			constraint: "accounts_wallet_address_idx",
		});
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Savings",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBe("Wallet address already registered");
	});
});
