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

const WALLET = {
	id: "w-1",
	accountId: "acc-1",
	allowedVendors: ["0xaaaa000000000000000000000000000000000001"],
};
const ACCOUNT = { id: "acc-1", treasuryId: DEFAULT_SESSION.treasuryId };

describe("addVendorToWallet", () => {
	test("adds valid vendor address", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { addVendorToWallet } = await import("./manage-vendors");
		const result = await addVendorToWallet({
			walletId: "w-1",
			vendorAddress: "0xBBBB000000000000000000000000000000000002",
		});
		expect(result.error).toBeUndefined();
	});

	test("rejects invalid address format", async () => {
		const { addVendorToWallet } = await import("./manage-vendors");
		const result = await addVendorToWallet({
			walletId: "w-1",
			vendorAddress: "not-an-address",
		});
		expect(result.error).toBe("Invalid address");
	});

	test("rejects when wallet not found", async () => {
		mockFindFirstWallet.mockResolvedValue(null);
		const { addVendorToWallet } = await import("./manage-vendors");
		const result = await addVendorToWallet({
			walletId: "nonexistent",
			vendorAddress: "0xBBBB000000000000000000000000000000000002",
		});
		expect(result.error).toBe("Agent wallet not found");
	});

	test("rejects when not authorized (wrong treasury)", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue({ ...ACCOUNT, treasuryId: "other-treasury" });
		const { addVendorToWallet } = await import("./manage-vendors");
		const result = await addVendorToWallet({
			walletId: "w-1",
			vendorAddress: "0xBBBB000000000000000000000000000000000002",
		});
		expect(result.error).toBe("Not authorized");
	});

	test("rejects duplicate vendor (normalized)", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { addVendorToWallet } = await import("./manage-vendors");
		// Same address as existing but uppercase
		const result = await addVendorToWallet({
			walletId: "w-1",
			vendorAddress: "0xAAAA000000000000000000000000000000000001",
		});
		expect(result.error).toBe("Vendor already in allowlist");
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { addVendorToWallet } = await import("./manage-vendors");
		const result = await addVendorToWallet({
			walletId: "w-1",
			vendorAddress: "0xBBBB000000000000000000000000000000000002",
		});
		expect(result.error).toBe("Not authenticated");
	});
});

describe("removeVendorFromWallet", () => {
	test("removes vendor successfully", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue(ACCOUNT);
		const { removeVendorFromWallet } = await import("./manage-vendors");
		const result = await removeVendorFromWallet({
			walletId: "w-1",
			vendorAddress: "0xAAAA000000000000000000000000000000000001",
		});
		expect(result.error).toBeUndefined();
	});

	test("rejects when wallet not found", async () => {
		mockFindFirstWallet.mockResolvedValue(null);
		const { removeVendorFromWallet } = await import("./manage-vendors");
		const result = await removeVendorFromWallet({
			walletId: "nonexistent",
			vendorAddress: "0xAAAA000000000000000000000000000000000001",
		});
		expect(result.error).toBe("Agent wallet not found");
	});

	test("rejects when not authorized", async () => {
		mockFindFirstWallet.mockResolvedValue(WALLET);
		mockFindFirstAccount.mockResolvedValue({ ...ACCOUNT, treasuryId: "wrong" });
		const { removeVendorFromWallet } = await import("./manage-vendors");
		const result = await removeVendorFromWallet({
			walletId: "w-1",
			vendorAddress: "0xAAAA000000000000000000000000000000000001",
		});
		expect(result.error).toBe("Not authorized");
	});
});
