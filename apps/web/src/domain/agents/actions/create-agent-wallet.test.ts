import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";
import type { AgentWalletParams } from "./create-agent-wallet";

// Mock getSession to return a valid session
vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/crypto", () => ({ encrypt: vi.fn(() => "encrypted-key-data") }));
vi.mock("viem/accounts", () => ({
	privateKeyToAccount: vi.fn(() => ({
		address: "0x3333333333333333333333333333333333333333",
	})),
}));

const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "new-acc-id" }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

// Mock DB to return no existing accounts
vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: {
				findFirst: vi.fn(() => Promise.resolve(null)),
			},
		},
		insert: (...args: unknown[]) => mockInsert(...args),
	},
}));

describe("assertCanCreateAgentWallet", () => {
	const validParams: AgentWalletParams = {
		treasuryId: "test-treasury-id",
		label: "Marketing Bot",
		tokenSymbol: "AlphaUSD",
		spendingCap: "50000000",
		dailyLimit: "10000000",
		maxPerTx: "2000000",
		allowedVendors: ["0x0000000000000000000000000000000000000001"],
	};

	test("accepts valid params", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet(validParams);
		expect(result.error).toBeUndefined();
	});

	test("rejects empty label", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			label: "",
		});
		expect(result.error).toBe("Label must be 1-100 characters");
	});

	test("rejects label over 100 chars", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			label: "a".repeat(101),
		});
		expect(result.error).toBe("Label must be 1-100 characters");
	});

	test("rejects zero spending cap", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			spendingCap: "0",
		});
		expect(result.error).toBe("Spending cap must be positive");
	});

	test("rejects per-tx cap exceeding daily limit", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			maxPerTx: "20000000",
			dailyLimit: "10000000",
		});
		expect(result.error).toBe("Per-tx cap cannot exceed daily limit");
	});

	test("rejects daily limit exceeding spending cap", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			dailyLimit: "100000000",
			spendingCap: "50000000",
		});
		expect(result.error).toBe("Daily limit cannot exceed spending cap");
	});

	test("accepts empty vendor list (escrow auto-added at deploy)", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			allowedVendors: [],
		});
		expect(result.error).toBeUndefined();
	});

	test("rejects treasury mismatch", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			treasuryId: "wrong-treasury",
		});
		expect(result.error).toBe("Treasury mismatch");
	});
});

describe("finalizeAgentWalletCreate", () => {
	const validFinalize = {
		treasuryId: DEFAULT_SESSION.treasuryId,
		label: "Marketing Bot",
		tokenSymbol: "AlphaUSD",
		guardianAddress: "0x4444444444444444444444444444444444444444",
		allowedVendors: ["0x0000000000000000000000000000000000000001"],
		spendingCap: "50000000",
		dailyLimit: "10000000",
		maxPerTx: "2000000",
		agentPrivateKey:
			"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`,
	};

	test("creates account and agent wallet on success", async () => {
		mockInsertReturning.mockResolvedValueOnce([{ id: "new-acc-id" }]);
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		const result = await finalizeAgentWalletCreate(validFinalize);
		expect(result.error).toBeUndefined();
		expect(result.account?.id).toBe("new-acc-id");
		expect(result.rawPrivateKey).toBe(validFinalize.agentPrivateKey);
	});

	test("rejects treasury mismatch", async () => {
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		const result = await finalizeAgentWalletCreate({
			...validFinalize,
			treasuryId: "wrong",
		});
		expect(result.error).toBe("Treasury mismatch");
	});

	test("rejects invalid token symbol", async () => {
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		const result = await finalizeAgentWalletCreate({
			...validFinalize,
			tokenSymbol: "FAKEUSD",
		});
		expect(result.error).toBe("Invalid token");
	});

	test("rejects invalid guardian address format", async () => {
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		const result = await finalizeAgentWalletCreate({
			...validFinalize,
			guardianAddress: "not-an-address",
		});
		expect(result.error).toBe("Invalid guardian address");
	});

	test("returns error on PG unique constraint violation", async () => {
		mockInsertReturning.mockRejectedValueOnce({ code: "23505" });
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		const result = await finalizeAgentWalletCreate(validFinalize);
		expect(result.error).toBe("Guardian address already registered");
	});

	test("re-throws non-constraint errors", async () => {
		mockInsertReturning.mockRejectedValueOnce(new Error("DB connection lost"));
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		await expect(finalizeAgentWalletCreate(validFinalize)).rejects.toThrow("DB connection lost");
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { finalizeAgentWalletCreate } = await import("./create-agent-wallet");
		const result = await finalizeAgentWalletCreate(validFinalize);
		expect(result.error).toBe("Not authenticated");
	});
});
