-- Adds PendingRegistration: holding record for OTP/link-first registration,
-- so no User row is created until the signup's verification secret is confirmed.

BEGIN;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PendingRegistration" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'OTP',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_platform_email_key" ON "PendingRegistration"("platform", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingRegistration_expiresAt_idx" ON "PendingRegistration"("expiresAt");

COMMIT;
