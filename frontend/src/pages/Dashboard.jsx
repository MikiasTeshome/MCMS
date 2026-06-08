import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getCoupons } from '../services/coupon.service.js';
import { getMeals } from '../services/meal.service.js';
import { getAuditLogs } from '../services/audit.service.js';
import { Ticket, Utensils, ShieldAlert, BadgePercent, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [stats, setStats] = useState({
    totalCoupons: 0,
    redeemedCoupons: 0,
    totalMeals: 0,
    auditLogsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Retrieve statistics by calling services based on roles
        const couponsRes = await getCoupons();
        const mealsRes = await getMeals();
        
        let logsCount = 0;
        if (user?.role === 'ADMIN') {
          const logsRes = await getAuditLogs();
          logsCount = logsRes.data?.pagination?.total || 0;
        }

        const coupons = couponsRes.data || [];
        const redeemed = coupons.filter(c => c.status === 'REDEEMED').length;

        setStats({
          totalCoupons: coupons.length,
          redeemedCoupons: redeemed,
          totalMeals: (mealsRes.data || []).length,
          auditLogsCount: logsCount,
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-500">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Dashboard Stats Config
  const cards = [
    {
      title: t('dashboard.totalCoupons'),
      value: stats.totalCoupons,
      icon: Ticket,
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
      roles: ['ADMIN', 'HR', 'FINANCE', 'EMPLOYEE'],
    },
    {
      title: t('dashboard.redeemedCoupons'),
      value: stats.redeemedCoupons,
      icon: CheckCircle,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      roles: ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'],
    },
    {
      title: t('dashboard.totalMeals'),
      value: stats.totalMeals,
      icon: Utensils,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      roles: ['ADMIN', 'HR', 'FINANCE'],
    },
    {
      title: t('dashboard.auditLogsCount'),
      value: stats.auditLogsCount,
      icon: ShieldAlert,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      roles: ['ADMIN'],
    },
  ];

  const activeCards = cards.filter(card => card.roles.includes(user?.role));

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-card p-8 bg-gradient-to-r from-slate-900/80 to-slate-900/40 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <h1 className="text-3xl font-extrabold text-white Outfit tracking-tight">
            {t('dashboard.welcome', { name: user?.name })}
          </h1>
          <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
            <span>{t('dashboard.roleLabel')}:</span>
            <span className="text-brand-400 font-bold tracking-wider uppercase bg-brand-500/10 px-2 py-0.5 rounded-full text-xs border border-brand-500/20">
              {t(`roles.${user?.role}`, { defaultValue: user?.role })}
            </span>
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-full bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Grid statistics list */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 block">
          {t('dashboard.overview')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="glass-card glass-card-hover p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <span className="text-3xl font-black text-white Outfit block">
                    {card.value}
                  </span>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access panel depending on roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* System activity mock log or information details */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white Outfit flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" />
            <span>{t('dashboard.systemInfo')}</span>
          </h3>
          <div className="space-y-3 text-sm text-slate-400">
            <p>{t('dashboard.systemInfoBody')}</p>
            <div className="border-t border-slate-800 pt-3 text-xs grid grid-cols-2 gap-2">
              <div>{t('dashboard.timezone')}: <span className="text-slate-300">{t('dashboard.timezoneValue')}</span></div>
              <div>{t('dashboard.database')}: <span className="text-slate-300">PostgreSQL</span></div>
              <div>{t('dashboard.security')}: <span className="text-brand-400 font-semibold">{t('dashboard.securityValue')}</span></div>
              <div>{t('dashboard.auditing')}: <span className="text-brand-400 font-semibold">{t('dashboard.auditingValue')}</span></div>
            </div>
          </div>
        </div>

        {/* Action card panel shortcuts */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white Outfit flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-brand-500" />
            <span>{t('dashboard.operationalProtocols')}</span>
          </h3>
          <div className="text-sm text-slate-400 space-y-2">
            {user?.role === 'ADMIN' && (
              <p>{t('dashboard.protocolAdmin')}</p>
            )}
            {['HR', 'FINANCE'].includes(user?.role) && (
              <p>{t('dashboard.protocolManager')}</p>
            )}
            {user?.role === 'CAFE_STAFF' && (
              <p>{t('dashboard.protocolCafe')}</p>
            )}
            {user?.role === 'EMPLOYEE' && (
              <p>{t('dashboard.protocolEmployee')}</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
