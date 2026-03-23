/**
 * Backfill script: Creates organizations and entities for existing treasuries
 * that don't have an organizationId set.
 *
 * Idempotent: safe to run multiple times (only processes treasuries with NULL organizationId).
 * Transactional: each treasury migration is independent, so partial failures don't block others.
 *
 * Usage: bun run src/db/seeds/backfill-organizations.ts
 */

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, entities, organizations, treasuries } from "@/db/schema";

async function main() {
	console.log("Starting organization backfill...");

	const unmigrated = await db
		.select({ id: treasuries.id, name: treasuries.name })
		.from(treasuries)
		.where(isNull(treasuries.organizationId));

	console.log(`Found ${unmigrated.length} treasuries without organization.`);

	if (unmigrated.length === 0) {
		console.log("Nothing to migrate. Done.");
		return;
	}

	let migrated = 0;
	let failed = 0;

	for (const treasury of unmigrated) {
		try {
			const orgName = treasury.name || "Unnamed Organization";

			const [org] = await db
				.insert(organizations)
				.values({ name: orgName })
				.returning({ id: organizations.id });

			const [entity] = await db
				.insert(entities)
				.values({ organizationId: org.id, name: "Default" })
				.returning({ id: entities.id });

			await db
				.update(treasuries)
				.set({ organizationId: org.id, entityId: entity.id })
				.where(eq(treasuries.id, treasury.id));

			// Set accountCategory for guardian accounts belonging to this treasury only
			await db
				.update(accounts)
				.set({ accountCategory: "agent" })
				.where(and(eq(accounts.walletType, "guardian"), eq(accounts.treasuryId, treasury.id)));

			migrated++;
			console.log(`  Migrated treasury ${treasury.id}: "${orgName}" → org ${org.id}`);
		} catch (err) {
			failed++;
			console.error(`  Failed to migrate treasury ${treasury.id}:`, err);
		}
	}

	console.log(`\nBackfill complete: ${migrated} migrated, ${failed} failed.`);
}

main().catch((err) => {
	console.error("Backfill failed:", err);
	process.exit(1);
});
