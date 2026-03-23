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
	test("creates organization, default entity, and links to treasury in transaction", async () => {
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new" }])
			.mockResolvedValueOnce([{ id: "entity-new" }]);
		mockUpdateReturning.mockResolvedValueOnce([{ id: "t-1" }]); // treasury update returns row

		const { createOrganizationForTreasury } = await import("./organization-actions");
		const result = await createOrganizationForTreasury("t-1", "My Org");

		expect(result.organizationId).toBe("org-new");
		expect(result.entityId).toBe("entity-new");
		expect(mockInsert).toHaveBeenCalledTimes(2); // org + entity

		const { db } = await import("@/db");
		expect(db.transaction).toHaveBeenCalledTimes(1); // wrapped in transaction
	});

	test("returns existing org when concurrent request already linked", async () => {
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new" }])
			.mockResolvedValueOnce([{ id: "entity-new" }]);
		mockUpdateReturning.mockResolvedValueOnce([]); // 0 rows updated = race lost
		mockSelectWhere.mockResolvedValueOnce([{ organizationId: "org-existing" }]);

		const { createOrganizationForTreasury } = await import("./organization-actions");
		const result = await createOrganizationForTreasury("t-1", "My Org");

		expect(result.organizationId).toBe("org-existing");
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
