import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getCoupons, issueCoupon, redeemCoupon } from '../services/coupon.service.js';
import { getUsers } from '../services/user.service.js';
import { getMeals } from '../services/meal.service.js';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { Ticket, Plus, CheckCircle, ShieldAlert, Calendar, User as UserIcon, Utensils, QrCode } from 'lucide-react';

const Coupons = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [coupons, setCoupons] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueData, setIssueData] = useState({ beneficiaryId: '', mealId: '', expiresAt: '' });
  const [scanCode, setScanCode] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPageData = async () => {
    try {
      const couponsRes = await getCoupons();
      setCoupons(couponsRes.data || []);

      if (['ADMIN', 'HR'].includes(user?.role)) {
        const usersRes = await getUsers({ role: 'EMPLOYEE' });
        const mealsRes = await getMeals({ status: 'ACTIVE' });
        setBeneficiaries(usersRes.data || []);
        setMeals(mealsRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load coupons context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [user]);

  // Handle coupon issuance (ADMIN/MANAGER only)
  const handleIssue = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setProcessing(true);

    try {
      const res = await issueCoupon(
        issueData.beneficiaryId,
        issueData.mealId,
        issueData.expiresAt
      );
      if (res.success) {
        setActionSuccess(t('coupons.redeemSuccess')); // Standard success message
        setIssueData({ beneficiaryId: '', mealId: '', expiresAt: '' });
        setShowIssueModal(false);
        fetchPageData();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to issue coupon');
    } finally {
      setProcessing(false);
    }
  };

  // Handle coupon redemption (ADMIN/VENDOR only)
  const handleRedeem = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setProcessing(true);

    try {
      const res = await redeemCoupon(scanCode);
      if (res.success) {
        setActionSuccess(t('coupons.redeemSuccess') + ` (Code: ${res.data.code})`);
        setScanCode('');
        fetchPageData();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Redemption failed');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge-active">{t('common.active')}</span>;
      case 'REDEEMED': return <span className="badge-redeemed">{t('common.redeemed')}</span>;
      case 'EXPIRED': return <span className="badge-expired">{t('common.expired')}</span>;
      case 'VOID': default: return <span className="badge-void">{t('common.void')}</span>;
    }
  };

  if (loading) return <PageSkeleton cards={0} />;

  return (
    <div className="space-y-8">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-primary  tracking-tight">{t('coupons.title')}</h1>
          <p className="text-app-secondary text-sm font-medium">{t('coupons.subtitle')}</p>
        </div>

        {/* Dynamic controls based on privileges */}
        {['ADMIN', 'HR'].includes(user?.role) && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="btn-primary w-full sm:w-auto py-3"
          >
            <Plus className="w-5 h-5" />
            <span>{t('coupons.issueButton')}</span>
          </button>
        )}
      </div>

      {/* Success/Error alert notifications */}
      {(actionError || actionSuccess) && (
        <div className="max-w-2xl">
          {actionError && (
            <div className="alert-error">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="alert-success">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* VENDOR Scan Terminal Interface */}
      {['ADMIN', 'CAFE_STAFF'].includes(user?.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Scanning interface Form */}
          <div className="lg:col-span-1 glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-app-primary  flex items-center gap-2">
              <QrCode className="w-5 h-5 icon-accent" />
              <span>{t('coupons.scanHeader')}</span>
            </h3>
            
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  {t('coupons.enterCode')}
                </label>
                <input
                  type="text"
                  required
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                  placeholder="E.g., MCMS-2026-ACTIVE-QWER"
                  className="glass-input"
                />
              </div>

              <button
                type="submit"
                disabled={processing}
            className="btn-primary w-full"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>{t('coupons.submitRedemption')}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* VENDOR Recent validations logs */}
          <div className="lg:col-span-2 glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-app-primary ">{t('common.redeemed')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-app-secondary font-bold">
                    <th className="pb-3">{t('coupons.code')}</th>
                    <th className="pb-3">{t('coupons.beneficiary')}</th>
                    <th className="pb-3">{t('coupons.meal')}</th>
                    <th className="pb-3">{t('coupons.redeemedAt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-app-muted">{t('coupons.noLogs')}</td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon.id} className="text-app-secondary hover:bg-app-surface-2/10">
                        <td className="py-3 font-semibold text-app-primary">{coupon.code}</td>
                        <td className="py-3">{coupon.beneficiary?.name}</td>
                        <td className="py-3">{localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.nameAm : coupon.meal?.nameEn}</td>
                        <td className="py-3 text-app-secondary">
                          {coupon.redeemedAt ? new Date(coupon.redeemedAt).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* BENEFICIARY Digital Vouchers slips list */}
      {user?.role === 'EMPLOYEE' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coupons.length === 0 ? (
              <div className="col-span-full text-center py-12 text-app-muted">{t('coupons.noVouchers')}</div>
            ) : (
              coupons.map((coupon) => (
                <div key={coupon.id} className="glass-card relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 flex flex-col justify-between">
                  {/* Decorative Ticket cuts */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-app-bg border border-app-border rounded-full"></div>
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-app-bg border border-app-border rounded-full"></div>
                  
                  {/* Ticket Header */}
                  <div className="p-6 border-b border-dashed border-app-border">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-app-muted">{t('coupons.mealVoucher')}</span>
                      {getStatusBadge(coupon.status)}
                    </div>
                    <h3 className="text-xl font-semibold text-app-primary  mb-1">
                      {localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.nameAm : coupon.meal?.nameEn}
                    </h3>
                    <p className="text-xs text-app-secondary line-clamp-2">
                      {localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.descriptionAm : coupon.meal?.descriptionEn}
                    </p>
                  </div>

                  {/* Simulated QR block + Coupon Scan credentials */}
                  <div className="p-6 flex items-center gap-6 justify-between bg-app-surface-2/40">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted block">Voucher Code</span>
                      <span className="text-lg font-black text-app-primary tracking-wider block font-mono">{coupon.code}</span>
                      <span className="text-[10px] text-app-secondary flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expires: {new Date(coupon.expiresAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {/* Simulating QR block */}
                    {coupon.status === 'ACTIVE' && (
                      <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex items-center justify-center flex-shrink-0">
                        <QrCode className="w-full h-full text-dark-950" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADMIN/MANAGER Unified Table lists */}
      {['ADMIN', 'HR'].includes(user?.role) && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-app-primary ">All Coupons Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-app-border text-app-secondary font-bold">
                  <th className="pb-3">{t('coupons.code')}</th>
                  <th className="pb-3">{t('coupons.beneficiary')}</th>
                  <th className="pb-3">{t('coupons.meal')}</th>
                  <th className="pb-3">{t('common.status')}</th>
                  <th className="pb-3">{t('coupons.expires')}</th>
                  <th className="pb-3">{t('coupons.redeemedAt')}</th>
                  <th className="pb-3">{t('coupons.vendor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/60">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-app-muted">No coupons issued yet</td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id} className="text-app-secondary hover:bg-app-surface-2/10">
                      <td className="py-3 font-semibold text-app-primary">{coupon.code}</td>
                      <td className="py-3 font-medium text-white">{coupon.beneficiary?.name}</td>
                      <td className="py-3">
                        {localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.nameAm : coupon.meal?.nameEn}
                      </td>
                      <td className="py-3">{getStatusBadge(coupon.status)}</td>
                      <td className="py-3 text-app-secondary">{new Date(coupon.expiresAt).toLocaleDateString()}</td>
                      <td className="py-3 text-app-secondary">
                        {coupon.redeemedAt ? new Date(coupon.redeemedAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 text-app-secondary">{coupon.vendor?.name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocation / Issuance dialog box */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card p-8 bg-app-surface border border-app-border">
            <h3 className="text-xl font-semibold text-app-primary  mb-6 flex items-center gap-2">
              <Ticket className="w-5 h-5 icon-accent" />
              <span>Issue New Coupon</span>
            </h3>

            <form onSubmit={handleIssue} className="space-y-4">
              
              {/* Select Beneficiary */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  Select Beneficiary (Employee)
                </label>
                <select
                  required
                  value={issueData.beneficiaryId}
                  onChange={(e) => setIssueData({ ...issueData, beneficiaryId: e.target.value })}
                  className="glass-input cursor-pointer"
                >
                  <option value="" className="bg-app-surface">-- Choose Employee --</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id} className="bg-app-surface">{b.name} ({b.email})</option>
                  ))}
                </select>
              </div>

              {/* Select Meal Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  Select Coupon Value / Config
                </label>
                <select
                  required
                  value={issueData.mealId}
                  onChange={(e) => setIssueData({ ...issueData, mealId: e.target.value })}
                  className="glass-input cursor-pointer"
                >
                  <option value="" className="bg-app-surface">-- Choose Pricing Model --</option>
                  {meals.map((m) => (
                    <option key={m.id} value={m.id} className="bg-app-surface">
                      {localStorage.getItem('mcms_lang') === 'am' ? m.nameAm : m.nameEn} (${parseFloat(m.price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiration date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  Expiration Date
                </label>
                <input
                  type="date"
                  required
                  value={issueData.expiresAt}
                  onChange={(e) => setIssueData({ ...issueData, expiresAt: e.target.value })}
                  className="glass-input"
                />
              </div>

              {/* Form buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 bg-app-surface-2 hover:bg-app-surface-2 font-semibold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 btn-primary"
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <span>Issue Voucher</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Coupons;
