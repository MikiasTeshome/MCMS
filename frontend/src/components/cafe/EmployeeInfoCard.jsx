import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, ShieldCheck, AlertTriangle } from 'lucide-react';

const EmployeeInfoCard = ({ employee, eligible }) => {
  const { t } = useTranslation();
  if (!employee) return null;

  const canIssue =
    eligible ?? (employee.availableCoupons > 0 && !employee.claimedToday);

  return (
    <div className="glass-card overflow-hidden">
      <div
        className={`px-6 py-4 flex justify-between items-center border-b ${
          canIssue
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}
      >
        <div className="flex items-center gap-2">
          {canIssue ? (
            <ShieldCheck className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
          <span className="font-extrabold Outfit text-lg uppercase tracking-wider">
            {canIssue ? t('cafe.clearToIssue') : t('cafe.verifyBlocked')}
          </span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-950/40 rounded-full text-slate-300 border border-slate-800/80">
          {t('cafe.availableCount', { count: employee.availableCoupons })}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4 p-4 bg-slate-950/20 rounded-xl border border-slate-800/50">
          <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-400 border border-brand-500/20 shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <Field label={t('cafe.fullName')} value={employee.fullName} bold />
            <Field label={t('cafe.department')} value={employee.department} />
            <Field label={t('cafe.staffType')} value={employee.staffType} />
            <Field
              label={t('cafe.couponValue')}
              value={
                employee.couponValue != null
                  ? `${employee.couponValue} ${t('common.birr')}`
                  : '—'
              }
            />
            <Field label={t('cafe.expiryDate')} value={employee.expiryDate || '—'} />
            <Field
              label={t('cafe.claimedToday')}
              value={employee.claimedToday ? t('common.yes') : t('common.no')}
              highlight={employee.claimedToday ? 'warn' : 'ok'}
            />
            {employee.lastClaimDate && (
              <Field label={t('cafe.lastClaim')} value={employee.lastClaimDate} />
            )}
            {employee.expiredCoupons != null && (
              <Field
                label={t('cafe.expiredTotal')}
                value={String(employee.expiredCoupons)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, bold, highlight }) => (
  <div>
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
      {label}
    </div>
    <div
      className={`text-sm ${bold ? 'font-bold text-white' : 'font-medium text-slate-300'} ${
        highlight === 'warn'
          ? 'text-red-400'
          : highlight === 'ok'
          ? 'text-emerald-400'
          : ''
      }`}
    >
      {value}
    </div>
  </div>
);

export default EmployeeInfoCard;
