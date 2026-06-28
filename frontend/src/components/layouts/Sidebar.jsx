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
        ${collapsed ? 'sidebar-collapsed w-sidebar-collapsed' : 'w-sidebar'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={{ transition: 'width 200ms ease, transform 200ms ease' }}
    >
      <div className={`sidebar-brand ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
          <span className="sidebar-label sidebar-brand-name text-base font-semibold">
            MCMS
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden btn-icon sidebar-close-btn shrink-0"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Sidebar menu">
        {activeMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={({ isActive }) => (isActive ? 'nav-link-active nav-link' : 'nav-link')}
            >
              <Icon className="nav-link-icon" aria-hidden="true" />
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t shrink-0 overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex nav-link w-full sidebar-footer-btn"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="nav-link-icon" />
          ) : (
            <PanelLeftClose className="nav-link-icon" />
          )}
          <span className="sidebar-label">{t('common.collapse')}</span>
        </button>
        <button
          onClick={logout}
          className="nav-link w-full sidebar-footer-btn mt-1"
          aria-label={t('common.logout')}
        >
          <LogOut className="nav-link-icon" aria-hidden="true" />
          <span className="sidebar-label">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
