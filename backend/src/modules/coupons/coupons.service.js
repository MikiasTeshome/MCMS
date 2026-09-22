import prisma from '../../config/db.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import auditService from '../audit/audit.service.js';
import { calculateExpiryDate } from '../../utils/expiry.js'; // helper to compute working days
import { birrToAmharicWords, formatGroupedInt, formatMoney } from '../../utils/amharicAmountWords.js';
import { renderPaymentOrderDocx } from '../../utils/paymentOrderDocx.js';

const STANDARD_COUPON_VALUE = 40;
const COUPON_SORT_FIELDS = new Set(['updatedAt', 'createdAt', 'expiresAt', 'code', 'claimedAt']);
const COUPON_RELATION_SELECT = {
  employee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  claimedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  allocatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  config: {
    select: {
      id: true,
      name: true,
      value: true,
      expiryWorkingDays: true,
    },
  },
};

const startOfDayUTC = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfDayUTC = (value) => {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const addDaysUTC = (value, days) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const formatDateKey = (date) => new Date(date).toISOString().slice(0, 10);
const buildCouponCode = () => `COUPON-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const startOfLocalDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const startOfLocalWeek = (date = new Date()) => {
  const value = startOfLocalDay(date);
  const day = value.getDay();
  const daysSinceMonday = (day + 6) % 7;
  value.setDate(value.getDate() - daysSinceMonday);
  return value;
};

const startOfLocalMonth = (date = new Date()) => {
  const value = startOfLocalDay(date);
  value.setDate(1);
  return value;
};

const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const addMonths = (date, months) => {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value;
};

const ETHIOPIA_TIME_ZONE = 'Africa/Addis_Ababa';
const ETHIOPIA_OFFSET_MS = 3 * 60 * 60 * 1000;

const ethiopianDateFormatter = new Intl.DateTimeFormat('en-u-ca-ethiopic-nu-latn', {
  timeZone: ETHIOPIA_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const ethiopianShortFormatter = new Intl.DateTimeFormat('en-u-ca-ethiopic-nu-latn', {
  timeZone: ETHIOPIA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const gregorianPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ETHIOPIA_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const gregorianShortFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ETHIOPIA_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getEthiopiaLocalDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return new Date(date.getTime() + ETHIOPIA_OFFSET_MS);
};

const getEthiopianParts = (value) => {
  const date = normalizeDate(value);
  if (!date) return { year: 0, month: 0, day: 0 };
  const parts = ethiopianDateFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  };
};

const formatEthiopianDate = (value) => {
  const { year, month, day } = getEthiopianParts(value);
  if (!year || !month || !day) return '';
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
};

const formatEthiopianShortDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return ethiopianShortFormatter.format(date).replace(/\s*ERA1$/, '');
};

const startOfEthiopiaDayUtc = (value) => {
  const localDate = getEthiopiaLocalDate(value);
  if (!localDate) return null;
  return new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate()) - ETHIOPIA_OFFSET_MS);
};

const endOfEthiopiaDayUtc = (value) => {
  const localDate = getEthiopiaLocalDate(value);
  if (!localDate) return null;
  return new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), 23, 59, 59, 999) - ETHIOPIA_OFFSET_MS);
};

const shiftUtcDays = (value, days) => {
  const date = normalizeDate(value);
  if (!date) return null;
  const shifted = new Date(date.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
};

const createGregorianMidday = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

const parseEthiopianInput = (value) => {
  const normalized = String(value || '').trim().replace(/-/g, '/');
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (!year || month < 1 || month > 13 || day < 1 || day > 30) {
    return null;
  }

  return { year, month, day };
};

const ethiopianToGregorianDate = (ethiopianDate) => {
  const target =
    typeof ethiopianDate === 'string' ? parseEthiopianInput(ethiopianDate) : ethiopianDate;
  if (!target) return null;

  const approximateStart = createGregorianMidday(target.year + 7, 9, 11);
  const searchWindow = 400;

  for (let offset = -40; offset <= searchWindow; offset += 1) {
    const candidate = new Date(approximateStart.getTime() + offset * 86400000);
    const parts = getEthiopianParts(candidate);
    if (parts.year === target.year && parts.month === target.month && parts.day === target.day) {
      return candidate;
    }
  }

  return null;
};

const parseGregorianInput = (value) => {
  const normalized = String(value || '').trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }

  const mdyMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!mdyMatch) return null;

  const month = Number(mdyMatch[1]);
  const day = Number(mdyMatch[2]);
  const year = Number(mdyMatch[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const getCalendarMode = (value) => (value === 'gregorian' ? 'gregorian' : 'ethiopian');

const formatGregorianDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  const parts = gregorianPartsFormatter.formatToParts(date);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  if (!year || !month || !day) return '';
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
};

const formatGregorianShortDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return gregorianShortFormatter.format(date);
};

const getGregorianParts = (value) => {
  const date = normalizeDate(value);
  if (!date) return { year: 0, month: 0, day: 0 };
  const parts = gregorianPartsFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  };
};

const getCalendarParts = (calendarMode, value) =>
  getCalendarMode(calendarMode) === 'gregorian' ? getGregorianParts(value) : getEthiopianParts(value);

const formatCalendarDate = (calendarMode, value) =>
  getCalendarMode(calendarMode) === 'gregorian' ? formatGregorianDate(value) : formatEthiopianDate(value);

const formatCalendarShortDate = (calendarMode, value) =>
  getCalendarMode(calendarMode) === 'gregorian' ? formatGregorianShortDate(value) : formatEthiopianShortDate(value);

const parseCalendarDate = (calendarMode, value) =>
  getCalendarMode(calendarMode) === 'gregorian' ? parseGregorianInput(value) : ethiopianToGregorianDate(value);

const calendarPartsToGregorianDate = (calendarMode, parts) =>
  getCalendarMode(calendarMode) === 'gregorian'
    ? new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0))
    : ethiopianToGregorianDate(parts);

class CouponsService {
  /**
   * Legacy wrapper for createCoupon to support frontend request parameters
   */
  async createCoupon(data, actorId, req) {
    const { beneficiaryId, mealId, expiresAt } = data;
    const coupon = await this.issueCoupon(
      { beneficiaryId, configId: mealId, expiresAt },
      actorId,
      req
    );

    // Return in format expected by frontend controllers/components
    return {
      id: coupon.id,
      code: coupon.code,
      status: coupon.status === 'ALLOCATED' ? 'ACTIVE' : coupon.status === 'CLAIMED' ? 'REDEEMED' : coupon.status,
      expiresAt: coupon.expiresAt,
    };
  }

  /**
   * Issue a single coupon to a beneficiary employee using a config template
   */
  async issueCoupon({ beneficiaryId, configId, expiresAt }, actorId, req) {
    const coupon = await prisma.$transaction(async (tx) => {
      // Ensure beneficiary exists and is employee
      const employee = await tx.user.findUnique({
        where: { id: beneficiaryId },
        select: { id: true, role: true },
      });
      if (!employee || employee.role !== 'EMPLOYEE') {
        throw new Error('Beneficiary employee not found');
      }

      // Validate config exists
      const config = await tx.couponConfig.findUnique({
        where: { id: configId },
        select: { value: true, expiryWorkingDays: true },
      });
      if (!config) {
        throw new Error('Coupon configuration not found');
      }

      // Compute expiry if not supplied
      const finalExpiry = expiresAt
        ? new Date(expiresAt)
        : await calculateExpiryDate(new Date(), config.expiryWorkingDays);

      // Generate unique coupon code using a cryptographically strong identifier.
      const code = buildCouponCode();

      const newCoupon = await tx.coupon.create({
        data: {
          code,
          status: 'ALLOCATED',
          value: config.value,
          configId: configId,
          employeeId: beneficiaryId,
          allocatedById: actorId,
          expiresAt: finalExpiry,
        },
      });
      return newCoupon;
    });

    await auditService.log({
      action: 'COUPON_ISSUE',
      entityType: 'Coupon',
      entityId: coupon.id,
      actorId,
      newState: coupon,
      req,
    });
    return coupon;
  }

  /**
   * Bulk issue coupons to many beneficiaries using same config
   */
  async bulkIssue({ beneficiaryIds, configId, expiresAt }, actorId, req) {
    if (!Array.isArray(beneficiaryIds) || beneficiaryIds.length === 0) {
      throw new Error('beneficiaryIds must be a non‑empty array');
    }

    // Transaction ensures all or none
    const coupons = await prisma.$transaction(async (tx) => {
      const config = await tx.couponConfig.findUnique({
        where: { id: configId },
        select: { value: true, expiryWorkingDays: true },
      });
      if (!config) throw new Error('Coupon configuration not found');

      const finalExpiry = expiresAt
        ? new Date(expiresAt)
        : await calculateExpiryDate(new Date(), config.expiryWorkingDays);

      const employees = await tx.user.findMany({
        where: {
          id: { in: beneficiaryIds },
          role: 'EMPLOYEE',
        },
        select: {
          id: true,
          role: true,
        },
      });
      const validEmployeeIds = new Set(employees.map((emp) => emp.id));

      const created = [];
      for (const benId of beneficiaryIds) {
        if (!validEmployeeIds.has(benId)) continue;

        const code = buildCouponCode();
        const coupon = await tx.coupon.create({
          data: {
            code,
            status: 'ALLOCATED',
            value: config.value,
            configId,
            employeeId: benId,
            allocatedById: actorId,
            expiresAt: finalExpiry,
          },
        });
        created.push(coupon);
      }
      return created;
    });

    await auditService.log({
      action: 'COUPON_BULK_ISSUE',
      entityType: 'Coupon',
      entityId: null,
      actorId,
      newState: { count: coupons.length, configId },
      req,
    });
    return coupons;
  }

  /**
   * Validate a QR card code (scanned at cafe) and return linked employee info
   */
  async validateQR(cardCode) {
    const card = await prisma.qRCard.findUnique({
      where: { cardCode },
      select: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    if (!card) {
      throw new Error('QR card not recognised');
    }
    if (card.status !== 'ACTIVE') {
      throw new Error('QR card is not active');
    }
    return card.employee; // contains employee User data
  }

  async redeemCoupon(payload, actorId, req) {
    const code = typeof payload === 'string' ? payload : payload?.code;
    const coupon = await prisma.$transaction(async (tx) => {
      const c = await tx.coupon.findUnique({
        where: { code },
        select: {
          id: true,
          code: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          claimedAt: true,
          employeeId: true,
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      if (!c) throw new Error('Coupon code invalid');
      if (c.status !== 'ALLOCATED') throw new Error('Coupon already used or expired');

      // Guard duplicate visit on same day.
      // claimedDateString uses "YYYY-MM-DD" for the first coupon of a session and
      // "YYYY-MM-DD-N" for subsequent ones, so we check startsWith to catch all cases.
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      const duplicate = await tx.coupon.findFirst({
        where: {
          employeeId: c.employeeId,
          claimedDateString: { startsWith: dateString },
          status: 'CLAIMED',
        },
      });
      if (duplicate) {
        throw new Error('Employee already claimed a coupon today');
      }

      const updated = await tx.coupon.update({
        where: { id: c.id },
        data: {
          status: 'CLAIMED',
          claimedById: actorId,
          claimedAt: new Date(),
          claimedDateString: dateString,
        },
        select: {
          id: true,
          code: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          claimedAt: true,
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          claimedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          config: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      });
      return updated;
    });

    await auditService.log({
      action: 'COUPON_REDEEM',
      entityType: 'Coupon',
      entityId: coupon.id,
      actorId,
      oldState: null,
      newState: coupon,
      req,
    });

    // Map back to format expected by UI
    return {
      id: coupon.id,
      code: coupon.code,
      status: 'REDEEMED',
      expiresAt: coupon.expiresAt,
      redeemedAt: coupon.claimedAt,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
      beneficiary: coupon.employee ? {
        id: coupon.employee.id,
        name: coupon.employee.name,
        email: coupon.employee.email,
      } : null,
      vendor: coupon.claimedBy ? {
        id: coupon.claimedBy.id,
        name: coupon.claimedBy.name,
        email: coupon.claimedBy.email,
      } : null,
      meal: coupon.config ? {
        id: coupon.config.id,
        nameEn: coupon.config.name,
        nameAm: coupon.config.name,
        price: coupon.config.value,
      } : null,
    };
  }

  async getCouponScanReport(filters = {}, user = null) {
    const now = new Date();
    const rangeType = filters.range || 'thisMonth';
    const calendarMode = getCalendarMode(filters.calendarMode);
    let campusId = filters.campusId || null;
    let vendorId = filters.vendorId || null;
    if (user?.role === 'CAFE_STAFF') {
      campusId = user.campusId || campusId;
    }
    let startDate = filters.startDate ? startOfEthiopiaDayUtc(parseCalendarDate(calendarMode, filters.startDate)) : null;
    let endDate = filters.endDate ? endOfEthiopiaDayUtc(parseCalendarDate(calendarMode, filters.endDate)) : null;

    if (!startDate || !endDate) {
      const todayStart = startOfEthiopiaDayUtc(now);
      const todayEnd = endOfEthiopiaDayUtc(now);
      const currentParts = getCalendarParts(calendarMode, now);

      if (rangeType === 'today') {
        startDate = todayStart;
        endDate = todayEnd;
      } else if (rangeType === 'yesterday') {
        const yesterday = shiftUtcDays(todayStart, -1);
        startDate = yesterday;
        endDate = endOfEthiopiaDayUtc(yesterday);
      } else if (rangeType === 'thisWeek') {
        const localNow = getEthiopiaLocalDate(now);
        const day = localNow.getUTCDay();
        const daysSinceMonday = (day + 6) % 7;
        startDate = shiftUtcDays(todayStart, -daysSinceMonday);
        endDate = todayEnd;
      } else if (rangeType === 'lastWeek') {
        const localNow = getEthiopiaLocalDate(now);
        const day = localNow.getUTCDay();
        const daysSinceMonday = (day + 6) % 7;
        const thisWeekStart = shiftUtcDays(todayStart, -daysSinceMonday);
        startDate = shiftUtcDays(thisWeekStart, -7);
        endDate = endOfEthiopiaDayUtc(shiftUtcDays(thisWeekStart, -1));
      } else if (rangeType === 'lastMonth') {
        const previousMonth =
          currentParts.month === 1
            ? { year: currentParts.year - 1, month: 13, day: 1 }
            : { year: currentParts.year, month: currentParts.month - 1, day: 1 };
        const previousMonthStart = calendarPartsToGregorianDate(calendarMode, previousMonth);
        const currentMonthStart = calendarPartsToGregorianDate(calendarMode, {
          year: currentParts.year,
          month: currentParts.month,
          day: 1,
        });
        startDate = startOfEthiopiaDayUtc(previousMonthStart || todayStart);
        endDate = currentMonthStart
          ? endOfEthiopiaDayUtc(shiftUtcDays(startOfEthiopiaDayUtc(currentMonthStart), -1))
          : todayEnd;
      } else if (rangeType === 'thisYear') {
        const yearStart = calendarPartsToGregorianDate(calendarMode, {
          year: currentParts.year,
          month: 1,
          day: 1,
        });
        startDate = startOfEthiopiaDayUtc(yearStart || todayStart);
        endDate = todayEnd;
      } else if (rangeType === 'lifetime') {
        const oldestClaim = await prisma.couponClaim.findFirst({
          orderBy: { issuedAt: 'asc' },
          select: { issuedAt: true },
        });
        startDate = oldestClaim ? startOfEthiopiaDayUtc(oldestClaim.issuedAt) : todayStart;
        endDate = todayEnd;
      } else {
        const monthStart = calendarPartsToGregorianDate(calendarMode, {
          year: currentParts.year,
          month: currentParts.month,
          day: 1,
        });
        startDate = startOfEthiopiaDayUtc(monthStart || todayStart);
        endDate = todayEnd;
      }
    }

    if (!startDate || !endDate) {
      startDate = startOfEthiopiaDayUtc(now);
      endDate = endOfEthiopiaDayUtc(now);
    }

    const rangeDays = Math.max(1, Math.ceil((endDate - startDate) / 86400000) + 1);
    const previousStart = shiftUtcDays(startDate, -rangeDays);
    const previousEnd = endOfEthiopiaDayUtc(shiftUtcDays(startDate, -1));

    const rangeLabel = `${formatCalendarDate(calendarMode, startDate)} -> ${formatCalendarDate(calendarMode, endDate)}`;

    const aggregateRange = async (from, to) => {
      const campusClause = campusId ? Prisma.sql`AND cc."campusId" = ${campusId}` : Prisma.empty;
      const vendorClause = vendorId ? Prisma.sql`AND cc."vendorId" = ${vendorId}` : Prisma.empty;
      const rows = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('day', (cc."issuedAt" AT TIME ZONE 'Africa/Addis_Ababa'))::date AS day,
          COUNT(*)::int AS count,
          COALESCE(SUM(c."value"), 0)::numeric AS amount
        FROM "CouponClaim" cc
        INNER JOIN "Coupon" c ON c."id" = cc."couponId"
        WHERE cc."issuedAt" >= ${from} AND cc."issuedAt" <= ${to}
        ${campusClause}
        ${vendorClause}
        GROUP BY 1
        ORDER BY 1 ASC
      `;
      return rows.map((row) => ({
        day: (() => {
          const value = row.day;
          if (!value) return '';
          if (typeof value === 'string') return String(value).slice(0, 10);
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return '';
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        })(),
        count: Number(row.count || 0),
        amount: Number(row.amount || 0),
      }));
    };

    const breakdownRows = await prisma.$queryRaw`
      SELECT
        cc."campusId" AS "campusId",
        camp.name AS "campusName",
        cc."vendorId" AS "vendorId",
        vend.name AS "vendorName",
        COUNT(*)::int AS count,
        COALESCE(SUM(c."value"), 0)::numeric AS amount
      FROM "CouponClaim" cc
      INNER JOIN "Coupon" c ON c."id" = cc."couponId"
      LEFT JOIN "Campus" camp ON camp."id" = cc."campusId"
      LEFT JOIN "Vendor" vend ON vend."id" = cc."vendorId"
      WHERE cc."issuedAt" >= ${startDate} AND cc."issuedAt" <= ${endDate}
      ${campusId ? Prisma.sql`AND cc."campusId" = ${campusId}` : Prisma.empty}
      ${vendorId ? Prisma.sql`AND cc."vendorId" = ${vendorId}` : Prisma.empty}
      GROUP BY 1, 2, 3, 4
      ORDER BY amount DESC
    `;

    const ethiopiaDateKey = (value) => {
      const local = getEthiopiaLocalDate(value);
      if (!local) return '';
      return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
    };

    const dashTodayStart = startOfEthiopiaDayUtc(now);
    const dashTodayEnd = endOfEthiopiaDayUtc(now);
    const dashLocalNow = getEthiopiaLocalDate(now);
    const dashDaysSinceMonday = (dashLocalNow.getUTCDay() + 6) % 7;
    const dashWeekStart = shiftUtcDays(dashTodayStart, -dashDaysSinceMonday);
    const dashParts = getCalendarParts(calendarMode, now);
    const dashMonthStartDate = calendarPartsToGregorianDate(calendarMode, {
      year: dashParts.year,
      month: dashParts.month,
      day: 1,
    });
    const dashMonthStart = startOfEthiopiaDayUtc(dashMonthStartDate || dashTodayStart);

    const [selectedRows, previousRows, todayRows, weekRows, monthRows, employeeClaims] = await Promise.all([
      aggregateRange(startDate, endDate),
      rangeType === 'lifetime' ? Promise.resolve([]) : aggregateRange(previousStart, previousEnd),
      aggregateRange(dashTodayStart, dashTodayEnd),
      aggregateRange(dashWeekStart, dashTodayEnd),
      aggregateRange(dashMonthStart, dashTodayEnd),
      prisma.couponClaim.findMany({
        where: {
          issuedAt: { gte: startDate, lte: endDate },
          ...(campusId ? { campusId } : {}),
          ...(vendorId ? { vendorId } : {}),
        },
        select: {
          issuedAt: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeProfile: { select: { employeeIdNumber: true } },
            },
          },
          coupon: { select: { value: true } },
        },
      }),
    ]);
    const selectedRowMap = new Map(selectedRows.map((row) => [row.day, row]));

    const selectedCount = selectedRows.reduce((sum, row) => sum + row.count, 0);
    const selectedAmount = selectedRows.reduce((sum, row) => sum + row.amount, 0);
    const previousCount = previousRows.reduce((sum, row) => sum + row.count, 0);
    const previousAmount = previousRows.reduce((sum, row) => sum + row.amount, 0);
    const sumPeriod = (rows) => ({
      count: rows.reduce((sum, row) => sum + row.count, 0),
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      rate: STANDARD_COUPON_VALUE,
    });
    const compare = (current, previous) => {
      if (!previous) return null;
      return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    const chartSeries = [];
    let dayCursor = new Date(startDate.getTime());
    while (dayCursor <= endDate) {
      const key = ethiopiaDateKey(dayCursor);
      const match = selectedRowMap.get(key);
      chartSeries.push({
        date: key,
        label: formatCalendarShortDate(calendarMode, dayCursor),
        count: match?.count || 0,
        amount: match?.amount || 0,
      });
      dayCursor = shiftUtcDays(dayCursor, 1);
    }

    const employeeMap = new Map();
    for (const claim of employeeClaims) {
      const id = claim.employee?.id;
      if (!id) continue;
      const current = employeeMap.get(id) || {
        id,
        name: claim.employee.name || 'N/A',
        employeeIdNumber: claim.employee.employeeProfile?.employeeIdNumber || 'N/A',
        count: 0,
        amount: 0,
        lastIssuedAt: claim.issuedAt,
      };
      current.count += 1;
      current.amount += Number(claim.coupon?.value || 0);
      if (new Date(claim.issuedAt) > new Date(current.lastIssuedAt)) {
        current.lastIssuedAt = claim.issuedAt;
      }
      employeeMap.set(id, current);
    }
    const employees = [...employeeMap.values()].sort(
      (a, b) => new Date(b.lastIssuedAt) - new Date(a.lastIssuedAt)
    );

    return {
      standardCouponValue: STANDARD_COUPON_VALUE,
      selectedRange: {
        startDate,
        endDate,
        label: rangeLabel,
        rangeType,
        calendarMode,
      },
      chartSeries,
      summary: {
        selectedCount,
        selectedAmount,
        averagePerDay: Number((selectedCount / chartSeries.length).toFixed(2)),
        averageRevenuePerDay: Number((selectedAmount / chartSeries.length).toFixed(2)),
        highestScanDay: chartSeries.reduce((best, row) => (row.count > (best?.count || -1) ? row : best), null),
        lowestScanDay: chartSeries.reduce((best, row) => (best === null || row.count < best.count ? row : best), null),
      },
      comparison: rangeType === 'lifetime' ? null : {
        previousStartDate: previousStart,
        previousEndDate: previousEnd,
        selectedVsPreviousCount: compare(selectedCount, previousCount),
        selectedVsPreviousAmount: compare(selectedAmount, previousAmount),
        previousCount,
        previousAmount,
      },
      metrics: {
        selectedCount,
        selectedAmount,
        rate: STANDARD_COUPON_VALUE,
        previousCount,
        previousAmount,
      },
      byCampus: (breakdownRows || []).map((row) => ({
        campusId: row.campusId,
        campusName: row.campusName || 'Unassigned',
        vendorId: row.vendorId,
        vendorName: row.vendorName || 'Unassigned',
        count: Number(row.count || 0),
        amount: Number(row.amount || 0),
      })),
      employees,
      today: sumPeriod(todayRows),
      week: sumPeriod(weekRows),
      month: sumPeriod(monthRows),
    };
  }

  formatPaymentLetterDate(calendarMode, value) {
    const pad = (n) => String(n).padStart(2, '0');
    if (getCalendarMode(calendarMode) === 'gregorian') {
      const { year, month, day } = getGregorianParts(value);
      if (!year || !month || !day) return '';
      return `${pad(day)}/${pad(month)}/${year}`;
    }
    const { year, month, day } = getEthiopianParts(value);
    if (!year || !month || !day) return '';
    return `${pad(day)}/${pad(month)}/${String(year).slice(-2)}`;
  }

  /**
   * Editable Word payment order for HR. Totals come from scans
   * for the selected period and cafe vendor.
   */
  async buildPaymentOrderDocx(filters = {}, user = null) {
    if (user?.role !== 'HR') {
      const err = new Error('Payment letters are prepared by HR.');
      err.statusCode = 403;
      throw err;
    }

    const report = await this.getCouponScanReport(filters, user);
    const rows = report.byCampus || [];
    const vendorId = filters.vendorId || null;
    const campusId = filters.campusId || null;

    let row = null;
    if (vendorId) {
      row = rows.find(
        (item) =>
          item.vendorId === vendorId && (!campusId || item.campusId === campusId)
      );
    }
    if (!row && rows.length === 1) {
      row = rows[0];
    }
    if (!row) {
      const err = new Error(
        'Select the cafe vendor this letter is paying. Open Reports, pick the period, then download from that cafe row.'
      );
      err.statusCode = 400;
      throw err;
    }

    const calendarMode = report.selectedRange.calendarMode;
    const vars = {
      date: this.formatPaymentLetterDate(calendarMode, new Date()),
      start_date: this.formatPaymentLetterDate(calendarMode, report.selectedRange.startDate),
      end_date: this.formatPaymentLetterDate(calendarMode, report.selectedRange.endDate),
      total_days: String(report.chartSeries?.length || 0),
      total_scans: formatGroupedInt(row.count),
      rate_per_coupon: formatMoney(report.metrics.rate),
      total_amount: formatMoney(row.amount),
      total_amount_words: birrToAmharicWords(row.amount),
      cafe_name: row.vendorName,
    };

    const buffer = await renderPaymentOrderDocx(vars);
    const safeVendor = String(row.vendorName || 'cafe')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const filename = `payment-order-${safeVendor || 'cafe'}-${vars.start_date.replace(/\//g, '-')}-${vars.end_date.replace(/\//g, '-')}.docx`;

    return { buffer, filename, vars };
  }

  async getCoupons(filters = {}, user) {
    const { status, beneficiaryId, code, vendorId, search, sort = 'updatedAt', order = 'desc' } = filters;
    const page = Math.max(parseInt(filters.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 25, 1), 100);
    const skip = (page - 1) * limit;
    const where = {};

    if (status) {
      let dbStatus = status;
      if (dbStatus === 'ACTIVE') dbStatus = 'ALLOCATED';
      if (dbStatus === 'REDEEMED') dbStatus = 'CLAIMED';
      where.status = dbStatus;
    }

    if (beneficiaryId) {
      where.employeeId = beneficiaryId;
    }

    if (code) {
      where.code = code;
    }

    if (vendorId) {
      where.claimedById = vendorId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { employee: { name: { contains: search, mode: 'insensitive' } } },
        { employee: { email: { contains: search, mode: 'insensitive' } } },
        { config: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Role-based scoping limits
    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.id;
    } else if (user.role === 'CAFE_STAFF') {
      // CAFE_STAFF default view to claimed (redeemed) coupons if no filter is set
      if (!status) {
        where.status = 'CLAIMED';
      }
    }

    const sortField = COUPON_SORT_FIELDS.has(sort) ? sort : 'updatedAt';
    const orderBy = {
      [sortField]: order === 'asc' ? 'asc' : 'desc',
    };

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        select: {
          id: true,
          code: true,
          status: true,
          expiresAt: true,
          claimedAt: true,
          createdAt: true,
          updatedAt: true,
          claimedDateString: true,
          value: true,
          ...COUPON_RELATION_SELECT,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.coupon.count({ where }),
    ]);

    // Map database structures to legacy API objects expected by frontend
    return {
      data: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      status: c.status === 'ALLOCATED' ? 'ACTIVE' : c.status === 'CLAIMED' ? 'REDEEMED' : c.status,
      expiresAt: c.expiresAt,
      redeemedAt: c.claimedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      beneficiary: c.employee ? {
        id: c.employee.id,
        name: c.employee.name,
        email: c.employee.email,
      } : null,
      vendor: c.claimedBy ? {
        id: c.claimedBy.id,
        name: c.claimedBy.name,
        email: c.claimedBy.email,
      } : null,
      meal: c.config ? {
        id: c.config.id,
        nameEn: c.config.name,
        nameAm: c.config.name,
        descriptionEn: `Expires in ${c.config.expiryWorkingDays} working days`,
        descriptionAm: `በ${c.config.expiryWorkingDays} የስራ ቀናት ውስጥ ያበቃል`,
        price: c.config.value,
        status: 'ACTIVE',
      } : null,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }
}

export default new CouponsService();
