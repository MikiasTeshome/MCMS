import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (Refined)...');

  // 1. Clean existing records in sequence
  await prisma.auditLog.deleteMany();
  await prisma.couponClaim.deleteMany();
  await prisma.cafeScanSession.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.couponConfig.deleteMany();
  await prisma.qRCard.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 2. Hash default seed passwords
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create core role accounts
  const admin = await prisma.user.create({
    data: {
      email: 'admin@system.com',
      passwordHash,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  const hr = await prisma.user.create({
    data: {
      email: 'hr@system.com',
      passwordHash,
      name: 'HR Coordinator',
      role: 'HR',
    },
  });

  const finance = await prisma.user.create({
    data: {
      email: 'finance@system.com',
      passwordHash,
      name: 'Finance Manager',
      role: 'FINANCE',
    },
  });

  const cafe = await prisma.user.create({
    data: {
      email: 'cafe@system.com',
      passwordHash,
      name: 'Central Cafe cashier',
      role: 'CAFE_STAFF',
    },
  });

  const emp1 = await prisma.user.create({
    data: {
      email: 'emp1@system.com',
      passwordHash,
      name: 'John Doe',
      role: 'EMPLOYEE',
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      email: 'emp2@system.com',
      passwordHash,
      name: 'Jane Worker',
      role: 'EMPLOYEE',
    },
  });

  console.log('👥 Created accounts representing refined roles.');

  // 4. Create Employee Profiles
  await prisma.employeeProfile.create({
    data: {
      userId: emp1.id,
      department: 'ICT',
      position: 'Senior Developer',
      employeeIdNumber: 'EMP-10024',
      staffType: 'Standard',
    },
  });

  await prisma.employeeProfile.create({
    data: {
      userId: emp2.id,
      department: 'Marketing',
      position: 'Designer',
      employeeIdNumber: 'EMP-10025',
      staffType: 'Standard',
    },
  });

  console.log('📋 Formulated HR Employee Profiles.');

  // 5. Create QRCards
  const qr1 = await prisma.qRCard.create({
    data: {
      cardCode: emp1.id,
      status: 'ACTIVE',
      employeeId: emp1.id,
    },
  });

  const qr2 = await prisma.qRCard.create({
    data: {
      cardCode: emp2.id,
      status: 'ACTIVE',
      employeeId: emp2.id,
    },
  });

  console.log('💳 Mapped QR validation identification cards.');

  // 6. Create official public Holidays (clean dates)
  const holiday1 = await prisma.holiday.create({
    data: {
      date: new Date('2026-05-25T00:00:00.000Z'), // Memorial Day
      description: 'Memorial Day Holiday',
    },
  });

  const holiday2 = await prisma.holiday.create({
    data: {
      date: new Date('2026-07-04T00:00:00.000Z'), // Independence Day
      description: 'Independence Day Holiday',
    },
  });

  console.log('📅 Registered public holidays (excluding working days expirations).');

  // 7. Create Configurable Coupon Pricing models (Finance-driven)
  const configStandard = await prisma.couponConfig.create({
    data: {
      name: 'Standard Canteen Meal',
      value: 12.50,
      expiryWorkingDays: 5,
      createdById: finance.id,
    },
  });

  const configPremium = await prisma.couponConfig.create({
    data: {
      name: 'Executive Luncheon Buffet',
      value: 25.00,
      expiryWorkingDays: 3,
      createdById: finance.id,
    },
  });

  console.log('💰 Configured coupon values and working days limits.');

  // 8. Allocate Coupons to Employees
  // Standard coupon allocated to emp1 (expires in 5 working days from now, we seed it manually)
  const couponActive = await prisma.coupon.create({
    data: {
      code: 'VOUCHER-EMP1-ACTIVE',
      status: 'ALLOCATED',
      value: configStandard.value,
      configId: configStandard.id,
      employeeId: emp1.id,
      allocatedById: hr.id,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Manually offset 5 days
    },
  });

  // Claimed coupon for emp2
  const couponClaimed = await prisma.coupon.create({
    data: {
      code: 'VOUCHER-EMP2-REDEEMED',
      status: 'CLAIMED',
      value: configStandard.value,
      configId: configStandard.id,
      employeeId: emp2.id,
      allocatedById: hr.id,
      claimedById: cafe.id,
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      claimedAt: new Date(),
      claimedDateString: '2026-05-21', // Safeguard composite constraint check
    },
  });

  console.log('🎟️ Issued mock coupons (1 active, 1 claimed).');

  // 9. Write Seeding Audit Log
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SEED_REFINED',
      entityType: 'System',
      entityId: 'ROOT',
      actorId: admin.id,
      newState: {
        usersCreated: 6,
        profilesCreated: 2,
        qrCardsCreated: 2,
        holidaysCreated: 2,
        configsCreated: 2,
        couponsCreated: 2,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Prisma Seeding Script',
    },
  });

  console.log('📝 Logged seeding transactions.');
  console.log('🎉 Seeding Hydration Completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
