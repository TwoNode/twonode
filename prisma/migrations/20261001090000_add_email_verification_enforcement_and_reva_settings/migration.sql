-- Adds emailVerifiedVia to user tables across platforms,
-- EmailVerificationOtp for 6-digit verification codes,
-- and reva_settings for REVA platform configuration.

BEGIN;

-- AlterTable
ALTER TABLE "SurfboardUser" ADD COLUMN IF NOT EXISTS "emailVerifiedVia" TEXT;

-- AlterTable
ALTER TABLE "RevaUser" ADD COLUMN IF NOT EXISTS "emailVerifiedVia" TEXT;

-- AlterTable
ALTER TABLE "GBCUser" ADD COLUMN IF NOT EXISTS "emailVerifiedVia" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmailVerificationOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reva_settings" (
    "id" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "reva_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmailVerificationOtp_userId_platform_idx" ON "EmailVerificationOtp"("userId", "platform");

COMMIT;
