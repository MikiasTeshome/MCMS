import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';
import { isUuid } from '../../utils/uuid.js';

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

  async buildEmployeeCouponStats(employeeId) {
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
            status: 'ALLOCATED',
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
      eligible:
        stats.availableCoupons > 0 &&
        (!stats.claimedToday || stats.availableCoupons > 0),
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

    if (!employeeId || !isUuid(employeeId)) {
      throw new Error('Valid employeeId is required.');
    }

    const { employee } = await this.validateEmployeeForScan(employeeId);

    const scannedFirst =
      isAdmin && overrideReason
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

    if (stats.claimedToday && !overrideReason) {
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

    const qty = Number(quantity);
    const issueAll = qty === 0 || qty > stats.availableCoupons;
    const couponsToIssue = issueAll
      ? stats.allocatedCoupons
      : stats.allocatedCoupons.slice(0, Math.max(1, qty));

    const dateString = todayDateString();

    const claims = await prisma.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < couponsToIssue.length; i++) {
        const coupon = couponsToIssue[i];
        let claimStr = dateString;
        if (overrideReason) {
          claimStr = `${dateString}-override-${Date.now()}-${i}`;
        } else if (issueAll && i > 0) {
          claimStr = `${dateString}-bulk-${coupon.id}`;
        }

        await tx.coupon.update({
          where: { id: coupon.id },
          data: {
            status: 'CLAIMED',
            claimedById: issuedById,
            claimedAt: new Date(),
            claimedDateString: claimStr,
          },
        });

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
          const updated = await tx.coupon.findUnique({
            where: { id: coupon.id },
            select: { id: true, code: true, value: true, claimedAt: true },
          });
          claim = {
            id: updated.id,
            couponId: updated.id,
            issuedAt: updated.claimedAt,
            coupon: updated,
          };
        }
        created.push(claim);
      }
      return created;
    });

    for (const claim of claims) {
      await auditService.log({
        action: overrideReason ? 'COUPON_ADMIN_OVERRIDE' : 'COUPON_ISSUED',
        entityType: 'CouponClaim',
        entityId: claim.id,
        actorId: issuedById,
        newState: {
          couponId: claim.couponId,
          employeeId,
          overrideReason: overrideReason || null,
        },
        req,
      });
    }

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
    };
  }

  /**
   * GET /self-check/:employeeId — public read-only balance view.
   */
  async selfCheck(scannedPayload) {
    const employeeId = await this.resolveEmployeeId(scannedPayload);
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
