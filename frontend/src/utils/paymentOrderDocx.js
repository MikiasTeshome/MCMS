const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const u16 = (value) => {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
};

const u32 = (value) => {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
};

const concat = (parts) => {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

/** Uncompressed ZIP (ZIP64 not needed). */
export const zipFiles = (files) => {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return concat([...locals, centralDir, eocd]);
};

const xmlEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paragraph = (text, { align = 'left', bold = false, size = 22, after = 200 } = {}) => {
  const jc = align === 'left' ? '' : `<w:jc w:val="${align}"/>`;
  const boldXml = bold ? '<w:b/><w:bCs/>' : '';
  return `<w:p>
    <w:pPr>${jc}<w:spacing w:after="${after}"/><w:rPr><w:rFonts w:ascii="Nyala" w:hAnsi="Nyala" w:cs="Nyala" w:eastAsia="Nyala"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${boldXml}</w:rPr></w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Nyala" w:hAnsi="Nyala" w:cs="Nyala" w:eastAsia="Nyala"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${boldXml}</w:rPr>
      <w:t xml:space="preserve">${xmlEscape(text)}</w:t>
    </w:r>
  </w:p>`;
};

export const buildPaymentOrderDocxBytes = (vars) => {
  const body = [
    paragraph('ተፈሪ መኮንን ፖሊ ቴክኒክ ኮሌጅ', { align: 'center', bold: true, size: 32, after: 40 }),
    paragraph('TAFARI MAKONNEN POLYTECHNIC COLLEGE', { align: 'center', bold: true, size: 20, after: 200 }),
    paragraph(`የሰነድ ቁጥር/Document No: OF/DO/002`, { align: 'right', after: 40 }),
    paragraph('የማጣቀሻ ቁጥር/Ref no: ____________________', { align: 'right', after: 40 }),
    paragraph(`ቀን/Date: ${vars.date}`, { align: 'right', after: 360 }),
    paragraph('ለፋይናንስ ዳይሬክቶሬት', { bold: true, after: 80 }),
    paragraph('አዲስ አበባ', { after: 280 }),
    paragraph('ጉዳዩ፡- የሰራተኞች የምሳ ትንኛ ኩፖን ክፍያ ይመለከታል።', { bold: true, after: 280 }),
    paragraph(
      `የተፈሪ መኮንን ፖሊ ቴክኒክ ኮሌጅ ሰራተኞች በስራ ላይ ሳሉ የሚያገኙት የጠዋት ቁርስ እና የምሳ አገልግሎት ለአሁኑ በ ${vars.rate_per_coupon} ብር መሠረት ከ${vars.start_date} ዓ.ም እስከ ${vars.end_date} ዓ.ም ባሉት ${vars.total_days} ቀናት ውስጥ ከተፈረመ ሰነድ የተጠቃለለው ፊርማ ብዛት ${vars.total_scans} ሲሆን ${vars.rate_per_coupon} × ${vars.total_scans} = ${vars.total_amount} (${vars.total_amount_words}) ስለሆነ ለ ${vars.cafe_name} ክፍያ እንዲፈጸም እንጠይቃለን።`,
      { align: 'both', after: 400 }
    ),
    paragraph('ከሰላምታ ጋር', { after: 600 }),
    paragraph('ፊርማ፡ ____________________', { after: 80 }),
    paragraph('ስም፡ ____________________', { after: 80 }),
    paragraph('ደረጃ፡ ____________________', { after: 400 }),
    paragraph(
      'This Word file is generated from MCMS scan totals for the selected period and cafe. HR may edit names, reference numbers, and wording before sending it to Finance.',
      { size: 16, after: 0 }
    ),
  ].join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="864"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return zipFiles([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: documentXml },
  ]);
};

export const downloadDocx = (bytes, filename = 'payment-order.docx') =>
  new Promise((resolve, reject) => {
    try {
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
        resolve();
      }, 1500);
    } catch (error) {
      reject(error);
    }
  });
