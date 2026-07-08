import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getCoupons } from '../services/coupon.service.js';
import { getCouponScanReport } from '../services/couponScan.service.js';
import { getMeals } from '../services/meal.service.js';
import { getAuditLogs } from '../services/audit.service.js';
import { Ticket, Utensils, ShieldAlert, BadgePercent, CheckCircle, Clock, CalendarDays, BarChart3, Wallet } from 'lucide-react';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ totalCoupons: 0, redeemedCoupons: 0, totalMeals: 0, auditLogsCount: 0 });
  const [scanReport, setScanReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const couponsRes = await getCoupons();
        const mealsRes = await getMeals();
        const canViewScanReport = ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF'].includes(user?.role);
        let logsCount = 0;
        let scanReportData = null;
        if (user?.role === 'ADMIN') {
          const logsRes = await getAuditLogs();
          logsCount = logsRes.data?.pagination?.total || 0;
        }
        if (canViewScanReport) {
          const reportRes = await getCouponScanReport();
          scanReportData = reportRes.data;
        }
        const coupons = couponsRes.data || [];
        setStats({
          totalCoupons: coupons.length,
          redeemedCoupons: coupons.filter((c) => c.status === 'REDEEMED').length,
          totalMeals: (mealsRes.data || []).length,
          auditLogsCount: logsCount,
        });
        setScanReport(scanReportData);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) return <PageSkeleton />;

  const cards = [
    { title: t('dashboard.totalCoupons'), value: stats.totalCoupons, icon: Ticket, roles: ['ADMIN', 'HR', 'FINANCE', 'EMPLOYEE'] },
    { title: t('dashboard.redeemedCoupons'), value: stats.redeemedCoupons, icon: CheckCircle, roles: ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'] },
    { title: t('dashboard.totalMeals'), value: stats.totalMeals, icon: Utensils, roles: ['ADMIN', 'HR', 'FINANCE'] },
    { title: t('dashboard.auditLogsCount'), value: stats.auditLogsCount, icon: ShieldAlert, highlight: true, roles: ['ADMIN'] },
  ];

  const activeCards = cards.filter((c) => c.roles.includes(user?.role));
  const scanReportCards = scanReport
    ? [
        {
          title: t('dashboard.scansToday', { defaultValue: 'Scanned Today' }),
          period: t('dashboard.today', { defaultValue: 'today' }),
          icon: CalendarDays,
          ...scanReport.today,
        },
        {
          title: t('dashboard.scansThisWeek', { defaultValue: 'Scanned This Week' }),
          period: t('dashboard.thisWeek', { defaultValue: 'this week' }),
          icon: BarChart3,
          ...scanReport.week,
        },
        {
          title: t('dashboard.scansThisMonth', { defaultValue: 'Scanned This Month' }),
          period: t('dashboard.thisMonth', { defaultValue: 'this month' }),
          icon: Wallet,
          ...scanReport.month,
        },
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
                  <span className={`text-2xl font-semibold ${card.highlight ? 'brand-text' : 'text-app-primary'}`}>{card.value}</span>
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
          <p className="section-label mb-5">
            {t('dashboard.scanReportTitle', { defaultValue: 'Coupon Scan Report' })}
          </p>
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
                    <p className="text-sm font-semibold text-app-primary">
                      {formatBirr(item.amount)}
                    </p>
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
          <div className="border-t border-app-border pt-4 text-xs grid grid-cols-2 gap-3 text-app-muted">
            <div>{t('dashboard.timezone')}: <span className="text-app-secondary">{t('dashboard.timezoneValue')}</span></div>
            <div>{t('dashboard.database')}: <span className="text-app-secondary">PostgreSQL</span></div>
            <div>{t('dashboard.security')}: <span className="text-app-primary font-medium">{t('dashboard.securityValue')}</span></div>
            <div>{t('dashboard.auditing')}: <span className="text-app-primary font-medium">{t('dashboard.auditingValue')}</span></div>
          </div>
        </div>

        <div className="surface-card space-y-4">
          <h3 className="section-title flex items-center gap-2">
            <BadgePercent className="w-4 h-4 text-app-secondary" aria-hidden="true" />
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
