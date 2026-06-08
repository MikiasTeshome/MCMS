import prisma from '../../config/db.js';
import couponsScanService from '../coupons/coupons.scan.service.js';

/**
 * Legacy cafe routes — delegates to the canonical coupons scan workflow.
 */
class CafeService {
  async verifyCard(cardId, staffId, req) {
    const data = await couponsScanService.scanEmployee(cardId, staffId, req);
    return {
      eligible: data.availableCoupons > 0 && !data.claimedToday,
      blocked: false,
      claimedToday: data.claimedToday,
      employee: {
        id: data.employeeId,
        name: data.fullName,
        department: data.department,
        position: data.staffType,
        employeeIdNumber: data.employeeId,
      },
      couponsCount: data.availableCoupons,
      scan: data,
    };
  }

  async issueCoupon({ cardId, bulk, overrideReason }, actorId, req) {
    const employeeId = await couponsScanService.resolveEmployeeId(cardId);
    const user = await prisma.user.findUnique({ where: { id: actorId } });
    if (!user) throw new Error('Staff user not found');
    return couponsScanService.issueCoupons(
      {
        employeeId,
        quantity: bulk ? 0 : 1,
        overrideReason,
      },
      user,
      req
    );
  }
}

export default new CafeService();
