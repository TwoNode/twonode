-- AlterTable
ALTER TABLE "SurfboardNotification" ADD COLUMN     "showAsModal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "endsAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SurfboardNotification_showAsModal_startsAt_endsAt_idx" ON "SurfboardNotification"("showAsModal", "startsAt", "endsAt");
