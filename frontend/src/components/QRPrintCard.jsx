import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Download, Loader } from 'lucide-react';
import { CR80_H, CR80_W, canvasToJpeg, renderIdCardCanvas } from '../utils/idCardCanvas.js';
const CR80_W_MM = `${CR80_W}mm`;
const CR80_H_MM = `${CR80_H}mm`;
const QR_SIZE = 172;
const A4_W = 297;
const A4_H = 210;
const A4_COLS = 5;
const A4_ROWS = 2;
const A4_GAP = 2.4;

const a4Layout = () => {
  const cols = A4_COLS;
  const rows = A4_ROWS;
  const gap = A4_GAP;
  const gridW = cols * CR80_W + (cols - 1) * gap;
  const gridH = rows * CR80_H + (rows - 1) * gap;
  return {
    cols,
    rows,
    gap,
    perPage: cols * rows,
    originX: (A4_W - gridW) / 2,
    originY: (A4_H - gridH) / 2,
  };
};

const cardStyles = {
  card: {
    width: CR80_W_MM,
    height: CR80_H_MM,
    boxSizing: 'border-box',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'Noto Sans Ethiopic', 'Inter', 'Nyala', 'Segoe UI', sans-serif",
    background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 54%, #ffffff 100%)',
    border: '1px solid #bfd3ee',
    boxShadow: '0 10px 28px rgba(0,61,122,0.18), 0 2px 6px rgba(0,91,172,0.12)',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },
  watermarkLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  securityGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: [
      'radial-gradient(circle at 50% 28%, rgba(0,119,212,0.075), transparent 34mm)',
      'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,91,172,0.022) 5px, rgba(0,91,172,0.022) 6px)',
      'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,91,172,0.022) 5px, rgba(0,91,172,0.022) 6px)',
    ].join(','),
  },
  watermarkImg: {
    position: 'absolute',
    bottom: '-6mm',
    right: '-5mm',
    width: '45mm',
    opacity: 0.045,
    filter: 'grayscale(1)',
    transform: 'rotate(-8deg)',
  },
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #003d7a 0%, #005BAC 40%, #0077d4 80%, #003d7a 100%)',
    zIndex: 10,
  },
  header: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 6px 7px 7px',
    minHeight: '13mm',
    borderBottom: '1px solid rgba(0,91,172,0.12)',
    background: 'linear-gradient(135deg, #f8fbff 0%, #eaf4ff 100%)',
    flexShrink: 0,
  },
  logoImg: {
    width: '26px',
    height: '26px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  headerDivider: {
    width: '1px',
    height: '24px',
    background: 'rgba(0,91,172,0.18)',
    flexShrink: 0,
  },
  headerTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    lineHeight: 1.2,
    overflow: 'hidden',
    minWidth: 0,
    flex: 1,
    paddingRight: '2px',
  },
  collegeName: {
    fontSize: '8px',
    fontWeight: 700,
    color: '#0a2540',
    letterSpacing: '0',
    textTransform: 'uppercase',
    lineHeight: 1.15,
    width: '100%',
    textAlign: 'center',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  collegeNameAm: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#005BAC',
    letterSpacing: '0',
    lineHeight: 1.2,
    width: '100%',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  body: {
    position: 'relative',
    zIndex: 5,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 0,
    overflow: 'hidden',
  },
  qrWrap: {
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    maxHeight: '50mm',
    width: '100%',
    padding: '3px 4px 1px',
  },
  qrInner: {
    padding: '2px',
    background: '#ffffff',
    border: '1px solid rgba(0,91,172,0.22)',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,61,122,0.14), inset 0 0 0 2px #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
  },
  info: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    justifyContent: 'center',
    textAlign: 'center',
    flexShrink: 0,
    position: 'relative',
    zIndex: 6,
    padding: '5px 7px 6px',
    background: 'linear-gradient(180deg, #f4f9ff 0%, #ffffff 100%)',
    borderTop: '1px solid rgba(0,91,172,0.10)',
  },
  fieldLabel: {
    fontSize: '6.4px',
    fontWeight: 700,
    color: '#6e87a7',
    textTransform: 'uppercase',
    letterSpacing: '0',
    lineHeight: 1.1,
  },
  nameValue: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#0a2540',
    lineHeight: 1.15,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    whiteSpace: 'normal',
  },
  idValue: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#005BAC',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
  },
  metaValue: {
    fontSize: '6.6px',
    fontWeight: 600,
    color: '#1e3a5f',
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 10px 4px',
    minHeight: '13px',
    flexShrink: 0,
    borderTop: '1px solid rgba(0,91,172,0.10)',
    background: 'linear-gradient(135deg, #003d7a 0%, #005BAC 52%, #0077d4 100%)',
  },
  footerTitle: {
    fontSize: '6.6px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0',
    textTransform: 'uppercase',
    lineHeight: 1,
  },
  footerShimmer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.50) 50%, rgba(255,255,255,0.12) 100%)',
  },
};

const describe = (emp) => ({
  name: emp?.name || 'N/A',
  id: emp?.employeeProfile?.employeeIdNumber || emp?.employeeIdNumber || 'N/A',
  department: emp?.employeeProfile?.department || emp?.department || 'N/A',
  position: emp?.employeeProfile?.position || emp?.position || 'N/A',
});

const IdCardFace = ({ employee, cardCode, collegeName, labels }) => {
  const info = describe(employee);
  return (
    <div data-print-card style={cardStyles.card}>
      <div style={cardStyles.watermarkLayer}>
        <div style={cardStyles.securityGrid} />
        <img src="/logo.png" alt="" style={cardStyles.watermarkImg} aria-hidden="true" />
      </div>
      <div style={cardStyles.topStrip} />
      <div style={cardStyles.header}>
        <img src="/logo.png" alt="TMPC Logo" style={cardStyles.logoImg} />
        <div style={cardStyles.headerDivider} />
        <div style={cardStyles.headerTextGroup}>
          <span style={cardStyles.collegeNameAm}>ተፈሪ መኮንን ፖሊቴክኒክ ኮሌጅ</span>
          <span style={cardStyles.collegeName}>{String(collegeName || '').toUpperCase()}</span>
        </div>
      </div>
      <div style={cardStyles.body}>
        <div style={cardStyles.qrWrap}>
          <div style={cardStyles.qrInner}>
            <QRCodeSVG
              value={cardCode || 'N/A'}
              size={QR_SIZE}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>
        <div style={cardStyles.info}>
          <div>
            <div style={cardStyles.fieldLabel}>{labels.employeeName}</div>
            <div style={cardStyles.nameValue}>{info.name}</div>
          </div>
          <div>
            <div style={cardStyles.fieldLabel}>{labels.idNumber}</div>
            <div style={cardStyles.idValue}>{info.id}</div>
          </div>
        </div>
      </div>
      <div style={cardStyles.footer}>
        <span style={cardStyles.footerTitle}>{String(labels.footer || '').toUpperCase()}</span>
        <div style={cardStyles.footerShimmer} />
      </div>
    </div>
  );
};

const QRPrintCard = ({ employee, cardCode, cards, onClose }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  const items =
    Array.isArray(cards) && cards.length > 0
      ? cards.map((card) => ({
          employee: card.employee,
          cardCode: card.cardCode,
        }))
      : [{ employee, cardCode }];

  const preview = items[0] || {};
  const isBulk = items.length > 1;
  const labels = {
    employeeName: t('qrCard.employeeName'),
    idNumber: t('qrCard.idNumber'),
    dept: t('qrCard.dept'),
    pos: t('qrCard.pos'),
    footer: t('qrCard.footer'),
  };
  const collegeName = t('qrCard.collegeName');

  const withBusy = async (mode, work) => {
    setError('');
    setBusy(mode);
    setProgress({ current: 0, total: items.length });
    try {
      await work();
    } catch (err) {
      setError(err.message || t('qrCard.exportFailed'));
    } finally {
      setBusy(null);
      setProgress({ current: 0, total: 0 });
    }
  };

  const collectJpegs = async () => {
    const images = [];
    for (let i = 0; i < items.length; i += 1) {
      setProgress({ current: i + 1, total: items.length });
      const canvas = await renderIdCardCanvas({
        info: describe(items[i].employee),
        cardCode: items[i].cardCode,
        labels,
        collegeName,
      });
      images.push(canvasToJpeg(canvas));
    }
    return images;
  };

  const openPrintWindow = (html) => {
    const win = window.open('', '_blank', isBulk ? 'width=1100,height=800' : 'width=420,height=640');
    if (!win) {
      throw new Error(t('qrCard.popupBlocked'));
    }
    win.document.write(html);
    win.document.close();
  };

  const handlePrint = () =>
    withBusy('print', async () => {
      const images = await collectJpegs();
      if (!isBulk) {
        openPrintWindow(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>TMPC ID Card — CR80</title>
<style>
  @page { size: ${CR80_W}mm ${CR80_H}mm; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { width: ${CR80_W}mm; height: ${CR80_H}mm; display: block; }
</style>
</head>
<body>
<img src="${images[0]}" width="${CR80_W}mm" height="${CR80_H}mm" />
<script>window.onload = function () { setTimeout(function () { window.print(); }, 400); };<\/script>
</body></html>`);
        return;
      }

      const { cols, gap, perPage, originX, originY } = a4Layout();
      const pages = [];
      for (let start = 0; start < images.length; start += perPage) {
        const slice = images.slice(start, start + perPage);
        const cards = slice
          .map((src, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = originX + col * (CR80_W + gap);
            const y = originY + row * (CR80_H + gap);
            return `<img src="${src}" style="position:absolute;left:${x}mm;top:${y}mm;width:${CR80_W}mm;height:${CR80_H}mm;" />`;
          })
          .join('');
        pages.push(`<div class="page">${cards}</div>`);
      }

      openPrintWindow(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>TMPC ID Cards — A4 landscape</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page {
    position: relative;
    width: ${A4_W}mm;
    height: ${A4_H}mm;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
</style>
</head>
<body>
${pages.join('\n')}
<script>window.onload = function () { setTimeout(function () { window.print(); }, 500); };<\/script>
</body></html>`);
    });

  const handleExportCr80 = () =>
    withBusy('cr80', async () => {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: [CR80_W, CR80_H], orientation: 'portrait' });
      const images = await collectJpegs();
      images.forEach((src, i) => {
        if (i > 0) pdf.addPage([CR80_W, CR80_H], 'portrait');
        pdf.addImage(src, 'JPEG', 0, 0, CR80_W, CR80_H);
      });
      pdf.save(isBulk ? 'TMPC-ID-cards-CR80.pdf' : `TMPC-ID-${describe(preview.employee).id}.pdf`);
    });

  const handleExportA4 = () =>
    withBusy('a4', async () => {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const { cols, gap, perPage, originX, originY } = a4Layout();
      const images = await collectJpegs();
      images.forEach((src, i) => {
        const slot = i % perPage;
        if (i > 0 && slot === 0) pdf.addPage('a4', 'landscape');
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        pdf.addImage(src, 'JPEG', originX + col * (CR80_W + gap), originY + row * (CR80_H + gap), CR80_W, CR80_H);
      });
      pdf.save(isBulk ? 'TMPC-ID-cards-A4-landscape.pdf' : `TMPC-ID-${describe(preview.employee).id}-A4.pdf`);
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-app-surface border border-app-border rounded-2xl shadow-2xl p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <h3 className="text-lg font-bold text-white">
            {t('qrCard.title')}
            {isBulk ? ` (${items.length})` : ''}
          </h3>
          <button
            onClick={onClose}
            className="text-app-secondary hover:text-app-primary hover:bg-app-surface-2/60 p-1.5 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isBulk && (
          <p className="text-sm text-app-muted">
            {t('qrCard.bulkHelp', { count: items.length })}
          </p>
        )}

        <div className="flex justify-center py-4 bg-app-surface-2/40 rounded-xl border border-app-border/50">
          <IdCardFace
            employee={preview.employee}
            cardCode={preview.cardCode}
            collegeName={collegeName}
            labels={labels}
          />
        </div>

        {isBulk && (
          <div className="rounded-xl border border-app-border max-h-28 overflow-y-auto px-3 py-2 text-xs text-app-secondary space-y-1">
            {items.map((item, index) => (
              <div key={`${item.cardCode}-${index}`}>
                {index + 1}. {describe(item.employee).name} · {describe(item.employee).id}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {busy && progress.total > 0 && (
          <p className="text-sm text-app-muted">
            {t('qrCard.exporting', { current: progress.current, total: progress.total })}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleExportA4}
            disabled={Boolean(busy)}
            className="btn-secondary justify-center"
          >
            {busy === 'a4' ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{t('qrCard.exportA4')}</span>
          </button>
          <button
            onClick={handleExportCr80}
            disabled={Boolean(busy)}
            className="btn-secondary justify-center"
          >
            {busy === 'cr80' ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{t('qrCard.exportCr80')}</span>
          </button>
          <button onClick={onClose} disabled={Boolean(busy)} className="btn-secondary justify-center">
            {t('common.close')}
          </button>
          <button
            onClick={handlePrint}
            disabled={Boolean(busy)}
            className="btn-primary justify-center"
          >
            <Printer className="w-4 h-4" />
            <span>{isBulk ? t('qrCard.printAll', { count: items.length }) : t('qrCard.print')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRPrintCard;
