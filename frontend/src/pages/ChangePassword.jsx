import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui/Page.jsx';
import { changePassword } from '../services/auth.service.js';

const ChangePassword = () => {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError(t('account.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('account.passwordMismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      setError(t('account.passwordSame'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      setSuccess(res.message || t('account.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || t('account.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell space-y-5 max-w-lg">
      <div className="surface-card">
        <PageHeader title={t('account.title')} subtitle={t('account.subtitle')} />
      </div>

      <form onSubmit={handleSubmit} className="surface-card form-stack">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="form-group">
          <label className="input-label" htmlFor="current-password">
            {t('account.currentPassword')}
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="glass-input"
          />
        </div>

        <div className="form-group">
          <label className="input-label" htmlFor="new-password">
            {t('account.newPassword')}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="glass-input"
          />
        </div>

        <div className="form-group">
          <label className="input-label" htmlFor="confirm-password">
            {t('account.confirmPassword')}
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="glass-input"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('common.loading') : t('account.submit')}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
