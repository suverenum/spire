import { beforeEach, describe, expect, test, vi } from "vitest";

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/db", () => ({
	db: {
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		select: (...args: unknown[]) => mockSelect(...args),
		transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
			const tx = {
				insert: (...args: unknown[]) => mockInsert(...args),
				update: (...args: unknown[]) => mockUpdate(...args),
				select: (...args: unknown[]) => mockSelect(...args),
			};
			return fn(tx);
		}),
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
	mockInsert.mockReturnValue({ values: mockInsertValues });
	mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
	mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
	mockUpdate.mockReturnValue({ set: mockUpdateSet });
	mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
	mockSelect.mockReturnValue({ from: mockSelectFrom });
});

describe("createOrganizationForTreasury", () => {
	test("creates organization, entity, and links when treasury has no org", async () => {
		// First select: treasury has no org yet
		mockSelectWhere.mockResolvedValueOnce([{ organizationId: null, entityId: null }]);
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new" }])
			.mockResolvedValueOnce([{ id: "entity-new" }]);

		const { createOrganizationForTreasury } = await import("./organization-actions");
		const result = await createOrganizationForTreasury("t-1", "My Org");

		expect(result.organizationId).toBe("org-new");
		expect(result.entityId).toBe("entity-new");
		expect(mockInsert).toHaveBeenCalledTimes(2); // org + entity

		const { db } = await import("@/db");
		expect(db.transaction).toHaveBeenCalledTimes(1);
	});

	test("returns existing org without inserting when treasury already linked", async () => {
		// Treasury already has an org — check-first returns it
		mockSelectWhere.mockResolvedValueOnce([
			{ organizationId: "org-existing", entityId: "entity-existing" },
		]);

		const { createOrganizationForTreasury } = await import("./organization-actions");
		const result = await createOrganizationForTreasury("t-1", "My Org");

		expect(result.organizationId).toBe("org-existing");
		expect(result.entityId).toBe("entity-existing");
		// No inserts should have been made
		expect(mockInsert).not.toHaveBeenCalled();
	});

	test("propagates org failure to caller", async () => {
		mockSelectWhere.mockResolvedValueOnce([{ organizationId: null, entityId: null }]);
		mockInsertReturning.mockRejectedValueOnce(new Error("DB connection lost"));

		const { createOrganizationForTreasury } = await import("./organization-actions");
		await expect(createOrganizationForTreasury("t-1", "My Org")).rejects.toThrow(
			"DB connection lost",
		);
	});

	test("propagates entity failure to caller", async () => {
		mockSelectWhere.mockResolvedValueOnce([{ organizationId: null, entityId: null }]);
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new" }])
			.mockRejectedValueOnce(new Error("Entity insert failed"));

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
		expect(mockUpdateSet).toHaveBeenCalledWith({ name: "New Name" });
	});
});
