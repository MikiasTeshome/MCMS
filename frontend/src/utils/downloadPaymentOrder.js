import { birrToAmharicWords, formatGroupedInt, formatMoney } from '../utils/amharicAmountWords.js';
import { buildPaymentOrderDocxBytes, downloadDocx } from '../utils/paymentOrderDocx.js';
import { getEthiopianParts, getGregorianParts } from '../utils/ethiopianDate.js';

const pad = (n) => String(n).padStart(2, '0');

export const formatPaymentLetterDate = (calendarMode, value) => {
  if (calendarMode === 'gregorian') {
    const { year, month, day } = getGregorianParts(value);
    if (!year || !month || !day) return '';
    return `${pad(day)}/${pad(month)}/${year}`;
  }
  const { year, month, day } = getEthiopianParts(value);
  if (!year || !month || !day) return '';
  return `${pad(day)}/${pad(month)}/${String(year).slice(-2)}`;
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
  const days = report?.chartSeries?.length || 0;
  const count = Number(row.count || 0);
  const amount = Number(row.amount || 0);
  const rate = report?.metrics?.rate ?? 40;
  const cafeName =
    [row.vendorName, row.campusName].filter(Boolean).join(' — ') || '____________________';
  const vars = {
    date: formatPaymentLetterDate(calendarMode, new Date()),
    start_date: formatPaymentLetterDate(calendarMode, start),
    end_date: formatPaymentLetterDate(calendarMode, end),
    total_days: String(days),
    total_scans: formatGroupedInt(count),
    rate_per_coupon: formatMoney(rate),
    total_amount: formatMoney(amount),
    total_amount_words: birrToAmharicWords(amount),
    cafe_name: cafeName,
  };
  const bytes = buildPaymentOrderDocxBytes(vars);
  await downloadDocx(bytes, 'payment-order.docx');
};
