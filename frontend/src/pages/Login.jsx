import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { Ticket, Mail, Lock, Languages, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const Login = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { language, changeLanguage } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(t('login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial bg-gradient-to-tr from-dark-950 via-slate-900 to-dark-950 px-4 relative overflow-hidden">
      
      {/* Dynamic Background Glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>

      {/* Floating Bilingual Lang Selector */}
      <div className="absolute top-6 right-6">
        <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md rounded-xl px-3 py-1.5 border border-slate-800">
          <Languages className="w-4 h-4 text-slate-400" />
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-transparent text-sm text-slate-300 font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value="en" className="bg-dark-900 text-slate-300">{t('common.langEn')}</option>
            <option value="am" className="bg-dark-900 text-slate-300">{t('common.langAm')}</option>
          </select>
        </div>
      </div>

      {/* Main Glass Login Card */}
      <div className="w-full max-w-md glass-card p-8 md:p-10 relative z-10">
        
        {/* Core Brand Details */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/30 rounded-2xl flex items-center justify-center text-brand-400 mb-4 shadow-premium">
            <Ticket className="w-8 h-8 animate-pulse-slow" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display mb-2">
            {t('login.title')}
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email input field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {t('login.email')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@system.com"
                className="glass-input pl-11"
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {t('login.password')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input pl-11"
              />
            </div>
          </div>

          {/* Login Action Trigger Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold py-3.5 px-4 rounded-xl shadow-premium hover:shadow-premium-hover transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-8"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>{t('login.button')}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Footnote helper (optional but incredibly useful for dev) */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">
            Seed Credentials
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <div>Admin: <span className="text-slate-300">admin@system.com</span></div>
            <div>Cafe Staff: <span className="text-slate-300">cafe@system.com</span></div>
            <div>HR Manager: <span className="text-slate-300">hr@system.com</span></div>
            <div>Employee: <span className="text-slate-300">emp1@system.com</span></div>
            <div className="col-span-2 mt-1">Password: <span className="text-brand-400 font-semibold">Password123!</span></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
