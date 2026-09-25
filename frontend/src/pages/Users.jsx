import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCalendar } from '../context/CalendarContext.jsx';
import { useTranslation } from 'react-i18next';
import { getUsers, provisionUser, resetUserPassword, updateUser } from '../services/user.service.js';
import { getCampuses } from '../services/campus.service.js';
import { PageHeader, PageSkeleton, getRoleBadgeClass } from '../components/ui/Page.jsx';
import { ModalOverlay } from '../components/ui/Modal.jsx';
import { Users as UsersIcon, Plus, CheckCircle, ShieldAlert, Key, Pencil } from 'lucide-react';
import { formatCalendarDate } from '../utils/ethiopianDate.js';

const Users = () => {
  const { user } = useAuth();
  const { calendarMode } = useCalendar();
  const { t } = useTranslation();

  const [usersList, setUsersList] = useState([]);
  const [pageMeta, setPageMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [loading, setLoading] = useState(true);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'HR', campusId: '' });
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const fetchUsers = async (page = pageMeta.page, limit = pageMeta.limit) => {
    try {
      const res = await getUsers({
        role: roleFilter || undefined,
        search: search || undefined,
        page,
        limit,
        sort,
        order,
      });
      setUsersList(res.data?.data || []);
      setPageMeta({
        page: res.page || page,
        limit: res.limit || limit,
        total: res.total || 0,
        totalPages: res.totalPages || 1,
      });
    } catch (err) {
      console.error('Failed to load user directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, 25);
    getCampuses()
      .then((res) => setCampuses(res.data || []))
      .catch(() => setCampuses([]));
  }, [roleFilter]);

  const applyFilters = (patch) => {
    const next = { roleFilter, search, sort, order, ...patch };
    const nextRole = next.roleFilter;
    const nextSearch = next.search;
    const nextSort = next.sort;
    const nextOrder = next.order;
    setRoleFilter(nextRole);
    setSearch(nextSearch);
    setSort(nextSort);
    setOrder(nextOrder);
    getUsers({
      role: nextRole || undefined,
      search: nextSearch || undefined,
      page: 1,
      limit: pageMeta.limit,
      sort: nextSort,
      order: nextOrder,
    }).then((res) => {
      setUsersList(res.data?.data || []);
      setPageMeta({
        page: res.page || 1,
        limit: res.limit || pageMeta.limit,
        total: res.total || 0,
        totalPages: res.totalPages || 1,
      });
    }).catch((err) => {
      console.error('Failed to load user directory:', err);
    });
  };

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
        setUserForm({ email: '', password: '', name: '', role: 'HR', campusId: '' });
        fetchUsers(1, pageMeta.limit);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Provisioning failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget?.id) return;
    setActionError('');
    setActionSuccess('');
    setProcessing(true);
    try {
      await resetUserPassword(resetTarget.id, resetPassword);
      setActionSuccess(t('users.resetSuccess', { name: resetTarget.name }));
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setActionError(err.response?.data?.message || t('users.resetFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleEditAccount = async (e) => {
    e.preventDefault();
    if (!editTarget?.id) return;
    setActionError('');
    setActionSuccess('');
    setProcessing(true);
    try {
      const res = await updateUser(editTarget.id, {
        name: editForm.name,
        email: editForm.email,
      });
      const next = res.data || {};
      const emailChanged =
        String(next.email || '').toLowerCase() !== String(editTarget.email || '').toLowerCase();
      setActionSuccess(
        emailChanged
          ? t('users.editSuccessEmail', { name: next.name, email: next.email })
          : t('users.editSuccess', { name: next.name })
      );
      setEditTarget(null);
      fetchUsers(pageMeta.page, pageMeta.limit);
    } catch (err) {
      setActionError(err.response?.data?.message || t('users.editFailed'));
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
          {['', 'ADMIN', 'HR', 'FINANCE', 'CAFE_STAFF'].map((role) => (
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

      <div className="surface-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => applyFilters({ search: e.target.value })}
            placeholder={t('common.search', { defaultValue: 'Search users' })}
            className="glass-input lg:max-w-sm"
          />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sort}
            onChange={(e) => applyFilters({ sort: e.target.value })}
            className="glass-input !w-auto"
          >
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="createdAt">Created</option>
            <option value="role">Role</option>
          </select>
          <select
            value={order}
            onChange={(e) => applyFilters({ order: e.target.value })}
            className="glass-input !w-auto"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <select
            value={pageMeta.limit}
            onChange={(e) => {
              const nextLimit = Number(e.target.value);
              setPageMeta((meta) => ({ ...meta, limit: nextLimit }));
              fetchUsers(1, nextLimit);
            }}
            className="glass-input !w-auto"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="table-wrap">
        <div className="flex items-center justify-between gap-3 px-4 pb-3 text-sm text-app-secondary">
          <span>{pageMeta.total.toLocaleString()} records</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" disabled={pageMeta.page <= 1} onClick={() => fetchUsers(pageMeta.page - 1, pageMeta.limit)}>Previous</button>
            <span>Page {pageMeta.page} of {pageMeta.totalPages}</span>
            <button className="btn-secondary" disabled={pageMeta.page >= pageMeta.totalPages} onClick={() => fetchUsers(pageMeta.page + 1, pageMeta.limit)}>Next</button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="table-modern">
            <thead>
              <tr className="border-b border-app-border text-app-secondary font-bold">
                <th className="pb-3">{t('users.name')}</th>
                <th className="pb-3">{t('users.email')}</th>
                <th className="pb-3">{t('common.role')}</th>
                <th className="pb-3">{t('cafes.campuses')}</th>
                <th className="pb-3">{t('users.clearanceDate')}</th>
                <th className="pb-3">{t('common.status')}</th>
                <th className="pb-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-app-muted">No accounts match selected parameters</td>
                </tr>
              ) : (
                usersList.map((usr) => (
                  <tr key={usr.id} className={`text-app-secondary hover:bg-app-surface-2/10 ${usr.isActive === false ? 'opacity-60' : ''}`}>
                    <td className="py-3 font-semibold text-app-primary">{usr.name}</td>
                    <td className="py-3">{usr.email}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getRoleBadgeClass(usr.role)}`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3">
                      {usr.role === 'CAFE_STAFF' ? (
                        <select
                          className="glass-input !py-1 !px-2 !w-auto max-w-[180px]"
                          value={usr.campusId || ''}
                          onChange={async (e) => {
                            try {
                              await updateUser(usr.id, { campusId: e.target.value });
                              setActionSuccess(t('users.campusUpdated', { name: usr.name }));
                              fetchUsers(pageMeta.page, pageMeta.limit);
                            } catch (err) {
                              setActionError(err.response?.data?.message || t('users.campusUpdateFailed'));
                            }
                          }}
                        >
                          <option value="">{t('users.selectCampus')}</option>
                          {campuses.filter((campus) => campus.isActive !== false).map((campus) => (
                            <option key={campus.id} value={campus.id}>
                              {campus.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        usr.campus?.name || '—'
                      )}
                    </td>
                    <td className="py-3 text-app-secondary">{formatCalendarDate(calendarMode, usr.createdAt)}</td>
                    <td className="py-3">
                      <span className="text-xs font-medium">
                        {usr.isActive === false ? t('common.inactive') : t('common.active')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary py-1.5 min-h-0 text-xs"
                          onClick={() => {
                            setEditTarget(usr);
                            setEditForm({ name: usr.name || '', email: usr.email || '' });
                            setActionError('');
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {t('users.editAccount')}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary py-1.5 min-h-0 text-xs"
                          onClick={() => {
                            setResetTarget(usr);
                            setResetPassword('');
                            setActionError('');
                          }}
                        >
                          <Key className="w-3.5 h-3.5" />
                          {t('users.resetPassword')}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary py-1.5 min-h-0 text-xs"
                          disabled={usr.id === user?.id}
                          onClick={async () => {
                            const nextActive = usr.isActive === false;
                            const ok = window.confirm(
                              nextActive
                                ? t('users.reactivateConfirm', { name: usr.name })
                                : t('users.deactivateConfirm', { name: usr.name })
                            );
                            if (!ok) return;
                            setActionError('');
                            setActionSuccess('');
                            try {
                              await updateUser(usr.id, { isActive: nextActive });
                              setActionSuccess(
                                nextActive
                                  ? t('users.reactivated', { name: usr.name })
                                  : t('users.deactivated', { name: usr.name })
                              );
                              fetchUsers(pageMeta.page, pageMeta.limit);
                            } catch (err) {
                              setActionError(err.response?.data?.message || t('users.statusFailed'));
                            }
                          }}
                        >
                          {usr.isActive === false ? t('users.reactivate') : t('users.deactivate')}
                        </button>
                      </div>
                    </td>
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

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  {t('users.displayName', { defaultValue: 'Display name' })}
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder={t('users.displayNamePlaceholder', { defaultValue: 'e.g. Michael' })}
                  className="glass-input"
                />
                <p className="text-xs text-app-muted">
                  {t('users.displayNameHelp', { defaultValue: 'Shown in the header and lists. Not used to sign in.' })}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  {t('users.loginEmail', { defaultValue: 'Login email' })}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="off"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="name@tmptc.edu.et"
                  className="glass-input"
                />
                <p className="text-xs text-app-muted">
                  {t('users.loginEmailHelp', { defaultValue: 'This is the username they type on the login page.' })}
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                  {t('users.temporaryPassword', { defaultValue: 'Temporary password' })}
                </label>
                <input
                  type="password"
                  name="new-password"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value, campusId: e.target.value === 'CAFE_STAFF' ? userForm.campusId : '' })}
                  className="glass-input cursor-pointer"
                >
                  <option value="CAFE_STAFF" className="bg-app-surface">CAFE_STAFF (Canteen Operator)</option>
                  <option value="HR" className="bg-app-surface">HR (Operations Planner)</option>
                  <option value="FINANCE" className="bg-app-surface">FINANCE (Finance Planner)</option>
                  <option value="ADMIN" className="bg-app-surface">ADMIN (Full Governance)</option>
                </select>
              </div>

              {userForm.role === 'CAFE_STAFF' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
                    {t('cafes.campuses')}
                  </label>
                  <select
                    required
                    value={userForm.campusId}
                    onChange={(e) => setUserForm({ ...userForm, campusId: e.target.value })}
                    className="glass-input cursor-pointer"
                  >
                    <option value="">{t('users.selectCampus')}</option>
                    {campuses.filter((campus) => campus.isActive !== false).map((campus) => (
                      <option key={campus.id} value={campus.id} className="bg-app-surface">
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      {resetTarget && (
        <ModalOverlay onClose={() => !processing && setResetTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title mb-2">{t('users.resetTitle')}</h3>
            <p className="text-sm text-app-secondary mb-4">
              {t('users.resetHelp', { name: resetTarget.name, email: resetTarget.email })}
            </p>
            <form onSubmit={handleResetPassword} className="form-stack">
              <div className="form-group">
                <label className="input-label">{t('users.newPassword')}</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="glass-input"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 btn-secondary"
                  onClick={() => setResetTarget(null)}
                  disabled={processing}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={processing}>
                  {t('users.resetPassword')}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {editTarget && (
        <ModalOverlay onClose={() => !processing && setEditTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title mb-2">{t('users.editTitle')}</h3>
            <p className="text-sm text-app-secondary mb-4">
              {t('users.editHelp', { name: editTarget.name, email: editTarget.email })}
            </p>
            {actionError && (
              <p className="text-sm text-rose-400 mb-3">{actionError}</p>
            )}
            <form onSubmit={handleEditAccount} className="form-stack" autoComplete="off">
              <div className="form-group">
                <label className="input-label">{t('users.displayName')}</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="glass-input"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="input-label">{t('users.loginEmail')}</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="glass-input"
                  autoComplete="off"
                />
                <p className="text-xs text-app-muted mt-1">{t('users.editEmailHelp')}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  className="flex-1 btn-secondary"
                  onClick={() => setEditTarget(null)}
                  disabled={processing}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={processing}>
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

    </div>
  );
};

export default Users;
