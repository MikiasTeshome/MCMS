import { birrToAmharicWords, formatGroupedInt, formatMoney } from '../utils/amharicAmountWords.js';
import { buildPaymentOrderDocxBytes, downloadDocx } from '../utils/paymentOrderDocx.js';
import { getEthiopianParts, getGregorianParts } from '../utils/ethiopianDate.js';

const pad = (n) => String(n).padStart(2, '0');
const ETHIOPIA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const ethiopiaDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() + ETHIOPIA_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
};

/** Monday–Friday in Africa/Addis_Ababa, inclusive. Does not change meal counts. */
export const countEthiopiaWeekdays = (start, end) => {
  const from = start instanceof Date ? start : new Date(start);
  const to = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return 0;
  const endKey = ethiopiaDayKey(to);
  if (!endKey) return 0;
  let cursor = new Date(from.getTime());
  let weekdays = 0;
  let guard = 0;
  while (guard < 800) {
    const key = ethiopiaDayKey(cursor);
    if (!key || key > endKey) break;
    const weekday = new Date(cursor.getTime() + ETHIOPIA_OFFSET_MS).getUTCDay();
    if (weekday >= 1 && weekday <= 5) weekdays += 1;
    cursor = new Date(cursor.getTime() + DAY_MS);
    guard += 1;
  }
  return weekdays;
};

export const formatPaymentLetterDate = (calendarMode, value) => {
  if (calendarMode === 'gregorian') {
    const { year, month, day } = getGregorianParts(value);
    if (!year || !month || !day) return '';
    return `${pad(day)}/${pad(month)}/${year}`;
  }
  const { year, month, day } = getEthiopianParts(value);
  if (!year || !month || !day) return '';
  return `${pad(day)}/${pad(month)}/${year}`;
};

export const downloadPaymentOrderFromReport = async ({
  report,
  row,
  calendarMode,
}) => {
  if (row?.count == null) {
    throw new Error('Select the cafe this letter is paying.');
  }
  const start = report?.selectedRange?.startDate;
  const end = report?.selectedRange?.endDate;
  const days = countEthiopiaWeekdays(start, end);
  const count = Number(row.count || 0);
  const amount = Number(row.amount || 0);
  const rate = report?.metrics?.rate ?? 40;
  if (Math.abs(count * rate - amount) > 0.009) {
    throw new Error(
      'This cafe total is not 40 birr times the number of meals. Do not pay from this letter. Recheck Reports.'
    );
  }
  const payable = count * rate;
  const cafeName = row.vendorName || '____________________';
  const vars = {
    date: formatPaymentLetterDate(calendarMode, new Date()),
    start_date: formatPaymentLetterDate(calendarMode, start),
    end_date: formatPaymentLetterDate(calendarMode, end),
    total_days: String(days),
    total_scans: formatGroupedInt(count),
    rate_per_coupon: formatMoney(rate),
    total_amount: formatMoney(payable),
    total_amount_words: birrToAmharicWords(payable),
    cafe_name: cafeName,
  };
  const bytes = buildPaymentOrderDocxBytes(vars);
  const slug = (value) =>
    String(value || '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
  const filename = `payment-order-${slug(row.vendorName) || 'vendor'}-${slug(row.campusName) || 'campus'}-${String(vars.start_date).replace(/\//g, '-')}-${String(vars.end_date).replace(/\//g, '-')}.docx`;
  await downloadDocx(bytes, filename);
};
