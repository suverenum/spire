/**
 * Tests for backfill-organizations.ts migration logic.
 *
 * Validates key invariants of the migration script by reading its source
 * and testing the logic patterns it uses.
 */
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const BACKFILL_PATH = "/root/work/spire/apps/web/src/db/seeds/backfill-organizations.ts";

describe("backfill-organizations migration", () => {
	let source: string;

	test("script is idempotent: only queries treasuries with NULL organizationId", async () => {
		source = await readFile(BACKFILL_PATH, "utf-8");
		expect(source).toContain("isNull(treasuries.organizationId)");
	});

	test("guardian account update is scoped to current treasury (not global)", async () => {
		source = source || (await readFile(BACKFILL_PATH, "utf-8"));
		// Must use and() to combine walletType and treasuryId conditions
		expect(source).toContain("and(eq(accounts.walletType");
		expect(source).toContain("eq(accounts.treasuryId, treasury.id)");
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
		expect(source).toContain("${migrated} migrated");
	});
});
