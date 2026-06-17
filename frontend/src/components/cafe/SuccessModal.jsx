import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, User, Coffee, Landmark, ArrowRight } from 'lucide-react';

const SuccessModal = ({
  isOpen,
  employeeName,
  issuedCount,
  remainingCoupons,
  onConfirm,
  autoCloseTimeout = 3000,
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(Math.ceil(autoCloseTimeout / 1000));

  useEffect(() => {
    if (!isOpen) return;
    
    // Reset timer
    setTimeLeft(Math.ceil(autoCloseTimeout / 1000));

    // Decr timer every second
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto close timeout
    const closeTimeout = setTimeout(() => {
      onConfirm();
    }, autoCloseTimeout);

    // Keyboard listener for Enter or Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timerInterval);
      clearTimeout(closeTimeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, autoCloseTimeout, onConfirm]);

  if (!isOpen) return null;

  // Calculate progress bar percent (shrinks to 0)
  const durationSec = autoCloseTimeout / 1000;
  const progressPercent = (timeLeft / durationSec) * 100;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md bg-app-surface border border-app-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Animated Green Checkmark Ring */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 animate-pulse">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight mb-6">
          {t('cafe.issueSuccessTitle')}
        </h3>

        {/* Details card */}
        <div className="w-full bg-app-surface-2 border border-app-border/60 rounded-xl p-4 mb-6 text-left space-y-3">
          {/* Employee name */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-app-surface/60 flex items-center justify-center text-app-secondary border border-app-border">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-app-muted">
                {t('cafe.issuedTo')}
              </div>
              <div className="text-sm font-semibold text-white">
                {employeeName}
              </div>
            </div>
          </div>

          <div className="h-px bg-app-border/40" />

          {/* Number of coupons issued */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-app-surface/60 flex items-center justify-center text-app-secondary border border-app-border">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-app-muted">
                  {t('cafe.couponsIssued')}
                </div>
                <div className="text-sm font-semibold text-white">
                  {issuedCount}
                </div>
              </div>
            </div>
            
            {/* Visual count badges */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(issuedCount, 5) }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>

          <div className="h-px bg-app-border/40" />

          {/* Remaining coupons */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-app-surface/60 flex items-center justify-center text-app-secondary border border-app-border">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-app-muted">
                {t('cafe.remainingCoupons')}
              </div>
              <div className="text-sm font-semibold text-white">
                {remainingCoupons}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button & Countdown */}
        <div className="w-full space-y-4">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
          >
            <span>{t('cafe.confirmReset')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-[11px] text-app-muted font-medium">
            {t('cafe.autoResetting', { seconds: timeLeft })}
          </div>
        </div>

        {/* Shrinking progress bar indicator at the very bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-app-border/40">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
