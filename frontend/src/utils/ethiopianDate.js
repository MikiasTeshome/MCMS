const ETHIOPIAN_LOCALE = 'en-u-ca-ethiopic-nu-latn';
const DAY_MS = 24 * 60 * 60 * 1000;

const ethiopianPartsFormatter = new Intl.DateTimeFormat(ETHIOPIAN_LOCALE, {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const ethiopianShortFormatter = new Intl.DateTimeFormat(ETHIOPIAN_LOCALE, {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const GREGORIAN_LOCALE = 'en-u-ca-gregory-nu-latn';
const gregorianPartsFormatter = new Intl.DateTimeFormat(GREGORIAN_LOCALE, {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const gregorianShortFormatter = new Intl.DateTimeFormat(GREGORIAN_LOCALE, {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const ethiopianDateTimeFormatter = new Intl.DateTimeFormat(ETHIOPIAN_LOCALE, {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const gregorianDateTimeFormatter = new Intl.DateTimeFormat(GREGORIAN_LOCALE, {
  timeZone: 'Africa/Addis_Ababa',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toUtcMidday = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));

export const DATE_INPUT_FORMAT = 'DD/MM/YYYY';

export const dateFromIsoDay = (value) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return toUtcMidday(date);
};

export const toIsoDay = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return toUtcMidday(date).toISOString().slice(0, 10);
};

export const getEthiopianParts = (value) => {
  const date = normalizeDate(value);
  if (!date) return { year: 0, month: 0, day: 0 };

  const parts = ethiopianPartsFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  };
};

export const formatEthiopianDate = (value) => {
  const { year, month, day } = getEthiopianParts(value);
  if (!year || !month || !day) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

export const formatEthiopianShortDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return ethiopianShortFormatter.format(date).replace(/\s*ERA1$/, '');
};

export const formatEthiopianDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = formatEthiopianDate(startDate);
  const end = formatEthiopianDate(endDate);
  if (!start || !end) return '';
  return `${start} -> ${end}`;
};

export const formatGregorianDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';

  const parts = gregorianPartsFormatter.formatToParts(date);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  if (!year || !month || !day) return '';
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

export const formatGregorianShortDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return gregorianShortFormatter.format(date);
};

export const getGregorianParts = (value) => {
  const date = normalizeDate(value);
  if (!date) return { year: 0, month: 0, day: 0 };

  const parts = gregorianPartsFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  };
};

export const getGregorianDayKey = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';

  const { year, month, day } = getGregorianParts(date);
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
};

export const getCalendarParts = (calendarMode, value) =>
  calendarMode === 'gregorian' ? getGregorianParts(value) : getEthiopianParts(value);

/** Ethiopian leap years occur when year % 4 === 3; Pagume then has 6 days. */
export const isEthiopianLeapYear = (year) => Number(year) % 4 === 3;

export const getEthiopianMonthLength = (year, month) => {
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 30;
};

export const getGregorianMonthLength = (year, month) =>
  new Date(Date.UTC(year, month, 0, 12, 0, 0, 0)).getUTCDate();

export const getCalendarMonthLength = (calendarMode, year, month) =>
  calendarMode === 'gregorian'
    ? getGregorianMonthLength(year, month)
    : getEthiopianMonthLength(year, month);

export const calendarPartsToDate = (calendarMode, parts) => {
  if (!parts?.year || !parts?.month || !parts?.day) return null;
  if (calendarMode === 'gregorian') {
    return createGregorianMidday(parts.year, parts.month, parts.day);
  }
  return ethiopianToGregorianDate(parts);
};

export const shiftCalendarMonth = (calendarMode, parts, delta) => {
  const monthCount = calendarMode === 'gregorian' ? 12 : 13;
  const total = (parts.year || 1) * monthCount + (parts.month || 1) - 1 + delta;
  const year = Math.floor(total / monthCount);
  const month = ((((total % monthCount) + monthCount) % monthCount) + 1);
  const maxDay = getCalendarMonthLength(calendarMode, year, month);
  return { year, month, day: Math.min(parts.day || 1, maxDay) };
};

export const shiftUtcDays = (value, days) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return new Date(toUtcMidday(date).getTime() + days * DAY_MS);
};

export const getUtcDayDiff = (start, end) => {
  const from = normalizeDate(start);
  const to = normalizeDate(end);
  if (!from || !to) return null;
  return Math.round((toUtcMidday(to).getTime() - toUtcMidday(from).getTime()) / DAY_MS);
};

export const isWeekendDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return false;
  const weekday = toUtcMidday(date).getUTCDay();
  return weekday === 0 || weekday === 6;
};

export const buildHolidayKeySet = (holidays = []) => {
  const keys = new Set();
  holidays.forEach((holiday) => {
    const key = getGregorianDayKey(holiday?.date ?? holiday);
    if (key) keys.add(key);
  });
  return keys;
};

export const findHolidayForDate = (date, holidays = []) => {
  const key = getGregorianDayKey(date);
  if (!key) return null;
  return (
    holidays.find((holiday) => getGregorianDayKey(holiday?.date ?? holiday) === key) || null
  );
};

/** Counts working days in [start, end). Skips weekends and registered holidays. */
export const countWorkingDays = (start, end, holidayKeys = new Set()) => {
  const from = normalizeDate(start);
  const to = normalizeDate(end);
  if (!from || !to) return null;

  let cursor = toUtcMidday(from);
  const last = toUtcMidday(to);
  if (last <= cursor) return 0;

  const maxDays = 800;
  let count = 0;
  let steps = 0;
  while (cursor < last && steps < maxDays) {
    const weekend = isWeekendDate(cursor);
    const holiday = holidayKeys.has(getGregorianDayKey(cursor));
    if (!weekend && !holiday) count += 1;
    cursor = new Date(cursor.getTime() + DAY_MS);
    steps += 1;
  }
  return count;
};

export const getCalendarMonthGrid = (calendarMode, year, month) => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1) return [];

  const length = getCalendarMonthLength(calendarMode, year, month);
  if (!Number.isFinite(length) || length < 1 || length > 31) return [];

  const firstDate = calendarPartsToDate(calendarMode, { year, month, day: 1 });
  const startWeekday = firstDate && !Number.isNaN(firstDate.getTime()) ? firstDate.getUTCDay() : 0;
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= length; day += 1) {
    cells.push({
      day,
      date: firstDate ? new Date(firstDate.getTime() + (day - 1) * DAY_MS) : null,
    });
  }

  while (cells.length % 7 !== 0 && cells.length < 42) {
    cells.push(null);
  }

  return cells;
};

export const isSameCalendarDay = (a, b) => {
  if (!a || !b) return false;
  return getGregorianDayKey(a) === getGregorianDayKey(b);
};

export const isDateOnOrBefore = (date, limit) => {
  if (!date || !limit) return false;
  return getGregorianDayKey(date) <= getGregorianDayKey(limit);
};

export const isDateOnOrAfter = (date, limit) => {
  if (!date || !limit) return false;
  return getGregorianDayKey(date) >= getGregorianDayKey(limit);
};

const parseGregorianInput = (value) => {
  const normalized = String(value || '').trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }

  const dmyMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dmyMatch) return null;

  const day = Number(dmyMatch[1]);
  const month = Number(dmyMatch[2]);
  const year = Number(dmyMatch[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const createGregorianMidday = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

const parseEthiopianInput = (value) => {
  const normalized = String(value || '').trim().replace(/-/g, '/');
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!year || month < 1 || month > 13 || day < 1 || day > 30) {
    return null;
  }

  return { year, month, day };
};

const isGregorianLeapYear = (year) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export const ethiopianToGregorianDate = (ethiopianDate) => {
  const target =
    typeof ethiopianDate === 'string' ? parseEthiopianInput(ethiopianDate) : ethiopianDate;
  if (!target?.year || !target?.month || !target?.day) return null;

  const maxDay = getEthiopianMonthLength(target.year, target.month);
  if (target.month < 1 || target.month > 13 || target.day < 1 || target.day > maxDay) {
    return null;
  }

  // Meskerem 1 is 11 September, or 12 September in the Gregorian year before a leap year.
  const gregorianYear = target.year + 7;
  const newYearDay = isGregorianLeapYear(gregorianYear + 1) ? 12 : 11;
  const dayOfYear = (target.month - 1) * 30 + target.day;
  const candidate = createGregorianMidday(gregorianYear, 9, newYearDay + dayOfYear - 1);

  const parts = getEthiopianParts(candidate);
  if (parts.year === target.year && parts.month === target.month && parts.day === target.day) {
    return candidate;
  }

  for (let offset = -2; offset <= 2; offset += 1) {
    if (offset === 0) continue;
    const nearby = new Date(candidate.getTime() + offset * DAY_MS);
    const nearbyParts = getEthiopianParts(nearby);
    if (
      nearbyParts.year === target.year &&
      nearbyParts.month === target.month &&
      nearbyParts.day === target.day
    ) {
      return nearby;
    }
  }

  return candidate;
};

export const parseEthiopianDateString = (value) => ethiopianToGregorianDate(value);

export const parseGregorianDateString = (value) => parseGregorianInput(value);

export const formatCalendarDate = (calendarMode, value) =>
  calendarMode === 'gregorian' ? formatGregorianDate(value) : formatEthiopianDate(value);

export const formatCalendarShortDate = (calendarMode, value) =>
  calendarMode === 'gregorian' ? formatGregorianShortDate(value) : formatEthiopianShortDate(value);

export const formatCalendarDateTime = (calendarMode, value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return calendarMode === 'gregorian'
    ? gregorianDateTimeFormatter.format(date)
    : ethiopianDateTimeFormatter.format(date);
};

export const parseCalendarDateString = (calendarMode, value) =>
  calendarMode === 'gregorian' ? parseGregorianDateString(value) : parseEthiopianDateString(value);

export const formatCalendarDateRange = (calendarMode, startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = formatCalendarDate(calendarMode, startDate);
  const end = formatCalendarDate(calendarMode, endDate);
  if (!start || !end) return '';
  return `${start} -> ${end}`;
};

export const getEthiopianPresetRange = (presetKey, referenceDate = new Date()) => {
  const today = normalizeDate(referenceDate);
  if (!today) return { range: presetKey };

  const parts = getEthiopianParts(today);
  const currentGregorian = ethiopianToGregorianDate(parts) || today;
  const shiftDays = (date, days) => {
    const value = new Date(date.getTime());
    value.setUTCDate(value.getUTCDate() + days);
    return value;
  };

  const startOfWeek = (date) => {
    const value = new Date(date.getTime());
    const day = new Date(date.getTime() + 3 * 60 * 60 * 1000).getUTCDay();
    const daysSinceMonday = (day + 6) % 7;
    value.setUTCDate(value.getUTCDate() - daysSinceMonday);
    return value;
  };

  const monthStart = ethiopianToGregorianDate({ year: parts.year, month: parts.month, day: 1 }) || currentGregorian;
  const yearStart = ethiopianToGregorianDate({ year: parts.year, month: 1, day: 1 }) || currentGregorian;

  switch (presetKey) {
    case 'today':
      return { startDate: toIsoDay(currentGregorian), endDate: toIsoDay(currentGregorian) };
    case 'yesterday': {
      const yesterday = shiftDays(currentGregorian, -1);
      return { startDate: toIsoDay(yesterday), endDate: toIsoDay(yesterday) };
    }
    case 'thisWeek': {
      const weekStart = startOfWeek(currentGregorian);
      return { startDate: toIsoDay(weekStart), endDate: toIsoDay(currentGregorian) };
    }
    case 'lastWeek': {
      const weekStart = startOfWeek(currentGregorian);
      const lastWeekStart = shiftDays(weekStart, -7);
      const lastWeekEnd = shiftDays(weekStart, -1);
      return { startDate: toIsoDay(lastWeekStart), endDate: toIsoDay(lastWeekEnd) };
    }
    case 'thisMonth':
      return { startDate: toIsoDay(monthStart), endDate: toIsoDay(currentGregorian) };
    case 'lastMonth': {
      const previousMonth =
        parts.month === 1
          ? { year: parts.year - 1, month: 13, day: 1 }
          : { year: parts.year, month: parts.month - 1, day: 1 };
      const previousMonthStart = ethiopianToGregorianDate(previousMonth) || shiftDays(monthStart, -30);
      const previousMonthEnd = shiftDays(monthStart, -1);
      return {
        startDate: toIsoDay(previousMonthStart),
        endDate: toIsoDay(previousMonthEnd),
      };
    }
    case 'thisYear':
      return { startDate: toIsoDay(yearStart), endDate: toIsoDay(currentGregorian) };
    case 'lifetime':
      return { range: 'lifetime' };
    default:
      return { startDate: toIsoDay(monthStart), endDate: toIsoDay(currentGregorian) };
  }
};
