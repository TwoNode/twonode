-- AlterTable
ALTER TABLE "gbc_editions" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "gbc_editions_deletedAt_idx" ON "gbc_editions"("deletedAt");
