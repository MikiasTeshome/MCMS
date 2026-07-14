-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "leaveDays" INTEGER;
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "leaveStartDate" TIMESTAMP(3);
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "leaveReturnDate" TIMESTAMP(3);
