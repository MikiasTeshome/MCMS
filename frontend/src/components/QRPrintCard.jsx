import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';

const QRPrintCard = ({ employee, cardCode, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef(null);

  const handlePrint = () => {
    // Open print window dialog
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    // Create a temporary style element to clean up the printed sheet
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-area-root, #print-area-root * {
          visibility: visible;
        }
        #print-area-root {
          position: absolute;
          left: 5mm;
          top: 5mm;
          width: 85.6mm;
          height: 53.98mm;
          border: 1px solid #ccc;
          box-shadow: none;
          margin: 0;
          padding: 12px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #ffffff !important;
          color: #000000 !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-app-surface border border-app-border rounded-2xl shadow-2xl p-6 flex flex-col gap-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-app-border pb-3">
          <h3 className="text-lg font-bold text-white ">{t('qrCard.title')}</h3>
          <button 
            onClick={onClose}
            className="text-app-secondary hover:text-app-primary hover:bg-app-surface-2/60 p-1.5 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="flex justify-center py-4 bg-app-surface-2/40 rounded-xl border border-app-border/50">
          <div 
            ref={printRef}
            id="print-area-root"
            className="w-[85.6mm] h-[53.98mm] bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 p-4 flex flex-col justify-between select-none relative overflow-hidden font-sans"
            style={{
              boxSizing: 'border-box',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
            {/* College Header Design */}
            <div className="flex items-center gap-2 border-b border-blue-600 pb-1.5">
              {/* Dummy institution logo icon */}
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                TM
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-800 tracking-tight leading-tight uppercase">
                  {t('qrCard.collegeName')}
                </span>
                <span className="text-[9.5px] font-extrabold text-blue-600 leading-tight">
                  ተፈሪ መኮንን ፖሊቴክኒክ ኮሌጅ
                </span>
              </div>
            </div>

            {/* Main content grid */}
            <div className="flex gap-4 items-center flex-1 my-2">
              {/* QR block */}
              <div className="p-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <QRCodeSVG
                  value={cardCode || 'N/A'}
                  size={70}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Employee Metadata */}
              <div className="flex flex-col text-left overflow-hidden gap-0.5 justify-center">
                <div className="text-[8px] font-bold text-app-secondary uppercase tracking-wide leading-none">{t('qrCard.employeeName')}</div>
                <div className="text-xs font-black text-slate-800 truncate leading-tight">{employee?.name}</div>

                <div className="text-[8px] font-bold text-app-secondary uppercase tracking-wide leading-none mt-1">{t('qrCard.idNumber')}</div>
                <div className="text-[10px] font-extrabold text-blue-700 leading-none">{employee?.employeeProfile?.employeeIdNumber || employee?.employeeIdNumber || 'N/A'}</div>

                <div className="text-[9px] text-app-muted truncate mt-1">
                  <span className="font-bold text-slate-600">{t('qrCard.dept')}: </span>{employee?.employeeProfile?.department || employee?.department || 'N/A'}
                </div>
                <div className="text-[9px] text-app-muted truncate">
                  <span className="font-bold text-slate-600">{t('qrCard.pos')}: </span>{employee?.employeeProfile?.position || employee?.position || 'N/A'}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex justify-between items-center text-[7.5px] text-app-secondary border-t border-slate-100 pt-1.5 leading-none">
              <span>{t('qrCard.footer')}</span>
              <span className="font-bold text-blue-600">{t('qrCard.official')}</span>
            </div>
            
            {/* Sleek top border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
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
