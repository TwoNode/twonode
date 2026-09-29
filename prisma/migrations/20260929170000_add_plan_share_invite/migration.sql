-- CreateTable
CREATE TABLE "surfboard_plan_share_invites" (
    "id" TEXT NOT NULL,
    "planId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sharedByUserId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "surfboard_plan_share_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surfboard_plan_share_invites_tokenHash_key" ON "surfboard_plan_share_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_invites_email_idx" ON "surfboard_plan_share_invites"("email");

-- CreateIndex
CREATE INDEX "surfboard_plan_share_invites_planId_idx" ON "surfboard_plan_share_invites"("planId");

-- AddForeignKey
ALTER TABLE "surfboard_plan_share_invites" ADD CONSTRAINT "surfboard_plan_share_invites_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SurfboardPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
