import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getCoupons, issueCoupon, redeemCoupon } from '../services/coupon.service.js';
import { getUsers } from '../services/user.service.js';
import { getMeals } from '../services/meal.service.js';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-500">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white Outfit tracking-tight">{t('coupons.title')}</h1>
          <p className="text-slate-400 text-sm font-medium">{t('coupons.subtitle')}</p>
        </div>

        {/* Dynamic controls based on privileges */}
        {['ADMIN', 'HR'].includes(user?.role) && (
          <button
            onClick={() => setShowIssueModal(true)}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl shadow-premium hover:shadow-premium-hover transition-all duration-200 cursor-pointer"
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
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
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
            <h3 className="text-lg font-bold text-white Outfit flex items-center gap-2">
              <QrCode className="w-5 h-5 text-brand-500" />
              <span>{t('coupons.scanHeader')}</span>
            </h3>
            
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
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
                className="w-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold py-3 px-4 rounded-xl shadow-premium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
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
            <h3 className="text-lg font-bold text-white Outfit">{t('common.redeemed')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3">{t('coupons.code')}</th>
                    <th className="pb-3">{t('coupons.beneficiary')}</th>
                    <th className="pb-3">{t('coupons.meal')}</th>
                    <th className="pb-3">{t('coupons.redeemedAt')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-500">{t('coupons.noLogs')}</td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => (
                      <tr key={coupon.id} className="text-slate-300 hover:bg-slate-800/10">
                        <td className="py-3 font-semibold text-brand-400">{coupon.code}</td>
                        <td className="py-3">{coupon.beneficiary?.name}</td>
                        <td className="py-3">{localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.nameAm : coupon.meal?.nameEn}</td>
                        <td className="py-3 text-slate-400">
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
              <div className="col-span-full text-center py-12 text-slate-500">{t('coupons.noVouchers')}</div>
            ) : (
              coupons.map((coupon) => (
                <div key={coupon.id} className="glass-card relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 flex flex-col justify-between">
                  {/* Decorative Ticket cuts */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-dark-950 border border-slate-800 rounded-full"></div>
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-dark-950 border border-slate-800 rounded-full"></div>
                  
                  {/* Ticket Header */}
                  <div className="p-6 border-b border-dashed border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('coupons.mealVoucher')}</span>
                      {getStatusBadge(coupon.status)}
                    </div>
                    <h3 className="text-xl font-extrabold text-white Outfit mb-1">
                      {localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.nameAm : coupon.meal?.nameEn}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.descriptionAm : coupon.meal?.descriptionEn}
                    </p>
                  </div>

                  {/* Simulated QR block + Coupon Scan credentials */}
                  <div className="p-6 flex items-center gap-6 justify-between bg-slate-950/40">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Voucher Code</span>
                      <span className="text-lg font-black text-brand-400 tracking-wider block font-mono">{coupon.code}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
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
          <h3 className="text-lg font-bold text-white Outfit">All Coupons Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  <th className="pb-3">{t('coupons.code')}</th>
                  <th className="pb-3">{t('coupons.beneficiary')}</th>
                  <th className="pb-3">{t('coupons.meal')}</th>
                  <th className="pb-3">{t('common.status')}</th>
                  <th className="pb-3">{t('coupons.expires')}</th>
                  <th className="pb-3">{t('coupons.redeemedAt')}</th>
                  <th className="pb-3">{t('coupons.vendor')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-500">No coupons issued yet</td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id} className="text-slate-300 hover:bg-slate-800/10">
                      <td className="py-3 font-semibold text-brand-400">{coupon.code}</td>
                      <td className="py-3 font-medium text-white">{coupon.beneficiary?.name}</td>
                      <td className="py-3">
                        {localStorage.getItem('mcms_lang') === 'am' ? coupon.meal?.nameAm : coupon.meal?.nameEn}
                      </td>
                      <td className="py-3">{getStatusBadge(coupon.status)}</td>
                      <td className="py-3 text-slate-400">{new Date(coupon.expiresAt).toLocaleDateString()}</td>
                      <td className="py-3 text-slate-400">
                        {coupon.redeemedAt ? new Date(coupon.redeemedAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 text-slate-400">{coupon.vendor?.name || '-'}</td>
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
          <div className="w-full max-w-md glass-card p-8 bg-slate-900 border border-slate-800">
            <h3 className="text-xl font-bold text-white Outfit mb-6 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-brand-500" />
              <span>Issue New Coupon</span>
            </h3>

            <form onSubmit={handleIssue} className="space-y-4">
              
              {/* Select Beneficiary */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Select Beneficiary (Employee)
                </label>
                <select
                  required
                  value={issueData.beneficiaryId}
                  onChange={(e) => setIssueData({ ...issueData, beneficiaryId: e.target.value })}
                  className="glass-input cursor-pointer"
                >
                  <option value="" className="bg-dark-900">-- Choose Employee --</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id} className="bg-dark-900">{b.name} ({b.email})</option>
                  ))}
                </select>
              </div>

              {/* Select Meal Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Select Coupon Value / Config
                </label>
                <select
                  required
                  value={issueData.mealId}
                  onChange={(e) => setIssueData({ ...issueData, mealId: e.target.value })}
                  className="glass-input cursor-pointer"
                >
                  <option value="" className="bg-dark-900">-- Choose Pricing Model --</option>
                  {meals.map((m) => (
                    <option key={m.id} value={m.id} className="bg-dark-900">
                      {localStorage.getItem('mcms_lang') === 'am' ? m.nameAm : m.nameEn} (${parseFloat(m.price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiration date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
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
                  className="flex-1 bg-slate-800 hover:bg-slate-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold py-3 px-4 rounded-xl shadow-premium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
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
