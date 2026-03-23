import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/crypto", () => ({
	encrypt: vi.fn((val: string) => `encrypted:${val}`),
}));

vi.mock("viem/accounts", () => ({
	privateKeyToAccount: vi.fn((key: string) => ({
		// Return a deterministic address based on whether the key is the "matching" one
		address:
			key === "0xmatchingkey" ? "0x8888888888888888888888888888888888888888" : "0xwrongaddress",
	})),
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

beforeEach(() => {
	vi.clearAllMocks();
	mockFindFirst.mockResolvedValue(null);
	mockInsertReturning.mockResolvedValue([{ id: "new-acc-id" }]);
});

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

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "Savings",
		});
		expect(result.error).toBe("Not authenticated");
	});

	test("rejects name over 100 characters", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "x".repeat(101),
		});
		expect(result.error).toBe("Account name must be 1-100 characters");
	});

	test("accepts name at exactly 100 characters", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "x".repeat(100),
		});
		expect(result.error).toBeUndefined();
	});

	test("trims whitespace from name", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "   Savings   ",
		});
		expect(result.error).toBeUndefined();
	});

	test("rejects whitespace-only name", async () => {
		const { assertCanCreateAccount } = await import("./create-account");
		const result = await assertCanCreateAccount({
			treasuryId: DEFAULT_SESSION.treasuryId,
			tokenSymbol: "AlphaUSD",
			name: "   ",
		});
		expect(result.error).toBe("Account name must be 1-100 characters");
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
			walletAddress: "0x8888888888888888888888888888888888888888",
			walletType: "smart-account",
			privateKey: "0xmatchingkey" as `0x${string}`,
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

	test("coerces empty walletType to eoa default", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Empty Type Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x9999999999999999999999999999999999999999",
			walletType: "",
		});
		expect(result.error).toBeUndefined();
		expect(result.account?.id).toBe("new-acc-id");
	});

	test("rejects guardian wallet type (requires companion agent_wallets row)", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Guardian Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
			walletType: "guardian",
		});
		expect(result.error).toBe("Invalid wallet type");
	});

	test("rejects multisig wallet type (requires companion multisig_configs row)", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Multisig Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
			walletType: "multisig",
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

	test("handles PG unique constraint for default token index", async () => {
		mockInsertReturning.mockRejectedValueOnce({
			code: "23505",
			constraint: "accounts_default_token_idx",
		});
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Savings",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBe("Default account for this token already exists");
	});

	test("handles PG unique constraint for name (fallback)", async () => {
		mockInsertReturning.mockRejectedValueOnce({
			code: "23505",
			constraint: "accounts_treasury_name_idx",
		});
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Duplicate Name",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBe("Name already taken");
	});

	test("re-throws non-PG errors", async () => {
		mockInsertReturning.mockRejectedValueOnce(new Error("Connection lost"));
		const { finalizeAccountCreate } = await import("./create-account");
		await expect(
			finalizeAccountCreate({
				treasuryId: DEFAULT_SESSION.treasuryId,
				name: "Savings",
				tokenSymbol: "AlphaUSD",
				walletAddress: "0x1111111111111111111111111111111111111111",
			}),
		).rejects.toThrow("Connection lost");
	});

	test("rejects treasury mismatch", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: "wrong-treasury",
			name: "Savings",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBe("Treasury mismatch");
	});

	test("rejects invalid token in finalize", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Savings",
			tokenSymbol: "FakeToken",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBe("Invalid token");
	});

	test("does not encrypt key when no privateKey provided", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const { encrypt } = await import("@/lib/crypto");
		await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "No Key Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x3333333333333333333333333333333333333333",
		});
		expect(encrypt).not.toHaveBeenCalled();
	});

	test("encrypts key when privateKey is provided", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const { encrypt } = await import("@/lib/crypto");
		await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Keyed Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x8888888888888888888888888888888888888888",
			walletType: "smart-account",
			privateKey: "0xmatchingkey" as `0x${string}`,
		});
		expect(encrypt).toHaveBeenCalledWith("0xmatchingkey");
	});

	test("rejects isDefault when default already exists for token", async () => {
		mockFindFirst.mockResolvedValueOnce({ id: "existing-default" } as never);
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Second Default",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x5555555555555555555555555555555555555555",
			isDefault: true,
		});
		expect(result.error).toBe("Default account for this token already exists");
	});

	test("allows isDefault when no default exists for token", async () => {
		mockFindFirst.mockResolvedValue(null);
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "First Default",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x6666666666666666666666666666666666666666",
			isDefault: true,
		});
		expect(result.error).toBeUndefined();
		expect(result.account?.id).toBe("new-acc-id");
	});

	test("rejects smart-account when key does not match wallet address", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Mismatched Key",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x8888888888888888888888888888888888888888",
			walletType: "smart-account",
			privateKey: "0xwrongkey" as `0x${string}`,
		});
		expect(result.error).toBe("Private key does not match wallet address");
	});

	test("accepts smart-account when key derives correct wallet address", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Matched Key",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x8888888888888888888888888888888888888888",
			walletType: "smart-account",
			privateKey: "0xmatchingkey" as `0x${string}`,
		});
		expect(result.error).toBeUndefined();
		expect(result.account?.id).toBe("new-acc-id");
	});

	test("rejects smart-account with malformed private key", async () => {
		const { privateKeyToAccount } = await import("viem/accounts");
		vi.mocked(privateKeyToAccount).mockImplementationOnce(() => {
			throw new Error("invalid private key");
		});
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Bad Key",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x8888888888888888888888888888888888888888",
			walletType: "smart-account",
			privateKey: "0xinvalid" as `0x${string}`,
		});
		expect(result.error).toBe("Invalid private key format");
	});

	test("rejects smart-account without private key", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "Keyless Smart Account",
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x7777777777777777777777777777777777777777",
			walletType: "smart-account",
			// No privateKey provided
		});
		expect(result.error).toBe("Private key required for smart-account creation");
	});

	test("rejects name over 100 characters", async () => {
		const { finalizeAccountCreate } = await import("./create-account");
		const result = await finalizeAccountCreate({
			treasuryId: DEFAULT_SESSION.treasuryId,
			name: "x".repeat(101),
			tokenSymbol: "AlphaUSD",
			walletAddress: "0x1111111111111111111111111111111111111111",
		});
		expect(result.error).toBe("Account name must be 1-100 characters");
	});
});
