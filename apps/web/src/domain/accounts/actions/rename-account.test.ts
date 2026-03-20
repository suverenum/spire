import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockFindFirst = vi.fn();
const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("@/db", () => ({
	db: {
		query: { accounts: { findFirst: (...args: unknown[]) => mockFindFirst(...args) } },
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const ACCOUNT = { id: VALID_UUID, treasuryId: DEFAULT_SESSION.treasuryId, name: "Old Name" };

describe("renameAccountAction", () => {
	test("renames account successfully", async () => {
		mockFindFirst.mockResolvedValue(ACCOUNT);
		const { renameAccountAction } = await import("./rename-account");
		const formData = new FormData();
		formData.set("accountId", VALID_UUID);
		formData.set("name", "New Name");
		const result = await renameAccountAction(formData);
		expect(result.error).toBeUndefined();
	});

	test("rejects empty name", async () => {
		const { renameAccountAction } = await import("./rename-account");
		const formData = new FormData();
		formData.set("accountId", VALID_UUID);
		formData.set("name", "");
		const result = await renameAccountAction(formData);
		expect(result.error).toBe("Account name must be 1-100 characters");
	});

	test("rejects invalid UUID", async () => {
		const { renameAccountAction } = await import("./rename-account");
		const formData = new FormData();
		formData.set("accountId", "not-a-uuid");
		formData.set("name", "Valid Name");
		const result = await renameAccountAction(formData);
		expect(result.error).toBe("Invalid account ID");
	});

	test("rejects when account not found", async () => {
		mockFindFirst.mockResolvedValue(null);
		const { renameAccountAction } = await import("./rename-account");
		const formData = new FormData();
		formData.set("accountId", VALID_UUID);
		formData.set("name", "New Name");
		const result = await renameAccountAction(formData);
		expect(result.error).toBe("Account not found");
	});

	test("handles PG unique constraint violation", async () => {
		mockFindFirst.mockResolvedValue(ACCOUNT);
		mockSet.mockReturnValueOnce({
			where: vi.fn().mockRejectedValueOnce({ code: "23505" }),
		});
		const { renameAccountAction } = await import("./rename-account");
		const formData = new FormData();
		formData.set("accountId", VALID_UUID);
		formData.set("name", "Duplicate Name");
		const result = await renameAccountAction(formData);
		expect(result.error).toBe("Name already taken");
	});
});
