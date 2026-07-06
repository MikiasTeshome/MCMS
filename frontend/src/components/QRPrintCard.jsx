import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';

/* ─────────────────────────────────────────────────────
   Inline styles scoped exclusively to the ID card.
   Tailwind is kept only for the modal shell & buttons.
───────────────────────────────────────────────────── */
const cardStyles = {
  /* ── Outer card shell ── */
  card: {
    width: '85.6mm',
    height: '53.98mm',
    boxSizing: 'border-box',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'Inter', 'Manrope', 'Segoe UI', system-ui, sans-serif",
    background: '#ffffff',
    border: '1px solid #c8daf4',
    boxShadow: '0 4px 24px rgba(0,91,172,0.12), 0 1px 4px rgba(0,91,172,0.07)',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },

  /* ── Watermark / security overlay ── */
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
      'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,91,172,0.024) 5px, rgba(0,91,172,0.024) 6px)',
      'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,91,172,0.024) 5px, rgba(0,91,172,0.024) 6px)',
    ].join(','),
  },
  watermarkImg: {
    position: 'absolute',
    bottom: '-6mm',
    right: '-4mm',
    width: '42mm',
    opacity: 0.055,
    filter: 'grayscale(1)',
    transform: 'rotate(-8deg)',
  },

  /* ── Top gradient accent strip ── */
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #003d7a 0%, #005BAC 40%, #0077d4 80%, #003d7a 100%)',
    zIndex: 10,
  },

  /* ── HEADER ── */
  header: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px 7px 12px',
    borderBottom: '1px solid rgba(0,91,172,0.12)',
    background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f3ff 100%)',
  },
  /* Plain logo — no circular clip, 18% larger */
  logoImg: {
    width: '40px',
    height: '40px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  headerDivider: {
    width: '1px',
    height: '30px',
    background: 'rgba(0,91,172,0.18)',
    flexShrink: 0,
  },
  headerTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.25,
    overflow: 'hidden',
  },
  collegeName: {
    fontSize: '7.8px',
    fontWeight: 800,
    color: '#0a2540',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  collegeNameAm: {
    fontSize: '8.5px',
    fontWeight: 700,
    color: '#005BAC',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  },

  /* ── BODY ── */
  body: {
    position: 'relative',
    zIndex: 5,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 12px',
  },

  /* QR column */
  qrWrap: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: {
    padding: '5px',
    background: '#ffffff',
    border: '1px solid rgba(0,91,172,0.18)',
    borderRadius: '8px',
    boxShadow: '0 1px 6px rgba(0,91,172,0.09)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Vertical separator */
  bodySep: {
    width: '1px',
    alignSelf: 'stretch',
    background: 'linear-gradient(to bottom, transparent, rgba(0,91,172,0.14) 20%, rgba(0,91,172,0.14) 80%, transparent)',
    flexShrink: 0,
    margin: '4px 0',
  },

  /* Info column — gap increased for breathing room */
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: '6px',
    fontWeight: 600,
    color: '#5e7fa8',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    lineHeight: 1,
    marginBottom: '1px',
    paddingLeft: 0,
  },
  nameValue: {
    fontSize: '10.5px',
    fontWeight: 800,
    color: '#0a2540',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  idValue: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#005BAC',
    lineHeight: 1,
    letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums',
  },
  /* Plain text — same look as name/id, no pill */
  metaValue: {
    fontSize: '8.5px',
    fontWeight: 600,
    color: '#1e3a5f',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  /* ── FOOTER — 10% shorter padding ── */
  footer: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 12px 4px 12px',
    borderTop: '1px solid rgba(0,91,172,0.10)',
    background: 'linear-gradient(135deg, #004f99 0%, #0077d4 100%)',
  },
  footerTitle: {
    fontSize: '6.5px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.10em',
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

/* ─────────────────────────────────────────────────── */

const QRPrintCard = ({ employee, cardCode, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef(null);

  const employeeName =
    employee?.name || 'N/A';
  const employeeId =
    employee?.employeeProfile?.employeeIdNumber ||
    employee?.employeeIdNumber ||
    'N/A';
  const department =
    employee?.employeeProfile?.department ||
    employee?.department ||
    'N/A';
  const position =
    employee?.employeeProfile?.position ||
    employee?.position ||
    'N/A';

  const handlePrint = () => {
    /* Grab the rendered QR SVG so it prints pixel-perfectly */
    const qrSvgEl = printRef.current?.querySelector('svg');
    const qrSvgHTML = qrSvgEl ? qrSvgEl.outerHTML : '';

    /*
      CR80 universal ID card:  85.60 mm × 53.98 mm  =  3.375 in × 2.125 in
      At 96 dpi screen:        323 px  ×  204 px
      We set BOTH mm and px sizes so browsers that honour @page use mm,
      and those that don't still render the correct pixel box.
      A centred transform-origin ensures it sits perfectly on any paper.
    */
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>TMPC ID Card — CR80</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

  /* ── Page setup: CR80 exactly ── */
  @page {
    size: 85.60mm 53.98mm;
    margin: 0mm;
  }

  * {
    box-sizing: border-box;
    margin: 0; padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html, body {
    width: 85.60mm;
    height: 53.98mm;
    overflow: hidden;
    background: #fff;
    font-family: 'Inter', 'Segoe UI', sans-serif;
  }

  /*
    .card is sized in BOTH mm (for @page-aware renderers) and px
    (as a fallback). The transform centres it on larger paper
    if the OS ignores @page size.
  */
  .card {
    width: 85.60mm;   /* 3.375 in */
    height: 53.98mm;  /* 2.125 in */
    position: relative;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    overflow: hidden;
  }

  /* ── Security grid ── */
  .grid-bg {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,91,172,.024) 5px, rgba(0,91,172,.024) 6px),
      repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,91,172,.024) 5px, rgba(0,91,172,.024) 6px);
  }

  /* ── Watermark ── */
  .watermark {
    position: absolute; bottom: -6mm; right: -4mm;
    width: 42mm; opacity: .055; filter: grayscale(1);
    transform: rotate(-8deg); z-index: 0; pointer-events: none;
  }

  /* ── Top accent strip ── */
  .top-strip {
    position: absolute; top: 0; left: 0; right: 0; height: 4px; z-index: 10;
    background: linear-gradient(90deg, #003d7a 0%, #005BAC 40%, #0077d4 80%, #003d7a 100%);
  }

  /* ── Header ── */
  .header {
    position: relative; z-index: 5;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px 7px 12px;
    border-bottom: 1px solid rgba(0,91,172,.12);
    background: linear-gradient(135deg, #f0f7ff 0%, #e8f3ff 100%);
  }
  .logo  { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; }
  .hdiv  { width: 1px; height: 30px; background: rgba(0,91,172,.18); flex-shrink: 0; }
  .college-en {
    font-size: 7.8px; font-weight: 800; color: #0a2540;
    letter-spacing: .03em; text-transform: uppercase; white-space: nowrap;
  }
  .college-am {
    font-size: 8.5px; font-weight: 700; color: #005BAC;
    letter-spacing: .01em; white-space: nowrap;
  }

  /* ── Body ── */
  .body {
    position: relative; z-index: 5; flex: 1;
    display: flex; align-items: center; gap: 10px; padding: 6px 12px;
  }
  .qr-box {
    flex-shrink: 0; padding: 5px; background: #fff;
    border: 1px solid rgba(0,91,172,.18); border-radius: 8px;
    box-shadow: 0 1px 6px rgba(0,91,172,.09);
    display: flex; align-items: center; justify-content: center;
  }
  .vsep {
    width: 1px; align-self: stretch; margin: 4px 0; flex-shrink: 0;
    background: linear-gradient(to bottom, transparent, rgba(0,91,172,.14) 20%, rgba(0,91,172,.14) 80%, transparent);
  }
  .info {
    flex: 1; display: flex; flex-direction: column; gap: 8px;
    overflow: hidden; justify-content: center;
  }
  .lbl {
    font-size: 6px; font-weight: 600; color: #5e7fa8;
    text-transform: uppercase; letter-spacing: .07em; line-height: 1; margin-bottom: 1px;
  }
  .val-name {
    font-size: 10.5px; font-weight: 800; color: #0a2540; line-height: 1.2;
    letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .val-id {
    font-size: 9px; font-weight: 700; color: #005BAC;
    line-height: 1; letter-spacing: .04em;
  }
  .val-meta {
    font-size: 8.5px; font-weight: 600; color: #1e3a5f; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── Footer ── */
  .footer {
    position: relative; z-index: 5;
    display: flex; align-items: center; justify-content: center;
    padding: 3px 12px 4px 12px;
    border-top: 1px solid rgba(0,91,172,.10);
    background: linear-gradient(135deg, #004f99 0%, #0077d4 100%);
  }
  .footer-title {
    font-size: 6.5px; font-weight: 700; color: #fff;
    letter-spacing: .10em; text-transform: uppercase;
  }
  .shimmer {
    position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.50) 50%, rgba(255,255,255,.12) 100%);
  }
</style>
</head>
<body>
<div class="card">
  <div class="grid-bg"></div>
  <img class="watermark" src="${window.location.origin}/logo.png" alt=""/>
  <div class="top-strip"></div>

  <div class="header">
    <img class="logo" src="${window.location.origin}/logo.png" alt="TMPC Logo"/>
    <div class="hdiv"></div>
    <div>
      <div class="college-en">${t('qrCard.collegeName')}</div>
      <div class="college-am">ተፈሪ መኮንን ፖሊቴክኒክ ኮሌጅ</div>
    </div>
  </div>

  <div class="body">
    <div class="qr-box">${qrSvgHTML}</div>
    <div class="vsep"></div>
    <div class="info">
      <div><div class="lbl">${t('qrCard.employeeName')}</div><div class="val-name">${employeeName}</div></div>
      <div><div class="lbl">${t('qrCard.idNumber')}</div><div class="val-id">${employeeId}</div></div>
      <div><div class="lbl">${t('qrCard.dept')}</div><div class="val-meta">${department}</div></div>
      <div><div class="lbl">${t('qrCard.pos')}</div><div class="val-meta">${position}</div></div>
    </div>
  </div>

  <div class="footer">
    <span class="footer-title">${t('qrCard.footer')}</span>
    <div class="shimmer"></div>
  </div>
</div>
<script>
  window.onload = function () {
    window.print();
    window.close();
  };
<\/script>
</body></html>`;

    const win = window.open('', '_blank', 'width=500,height=400');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-app-surface border border-app-border rounded-2xl shadow-2xl p-6 flex flex-col gap-6">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <h3 className="text-lg font-bold text-white">{t('qrCard.title')}</h3>
          <button
            onClick={onClose}
            className="text-app-secondary hover:text-app-primary hover:bg-app-surface-2/60 p-1.5 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Card Preview ── */}
        <div className="flex justify-center py-5 bg-app-surface-2/40 rounded-xl border border-app-border/50">
          <div ref={printRef} id="print-area-root" style={cardStyles.card}>

            {/* Security / watermark layer (z-index 0) */}
            <div style={cardStyles.watermarkLayer}>
              <div style={cardStyles.securityGrid} />
              <img src="/logo.png" alt="" style={cardStyles.watermarkImg} aria-hidden="true" />
            </div>

            {/* Top gradient accent strip */}
            <div style={cardStyles.topStrip} />

            {/* ── HEADER ── */}
            <div style={cardStyles.header}>
              {/* Plain logo, no circular frame */}
              <img src="/logo.png" alt="TMPC Logo" style={cardStyles.logoImg} />
              <div style={cardStyles.headerDivider} />
              <div style={cardStyles.headerTextGroup}>
                <span style={cardStyles.collegeName}>{t('qrCard.collegeName')}</span>
                <span style={cardStyles.collegeNameAm}>ተፈሪ መኮንን ፖሊቴክኒክ ኮሌጅ</span>
              </div>
            </div>

            {/* ── BODY ── */}
            <div style={cardStyles.body}>
              {/* QR Code — no verify badge */}
              <div style={cardStyles.qrWrap}>
                <div style={cardStyles.qrInner}>
                  <QRCodeSVG
                    value={cardCode || 'N/A'}
                    size={70}
                    level="H"
                    includeMargin={false}
                    fgColor="#0a2540"
                  />
                </div>
              </div>

              {/* Vertical rule */}
              <div style={cardStyles.bodySep} />

              {/* Employee info */}
              <div style={cardStyles.info}>
                <div>
                  <div style={cardStyles.fieldLabel}>{t('qrCard.employeeName')}</div>
                  <div style={cardStyles.nameValue}>{employeeName}</div>
                </div>
                <div>
                  <div style={cardStyles.fieldLabel}>{t('qrCard.idNumber')}</div>
                  <div style={cardStyles.idValue}>{employeeId}</div>
                </div>
                <div>
                  <div style={cardStyles.fieldLabel}>{t('qrCard.dept')}</div>
                  <div style={cardStyles.metaValue}>{department}</div>
                </div>
                <div>
                  <div style={cardStyles.fieldLabel}>{t('qrCard.pos')}</div>
                  <div style={cardStyles.metaValue}>{position}</div>
                </div>
              </div>
            </div>

            {/* ── FOOTER — title only, centred ── */}
            <div style={cardStyles.footer}>
              <span style={cardStyles.footerTitle}>{t('qrCard.footer')}</span>
              <div style={cardStyles.footerShimmer} />
            </div>

          </div>
        </div>

        {/* Modal Controls */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-app-surface-2 hover:bg-app-surface-2 font-semibold py-3 px-4 rounded-xl transition cursor-pointer text-white text-center"
          >
            {t('common.close')}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold py-3 px-4 rounded-xl shadow-premium hover:shadow-premium-hover transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>{t('qrCard.print')}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default QRPrintCard;
