import QRCode from 'qrcode';

export const CR80_W = 53.98;
export const CR80_H = 85.6;

const PX_PER_MM = 12;
const COLLEGE_AM = 'ተፈሪ መኮንን ፖሊቴክኒክ ኮሌጅ';
const FONT = 'Inter, Segoe UI, Noto Sans Ethiopic, Nyala, sans-serif';

const loadImage = (src) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

let logoPromise;

const getLogo = () => {
  if (!logoPromise) {
    logoPromise = loadImage(`${window.location.origin}/logo.png`);
  }
  return logoPromise;
};

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const fitSize = (ctx, text, weight, start, min, maxWidth) => {
  let size = start;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 0.4;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
};

const wrapLines = (ctx, text, maxWidth, maxLines = 2) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        const rest = [current, ...words.slice(i + 1)].join(' ');
        lines.push(rest);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines;
};

const drawCentered = (ctx, text, x, y, weight, size, color) => {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
};

export async function renderIdCardCanvas({ info, cardCode, labels, collegeName }) {
  const w = Math.round(CR80_W * PX_PER_MM);
  const h = Math.round(CR80_H * PX_PER_MM);
  const mm = (value) => value * PX_PER_MM;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const cx = w / 2;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, w, h, mm(2.4));
  ctx.fill();
  ctx.save();
  roundRect(ctx, 0, 0, w, h, mm(2.4));
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.54, '#f7fbff');
  bg.addColorStop(1, '#ffffff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#bfd3ee';
  ctx.lineWidth = Math.max(1, mm(0.26));
  roundRect(ctx, ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, mm(2.3));
  ctx.stroke();

  const headerH = mm(13.2);
  const headerGrad = ctx.createLinearGradient(0, 0, w, headerH);
  headerGrad.addColorStop(0, '#f8fbff');
  headerGrad.addColorStop(1, '#eaf4ff');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, w, headerH);

  const strip = ctx.createLinearGradient(0, 0, w, 0);
  strip.addColorStop(0, '#003d7a');
  strip.addColorStop(0.4, '#005BAC');
  strip.addColorStop(0.8, '#0077d4');
  strip.addColorStop(1, '#003d7a');
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, w, mm(1.1));

  ctx.strokeStyle = 'rgba(0,91,172,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.lineTo(w, headerH);
  ctx.stroke();

  const logo = await getLogo();
  const logoSize = mm(7);
  const logoX = mm(2.2);
  const logoY = (headerH - logoSize) / 2 + mm(0.4);
  if (logo) {
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
  }

  ctx.fillStyle = 'rgba(0,91,172,0.18)';
  ctx.fillRect(logoX + logoSize + mm(1.4), mm(3.2), 1, mm(7));

  const textLeft = logoX + logoSize + mm(2.6);
  const textWidth = w - textLeft - mm(1.6);
  const textCx = textLeft + textWidth / 2;
  const english = String(collegeName || '').toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const amSize = fitSize(ctx, COLLEGE_AM, '800', mm(3.65), mm(2.5), textWidth);
  const enSize = mm(2.55);
  ctx.font = `700 ${enSize}px ${FONT}`;
  const enLines = wrapLines(ctx, english, textWidth, 2).map((line) => ({
    text: line,
    size: fitSize(ctx, line, '700', enSize, mm(1.9), textWidth),
  }));
  const lineGap = mm(0.45);
  const blockH = amSize + enLines.reduce((sum, line) => sum + line.size, 0) + lineGap * enLines.length;
  let y = (headerH - blockH) / 2 + amSize + mm(0.45);
  ctx.font = `800 ${amSize}px ${FONT}`;
  ctx.fillStyle = '#005BAC';
  ctx.fillText(COLLEGE_AM, textCx, y);
  y += lineGap + (enLines[0]?.size || enSize);
  enLines.forEach((line, index) => {
    ctx.font = `700 ${line.size}px ${FONT}`;
    ctx.fillStyle = '#0a2540';
    ctx.fillText(line.text, textCx, y);
    if (index < enLines.length - 1) y += line.size + lineGap;
  });

  const footerH = mm(6.2);
  const footerY = h - footerH;
  const infoH = mm(16.5);
  const infoY = footerY - infoH;
  const qrTop = headerH + mm(1);
  const qrBottom = infoY - mm(0.6);
  const qrBox = Math.min(mm(42), qrBottom - qrTop - mm(1), w - mm(6));
  const qrX = (w - qrBox) / 2;
  const qrY = qrTop + (qrBottom - qrTop - qrBox) / 2;

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, qrX - mm(0.8), qrY - mm(0.8), qrBox + mm(1.6), qrBox + mm(1.6), mm(1.6));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,91,172,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const qrUrl = await QRCode.toDataURL(cardCode || 'N/A', {
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  const qrImg = await loadImage(qrUrl);
  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, qrBox, qrBox);
  }

  ctx.fillStyle = '#f4f9ff';
  ctx.fillRect(0, infoY, w, infoH);
  ctx.strokeStyle = 'rgba(0,91,172,0.10)';
  ctx.beginPath();
  ctx.moveTo(0, infoY);
  ctx.lineTo(w, infoY);
  ctx.stroke();

  const nameMax = w - mm(6);
  ctx.font = `800 ${mm(3.05)}px ${FONT}`;
  const nameLines = wrapLines(ctx, String(info.name || ''), nameMax, 2);
  const idText = String(info.id || '');
  const labelSize = mm(1.7);
  const infoBottom = infoY + infoH;

  drawCentered(ctx, String(labels.employeeName || '').toUpperCase(), cx, infoY + mm(2.35), '700', labelSize, '#6e87a7');
  let nameY = infoY + mm(4.9);
  nameLines.forEach((line) => {
    const size = fitSize(ctx, line, '800', mm(3.05), mm(2.0), nameMax);
    drawCentered(ctx, line, cx, nameY, '800', size, '#0a2540');
    nameY += size + mm(0.4);
  });
  const idLabelY = Math.min(nameY + mm(1.05), infoBottom - mm(5.8));
  drawCentered(ctx, String(labels.idNumber || '').toUpperCase(), cx, idLabelY, '700', labelSize, '#6e87a7');
  const idSize = fitSize(ctx, idText, '700', mm(2.95), mm(2.0), nameMax);
  drawCentered(ctx, idText, cx, Math.min(idLabelY + mm(2.7), infoBottom - mm(2.2)), '700', idSize, '#005BAC');

  const footGrad = ctx.createLinearGradient(0, footerY, w, h);
  footGrad.addColorStop(0, '#003d7a');
  footGrad.addColorStop(0.52, '#005BAC');
  footGrad.addColorStop(1, '#0077d4');
  ctx.fillStyle = footGrad;
  ctx.fillRect(0, footerY, w, footerH);
  const footerText = String(labels.footer || '').toUpperCase();
  const footerSize = fitSize(ctx, footerText, '700', mm(1.95), mm(1.4), w - mm(6));
  drawCentered(ctx, footerText, cx, footerY + footerH * 0.62, '700', footerSize, '#ffffff');

  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.translate(w - mm(8), h - mm(18));
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.drawImage(logo, 0, 0, mm(28), mm(28));
    ctx.restore();
  }

  ctx.restore();
  return canvas;
}

export function canvasToJpeg(canvas, quality = 0.93) {
  return canvas.toDataURL('image/jpeg', quality);
}
