const ONES = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
const TENS = ['', 'አስር', 'ሃያ', 'ሰላሳ', 'አርባ', 'ሃምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠና'];

const belowHundred = (n) => {
  if (n <= 0) return '';
  if (n < 10) return ONES[n];
  if (n === 10) return 'አስር';
  if (n < 20) return `አስራ ${ONES[n % 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
};

const belowThousand = (n) => {
  if (n <= 0) return '';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) {
    parts.push(hundreds === 1 ? 'አንድ መቶ' : `${ONES[hundreds]} መቶ`);
  }
  if (rest) parts.push(belowHundred(rest));
  return parts.join(' ');
};

const integerToAmharic = (n) => {
  if (n === 0) return 'ዜሮ';
  const scales = [
    { value: 1_000_000_000, word: 'ቢሊዮን' },
    { value: 1_000_000, word: 'ሚሊዮን' },
    { value: 1_000, word: 'ሺህ' },
  ];
  const parts = [];
  let remaining = n;
  for (const scale of scales) {
    if (remaining >= scale.value) {
      const qty = Math.floor(remaining / scale.value);
      remaining %= scale.value;
      parts.push(`${belowThousand(qty)} ${scale.word}`);
    }
  }
  if (remaining) parts.push(belowThousand(remaining));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

export const birrToAmharicWords = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric < 0) return '';
  const rounded = Math.round(numeric * 100) / 100;
  const birr = Math.floor(rounded);
  const cents = Math.round((rounded - birr) * 100);
  const birrWords = integerToAmharic(birr);
  if (cents > 0) {
    return `${birrWords} ብር ከ ${integerToAmharic(cents)} ሳንቲም`;
  }
  return `${birrWords} ብር`;
};

export const formatGroupedInt = (value) =>
  Math.round(Number(value) || 0).toLocaleString('en-US');

export const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
