import prisma from '../../config/db.js';

class DashboardService {
  async getStats(user) {
    const ethiopiaOffsetMs = 3 * 60 * 60 * 1000;
    const localNow = new Date(Date.now() + ethiopiaOffsetMs);
    const todayStart = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - ethiopiaOffsetMs
    );

    const [totalCoupons, claimedCoupons, expiredCoupons, activeEmployees, todayClaims, recentCoupons] =
      await Promise.all([
        prisma.coupon.count(),
        prisma.coupon.count({ where: { status: 'CLAIMED' } }),
        prisma.coupon.count({
          where: {
            OR: [{ status: 'EXPIRED' }, { expiresAt: { lt: new Date() } }],
          },
        }),
        prisma.user.count({ where: { role: 'EMPLOYEE', isActive: true } }),
        prisma.couponClaim.count({ where: { issuedAt: { gte: todayStart } } }),
        prisma.coupon.findMany({
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            employee: { select: { id: true, name: true, email: true } },
            claimedBy: { select: { id: true, name: true, email: true } },
            config: { select: { id: true, name: true, value: true } },
          },
        }),
      ]);

    return {
      totalCoupons,
      claimedCoupons,
      expiredCoupons,
      activeEmployees,
      todayClaims,
      recentCoupons: recentCoupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        status: coupon.status,
        expiresAt: coupon.expiresAt,
        redeemedAt: coupon.claimedAt,
        beneficiary: coupon.employee,
        vendor: coupon.claimedBy,
        meal: coupon.config,
      })),
      role: user?.role || null,
    };
  }
}

export default new DashboardService();
