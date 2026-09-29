-- CreateTable
CREATE TABLE "surfboard_plan_comments" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "surfboard_plan_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "surfboard_plan_comments_planId_idx" ON "surfboard_plan_comments"("planId");

-- AddForeignKey
ALTER TABLE "surfboard_plan_comments" ADD CONSTRAINT "surfboard_plan_comments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
