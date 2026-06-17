/**
 * coupons.scheduler.js
 *
 * Scheduled daily job that allocates +1 coupon to every active employee
 * on each working day (Monday–Friday) at 06:00 server-local time.
 *
 * The scheduler is registered once at server startup (server.js).
 * It intentionally avoids holidays — if today is a registered holiday the
 * job simply skips allocation for that day.
 */

import cron from 'node-cron';
import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';
import logger from '../../utils/logger.js';
import { calculateExpiryDate } from '../../utils/expiry.js';

/** How many seconds before Friday EOD a coupon expires (end of next Monday). */
const WEEKLY_EXPIRY_WORKING_DAYS = 5; // 5 working days from allocation date

/**
 * Determine whether today is a registered holiday in the Holiday table.
 * Returns true if today should be skipped.
 */
async function isTodayHoliday() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const holiday = await prisma.holiday.findFirst({
    where: { date: { equals: today } },
  });
  return Boolean(holiday);
}

/**
 * Core allocation logic — allocates exactly one coupon per active employee.
 * Called by the cron job every weekday morning.
 */
export async function allocateDailyCoupons() {
  const dayOfWeek = new Date().getUTCDay(); // 0=Sun, 1=Mon … 6=Sat

  // Only run Mon–Fri (1–5)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    logger.info('[Scheduler] Skipping allocation — weekend.');
    return { skipped: true, reason: 'weekend' };
  }

  // Skip public holidays
  if (await isTodayHoliday()) {
    logger.info('[Scheduler] Skipping allocation — public holiday.');
    return { skipped: true, reason: 'holiday' };
  }

  // Fetch the primary (first) coupon config — Finance defines it
  const config = await prisma.couponConfig.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!config) {
    logger.warn('[Scheduler] No CouponConfig found — allocation skipped.');
    return { skipped: true, reason: 'no_config' };
  }

  // Expiry: end-of-week Friday (5 working days from Monday covers Mon+Tue+Wed+Thu+Fri)
  // We always use a fixed 5-day working window so the coupon covers the rest of this week.
  const expiresAt = await calculateExpiryDate(new Date(), WEEKLY_EXPIRY_WORKING_DAYS);

  // Fetch all active employees
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', isActive: true },
    select: { id: true },
  });

  if (employees.length === 0) {
    logger.info('[Scheduler] No active employees to allocate coupons for.');
    return { allocated: 0 };
  }

  let allocated = 0;
  let failed = 0;

  // Allocate one coupon per employee inside individual transactions
  // so a single failure does not roll back everyone else's coupons.
  for (const emp of employees) {
    try {
      const code = `DAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      await prisma.coupon.create({
        data: {
          code,
          status: 'ALLOCATED',
          value: config.value,
          configId: config.id,
          employeeId: emp.id,
          // System actor — use configCreator as proxy allocator
          allocatedById: config.createdById,
          expiresAt,
        },
      });

      allocated++;
    } catch (err) {
      failed++;
      logger.error(`[Scheduler] Failed to allocate coupon for employee ${emp.id}: ${err.message}`);
    }
  }

  await auditService.log({
    action: 'COUPON_DAILY_ALLOCATION',
    entityType: 'Coupon',
    entityId: null,
    actorId: null,
    newState: {
      date: new Date().toISOString().split('T')[0],
      employeeCount: employees.length,
      allocated,
      failed,
      configId: config.id,
    },
  });

  logger.info(`[Scheduler] Daily allocation complete — ${allocated} coupons issued, ${failed} failed.`);
  return { allocated, failed };
}

/**
 * Register the daily coupon allocation cron job.
 *
 * Schedule: 06:00 every Monday–Friday (server local time).
 * Cron expression: minute hour * * day-of-week
 *   "0 6 * * 1-5" = 06:00 on Mon, Tue, Wed, Thu, Fri
 */
export function registerCouponScheduler() {
  cron.schedule('0 6 * * 1-5', async () => {
    logger.info('[Scheduler] Triggering daily coupon allocation job…');
    try {
      const result = await allocateDailyCoupons();
      logger.info('[Scheduler] Job finished:', result);
    } catch (err) {
      logger.error('[Scheduler] Job failed with unhandled error:', err.message);
    }
  });

  logger.info('[Scheduler] Daily coupon allocation job registered (06:00 Mon–Fri).');
}
