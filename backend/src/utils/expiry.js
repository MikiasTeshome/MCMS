import prisma from '../config/db.js';

let holidayCache = { loadedAt: 0, dates: new Set() };
const HOLIDAY_CACHE_TTL_MS = 5 * 60 * 1000;
const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function addisDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + ADDIS_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToKey(key, days) {
  const [year, month, day] = String(key).split('-').map(Number);
  if (!year || !month || !day) return '';
  const next = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addisWeekdayFromKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  if (!year || !month || !day) return 0;
  return new Date(Date.UTC(year, month - 1, day, 9, 0, 0, 0)).getUTCDay();
}

export function clearHolidayCache() {
  holidayCache = { loadedAt: 0, dates: new Set() };
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
 * Calculate a future Date that is `workingDays` business days after `startDate`
 * in Africa/Addis_Ababa (skips Sat/Sun and Holiday rows). Expires at Addis EOD.
 */
export async function calculateExpiryDate(startDate, workingDays) {
  let remaining = workingDays;
  let currentKey = addisDayKey(startDate);
  if (!currentKey) {
    currentKey = addisDayKey(new Date());
  }
  const holidaySet = await getHolidaySet();
  while (remaining > 0) {
    currentKey = addDaysToKey(currentKey, 1);
    const dayOfWeek = addisWeekdayFromKey(currentKey);
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    if (holidaySet.has(currentKey)) {
      continue;
    }
    remaining -= 1;
  }
  const [year, month, day] = currentKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 20, 59, 59, 999));
}
