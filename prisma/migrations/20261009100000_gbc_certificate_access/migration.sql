-- AlterTable
ALTER TABLE "gbc_tickets" ADD COLUMN IF NOT EXISTS "certificateEndDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "certificateEventName" TEXT,
ADD COLUMN IF NOT EXISTS "certificateIssued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "certificateIssuedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "certificatePublicId" VARCHAR(36),
ADD COLUMN IF NOT EXISTS "certificateStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "certificateSubTheme" TEXT,
ADD COLUMN IF NOT EXISTS "certificateTheme" TEXT,
ADD COLUMN IF NOT EXISTS "certificateVenue" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "gbc_certificate_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHmac" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gbc_certificate_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gbc_certificate_otps_email_usedAt_expiresAt_idx" ON "gbc_certificate_otps"("email", "usedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gbc_tickets_certificatePublicId_key" ON "gbc_tickets"("certificatePublicId");
