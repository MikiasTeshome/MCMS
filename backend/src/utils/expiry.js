import prisma from '../config/db.js';

let holidayCache = { loadedAt: 0, dates: new Set() };
const HOLIDAY_CACHE_TTL_MS = 5 * 60 * 1000;

async function getHolidaySet() {
  const now = Date.now();
  if (holidayCache.loadedAt && now - holidayCache.loadedAt < HOLIDAY_CACHE_TTL_MS) {
    return holidayCache.dates;
  }

  const holidays = await prisma.holiday.findMany({
    select: { date: true },
  });
  holidayCache = {
    loadedAt: now,
    dates: new Set(
      holidays.map((holiday) => new Date(holiday.date).toISOString().slice(0, 10))
    ),
  };
  return holidayCache.dates;
}

/**
 * Calculate a future Date object that is `workingDays` business days after `startDate`.
 * It excludes Saturday, Sunday, and any dates present in the `Holiday` table.
 *
 * @param {Date} startDate - The starting point (usually allocation date).
 * @param {number} workingDays - Number of working days after which the coupon expires.
 * @returns {Date} - Expiration date set to 23:59:59 of the calculated day.
 */
export async function calculateExpiryDate(startDate, workingDays) {
  let remaining = workingDays;
  let current = new Date(startDate);
  // Ensure we start counting from the next day
  current.setUTCHours(0, 0, 0, 0);
  while (remaining > 0) {
    // Move one day forward
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay(); // 0=Sun,6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue; // skip weekends
    }
    const holidaySet = await getHolidaySet();
    if (holidaySet.has(current.toISOString().slice(0, 10))) {
      continue; // skip official holidays
    }
    remaining -= 1; // count as a working day
  }
  // Set expiry to end of day (23:59:59 UTC)
  current.setUTCHours(23, 59, 59, 999);
  return current;
}
