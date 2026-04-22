-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'KYC_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'AGENCY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MISSION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MISSION_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'LEASE_APPLICATION';
ALTER TYPE "AuditAction" ADD VALUE 'LEASE_SIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'LEASE_TERMINATED';
ALTER TYPE "AuditAction" ADD VALUE 'LISTING_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LISTING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SECURITY_ALERT';
