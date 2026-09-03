-- Promotes GBC editions from a JSON array inside gbc_settings.settings into
-- a real table, and turns the 5 tag columns into real foreign keys.
-- Applied by hand via psql (not `prisma db push`/`migrate`) because this
-- machine's local Postgres is missing the PostGIS extension gis.prisma's
-- models need, which blocks the schema engine on the whole datamodel, not
-- just GBC's part of it (see docs/development-history/progress.md's
-- "prisma db push is broken on this machine" entry). This file's DDL
-- matches prisma/schema/gbc.prisma exactly; verified with psql \d after
-- applying. Wrapped in a transaction so a partial failure leaves nothing
-- half-migrated.

BEGIN;

CREATE TYPE "GBCEditionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'PAST');

CREATE TABLE "gbc_editions" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "subTheme" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "GBCEditionStatus" NOT NULL,
    "ticketPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_editions_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "gbc_editions_status_idx" ON "gbc_editions"("status");

-- DB-level backstop for the "exactly one ACTIVE edition" invariant that
-- editionService.ts already enforces in app code. Prisma's schema DSL can't
-- express a partial index, so it only exists here, not in gbc.prisma.
CREATE UNIQUE INDEX "gbc_editions_one_active" ON "gbc_editions"("status") WHERE "status" = 'ACTIVE';

-- Backfill from the current JSON blob before the FKs go on, so the FK
-- constraints below have something to point at.
INSERT INTO "gbc_editions" ("key", "name", "theme", "subTheme", "venue", "startDate", "endDate", "status", "ticketPrefix", "updatedAt")
SELECT
    e->>'key',
    e->>'name',
    e->>'theme',
    e->>'subTheme',
    e->>'venue',
    (e->>'startDate')::timestamp,
    (e->>'endDate')::timestamp,
    (e->>'status')::"GBCEditionStatus",
    e->>'ticketPrefix',
    CURRENT_TIMESTAMP
FROM "gbc_settings", jsonb_array_elements(settings::jsonb->'editions') AS e;

-- The JSON copy is now redundant — settingsService.ts no longer reads or
-- writes an "editions" key, so drop it to avoid two sources of truth.
UPDATE "gbc_settings" SET settings = settings::jsonb - 'editions';

ALTER TABLE "gbc_tickets" ADD CONSTRAINT "gbc_tickets_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gbc_sponsors" ADD CONSTRAINT "gbc_sponsors_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gbc_partners" ADD CONSTRAINT "gbc_partners_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gbc_speakers" ADD CONSTRAINT "gbc_speakers_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gbc_event_stats" ADD CONSTRAINT "gbc_event_stats_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
