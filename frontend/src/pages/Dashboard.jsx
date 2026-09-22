import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { useCalendar } from '../context/CalendarContext.jsx';
import { getDashboardStats } from '../services/dashboard.service.js';
import { getCouponScanReport } from '../services/couponScan.service.js';
import { Utensils, ShieldAlert, CalendarDays, BarChart3, Wallet, Clock } from 'lucide-react';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { calendarMode } = useCalendar();
  const [stats, setStats] = useState(null);
  const [scanReport, setScanReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await getDashboardStats();
        setStats(statsRes.data);
        const canViewScanReport = ['ADMIN', 'HR', 'FINANCE'].includes(user?.role);
        if (canViewScanReport) {
          const reportRes = await getCouponScanReport({ calendarMode });
          setScanReport(reportRes.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, calendarMode]);

  if (loading || !stats) return <PageSkeleton />;

  const cards = [
    { title: t('dashboard.activeEmployees', { defaultValue: 'Active Employees' }), value: stats.activeEmployees, icon: Utensils, roles: ['ADMIN', 'HR', 'FINANCE'] },
    { title: t('dashboard.todayClaims', { defaultValue: 'Today Claims' }), value: stats.todayClaims, icon: ShieldAlert, highlight: true, roles: ['ADMIN', 'HR', 'FINANCE'] },
  ];

  const activeCards = cards.filter((c) => c.roles.includes(user?.role));
  const scanReportCards = scanReport
    ? [
        { title: t('dashboard.scansToday', { defaultValue: 'Scanned Today' }), period: t('dashboard.today', { defaultValue: 'today' }), icon: CalendarDays, count: scanReport.today?.count || 0, amount: scanReport.today?.amount || 0, rate: scanReport.today?.rate || scanReport.metrics?.rate || 40 },
        { title: t('dashboard.scansThisWeek', { defaultValue: 'Scanned This Week' }), period: t('dashboard.thisWeek', { defaultValue: 'this week' }), icon: BarChart3, count: scanReport.week?.count || 0, amount: scanReport.week?.amount || 0, rate: scanReport.week?.rate || scanReport.metrics?.rate || 40 },
        { title: t('dashboard.scansThisMonth', { defaultValue: 'Scanned This Month' }), period: t('dashboard.thisMonth', { defaultValue: 'this month' }), icon: Wallet, count: scanReport.month?.count || 0, amount: scanReport.month?.amount || 0, rate: scanReport.month?.rate || scanReport.metrics?.rate || 40 },
      ]
    : [];

  const formatNumber = (value) => Number(value || 0).toLocaleString();
  const formatBirr = (value) => `${formatNumber(value)} ${t('common.birr')}`;

  return (
    <div className="page-shell">
      <div className="surface-card">
        <PageHeader
          title={t('dashboard.welcome', { name: user?.name })}
          subtitle={
            <span className="flex items-center gap-2">
              {t('dashboard.roleLabel')}:
              <span className="badge">{t(`roles.${user?.role}`, { defaultValue: user?.role })}</span>
            </span>
          }
        />
      </div>
      <div>
        <p className="section-label mb-5">{t('dashboard.overview')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {activeCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="surface-card surface-card-hover flex items-center justify-between">
                <div>
                  <span className="section-label block mb-1.5">{card.title}</span>
                  <span className={`text-2xl font-semibold ${card.highlight ? 'brand-text' : 'text-app-primary'}`}>{formatNumber(card.value)}</span>
                </div>
                <div className={`w-11 h-11 rounded-card flex items-center justify-center border border-app-border ${card.highlight ? 'logo-mark border-0' : ''}`} style={card.highlight ? undefined : { backgroundColor: 'var(--color-bg-secondary)' }}>
                  <Icon className={`w-5 h-5 ${card.highlight ? '' : 'text-app-secondary'}`} aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {scanReportCards.length > 0 && (
        <div>
          <p className="section-label mb-5">{t('dashboard.scanReportTitle', { defaultValue: 'Coupon Scan Report' })}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {scanReportCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="surface-card surface-card-hover space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="section-label block mb-1.5">{item.title}</span>
                      <span className="text-3xl font-semibold text-app-primary">{formatNumber(item.count)}</span>
                    </div>
                    <div className="w-11 h-11 rounded-card flex items-center justify-center border border-app-border" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      <Icon className="w-5 h-5 text-app-secondary" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="border-t border-app-border pt-4 space-y-2">
                    <p className="text-sm font-semibold text-app-primary">{formatBirr(item.amount)}</p>
                    <p className="text-xs text-app-muted">
                      {t('dashboard.scanReportFormula', {
                        defaultValue: '{{count}} coupons scanned {{period}} x {{rate}} Birr',
                        count: formatNumber(item.count),
                        period: item.period,
                        rate: formatNumber(item.rate),
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="surface-card space-y-4">
          <h3 className="section-title flex items-center gap-2">
            <Clock className="w-4 h-4 text-app-secondary" aria-hidden="true" />
            {t('dashboard.systemInfo')}
          </h3>
          <p className="body-text">{t('dashboard.systemInfoBody')}</p>
        </div>
        <div className="surface-card space-y-4">
          <h3 className="section-title flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-app-secondary" aria-hidden="true" />
            {t('dashboard.operationalProtocols')}
          </h3>
          <div className="body-text space-y-2">
            {user?.role === 'ADMIN' && <p>{t('dashboard.protocolAdmin')}</p>}
            {['HR', 'FINANCE'].includes(user?.role) && <p>{t('dashboard.protocolManager')}</p>}
            {user?.role === 'CAFE_STAFF' && <p>{t('dashboard.protocolCafe')}</p>}
            {user?.role === 'EMPLOYEE' && <p>{t('dashboard.protocolEmployee')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
