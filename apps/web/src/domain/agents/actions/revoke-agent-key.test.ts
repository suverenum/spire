import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockFindFirstWallet = vi.fn();
const mockFindFirstAccount = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({
	set: vi.fn().mockReturnValue({ where: vi.fn() }),
});

vi.mock("@/db", () => ({
	db: {
		query: {
			agentWallets: { findFirst: (...args: unknown[]) => mockFindFirstWallet(...args) },
			accounts: { findFirst: (...args: unknown[]) => mockFindFirstAccount(...args) },
		},
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

const WALLET = { id: "w-1", accountId: "acc-1", status: "active" };
const ACCOUNT = { id: "acc-1", treasuryId: DEFAULT_SESSION.treasuryId };

describe("revokeAgentKey", () => {
	test("revokes active wallet", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { revokeAgentKey } = await import("./revoke-agent-key");
		const result = await revokeAgentKey("w-1");
		expect(result.error).toBeUndefined();
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { revokeAgentKey } = await import("./revoke-agent-key");
		const result = await revokeAgentKey("w-1");
		expect(result.error).toBe("Not authenticated");
	});

	test("rejects when wallet not found", async () => {
		mockFindFirstWallet.mockResolvedValue(null);
		const { revokeAgentKey } = await import("./revoke-agent-key");
		const result = await revokeAgentKey("nonexistent");
		expect(result.error).toBe("Agent wallet not found");
	});

	test("rejects when not authorized", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue({ ...ACCOUNT, treasuryId: "wrong" });
		const { revokeAgentKey } = await import("./revoke-agent-key");
		const result = await revokeAgentKey("w-1");
		expect(result.error).toBe("Not authorized");
	});

	test("rejects already revoked wallet", async () => {
		mockFindFirstWallet.mockResolvedValue({ ...WALLET, status: "revoked" });
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { revokeAgentKey } = await import("./revoke-agent-key");
		const result = await revokeAgentKey("w-1");
		expect(result.error).toBe("Already revoked");
	});
});
