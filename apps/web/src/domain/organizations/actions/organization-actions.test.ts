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
		// CAS update succeeds (1 row returned)
		mockUpdateReturning.mockResolvedValueOnce([{ id: "t-1" }]);

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

	test("throws to roll back inserts when CAS update loses race", async () => {
		// Select shows no org (both concurrent requests see this)
		mockSelectWhere.mockResolvedValueOnce([{ organizationId: null, entityId: null }]);
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-orphan" }])
			.mockResolvedValueOnce([{ id: "entity-orphan" }]);
		// CAS update returns 0 rows — another request already linked
		mockUpdateReturning.mockResolvedValueOnce([]);

		const { createOrganizationForTreasury } = await import("./organization-actions");
		await expect(createOrganizationForTreasury("t-1", "My Org")).rejects.toThrow(
			"Treasury was linked by a concurrent request",
		);
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

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() =>
		Promise.resolve({
			treasuryId: "t-1",
			tempoAddress: "0x1234",
			treasuryName: "Test",
			authenticatedAt: Date.now(),
			organizationId: "org-1",
			organizationName: "Test Org",
		}),
	),
}));

describe("updateOrganizationName", () => {
	test("updates own organization name", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		const result = await updateOrganizationName("org-1", "New Name");
		expect(result.error).toBeUndefined();
		expect(mockUpdateSet).toHaveBeenCalledWith({ name: "New Name" });
	});

	test("rejects renaming another organization", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		const result = await updateOrganizationName("org-other", "Hijacked");
		expect(result.error).toBe("Not authorized to rename this organization");
	});

	test("rejects empty name", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		const result = await updateOrganizationName("org-1", "");
		expect(result.error).toBe("Organization name must be 1-100 characters");
	});

	test("rejects whitespace-only name", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		const result = await updateOrganizationName("org-1", "   ");
		expect(result.error).toBe("Organization name must be 1-100 characters");
	});

	test("rejects name over 100 characters", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		const result = await updateOrganizationName("org-1", "x".repeat(101));
		expect(result.error).toBe("Organization name must be 1-100 characters");
	});

	test("trims whitespace from name before saving", async () => {
		const { updateOrganizationName } = await import("./organization-actions");
		await updateOrganizationName("org-1", "  Trimmed Name  ");
		expect(mockUpdateSet).toHaveBeenCalledWith({ name: "Trimmed Name" });
	});

	test("rejects when not authenticated", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { updateOrganizationName } = await import("./organization-actions");
		const result = await updateOrganizationName("org-1", "New Name");
		expect(result.error).toBe("Not authenticated");
	});
});
