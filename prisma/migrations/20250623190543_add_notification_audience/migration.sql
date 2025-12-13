-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('SPECIFIC_USERS', 'GENERAL_USERS', 'GENERAL_ADMINS', 'SUPERADMIN', 'ALL_USERS');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "audience" "NotificationAudience" NOT NULL DEFAULT 'SPECIFIC_USERS';

-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- AlterTable
ALTER TABLE "Property" ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- CreateIndex
CREATE INDEX "Notification_audience_idx" ON "Notification"("audience");
