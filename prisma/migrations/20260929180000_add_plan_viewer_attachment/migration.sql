-- CreateTable
CREATE TABLE "surfboard_plan_viewer_attachments" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "viewerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surfboard_plan_viewer_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "surfboard_plan_viewer_attachments_planId_viewerId_idx" ON "surfboard_plan_viewer_attachments"("planId", "viewerId");

-- AddForeignKey
ALTER TABLE "surfboard_plan_viewer_attachments" ADD CONSTRAINT "surfboard_plan_viewer_attachments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
