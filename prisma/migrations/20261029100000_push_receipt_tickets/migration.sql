-- Push delivery receipts (TASK-0015 1I.6): one row for each push the push
-- service accepted, kept until its receipt is looked up (about 15 minutes after
-- the send; the service clears receipts after 24 hours). Purely additive (a new
-- table), so it is safe to deploy before the code that uses it.
CREATE TABLE IF NOT EXISTS "PushReceiptTicket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushReceiptTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushReceiptTicket_ticketId_key" ON "PushReceiptTicket"("ticketId");
CREATE INDEX IF NOT EXISTS "PushReceiptTicket_sentAt_idx" ON "PushReceiptTicket"("sentAt");
