-- GBC settings become one row per edition (gbc_settings.edition, unique, FK to
-- gbc_editions.key) instead of one global blob.
--
-- The table is NOT a single row today: it holds many (the "create defaults if
-- empty" read path raced and piled up copies), and the app read
-- `findFirst()` with no ordering. The row the site actually shows is the first
-- one in the table's physical order, which is exactly what an unordered LIMIT 1
-- returns, so that is the row kept.
--
--   * kept row  -> the settings of the current edition: the ACTIVE edition, else
--                  the most recent PAST one (the same rule the app uses to pick
--                  the edition the public site shows), else the earliest
--                  UPCOMING one.
--   * all other rows are copied to gbc_settings_legacy_20260920 first, then
--     removed (they were never read). Drop that table once you have checked the
--     settings page still looks right.
--   * if there are no (non-deleted) editions at all, no row can be attached, so
--     every row is archived and the table starts empty; the app falls back to
--     defaults until an edition exists.
--
-- Wrapped in a transaction so a failure leaves nothing half-migrated.

BEGIN;

-- Keep every existing row, untouched, before anything is removed.
CREATE TABLE "gbc_settings_legacy_20260920" AS TABLE "gbc_settings";

-- AlterTable (nullable until backfilled)
ALTER TABLE "gbc_settings" ADD COLUMN "edition" TEXT;

-- The live row -> the current edition.
UPDATE "gbc_settings"
SET "edition" = (
  SELECT e."key"
  FROM "gbc_editions" AS e
  WHERE e."deletedAt" IS NULL
  ORDER BY
    CASE e."status" WHEN 'ACTIVE' THEN 0 WHEN 'PAST' THEN 1 ELSE 2 END,
    CASE WHEN e."status" = 'UPCOMING' THEN e."startDate" END ASC,
    e."startDate" DESC
  LIMIT 1
)
WHERE "id" = (SELECT "id" FROM "gbc_settings" ORDER BY ctid LIMIT 1);

-- Everything that didn't get an edition was never read and is archived above.
DELETE FROM "gbc_settings" WHERE "edition" IS NULL;

-- AlterTable
ALTER TABLE "gbc_settings" ALTER COLUMN "edition" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "gbc_settings_edition_key" ON "gbc_settings"("edition");

-- AddForeignKey
ALTER TABLE "gbc_settings" ADD CONSTRAINT "gbc_settings_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
