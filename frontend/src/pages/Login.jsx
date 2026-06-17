import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Languages, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const Login = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { language, changeLanguage } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const showSeedCredentials = import.meta.env.DEV;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) navigate('/dashboard');
    } catch {
      setErrorMsg(t('login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-4">
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <button onClick={toggleTheme} className="btn-icon border border-app-border" aria-label="Toggle theme">
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-app-border bg-app-surface">
          <Languages className="w-3.5 h-3.5 text-app-muted" />
          <select value={language} onChange={(e) => changeLanguage(e.target.value)} className="bg-transparent text-xs text-app-secondary focus:outline-none cursor-pointer">
            <option value="en">EN</option>
            <option value="am">AM</option>
          </select>
        </div>
      </div>

      <div className="w-full max-w-md surface-card animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="Tafari Makonnen Polytechnic College" className="h-20 w-auto object-contain mb-4" />
          <h1 className="page-title mb-1">{t('login.title')}</h1>
          <p className="page-subtitle !mt-1">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          {errorMsg && (
            <div className="alert-error">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label className="input-label">{t('login.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@system.com" className="input-field pl-10" />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">{t('login.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3 mt-2">
            {submitting ? <div className="spinner h-5 w-5" /> : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{t('login.button')}</span>
              </>
            )}
          </button>
        </form>

        {showSeedCredentials && (
          <div className="mt-8 pt-6 border-t border-app-border text-center">
            <p className="section-label mb-3">Seed Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-app-muted">
              <div>Admin: <span className="text-app-secondary">admin@system.com</span></div>
              <div>Cafe: <span className="text-app-secondary">cafe@system.com</span></div>
              <div>HR: <span className="text-app-secondary">hr@system.com</span></div>
              <div>Employee: <span className="text-app-secondary">emp1@system.com</span></div>
              <div className="col-span-2 mt-1">Password: <span className="text-app-primary font-medium">Password123!</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
