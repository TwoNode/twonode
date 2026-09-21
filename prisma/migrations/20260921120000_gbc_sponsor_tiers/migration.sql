-- Sponsor tiers become admin-managed rows instead of a fixed three-value enum.
--
-- gbc_sponsors.tier changes from the "GBCSponsorTier" enum to TEXT holding a
-- key of the new gbc_sponsor_tiers table. The three original values are seeded
-- under the SAME keys (HEADLINE, IMPACT, SUPPORTING), so every existing sponsor
-- keeps its tier with no data rewrite, and code that compares against those
-- keys keeps working. The column is converted in place (ALTER ... TYPE), never
-- dropped, so no sponsor data is lost.
--
-- Wrapped in a transaction so a failure leaves nothing half-migrated.

BEGIN;

CREATE TABLE "gbc_sponsor_tiers" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" TEXT NOT NULL DEFAULT 'STANDARD',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_sponsor_tiers_pkey" PRIMARY KEY ("key")
);

-- Seed the original tiers, in the order (and card sizes) the public page used.
INSERT INTO "gbc_sponsor_tiers" ("key", "name", "description", "size", "order", "updatedAt") VALUES
    ('HEADLINE',   'Headline Sponsors',   'Our premier partners', 'FEATURED', 0, CURRENT_TIMESTAMP),
    ('IMPACT',     'Impact Sponsors',     NULL,                   'STANDARD', 1, CURRENT_TIMESTAMP),
    ('SUPPORTING', 'Supporting Sponsors', NULL,                   'COMPACT',  2, CURRENT_TIMESTAMP);

ALTER TABLE "gbc_sponsors" ALTER COLUMN "tier" TYPE TEXT USING "tier"::text;

DROP TYPE "GBCSponsorTier";

ALTER TABLE "gbc_sponsors"
    ADD CONSTRAINT "gbc_sponsors_tier_fkey" FOREIGN KEY ("tier") REFERENCES "gbc_sponsor_tiers"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
