-- CreateEnum
CREATE TYPE "GBCUserNotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GBCUserNotificationAudience" AS ENUM ('SPECIFIC_USERS', 'GENERAL_ADMINS', 'SUPERADMIN', 'ALL_USERS');

-- CreateTable
CREATE TABLE "gbc_user_notifications" (
    "id" TEXT NOT NULL,
    "type" "GBCUserNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience" "GBCUserNotificationAudience" NOT NULL DEFAULT 'SPECIFIC_USERS',
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbc_user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gbc_user_notifications_createdAt_idx" ON "gbc_user_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "gbc_user_notifications_audience_idx" ON "gbc_user_notifications"("audience");
