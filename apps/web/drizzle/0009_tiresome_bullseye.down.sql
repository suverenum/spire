-- Down migration for 0009_tiresome_bullseye.sql
-- Reverses: organizations, entities tables + treasury/account extensions

DROP INDEX IF EXISTS "treasuries_entity_id_idx";
DROP INDEX IF EXISTS "treasuries_organization_id_idx";
DROP INDEX IF EXISTS "entities_organization_id_idx";

ALTER TABLE "treasuries" DROP CONSTRAINT IF EXISTS "treasuries_entity_id_entities_id_fk";
ALTER TABLE "treasuries" DROP CONSTRAINT IF EXISTS "treasuries_organization_id_organizations_id_fk";
ALTER TABLE "entities" DROP CONSTRAINT IF EXISTS "entities_organization_id_organizations_id_fk";

ALTER TABLE "treasuries" DROP COLUMN IF EXISTS "entity_id";
ALTER TABLE "treasuries" DROP COLUMN IF EXISTS "organization_id";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "account_category";

DROP TABLE IF EXISTS "entities";
DROP TABLE IF EXISTS "organizations";
