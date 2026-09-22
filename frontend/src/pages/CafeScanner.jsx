import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Coffee, CheckCircle } from 'lucide-react';
import QRScanner from '../components/cafe/QRScanner.jsx';
import EmployeeInfoCard from '../components/cafe/EmployeeInfoCard.jsx';
import CouponIssuePanel from '../components/cafe/CouponIssuePanel.jsx';
import ScanNotification from '../components/cafe/ScanNotification.jsx';
import SuccessModal from '../components/cafe/SuccessModal.jsx';
import { scanEmployeeQr, issueCoupons } from '../services/couponScan.service.js';

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
  const [successData, setSuccessData] = useState({
    employeeName: '',
    issuedCount: 0,
    remainingCoupons: 0,
  });

  const issueSectionRef = useRef(null);

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
      } else {
        setApiError(res.message || t('cafe.scanFailed'));
        setEmployee(null);
      }
    } catch (err) {
      setApiError(err.response?.data?.message || t('cafe.verifyFailed'));
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (quantity) => {
    if (!employee?.employeeId) return;

    setSubmitting(true);
    setApiError('');
    setSuccessMsg('');

    try {
      const res = await issueCoupons({
        employeeId: employee.employeeId,
        quantity: Number(quantity) || 1,
        overrideReason:
          employee.claimedToday &&
          (employee.couponsRedeemableNow ?? employee.availableCoupons ?? 0) <= 0
            ? overrideReason
            : undefined,
      });
      if (res.success) {
        const remainingCoupons = res.data.remainingCoupons ?? 0;
        const remainingRedeemableNow =
          res.data.remainingRedeemableNow ?? remainingCoupons;
        setEmployee((prev) =>
          prev
            ? {
                ...prev,
                claimedToday: true,
                availableCoupons: remainingCoupons,
                claimedThisWeek:
                  (Number(prev.claimedThisWeek) || 0) + (Number(res.data.issuedCount) || 0),
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
        setShowSuccessModal(true);
      }
    } catch (err) {
      setApiError(err.response?.data?.message || t('cafe.issueFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSuccess = () => {
    setShowSuccessModal(false);
    const leftover = Math.max(
      0,
      (Number(employee?.dailyCap) || 0) - (Number(employee?.claimedThisWeek) || 0)
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

  const eligible =
    employee &&
    Math.max(0, (Number(employee.dailyCap) || 0) - (Number(employee.claimedThisWeek) || 0)) > 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-app-primary  tracking-tight">
          {t('cafe.title')}
        </h1>
        <p className="text-app-secondary text-sm font-medium">{t('cafe.subtitle')}</p>
        {user?.campus?.name ? (
          <p className="text-sm text-app-secondary mt-2">
            {user.campus.name}
            {employee?.vendor?.name ? ` · ${employee.vendor.name}` : ''}
          </p>
        ) : user?.role === 'CAFE_STAFF' ? (
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
                  submitting={submitting}
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
