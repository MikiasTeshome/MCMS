import prisma from '../../config/db.js';

const STANDARD_MEAL_BIRR = 40;
const ETHIOPIA_OFFSET_MS = 3 * 60 * 60 * 1000;

function ethiopiaDayRange(now = new Date()) {
  const localNow = new Date(now.getTime() + ETHIOPIA_OFFSET_MS);
  const todayStart = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - ETHIOPIA_OFFSET_MS
  );
  const todayEnd = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 23, 59, 59, 999) -
      ETHIOPIA_OFFSET_MS
  );
  const daysSinceMonday = (localNow.getUTCDay() + 6) % 7;
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  return { todayStart, todayEnd, weekStart };
}

async function claimsByCampus(from, to, campuses) {
  const rows = await prisma.couponClaim.groupBy({
    by: ['campusId'],
    where: { issuedAt: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const countMap = new Map(rows.map((row) => [row.campusId, row._count._all]));
  return campuses.map((campus) => {
    const count = countMap.get(campus.id) || 0;
    return {
      campusId: campus.id,
      campusName: campus.name,
      count,
      amount: count * STANDARD_MEAL_BIRR,
    };
  });
}

class DashboardService {
  async getStats(user) {
    const { todayStart, todayEnd, weekStart } = ethiopiaDayRange();

    const [totalCoupons, claimedCoupons, expiredCoupons, activeEmployees, todayClaims, recentCoupons, campuses] =
      await Promise.all([
        prisma.coupon.count(),
        prisma.coupon.count({ where: { status: 'CLAIMED' } }),
        prisma.coupon.count({
          where: {
            OR: [
              { status: 'EXPIRED' },
              { status: 'ALLOCATED', expiresAt: { lt: new Date() } },
            ],
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
        prisma.campus.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

    const [todayByCampus, weekByCampus] = await Promise.all([
      claimsByCampus(todayStart, todayEnd, campuses),
      claimsByCampus(weekStart, todayEnd, campuses),
    ]);

    return {
      totalCoupons,
      claimedCoupons,
      expiredCoupons,
      activeEmployees,
      todayClaims,
      claimsByCampus: {
        today: todayByCampus,
        week: weekByCampus,
      },
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
