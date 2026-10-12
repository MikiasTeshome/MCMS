import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

const AMHARIC_FONT = 'Nyala';

const am = (text, extras = {}) =>
  new TextRun({
    text,
    font: AMHARIC_FONT,
    size: extras.size || 22,
    bold: extras.bold || false,
    underline: extras.underline ? {} : undefined,
  });

const p = (children, extras = {}) =>
  new Paragraph({
    spacing: { after: extras.after ?? 200, line: extras.line || 276 },
    alignment: extras.alignment || AlignmentType.LEFT,
    indent: extras.indent,
    children,
  });

export async function renderPaymentOrderDocx(vars) {
  const {
    start_date,
    end_date,
    total_days,
    total_scans,
    rate_per_coupon,
    total_amount,
    total_amount_words,
    cafe_name,
  } = vars;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: AMHARIC_FONT, size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 864 },
          },
        },
        children: [
          p([am('ለዲን ጽ/ቤት', { bold: true })]),
          p([am('አዲስ አበባ')], { after: 280 }),
          p([
            am('ጉዳዩ፡- ', { bold: true, underline: true }),
            am('የሰራተኞች የምሳ ትንኛ ኩፖን ክፍያ ይመለከታል።', { bold: true, underline: true }),
          ], { after: 280 }),
          p(
            [
              am(
                `የተፈሪ መኮንን ፖሊ ቴክኒክ ኮሌጅ ሰራተኞች በስራ ላይ ሳሉ የሚያገኙት የጠዋት ቁርስ እና የምሳ አገልግሎት ለአሁኑ በ ${rate_per_coupon} ብር መሠረት ከ${start_date} ዓ.ም እስከ ${end_date} ዓ.ም ባሉት ${total_days} ቀናት ውስጥ ከተፈረመ ሰነድ የተጠቃለለው ፊርማ ብዛት ${total_scans} ሲሆን ${rate_per_coupon} × ${total_scans} = ${total_amount} (${total_amount_words}) ስለሆነ ለ ${cafe_name} ክፍያ እንዲፈጸም እንጠይቃለን።`
              ),
            ],
            { alignment: AlignmentType.BOTH, after: 400 }
          ),
          p([am('ዘመን ተሻጋሪ')], { after: 0 }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
