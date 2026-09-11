-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OperatingSystem" AS ENUM ('WINDOWS');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'OFFLINE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'IDLE', 'LOCKED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('ACTIVE', 'IDLE', 'LOCKED', 'UNLOCKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE_EMPLOYEE', 'UPDATE_EMPLOYEE', 'GENERATE_REGISTRATION_CODE', 'REGISTER_DEVICE', 'REVOKE_DEVICE', 'REPLACE_DEVICE', 'REASSIGN_DEVICE', 'ACTIVATE_EMPLOYEE', 'DEACTIVATE_EMPLOYEE');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "operatingSystem" "OperatingSystem" NOT NULL DEFAULT 'WINDOWS',
    "agentVersion" TEXT NOT NULL,
    "deviceTokenHash" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentActivityStatus" "ActivityStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceRegistrationCode" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceRegistrationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "eventType" "ActivityEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAssignment" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyWorkSummary" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "firstActiveAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "idleSeconds" INTEGER NOT NULL DEFAULT 0,
    "lockedSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalTrackedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyWorkSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "adminId" TEXT,
    "employeeId" TEXT,
    "deviceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceTokenHash_key" ON "Device"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "Device_employeeId_idx" ON "Device"("employeeId");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "Device_lastSeenAt_idx" ON "Device"("lastSeenAt");

-- CreateIndex
CREATE INDEX "DeviceRegistrationCode_employeeId_idx" ON "DeviceRegistrationCode"("employeeId");

-- CreateIndex
CREATE INDEX "DeviceRegistrationCode_codeHash_idx" ON "DeviceRegistrationCode"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityEvent_eventId_key" ON "ActivityEvent"("eventId");

-- CreateIndex
CREATE INDEX "ActivityEvent_employeeId_idx" ON "ActivityEvent"("employeeId");

-- CreateIndex
CREATE INDEX "ActivityEvent_deviceId_idx" ON "ActivityEvent"("deviceId");

-- CreateIndex
CREATE INDEX "ActivityEvent_occurredAt_idx" ON "ActivityEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_eventType_idx" ON "ActivityEvent"("eventType");

-- CreateIndex
CREATE INDEX "ActivityEvent_employeeId_occurredAt_idx" ON "ActivityEvent"("employeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "DeviceAssignment_deviceId_idx" ON "DeviceAssignment"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAssignment_employeeId_idx" ON "DeviceAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "DailyWorkSummary_employeeId_idx" ON "DailyWorkSummary"("employeeId");

-- CreateIndex
CREATE INDEX "DailyWorkSummary_date_idx" ON "DailyWorkSummary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWorkSummary_employeeId_date_key" ON "DailyWorkSummary"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_idx" ON "AuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistrationCode" ADD CONSTRAINT "DeviceRegistrationCode_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAssignment" ADD CONSTRAINT "DeviceAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyWorkSummary" ADD CONSTRAINT "DailyWorkSummary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

