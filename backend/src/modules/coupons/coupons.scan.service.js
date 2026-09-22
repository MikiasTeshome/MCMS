import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';
import { isUuid } from '../../utils/uuid.js';
import logger from '../../utils/logger.js';
import { calculateExpiryDate } from '../../utils/expiry.js';
import { getCafeDeskContext } from '../../utils/cafeDesk.js';


const SCAN_SESSION_MINUTES = 15;
const ADDIS_TIME_ZONE = 'Africa/Addis_Ababa';
const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fallback when Prisma client has not been regenerated yet */
const scanSessionMemory = new Map();

function hasCouponClaimModel() {
  return Boolean(prisma.couponClaim);
}

function hasScanSessionModel() {
  return Boolean(prisma.cafeScanSession);
}

const normalizeDateInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getAddisDayKey = (value) => {
  const date = normalizeDateInput(value);
  if (!date) return '';
  const shifted = new Date(date.getTime() + ADDIS_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function todayDateString(date = new Date()) {
  return getAddisDayKey(date);
}

function getAddisWeekday(date = new Date()) {
  return new Date(date.getTime() + ADDIS_OFFSET_MS).getUTCDay();
}

function startOfWeek(date = new Date()) {
  const key = getAddisDayKey(date);
  if (!key) {
    const fallback = new Date(date);
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  const [year, month, day] = key.split('-').map(Number);
  const addisNoonUtcMs = Date.UTC(year, month - 1, day, 9, 0, 0, 0);
  const weekday = new Date(addisNoonUtcMs).getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(addisNoonUtcMs - daysFromMonday * DAY_MS);
  return new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0) -
      ADDIS_OFFSET_MS
  );
}

/**
 * Returns a string key like "2026-W25" identifying the ISO calendar week.
 * Used to detect week boundaries for the lazy reset.
 */
function isoWeekKey(date = new Date()) {
  const d = new Date(date);
  // Move to Thursday of the same week (ISO week anchor)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Unused weekdays already earned can be used in one visit on any later
 * weekday this week (skip Monday → Tuesday can record 2). Future days stay locked.
 * Returns 0 on weekends.
 */
function getDailyCap(date = new Date()) {
  const day = getAddisWeekday(date); // 0=Sun … 6=Sat in Africa/Addis_Ababa
  const capMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  return capMap[day] ?? 0;
}

async function findTodayHoliday(referenceDate = new Date()) {
  const todayKey = getAddisDayKey(referenceDate);
  if (!todayKey) return null;
  const holidays = await prisma.holiday.findMany({ select: { date: true, description: true } });
  return (
    holidays.find((holiday) => {
      const key = getAddisDayKey(holiday.date);
      return Boolean(key) && key === todayKey;
    }) || null
  );
}

async function getEffectiveDailyCap() {
  return getDailyCap();
}

async function getOrCreateCouponConfig() {
  const existing = await prisma.couponConfig.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;

  const actor = await prisma.user.findFirst({
    where: { role: { in: ['FINANCE', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!actor) return null;

  try {
    return await prisma.couponConfig.create({
      data: {
        name: 'Standard Canteen Meal',
        value: 40,
        expiryWorkingDays: 5,
        createdById: actor.id,
      },
    });
  } catch (err) {
    logger.warn(`[getOrCreateCouponConfig] ${err.message}`);
    return prisma.couponConfig.findFirst({ orderBy: { createdAt: 'asc' } });
  }
}

function deviceInfoFromReq(req) {
  if (!req) return null;
  return req.headers['user-agent'] || null;
}

const isEmployeeOnLeave = (profile, referenceDate = new Date()) => {
  if (!profile?.leaveStartDate || !profile?.leaveReturnDate) {
    return false;
  }

  const todayKey = getAddisDayKey(referenceDate);
  const startKey = getAddisDayKey(profile.leaveStartDate);
  const returnKey = getAddisDayKey(profile.leaveReturnDate);

  if (!todayKey || !startKey || !returnKey) {
    return false;
  }

  return todayKey >= startKey && todayKey < returnKey;
};

const EMPLOYEE_SCAN_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  employeeProfile: {
    select: {
      department: true,
      position: true,
      employeeIdNumber: true,
      staffType: true,
      leaveDays: true,
      leaveStartDate: true,
      leaveReturnDate: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const QR_CARD_SELECT = {
  id: true,
  cardCode: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

class CouponsScanService {
  /**
   * Resolve scanned payload to employee user id (UUID in QR).
   * Supports legacy QRCard.cardCode values for existing cards.
   */
  async resolveEmployeeId(scannedValue) {
    const raw = String(scannedValue || '').trim();
    if (!raw) {
      throw new Error('Invalid QR code.');
    }

    if (isUuid(raw)) {
      const user = await prisma.user.findUnique({
        where: { id: raw },
        select: { id: true, role: true },
      });
      if (user?.role === 'EMPLOYEE') {
        return user.id;
      }
    }

    const card = await prisma.qRCard.findFirst({
      where: {
        cardCode: raw,
        status: 'ACTIVE',
      },
      select: { employeeId: true },
    });
    if (card) {
      return card.employeeId;
    }

    if (isUuid(raw)) {
      const inactiveCard = await prisma.qRCard.findFirst({
        where: { cardCode: raw },
      });
      if (inactiveCard) {
        const err = new Error('QR card is invalid.');
        err.code = 'QR_INVALID';
        throw err;
      }
    }

    throw new Error('Invalid QR code.');
  }

  async getActiveQRCard(employeeId) {
    return prisma.qRCard.findFirst({
      where: { employeeId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lazy weekly reset: if the employee has any ALLOCATED coupons that were
   * created before the start of the current ISO week, they belong to last
   * week and must be voided on the first scan of the new week.
   *
   * Runs inside the caller's transaction when one is provided, or as a
   * standalone operation otherwise.
   */
  async voidLastWeekCoupons(employeeId, tx) {
    const client = tx || prisma;
    const weekStart = startOfWeek(new Date());

    const stale = await client.coupon.findMany({
      where: {
        employeeId,
        status: 'ALLOCATED',
        createdAt: { lt: weekStart },
      },
      select: { id: true },
    });

    if (stale.length === 0) return 0;

    await client.coupon.updateMany({
      where: { id: { in: stale.map((c) => c.id) } },
      data: { status: 'VOID' },
    });

    await auditService.log({
      action: 'COUPON_WEEKLY_RESET',
      entityType: 'Coupon',
      entityId: null,
      actorId: null,
      newState: {
        employeeId,
        voidedCount: stale.length,
        week: isoWeekKey(),
      },
    });

    return stale.length;
  }

  /**
   * Self-healing catch-up: ensures the employee has the correct number of
   * coupon rows for this week, up to today's dailyCap.
   *
   * This covers:
   *   1. Fresh installations where the scheduler has never run.
   *   2. Days where the cron job was missed (e.g. server was down).
   *   3. The Monday after a weekly reset — ensures 1 coupon is immediately
   *      available even before 06:00.
   *
   * Logic:
   *   - Count coupons created this week (ALLOCATED or CLAIMED) — these
   *     represent days the scheduler already ran.
   *   - Today's cap = earned days so far (Mon=1, Tue=2 … Fri=5).
   *   - If fewer coupons exist than the cap, allocate the difference.
   */
  async ensureWeeklyCoupons(employeeId) {
    const cap = await getEffectiveDailyCap();
    if (cap === 0) return; // weekend or public holiday — nothing to do

    const weekStart = startOfWeek(new Date());

    // Count coupons that already exist for this employee this week
    const existingThisWeek = await prisma.coupon.count({
      where: {
        employeeId,
        status: { in: ['ALLOCATED', 'CLAIMED'] },
        createdAt: { gte: weekStart },
      },
    });

    const deficit = cap - existingThisWeek;
    if (deficit <= 0) return; // already has enough coupons

    // Fetch the primary coupon config
    const config = await getOrCreateCouponConfig();
    if (!config) {
      logger.warn('[ensureWeeklyCoupons] No coupon config and none could be created.');
      return;
    }

    // Expiry = 5 working days from now (covers the remainder of this week)
    const expiresAt = await calculateExpiryDate(new Date(), 5);

    // Allocate the missing coupons one by one
    for (let i = 0; i < deficit; i++) {
      try {
        const code = `DAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        await prisma.coupon.create({
          data: {
            code,
            status: 'ALLOCATED',
            value: config.value,
            configId: config.id,
            employeeId,
            allocatedById: config.createdById,
            expiresAt,
          },
        });
      } catch (err) {
        // Non-fatal: log and continue; a partial allocation is better than none
        logger.warn(
          `[ensureWeeklyCoupons] Could not allocate catch-up coupon for ${employeeId}: ${err.message}`
        );
      }
    }

    if (deficit > 0) {
      await auditService.log({
        action: 'COUPON_CATCH_UP_ALLOCATION',
        entityType: 'Coupon',
        entityId: null,
        actorId: null,
        newState: {
          employeeId,
          deficit,
          existingThisWeek,
          dailyCap: cap,
          week: isoWeekKey(),
        },
      });
    }
  }

  async buildEmployeeCouponStats(employeeId, options = {}) {
    const allowAccrual = options.allowAccrual !== false;

    // --- Step 1: Lazy weekly reset ---
    // Before counting, void any ALLOCATED coupons from a previous week.
    await this.voidLastWeekCoupons(employeeId);

    // --- Step 2: Self-healing catch-up ---
    // Ensure the employee has the correct number of coupons for this week.
    // Handles cold-start (scheduler never ran) and missed cron days.
    if (allowAccrual) {
      await this.ensureWeeklyCoupons(employeeId);
    }

    const now = new Date();
    const weekStart = startOfWeek(now);
    const dateString = todayDateString();
    const claimedTodayWhere =
      dateString.length >= 10
        ? {
            employeeId,
            status: 'CLAIMED',
            claimedDateString: { startsWith: dateString },
          }
        : null;

    const [allocated, expired, claimedTodayRow, lastClaim, weekAllocated] =
      await Promise.all([
        prisma.coupon.findMany({
          where: {
            employeeId,
            status: 'ALLOCATED',
            expiresAt: { gte: now },
          },
          orderBy: { expiresAt: 'asc' },
        }),
        prisma.coupon.count({
          where: {
            employeeId,
            OR: [
              { status: 'EXPIRED' },
              { status: 'VOID' },
              { status: 'ALLOCATED', expiresAt: { lt: now } },
            ],
          },
        }),
        claimedTodayWhere
          ? prisma.coupon.findFirst({ where: claimedTodayWhere })
          : Promise.resolve(null),
        hasCouponClaimModel()
          ? prisma.couponClaim.findFirst({
              where: { employeeId },
              orderBy: { issuedAt: 'desc' },
              select: { issuedAt: true },
            })
          : prisma.coupon.findFirst({
              where: { employeeId, status: 'CLAIMED' },
              orderBy: { claimedAt: 'desc' },
              select: { claimedAt: true },
            }),
        prisma.coupon.count({
          where: {
            employeeId,
            status: { in: ['ALLOCATED', 'CLAIMED'] },
            createdAt: { gte: weekStart },
          },
        }),
      ]);

    const availableCoupons = allocated.length;
    const couponValue =
      availableCoupons > 0 ? Number(allocated[0].value) : null;
    const expiryDate =
      availableCoupons > 0
        ? allocated[0].expiresAt.toISOString().split('T')[0]
        : null;

    // Earned days so far this week (not Friday-only). Unused days sit in the
    // wallet and can all be recorded in one visit today, up to dailyCap.
    const dailyCap = await getEffectiveDailyCap();
    const couponsRedeemableNow = Math.min(dailyCap, availableCoupons);

    return {
      availableCoupons,
      expiredCoupons: expired,
      claimedToday: !!claimedTodayRow,
      lastClaimDate: lastClaim
        ? (lastClaim.issuedAt || lastClaim.claimedAt)
            ?.toISOString()
            .split('T')[0]
        : null,
      expiryDate,
      couponValue,
      weekBalance: weekAllocated,
      dailyCap,
      couponsRedeemableNow,
      allocatedCoupons: allocated,
    };
  }

  async validateEmployeeForScan(employeeId, options = {}) {
    const allowLeave = options.allowLeave === true;
    const requireActiveCard = options.requireActiveCard !== false;

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: EMPLOYEE_SCAN_SELECT,
    });

    if (!employee || employee.role !== 'EMPLOYEE') {
      const err = new Error('Employee not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!employee.isActive) {
      const err = new Error('Employee account is inactive.');
      err.code = 'INACTIVE';
      throw err;
    }

    const leaveState = {
      isOnLeave: isEmployeeOnLeave(employee.employeeProfile),
      leaveDays: employee.employeeProfile?.leaveDays ?? null,
      leaveStartDate: employee.employeeProfile?.leaveStartDate ?? null,
      leaveReturnDate: employee.employeeProfile?.leaveReturnDate ?? null,
    };

    if (leaveState.isOnLeave && !allowLeave) {
      const err = new Error('Employee is currently on leave.');
      err.code = 'ON_LEAVE';
      throw err;
    }

    let qrCard = null;
    if (requireActiveCard) {
      qrCard = await this.getActiveQRCard(employeeId);
      if (!qrCard) {
        const err = new Error('QR card is invalid.');
        err.code = 'QR_INVALID';
        throw err;
      }
    }

    return { employee, qrCard, leaveState };
  }

  async recordScanSession(employeeId, staffId, req) {
    const expiresAt = new Date(Date.now() + SCAN_SESSION_MINUTES * 60 * 1000);
    const deviceInfo = deviceInfoFromReq(req);

    if (hasScanSessionModel()) {
      return prisma.cafeScanSession.upsert({
        where: {
          staffId_employeeId: { staffId, employeeId },
        },
        create: {
          employeeId,
          staffId,
          deviceInfo,
          expiresAt,
        },
        update: {
          deviceInfo,
          expiresAt,
          createdAt: new Date(),
        },
      });
    }

    scanSessionMemory.set(`${staffId}:${employeeId}`, expiresAt);
    return { employeeId, staffId, expiresAt };
  }

  async hasValidScanSession(employeeId, staffId) {
    if (hasScanSessionModel()) {
      const session = await prisma.cafeScanSession.findUnique({
        where: {
          staffId_employeeId: { staffId, employeeId },
        },
      });
      if (!session) return false;
      if (session.expiresAt < new Date()) {
        await prisma.cafeScanSession.delete({
          where: { id: session.id },
        });
        return false;
      }
      return true;
    }

    const key = `${staffId}:${employeeId}`;
    const expiresAt = scanSessionMemory.get(key);
    if (!expiresAt) return false;
    if (expiresAt < new Date()) {
      scanSessionMemory.delete(key);
      return false;
    }
    return true;
  }

  /**
   * POST /coupons/scan — cafe staff scans employee QR (UUID).
   */
  async scanEmployee(scannedPayload, staffId, req) {
    let employeeId;
    try {
      employeeId = await this.resolveEmployeeId(scannedPayload);
    } catch (e) {
      await auditService.log({
        action: 'QR_SCAN_INVALID',
        entityType: 'QRCard',
        entityId: null,
        actorId: staffId,
        newState: { scannedPayload: String(scannedPayload).slice(0, 64) },
        req,
      });
      throw e;
    }

    let employeeContext;
    try {
      employeeContext = await this.validateEmployeeForScan(employeeId);
    } catch (error) {
      if (error.code === 'ON_LEAVE') {
        await auditService.log({
          action: 'COUPON_BLOCKED',
          entityType: 'Employee',
          entityId: employeeId,
          actorId: staffId,
          newState: { reason: 'Employee is currently on leave.' },
          req,
        });
      }
      throw error;
    }
    const desk = await getCafeDeskContext(req.user);
    const { employee, leaveState } = employeeContext;
    const stats = await this.buildEmployeeCouponStats(employeeId);
    const todayHoliday = await findTodayHoliday();
    const addisDay = todayDateString();
    const addisWeekday = getAddisWeekday();
    let recordBlockReason = null;
    if (stats.dailyCap === 0) recordBlockReason = 'WEEKEND';
    else if (stats.couponsRedeemableNow === 0) {
      recordBlockReason = stats.claimedToday ? 'CLAIMED_TODAY' : 'NO_BALANCE';
    }

    await this.recordScanSession(employeeId, staffId, req);

    await auditService.log({
      action: 'QR_SCANNED',
      entityType: 'Employee',
      entityId: employeeId,
      actorId: staffId,
      newState: {
        availableCoupons: stats.availableCoupons,
        claimedToday: stats.claimedToday,
      },
      req,
    });

    const profile = employee.employeeProfile;

    return {
      employeeId,
      fullName: employee.name,
      employeeIdNumber: profile?.employeeIdNumber || '',
      couponValue: stats.couponValue,
      availableCoupons: stats.availableCoupons,
      expiredCoupons: stats.expiredCoupons,
      claimedToday: stats.claimedToday,
      lastClaimDate: stats.lastClaimDate,
      expiryDate: stats.expiryDate,
      weekBalance: stats.weekBalance,
      dailyCap: stats.dailyCap,
      couponsRedeemableNow: stats.couponsRedeemableNow,
      addisDay,
      addisWeekday,
      isHoliday: Boolean(todayHoliday),
      holidayDescription: todayHoliday?.description || null,
      recordBlockReason,
      leaveStatus: leaveState,
      eligible: stats.couponsRedeemableNow > 0,
      campus: { id: desk.campus.id, name: desk.campus.name, code: desk.campus.code },
      vendor: { id: desk.vendor.id, name: desk.vendor.name },
    };
  }

  /**
   * POST /coupons/issue
   */
  async issueCoupons(
    { employeeId, quantity = 1, overrideReason },
    issuedByUser,
    req
  ) {
    const issuedById = issuedByUser.id;
    const isAdmin = issuedByUser.role === 'ADMIN';
    const deviceInfo = deviceInfoFromReq(req);
    const desk = await getCafeDeskContext(issuedByUser);
    const cleanOverrideReason =
      isAdmin && typeof overrideReason === 'string' ? overrideReason.trim() : '';

    if (!employeeId || !isUuid(employeeId)) {
      throw new Error('Valid employeeId is required.');
    }

    let employeeContext;
    try {
      employeeContext = await this.validateEmployeeForScan(employeeId);
    } catch (error) {
      if (error.code === 'ON_LEAVE') {
        await auditService.log({
          action: 'COUPON_BLOCKED',
          entityType: 'Employee',
          entityId: employeeId,
          actorId: issuedById,
          newState: { reason: 'Employee is currently on leave.' },
          req,
        });
      }
      throw error;
    }
    const { employee } = employeeContext;

    const scannedFirst =
      isAdmin && cleanOverrideReason
        ? true
        : await this.hasValidScanSession(employeeId, issuedById);

    if (!scannedFirst) {
      const err = new Error('QR scan required.');
      err.code = 'SCAN_REQUIRED';
      throw err;
    }

    const stats = await this.buildEmployeeCouponStats(employeeId);

    if (stats.availableCoupons === 0) {
      await auditService.log({
        action: 'COUPON_BLOCKED',
        entityType: 'Employee',
        entityId: employeeId,
        actorId: issuedById,
        newState: { reason: 'No available coupons.' },
        req,
      });
      const err = new Error('No available coupons.');
      err.code = 'NO_COUPONS';
      throw err;
    }

    // Employee may redeem unused days earned so far this week (not future days).
    if (stats.couponsRedeemableNow === 0 && !cleanOverrideReason) {
      await auditService.log({
        action: 'COUPON_BLOCKED',
        entityType: 'Employee',
        entityId: employeeId,
        actorId: issuedById,
        newState: { reason: 'Daily accumulation cap not yet reached.', dailyCap: stats.dailyCap },
        req,
      });
      const err = new Error('No coupons redeemable today — daily accumulation cap not yet reached.');
      err.code = 'CAP_NOT_REACHED';
      throw err;
    }

    // Same-day leftover: unused earlier weekdays can still be recorded today
    // (second scan or another Record click). Block only when today's earned
    // days are already used and nothing leftover remains.
    if (stats.couponsRedeemableNow === 0 && stats.claimedToday && !cleanOverrideReason) {
      await auditService.log({
        action: 'COUPON_BLOCKED',
        entityType: 'Employee',
        entityId: employeeId,
        actorId: issuedById,
        newState: { reason: 'Already claimed today and no leftover unused days.' },
        req,
      });
      const err = new Error('Employee already claimed today and has no leftover unused days.');
      err.code = 'DUPLICATE_CLAIM';
      throw err;
    }

    // Enforce daily cap: quantity requested cannot exceed today's redeemable allowance.
    const qty = Number(quantity);
    const maxIssuable = cleanOverrideReason ? stats.availableCoupons : stats.couponsRedeemableNow;
    const issueAll = qty === 0 || qty >= maxIssuable;
    const couponsToIssue = issueAll
      ? stats.allocatedCoupons.slice(0, maxIssuable)
      : stats.allocatedCoupons.slice(0, Math.min(qty, maxIssuable));

    const dateString = todayDateString();

    // Atomic transaction: ALL coupon updates and claim records succeed together,
    // or the entire operation rolls back and no coupon is marked CLAIMED.
    // maxWait: how long Prisma waits to acquire a connection from the pool.
    // timeout: maximum wall-clock time the transaction may run before auto-rollback.
    const claims = await prisma.$transaction(
      async (tx) => {
        const created = [];
        for (let i = 0; i < couponsToIssue.length; i++) {
          const coupon = couponsToIssue[i];
          // Each coupon in the session gets a unique claimStr so rows never collide.
          // Format: "YYYY-MM-DD" for the first coupon, "YYYY-MM-DD-1", "-2" … for subsequent ones.
          // The claimedToday query uses startsWith: dateString, so the prefix always matches.
          let claimStr = i === 0 ? dateString : `${dateString}-${i}`;
          if (cleanOverrideReason) {
            claimStr = `${dateString}-override-${i}-${Date.now()}`;
          }

          // Step A: mark the coupon as CLAIMED
          await tx.coupon.update({
            where: { id: coupon.id },
            data: {
              status: 'CLAIMED',
              claimedById: issuedById,
              claimedAt: new Date(),
              claimedDateString: claimStr,
            },
          });

          // Step B: write the immutable CouponClaim audit record
          let claim;
          if (hasCouponClaimModel()) {
            claim = await tx.couponClaim.create({
              data: {
                employeeId,
                couponId: coupon.id,
                issuedById,
                deviceInfo,
                campusId: desk.campus.id,
                vendorId: desk.vendor.id,
              },
              include: {
                coupon: { select: { id: true, code: true, value: true } },
              },
            });
          } else {
            // Fallback when CouponClaim table hasn't been migrated yet:
            // re-read the now-updated coupon row to build a synthetic claim shape.
            const updated = await tx.coupon.findUnique({
              where: { id: coupon.id },
              select: { id: true, code: true, value: true, claimedAt: true },
            });
            claim = {
              id: updated.id,       // synthetic: claim id = coupon id
              couponId: updated.id, // correct coupon reference
              issuedAt: updated.claimedAt,
              coupon: updated,
            };
          }
          created.push(claim);
        }
        return created;
      },
      {
        maxWait: 5000,  // ms to wait for a connection from the pool
        timeout: 10000, // ms max wall-clock time before auto-rollback
      }
    );

    // Audit logs are written AFTER the transaction commits.
    // A logging failure here does NOT roll back the already-committed redemption.
    await Promise.all(
      claims.map((claim) =>
        auditService.log({
          action: cleanOverrideReason ? 'COUPON_ADMIN_OVERRIDE' : 'COUPON_ISSUED',
          entityType: 'CouponClaim',
          entityId: claim.id,
          actorId: issuedById,
          newState: {
            couponId: claim.couponId,
            employeeId,
            overrideReason: cleanOverrideReason || null,
          },
          req,
        })
      )
    );

    return {
      issuedCount: claims.length,
      claims: claims.map((c) => ({
        id: c.id,
        couponId: c.couponId,
        code: c.coupon.code,
        value: Number(c.coupon.value),
        issuedAt: c.issuedAt,
      })),
      employee: {
        id: employee.id,
        name: employee.name,
      },
      remainingCoupons: stats.availableCoupons - claims.length,
      remainingRedeemableNow: Math.min(
        stats.dailyCap,
        Math.max(0, stats.availableCoupons - claims.length)
      ),
    };
  }
}

export default new CouponsScanService();
