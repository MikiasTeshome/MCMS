import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Ticket,
  Utensils,
  Users as UsersIcon,
  ShieldAlert,
  LogOut,
  QrCode,
  UserCheck,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', label: t('common.dashboard'), icon: LayoutDashboard, roles: ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'] },
    { path: '/coupons', label: t('common.coupons'), icon: Ticket, roles: ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'] },
    { path: '/meals', label: t('common.meals'), icon: Utensils, roles: ['ADMIN', 'FINANCE'] },
    { path: '/employees', label: t('common.employees'), icon: UserCheck, roles: ['ADMIN', 'HR'] },
    { path: '/cafe-scanner', label: t('common.cafeScanner'), icon: QrCode, roles: ['ADMIN', 'CAFE_STAFF'] },
    { path: '/users', label: t('common.users'), icon: UsersIcon, roles: ['ADMIN', 'HR'] },
    { path: '/audit-logs', label: t('common.auditLogs'), icon: ShieldAlert, roles: ['ADMIN'] },
  ];

  const activeMenu = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <aside
      aria-label="Main navigation"
      className={`app-sidebar flex flex-col h-full fixed inset-y-0 left-0 z-50
        transform lg:static lg:translate-x-0 ease-out
        ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={{ transition: 'width 200ms ease, transform 200ms ease' }}
    >
      <div
        className={`flex items-center border-b border-app-border shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}
        style={{ height: 'var(--header-height)', borderColor: 'var(--color-border)' }}
      >
        {!collapsed ? (
          <span className="text-base font-semibold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-card logo-mark flex items-center justify-center">
              <Ticket className="w-4 h-4" aria-hidden="true" />
            </div>
            <span>MCMS</span>
          </span>
        ) : (
          <div className="w-8 h-8 rounded-card logo-mark flex items-center justify-center">
            <Ticket className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <button onClick={() => setIsOpen(false)} className="lg:hidden btn-icon text-white/70 hover:text-white hover:bg-white/5" aria-label="Close navigation">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto" aria-label="Sidebar menu">
        {activeMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={({ isActive }) =>
                `${isActive ? 'nav-link-active' : 'nav-link'} ${collapsed ? 'justify-center px-2.5' : ''}`
              }
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={onToggleCollapse}
          className={`hidden lg:flex nav-link w-full text-white/70 hover:text-white ${collapsed ? 'justify-center px-2.5' : ''}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
          {!collapsed && <span>{t('common.collapse')}</span>}
        </button>
        <button
          onClick={logout}
          className={`nav-link w-full text-white/70 hover:text-white mt-1 ${collapsed ? 'justify-center px-2.5' : ''}`}
          aria-label={t('common.logout')}
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          {!collapsed && <span>{t('common.logout')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
