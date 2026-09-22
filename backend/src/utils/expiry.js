import prisma from '../config/db.js';

let holidayCache = { loadedAt: 0, dates: new Set() };
const HOLIDAY_CACHE_TTL_MS = 5 * 60 * 1000;
const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;

function addisDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + ADDIS_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addisWeekday(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + ADDIS_OFFSET_MS).getUTCDay();
}

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
    dates: new Set(holidays.map((holiday) => addisDayKey(holiday.date)).filter(Boolean)),
  };
  return holidayCache.dates;
}

/**
 * Calculate a future Date object that is `workingDays` business days after `startDate`.
 * It excludes Saturday, Sunday, and any dates present in the `Holiday` table.
 */
export async function calculateExpiryDate(startDate, workingDays) {
  let remaining = workingDays;
  let current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const holidaySet = await getHolidaySet();
  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = addisWeekday(current);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    if (holidaySet.has(addisDayKey(current))) {
      continue;
    }
    remaining -= 1;
  }
  current.setUTCHours(23, 59, 59, 999);
  return current;
}
