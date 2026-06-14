import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getUsers, provisionUser } from '../services/user.service.js';
import { PageHeader, PageSkeleton, getRoleBadgeClass } from '../components/ui/Page.jsx';
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

  if (loading) return <PageSkeleton cards={0} />;

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-app-primary  tracking-tight">{t('users.title')}</h1>
          <p className="text-app-secondary text-sm font-medium">{t('users.subtitle')}</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 btn-primary px-5 py-3"
        >
          <Plus className="w-5 h-5" />
          <span>{t('users.provision')}</span>
        </button>
      </div>

      {/* Action alerts */}
      {(actionError || actionSuccess) && (
        <div className="max-w-2xl">
          {actionError && (
            <div className="alert-error">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="alert-success">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Directory Filter controls */}
      <div className="flex items-center gap-4 surface-card flex-wrap">
        <span className="text-xs font-bold text-app-secondary uppercase tracking-wider">{t('users.roleFilter')}:</span>
        <div className="flex gap-2">
          {['', 'ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF', 'EMPLOYEE'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-card text-xs font-medium transition-all cursor-pointer ${
                roleFilter === role
                  ? 'btn-primary py-1.5 min-h-0'
                  : 'btn-secondary py-1.5 min-h-0'
              }`}
            >
              {role === '' ? 'ALL' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="table-modern">
            <thead>
              <tr className="border-b border-app-border text-app-secondary font-bold">
                <th className="pb-3">{t('users.name')}</th>
                <th className="pb-3">{t('users.email')}</th>
                <th className="pb-3">{t('common.role')}</th>
                <th className="pb-3">Clearance Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-app-muted">No accounts match selected parameters</td>
                </tr>
              ) : (
                usersList.map((usr) => (
                  <tr key={usr.id} className="text-app-secondary hover:bg-app-surface-2/10">
                    <td className="py-3 font-semibold text-white">{usr.name}</td>
                    <td className="py-3">{usr.email}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getRoleBadgeClass(usr.role)}`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3 text-app-secondary">{new Date(usr.createdAt).toLocaleDateString()}</td>
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
          <div className="w-full max-w-md glass-card p-8 bg-app-surface border border-app-border">
            <h3 className="text-xl font-bold text-white  mb-6 flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-brand-500" />
              <span>Provision User Profile</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
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
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
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
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
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
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  Clearance Level Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="glass-input cursor-pointer"
                >
                  <option value="EMPLOYEE" className="bg-app-surface">EMPLOYEE (Student/Staff)</option>
                  <option value="CAFE_STAFF" className="bg-app-surface">CAFE_STAFF (Canteen Operator)</option>
                  <option value="HR" className="bg-app-surface">HR (Operations Planner)</option>
                  <option value="FINANCE" className="bg-app-surface">FINANCE (Finance Planner)</option>
                  <option value="ADMIN" className="bg-app-surface">ADMIN (Full Governance)</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-app-surface-2 hover:bg-app-surface-2 font-semibold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 btn-primary"
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
