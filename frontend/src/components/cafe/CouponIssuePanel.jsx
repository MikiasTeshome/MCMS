import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, RotateCcw, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { cafeBlockMessage } from '../../utils/cafeScanError.js';

/** Earned weekdays so far minus meals already taken this week. Never future days. */
const remainingEarnedMeals = (employee) => {
  const earned = Math.max(0, Number(employee?.dailyCap) || 0);
  const used = Math.max(0, Number(employee?.claimedThisWeek) || 0);
  const leftover = Math.max(0, earned - used);
  const fromApi = Number(employee?.couponsRedeemableNow);
  const capped = Number.isFinite(fromApi) ? Math.min(leftover, fromApi) : leftover;
  return Math.max(0, capped);
};

const CouponIssuePanel = ({
  employee,
  submitting,
  overrideReason,
  onOverrideReasonChange,
  onIssue,
  onRescan,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const maxQty = remainingEarnedMeals(employee);
  const leftoverDays = Math.max(0, maxQty - 1);
  const needsOverride = employee?.claimedToday && maxQty <= 0 && isAdmin;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [employee?.employeeId, maxQty]);

  const safeQty = Math.min(Math.max(1, qty), Math.max(1, maxQty));
  const canRecord =
    maxQty > 0 || (needsOverride && overrideReason?.trim());
  const amount = safeQty * 40;

  return (
    <div className="glass-card p-6 space-y-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-app-secondary">
        {t('cafe.recordMealTitle')}
      </h3>

      {employee && maxQty > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-app-surface-2/50 border border-app-border text-xs">
            <span className="text-app-muted font-medium">{t('cafe.unusedThisWeek')}</span>
            <span className="font-bold text-app-primary">{maxQty}</span>
          </div>
          <p className="text-[11px] text-app-muted px-1">{t('cafe.plusRuleHint', { leftover: leftoverDays, max: maxQty })}</p>

          {maxQty > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-app-border">
              <span className="text-xs font-medium text-app-secondary">{t('cafe.mealsToRecord')}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary !min-h-0 !py-1 !px-2"
                  disabled={safeQty <= 1 || submitting}
                  onClick={() => setQty(safeQty - 1)}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-app-primary">{safeQty}</span>
                <button
                  type="button"
                  className="btn-secondary !min-h-0 !py-1 !px-2"
                  disabled={safeQty >= maxQty || submitting}
                  onClick={() => setQty(Math.min(maxQty, safeQty + 1))}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="btn-secondary !min-h-0 !py-1 !px-3 text-xs"
                  disabled={submitting || safeQty === maxQty}
                  onClick={() => setQty(maxQty)}
                >
                  {t('cafe.useAll')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {needsOverride && (
        <div className="p-4 rounded-xl border border-app-border space-y-2">
          <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
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
        <button type="button" onClick={onRescan} className="flex-1 btn-secondary py-3">
          <RotateCcw className="w-4 h-4" />
          {t('cafe.scanNext')}
        </button>
        <button
          type="button"
          disabled={submitting || !canRecord}
          onClick={() => onIssue(safeQty)}
          className="flex-1 btn-primary py-3 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Coffee className="w-5 h-5" />
          {submitting
            ? t('cafe.issuing')
            : t('cafe.recordMealN', { mealCount: safeQty, amount })}
        </button>
      </div>

      {!canRecord && (
        <div className="alert alert-error text-sm text-center space-y-1">
          <p>
            {cafeBlockMessage(
              t,
              employee?.recordBlockReason ||
                (employee?.claimedToday && maxQty <= 0 ? 'CLAIMED_TODAY' : 'NO_BALANCE'),
              t('cafe.noMealsToday')
            )}
          </p>
          {employee?.claimedToday && maxQty <= 0 && isAdmin && (
            <p>{t('cafe.claimedContactAdmin')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CouponIssuePanel;
