-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('PENDING', 'ACTIVE', 'TERMINATED');

-- CreateTable
CREATE TABLE "ManagementMandate" (
    "id" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "MandateStatus" NOT NULL DEFAULT 'PENDING',
    "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "documentUrl" TEXT,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementMandate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManagementMandate" ADD CONSTRAINT "ManagementMandate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementMandate" ADD CONSTRAINT "ManagementMandate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementMandate" ADD CONSTRAINT "ManagementMandate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
