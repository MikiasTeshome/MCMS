import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getUsers, provisionUser } from '../services/user.service.js';
import { Users as UsersIcon, Plus, CheckCircle, ShieldAlert, Key } from 'lucide-react';

const Users = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [usersList, setUsersList] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'EMPLOYEE' });
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await getUsers({ role: roleFilter });
      setUsersList(res.data || []);
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setProcessing(true);

    try {
      const res = await provisionUser(userForm);
      if (res.success) {
        setActionSuccess(`Account successfully provisioned for ${res.data.name}!`);
        setShowAddModal(false);
        setUserForm({ email: '', password: '', name: '', role: 'EMPLOYEE' });
        fetchUsers();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Provisioning failed');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'HR': return 'bg-purple-500/10 text-purple-400 border border-purple-500/30';
      case 'FINANCE': return 'bg-pink-500/10 text-pink-400 border border-pink-500/30';
      case 'CAFE_STAFF': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      case 'EMPLOYEE': default: return 'bg-brand-500/10 text-brand-400 border border-brand-500/30';
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
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white Outfit tracking-tight">{t('users.title')}</h1>
          <p className="text-slate-400 text-sm font-medium">{t('users.subtitle')}</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl shadow-premium hover:shadow-premium-hover transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>{t('users.provision')}</span>
        </button>
      </div>

      {/* Action alerts */}
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

      {/* Directory Filter controls */}
      <div className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('users.roleFilter')}:</span>
        <div className="flex gap-2">
          {['', 'ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleFilter === role
                  ? 'bg-brand-500 text-white shadow-premium'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {role === '' ? 'ALL' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="pb-3">{t('users.name')}</th>
                <th className="pb-3">{t('users.email')}</th>
                <th className="pb-3">{t('common.role')}</th>
                <th className="pb-3">Clearance Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-500">No accounts match selected parameters</td>
                </tr>
              ) : (
                usersList.map((usr) => (
                  <tr key={usr.id} className="text-slate-300 hover:bg-slate-800/10">
                    <td className="py-3 font-semibold text-white">{usr.name}</td>
                    <td className="py-3">{usr.email}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getRoleBadgeClass(usr.role)}`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{new Date(usr.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card p-8 bg-slate-900 border border-slate-800">
            <h3 className="text-xl font-bold text-white Outfit mb-6 flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-brand-500" />
              <span>Provision User Profile</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Full Account Name
                </label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="E.g., John Doe"
                  className="glass-input"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@system.com"
                  className="glass-input"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Security Passcode
                </label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="glass-input"
                />
              </div>

              {/* Privilege Role */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Clearance Level Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="glass-input cursor-pointer"
                >
                  <option value="EMPLOYEE" className="bg-dark-900">EMPLOYEE (Student/Staff)</option>
                  <option value="CAFE_STAFF" className="bg-dark-900">CAFE_STAFF (Canteen Operator)</option>
                  <option value="HR" className="bg-dark-900">HR (Operations Planner)</option>
                  <option value="FINANCE" className="bg-dark-900">FINANCE (Finance Planner)</option>
                  <option value="ADMIN" className="bg-dark-900">ADMIN (Full Governance)</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                    <span>Create User</span>
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

export default Users;
