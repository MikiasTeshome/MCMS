import React from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const CouponIssuePanel = ({
  employee,
  submitting,
  overrideReason,
  onOverrideReasonChange,
  onIssueOne,
  onIssueAll,
  onRescan,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const needsOverride = employee?.claimedToday && isAdmin;
  const canIssue =
    employee?.availableCoupons > 0 &&
    (!employee?.claimedToday || (needsOverride && overrideReason?.trim()));

  const disabled =
    submitting ||
    !employee ||
    employee.availableCoupons < 1 ||
    (employee.claimedToday && !isAdmin) ||
    (needsOverride && !overrideReason?.trim());

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-app-secondary">
        {t('cafe.issueCoupons')}
      </h3>

      {needsOverride && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
          <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            {t('cafe.overrideReason')}
          </label>
          <textarea
            required
            value={overrideReason}
            onChange={(e) => onOverrideReasonChange(e.target.value)}
            placeholder={t('cafe.overridePlaceholder')}
            className="glass-input h-20 text-xs w-full"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onRescan}
          className="flex-1 btn-secondary py-3"
        >
          <RotateCcw className="w-4 h-4" />
          {t('cafe.scanNext')}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onIssueOne}
          className="flex-1 btn-primary"
        >
          <Coffee className="w-5 h-5" />
          {submitting ? t('cafe.issuing') : t('cafe.issueOne')}
        </button>
        <button
          type="button"
          disabled={disabled || employee.availableCoupons < 2}
          onClick={onIssueAll}
          className="flex-1 btn-success"
        >
          <Coffee className="w-5 h-5" />
          {submitting
            ? t('cafe.issuing')
            : t('cafe.issueAll', { count: employee?.availableCoupons || 0 })}
        </button>
      </div>

      {!canIssue && employee?.availableCoupons === 0 && (
        <p className="text-xs text-app-muted text-center">{t('cafe.noCouponsToIssue')}</p>
      )}
      {employee?.claimedToday && !isAdmin && (
        <p className="text-xs text-amber-400/90 text-center">
          {t('cafe.claimedContactAdmin')}
        </p>
      )}
    </div>
  );
};

export default CouponIssuePanel;
