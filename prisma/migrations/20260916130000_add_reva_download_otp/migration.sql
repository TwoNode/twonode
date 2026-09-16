-- CreateTable
CREATE TABLE "DownloadOtp" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DownloadOtp_reference_target_email_createdAt_idx" ON "DownloadOtp"("reference", "target", "email", "createdAt");
