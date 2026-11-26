-- Crash reports from the Surfboard app (ADR-0014 / TASK-0016, D5: a table from day one). Words and
-- counts only, no account id (D3). Purely additive (a new table), so it is safe to deploy before the
-- code that uses it. Kept 30 days and purged on write by the route's service.
CREATE TABLE IF NOT EXISTS "surfboard_app_reports" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "osVersion" TEXT,
    "screen" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "aliveAt" TIMESTAMP(3),
    "memoryWarnings" INTEGER,
    "errorName" TEXT,
    "errorMessage" TEXT,
    "fatal" BOOLEAN,
    "trail" JSONB NOT NULL,

    CONSTRAINT "surfboard_app_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "surfboard_app_reports_receivedAt_idx" ON "surfboard_app_reports"("receivedAt");
