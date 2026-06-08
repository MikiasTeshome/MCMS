import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from 'react-i18next';
// Removed unused employee service imports
import { generateQR } from '../services/hr.service.js';
import QRPrintCard from '../components/QRPrintCard.jsx';
import { 
  Users as UsersIcon, 
  Plus, 
  CheckCircle, 
  ShieldAlert, 
  QrCode, 
  Printer, 
  ChevronRight,
  Loader,
  UserCheck
} from 'lucide-react';
import axios from 'axios';
import api from '../services/api.js';

const Employees = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Printing States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedCardCode, setSelectedCardCode] = useState('');

  // Form states
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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Fetch employees from /employees endpoint (calls getEmployees)
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
    const activeCard = emp.qrCards?.[0];
    if (!activeCard) {
      setActionError(t('employees.noQr'));
      return;
    }
    setSelectedEmployee(emp);
    setSelectedCardCode(emp.id);
    setShowPrintModal(true);
  };

  if (loading && employeesList.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-brand-500">
        <Loader className="animate-spin h-10 w-10 text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white Outfit tracking-tight">{t('employees.title')}</h1>
          <p className="text-slate-400 text-sm font-medium">{t('employees.subtitle')}</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl shadow-premium hover:shadow-premium-hover transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>{t('employees.provision')}</span>
        </button>
      </div>

      {/* Action Alerts */}
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

      {/* Employees Directory Table */}
      <div className="glass-card p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-xs">
                <th className="pb-3">{t('employees.tableName')}</th>
                <th className="pb-3">{t('employees.tableIdEmail')}</th>
                <th className="pb-3">{t('employees.tableDept')}</th>
                <th className="pb-3">{t('employees.tableQr')}</th>
                <th className="pb-3 text-right">{t('employees.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employeesList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">{t('employees.noEmployees')}</td>
                </tr>
              ) : (
                employeesList.map((emp) => (
                  <tr key={emp.id} className="text-slate-300 hover:bg-slate-800/10">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-lg flex items-center justify-center font-bold text-sm uppercase">
                          {emp.name.split(' ').map(n=>n[0]).join('').substr(0,2)}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{emp.name}</div>
                          <div className="text-[10px] text-slate-500">{t('employees.joined')} {new Date(emp.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-mono text-xs text-brand-400">{emp.employeeProfile?.employeeIdNumber || 'N/A'}</div>
                      <div className="text-slate-400 text-xs">{emp.email}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-slate-200 font-medium text-xs">{emp.employeeProfile?.department || 'N/A'}</div>
                      <div className="text-slate-500 text-[11px]">{emp.employeeProfile?.position || 'N/A'}</div>
                    </td>
                    <td className="py-4">
                      {emp.qrCards?.[0] ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-max font-mono">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{emp.qrCards[0].cardCode}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 bg-slate-850 px-2 py-0.5 rounded-full w-max border border-slate-800">
                          {t('employees.noActiveCard')}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {/* Print Card button (if active card exists) */}
                        <button
                          onClick={() => handlePrintCard(emp)}
                          disabled={!emp.qrCards?.[0]}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-850 disabled:cursor-not-allowed border border-slate-700/60 rounded-xl font-bold text-white transition cursor-pointer"
                          title="Print Current Active Card"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('employees.print')}</span>
                        </button>
                        
                        {/* Generate QR / Reprint Card button */}
                        <button
                          onClick={() => handleGenerateQR(emp)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 rounded-xl font-bold text-brand-400 transition cursor-pointer"
                          title="Reprint Card & Invalidate Old Ones"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{t('employees.generateQrLabel')}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-card p-8 bg-slate-900 border border-slate-800 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-white Outfit mb-6 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-brand-500" />
              <span>{t('employees.addModalTitle')}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('employees.fullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    placeholder="E.g., John Doe"
                    className="glass-input text-xs"
                  />
                </div>

                {/* Employee ID Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('employees.employeeId')}
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.employeeIdNumber}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employeeIdNumber: e.target.value })}
                    placeholder="E.g., EMP-10024"
                    className="glass-input text-xs"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('employees.emailAddress')}
                  </label>
                  <input
                    type="email"
                    required
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    placeholder="email@system.com"
                    className="glass-input text-xs"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('employees.password')}
                  </label>
                  <input
                    type="password"
                    required
                    value={employeeForm.password}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="glass-input text-xs"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('employees.department')}
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    placeholder="E.g., Engineering"
                    className="glass-input text-xs"
                  />
                </div>

                {/* Position */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t('employees.position')}
                  </label>
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

              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('employees.staffType')}
                </label>
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

              <p className="text-[11px] text-slate-500 pt-1">
                {t('employees.qrAutoNote')}
              </p>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 cursor-pointer text-white"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-semibold py-3 px-4 rounded-xl shadow-premium transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {processing ? (
                    <Loader className="animate-spin h-5 w-5 text-white" />
                  ) : (
                    <span>{t('employees.createProfile')}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Print modal */}
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
