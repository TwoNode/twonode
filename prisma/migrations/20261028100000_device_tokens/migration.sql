-- Push notifications for the native app (TASK-0015 1I.1): one row per app
-- install that can be sent a push. Purely additive (a new table), so it is safe
-- to deploy before the code that uses it.
CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_userId_platform_deviceId_key" ON "DeviceToken"("userId", "platform", "deviceId");
CREATE INDEX IF NOT EXISTS "DeviceToken_userId_platform_idx" ON "DeviceToken"("userId", "platform");
