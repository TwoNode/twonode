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
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_reference_key" ON "Property"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeUserProperty_reference_key" ON "OneTimeUserProperty"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
