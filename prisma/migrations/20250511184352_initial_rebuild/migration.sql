-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 9)),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeUserProperty" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 9)),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneTimeUserProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "kindeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeUserProperty_reference_key" ON "OneTimeUserProperty"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "User_kindeId_key" ON "User"("kindeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
