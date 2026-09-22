import {
  AlignmentType,
  Document,
  Header,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

const AMHARIC_FONT = 'Nyala';
const LATIN_FONT = 'Calibri';

const am = (text, extras = {}) =>
  new TextRun({
    text,
    font: AMHARIC_FONT,
    size: extras.size || 22,
    bold: extras.bold || false,
    underline: extras.underline ? {} : undefined,
  });

const en = (text, extras = {}) =>
  new TextRun({
    text,
    font: LATIN_FONT,
    size: extras.size || 20,
    bold: extras.bold || false,
    italics: extras.italics || false,
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
    date,
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
        headers: {
          default: new Header({
            children: [
              p([am('ተፈሪ መኮንን ፖሊ ቴክኒክ ኮሌጅ', { size: 32, bold: true })], {
                alignment: AlignmentType.CENTER,
                after: 40,
              }),
              p([en('TAFARI MAKONNEN POLYTECHNIC COLLEGE', { size: 20, bold: true })], {
                alignment: AlignmentType.CENTER,
                after: 120,
              }),
            ],
          }),
        },
        children: [
          p(
            [
              am('የሰነድ ቁጥር/Document No: '),
              en('OF/DO/002'),
            ],
            { alignment: AlignmentType.RIGHT, after: 40 }
          ),
          p(
            [
              am('የማጣቀሻ ቁጥር/Ref no: '),
              en('____________________'),
            ],
            { alignment: AlignmentType.RIGHT, after: 40 }
          ),
          p(
            [am('ቀን/Date: '), en(date)],
            { alignment: AlignmentType.RIGHT, after: 360 }
          ),
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
          p([am('ከሰላምታ ጋር')], { after: 600 }),
          p([am('ፊርማ፡ ____________________')], { after: 80 }),
          p([am('ስም፡ ____________________')], { after: 80 }),
          p([am('ደረጃ፡ ____________________')], { after: 400 }),
          p(
            [
              en(
                'This Word file is generated from MCMS scan totals for the selected period and cafe. HR may edit names, reference numbers, and wording before sending it to Finance.',
                { size: 16, italics: true }
              ),
            ],
            { after: 0 }
          ),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
