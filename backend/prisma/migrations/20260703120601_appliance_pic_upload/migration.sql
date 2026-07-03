/*
  Warnings:

  - The values [Pending,Escalated,Resolved,Rejected] on the enum `ComplaintStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assignedVendor` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `escalationStage` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedCost` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `impact` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `reportedById` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `timeline` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Complaint` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[complaintId]` on the table `Complaint` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `complaintId` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raisedById` to the `Complaint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ComplaintStatus_new" AS ENUM ('OPEN', 'VENDOR_PENDING', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'REOPENED', 'ACKNOWLEDGED');
ALTER TABLE "Complaint" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Complaint" ALTER COLUMN "status" TYPE "ComplaintStatus_new" USING ("status"::text::"ComplaintStatus_new");
ALTER TYPE "ComplaintStatus" RENAME TO "ComplaintStatus_old";
ALTER TYPE "ComplaintStatus_new" RENAME TO "ComplaintStatus";
DROP TYPE "ComplaintStatus_old";
ALTER TABLE "Complaint" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleId" ADD VALUE 'aa';
ALTER TYPE "RoleId" ADD VALUE 'am';

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_reportedById_fkey";

-- AlterTable
ALTER TABLE "Appliance" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "vendorEmail" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "AttendanceLog" ADD COLUMN     "isBranchOpening" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photos" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "remarks" TEXT;

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "assignedVendor",
DROP COLUMN "escalationStage",
DROP COLUMN "estimatedCost",
DROP COLUMN "impact",
DROP COLUMN "reportedById",
DROP COLUMN "timeline",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "complaintId" TEXT NOT NULL,
ADD COLUMN     "completionPdfUrl" TEXT,
ADD COLUMN     "raisedById" TEXT NOT NULL,
ADD COLUMN     "raisedByName" TEXT,
ADD COLUMN     "raisedByRole" TEXT,
ADD COLUMN     "resolutionNotes" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" TEXT,
ADD COLUMN     "resolvedByName" TEXT,
ADD COLUMN     "vendorEmail" TEXT,
ADD COLUMN     "vendorId" TEXT,
ADD COLUMN     "vendorIssueId" TEXT,
ADD COLUMN     "vendorRemarks" TEXT,
ADD COLUMN     "workOrderPdfUrl" TEXT,
ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_complaintId_key" ON "Complaint"("complaintId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Complaint_raisedById_idx" ON "Complaint"("raisedById");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
