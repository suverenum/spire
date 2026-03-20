import { describe, expect, test, vi } from "vitest";
import { DEFAULT_SESSION } from "@/test/mocks";

vi.mock("@/lib/session", () => ({
	getSession: vi.fn(() => Promise.resolve(DEFAULT_SESSION)),
	createSession: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "t-new" }]);
const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

vi.mock("@/db", () => ({
	db: {
		query: { treasuries: { findFirst: (...args: unknown[]) => mockFindFirst(...args) } },
		insert: (...args: unknown[]) => mockInsert(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
	},
}));

describe("createTreasuryAction", () => {
	test("creates treasury successfully", async () => {
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		const result = await createTreasuryAction(formData);
		expect(result.error).toBeUndefined();
		expect(result.success).toBe(true);
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
		mockInsertReturning.mockRejectedValueOnce({ code: "23505" });
		const { createTreasuryAction } = await import("./treasury-actions");
		const formData = new FormData();
		formData.set("name", "My Treasury");
		formData.set("tempoAddress", "0x1234567890abcdef1234567890abcdef12345678");
		const result = await createTreasuryAction(formData);
		expect(result.error).toBe("A treasury already exists for this passkey.");
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
