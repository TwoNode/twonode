-- Adds the shared admin-invitation table and a REVA audit log.
--
-- "AdminInvitation": invitations for new admin/staff accounts on any product
-- (platform is a string discriminator, like "PasswordResetToken"). The raw
-- token is never stored, only its sha256 hash. Nothing exists in a product's
-- user table until an invitation is accepted.
--
-- "reva_audit_logs": REVA had no audit trail at all (GBC and Surfboard already
-- have theirs). "userId" is the acting user, never the account acted on.
--
-- Additive only; no existing rows are touched.

BEGIN;

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "invitedByName" TEXT NOT NULL,
    "invitedByEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reva_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reva_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInvitation_platform_email_idx" ON "AdminInvitation"("platform", "email");

-- CreateIndex
CREATE INDEX "AdminInvitation_platform_createdAt_idx" ON "AdminInvitation"("platform", "createdAt");

-- CreateIndex
CREATE INDEX "reva_audit_logs_userId_idx" ON "reva_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "reva_audit_logs_entity_idx" ON "reva_audit_logs"("entity");

-- CreateIndex
CREATE INDEX "reva_audit_logs_createdAt_idx" ON "reva_audit_logs"("createdAt");

COMMIT;
