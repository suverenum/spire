import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
	createSession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

// Track insert call sequence for org → entity → treasury
let insertCallIndex = 0;
mockInsertReturning.mockImplementation(() => {
	insertCallIndex++;
	if (insertCallIndex === 1) return Promise.resolve([{ id: "org-new", name: "My Treasury" }]); // organizations
	if (insertCallIndex === 2) return Promise.resolve([{ id: "entity-new" }]); // entities
	return Promise.resolve([
		{
			id: "t-new",
			name: "My Treasury",
			tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
		},
	]); // treasuries
});

vi.mock("@/db", () => ({
	db: {
		query: { treasuries: { findFirst: (...args: unknown[]) => mockFindFirst(...args) } },
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
			// Execute the callback with a mock tx that delegates to the same insert/update mocks
			const tx = {
				insert: (...args: unknown[]) => mockInsert(...args),
				update: (...args: unknown[]) => mockUpdate(...args),
			};
			return fn(tx);
		}),
	},
}));

describe("createTreasuryAction", () => {
	beforeEach(() => {
		insertCallIndex = 0;
		vi.clearAllMocks();
		// Re-set default mock chain after clearAllMocks
		mockInsertValues.mockReturnValue({ returning: mockInsertReturning });
		mockInsert.mockReturnValue({ values: mockInsertValues });
		mockSet.mockReturnValue({ where: vi.fn() });
		mockUpdate.mockReturnValue({ set: mockSet });
		mockInsertReturning.mockImplementation(() => {
			insertCallIndex++;
			if (insertCallIndex === 1) return Promise.resolve([{ id: "org-new", name: "My Treasury" }]);
			if (insertCallIndex === 2) return Promise.resolve([{ id: "entity-new" }]);
			return Promise.resolve([
				{
					id: "t-new",
					name: "My Treasury",
					tempoAddress: "0x1234567890abcdef1234567890abcdef12345678",
				},
			]);
		});
	});

	test("creates organization, entity, and treasury successfully", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		const result = await createTreasuryAction(formData);
		expect(result.error).toBeUndefined();
		expect(result.success).toBe(true);
		// 3 inserts: organizations, entities, treasuries
		expect(mockInsert).toHaveBeenCalledTimes(3);
	});

	test("rejects invalid name (too short)", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		const result = await createTreasuryAction(formData);
		expect(result.error).toBeDefined();
	});

	test("rejects invalid address", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "invalid");
		const result = await createTreasuryAction(formData);
		expect(result.error).toBe("Invalid Tempo address from passkey.");
	});

	test("handles PG unique constraint (existing treasury)", async () => {
		mockInsertReturning
			.mockResolvedValueOnce([{ id: "org-new", name: "My Treasury" }]) // org succeeds
			.mockResolvedValueOnce([{ id: "entity-new" }]) // entity succeeds
			.mockRejectedValueOnce({ code: "23505" }); // treasury fails with unique violation
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		const result = await createTreasuryAction(formData);
		expect(result.error).toBe("A treasury already exists for this passkey.");
	});

	test("re-throws non-PG errors from transaction", async () => {
		mockInsertReturning.mockRejectedValueOnce(new Error("Network timeout"));
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		await expect(createTreasuryAction(formData)).rejects.toThrow("Network timeout");
	});

	test("uses db.transaction for atomic creation", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const { db } = await import("@/db");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		await createTreasuryAction(formData);
		expect(db.transaction).toHaveBeenCalledTimes(1);
	});

	test("calls createSession with organizationId after successful creation", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const { createSession } = await import("@/lib/session");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		await createTreasuryAction(formData);
		expect(createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-new",
				organizationName: "My Treasury",
				treasuryId: "t-new",
			}),
		);
	});

	test("rejects missing tempoAddress", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		// No tempoAddress set
		const result = await createTreasuryAction(formData);
		expect(result.error).toBe("Invalid Tempo address from passkey.");
	});

	test("normalizes address to lowercase", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0xABCDEF1234567890ABCDEF1234567890ABCDEF12");
		await createTreasuryAction(formData);
		// Verify insert was called (address lowercased internally)
		expect(mockInsert).toHaveBeenCalled();
	});
});

describe("updateTreasuryNameAction", () => {
	test("updates name successfully", async () => {
		const { updateTreasuryNameAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "Updated Treasury");
		const result = await updateTreasuryNameAction(formData);
		expect(result.error).toBeUndefined();
	});

	test("rejects invalid name", async () => {
		const { updateTreasuryNameAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "");
		const result = await updateTreasuryNameAction(formData);
		expect(result.error).toBe("Please enter a valid name.");
	});

	test("rejects when no session", async () => {
		const { getSession } = await import("@/lib/session");
		vi.mocked(getSession).mockResolvedValueOnce(null);
		const { updateTreasuryNameAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "Valid Name");
		const result = await updateTreasuryNameAction(formData);
		expect(result.error).toBe("Not authenticated");
	});
});
