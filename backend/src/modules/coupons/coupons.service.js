import prisma from '../../config/db.js';
import auditService from '../audit/audit.service.js';
import { calculateExpiryDate } from '../../utils/expiry.js'; // helper to compute working days

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

      // Generate unique coupon code (simple UUID-like string)
      const code = `COUPON-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

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

      const created = [];
      for (const benId of beneficiaryIds) {
        // Validate employee exists under the transaction
        const emp = await tx.user.findUnique({ where: { id: benId } });
        if (!emp || emp.role !== 'EMPLOYEE') continue; // skip invalid rows

        const code = `COUPON-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
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
      include: { employee: true },
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
        include: { employee: true },
      });
      if (!c) throw new Error('Coupon code invalid');
      if (c.status !== 'ALLOCATED') throw new Error('Coupon already used or expired');

      // Guard duplicate claim on same day (composite unique index)
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      // Ensure no other coupon for this employee claimed today
      const duplicate = await tx.coupon.findFirst({
        where: {
          employeeId: c.employeeId,
          claimedDateString: dateString,
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
        include: {
          employee: true,
          claimedBy: true,
          config: true,
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
  async getCoupons(filters = {}, user) {
    const { status, beneficiaryId, code, vendorId } = filters;
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

    // Role-based scoping limits
    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.id;
    } else if (user.role === 'CAFE_STAFF') {
      // CAFE_STAFF default view to claimed (redeemed) coupons if no filter is set
      if (!status) {
        where.status = 'CLAIMED';
      }
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        employee: true,
        claimedBy: true,
        allocatedBy: true,
        config: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Map database structures to legacy API objects expected by frontend
    return coupons.map((c) => ({
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
    }));
  }
}

export default new CouponsService();
