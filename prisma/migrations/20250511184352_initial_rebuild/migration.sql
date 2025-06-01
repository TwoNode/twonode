-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'PAYMENT', 'PROPERTY');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    "references" TEXT[],
    "title" TEXT,
    "description" TEXT,
    "status" TEXT,
    "paymentStatus" TEXT,
    "paymentLink" TEXT,
    "statusMessage" TEXT,
    "error" TEXT,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "lga" TEXT NOT NULL,
    "parcelId" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "documentsUrls" TEXT[],
    "comments" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeUserProperty" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    "requester" TEXT,
    "description" TEXT,
    "status" TEXT,
    "paymentStatus" TEXT,
    "statusMessage" TEXT,
    "error" TEXT,
    "email" TEXT NOT NULL,
    "userPhoneNumber" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "lga" TEXT NOT NULL,
    "parcelId" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "documentsUrls" TEXT[],
    "comments" TEXT,
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneTimeUserProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevaUser" (
    "id" TEXT NOT NULL,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevaUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dismissedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");
CREATE UNIQUE INDEX "OneTimeUserProperty_reference_key" ON "OneTimeUserProperty"("reference");
CREATE UNIQUE INDEX "RevaUser_kindeId_key" ON "RevaUser"("kindeId");
CREATE UNIQUE INDEX "RevaUser_email_key" ON "RevaUser"("email");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Foreign Keys
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "RevaUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
