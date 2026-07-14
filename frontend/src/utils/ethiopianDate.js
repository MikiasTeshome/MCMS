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
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
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
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
};

export const formatGregorianShortDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';
  return gregorianShortFormatter.format(date);
};

export const getGregorianDayKey = (value) => {
  const date = normalizeDate(value);
  if (!date) return '';

  const parts = gregorianPartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
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

  const mdyMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!mdyMatch) return null;

  const month = Number(mdyMatch[1]);
  const day = Number(mdyMatch[2]);
  const year = Number(mdyMatch[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
};

const createGregorianMidday = (year, month, day) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

const parseEthiopianInput = (value) => {
  const normalized = String(value || '').trim().replace(/-/g, '/');
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (!year || month < 1 || month > 13 || day < 1 || day > 30) {
    return null;
  }

  return { year, month, day };
};

export const ethiopianToGregorianDate = (ethiopianDate) => {
  const target =
    typeof ethiopianDate === 'string' ? parseEthiopianInput(ethiopianDate) : ethiopianDate;
  if (!target) return null;

  const approximateStart = createGregorianMidday(target.year + 7, 9, 11);
  const searchWindow = 400;

  for (let offset = -40; offset <= searchWindow; offset += 1) {
    const candidate = new Date(approximateStart.getTime() + offset * DAY_MS);
    const parts = getEthiopianParts(candidate);
    if (parts.year === target.year && parts.month === target.month && parts.day === target.day) {
      return candidate;
    }
  }

  return null;
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
