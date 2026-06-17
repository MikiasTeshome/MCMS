import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { selfCheckEmployee } from '../services/couponScan.service.js';
import ScanNotification from '../components/cafe/ScanNotification.jsx';
import { User, Calendar, Ticket, Loader2, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-app-bg text-app-primary p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold ">{t('selfCheck.title')}</h1>
          <p className="text-sm text-app-secondary">{t('selfCheck.subtitle')}</p>
        </header>

        {!employeeId && (
          <div className="space-y-4">
            <div id="self-check-reader" className="rounded-xl overflow-hidden bg-black min-h-[200px]" />
            <button
              type="button"
              onClick={handleQuickScan}
              className="w-full btn-primary py-3"
            >
              {t('selfCheck.scanMyQr')}
            </button>
            <p className="text-xs text-app-muted text-center">{t('selfCheck.openLinkHint')}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 spinner" />
          </div>
        )}

        {error && <ScanNotification type="error" message={error} />}

        {data && !loading && (
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl avatar flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-lg">{data.fullName}</div>
                <div className="text-sm text-app-secondary">{data.department}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Stat label={t('selfCheck.available')} value={data.availableCoupons} icon={Ticket} />
              <Stat
                label={t('selfCheck.redeemableToday')}
                value={data.couponsRedeemableNow ?? data.availableCoupons}
                icon={RefreshCw}
              />
              <Stat label={t('selfCheck.expires')} value={data.expiryDate || '—'} icon={Calendar} />
              <Stat label={t('cafe.staffType')} value={data.staffType} />
              <Stat
                label={t('selfCheck.claimedToday')}
                value={data.claimedToday ? t('common.yes') : t('common.no')}
              />
            </div>

            {/* Weekly tracker */}
            {(data.dailyCap != null) && (
              <WeekProgressBar
                dailyCap={data.dailyCap}
                weekBalance={data.weekBalance ?? 0}
              />
            )}

            {data.recentClaimHistory?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-app-muted uppercase mb-2">
                  {t('selfCheck.recentClaims')}
                </h3>
                <ul className="text-sm divide-y divide-app-border">
                  {data.recentClaimHistory.map((c, i) => (
                    <li key={i} className="py-2 flex justify-between">
                      <span className="font-mono text-app-secondary">{c.couponCode}</span>
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
                <h3 className="text-xs font-bold text-app-muted uppercase mb-2">
                  {t('selfCheck.upcomingHolidays')}
                </h3>
                <ul className="text-sm text-app-secondary space-y-1">
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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const WeekProgressBar = ({ dailyCap = 0, weekBalance = 0 }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-app-muted uppercase tracking-wider">
        {t('selfCheck.weekProgress')}
      </div>
      <div className="flex gap-2">
        {DAY_LABELS.map((label, i) => {
          const dayNum = i + 1;
          const isUnlocked = dayNum <= dailyCap;
          const wasClaimed = dayNum <= weekBalance && dayNum < dailyCap;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-2 rounded-full ${
                  wasClaimed
                    ? 'bg-green-500'
                    : isUnlocked
                    ? 'bg-blue-500'
                    : 'bg-app-surface-2 border border-app-border'
                }`}
              />
              <span className={`text-[9px] font-bold ${ isUnlocked ? 'text-app-primary' : 'text-app-muted' }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-app-muted">
        Day {dailyCap} of 5 — {Math.min(dailyCap, weekBalance + 0)} coupon(s) used this week
      </p>
    </div>
  );
};

const Stat = ({ label, value, icon: Icon }) => (
  <div className="bg-app-surface-2/40 rounded-lg p-3 border border-app-border">
    <div className="text-[10px] font-bold text-app-muted uppercase flex items-center gap-1">
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </div>
    <div className="text-lg font-bold mt-1">{value}</div>
  </div>
);

export default SelfCheck;
