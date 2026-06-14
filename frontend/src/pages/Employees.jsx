import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { generateQR } from '../services/hr.service.js';
import QRPrintCard from '../components/QRPrintCard.jsx';
import {
  Users as UsersIcon,
  Plus,
  CheckCircle,
  ShieldAlert,
  QrCode,
  Printer,
  Loader,
  UserCheck,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader, PageSkeleton, ProgressBar, EmptyState } from '../components/ui/Page.jsx';
import api from '../services/api.js';
import {
  exportEmployeesToExcel,
  downloadEmployeeTemplate,
  parseEmployeeExcelFile,
} from '../utils/employeeExcel.js';

const truncateCode = (code) => (code ? `${code.slice(0, 8)}...` : '—');

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const Employees = () => {
  const { t } = useTranslation();

  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCardCode, setSelectedCardCode] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    password: '',
    name: '',
    department: '',
    position: '',
    employeeIdNumber: '',
    staffType: 'Standard',
  });
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees');
      setEmployeesList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load employees list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

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
      const res = await api.post('/employees', employeeForm);
      if (res.data.success) {
        setActionSuccess(t('employees.provisionSuccess', { name: res.data.data.user.name }));
        setShowAddModal(false);
        setEmployeeForm({
          email: '',
          password: '',
          name: '',
          department: '',
          position: '',
          employeeIdNumber: '',
          staffType: 'Standard',
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

    try {
      const res = await generateQR(emp.id);
      if (res.success) {
        setActionSuccess(t('employees.qrSuccess', { name: emp.name }));
        setSelectedEmployee(emp);
        setSelectedCardCode(emp.id);
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
    setSelectedCardCode(emp.id);
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
      const results = res.data.data;
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

  return (
    <div className="page-shell-compact">
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.subtitle')}
        actions={
          <>
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
        <div className="table-scroll">
          <table className="table-modern table-directory">
            <thead>
              <tr>
                <th className="w-16">{t('employees.tableAvatar')}</th>
                <th>{t('employees.tableName')}</th>
                <th>{t('employees.tableDepartment')}</th>
                <th>{t('employees.tablePosition')}</th>
                <th>{t('employees.tableStatus')}</th>
                <th className="text-right">{t('employees.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {employeesList.length === 0 ? (
                <tr>
                  <td colSpan="6">
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
                employeesList.map((emp) => {
                  const cardCode = emp.qrCards?.[0]?.cardCode;
                  const isActive = emp.isActive !== false;
                  const copyKey = `row-${emp.id}`;

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
                          {emp.employeeProfile?.department || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="cell-secondary">
                          {emp.employeeProfile?.position || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1.5">
                          <span className={isActive ? 'badge-active' : 'badge'}>
                            {isActive ? t('common.active') : t('common.no')}
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
        <div className="modal-overlay" onClick={closeDetails}>
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
              <span className="detail-label">{t('employees.emailAddress')}</span>
              <span className="detail-value">{selectedEmployee.email}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.joinDate')}</span>
              <span className="detail-value">
                {new Date(selectedEmployee.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">{t('employees.fullQrUuid')}</span>
              <div className="copy-row">
                <span className="detail-value font-mono text-sm break-all">
                  {detailsUuid || '—'}
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
        </div>
      )}

      {/* Provision modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
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
                    required
                    value={employeeForm.employeeIdNumber}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, employeeIdNumber: e.target.value })
                    }
                    placeholder="E.g., EMP-10024"
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">{t('employees.emailAddress')}</label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    placeholder="email@system.com"
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">{t('employees.password')}</label>
                  <input
                    type="password"
                    required
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">{t('employees.department')}</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.department}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, department: e.target.value })
                    }
                    placeholder="E.g., Engineering"
                    className="glass-input text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="input-label">{t('employees.position')}</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    placeholder="E.g., Senior Developer"
                    className="glass-input text-xs"
                  />
                </div>
              </div>

              <div className="form-group pt-2">
                <label className="input-label">{t('employees.staffType')}</label>
                <input
                  type="text"
                  value={employeeForm.staffType}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, staffType: e.target.value })
                  }
                  placeholder="Standard"
                  className="glass-input text-xs"
                />
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
        </div>
      )}

      {/* Import modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
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
        </div>
      )}

      {showPrintModal && selectedEmployee && (
        <QRPrintCard
          employee={selectedEmployee}
          cardCode={selectedCardCode}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedEmployee(null);
            setSelectedCardCode('');
          }}
        />
      )}
    </div>
  );
};

export default Employees;
