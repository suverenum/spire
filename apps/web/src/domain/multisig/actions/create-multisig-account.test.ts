import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing the module
const mockGetSession = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/lib/session", () => ({
	getSession: () => mockGetSession(),
}));

vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: {
				findFirst: (opts: unknown) => mockFindFirst(opts),
			},
		},
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: "test-id" }]),
			}),
		}),
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

import { assertCanCreateMultisigAccount } from "./create-multisig-account";

const validParams = {
	treasuryId: "treasury-1",
	name: "Operations Multisig",
	tokenSymbol: "AlphaUSD",
	owners: [
		"0x1234567890abcdef1234567890abcdef12345678",
		"0xabcdef1234567890abcdef1234567890abcdef12",
	],
	tiers: [{ maxValue: "10000000000", requiredConfirmations: 1 }],
	defaultConfirmations: 3,
	allowlistEnabled: true,
	initialAllowlist: ["0xdead000000000000000000000000000000000001"],
};

describe("assertCanCreateMultisigAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSession.mockResolvedValue({
			treasuryId: "treasury-1",
			tempoAddress: "0x123",
		});
		mockFindFirst.mockResolvedValue(null); // No existing account
	});

	it("returns no error for valid params", async () => {
		const result = await assertCanCreateMultisigAccount(validParams);
		expect(result.error).toBeUndefined();
	});

	it("rejects unauthenticated requests", async () => {
		mockGetSession.mockResolvedValue(null);
		const result = await assertCanCreateMultisigAccount(validParams);
		expect(result.error).toBe("Not authenticated");
	});

	it("rejects treasury mismatch", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			treasuryId: "wrong-treasury",
		});
		expect(result.error).toBe("Treasury mismatch");
	});

	it("rejects invalid token", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			tokenSymbol: "InvalidToken",
		});
		expect(result.error).toBe("Invalid token for account creation");
	});

	it("rejects empty name", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			name: "",
		});
		expect(result.error).toBe("Account name must be 1-100 characters");
	});

	it("rejects duplicate name", async () => {
		mockFindFirst.mockResolvedValue({ id: "existing" });
		const result = await assertCanCreateMultisigAccount(validParams);
		expect(result.error).toBe("Name already taken");
	});

	it("rejects empty owners", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			owners: [],
		});
		expect(result.error).toBe("At least one owner required");
	});

	it("rejects invalid owner address", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			owners: ["not-an-address"],
		});
		expect(result.error).toBe("Invalid owner address: not-an-address");
	});

	it("rejects duplicate owner addresses", async () => {
		const addr = "0x1234567890abcdef1234567890abcdef12345678";
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			owners: [addr, addr],
		});
		expect(result.error).toBe("Duplicate owner addresses");
	});

	it("rejects more than 50 owners", async () => {
		const owners = Array.from({ length: 51 }, (_, i) => `0x${i.toString(16).padStart(40, "0")}`);
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			owners,
		});
		expect(result.error).toBe("Maximum 50 owners");
	});

	it("rejects more than 10 tiers", async () => {
		const tiers = Array.from({ length: 11 }, (_, i) => ({
			maxValue: ((i + 1) * 10000000000).toString(),
			requiredConfirmations: 1,
		}));
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			tiers,
		});
		expect(result.error).toBe("Maximum 10 tiers");
	});

	it("rejects zero default confirmations", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			defaultConfirmations: 0,
		});
		expect(result.error).toBe("Default confirmations must be at least 1");
	});

	it("rejects unsorted tiers", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			tiers: [
				{ maxValue: "20000000000", requiredConfirmations: 2 },
				{ maxValue: "10000000000", requiredConfirmations: 1 },
			],
		});
		expect(result.error).toBe("Tiers must be sorted ascending by maxValue");
	});

	it("rejects zero required confirmations in tier", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			tiers: [{ maxValue: "10000000000", requiredConfirmations: 0 }],
		});
		expect(result.error).toBe("Required confirmations must be at least 1");
	});

	it("rejects invalid allowlist address", async () => {
		const result = await assertCanCreateMultisigAccount({
			...validParams,
			initialAllowlist: ["bad-address"],
		});
		expect(result.error).toBe("Invalid allowlist address: bad-address");
	});
});
