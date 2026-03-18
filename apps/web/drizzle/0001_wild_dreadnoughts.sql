-- Delete duplicate treasury rows, keeping only the oldest one (the original).
-- This is needed because the prior schema allowed concurrent inserts (race condition).
-- Keeps oldest to match app logic which deterministically selects the first-created treasury.
DELETE FROM "treasuries"
WHERE "id" NOT IN (
  SELECT "id" FROM "treasuries" ORDER BY "created_at" ASC LIMIT 1
);--> statement-breakpoint
ALTER TABLE "treasuries" ADD COLUMN "singleton_guard" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "treasuries" ADD CONSTRAINT "treasuries_singleton_guard_unique" UNIQUE("singleton_guard");