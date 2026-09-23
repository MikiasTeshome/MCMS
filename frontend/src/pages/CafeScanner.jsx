import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Coffee, CheckCircle, MapPin } from 'lucide-react';
import QRScanner from '../components/cafe/QRScanner.jsx';
import EmployeeInfoCard from '../components/cafe/EmployeeInfoCard.jsx';
import CouponIssuePanel from '../components/cafe/CouponIssuePanel.jsx';
import ScanNotification from '../components/cafe/ScanNotification.jsx';
import SuccessModal from '../components/cafe/SuccessModal.jsx';
import { scanEmployeeQr, issueCoupons, getDeskStatus } from '../services/couponScan.service.js';
import { cafeApiErrorMessage, cafeBlockMessage } from '../utils/cafeScanError.js';
import { remainingEarnedMeals } from '../utils/cafeRedeemable.js';

const CafeScanner = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [desk, setDesk] = useState(null);
  const [successData, setSuccessData] = useState({
    employeeName: '',
    issuedCount: 0,
    remainingCoupons: 0,
  });

  const issueSectionRef = useRef(null);
  const issueLockRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const loadDesk = async () => {
      try {
        const res = await getDeskStatus();
        if (!cancelled && res.success) setDesk(res.data);
      } catch {
        if (!cancelled) setDesk(null);
      }
    };
    loadDesk();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!employee || loading) return;

    const frame = requestAnimationFrame(() => {
      issueSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [employee?.employeeId, loading]);

  const handleScanPayload = async (payload) => {
    setLoading(true);
    setApiError('');
    setSuccessMsg('');
    setOverrideReason('');

    try {
      const res = await scanEmployeeQr(payload);
      if (res.success) {
        setEmployee(res.data);
        if (res.data.recordBlockReason && res.data.couponsRedeemableNow <= 0) {
          setApiError(cafeBlockMessage(t, res.data.recordBlockReason, t('cafe.cannotRecordYet')));
        }
      } else {
        setApiError(res.message || t('cafe.scanFailed'));
        setEmployee(null);
      }
    } catch (err) {
      setApiError(cafeApiErrorMessage(err, t, 'cafe.verifyFailed'));
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (quantity) => {
    if (!employee?.employeeId || issueLockRef.current) return;
    issueLockRef.current = true;

    setSubmitting(true);
    setApiError('');
    setSuccessMsg('');

    try {
      const res = await issueCoupons({
        employeeId: employee.employeeId,
        quantity: Number(quantity) || 1,
        overrideReason:
          employee.claimedToday && remainingEarnedMeals(employee) <= 0
            ? overrideReason
            : undefined,
      });
      if (res.success) {
        const issuedCount = Number(res.data.issuedCount) || 0;
        const remainingCoupons = res.data.remainingCoupons ?? 0;
        const remainingRedeemableNow = Math.max(
          0,
          Math.min(
            remainingCoupons,
            typeof res.data.remainingRedeemableNow === 'number'
              ? res.data.remainingRedeemableNow
              : (Number(employee.dailyCap) || 0) -
                (Number(employee.claimedThisWeek) || 0) -
                issuedCount
          )
        );
        setEmployee((prev) =>
          prev
            ? {
                ...prev,
                claimedToday: true,
                availableCoupons: remainingCoupons,
                claimedThisWeek: (Number(prev.claimedThisWeek) || 0) + issuedCount,
                couponsRedeemableNow: remainingRedeemableNow,
                recordBlockReason:
                  remainingRedeemableNow > 0
                    ? null
                    : remainingCoupons > 0
                    ? 'NO_BALANCE'
                    : 'CLAIMED_TODAY',
              }
            : prev
        );
        setSuccessData({
          employeeName: employee.fullName,
          issuedCount: res.data.issuedCount,
          remainingCoupons: remainingRedeemableNow,
        });
        setDesk((prev) => {
          if (!prev?.today) return prev;
          const nextCount = (Number(prev.today.count) || 0) + issuedCount;
          return {
            ...prev,
            today: { count: nextCount, amount: nextCount * 40 },
          };
        });
        setShowSuccessModal(true);
      }
    } catch (err) {
      setApiError(cafeApiErrorMessage(err, t, 'cafe.issueFailed'));
    } finally {
      issueLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleConfirmSuccess = () => {
    setShowSuccessModal(false);
    const leftover = Math.min(
      remainingEarnedMeals(employee),
      Number(successData.remainingCoupons) || 0
    );
    if (leftover <= 0) {
      handleRescan();
    }
  };

  const handleRescan = () => {
    setEmployee(null);
    setApiError('');
    setSuccessMsg('');
    setOverrideReason('');
  };

  const eligible = remainingEarnedMeals(employee) > 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-app-primary  tracking-tight">
          {t('cafe.title')}
        </h1>
        <p className="text-app-secondary text-sm font-medium">{t('cafe.subtitle')}</p>
        <div className="mt-3 rounded-xl border border-app-border px-4 py-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t('cafe.thisDesk')}</p>
          <p className="text-sm font-semibold text-app-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
            {desk?.campus?.name || user?.campus?.name || (user?.role === 'CAFE_STAFF' ? t('cafe.campusMissing') : t('cafe.thisDesk'))}
            {desk?.vendor?.name ? ` · ${desk.vendor.name}` : employee?.vendor?.name ? ` · ${employee.vendor.name}` : ''}
          </p>
          {desk?.code === 'NO_VENDOR' || (desk && !desk.vendor && user?.role === 'CAFE_STAFF') ? (
            <p className="text-xs text-amber-700">{t('cafe.vendorUnknown')}</p>
          ) : null}
          {desk?.today ? (
            <p className="text-sm text-app-secondary">
              {t('cafe.todayAtDesk')}: {Number(desk.today.count || 0).toLocaleString()} · {Number(desk.today.amount || 0).toLocaleString()} {t('common.birr')}
            </p>
          ) : null}
        </div>
        {user?.role === 'CAFE_STAFF' && !user?.campus?.name && !desk?.campus?.name ? (
          <p className="alert-error mt-3">
            {t('cafe.campusMissing')}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <QRScanner
            onScan={handleScanPayload}
            scanPaused={loading || submitting || showSuccessModal || Boolean(employee)}
            pausedLabel={t('cafe.cameraPausedForRecord')}
          />
        </div>

        <div className="lg:col-span-7 space-y-6">
          {apiError && (
            <ScanNotification type="error" message={apiError} onDismiss={() => setApiError('')} />
          )}
          {successMsg && (
            <ScanNotification
              type="success"
              message={successMsg}
              onDismiss={() => setSuccessMsg('')}
            />
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-app-secondary text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>{t('cafe.auditRecorded')}</span>
            </div>
          )}

          {employee ? (
            <>
              <EmployeeInfoCard employee={employee} eligible={eligible} />
              <div
                ref={issueSectionRef}
                id="cafe-issue-panel"
                className="scroll-mt-20"
              >
                <CouponIssuePanel
                  employee={employee}
                  submitting={submitting || showSuccessModal}
                  overrideReason={overrideReason}
                  onOverrideReasonChange={setOverrideReason}
                  onIssue={handleIssue}
                  onRescan={handleRescan}
                />
              </div>
            </>
          ) : (
            <div className="glass-card py-20 px-6 flex flex-col items-center justify-center text-center gap-4 border-dashed border-2 border-app-border">
              <div className="w-16 h-16 bg-app-surface rounded-full flex items-center justify-center text-app-muted border border-app-border">
                <Coffee className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-app-primary">{t('cafe.readyTitle')}</h4>
                <p className="text-sm text-app-muted max-w-sm mt-1 mx-auto">
                  {t('cafe.readyBody')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        employeeName={successData.employeeName}
        issuedCount={successData.issuedCount}
        remainingCoupons={successData.remainingCoupons}
        onConfirm={handleConfirmSuccess}
        autoCloseTimeout={3000}
      />
    </div>
  );
};

export default CafeScanner;
