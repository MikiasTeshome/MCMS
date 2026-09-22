/**
 * Reverses meals recorded beyond this week's earned days (Mon=1 … Fri=5).
 *
 * Extra CouponClaim rows are deleted and those coupons return to ALLOCATED
 * so they can be used on the correct later weekday. Reports then drop the extras.
 *
 * From /opt/meal-coupon/backend (or your backend folder):
 *   node scripts/repair-overclaimed-week.js          # dry run, prints what would change
 *   node scripts/repair-overclaimed-week.js --apply  # write the repair
 */
import prisma from '../src/config/db.js';

const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const APPLY = process.argv.includes('--apply');

function getAddisDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + ADDIS_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAddisWeekday(date = new Date()) {
  return new Date(date.getTime() + ADDIS_OFFSET_MS).getUTCDay();
}

function getDailyCap(date = new Date()) {
  const day = getAddisWeekday(date);
  const capMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
  return capMap[day] ?? 0;
}

function startOfWeek(date = new Date()) {
  const key = getAddisDayKey(date);
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

async function main() {
  const weekStart = startOfWeek(new Date());
  const claims = await prisma.couponClaim.findMany({
    where: { issuedAt: { gte: weekStart } },
    orderBy: { issuedAt: 'asc' },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      coupon: { select: { id: true, code: true, value: true } },
    },
  });

  const byEmployee = new Map();
  for (const claim of claims) {
    const list = byEmployee.get(claim.employeeId) || [];
    list.push(claim);
    byEmployee.set(claim.employeeId, list);
  }

  const extras = [];
  for (const [, list] of byEmployee) {
    let kept = 0;
    for (const claim of list) {
      const allowed = getDailyCap(claim.issuedAt);
      if (kept >= allowed) {
        extras.push(claim);
      } else {
        kept += 1;
      }
    }
  }

  const birr = extras.reduce((sum, claim) => sum + Number(claim.coupon?.value || 40), 0);
  console.log(
    `${APPLY ? 'APPLY' : 'DRY RUN'} · week start ${weekStart.toISOString()} · extra claims ${extras.length} · ${birr} birr`
  );

  if (extras.length === 0) {
    console.log('No over-claims this week.');
    return;
  }

  for (const claim of extras) {
    console.log(
      `- ${claim.employee?.name || claim.employeeId} ${claim.issuedAt.toISOString()} claim ${claim.id} coupon ${claim.coupon?.code}`
    );
  }

  if (!APPLY) {
    console.log('\nRe-run with --apply to restore those coupons to ALLOCATED and drop them from reports.');
    return;
  }

  for (const claim of extras) {
    await prisma.$transaction(async (tx) => {
      await tx.couponClaim.delete({ where: { id: claim.id } });
      await tx.coupon.update({
        where: { id: claim.couponId },
        data: {
          status: 'ALLOCATED',
          claimedById: null,
          claimedAt: null,
          claimedDateString: null,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'COUPON_OVERCLAIM_REPAIR',
          entityType: 'CouponClaim',
          entityId: claim.id,
          actorId: null,
          newState: {
            employeeId: claim.employeeId,
            couponId: claim.couponId,
            reason: 'Reversed future-day meals taken before weekday cap.',
          },
        },
      });
    });
  }

  console.log(`Restored ${extras.length} coupon(s). Reports will omit those rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
