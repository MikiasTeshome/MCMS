import prisma from '../config/db.js';

export async function getCafeDeskContext(user) {
  const campusId = user?.campusId;
  if (!campusId) {
    const err = new Error('This cafe login is not assigned to a campus. Ask Admin to set the campus.');
    err.code = 'NO_CAMPUS';
    throw err;
  }

  const assignment = await prisma.campusVendorAssignment.findFirst({
    where: { campusId, endedAt: null },
    include: {
      campus: true,
      vendor: true,
    },
  });

  if (!assignment) {
    const err = new Error('No cafe vendor is assigned to this campus. Ask HR to assign the vendor under Cafes.');
    err.code = 'NO_VENDOR';
    throw err;
  }

  if (!assignment.campus?.isActive) {
    const err = new Error('This campus is inactive. Meals cannot be recorded here.');
    err.code = 'NO_CAMPUS';
    throw err;
  }

  if (!assignment.vendor?.isActive) {
    const err = new Error('No cafe vendor is assigned to this campus. Ask HR to assign the vendor under Cafes.');
    err.code = 'NO_VENDOR';
    throw err;
  }

  return {
    campus: assignment.campus,
    vendor: assignment.vendor,
  };
}

const ETHIOPIA_OFFSET_MS = 3 * 60 * 60 * 1000;
const STANDARD_MEAL_BIRR = 40;

function ethiopiaTodayRange() {
  const localNow = new Date(Date.now() + ETHIOPIA_OFFSET_MS);
  const todayStart = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - ETHIOPIA_OFFSET_MS
  );
  const todayEnd = new Date(
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 23, 59, 59, 999) -
      ETHIOPIA_OFFSET_MS
  );
  return { todayStart, todayEnd };
}

export async function getCafeDeskStatus(user) {
  const campusId = user?.campusId || null;
  if (!campusId) {
    return {
      ready: false,
      code: 'NO_CAMPUS',
      campus: null,
      vendor: null,
      today: { count: 0, amount: 0 },
    };
  }

  const { todayStart, todayEnd } = ethiopiaTodayRange();
  const [campus, assignment, count] = await Promise.all([
    prisma.campus.findUnique({
      where: { id: campusId },
      select: { id: true, name: true, code: true, isActive: true },
    }),
    prisma.campusVendorAssignment.findFirst({
      where: { campusId, endedAt: null },
      include: { vendor: { select: { id: true, name: true, isActive: true } } },
    }),
    prisma.couponClaim.count({
      where: { campusId, issuedAt: { gte: todayStart, lte: todayEnd } },
    }),
  ]);

  const vendor = assignment?.vendor?.isActive !== false ? assignment?.vendor || null : null;
  const campusOk = Boolean(campus?.isActive);
  const ready = campusOk && Boolean(vendor);
  let code = null;
  if (!campusOk) code = 'NO_CAMPUS';
  else if (!vendor) code = 'NO_VENDOR';

  return {
    ready,
    code,
    campus: campus ? { id: campus.id, name: campus.name, code: campus.code } : null,
    vendor: vendor ? { id: vendor.id, name: vendor.name } : null,
    today: { count, amount: count * STANDARD_MEAL_BIRR },
  };
}
