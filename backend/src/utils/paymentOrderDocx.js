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
    total_scans_words,
    rate_int,
    rate_words,
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
          p([am('ለዲን', { bold: true })]),
          p([am('አዲስ አበባ')], { after: 280 }),
          p([
            am('ጉዳዩ፡- ', { bold: true, underline: true }),
            am('የካፍቴርያ ኩፖን ተጠቃሚ ሠራተኞችን ስለማሳወቅ፤', { bold: true, underline: true }),
          ], { after: 280 }),
          p(
            [
              am(
                `ከላይ በርዕሱ እንደተጠቀሰው የኮሌጁ ሠራተኞች በሥራ ቀናት ለሻይ ቡና የተፈቀደውን ${rate_int} ብር /${rate_words}/ ኩፖን በኮሌጁ ካፌ ሲጠቀሙ መቆየታቸው ይታወቃል፡፡`
              ),
            ],
            { alignment: AlignmentType.BOTH, after: 200 }
          ),
          p(
            [
              am(
                `በዚሁ መሠረት በቀን ${rate_int} ብር ከ${start_date} ዓ.ም እስከ ${end_date} ዓ.ም ባሉት ${total_days} የስራ ቀናት የተጠቀሙት እስካን የተደረገው ኩፖን ብዛት ${total_scans} /${total_scans_words}/ ሲሆን ${rate_int}X${total_scans} =${total_amount} (${total_amount_words}) ሲስተሙ አስልቶ ባስቀመጠው መሰረት ለ ${cafe_name} ክፍያ ለመፈፀም ይረዳ ዘንድ የተጠቃሚዎችን መረጃ     ገፅ ከዚህ ሸኚ ደብዳቤ ጋር አባሪ አያይዘን የላክን መሆኑን እንገልጻለን፡፡`
              ),
            ],
            { alignment: AlignmentType.BOTH, after: 400 }
          ),
          p([am('ዘመን ተሻጋሪ!')], { after: 400 }),
          p([am('ግልባጭ')], { after: 80 }),
          p([am('ለሰው ሀብት አስ/ዳይሬክተር')], { after: 80 }),
          p([am(`ለ ${cafe_name}`)], { after: 80 }),
          p([am('አዲስ አበባ')], { after: 0 }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
