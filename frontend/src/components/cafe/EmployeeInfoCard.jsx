import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, ShieldCheck, AlertTriangle } from 'lucide-react';

/** Returns the ISO day-of-week label for Mon–Fri. */
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F'];

/**
 * WeekTracker — visual Mon–Fri accumulation bar.
 * - Gray pip  = day not yet reached (locked)
 * - Accent pip = day unlocked, coupon still in wallet (unclaimed)
 * - Green pip  = day unlocked, coupon already redeemed
 */
const WeekTracker = ({ dailyCap = 0, claimedCount = 0 }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
        {t('cafe.weekAccumulation')}
      </div>
      <div className="flex gap-2">
        {DAY_LABELS.map((label, i) => {
          const dayNum = i + 1; // 1=Mon … 5=Fri
          const isUnlocked = dayNum <= dailyCap;
          // A coupon for this day has been redeemed if its slot falls within claimedCount
          const wasClaimed = isUnlocked && dayNum <= claimedCount;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-2 rounded-full transition-all ${
                  wasClaimed
                    ? 'bg-status-success'
                    : isUnlocked
                    ? 'bg-app-accent'
                    : 'bg-app-surface-2 border border-app-border'
                }`}
              />
              <span
                className={`text-[9px] font-bold ${
                  isUnlocked ? 'text-app-primary' : 'text-app-muted'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-app-muted">
        {t('cafe.dailyCapLabel', { day: dailyCap, cap: dailyCap })}
      </div>
    </div>
  );
};

const EmployeeInfoCard = ({ employee, eligible }) => {
  const { t } = useTranslation();
  if (!employee) return null;

  const redeemableNow = employee.couponsRedeemableNow ?? employee.availableCoupons;
  const canIssue = eligible ?? (redeemableNow > 0 && !employee.claimedToday);

  return (
    <div className="surface-card overflow-hidden p-0">
      <div
        className={`px-6 py-4 flex justify-between items-center border-b ${
          canIssue ? 'alert-success border-0 rounded-none' : 'alert-warning border-0 rounded-none'
        }`}
      >
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
        <div className="flex items-center gap-2">
          <span className="badge">
            {t('cafe.redeemableToday')}: {redeemableNow}
          </span>
          <span className="text-[10px] text-current opacity-70">
            ({t('cafe.availableCount', { count: employee.availableCoupons })})
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Employee identity */}
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

        {/* Weekly accumulation tracker */}
        <WeekTracker
          dailyCap={employee.dailyCap ?? 0}
          claimedCount={(employee.weekBalance ?? 0) - (employee.availableCoupons ?? 0)}
        />
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
