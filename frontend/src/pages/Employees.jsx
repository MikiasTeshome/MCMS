import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendar } from '../context/CalendarContext.jsx';
import { generateQR } from '../services/hr.service.js';
import {
  Users as UsersIcon,
  Plus,
  CheckCircle,
  ShieldAlert,
  QrCode,
  Printer,
  Search,
  Loader,
  UserCheck,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Eye,
  Copy,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react';
import { PageHeader, PageSkeleton, ProgressBar, EmptyState } from '../components/ui/Page.jsx';
import { ModalOverlay } from '../components/ui/Modal.jsx';
import CalendarDatePicker from '../components/ui/CalendarDatePicker.jsx';
import api from '../services/api.js';
import {
  exportEmployeesToExcel,
  downloadEmployeeTemplate,
  parseEmployeeExcelFile,
} from '../utils/employeeExcel.js';
import { getPrintCards } from '../services/campus.service.js';
import {
  formatCalendarDate,
  parseCalendarDateString,
  getGregorianDayKey,
  countWorkingDays,
  buildHolidayKeySet,
  shiftUtcDays,
  DATE_INPUT_FORMAT,
} from '../utils/ethiopianDate.js';

const QRPrintCard = lazy(() => import('../components/QRPrintCard.jsx'));

const truncateCode = (code) => (code ? `${code.slice(0, 8)}...` : '—');

const getInitials = (name) =>
  String(name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getEmployeeLeaveState = (emp) => {
  const profile = emp?.employeeProfile || {};
  const todayKey = getGregorianDayKey(new Date());
  const startKey = getGregorianDayKey(profile.leaveStartDate);
  const returnKey = getGregorianDayKey(profile.leaveReturnDate);
  const hasLeaveWindow = Boolean(startKey && returnKey);
  const isOnLeave = hasLeaveWindow && todayKey >= startKey && todayKey < returnKey;

  return {
    isOnLeave,
    hasLeaveWindow,
    leaveDays: profile.leaveDays ?? null,
    leaveStartDate: profile.leaveStartDate ?? null,
    leaveReturnDate: profile.leaveReturnDate ?? null,
  };
};

const formatLeaveInputValue = (calendarMode, value) => {
  if (!value) return '';
  return formatCalendarDate(calendarMode, value);
};

const convertLeaveInputValue = (fromMode, toMode, value) => {
  const parsed = parseCalendarDateString(fromMode, value);
  return parsed ? formatLeaveInputValue(toMode, parsed) : '';
};

const Employees = () => {
  const { t } = useTranslation();
  const { calendarMode } = useCalendar();
  const previousCalendarMode = useRef(calendarMode);

  const [employeesList, setEmployeesList] = useState([]);
  const [pageMeta, setPageMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', sort: 'name', order: 'asc' });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printCards, setPrintCards] = useState(null);
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCardCode, setSelectedCardCode] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const [editForm, setEditForm] = useState({
    name: '',
    employeeIdNumber: '',
    isActive: true,
    leaveDays: '',
    leaveStartDate: '',
    leaveReturnDate: '',
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    employeeIdNumber: '',
  });
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const [holidays, setHolidays] = useState([]);

  const fetchEmployees = async (page = pageMeta.page, limit = pageMeta.limit, nextFilters = filters) => {
    try {
      setLoading(true);
      const res = await api.get('/employees', {
        params: {
          page,
          limit,
          search: nextFilters.search?.trim() || undefined,
          sort: nextFilters.sort,
          order: nextFilters.order,
        },
      });
      const payload = res.data?.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setEmployeesList(rows);
      setPageMeta({
        page: Number(payload.page) || page,
        limit: Number(payload.limit) || limit,
        total: Number(payload.total) || 0,
        totalPages: Math.max(Number(payload.totalPages) || 1, 1),
      });
    } catch (err) {
      console.error('Failed to load employees list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(1, 25);
    const fetchHolidays = async () => {
      try {
        const res = await api.get('/holidays');
        setHolidays(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error('Failed to load holidays:', err);
      }
    };
    fetchHolidays();
    return () => clearTimeout(searchTimerRef.current);
  }, []);

  useEffect(() => {
    const fromMode = previousCalendarMode.current;
    if (fromMode === calendarMode) return;
    previousCalendarMode.current = calendarMode;
    if (!showEditModal) return;
    setEditForm((form) => ({
      ...form,
      leaveStartDate: convertLeaveInputValue(fromMode, calendarMode, form.leaveStartDate),
      leaveReturnDate: convertLeaveInputValue(fromMode, calendarMode, form.leaveReturnDate),
    }));
  }, [calendarMode, showEditModal]);

  const copyText = async (text, fieldKey) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setProcessing(true);

    try {
      const res = await api.post('/employees', {
        name: employeeForm.name,
        employeeIdNumber: employeeForm.employeeIdNumber,
      });
      if (res.data.success) {
        setActionSuccess(t('employees.provisionSuccess', { name: res.data?.data?.user?.name || employeeForm.name }));
        setShowAddModal(false);
        setEmployeeForm({
          name: '',
          employeeIdNumber: '',
        });
        fetchEmployees();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || t('employees.provisionFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateQR = async (emp) => {
    setActionError('');
    setActionSuccess('');
    if (emp.qrCards?.[0] && !window.confirm(t('employees.reprintConfirm', { name: emp.name }))) {
      return;
    }

    try {
      const res = await generateQR(emp.id);
      if (res.success) {
        setActionSuccess(t('employees.qrSuccess', { name: emp.name }));
        setSelectedEmployee(emp);
        setSelectedCardCode(res.data.cardCode);
        setPrintCards(null);
        setShowPrintModal(true);
        fetchEmployees();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || t('employees.qrFailed'));
    }
  };

  const handlePrintCard = (emp) => {
    if (!emp.qrCards?.[0]) {
      setActionError(t('employees.noQr'));
      return;
    }
    setSelectedEmployee(emp);
    setSelectedCardCode(emp.qrCards[0].cardCode);
    setPrintCards(null);
    setShowPrintModal(true);
  };

  const openDetails = (emp) => {
    setSelectedEmployee(emp);
    setShowDetailsModal(true);
    setCopiedField(null);
  };

  const closeDetails = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
    setCopiedField(null);
  };

  const openEdit = (emp) => {
    setSelectedEmployee(emp);
    const profile = emp.employeeProfile || {};
    setEditForm({
      name: emp.name || '',
      employeeIdNumber: profile.employeeIdNumber || '',
      isActive: emp.isActive !== false,
      leaveDays: profile.leaveDays ?? '',
      leaveStartDate: formatLeaveInputValue(calendarMode, profile.leaveStartDate),
      leaveReturnDate: formatLeaveInputValue(calendarMode, profile.leaveReturnDate),
    });
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedEmployee(null);
    setEditError('');
    setEditSuccess('');
  };

  const applyLeaveDate = (field, nextValue) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: nextValue };
      const start = parseCalendarDateString(calendarMode, next.leaveStartDate);
      const end = parseCalendarDateString(calendarMode, next.leaveReturnDate);
      const days = countWorkingDays(start, end, buildHolidayKeySet(holidays));
      if (days !== null && start && end) {
        next.leaveDays = String(days);
      }
      return next;
    });
  };

  const leaveStartDate = parseCalendarDateString(calendarMode, editForm.leaveStartDate);
  const leaveReturnDate = parseCalendarDateString(calendarMode, editForm.leaveReturnDate);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    const hasAnyLeaveValue =
      String(editForm.leaveDays || '').trim() ||
      String(editForm.leaveStartDate || '').trim() ||
      String(editForm.leaveReturnDate || '').trim();

    if (hasAnyLeaveValue) {
      if (!String(editForm.leaveDays || '').trim() || !String(editForm.leaveStartDate || '').trim() || !String(editForm.leaveReturnDate || '').trim()) {
        setEditError(t('employees.leaveIncomplete'));
        return;
      }

      const parsedDays = Number.parseInt(editForm.leaveDays, 10);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        setEditError(t('employees.leaveDaysInvalid'));
        return;
      }

      if (!parseCalendarDateString(calendarMode, editForm.leaveStartDate)) {
        setEditError(t('employees.leaveStartInvalid'));
        return;
      }

      if (!parseCalendarDateString(calendarMode, editForm.leaveReturnDate)) {
        setEditError(t('employees.leaveReturnInvalid'));
        return;
      }
    }

    setEditing(true);
    try {
      const payload = {
        ...editForm,
        leaveDays: String(editForm.leaveDays || '').trim() ? Number.parseInt(editForm.leaveDays, 10) : null,
        leaveStartDate: parseCalendarDateString(calendarMode, editForm.leaveStartDate),
        leaveReturnDate: parseCalendarDateString(calendarMode, editForm.leaveReturnDate),
      };

      const res = await api.put(`/employees/${selectedEmployee.id}`, payload);
      if (res.data.success) {
        setEditSuccess(t('employees.editSuccess', { name: editForm.name }));
        fetchEmployees();
        setTimeout(() => closeEdit(), 1200);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || t('employees.editFailed'));
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(t('employees.deleteConfirm', { name: emp.name }))) return;
    setActionError('');
    setActionSuccess('');
    try {
      await api.delete(`/employees/${emp.id}`);
      setActionSuccess(t('employees.deleteSuccess', { name: emp.name }));
      fetchEmployees();
    } catch (err) {
      setActionError(err.response?.data?.message || t('employees.deleteFailed'));
    }
  };

  const updateFilters = (patch, { debounceSearch = false } = {}) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (debounceSearch) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        fetchEmployees(1, pageMeta.limit, next);
      }, 350);
      return;
    }
    fetchEmployees(1, pageMeta.limit, next);
  };

  const handleBulkPrint = async () => {
    setActionError('');
    setBulkPrinting(true);
    try {
      const res = await getPrintCards();
      const cards = res.data || [];
      if (!cards.length) {
        setActionError(t('employees.bulkPrintEmpty'));
        return;
      }
      setPrintCards(cards);
      setSelectedEmployee(null);
      setShowPrintModal(true);
    } catch (err) {
      setActionError(err.response?.data?.message || t('employees.bulkPrintFailed'));
    } finally {
      setBulkPrinting(false);
    }
  };

  const handleExport = () => {
    exportEmployeesToExcel(employeesList);
    setActionSuccess(t('employees.exportSuccess'));
    setActionError('');
  };

  const handleDownloadTemplate = () => {
    downloadEmployeeTemplate();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setActionError('');
    setActionSuccess('');

    try {
      const rows = await parseEmployeeExcelFile(importFile);
      if (rows.length === 0) {
        setActionError(t('employees.importEmpty'));
        return;
      }

      const res = await api.post('/employees/import', { rows });
      const results = res.data?.data;
      setImportResults(results);

      if (results.created > 0) {
        fetchEmployees();
        setActionSuccess(
          t('employees.importSuccess', { created: results.created, failed: results.failed })
        );
      } else {
        setActionError(t('employees.importAllFailed'));
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || t('employees.importFailed'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading && employeesList.length === 0) {
    return <PageSkeleton cards={0} />;
  }

  const detailsCard = selectedEmployee?.qrCards?.[0];
  const detailsUuid = detailsCard?.cardCode || selectedEmployee?.id || '';
  const detailsLeaveState = selectedEmployee ? getEmployeeLeaveState(selectedEmployee) : null;

  return (
    <div className="page-shell-compact">
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.subtitle')}
        actions={
          <>
            <button
              onClick={handleBulkPrint}
              disabled={bulkPrinting}
              className="btn-secondary"
            >
              <Printer className="w-4 h-4" />
              <span>{bulkPrinting ? t('common.loading') : t('employees.bulkPrint')}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={employeesList.length === 0}
              className="btn-secondary"
            >
              <Download className="w-4 h-4" />
              <span>{t('employees.export')}</span>
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary">
              <Upload className="w-4 h-4" />
              <span>{t('employees.import')}</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span>{t('employees.provision')}</span>
            </button>
          </>
        }
      />

      <div className="surface-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value }, { debounceSearch: true })}
            placeholder={t('employees.searchPlaceholder')}
            className="glass-input w-full pl-10"
            aria-label={t('employees.searchPlaceholder')}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.sort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="glass-input !w-auto"
          >
            <option value="name">Name</option>
            <option value="createdAt">Created</option>
          </select>
          <select
            value={filters.order}
            onChange={(e) => updateFilters({ order: e.target.value })}
            className="glass-input !w-auto"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <select
            value={pageMeta.limit}
            onChange={(e) => {
              const limit = Number(e.target.value);
              setPageMeta((meta) => ({ ...meta, limit }));
              fetchEmployees(1, limit, filters);
            }}
            className="glass-input !w-auto"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
      </div>

      {(actionError || actionSuccess) && (
        <div className="max-w-2xl">
          {actionError && (
            <div className="alert alert-error">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="alert alert-success">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </div>
      )}

      <div className="table-wrap surface-card-hover">
        <div className="flex items-center justify-between gap-3 px-4 pb-3 text-sm text-app-secondary">
          <span>{pageMeta.total.toLocaleString()} records</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || pageMeta.page <= 1}
              onClick={() => fetchEmployees(pageMeta.page - 1, pageMeta.limit)}
            >
              Previous
            </button>
            <span>Page {pageMeta.page} of {pageMeta.totalPages}</span>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || pageMeta.page >= pageMeta.totalPages}
              onClick={() => fetchEmployees(pageMeta.page + 1, pageMeta.limit)}
            >
              Next
            </button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="table-modern table-directory">
            <thead>
              <tr>
                <th className="w-16">{t('employees.tableAvatar')}</th>
                <th>{t('employees.tableName')}</th>
                <th>{t('employees.tableEmployeeId')}</th>
                <th>{t('employees.tableStatus')}</th>
                <th className="text-right">{t('employees.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(employeesList) ? employeesList : []).length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon={UsersIcon}
                      title={t('employees.noEmployees')}
                      description={t('employees.subtitle')}
                      action={
                        <button onClick={() => setShowAddModal(true)} className="btn-primary">
                          <Plus className="w-4 h-4" />
                          {t('employees.provision')}
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                (Array.isArray(employeesList) ? employeesList : []).map((emp) => {
                  const cardCode = emp.qrCards?.[0]?.cardCode;
                  const isActive = emp.isActive !== false;
                  const leaveState = getEmployeeLeaveState(emp);
                  const copyKey = `row-${emp.id}`;
                  const statusLabel = !isActive
                    ? t('common.inactive', { defaultValue: 'Inactive' })
                    : leaveState.isOnLeave
                      ? t('employees.onLeave')
                      : leaveState.hasLeaveWindow
                        ? t('employees.leaveScheduled')
                        : t('common.active');
                  const statusClass = !isActive
                    ? 'badge'
                    : leaveState.isOnLeave
                      ? 'badge-warning'
                      : leaveState.hasLeaveWindow
                        ? 'badge-info'
                        : 'badge-active';

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className="avatar w-10 h-10">{getInitials(emp.name)}</div>
                      </td>
                      <td>
                        <div className="cell-name">{emp.name}</div>
                      </td>
                      <td>
                        <div className="cell-secondary">
                          {emp.employeeProfile?.employeeIdNumber || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1.5">
                          <span className={statusClass}>
                            {statusLabel}
                          </span>
                          {cardCode ? (
                            <div className="copy-row">
                              <span className="copy-code">{truncateCode(cardCode)}</span>
                              <button
                                type="button"
                                onClick={() => copyText(cardCode, copyKey)}
                                className="btn-icon-action !w-8 !h-8 !min-w-8"
                                title={t('employees.copyCardCode')}
                              >
                                {copiedField === copyKey ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="cell-secondary">{t('employees.noActiveCard')}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(emp)}
                            className="btn-icon-action"
                            title={t('employees.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(emp)}
                            className="btn-icon-action"
                            title={t('employees.editTooltip')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintCard(emp)}
                            disabled={!emp.qrCards?.[0]}
                            className="btn-icon-action"
                            title={t('employees.printTooltip')}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGenerateQR(emp)}
                            className="btn-icon-action"
                            title={t('employees.generateQrTooltip')}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(emp)}
                            className="btn-icon-action text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title={t('employees.deleteTooltip')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal */}
      {showDetailsModal && selectedEmployee && (
        <ModalOverlay onClose={closeDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="avatar w-11 h-11">{getInitials(selectedEmployee.name)}</div>
                <div className="min-w-0">
                  <h3 className="modal-title !text-base">{selectedEmployee.name}</h3>
                  <p className="text-sm text-app-secondary mt-0.5">
                    {selectedEmployee.employeeProfile?.employeeIdNumber || '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                className="btn-icon shrink-0"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.joinDate')}</span>
              <span className="detail-value">
                {formatCalendarDate(calendarMode, selectedEmployee.createdAt)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.leaveStatus')}</span>
              <span
                className={
                  selectedEmployee.isActive === false
                    ? 'badge'
                    : detailsLeaveState?.isOnLeave
                    ? 'badge-warning'
                    : detailsLeaveState?.hasLeaveWindow
                      ? 'badge-info'
                      : 'badge-active'
                }
              >
                {selectedEmployee.isActive === false
                  ? t('common.inactive', { defaultValue: 'Inactive' })
                  : detailsLeaveState?.isOnLeave
                  ? t('employees.onLeave')
                  : detailsLeaveState?.hasLeaveWindow
                    ? t('employees.leaveScheduled')
                    : t('common.active')}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.leaveDays')}</span>
              <span className="detail-value">
                {detailsLeaveState?.leaveDays || '—'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.leaveStartDate')}</span>
              <span className="detail-value">
                {detailsLeaveState?.leaveStartDate
                  ? formatCalendarDate(calendarMode, detailsLeaveState.leaveStartDate)
                  : '—'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.leaveReturnDate')}</span>
              <span className="detail-value">
                {detailsLeaveState?.leaveReturnDate
                  ? formatCalendarDate(calendarMode, detailsLeaveState.leaveReturnDate)
                  : '—'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.fullQrUuid')}</span>
              <div className="copy-row">
                <span className="detail-value font-mono text-sm break-all">
                  {detailsUuid || '-'}
                </span>
                {detailsUuid && (
                  <button
                    type="button"
                    onClick={() => copyText(detailsUuid, 'details-uuid')}
                    className="btn-icon-action shrink-0"
                    title={t('employees.copyCardCode')}
                  >
                    {copiedField === 'details-uuid' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button type="button" onClick={closeDetails} className="btn-secondary w-full">
                {t('common.close')}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Provision modal */}
      {showAddModal && (
        <ModalOverlay onClose={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title mb-6">
              <UserCheck className="w-5 h-5 icon-accent" />
              <span>{t('employees.addModalTitle')}</span>
            </h3>

            <form onSubmit={handleSubmit} className="form-stack">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="input-label">{t('employees.fullName')}</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    placeholder="E.g., John Doe"
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">{t('employees.employeeId')}</label>
                  <input
                    type="text"
                    value={employeeForm.employeeIdNumber}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, employeeIdNumber: e.target.value })
                    }
                    placeholder="E.g., EMP-10024"
                    className="glass-input text-xs"
                  />
                </div>
              </div>

              <p className="text-[11px] text-app-muted pt-1">{t('employees.qrAutoNote')}</p>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={processing} className="flex-1 btn-primary">
                  {processing ? (
                    <Loader className="animate-spin h-5 w-5" />
                  ) : (
                    <span>{t('employees.createProfile')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Import modal */}
      {showImportModal && (
        <ModalOverlay onClose={closeImportModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="modal-title">
                <FileSpreadsheet className="w-5 h-5 icon-accent" />
                <span>{t('employees.importModalTitle')}</span>
              </h3>
              <button
                onClick={closeImportModal}
                className="btn-icon"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-app-secondary mb-4">{t('employees.importDescription')}</p>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-app-secondary hover:text-app-primary text-sm font-medium mb-6 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('employees.downloadTemplate')}</span>
            </button>

            <div className="border-2 border-dashed border-app-border rounded-xl p-6 text-center mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="employee-import-file"
              />
              <label
                htmlFor="employee-import-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-app-muted" />
                <span className="text-sm text-app-secondary font-medium">
                  {importFile ? importFile.name : t('employees.selectFile')}
                </span>
                <span className="text-xs text-app-muted">{t('employees.fileTypes')}</span>
              </label>
            </div>

            {importing && (
              <div className="mb-4">
                <ProgressBar value={50} label={t('common.loading')} />
              </div>
            )}

            {importResults?.errors?.length > 0 && (
              <div className="mb-4 max-h-40 overflow-y-auto alert alert-error flex-col items-start">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 w-full">
                  {t('employees.importErrors')}
                </p>
                <ul className="space-y-1 text-xs w-full">
                  {importResults.errors.map((err, idx) => (
                    <li key={idx}>
                      {t('employees.importErrorRow', {
                        row: err.row,
                        name: err.name || err.employeeIdNumber || err.email || '—',
                        message: err.message,
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeImportModal} className="flex-1 btn-secondary">
                {t('common.close')}
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 btn-primary"
              >
                {importing ? (
                  <div className="spinner h-5 w-5" />
                ) : (
                  <span>{t('employees.importButton')}</span>
                )}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && selectedEmployee && (
        <ModalOverlay onClose={closeEdit}>
          <div className="modal-content !max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="modal-title">
                <Pencil className="w-5 h-5 icon-accent" />
                <span>{t('employees.editModalTitle')}</span>
              </h3>
              <button type="button" onClick={closeEdit} className="btn-icon" title={t('common.close')}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="alert alert-error mb-4">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccess && (
              <div className="alert alert-success mb-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="form-stack">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="input-label">{t('employees.fullName')}</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">{t('employees.employeeId')}</label>
                  <input
                    type="text"
                    value={editForm.employeeIdNumber}
                    onChange={(e) => setEditForm({ ...editForm, employeeIdNumber: e.target.value })}
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group flex flex-col justify-center">
                  <label className="input-label">{t('common.status')}</label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 accent-blue-500 rounded"
                    />
                    <span className="text-sm text-app-secondary">{t('common.active')}</span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-app-border bg-app-surface-2/40 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-app-primary">
                    {t('employees.leaveSectionTitle')}
                  </h4>
                  <p className="text-xs text-app-muted mt-1">
                    {t('employees.leaveSectionHelp')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="form-group">
                    <label className="input-label">{t('employees.leaveDays')}</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.leaveDays}
                      onChange={(e) => setEditForm({ ...editForm, leaveDays: e.target.value })}
                      placeholder="30"
                      className="glass-input text-xs"
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">{t('employees.leaveStartDate')}</label>
                    <CalendarDatePicker
                      calendarMode={calendarMode}
                      value={editForm.leaveStartDate}
                      onChange={(nextValue) => applyLeaveDate('leaveStartDate', nextValue)}
                      maxDate={leaveReturnDate ? shiftUtcDays(leaveReturnDate, -1) : null}
                      holidays={holidays}
                      placeholder={DATE_INPUT_FORMAT}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">{t('employees.leaveReturnDate')}</label>
                    <CalendarDatePicker
                      calendarMode={calendarMode}
                      value={editForm.leaveReturnDate}
                      onChange={(nextValue) => applyLeaveDate('leaveReturnDate', nextValue)}
                      minDate={leaveStartDate ? shiftUtcDays(leaveStartDate, 1) : null}
                      holidays={holidays}
                      placeholder={DATE_INPUT_FORMAT}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeEdit} className="flex-1 btn-secondary">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={editing} className="flex-1 btn-primary">
                  {editing ? <Loader className="animate-spin h-5 w-5" /> : <span>{t('common.save')}</span>}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {showPrintModal && (printCards || selectedEmployee) && (
        <Suspense fallback={null}>
          <QRPrintCard
            employee={selectedEmployee}
            cardCode={selectedCardCode}
            cards={printCards}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedEmployee(null);
            setSelectedCardCode('');
            setPrintCards(null);
          }}
        />
        </Suspense>
      )}
    </div>
  );
};

export default Employees;
