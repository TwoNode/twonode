-- Native-app (mobile) sessions: which device a refresh-token family belongs to,
-- so a lost phone can be listed and revoked on its own. All columns are
-- nullable and unused by browser sessions, so this is additive.
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "deviceLabel" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "appVersion" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RefreshToken_userId_platform_deviceId_idx" ON "RefreshToken"("userId", "platform", "deviceId");
