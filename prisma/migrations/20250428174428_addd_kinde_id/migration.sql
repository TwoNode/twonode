/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `PasswordResetToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[kindeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kindeId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationToken" DROP CONSTRAINT "VerificationToken_userId_fkey";

-- AlterTable
ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 10);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "password",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "kindeId" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- DropTable
DROP TABLE "PasswordResetToken";

-- DropTable
DROP TABLE "VerificationToken";

-- CreateIndex
CREATE UNIQUE INDEX "User_kindeId_key" ON "User"("kindeId");
