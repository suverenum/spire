import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(null)),
	createSession: vi.fn(),
	destroySession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockSelectResult = vi.fn();

vi.mock("@/db", () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: (...args: unknown[]) => mockSelectResult(...args),
			}),
		}),
	},
}));

vi.mock("@/domain/organizations/actions/organization-actions", () => ({
	createOrganizationForTreasury: vi.fn(() =>
		Promise.resolve({ organizationId: "org-new", entityId: "entity-new" }),
	),
}));

vi.mock("@/domain/organizations/queries/get-organization", () => ({
	getOrganization: vi.fn(() => Promise.resolve({ id: "org-1", name: "Test Org" })),
}));

// Mock redirect to throw (Next.js behavior)
vi.mock("next/navigation", () => ({
	redirect: vi.fn(() => {
		throw new Error("NEXT_REDIRECT");
	}),
}));

describe("loginAction", () => {
	test("returns treasury details on valid login", async () => {
		mockSelectResult.mockResolvedValue([
			{
				id: "t-1",
				name: "My Treasury",
				tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
				organizationId: "org-1",
			},
		]);
		const { loginAction } = await import("./auth-actions");
		const result = await loginAction("0x1234567890abcdef1234567890abcdef12345678");
		expect(result.error).toBeUndefined();
		expect(result.treasuryName).toBe("My Treasury");
	});

	test("creates organization on-the-fly for legacy treasury", async () => {
		mockSelectResult.mockResolvedValue([
			{
				id: "t-legacy",
				name: "Legacy Treasury",
				tempoAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				organizationId: null,
			},
		]);
		const { loginAction } = await import("./auth-actions");
		const result = await loginAction("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
		expect(result.error).toBeUndefined();

		const { createOrganizationForTreasury } = await import(
			"@/domain/organizations/actions/organization-actions"
		);
		expect(createOrganizationForTreasury).toHaveBeenCalledWith("t-legacy", "Legacy Treasury");
	});

	test("rejects invalid address format", async () => {
		const { loginAction } = await import("./auth-actions");
		const result = await loginAction("not-an-address");
		expect(result.error).toBe("Invalid wallet address");
	});

	test("returns error when treasury not found", async () => {
		mockSelectResult.mockResolvedValue([]);
		const { loginAction } = await import("./auth-actions");
		const result = await loginAction("0x9999999999999999999999999999999999999999");
		expect(result.error).toBe("No treasury found for this passkey");
	});

	test("normalizes address to lowercase for lookup", async () => {
		mockSelectResult.mockResolvedValue([
			{
				id: "t-1",
				name: "My Treasury",
				tempoAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
				organizationId: "org-1",
			},
		]);
		const { loginAction } = await import("./auth-actions");
		const result = await loginAction("0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
		expect(result.error).toBeUndefined();
	});

	test("calls createSession with correct organizationId from existing org", async () => {
		mockSelectResult.mockResolvedValue([
			{
				id: "t-1",
				name: "My Treasury",
				tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
				organizationId: "org-1",
			},
		]);
		const { loginAction } = await import("./auth-actions");
		const { createSession } = await import("@/lib/session");
		await loginAction("0x1234567890abcdef1234567890abcdef12345678");
		expect(createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-1",
				organizationName: "Test Org",
			}),
		);
	});

	test("falls back to treasury name when getOrganization returns null", async () => {
		mockSelectResult.mockResolvedValue([
			{
				id: "t-1",
				name: "Treasury Fallback Name",
				tempoAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				organizationId: "org-deleted",
			},
		]);
		const { getOrganization } = await import("@/domain/organizations/queries/get-organization");
		vi.mocked(getOrganization).mockResolvedValueOnce(null as never);
		const { loginAction } = await import("./auth-actions");
		const { createSession } = await import("@/lib/session");
		await loginAction("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
		expect(createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-deleted",
				organizationName: "Treasury Fallback Name",
			}),
		);
	});
});

describe("touchSessionAction", () => {
	test("refreshes session without error", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce({
			treasuryId: "t-1",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
			treasuryName: "Test",
			authenticatedAt: Date.now(),
			organizationId: "org-1",
			organizationName: "Test Org",
		});
		const { touchSessionAction } = await import("./auth-actions");
		await expect(touchSessionAction()).resolves.not.toThrow();
	});

	test("does nothing when no session exists", async () => {
		const { getSession, createSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		vi.mocked(createSession).mockClear();
		const { touchSessionAction } = await import("./auth-actions");
		await touchSessionAction();
		expect(createSession).not.toHaveBeenCalled();
	});
});

describe("logoutAction", () => {
	test("destroys session and redirects", async () => {
		const { logoutAction } = await import("./auth-actions");
		const { destroySession } = await import("@/lib/session");
		const { redirect } = await import("next/navigation");
		await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT");
		expect(destroySession).toHaveBeenCalled();
		expect(redirect).toHaveBeenCalledWith("/");
	});
});
