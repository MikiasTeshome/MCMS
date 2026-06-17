import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';
import { isUuid } from '../../utils/uuid.js';
import logger from '../../utils/logger.js';
import { calculateExpiryDate } from '../../utils/expiry.js';


const SCAN_SESSION_MINUTES = 15;

/** Fallback when Prisma client has not been regenerated yet */
const scanSessionMemory = new Map();

function hasCouponClaimModel() {
  return Boolean(prisma.couponClaim);
}

function hasScanSessionModel() {
  return Boolean(prisma.cafeScanSession);
}

function todayDateString() {
  return new Date().toISOString().split('T')[0];
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
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
 * Compute how many coupons an employee is entitled to ACCESS today
 * based on working-day accumulation (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5).
 * Returns 0 on weekends.
 */
function getDailyCap() {
  const day = new Date().getDay(); // 0=Sun … 6=Sat
  const capMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  return capMap[day] ?? 0;
}

function deviceInfoFromReq(req) {
  if (!req) return null;
  return req.headers['user-agent'] || null;
}

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
   *   - Today's cap = getDailyCap() (Mon=1, Tue=2 … Fri=5).
   *   - If fewer coupons exist than the cap, allocate the difference.
   */
  async ensureWeeklyCoupons(employeeId) {
    const cap = getDailyCap();
    if (cap === 0) return; // weekend — nothing to do

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
    const config = await prisma.couponConfig.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!config) return; // no config yet — HR hasn't created one

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

  async buildEmployeeCouponStats(employeeId) {
    // --- Step 1: Lazy weekly reset ---
    // Before counting, void any ALLOCATED coupons from a previous week.
    await this.voidLastWeekCoupons(employeeId);

    // --- Step 2: Self-healing catch-up ---
    // Ensure the employee has the correct number of coupons for this week.
    // Handles cold-start (scheduler never ran) and missed cron days.
    await this.ensureWeeklyCoupons(employeeId);

    const now = new Date();
    const weekStart = startOfWeek(now);
    const dateString = todayDateString();

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
        prisma.coupon.findFirst({
          where: {
            employeeId,
            status: 'CLAIMED',
            claimedDateString: { startsWith: dateString },
          },
        }),
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

    // --- Step 2: Compute daily accumulation cap ---
    // On Monday the cap is 1, Tuesday 2 … Friday 5.
    // Coupons claimed earlier this week already consumed from the balance,
    // so couponsRedeemableNow = min(dailyCap, availableCoupons).
    const dailyCap = getDailyCap();
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

  async validateEmployeeForScan(employeeId) {
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: { employeeProfile: true },
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

    const qrCard = await this.getActiveQRCard(employeeId);
    if (!qrCard) {
      const err = new Error('QR card is invalid.');
      err.code = 'QR_INVALID';
      throw err;
    }

    return { employee, qrCard };
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

    const { employee } = await this.validateEmployeeForScan(employeeId);
    const stats = await this.buildEmployeeCouponStats(employeeId);

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
      department: profile?.department || 'N/A',
      staffType: profile?.staffType || 'Standard',
      couponValue: stats.couponValue,
      availableCoupons: stats.availableCoupons,
      expiredCoupons: stats.expiredCoupons,
      claimedToday: stats.claimedToday,
      lastClaimDate: stats.lastClaimDate,
      expiryDate: stats.expiryDate,
      weekBalance: stats.weekBalance,
      dailyCap: stats.dailyCap,
      couponsRedeemableNow: stats.couponsRedeemableNow,
      eligible:
        stats.couponsRedeemableNow > 0 &&
        !stats.claimedToday,
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
    const cleanOverrideReason =
      typeof overrideReason === 'string' ? overrideReason.trim() : '';

    if (!employeeId || !isUuid(employeeId)) {
      throw new Error('Valid employeeId is required.');
    }

    const { employee } = await this.validateEmployeeForScan(employeeId);

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

    // Daily accumulation cap: employee may only redeem up to today's earned total.
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

    if (stats.claimedToday && !cleanOverrideReason) {
      await auditService.log({
        action: 'COUPON_BLOCKED',
        entityType: 'Employee',
        entityId: employeeId,
        actorId: issuedById,
        newState: { reason: 'Already claimed today.' },
        req,
      });
      const err = new Error('Employee already claimed a coupon today.');
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
    };
  }

  /**
   * GET /self-check/:employeeId — authenticated read-only balance view.
   */
  async selfCheck(scannedPayload, requester) {
    const employeeId = await this.resolveEmployeeId(scannedPayload);

    const canView =
      requester?.id === employeeId ||
      ['ADMIN', 'HR', 'CAFE_STAFF'].includes(requester?.role);
    if (!canView) {
      const err = new Error('You can only view your own self-check details.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { employee } = await this.validateEmployeeForScan(employeeId);
    const stats = await this.buildEmployeeCouponStats(employeeId);

    const recentClaims = hasCouponClaimModel()
      ? await prisma.couponClaim.findMany({
          where: { employeeId },
          orderBy: { issuedAt: 'desc' },
          take: 10,
          include: {
            coupon: { select: { code: true, value: true } },
          },
        })
      : await prisma.coupon
          .findMany({
            where: { employeeId, status: 'CLAIMED' },
            orderBy: { claimedAt: 'desc' },
            take: 10,
            select: { code: true, value: true, claimedAt: true },
          })
          .then((rows) =>
            rows.map((c) => ({
              issuedAt: c.claimedAt,
              coupon: { code: c.code, value: c.value },
            }))
          );

    const now = new Date();
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 10,
    });

    const profile = employee.employeeProfile;

    return {
      employeeId,
      fullName: employee.name,
      department: profile?.department || 'N/A',
      staffType: profile?.staffType || 'Standard',
      availableCoupons: stats.availableCoupons,
      expiredCoupons: stats.expiredCoupons,
      expiryDate: stats.expiryDate,
      claimedToday: stats.claimedToday,
      lastClaimDate: stats.lastClaimDate,
      weekBalance: stats.weekBalance,
      dailyCap: stats.dailyCap,
      couponsRedeemableNow: stats.couponsRedeemableNow,
      recentClaimHistory: recentClaims.map((c) => ({
        couponCode: c.coupon.code,
        value: Number(c.coupon.value),
        issuedAt: c.issuedAt,
      })),
      holidays: holidays.map((h) => ({
        date: h.date.toISOString().split('T')[0],
        description: h.description,
      })),
    };
  }
}

export default new CouponsScanService();
