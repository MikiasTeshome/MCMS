import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { selfCheckEmployee } from '../services/couponScan.service.js';
import ScanNotification from '../components/cafe/ScanNotification.jsx';
import { User, Calendar, Ticket, Loader2 } from 'lucide-react';

const SelfCheck = () => {
  const { t } = useTranslation();
  const { employeeId: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const employeeId = routeId || searchParams.get('id') || '';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await selfCheckEmployee(id.trim());
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || t('selfCheck.loadFailed'));
        setData(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('selfCheck.invalidQr'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) load(employeeId);
  }, [employeeId]);

  const handleQuickScan = async () => {
    if (!window.isSecureContext) {
      setError(t('selfCheck.httpsRequired'));
      return;
    }
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) {
        setError(t('selfCheck.noCamera'));
        return;
      }
      const scanner = new Html5Qrcode('self-check-reader');
      await scanner.start(
        devices[0].id,
        { fps: 10, qrbox: 250 },
        (text) => {
          scanner.stop().catch(() => {});
          load(text.trim());
        },
        () => {}
      );
    } catch {
      setError(t('selfCheck.cameraFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold Outfit">{t('selfCheck.title')}</h1>
          <p className="text-sm text-slate-400">{t('selfCheck.subtitle')}</p>
        </header>

        {!employeeId && (
          <div className="space-y-4">
            <div id="self-check-reader" className="rounded-xl overflow-hidden bg-black min-h-[200px]" />
            <button
              type="button"
              onClick={handleQuickScan}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl cursor-pointer"
            >
              {t('selfCheck.scanMyQr')}
            </button>
            <p className="text-xs text-slate-500 text-center">{t('selfCheck.openLinkHint')}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
          </div>
        )}

        {error && <ScanNotification type="error" message={error} />}

        {data && !loading && (
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-lg">{data.fullName}</div>
                <div className="text-sm text-slate-400">{data.department}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Stat label={t('selfCheck.available')} value={data.availableCoupons} icon={Ticket} />
              <Stat label={t('selfCheck.expires')} value={data.expiryDate || '—'} icon={Calendar} />
              <Stat label={t('cafe.staffType')} value={data.staffType} />
              <Stat
                label={t('selfCheck.claimedToday')}
                value={data.claimedToday ? t('common.yes') : t('common.no')}
              />
            </div>

            {data.recentClaimHistory?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                  {t('selfCheck.recentClaims')}
                </h3>
                <ul className="text-sm divide-y divide-slate-800">
                  {data.recentClaimHistory.map((c, i) => (
                    <li key={i} className="py-2 flex justify-between">
                      <span className="font-mono text-slate-400">{c.couponCode}</span>
                      <span>
                        {c.value} {t('common.birr')} ·{' '}
                        {new Date(c.issuedAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.holidays?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                  {t('selfCheck.upcomingHolidays')}
                </h3>
                <ul className="text-sm text-slate-400 space-y-1">
                  {data.holidays.map((h) => (
                    <li key={h.date}>
                      {h.date} — {h.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, icon: Icon }) => (
  <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-800">
    <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </div>
    <div className="text-lg font-bold mt-1">{value}</div>
  </div>
);

export default SelfCheck;
