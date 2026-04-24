-- CreateEnum
CREATE TYPE "IvorianLegalStatus" AS ENUM ('ACD', 'TITRE_FONCIER', 'CERTIFICAT_MOUCHETE', 'ATTESTATION_VILLAGEOISE', 'LETTRE_ATTRIBUTION');

-- CreateEnum
CREATE TYPE "SaleTransactionStep" AS ENUM ('AVAILABLE', 'OFFER_PENDING', 'OFFER_ACCEPTED', 'COMPROMIS_SIGNED', 'ACTE_AUTHENTIQUE_SIGNED', 'CLOSED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ManagementMandate" DROP CONSTRAINT "ManagementMandate_agencyId_fkey";

-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "ownerLeasingFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tenantLeasingFee" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PropertyForSale" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCfa" DECIMAL(15,2) NOT NULL,
    "surfaceArea" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "legalStatus" "IvorianLegalStatus" NOT NULL,
    "status" "SaleTransactionStep" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyForSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleOffer" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amountCfa" DECIMAL(15,2) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleOffer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ManagementMandate" ADD CONSTRAINT "ManagementMandate_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyForSale" ADD CONSTRAINT "PropertyForSale_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOffer" ADD CONSTRAINT "SaleOffer_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PropertyForSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOffer" ADD CONSTRAINT "SaleOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
