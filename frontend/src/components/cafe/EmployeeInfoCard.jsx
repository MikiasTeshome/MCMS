import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, ShieldCheck, AlertTriangle } from 'lucide-react';

const EmployeeInfoCard = ({ employee, eligible }) => {
  const { t } = useTranslation();
  if (!employee) return null;

  const canIssue =
    eligible ?? (employee.availableCoupons > 0 && !employee.claimedToday);

  return (
    <div className="surface-card overflow-hidden p-0">
      <div className={`px-6 py-4 flex justify-between items-center border-b ${canIssue ? 'alert-success border-0 rounded-none' : 'alert-warning border-0 rounded-none'}`}>
        <div className="flex items-center gap-2">
          {canIssue ? (
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          )}
          <span className="font-semibold text-sm uppercase tracking-wider">
            {canIssue ? t('cafe.clearToIssue') : t('cafe.verifyBlocked')}
          </span>
        </div>
        <span className="badge">
          {t('cafe.availableCount', { count: employee.availableCoupons })}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start gap-4 p-4 bg-app-surface-2 rounded-card border border-app-border">
          <div className="avatar w-12 h-12">
            <User className="w-5 h-5" aria-hidden="true" />
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
    <div className="input-label">{label}</div>
    <div
      className={`text-sm ${bold ? 'font-semibold text-app-primary' : 'font-medium text-app-secondary'} ${
        highlight === 'warn'
          ? 'text-status-error'
          : highlight === 'ok'
          ? 'text-status-success'
          : ''
      }`}
    >
      {value}
    </div>
  </div>
);

export default EmployeeInfoCard;
