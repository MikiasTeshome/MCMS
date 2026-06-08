import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useTranslation } from 'react-i18next';
import { Languages, User as UserIcon, Menu } from 'lucide-react';

const Header = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language, changeLanguage } = useI18n();

  // Color mappings for role badges
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'HR':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
      case 'FINANCE':
        return 'bg-pink-500/10 text-pink-400 border border-pink-500/30';
      case 'CAFE_STAFF':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'EMPLOYEE':
      default:
        return 'bg-brand-500/10 text-brand-400 border border-brand-500/30';
    }
  };

  return (
    <header className="h-16 bg-dark-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 shadow-sm">
      {/* Search / Section indicator */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Toggle for Mobile */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm sm:text-lg font-semibold text-slate-300 Outfit truncate max-w-[150px] sm:max-w-none">
          {t('common.appTitle')}
        </h2>
      </div>

      {/* Control Actions (Bilingual and Profile Details) */}
      <div className="flex items-center gap-6">
        {/* Bilingual Language Selector */}
        <div className="flex items-center gap-2 bg-slate-950/40 rounded-xl px-3 py-1.5 border border-slate-800">
          <Languages className="w-4 h-4 text-slate-400" />
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-transparent text-sm text-slate-300 font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="en" className="bg-dark-900 text-slate-300">{t('common.langEn')}</option>
            <option value="am" className="bg-dark-900 text-slate-300">{t('common.langAm')}</option>
          </select>
        </div>

        {/* User context card */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.name}</div>
            <div className="text-xs text-slate-400 font-medium">{user?.email}</div>
          </div>

          <div className="flex flex-col gap-1 items-center">
            {/* Styled clearance role badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getRoleBadgeClass(user?.role)}`}>
              {t(`roles.${user?.role}`, { defaultValue: user?.role })}
            </span>
          </div>

          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserIcon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
