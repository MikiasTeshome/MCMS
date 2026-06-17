import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, RotateCcw, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

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
  const needsOverride = employee?.claimedToday && isAdmin;

  // Maximum quantity the employee may redeem today (backend-enforced cap)
  const maxQty = employee?.couponsRedeemableNow ?? employee?.availableCoupons ?? 0;

  const [quantity, setQuantity] = useState(1);

  // Reset to 1 whenever a new employee is loaded or the max changes
  useEffect(() => {
    setQuantity(Math.min(1, maxQty));
  }, [employee?.employeeId, maxQty]);

  const canIssue =
    maxQty > 0 &&
    (!employee?.claimedToday || (needsOverride && overrideReason?.trim()));

  const disabled =
    submitting ||
    !employee ||
    maxQty < 1 ||
    (employee.claimedToday && !isAdmin) ||
    (needsOverride && !overrideReason?.trim());

  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));
  const handleIncrement = () => setQuantity((q) => Math.min(maxQty, q + 1));
  const handleSetAll = () => setQuantity(maxQty);

  const handleIssue = () => {
    if (!disabled && onIssue) onIssue(quantity);
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-app-secondary">
        {t('cafe.issueCoupons')}
      </h3>

      {/* Daily accumulation cap info */}
      {employee && maxQty > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-app-surface-2/50 border border-app-border text-xs">
          <span className="text-app-muted font-medium">{t('cafe.redeemableToday')}</span>
          <span className="font-bold text-app-primary">
            {maxQty} / {employee.availableCoupons}
          </span>
        </div>
      )}

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

      {/* Quantity selector */}
      {!disabled && maxQty >= 1 && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-app-secondary block">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1 || submitting}
              className="w-10 h-10 rounded-xl border border-app-border bg-app-surface-2 flex items-center justify-center text-app-secondary hover:text-app-primary hover:border-app-primary disabled:opacity-30 transition-all"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex-1 text-center">
              <span className="text-3xl font-extrabold text-app-primary tabular-nums">
                {quantity}
              </span>
              <div className="text-[10px] text-app-muted mt-0.5">of {maxQty} available today</div>
            </div>

            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= maxQty || submitting}
              className="w-10 h-10 rounded-xl border border-app-border bg-app-surface-2 flex items-center justify-center text-app-secondary hover:text-app-primary hover:border-app-primary disabled:opacity-30 transition-all"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick-select dots */}
          {maxQty > 1 && (
            <div className="flex gap-1.5 justify-center pt-1">
              {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(n)}
                  disabled={submitting}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border ${
                    quantity === n
                      ? 'bg-app-accent border-app-accent text-white scale-110'
                      : 'border-app-border bg-app-surface-2 text-app-muted hover:border-app-accent hover:text-app-primary'
                  }`}
                  aria-label={`Set quantity to ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
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
          onClick={handleIssue}
          className="flex-2 btn-primary py-3"
        >
          <Coffee className="w-5 h-5" />
          {submitting
            ? t('cafe.issuing')
            : t('cafe.issueN', { count: quantity })}
        </button>
      </div>

      {!canIssue && maxQty === 0 && (
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
