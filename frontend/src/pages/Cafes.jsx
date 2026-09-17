import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Store, Plus, CheckCircle, ShieldAlert } from 'lucide-react';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import {
  getCampuses,
  createCampus,
  updateCampus,
  assignCampusVendor,
  getVendors,
  createVendor,
  updateVendor,
} from '../services/campus.service.js';

const Cafes = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [campuses, setCampuses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [campusName, setCampusName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [campusRes, vendorRes] = await Promise.all([getCampuses(), getVendors()]);
      setCampuses(campusRes.data || []);
      setVendors(vendorRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || t('cafes.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateCampus = async (e) => {
    e.preventDefault();
    if (!campusName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createCampus({ name: campusName.trim() });
      setCampusName('');
      setSuccess(t('cafes.added'));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('cafes.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createVendor({ name: vendorName.trim() });
      setVendorName('');
      setSuccess(t('cafes.vendorAdded'));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('cafes.vendorAddFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (campusId, vendorId) => {
    if (!vendorId) return;
    setSaving(true);
    setError('');
    try {
      await assignCampusVendor(campusId, vendorId);
      setSuccess(t('cafes.assigned'));
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('cafes.assignFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRenameCampus = async (campus, name) => {
    const next = String(name || '').trim();
    if (!next || next === campus.name) return;
    try {
      await updateCampus(campus.id, { name: next });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('cafes.renameFailed'));
    }
  };

  const handleRenameVendor = async (vendor, name) => {
    const next = String(name || '').trim();
    if (!next || next === vendor.name) return;
    try {
      await updateVendor(vendor.id, { name: next });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('cafes.vendorRenameFailed'));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-shell space-y-5">
      <div className="surface-card">
        <PageHeader
          title={t('cafes.title')}
          subtitle={t('cafes.subtitle')}
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="surface-card space-y-4">
          <h3 className="text-lg font-semibold text-app-primary flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('cafes.campuses')}
          </h3>
          <p className="text-sm text-app-muted">{t('cafes.campusHelp')}</p>
          <form onSubmit={handleCreateCampus} className="flex gap-2">
            <input
              className="glass-input"
              placeholder={t('cafes.campusName')}
              value={campusName}
              onChange={(e) => setCampusName(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={saving}>
              <Plus className="w-4 h-4" />
              {t('common.create')}
            </button>
          </form>
          <div className="space-y-3">
            {campuses.map((campus) => (
              <div key={campus.id} className="rounded-xl border border-app-border p-4 space-y-3">
                <input
                  defaultValue={campus.name}
                  className="glass-input text-sm font-semibold"
                  onBlur={(e) => handleRenameCampus(campus, e.target.value)}
                />
                <p className="text-xs text-app-muted">
                  {t('cafes.currentVendor')}: {campus.currentVendor?.name || t('cafes.none')}
                </p>
                <select
                  className="glass-input"
                  value={campus.currentVendor?.id || ''}
                  onChange={(e) => handleAssign(campus.id, e.target.value)}
                  disabled={saving}
                >
                  <option value="">{t('cafes.selectVendor')}</option>
                  {vendors
                    .filter((vendor) => vendor.isActive)
                    .map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card space-y-4">
          <h3 className="text-lg font-semibold text-app-primary flex items-center gap-2">
            <Store className="w-5 h-5" />
            {t('cafes.vendors')}
          </h3>
          <p className="text-sm text-app-muted">{t('cafes.vendorHelp')}</p>
          <form onSubmit={handleCreateVendor} className="flex gap-2">
            <input
              className="glass-input"
              placeholder={t('cafes.vendorName')}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={saving}>
              <Plus className="w-4 h-4" />
              {t('common.create')}
            </button>
          </form>
          <ul className="space-y-2">
            {vendors.map((vendor) => (
              <li key={vendor.id} className="rounded-xl border border-app-border p-4 space-y-2 text-sm">
                <input
                  key={`${vendor.id}-${vendor.name}`}
                  defaultValue={vendor.name}
                  className="glass-input text-sm font-semibold"
                  onBlur={(e) => handleRenameVendor(vendor, e.target.value)}
                />
                <div className="text-xs text-app-muted">
                  {vendor.assignments?.length
                    ? vendor.assignments.map((item) => item.campus?.name).join(', ')
                    : t('cafes.notAssigned')}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Cafes;
