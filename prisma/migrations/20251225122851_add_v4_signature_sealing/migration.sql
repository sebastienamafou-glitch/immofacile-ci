/*
  Warnings:

  - You are about to drop the column `photo` on the `Lead` table. All the data in the column will be lost.
  - The `type` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `imageUrl` on the `Property` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Artisan` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `keys` on the `PushSubscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('PENDING_FEES', 'ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('LOYER', 'FRAIS_DOSSIER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'INVESTOR';
ALTER TYPE "UserRole" ADD VALUE 'ARTISAN';

-- DropForeignKey
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_userId_fkey";

-- AlterTable
ALTER TABLE "Artisan" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "assignedToId" TEXT;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "photo";

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "status" "LeaseStatus" NOT NULL DEFAULT 'PENDING_FEES',
ALTER COLUMN "isActive" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "month" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'LOYER';

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "imageUrl",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "latitude" DOUBLE PRECISION DEFAULT 5.359952,
ADD COLUMN     "longitude" DOUBLE PRECISION DEFAULT -4.008256,
ADD COLUMN     "managedById" TEXT;

-- AlterTable
ALTER TABLE "PushSubscription" DROP COLUMN "keys",
ADD COLUMN     "keys" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "commune" TEXT;

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "roiRate" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "projectName" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idCardUrl" TEXT,
    "idCardStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureProof" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "ownerSigned" BOOLEAN NOT NULL DEFAULT false,
    "tenantSigned" BOOLEAN NOT NULL DEFAULT false,
    "ownerOtp" TEXT,
    "tenantOtp" TEXT,
    "ownerIp" TEXT,
    "tenantIp" TEXT,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "SignatureProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantProfile_userId_key" ON "TenantProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureProof_leaseId_key" ON "SignatureProof"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Artisan_userId_key" ON "Artisan"("userId");

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Artisan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artisan" ADD CONSTRAINT "Artisan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantProfile" ADD CONSTRAINT "TenantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureProof" ADD CONSTRAINT "SignatureProof_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
