-- Push preferences, quiet hours and a burst cool-down (TASK-0015 1I.4, 1I.5):
-- what a person wants pushed to the app, and a one-push-per-window claim table.
-- Purely additive (two new tables), so it is safe to deploy before the code
-- that uses them. No row in "PushPreference" means the defaults.
CREATE TABLE IF NOT EXISTS "PushPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "categoriesOff" TEXT[],
    "quietEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietStart" INTEGER NOT NULL DEFAULT 1320,
    "quietEnd" INTEGER NOT NULL DEFAULT 420,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushPreference_userId_platform_key" ON "PushPreference"("userId", "platform");

CREATE TABLE IF NOT EXISTS "PushCooldown" (
    "id" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushCooldown_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PushCooldown_sentAt_idx" ON "PushCooldown"("sentAt");
