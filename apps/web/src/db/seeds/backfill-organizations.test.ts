/**
 * Tests for backfill-organizations.ts migration logic.
 *
 * Validates key invariants of the migration script by reading its source
 * and testing the logic patterns it uses.
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockTxInsertReturning = vi.fn();
const mockTxInsertValues = vi.fn().mockReturnValue({ returning: mockTxInsertReturning });
const mockTxInsert = vi.fn().mockReturnValue({ values: mockTxInsertValues });
const mockTxUpdateReturning = vi.fn();
const mockTxUpdateWhere = vi.fn().mockReturnValue({ returning: mockTxUpdateReturning });
const mockTxUpdateSet = vi.fn().mockReturnValue({ where: mockTxUpdateWhere });
const mockTxUpdate = vi.fn().mockReturnValue({ set: mockTxUpdateSet });
const mockDbUpdateWhere = vi.fn();
const mockDbUpdateSet = vi.fn().mockReturnValue({ where: mockDbUpdateWhere });
const mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbUpdateSet });
const mockTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
	const tx = {
		insert: (...args: unknown[]) => mockTxInsert(...args),
		update: (...args: unknown[]) => mockTxUpdate(...args),
	};
	return fn(tx);
});

vi.mock("@/db", () => ({
	db: {
		transaction: mockTransaction,
		update: mockDbUpdate,
	},
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKFILL_PATH = resolve(__dirname, "backfill-organizations.ts");

describe("backfill-organizations migration", () => {
	let source: string;

	beforeEach(() => {
		vi.clearAllMocks();
		mockTxInsertValues.mockReturnValue({ returning: mockTxInsertReturning });
		mockTxInsert.mockReturnValue({ values: mockTxInsertValues });
		mockTxUpdateWhere.mockReturnValue({ returning: mockTxUpdateReturning });
		mockTxUpdateSet.mockReturnValue({ where: mockTxUpdateWhere });
		mockTxUpdate.mockReturnValue({ set: mockTxUpdateSet });
		mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere });
		mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet });
	});

	test("treats CAS-lost treasuries as already migrated and still backfills guardian categories", async () => {
		mockTxInsertReturning
			.mockResolvedValueOnce([{ id: "org-1" }])
			.mockResolvedValueOnce([{ id: "entity-1" }]);
		mockTxUpdateReturning.mockResolvedValueOnce([]);
		mockDbUpdateWhere.mockResolvedValueOnce(undefined);

		const { migrateTreasury } = await import("./backfill-organizations");
		const result = await migrateTreasury({ id: "treasury-1", name: "Treasury" });

		expect(result).toBe("already-linked");
		expect(mockTransaction).toHaveBeenCalledTimes(1);
		expect(mockTxInsert).toHaveBeenCalledTimes(2);
		expect(mockTxUpdate).toHaveBeenCalledTimes(1);
		expect(mockDbUpdate).toHaveBeenCalledTimes(1);
		expect(mockDbUpdateWhere).toHaveBeenCalledTimes(1);
	});

	test("script is idempotent: only queries treasuries with NULL organizationId", async () => {
		source = await readFile(BACKFILL_PATH, "utf-8");
		expect(source).toContain("isNull(treasuries.organizationId)");
	});

	test("guardian account update is scoped to current treasury (not global)", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		// Must use and() to combine walletType and treasuryId conditions
		expect(source).toContain("and(eq(accounts.walletType");
		expect(source).toContain("eq(accounts.treasuryId, treasuryId)");
	});

	test("individual treasury failure does not stop migration (try/catch in loop)", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		// The for loop must contain a try/catch that increments failed counter
		expect(source).toContain("for (const treasury of unmigrated)");
		expect(source).toContain("} catch (err) {");
		expect(source).toContain("failed++");
	});

	test("uses fallback name for empty/null treasury names", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		expect(source).toContain('treasury.name || "Unnamed Organization"');
	});

	test("per-treasury writes are wrapped in a transaction", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		expect(source).toContain("db.transaction(async (tx)");
		// Verify inserts/updates use tx, not db directly
		const txBlock = source.slice(source.indexOf("db.transaction"));
		expect(txBlock).toContain("await tx");
	});

	test("treasury update uses CAS guard (organization_id IS NULL)", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		// The update WHERE clause must include isNull check to avoid overwriting concurrent links
		expect(source).toContain("isNull(treasuries.organizationId)");
		// Must check affected row count
		expect(source).toContain("updated.length === 0");
		expect(source).toContain('return "already-linked" as const');
	});

	test("creates org before entity (entity depends on orgId)", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		const orgInsertIdx = source.indexOf("insert(organizations)");
		const entityInsertIdx = source.indexOf("insert(entities)");
		// Org insert must come before entity insert
		expect(orgInsertIdx).toBeGreaterThan(-1);
		expect(entityInsertIdx).toBeGreaterThan(orgInsertIdx);
	});

	test("links treasury to both org and entity after creation", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		expect(source).toContain("organizationId: org.id, entityId: entity.id");
	});

	test("entity default name is 'Default'", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		expect(source).toContain('name: "Default"');
	});

	test("tracks migration counts (migrated and failed)", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		expect(source).toContain("migrated++");
		expect(source).toContain("failed++");
		expect(source).toContain(`\${migrated} migrated`);
	});
});
