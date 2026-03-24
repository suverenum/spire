/**
 * Backfill script: Creates organizations and entities for existing treasuries
 * that don't have an organizationId set.
 *
 * Idempotent: safe to run multiple times (only processes treasuries with NULL organizationId).
 * Transactional: each treasury migration is independent, so partial failures don't block others.
 *
 * Usage: bun run src/db/seeds/backfill-organizations.ts
 */

import { fileURLToPath } from "node:url";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, entities, organizations, treasuries } from "@/db/schema";

type TreasuryToMigrate = {
	id: string;
	name: string | null;
};

type AccountUpdater = Pick<typeof db, "update">;

class TreasuryAlreadyLinkedError extends Error {
	constructor(treasuryId: string) {
		super(`Treasury ${treasuryId} was already linked concurrently`);
	}
}

export async function backfillGuardianAccountCategory(
	executor: AccountUpdater,
	treasuryId: string,
) {
	await executor
		.update(accounts)
		.set({ accountCategory: "agent" })
		.where(and(eq(accounts.walletType, "guardian"), eq(accounts.treasuryId, treasuryId)));
}

export async function migrateTreasury(treasury: TreasuryToMigrate) {
	const orgName = treasury.name || "Unnamed Organization";

	try {
		// Wrap per-treasury writes in a transaction so partial failures
		// don't leave orphaned org/entity rows
		await db.transaction(async (tx) => {
			const [org] = await tx
				.insert(organizations)
				.values({ name: orgName })
				.returning({ id: organizations.id });

			const [entity] = await tx
				.insert(entities)
				.values({ organizationId: org.id, name: "Default" })
				.returning({ id: entities.id });

			// CAS guard: only link if treasury still unlinked (concurrent login may have linked it)
			const updated = await tx
				.update(treasuries)
				.set({ organizationId: org.id, entityId: entity.id })
				.where(and(eq(treasuries.id, treasury.id), isNull(treasuries.organizationId)))
				.returning({ id: treasuries.id });

			if (updated.length === 0) {
				throw new TreasuryAlreadyLinkedError(treasury.id);
			}

			await backfillGuardianAccountCategory(tx, treasury.id);

			console.log(`  Migrated treasury ${treasury.id}: "${orgName}" → org ${org.id}`);
		});

		return "migrated" as const;
	} catch (err) {
		if (err instanceof TreasuryAlreadyLinkedError) {
			await backfillGuardianAccountCategory(db, treasury.id);
			console.log(
				`  Treasury ${treasury.id} was already linked concurrently; guardian account categories backfilled.`,
			);
			return "already-linked" as const;
		}

		throw err;
	}
}

export async function main() {
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
			await migrateTreasury(treasury);
			migrated++;
		} catch (err) {
			failed++;
			console.error(`  Failed to migrate treasury ${treasury.id}:`, err);
		}
	}

	console.log(`\nBackfill complete: ${migrated} migrated, ${failed} failed.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error("Backfill failed:", err);
		process.exit(1);
	});
}
