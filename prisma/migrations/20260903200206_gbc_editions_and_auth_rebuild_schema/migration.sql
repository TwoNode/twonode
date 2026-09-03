-- Brings test_db up to date with prisma/schema: the native-auth rebuild
-- additions (AuthProvider enum, passwordHash/authProviders, RefreshToken,
-- LoginAttempt — all additive, safe even though the auth feature isn't
-- wired up yet) plus the GBC editions promotion (gbc_editions table +
-- edition FK columns on gbc_tickets/gbc_sponsors/gbc_partners/gbc_speakers/
-- gbc_event_stats), generated via `prisma migrate diff --from-url <test_db>
-- --to-schema-datamodel prisma/schema --script`.
--
-- Unlike the local dev machine this was originally hand-applied on,
-- test_db's gbc_settings has no "editions" key in any of its rows to
-- backfill gbc_editions from — so this seeds one real row (key "2.0",
-- status PAST) from the 240 existing gbc_tickets' actual event data
-- (gbc_settings.settings->'event' and ticket numbers' "GBC2_" prefix)
-- instead, so the new edition FK columns (which default every existing
-- row to '2.0') have something to reference.
--
-- Wrapped in a transaction so a partial failure leaves nothing half-migrated.

BEGIN;

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KINDE', 'NATIVE');

-- CreateEnum
CREATE TYPE "GBCEditionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'PAST');

-- AlterTable
ALTER TABLE "CertificateOfDepositBatch" ALTER COLUMN "batchCode" SET DEFAULT concat('SurfCoD_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
ALTER COLUMN "userPaymentRef" SET DEFAULT concat('SurfCoDRef_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- AlterTable
ALTER TABLE "GBCUser" ADD COLUMN     "authProviders" "AuthProvider"[] DEFAULT ARRAY['KINDE']::"AuthProvider"[],
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "RevaUser" ADD COLUMN     "authProviders" "AuthProvider"[] DEFAULT ARRAY['KINDE']::"AuthProvider"[],
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "SurfboardUser" ADD COLUMN     "authProviders" "AuthProvider"[] DEFAULT ARRAY['KINDE']::"AuthProvider"[],
ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "surconRegNumber" SET DEFAULT concat('SURCON_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 5));

-- AlterTable
ALTER TABLE "gbc_event_stats" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0';

-- AlterTable
ALTER TABLE "gbc_partners" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0';

-- AlterTable
ALTER TABLE "gbc_speakers" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0';

-- AlterTable
ALTER TABLE "gbc_sponsors" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0';

-- AlterTable
ALTER TABLE "gbc_tickets" ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '2.0',
ALTER COLUMN "ticketNumber" DROP DEFAULT;

-- AlterTable
ALTER TABLE "withdrawal_requests" ALTER COLUMN "requestRef" SET DEFAULT concat('WD_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_platform_idx" ON "RefreshToken"("userId", "platform");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "gbc_editions_status_idx" ON "gbc_editions"("status");

-- CreateIndex
CREATE INDEX "gbc_event_stats_edition_idx" ON "gbc_event_stats"("edition");

-- CreateIndex
CREATE INDEX "gbc_partners_edition_idx" ON "gbc_partners"("edition");

-- CreateIndex
CREATE INDEX "gbc_speakers_edition_idx" ON "gbc_speakers"("edition");

-- CreateIndex
CREATE INDEX "gbc_sponsors_edition_idx" ON "gbc_sponsors"("edition");

-- CreateIndex
CREATE INDEX "gbc_tickets_edition_idx" ON "gbc_tickets"("edition");

-- Seed the "2.0" edition from gbc_settings.settings->'event' (already the
-- real Geospatial Builders Conference 2.0 data) and the "GBC2_" ticket
-- prefix observed on existing gbc_tickets rows. Status is PAST — the
-- event's date (2026-04-30) has already elapsed. This has to happen before
-- the FK constraints below, since every existing edition-column row
-- defaults to '2.0'.
INSERT INTO "gbc_editions" ("key", "name", "theme", "subTheme", "venue", "startDate", "endDate", "status", "ticketPrefix", "updatedAt")
SELECT
    '2.0',
    e->>'name',
    e->>'theme',
    e->>'subTheme',
    e->>'venue',
    (e->>'date')::timestamp,
    (e->>'date')::timestamp,
    'PAST',
    'GBC2',
    CURRENT_TIMESTAMP
FROM "gbc_settings", jsonb_extract_path(settings::jsonb, 'event') AS e
LIMIT 1;

-- The old settingsService.ts JSON "editions" key is superseded by this
-- table on every product that had it — no-op on test_db (no row carries
-- that key), kept so this migration is safe to reuse elsewhere.
UPDATE "gbc_settings" SET settings = settings::jsonb - 'editions';

-- AddForeignKey
ALTER TABLE "gbc_tickets" ADD CONSTRAINT "gbc_tickets_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_sponsors" ADD CONSTRAINT "gbc_sponsors_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_partners" ADD CONSTRAINT "gbc_partners_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_speakers" ADD CONSTRAINT "gbc_speakers_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbc_event_stats" ADD CONSTRAINT "gbc_event_stats_edition_fkey" FOREIGN KEY ("edition") REFERENCES "gbc_editions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
