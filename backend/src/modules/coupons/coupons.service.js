import prisma from '../../config/db.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import auditService from '../audit/audit.service.js';
import { calculateExpiryDate } from '../../utils/expiry.js'; // helper to compute working days

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

  /**
   * Retrieves coupons list with role filtering and legacy mappings for frontend
   */
  async getCouponScanReport(filters = {}) {
    const now = new Date();
    const rangeType = filters.range || 'thisMonth';
    let startDate = filters.startDate ? new Date(filters.startDate) : null;
    let endDate = filters.endDate ? new Date(filters.endDate) : null;

    if (!startDate || !endDate) {
      if (rangeType === 'today') {
        startDate = startOfDayUTC(now);
        endDate = endOfDayUTC(now);
      } else if (rangeType === 'yesterday') {
        const yesterday = addDaysUTC(now, -1);
        startDate = startOfDayUTC(yesterday);
        endDate = endOfDayUTC(yesterday);
      } else if (rangeType === 'thisWeek') {
        startDate = startOfLocalWeek(now);
        endDate = now;
      } else if (rangeType === 'lastWeek') {
        const weekStart = startOfLocalWeek(now);
        startDate = addDays(weekStart, -7);
        endDate = weekStart;
      } else if (rangeType === 'lastMonth') {
        const monthStart = startOfLocalMonth(now);
        startDate = addMonths(monthStart, -1);
        endDate = monthStart;
      } else if (rangeType === 'thisYear') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
      } else if (rangeType === 'lifetime') {
        const oldestClaim = await prisma.couponClaim.findFirst({
          orderBy: { issuedAt: 'asc' },
          select: { issuedAt: true }
        });
        startDate = oldestClaim ? oldestClaim.issuedAt : startOfLocalMonth(now);
        endDate = now;
      } else {
        startDate = startOfLocalMonth(now);
        endDate = now;
      }
    }

    startDate = startOfDayUTC(startDate);
    endDate = endOfDayUTC(endDate);

    const rangeDays = Math.max(1, Math.ceil((endDate - startDate) / 86400000) + 1);
    const previousStart = addDaysUTC(startDate, -rangeDays);
    const previousEnd = addDaysUTC(startDate, -1);

    const rangeLabel = `${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()}`;

    const aggregateRange = async (from, to) => {
      const rows = await prisma.$queryRaw`
        SELECT
          DATE_TRUNC('day', cc."issuedAt")::date AS day,
          COUNT(*)::int AS count,
          COALESCE(SUM(c."value"), 0)::numeric AS amount
        FROM "CouponClaim" cc
        INNER JOIN "Coupon" c ON c."id" = cc."couponId"
        WHERE cc."issuedAt" >= ${from} AND cc."issuedAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `;
      return rows.map((row) => ({
        day: formatDateKey(row.day),
        count: Number(row.count || 0),
        amount: Number(row.amount || 0),
      }));
    };

    const [selectedRows, previousRows] = await Promise.all([
      aggregateRange(startDate, endDate),
      rangeType === 'lifetime' ? Promise.resolve([]) : aggregateRange(previousStart, previousEnd),
    ]);
    const selectedRowMap = new Map(selectedRows.map((row) => [row.day, row]));

    const selectedCount = selectedRows.reduce((sum, row) => sum + row.count, 0);
    const selectedAmount = selectedRows.reduce((sum, row) => sum + row.amount, 0);
    const previousCount = previousRows.reduce((sum, row) => sum + row.count, 0);
    const previousAmount = previousRows.reduce((sum, row) => sum + row.amount, 0);
    const compare = (current, previous) => {
      if (!previous) return null;
      return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    const chartSeries = [];
    const dayCursor = new Date(startDate);
    while (dayCursor <= endDate) {
      const key = formatDateKey(dayCursor);
      const match = selectedRowMap.get(key);
      chartSeries.push({
        date: key,
        label: dayCursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count: match?.count || 0,
        amount: match?.amount || 0,
      });
      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }

    return {
      standardCouponValue: STANDARD_COUPON_VALUE,
      selectedRange: {
        startDate,
        endDate,
        label: rangeLabel,
        rangeType,
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
    };
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
