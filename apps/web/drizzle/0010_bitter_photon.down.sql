-- Down migration for 0010_bitter_photon.sql
-- Reverses: encrypted_key column on accounts

ALTER TABLE "accounts" DROP COLUMN IF EXISTS "encrypted_key";
