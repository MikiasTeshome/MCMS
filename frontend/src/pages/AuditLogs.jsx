import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import { getAuditLogs } from '../services/audit.service.js';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { ShieldAlert, RefreshCw, Eye, Calendar, Terminal } from 'lucide-react';

const AuditLogs = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Inspector modal states
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        limit,
        action: actionFilter || undefined,
        entityType: entityFilter || undefined
      });
      if (res.success) {
        setLogs(res.data.logs || []);
        setTotalLogs(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load compliance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const totalPages = Math.ceil(totalLogs / limit) || 1;

  if (loading && logs.length === 0) return <PageSkeleton cards={0} />;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-app-primary  tracking-tight">{t('audit.title')}</h1>
          <p className="text-app-secondary text-sm font-medium">{t('audit.subtitle')}</p>
        </div>
        <button
          onClick={fetchLogs}
          className="btn-icon"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 surface-card">
        <div className="space-y-2">
          <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
            Filter by Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="glass-input cursor-pointer"
          >
            <option value="" className="bg-app-surface">-- ALL ACTIONS --</option>
            <option value="USER_LOGIN" className="bg-app-surface">USER_LOGIN</option>
            <option value="USER_CREATE" className="bg-app-surface">USER_CREATE</option>
            <option value="COUPON_CREATE" className="bg-app-surface">COUPON_CREATE</option>
            <option value="COUPON_REDEEM" className="bg-app-surface">COUPON_REDEEM</option>
            <option value="MEAL_CREATE" className="bg-app-surface">MEAL_CREATE</option>
            <option value="MEAL_UPDATE" className="bg-app-surface">MEAL_UPDATE</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-app-secondary uppercase tracking-wider block">
            Filter by Resource Model
          </label>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="glass-input cursor-pointer"
          >
            <option value="" className="bg-app-surface">-- ALL RESOURCES --</option>
            <option value="User" className="bg-app-surface">User (Accounts)</option>
            <option value="Coupon" className="bg-app-surface">Coupon (Vouchers)</option>
            <option value="Meal" className="bg-app-surface">Meal (Menu Items)</option>
            <option value="System" className="bg-app-surface">System (Seeding/Init)</option>
          </select>
        </div>
      </div>

      {/* Audit ledger table */}
      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-app-border text-app-secondary font-bold">
                <th className="pb-3">{t('audit.action')}</th>
                <th className="pb-3">{t('audit.entity')}</th>
                <th className="pb-3">{t('audit.actor')}</th>
                <th className="pb-3">{t('audit.ip')}</th>
                <th className="pb-3">{t('audit.timestamp')}</th>
                <th className="pb-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-app-muted">No security logs recorded</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-app-secondary hover:bg-app-surface-2/10">
                    <td className="py-3 font-semibold text-app-primary">{log.action}</td>
                    <td className="py-3">
                      <span className="bg-slate-850 px-2 py-0.5 border border-app-border/60 text-app-secondary rounded text-xs">
                        {log.entityType} ({log.entityId?.substring(0, 8)})
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="text-app-primary font-medium">{log.actor?.name || 'SYSTEM'}</div>
                      <div className="text-xs text-app-muted">{log.actor?.email || ''}</div>
                    </td>
                    <td className="py-3 font-mono text-xs text-app-secondary">{log.ipAddress || '-'}</td>
                    <td className="py-3 text-app-secondary">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn-ghost text-xs py-1.5 px-3"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-850 pt-6 mt-6">
            <span className="text-xs text-app-muted">
              Showing page {page} of {totalPages} ({totalLogs} records total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-4 py-2 bg-app-surface-2 hover:bg-app-surface-2 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="px-4 py-2 bg-app-surface-2 hover:bg-app-surface-2 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log JSON Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl glass-card p-8 bg-app-surface border border-app-border max-h-[85vh] overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-app-border pb-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-app-primary  flex items-center gap-2">
                    <Terminal className="w-6 h-6 text-app-secondary" />
                    <span>State Inspector</span>
                  </h3>
                  <p className="text-xs text-app-secondary">
                    Log Entry: <span className="font-mono text-app-primary">{selectedLog.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-app-secondary hover:text-app-primary font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Network / Client footprint */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-app-surface-2/40 p-4 rounded-xl border border-app-border text-xs">
                <div>
                  <span className="text-app-muted block uppercase font-bold tracking-wider mb-1">Action Code</span>
                  <span className="text-app-primary font-semibold">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-app-muted block uppercase font-bold tracking-wider mb-1">Client Address</span>
                  <span className="text-white font-mono">{selectedLog.ipAddress || '-'}</span>
                </div>
                <div>
                  <span className="text-app-muted block uppercase font-bold tracking-wider mb-1">Resource Key</span>
                  <span className="text-white font-semibold">{selectedLog.entityType}</span>
                </div>
                <div>
                  <span className="text-app-muted block uppercase font-bold tracking-wider mb-1">Execution Time</span>
                  <span className="text-white">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                <div className="col-span-full border-t border-slate-850 pt-2 mt-2">
                  <span className="text-app-muted block uppercase font-bold tracking-wider mb-1">User Agent</span>
                  <span className="text-app-secondary block break-all font-mono leading-relaxed">{selectedLog.userAgent || '-'}</span>
                </div>
              </div>

              {/* Side-by-side JSON comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Pre-Mutation state */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-app-secondary uppercase tracking-widest block">
                    Pre-Mutation State (oldState)
                  </span>
                  <div className="bg-app-surface-2 p-4 rounded-xl border border-app-border/80 font-mono text-xs text-slate-350 overflow-x-auto max-h-[300px] h-[300px]">
                    {selectedLog.oldState ? (
                      <pre>{JSON.stringify(selectedLog.oldState, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-600 block italic py-10 text-center">null (Resource creation or logging only)</span>
                    )}
                  </div>
                </div>

                {/* Post-Mutation state */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-app-secondary uppercase tracking-widest block">
                    Post-Mutation State (newState)
                  </span>
                  <div className="bg-app-surface-2 p-4 rounded-xl border border-app-border/80 font-mono text-xs text-slate-350 overflow-x-auto max-h-[300px] h-[300px]">
                    {selectedLog.newState ? (
                      <pre>{JSON.stringify(selectedLog.newState, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-600 block italic py-10 text-center">null (Resource deletion or read only)</span>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal footer Close */}
            <div className="border-t border-app-border pt-4 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-primary py-2 px-6"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AuditLogs;
