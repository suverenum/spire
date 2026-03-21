import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

vi.mock("@/lib/crypto", () => ({
	decrypt: vi.fn(() => "0xdecryptedprivatekey1234567890abcdef"),
}));

const mockFindFirstWallet = vi.fn();
const mockFindFirstAccount = vi.fn();
const mockUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) }));

vi.mock("@/db", () => ({
	db: {
		query: {
			agentWallets: { findFirst: (...args: unknown[]) => mockFindFirstWallet(...args) },
			accounts: { findFirst: (...args: unknown[]) => mockFindFirstAccount(...args) },
		},
		update: () => mockUpdate(),
	},
}));

const WALLET = { id: "w-1", accountId: "acc-1", encryptedKey: "encrypted-data" };
const ACCOUNT = { id: "acc-1", treasuryId: DEFAULT_SESSION.treasuryId };

describe("revealAgentKey", () => {
	test("returns decrypted private key", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { revealAgentKey } = await import("./reveal-agent-key");
		const result = await revealAgentKey("w-1");
		expect(result.error).toBeUndefined();
		expect(result.privateKey).toBe("0xdecryptedprivatekey1234567890abcdef");
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { revealAgentKey } = await import("./reveal-agent-key");
		const result = await revealAgentKey("w-1");
		expect(result.error).toBe("Not authenticated");
	});

	test("rejects when wallet not found", async () => {
		mockFindFirstWallet.mockResolvedValue(null);
		const { revealAgentKey } = await import("./reveal-agent-key");
		const result = await revealAgentKey("nonexistent");
		expect(result.error).toBe("Agent wallet not found");
	});

	test("rejects when not authorized", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue({ ...ACCOUNT, treasuryId: "wrong" });
		const { revealAgentKey } = await import("./reveal-agent-key");
		const result = await revealAgentKey("w-1");
		expect(result.error).toBe("Not authorized");
	});

	test("rejects when key already exported", async () => {
		mockFindFirstWallet.mockResolvedValue({
			...WALLET,
			keyExportedAt: new Date("2026-01-01"),
		});
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { revealAgentKey } = await import("./reveal-agent-key");
		const result = await revealAgentKey("w-1");
		expect(result.error).toContain("already exported");
	});

	test("returns error when decryption fails", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { decrypt } = await import("@/lib/crypto");
		vi.mocked(decrypt).mockImplementationOnce(() => {
			throw new Error("Decryption failed");
		});
		const { revealAgentKey } = await import("./reveal-agent-key");
		const result = await revealAgentKey("w-1");
		expect(result.error).toBe("Failed to decrypt key");
	});
});
