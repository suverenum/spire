import { beforeEach, describe, expect, test, vi } from "vitest";

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockWhere = vi.fn();
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("@/db", () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
	mockInsert.mockReturnValue({ values: mockInsertValues });
	mockSet.mockReturnValue({ where: mockWhere });
	mockUpdate.mockReturnValue({ set: mockSet });
});

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

	test("propagates org failure to caller", async () => {
		mockInsertReturning.mockRejectedValueOnce(new Error("DB connection lost"));

		const { createOrganizationForTreasury } = await import("./organization-actions");
		await expect(createOrganizationForTreasury("t-1", "My Org")).rejects.toThrow(
			"DB connection lost",
		);
	});

	test("propagates entity failure to caller", async () => {
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new" }]) // org succeeds
			.mockRejectedValueOnce(new Error("Entity insert failed")); // entity fails

		const { createOrganizationForTreasury } = await import("./organization-actions");
		await expect(createOrganizationForTreasury("t-1", "My Org")).rejects.toThrow(
			"Entity insert failed",
		);
	});
});

describe("updateOrganizationName", () => {
	test("updates organization name with correct arguments", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		await updateOrganizationName("org-1", "New Name");
		expect(mockSet).toHaveBeenCalledWith({ name: "New Name" });
	});
});
