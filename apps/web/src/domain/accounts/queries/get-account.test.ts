import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

const mockFindFirst = vi.fn().mockResolvedValue(null);

vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: {
				findFirst: (...args: unknown[]) => mockFindFirst(...args),
			},
		},
	},
}));

describe("getAccount", () => {
	test("returns account for valid UUID belonging to treasury", async () => {
		mockFindFirst.mockResolvedValueOnce({
			id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			name: "Main",
		});
		const { getAccount } = await import("./get-account");
		const account = await getAccount("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
		expect(account.name).toBe("Main");
	});

	test("throws when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { getAccount } = await import("./get-account");
		await expect(getAccount("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).rejects.toThrow(
			"Not authenticated",
		);
	});

	test("throws for invalid UUID format", async () => {
		const { getAccount } = await import("./get-account");
		await expect(getAccount("not-a-uuid")).rejects.toThrow("Account not found");
	});

	test("throws when account not found in treasury", async () => {
		mockFindFirst.mockResolvedValueOnce(null);
		const { getAccount } = await import("./get-account");
		await expect(getAccount("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).rejects.toThrow(
			"Account not found",
		);
	});

	test("excludes encryptedKey from query results", async () => {
		mockFindFirst.mockResolvedValueOnce({ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" });
		const { getAccount } = await import("./get-account");
		await getAccount("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
		const queryOptions = mockFindFirst.mock.calls[0][0];
		expect(queryOptions.columns).toEqual({ encryptedKey: false });
	});
});
