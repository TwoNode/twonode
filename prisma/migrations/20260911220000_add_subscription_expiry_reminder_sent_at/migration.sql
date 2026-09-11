-- Adds the dedupe marker for the subscription-expiry-reminder cron job.
-- Nullable, additive, no backfill needed.
ALTER TABLE "Subscription" ADD COLUMN "expiryReminderSentAt" TIMESTAMP(3);
