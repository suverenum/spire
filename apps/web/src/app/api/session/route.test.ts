import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
}));

describe("GET /api/session", () => {
	test("returns authenticated session data", async () => {
		const { GET } = await import("./route");
		const resp = await GET();
		const data = await resp.json();
		expect(resp.status).toBe(200);
		expect(data.authenticated).toBe(true);
		expect(data.tempoAddress).toBe(DEFAULT_SESSION.tempoAddress);
		expect(data.treasuryName).toBe(DEFAULT_SESSION.treasuryName);
	});

	test("returns 401 when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { GET } = await import("./route");
		const resp = await GET();
		const data = await resp.json();
		expect(resp.status).toBe(401);
		expect(data.authenticated).toBe(false);
	});
});
