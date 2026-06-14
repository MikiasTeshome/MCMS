import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Languages, User as UserIcon, Menu, Search, Sun, Moon, ChevronDown } from 'lucide-react';

const Header = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language, changeLanguage } = useI18n();
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="app-header">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button onClick={onMenuToggle} className="lg:hidden btn-icon" aria-label="Open navigation menu">
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex flex-1">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search')}
              aria-label={t('common.search')}
              className="search-field w-full"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={toggleTheme} className="btn-icon" aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}>
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-app-border bg-app-surface">
          <Languages className="w-3.5 h-3.5 text-app-muted" aria-hidden="true" />
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label="Language"
            className="bg-transparent text-xs text-app-secondary font-medium focus:outline-none cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="am">AM</option>
          </select>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 pl-3 border-l border-app-border cursor-pointer rounded-card py-1"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-app-primary leading-tight">{user?.name}</div>
              <div className="text-[11px] text-app-muted">{user?.email}</div>
            </div>
            <div className="avatar w-9 h-9">
              <UserIcon className="w-4 h-4" aria-hidden="true" />
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-app-muted hidden sm:block transition-transform duration-fast ${profileOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 surface-card p-2 animate-slide-up !p-2" role="menu">
              <div className="px-3 py-2.5 border-b border-app-border mb-1">
                <p className="text-sm font-medium text-app-primary">{user?.name}</p>
                <p className="text-xs text-app-muted truncate">{user?.email}</p>
              </div>
              <span className="badge mx-3 my-2">{t(`roles.${user?.role}`, { defaultValue: user?.role })}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
