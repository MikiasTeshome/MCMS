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
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  // Define full dashboard routes schema
  const menuItems = [
    {
      path: '/dashboard',
      label: t('common.dashboard') || 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'],
    },
    {
      path: '/coupons',
      label: t('common.coupons') || 'Coupons',
      icon: Ticket,
      roles: ['ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'],
    },
    {
      path: '/meals',
      label: t('common.meals') || 'Meals',
      icon: Utensils,
      roles: ['ADMIN', 'FINANCE'],
    },
    {
      path: '/employees',
      label: t('common.employees'),
      icon: UserCheck,
      roles: ['ADMIN', 'HR'],
    },
    {
      path: '/cafe-scanner',
      label: t('common.cafeScanner'),
      icon: QrCode,
      roles: ['ADMIN', 'CAFE_STAFF'],
    },
    {
      path: '/users',
      label: t('common.users') || 'Users',
      icon: UsersIcon,
      roles: ['ADMIN', 'HR'],
    },
    {
      path: '/audit-logs',
      label: t('common.auditLogs') || 'Audit Logs',
      icon: ShieldAlert,
      roles: ['ADMIN'],
    },
  ];

  // Filter links according to active user role
  const activeMenu = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={`w-64 bg-dark-900 border-r border-slate-800 flex flex-col h-full fixed inset-y-0 left-0 z-50 transform lg:static lg:translate-x-0 transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <span className="text-xl font-bold tracking-wider text-white flex items-center gap-2 font-display">
          <Ticket className="text-brand-500 w-6 h-6 animate-pulse-slow" />
          <span>MCMS</span>
        </span>
        {/* Mobile close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {activeMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-premium'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
