import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, ChevronRight, ReceiptText, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { getCouponScanReport } from '../services/couponScan.service.js';

const fixedKeys = ['today', 'thisWeek', 'lastWeek', 'thisMonth', 'lifetime'];

const Reports = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [activePeriod, setActivePeriod] = useState('thisMonth');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const res = await getCouponScanReport();
        setReport(res.data);
      } catch (err) {
        console.error('Failed to load coupon scan report:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  const labels = useMemo(() => ({
    today: t('reports.today', { defaultValue: 'Today' }),
    thisWeek: t('reports.thisWeek', { defaultValue: 'This Week' }),
    lastWeek: t('reports.lastWeek', { defaultValue: 'Last Week' }),
    thisMonth: t('reports.thisMonth', { defaultValue: 'This Month' }),
    lastMonth: t('reports.lastMonth', { defaultValue: 'Last Month' }),
    monthBeforeLast: t('reports.monthBeforeLast', { defaultValue: 'Month Before Last' }),
  }), [t]);

  const periods = report?.periods || {};
  
  // Extract historical months from periods
  const historicalMonthKeys = useMemo(() => {
    return Object.keys(periods)
      .filter((k) => k.startsWith('month_'))
      .sort((a, b) => b.localeCompare(a)); // Descending sort
  }, [periods]);

  if (loading) return <PageSkeleton cards={3} table={false} />;

  const allPeriodKeys = [...fixedKeys, ...historicalMonthKeys];

  const getPeriodLabel = (key) => {
    if (labels[key]) return labels[key];
    if (key === 'lifetime') return t('reports.lifetime', { defaultValue: 'Lifetime' });
    if (key.startsWith('month_')) {
      const parts = key.split('_');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1);
        return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      }
    }
    return key;
  };

  const selected = periods[activePeriod] || {};
  const formatNumber = (value) => Number(value || 0).toLocaleString();
  const formatBirr = (value) => `${formatNumber(value)} ${t('common.birr')}`;
  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';

  return (
    <div className="page-shell">
      <div className="surface-card">
        <PageHeader
          title={t('reports.title', { defaultValue: 'Coupon Scan Reports' })}
          subtitle={t('reports.subtitle', {
            defaultValue: 'Review scanned coupon counts and Birr totals by day, week, and month.',
          })}
        />
      </div>

      <div className="surface-card">
        <div className="flex flex-wrap gap-2 items-center">
          {fixedKeys.map((key) => {
            if (!periods[key]) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActivePeriod(key)}
                className={`px-4 py-2 rounded-card border text-sm font-semibold transition-colors ${
                  activePeriod === key
                    ? 'text-white border-transparent'
                    : 'text-app-secondary border-app-border hover:text-app-primary'
                }`}
                style={activePeriod === key ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                {getPeriodLabel(key)}
              </button>
            );
          })}
          
          {historicalMonthKeys.length > 0 && (
            <select
              value={historicalMonthKeys.includes(activePeriod) ? activePeriod : ''}
              onChange={(e) => {
                if (e.target.value) setActivePeriod(e.target.value);
              }}
              className={`px-4 py-2 rounded-card border text-sm font-semibold transition-colors outline-none cursor-pointer ${
                historicalMonthKeys.includes(activePeriod)
                  ? 'text-white border-transparent'
                  : 'bg-transparent text-app-secondary border-app-border hover:text-app-primary'
              }`}
              style={historicalMonthKeys.includes(activePeriod) ? { backgroundColor: 'var(--color-primary)' } : { backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <option value="" disabled className="text-black bg-white">{t('reports.pastMonths', { defaultValue: 'Past Months...' })}</option>
              {historicalMonthKeys.map((key) => (
                <option key={key} value={key} className="text-black bg-white">
                  {getPeriodLabel(key)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="surface-card surface-card-hover lg:col-span-2 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-label block mb-2">{labels[activePeriod]}</span>
              <h2 className="text-4xl font-semibold text-app-primary">{formatNumber(selected.count)}</h2>
              <p className="text-sm text-app-muted mt-2">
                {t('reports.couponsScanned', { defaultValue: 'Coupons scanned' })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-card flex items-center justify-center border border-app-border" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <BarChart3 className="w-5 h-5 text-app-secondary" aria-hidden="true" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-app-border">
            <ReportMetric
              icon={ReceiptText}
              label={t('reports.count', { defaultValue: 'Coupon Count' })}
              value={formatNumber(selected.count)}
            />
            <ReportMetric
              icon={Wallet}
              label={t('reports.rate', { defaultValue: 'Standard Rate' })}
              value={formatBirr(selected.rate)}
            />
            <ReportMetric
              icon={CalendarDays}
              label={t('reports.total', { defaultValue: 'Total Amount' })}
              value={formatBirr(selected.amount)}
            />
          </div>
        </div>

        <div className="surface-card space-y-4">
          <h3 className="section-title">{t('reports.summary', { defaultValue: 'Summary' })}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-app-muted">{t('reports.from', { defaultValue: 'From' })}</span>
              <span className="text-app-primary font-medium">{formatDate(selected.startDate)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-app-muted">{t('reports.to', { defaultValue: 'To' })}</span>
              <span className="text-app-primary font-medium">{formatDate(selected.endDate)}</span>
            </div>
            <div className="pt-3 border-t border-app-border">
              <p className="text-app-secondary">
                {t('reports.formula', {
                  defaultValue: '{{count}} coupons x {{rate}} Birr = {{amount}} Birr',
                  count: formatNumber(selected.count),
                  rate: formatNumber(selected.rate),
                  amount: formatNumber(selected.amount),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card">
        <div className="table-wrap">
          <table className="w-full text-sm text-left">
            <thead className="text-app-muted">
              <tr>
                <th className="pb-3">{t('reports.period', { defaultValue: 'Period' })}</th>
                <th className="pb-3">{t('reports.scanned', { defaultValue: 'Scanned' })}</th>
                <th className="pb-3">{t('reports.rate', { defaultValue: 'Standard Rate' })}</th>
                <th className="pb-3">{t('reports.amount', { defaultValue: 'Amount' })}</th>
              </tr>
            </thead>
            <tbody>
              {allPeriodKeys.map((key) => {
                const item = periods[key];
                if (!item) return null;
                return (
                  <tr key={key} className="text-app-secondary hover:bg-app-surface-2/10">
                    <td className="py-3 font-semibold text-app-primary">
                      <button type="button" onClick={() => setActivePeriod(key)} className="inline-flex items-center gap-2">
                        {getPeriodLabel(key)}
                        {activePeriod === key && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </td>
                    <td className="py-3">{formatNumber(item.count)}</td>
                    <td className="py-3">{formatBirr(item.rate)}</td>
                    <td className="py-3 font-semibold text-app-primary">{formatBirr(item.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ReportMetric = ({ icon: Icon, label, value }) => (
  <div className="rounded-card border border-app-border p-4" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
    <Icon className="w-4 h-4 text-app-secondary mb-3" aria-hidden="true" />
    <p className="text-xs text-app-muted mb-1">{label}</p>
    <p className="text-lg font-semibold text-app-primary">{value}</p>
  </div>
);

export default Reports;
