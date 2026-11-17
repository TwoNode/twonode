-- Legal consent (Surfboard privacy policy and terms): which version of the text a person
-- agreed to when registering. Purely additive (two nullable columns and one new table), so
-- it is safe to deploy before the code that uses them. No existing row changes.
-- AlterTable
ALTER TABLE "PendingRegistration" ADD COLUMN IF NOT EXISTS "legalAcceptedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "legalVersion" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegalConsent" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegalConsent_platform_userId_idx" ON "LegalConsent"("platform", "userId");
