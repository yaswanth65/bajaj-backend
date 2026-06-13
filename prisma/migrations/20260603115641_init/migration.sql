-- CreateEnum
CREATE TYPE "RoleId" AS ENUM ('lc', 'branchManager', 'rm');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Critical', 'High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Pending', 'InProgress', 'Completed', 'Revoked');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('Pending', 'Escalated', 'Resolved');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "ApplianceStatus" AS ENUM ('Operational', 'AtRisk', 'Critical', 'Down');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('Scheduled', 'Escalated', 'Completed');

-- CreateEnum
CREATE TYPE "AttStatus" AS ENUM ('Present', 'Late', 'Absent');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "RoleId" NOT NULL,
    "position" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT 'Pending',
    "shift" TEXT NOT NULL DEFAULT '09:00 - 18:00',
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "attendancePct" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "tasksClosed" INTEGER NOT NULL DEFAULT 0,
    "proofRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "escalations" INTEGER NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastCheckIn" TEXT NOT NULL DEFAULT 'Not marked',
    "skills" JSONB NOT NULL DEFAULT '[]',
    "emergencyContact" TEXT NOT NULL DEFAULT 'Pending',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "deviceId" TEXT NOT NULL DEFAULT '',
    "branchId" TEXT,
    "branchScope" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT 'Pending',
    "email" TEXT NOT NULL DEFAULT 'Pending',
    "geoRadius" DOUBLE PRECISION NOT NULL DEFAULT 180.0,
    "shiftWindow" TEXT NOT NULL DEFAULT '07:00 - 15:00',
    "health" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "performance" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "todayAttendance" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "staffCount" INTEGER NOT NULL DEFAULT 0,
    "workerCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 50000.0,
    "usedBudget" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "openIssues" INTEGER NOT NULL DEFAULT 0,
    "criticalAlerts" INTEGER NOT NULL DEFAULT 0,
    "applianceRisk" INTEGER NOT NULL DEFAULT 0,
    "auditScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "lastVisit" TEXT NOT NULL DEFAULT 'Not visited',
    "nextVisit" TEXT NOT NULL DEFAULT 'Pending',
    "revenueIndex" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "customerFootfall" INTEGER NOT NULL DEFAULT 0,
    "sla" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appliance" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'Branch premises',
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'Pending',
    "serial" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "status" "ApplianceStatus" NOT NULL DEFAULT 'Operational',
    "purchaseDate" TIMESTAMP(3),
    "lastService" TIMESTAMP(3),
    "nextService" TIMESTAMP(3),
    "warranty" TEXT NOT NULL DEFAULT 'Pending',
    "amcVendor" TEXT NOT NULL DEFAULT 'To be assigned',
    "purchaseCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'Approved',
    "pendingParts" TEXT NOT NULL DEFAULT 'None',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "audience" "RoleId" NOT NULL DEFAULT 'lc',
    "schedule" TEXT NOT NULL DEFAULT 'Daily',
    "priority" "Priority" NOT NULL DEFAULT 'High',
    "zone" TEXT NOT NULL DEFAULT 'Branch premises',
    "deadline" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "assignedById" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'Pending',
    "checklistDone" INTEGER NOT NULL DEFAULT 0,
    "checklistTotal" INTEGER NOT NULL DEFAULT 1,
    "proofRequired" BOOLEAN NOT NULL DEFAULT false,
    "proofLabel" TEXT NOT NULL DEFAULT 'Photo proof',
    "proofUrl" TEXT,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL,
    "escalation" TEXT NOT NULL DEFAULT 'None',
    "redoReason" TEXT,
    "applianceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "AttStatus" NOT NULL DEFAULT 'Present',
    "checkIn" TEXT NOT NULL,
    "checkOut" TEXT,
    "location" TEXT NOT NULL DEFAULT 'Inside geo fence',
    "proof" TEXT NOT NULL DEFAULT 'Geo + selfie verified',
    "deviation" TEXT NOT NULL DEFAULT 'No',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTaskPlanItem" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyTaskPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'Pending',
    "reportedById" TEXT NOT NULL,
    "assignedVendor" TEXT NOT NULL DEFAULT 'Not assigned',
    "assetId" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "impact" TEXT NOT NULL DEFAULT 'Operational impact',
    "description" TEXT NOT NULL,
    "escalationStage" TEXT NOT NULL DEFAULT 'LC',
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'Pending',
    "stage" TEXT NOT NULL DEFAULT 'Branch Manager',
    "priority" "Priority" NOT NULL DEFAULT 'High',
    "age" TEXT NOT NULL DEFAULT 'Just now',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'Scheduled',
    "report" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "scope" "RoleId"[],
    "branchId" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "time" TEXT NOT NULL DEFAULT 'Just now',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE INDEX "Branch_name_idx" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Appliance_serial_key" ON "Appliance"("serial");

-- CreateIndex
CREATE INDEX "Appliance_branchId_idx" ON "Appliance"("branchId");

-- CreateIndex
CREATE INDEX "Appliance_category_idx" ON "Appliance"("category");

-- CreateIndex
CREATE INDEX "Task_branchId_idx" ON "Task"("branchId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "AttendanceLog_userId_idx" ON "AttendanceLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_userId_date_key" ON "AttendanceLog"("userId", "date");

-- CreateIndex
CREATE INDEX "Complaint_branchId_idx" ON "Complaint"("branchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appliance" ADD CONSTRAINT "Appliance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTaskPlanItem" ADD CONSTRAINT "WeeklyTaskPlanItem_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Appliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
