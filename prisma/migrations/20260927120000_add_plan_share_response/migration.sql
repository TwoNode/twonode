-- CreateTable
CREATE TABLE "surfboard_plan_share_responses" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,

    CONSTRAINT "surfboard_plan_share_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surfboard_plan_share_responses_planId_sharedWithUserId_key" ON "surfboard_plan_share_responses"("planId", "sharedWithUserId");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_responses_sharedWithUserId_idx" ON "surfboard_plan_share_responses"("sharedWithUserId");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_responses_sharedByUserId_idx" ON "surfboard_plan_share_responses"("sharedByUserId");

-- AddForeignKey
ALTER TABLE "surfboard_plan_share_responses" ADD CONSTRAINT "surfboard_plan_share_responses_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
