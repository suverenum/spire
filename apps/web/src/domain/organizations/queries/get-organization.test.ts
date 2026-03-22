import { describe, expect, test, vi } from "vitest";

const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/db", () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
	},
}));

describe("getOrganization", () => {
	test("returns organization by id", async () => {
		mockSelectWhere.mockResolvedValue([
			{ id: "org-1", name: "Test Org", domain: null, settings: {}, createdAt: new Date() },
		]);
		const { getOrganization } = await import("./get-organization");
		const org = await getOrganization("org-1");
		expect(org).not.toBeNull();
		expect(org?.name).toBe("Test Org");
	});

	test("returns null when organization not found", async () => {
		mockSelectWhere.mockResolvedValue([]);
		const { getOrganization } = await import("./get-organization");
		const org = await getOrganization("nonexistent");
		expect(org).toBeNull();
	});
});

describe("getOrganizationByTreasuryId", () => {
	test("returns organization for treasury with organizationId", async () => {
		// First call: treasury lookup → returns organizationId
		// Second call: organization lookup → returns org
		mockSelectWhere
			.mockResolvedValueOnce([{ organizationId: "org-1" }])
			.mockResolvedValueOnce([{ id: "org-1", name: "Test Org" }]);
		const { getOrganizationByTreasuryId } = await import("./get-organization");
		const org = await getOrganizationByTreasuryId("t-1");
		expect(org).not.toBeNull();
	});

	test("returns null for treasury without organizationId", async () => {
		mockSelectWhere.mockResolvedValue([{ organizationId: null }]);
		const { getOrganizationByTreasuryId } = await import("./get-organization");
		const org = await getOrganizationByTreasuryId("t-legacy");
		expect(org).toBeNull();
	});

	test("returns null when treasury not found", async () => {
		mockSelectWhere.mockResolvedValue([]);
		const { getOrganizationByTreasuryId } = await import("./get-organization");
		const org = await getOrganizationByTreasuryId("nonexistent");
		expect(org).toBeNull();
	});
});

describe("getDefaultEntity", () => {
	test("returns entity for organization", async () => {
		mockSelectWhere.mockResolvedValue([
			{ id: "entity-1", organizationId: "org-1", name: "Default" },
		]);
		const { getDefaultEntity } = await import("./get-organization");
		const entity = await getDefaultEntity("org-1");
		expect(entity).not.toBeNull();
		expect(entity?.name).toBe("Default");
	});

	test("returns null when no entity exists", async () => {
		mockSelectWhere.mockResolvedValue([]);
		const { getDefaultEntity } = await import("./get-organization");
		const entity = await getDefaultEntity("org-nonexistent");
		expect(entity).toBeNull();
	});
});
