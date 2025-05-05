-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 10);
