import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "./constants";

// Mock next/headers cookies
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
	cookies: vi.fn(() =>
		Promise.resolve({
			get: mockGet,
			set: mockSet,
			delete: mockDelete,
		}),
	),
}));

const TEST_SECRET = "test-session-secret-for-unit-tests";
const VALID_SESSION = {
	treasuryId: "t-123",
	tempoAddress: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
	treasuryName: "Test Treasury",
	organizationId: "org-123",
	organizationName: "Test Organization",
};

/**
 * Helper: create a validly signed session cookie value.
 * Mirrors the internal encode() logic to produce test data.
 */
function createSignedCookie(data: Record<string, unknown>, secret = TEST_SECRET): string {
	const payload = Buffer.from(JSON.stringify(data)).toString("base64");
	const sig = createHmac("sha256", secret).update(payload).digest("hex");
	return `${payload}.${sig}`;
}

describe("session", () => {
	const originalEnv = process.env.SESSION_SECRET;

	beforeEach(() => {
		process.env.SESSION_SECRET = TEST_SECRET;
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (originalEnv) {
			process.env.SESSION_SECRET = originalEnv;
		} else {
			delete process.env.SESSION_SECRET;
		}
	});

	// ─── getSession ─────────────────────────────────────────────

	test("getSession returns null when no cookie exists", async () => {
		mockGet.mockReturnValue(undefined);
		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession returns session data from valid signed cookie", async () => {
		const sessionData = {
			...VALID_SESSION,
			authenticatedAt: Date.now(),
		};
		const cookieValue = createSignedCookie(sessionData);
		mockGet.mockReturnValue({ value: cookieValue });

		const { getSession } = await import("./session");
		const result = await getSession();

		expect(result).not.toBeNull();
		expect(result!.treasuryId).toBe("t-123");
		expect(result!.tempoAddress).toBe(VALID_SESSION.tempoAddress);
		expect(result!.treasuryName).toBe("Test Treasury");
	});

	test("getSession returns null for expired session (> 15 min)", async () => {
		const sessionData = {
			...VALID_SESSION,
			authenticatedAt: Date.now() - SESSION_MAX_AGE_MS - 1000, // 1 second past expiry
		};
		const cookieValue = createSignedCookie(sessionData);
		mockGet.mockReturnValue({ value: cookieValue });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession returns session that is exactly at expiry boundary", async () => {
		const sessionData = {
			...VALID_SESSION,
			authenticatedAt: Date.now() - SESSION_MAX_AGE_MS + 500, // 500ms before expiry
		};
		const cookieValue = createSignedCookie(sessionData);
		mockGet.mockReturnValue({ value: cookieValue });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).not.toBeNull();
	});

	test("getSession returns null for tampered signature", async () => {
		const sessionData = {
			...VALID_SESSION,
			authenticatedAt: Date.now(),
		};
		const cookieValue = createSignedCookie(sessionData);
		// Tamper with the last 4 chars of the signature
		const tampered = `${cookieValue.slice(0, -4)}XXXX`;
		mockGet.mockReturnValue({ value: tampered });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession returns null for cookie signed with wrong secret", async () => {
		const sessionData = {
			...VALID_SESSION,
			authenticatedAt: Date.now(),
		};
		const cookieValue = createSignedCookie(sessionData, "wrong-secret");
		mockGet.mockReturnValue({ value: cookieValue });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession returns null for malformed cookie (no dot separator)", async () => {
		mockGet.mockReturnValue({ value: "nodotinthisvalue" });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession returns null for empty cookie value", async () => {
		mockGet.mockReturnValue({ value: "" });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession returns null for cookie with invalid base64 payload", async () => {
		// Valid dot-separated format but payload is not valid base64 JSON
		const invalidPayload = "not-valid-base64!!!";
		const sig = createHmac("sha256", TEST_SECRET).update(invalidPayload).digest("hex");
		mockGet.mockReturnValue({ value: `${invalidPayload}.${sig}` });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	// ─── createSession ──────────────────────────────────────────

	test("createSession sets cookie with correct attributes", async () => {
		const { createSession } = await import("./session");
		await createSession(VALID_SESSION);

		expect(mockSet).toHaveBeenCalledOnce();
		const [name, value, options] = mockSet.mock.calls[0];

		expect(name).toBe(SESSION_COOKIE_NAME);
		expect(typeof value).toBe("string");
		expect(value).toContain("."); // payload.signature format

		expect(options.httpOnly).toBe(true);
		expect(options.sameSite).toBe("lax");
		expect(options.maxAge).toBe(SESSION_MAX_AGE_MS / 1000);
		expect(options.path).toBe("/");
	});

	test("createSession produces cookie that getSession can decode", async () => {
		let storedValue: string | undefined;
		mockSet.mockImplementation((_name: string, value: string) => {
			storedValue = value;
		});

		const { createSession, getSession } = await import("./session");
		await createSession(VALID_SESSION);

		// Now mock get to return what was set
		mockGet.mockReturnValue({ value: storedValue });
		const result = await getSession();

		expect(result).not.toBeNull();
		expect(result!.treasuryId).toBe(VALID_SESSION.treasuryId);
		expect(result!.tempoAddress).toBe(VALID_SESSION.tempoAddress);
		expect(result!.authenticatedAt).toBeGreaterThan(0);
	});

	// ─── destroySession ─────────────────────────────────────────

	test("destroySession deletes the session cookie", async () => {
		const { destroySession } = await import("./session");
		await destroySession();

		expect(mockDelete).toHaveBeenCalledOnce();
		expect(mockDelete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
	});

	// ─── Legacy session migration ───────────────────────────────

	test("getSession rejects legacy session without organizationId", async () => {
		const legacySession = {
			treasuryId: "t-legacy",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
			treasuryName: "Legacy Treasury",
			authenticatedAt: Date.now(),
			// Missing: organizationId, organizationName
		};
		const cookieValue = createSignedCookie(legacySession);
		mockGet.mockReturnValue({ value: cookieValue });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).toBeNull();
	});

	test("getSession accepts session with all required fields including organizationId", async () => {
		const fullSession = {
			...VALID_SESSION,
			authenticatedAt: Date.now(),
		};
		const cookieValue = createSignedCookie(fullSession);
		mockGet.mockReturnValue({ value: cookieValue });

		const { getSession } = await import("./session");
		const result = await getSession();
		expect(result).not.toBeNull();
		expect(result!.organizationId).toBe("org-123");
		expect(result!.organizationName).toBe("Test Organization");
	});

	// ─── getSessionSecret ───────────────────────────────────────

	test("throws when SESSION_SECRET is not set", async () => {
		delete process.env.SESSION_SECRET;
		// Need fresh import to pick up env change
		vi.resetModules();
		const { createSession } = await import("./session");
		await expect(createSession(VALID_SESSION)).rejects.toThrow("SESSION_SECRET must be set");
	});
});
