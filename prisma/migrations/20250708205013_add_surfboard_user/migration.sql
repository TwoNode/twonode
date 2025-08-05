-- CreateEnum
CREATE TYPE "SurfboardRole" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "SurfboardPlanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW');

-- CreateTable
CREATE TABLE "SurfboardUser" (
    "id" TEXT NOT NULL,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "SurfboardRole" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "logo" TEXT,
    "companyName" TEXT,
    "surconRegNumber" TEXT,
    "surconRegName" TEXT,
    "signature" TEXT,
    "prefix" TEXT,
    "suffix" TEXT,
    "residenceState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurfboardUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurfboardPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sharedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "planNumber" TEXT NOT NULL,
    "surveyTitle" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "referencePlanNumber" TEXT,
    "deededArea" TEXT NOT NULL,
    "facilitator" TEXT NOT NULL,
    "pillarType" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "pdfFilePath" TEXT,
    "cadFilePath" TEXT,
    "certificateFilePath" TEXT,
    "ward" TEXT,
    "lcda" TEXT,
    "lga" TEXT,
    "pillars" JSONB NOT NULL,
    "dateOnSurveyPlan" TIMESTAMP(3),
    "reasonForWithdrawalAndResubmission" TEXT,
    "status" "SurfboardPlanStatus" NOT NULL DEFAULT 'PENDING',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurfboardPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurfboardUser_kindeId_key" ON "SurfboardUser"("kindeId");

-- CreateIndex
CREATE UNIQUE INDEX "SurfboardUser_email_key" ON "SurfboardUser"("email");


-- CreateIndex
CREATE UNIQUE INDEX "SurfboardPlan_planNumber_key" ON "SurfboardPlan"("planNumber");

-- CreateIndex
CREATE INDEX "SurfboardPlan_planNumber_idx" ON "SurfboardPlan"("planNumber");

-- AddForeignKey
ALTER TABLE "SurfboardPlan" ADD CONSTRAINT "SurfboardPlan_userId_fkey" 
    FOREIGN KEY ("userId") 
    REFERENCES "SurfboardUser"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
    