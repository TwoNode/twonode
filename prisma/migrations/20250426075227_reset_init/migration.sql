-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "status" TEXT,
    "statusMessage" TEXT,
    "error" TEXT,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "lga" TEXT NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "supportingDocumentsUrls" TEXT[],
    "additionalComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeUserProperty" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 10),
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
    "supportingDocumentsUrls" TEXT[],
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneTimeUserProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeUserProperty_reference_key" ON "OneTimeUserProperty"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_userId_key" ON "VerificationToken"("userId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
