-- Scopes GBC gallery items and contact inquiries to an edition, like
-- speakers/sponsors/partners/tickets already are (gbc_editions FK, default
-- '2.0'). Additive: existing rows keep working through the default, then are
-- moved to the edition they actually belong to.
--
-- Backfill:
--   * gallery items -> the edition whose start year equals the item's `year`
--     (earliest such edition if two share a year). A year that matches no
--     edition keeps the '2.0' default.
--   * inquiries -> the edition being promoted when the message arrived: the
--     earliest edition whose endDate is on/after the submission, else the most
--     recent edition, else the '2.0' default.
--
-- Backfill runs before the foreign keys are added so a bad mapping can never
-- violate them halfway through. Wrapped in a transaction so a failure leaves
-- nothing half-migrated.

BEGIN;

-- AlterTable
ALTER TABLE "gbc_gallery" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0';

-- AlterTable
ALTER TABLE "gbc_contact_inquiries" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0';

-- Backfill gallery items by year
UPDATE "gbc_gallery" AS g
SET "edition" = (
  SELECT e."key"
  FROM "gbc_editions" AS e
  WHERE EXTRACT(YEAR FROM e."startDate")::int = g."year"
  ORDER BY e."startDate" ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "gbc_editions" AS e WHERE EXTRACT(YEAR FROM e."startDate")::int = g."year"
);

-- Backfill inquiries by submission date
UPDATE "gbc_contact_inquiries" AS i
SET "edition" = COALESCE(
  (SELECT e."key" FROM "gbc_editions" AS e WHERE e."endDate" >= i."createdAt" ORDER BY e."startDate" ASC LIMIT 1),
  (SELECT e."key" FROM "gbc_editions" AS e ORDER BY e."startDate" DESC LIMIT 1),
  i."edition"
);

-- CreateIndex
CREATE INDEX "gbc_gallery_edition_idx" ON "gbc_gallery"("edition");

-- CreateIndex
CREATE INDEX "gbc_contact_inquiries_edition_idx" ON "gbc_contact_inquiries"("edition");

-- AddForeignKey
ALTER TABLE "gbc_gallery" ADD CONSTRAINT "gbc_gallery_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_contact_inquiries" ADD CONSTRAINT "gbc_contact_inquiries_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
