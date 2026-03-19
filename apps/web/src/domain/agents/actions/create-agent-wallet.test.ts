import { describe, expect, test, vi } from "vitest";
import type { AgentWalletParams } from "./create-agent-wallet";

// Mock getSession to return a valid session
vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() =>
		Promise.resolve({
			treasuryId: "test-treasury-id",
			tempoAddress: "0x1234",
			treasuryName: "Test Treasury",
			authenticatedAt: new Date().toISOString(),
		}),
	),
}));

// Mock DB to return no existing accounts
vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: {
				findFirst: vi.fn(() => Promise.resolve(null)),
			},
		},
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

	test("rejects empty vendor list", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			allowedVendors: [],
		});
		expect(result.error).toBe("At least one vendor required");
	});

	test("rejects invalid vendor address", async () => {
		const { assertCanCreateAgentWallet } = await import("./create-agent-wallet");
		const result = await assertCanCreateAgentWallet({
			...validParams,
			allowedVendors: ["not-an-address"],
		});
		expect(result.error).toContain("Invalid vendor address");
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
