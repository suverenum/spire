import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

const mockFindMany = vi.fn().mockResolvedValue([]);

vi.mock("@/db", () => ({
	db: {
		query: {
			accounts: {
				findMany: (...args: unknown[]) => mockFindMany(...args),
			},
		},
	},
}));

describe("getAccounts", () => {
	test("returns accounts for authenticated treasury", async () => {
		mockFindMany.mockResolvedValueOnce([{ id: "acc-1", name: "Main" }]);
		const { getAccounts } = await import("./get-accounts");
		const accounts = await getAccounts();
		expect(accounts).toHaveLength(1);
		expect(accounts[0].name).toBe("Main");
	});

	test("throws when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { getAccounts } = await import("./get-accounts");
		await expect(getAccounts()).rejects.toThrow("Not authenticated");
	});

	test("excludes encryptedKey from query results", async () => {
		const { getAccounts } = await import("./get-accounts");
		await getAccounts();
		const queryOptions = mockFindMany.mock.calls[0][0];
		expect(queryOptions.columns).toEqual({ encryptedKey: false });
	});

	test("passes ordering function to query", async () => {
		const { getAccounts } = await import("./get-accounts");
		await getAccounts();
		const queryOptions = mockFindMany.mock.calls[0][0];
		// orderBy is a function — verify it exists and is callable
		expect(typeof queryOptions.orderBy).toBe("function");
	});

	test("scopes query to session treasury", async () => {
		const { getAccounts } = await import("./get-accounts");
		await getAccounts();
		const queryOptions = mockFindMany.mock.calls[0][0];
		// where clause should be present (treasury scoping)
		expect(queryOptions.where).toBeDefined();
	});
});
