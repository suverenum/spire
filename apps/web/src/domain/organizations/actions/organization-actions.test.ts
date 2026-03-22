import { describe, expect, test, vi } from "vitest";

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("@/db", () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

describe("createOrganizationForTreasury", () => {
	test("creates organization, default entity, and links to treasury", async () => {
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new" }])
			.mockResolvedValueOnce([{ id: "entity-new" }]);

		const { createOrganizationForTreasury } = await import("./organization-actions");
		const result = await createOrganizationForTreasury("t-1", "My Org");

		expect(result.organizationId).toBe("org-new");
		expect(result.entityId).toBe("entity-new");
		expect(mockInsert).toHaveBeenCalledTimes(2); // org + entity
		expect(mockUpdate).toHaveBeenCalledTimes(1); // treasury update
	});
});

describe("updateOrganizationName", () => {
	test("updates organization name", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		await updateOrganizationName("org-1", "New Name");
		expect(mockUpdate).toHaveBeenCalled();
	});
});
