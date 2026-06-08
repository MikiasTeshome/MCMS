-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "staffType" TEXT NOT NULL DEFAULT 'Standard';

-- CreateTable
CREATE TABLE "CafeScanSession" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CafeScanSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponClaim" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceInfo" TEXT,

    CONSTRAINT "CouponClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CafeScanSession_expiresAt_idx" ON "CafeScanSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CafeScanSession_staffId_employeeId_key" ON "CafeScanSession"("staffId", "employeeId");

-- CreateIndex
CREATE INDEX "CouponClaim_employeeId_idx" ON "CouponClaim"("employeeId");

-- CreateIndex
CREATE INDEX "CouponClaim_couponId_idx" ON "CouponClaim"("couponId");

-- CreateIndex
CREATE INDEX "CouponClaim_issuedAt_idx" ON "CouponClaim"("issuedAt");

-- AddForeignKey
ALTER TABLE "CafeScanSession" ADD CONSTRAINT "CafeScanSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CafeScanSession" ADD CONSTRAINT "CafeScanSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponClaim" ADD CONSTRAINT "CouponClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponClaim" ADD CONSTRAINT "CouponClaim_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponClaim" ADD CONSTRAINT "CouponClaim_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
