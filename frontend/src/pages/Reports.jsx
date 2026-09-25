import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useCalendar } from '../context/CalendarContext.jsx';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { getCouponScanReport } from '../services/couponScan.service.js';
import { getCampuses } from '../services/campus.service.js';
import { downloadPaymentOrderFromReport } from '../utils/downloadPaymentOrder.js';
import {
  formatCalendarDate,
  formatCalendarDateRange,
  formatCalendarShortDate,
  parseCalendarDateString,
  toIsoDay,
  DATE_INPUT_FORMAT,
} from '../utils/ethiopianDate.js';
import CalendarDatePicker from '../components/ui/CalendarDatePicker.jsx';
import { CalendarDays, Download, FileText, Printer } from 'lucide-react';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lifetime', label: 'Lifetime' },
];

const isPresetKey = (key) => PRESETS.some((preset) => preset.key === key);

const CALENDARS = {
  ethiopian: 'Ethiopian Calendar',
  gregorian: 'Gregorian Calendar',
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const cafeRowKey = (row) => `${row?.campusId || 'none'}-${row?.vendorId || 'none'}`;

const Reports = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { calendarMode } = useCalendar();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [activePreset, setActivePreset] = useState(
    user?.role === 'CAFE_STAFF' ? 'today' : 'thisMonth'
  );
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [tableSort, setTableSort] = useState({ key: 'date', order: 'asc' });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(10);
  const [letterBusyKey, setLetterBusyKey] = useState('');
  const [letterError, setLetterError] = useState('');
  const [letterCafeKey, setLetterCafeKey] = useState('');
  const [pdfError, setPdfError] = useState('');

  const [reportError, setReportError] = useState('');
  const [campuses, setCampuses] = useState([]);
  const [campusId, setCampusId] = useState('');
  const reportRequestRef = useRef(0);
  const lastCustomIsoRef = useRef(null);
  const canFilterCampus = user?.role !== 'CAFE_STAFF';

  const scopedParams = (params = {}) => {
    const next = { ...params };
    if (canFilterCampus && campusId) next.campusId = campusId;
    return next;
  };

  const loadReport = async (params = {}, { silent = false } = {}) => {
    const requestId = reportRequestRef.current + 1;
    reportRequestRef.current = requestId;
    if (!silent) setLoading(true);
    setReportError('');
    try {
      const res = await getCouponScanReport(scopedParams(params));
      if (requestId !== reportRequestRef.current) return null;
      setReport(res.data);
      return res.data;
    } catch (err) {
      if (requestId !== reportRequestRef.current) return null;
      console.error('Failed to load coupon scan report:', err);
      setReportError(err.response?.data?.message || t('reports.loadFailed', { defaultValue: 'Could not load the report. Try again.' }));
      return null;
    } finally {
      if (!silent && requestId === reportRequestRef.current) setLoading(false);
    }
  };

  const loadPresetReport = async (presetKey) => {
    await loadReport({ range: presetKey, calendarMode });
  };

  useEffect(() => {
    if (!canFilterCampus) return undefined;
    let cancelled = false;
    getCampuses()
      .then((res) => {
        if (!cancelled) setCampuses(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setCampuses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canFilterCampus]);

  useEffect(() => {
    if (!isPresetKey(activePreset)) return;
    lastCustomIsoRef.current = null;
    loadPresetReport(activePreset);
  }, [activePreset, calendarMode, campusId]);

  useEffect(() => {
    if (isPresetKey(activePreset)) return;
    if (!lastCustomIsoRef.current) return;
    loadReport({ ...lastCustomIsoRef.current, calendarMode });
  }, [calendarMode, activePreset, campusId]);

  useEffect(() => {
    if (!report?.selectedRange?.startDate || !report?.selectedRange?.endDate) return;
    setCustomRange({
      startDate: formatCalendarDate(calendarMode, report.selectedRange.startDate),
      endDate: formatCalendarDate(calendarMode, report.selectedRange.endDate),
    });
  }, [report, calendarMode]);

  useEffect(() => {
    setTablePage(1);
    setEmployeePage(1);
  }, [activePreset, tableSort.key, tableSort.order, campusId]);

  useEffect(() => {
    const rows = report?.byCampus || [];
    if (rows.length === 0) {
      setLetterCafeKey('');
      return;
    }
    setLetterCafeKey((prev) => {
      if (prev && rows.some((item) => cafeRowKey(item) === prev)) return prev;
      return cafeRowKey(rows[0]);
    });
  }, [report]);

  const selectedRangeLabel = useMemo(() => {
    const startDate = report?.selectedRange?.startDate;
    const endDate = report?.selectedRange?.endDate;
    if (startDate && endDate) {
      return formatCalendarDateRange(calendarMode, startDate, endDate);
    }
    return report?.selectedRange?.label || '';
  }, [report, calendarMode]);

  const series = report?.chartSeries || [];
  const selectedCount = report?.metrics?.selectedCount || 0;
  const selectedAmount = report?.metrics?.selectedAmount || 0;
  const rate = report?.metrics?.rate || 0;
  const dailyRows = useMemo(
    () =>
      series.map((item) => ({
        ...item,
        label: formatCalendarShortDate(calendarMode, item.date) || item.label,
      })),
    [series, calendarMode]
  );

  const employees = report?.employees || [];
  const cafeRows = report?.byCampus || [];
  const cafeTotalCount = cafeRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const cafeTotalAmount = cafeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paymentMismatch =
    Math.abs(cafeTotalCount - selectedCount) > 0 || Math.abs(cafeTotalAmount - selectedAmount) > 0.009;

  const totalEmployeePages = Math.max(1, Math.ceil(employees.length / employeePageSize));
  const pagedEmployees = useMemo(() => {
    const start = (employeePage - 1) * employeePageSize;
    return employees.slice(start, start + employeePageSize);
  }, [employees, employeePage, employeePageSize]);

  useEffect(() => {
    setEmployeePage((page) => Math.min(page, totalEmployeePages));
  }, [totalEmployeePages]);

  const sortedTable = useMemo(() => {
    const rows = [...dailyRows];
    rows.sort((a, b) => {
      const dir = tableSort.order === 'asc' ? 1 : -1;
      if (tableSort.key === 'count') return dir * (a.count - b.count);
      if (tableSort.key === 'amount') return dir * (a.amount - b.amount);
      return dir * String(a.date || '').localeCompare(String(b.date || ''));
    });
    return rows;
  }, [dailyRows, tableSort]);

  const totalTablePages = Math.max(1, Math.ceil(sortedTable.length / tablePageSize));
  const pagedTable = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return sortedTable.slice(start, start + tablePageSize);
  }, [sortedTable, tablePage, tablePageSize]);

  useEffect(() => {
    setTablePage((page) => Math.min(page, totalTablePages));
  }, [totalTablePages]);

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        [
          ...cafeRows.map((row) => ({
            Campus: row.campusName,
            Vendor: row.vendorName,
            Vouchers: row.count,
            Amount: row.amount,
            '40 x vouchers': Number(row.count || 0) * (rate || 40),
          })),
          {
            Campus: 'TOTAL',
            Vendor: '',
            Vouchers: cafeTotalCount,
            Amount: cafeTotalAmount,
            '40 x vouchers': cafeTotalCount * (rate || 40),
          },
        ]
      ),
      'Payment by cafe'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        employees.map((row) => ({
          Name: row.name,
          'Employee ID': row.employeeIdNumber,
          Campus: row.campusName || '',
          Vouchers: row.count,
          Amount: row.amount,
          'Last scan': formatCalendarDate(calendarMode, row.lastIssuedAt) || row.lastIssuedAt,
        }))
      ),
      'Employees'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        sortedTable.map((row) => ({
          Date: row.label,
          Coupons: row.count,
          Revenue: row.amount,
          Rate: rate,
        }))
      ),
      'Daily breakdown'
    );
    XLSX.writeFile(wb, `coupon-scan-report-${toIsoDay(new Date())}.xlsx`);
  };

  const exportPdf = () => {
    setPdfError('');
    const title =
      user?.role === 'CAFE_STAFF'
        ? t('reports.cafeTitle', { defaultValue: 'Your cafe scans' })
        : t('reports.title', { defaultValue: 'Coupon Scan Reports' });
    const cafeRows = report?.byCampus || [];
    const cafeTable =
      cafeRows.length === 0
        ? ''
        : `<h2>Payment by cafe</h2>
<table>
  <thead><tr><th>Kitchen</th><th>Vendor</th><th>Vouchers</th><th>Amount (Birr)</th></tr></thead>
  <tbody>
    ${cafeRows
      .map(
        (row) => `<tr>
      <td>${escapeHtml(row.campusName)}</td>
      <td>${escapeHtml(row.vendorName)}</td>
      <td>${escapeHtml(row.count.toLocaleString())}</td>
      <td>${escapeHtml(row.amount.toLocaleString())}</td>
    </tr>`
      )
      .join('')}
  </tbody>
</table>`;

    const campusLabel =
      user?.role === 'CAFE_STAFF'
        ? user?.campus?.name
        : campusId
          ? campuses.find((item) => item.id === campusId)?.name
          : t('reports.allCampuses');
    const showCampusColumn = user?.role !== 'CAFE_STAFF';
    const employeeTable = employees.length
      ? `<h2>Employees who used vouchers</h2>
<table>
  <thead><tr><th>Name</th><th>Employee ID</th>${showCampusColumn ? '<th>Campus</th>' : ''}<th>Vouchers</th><th>Amount (Birr)</th><th>Last scan</th></tr></thead>
  <tbody>
    ${employees
      .map(
        (row) => `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.employeeIdNumber)}</td>
      ${showCampusColumn ? `<td>${escapeHtml(row.campusName || '')}</td>` : ''}
      <td>${escapeHtml(row.count.toLocaleString())}</td>
      <td>${escapeHtml(Number(row.amount || 0).toLocaleString())}</td>
      <td>${escapeHtml(formatCalendarDate(calendarMode, row.lastIssuedAt) || '')}</td>
    </tr>`
      )
      .join('')}
  </tbody>
</table>`
      : '';

    const dayTable = sortedTable
      .map(
        (row) => `<tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${escapeHtml(row.count.toLocaleString())}</td>
      <td>${escapeHtml(row.amount.toLocaleString())}</td>
      <td>${escapeHtml(rate.toLocaleString())}</td>
    </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Segoe UI, Noto Sans Ethiopic, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 8px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .card { border: 1px solid #d5dce6; border-radius: 8px; padding: 10px 12px; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #667085; }
  .value { font-size: 14px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d5dce6; padding: 6px 8px; text-align: left; }
  th { background: #f4f7fb; }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(selectedRangeLabel)}${campusLabel ? ` · ${escapeHtml(campusLabel)}` : ''}</div>
  <h2>Summary</h2>
  <div class="grid">
    <div class="card"><div class="label">Coupons scanned</div><div class="value">${escapeHtml(selectedCount.toLocaleString())}</div></div>
    <div class="card"><div class="label">Total revenue</div><div class="value">${escapeHtml(selectedAmount.toLocaleString())} Birr</div></div>
    <div class="card"><div class="label">Standard rate</div><div class="value">${escapeHtml(rate.toLocaleString())} Birr</div></div>
  </div>
  ${cafeTable}
  ${employeeTable}
  <h2>Daily breakdown</h2>
  <table>
    <thead><tr><th>Period</th><th>Coupons scanned</th><th>Revenue (Birr)</th><th>Standard rate</th></tr></thead>
    <tbody>${dayTable || '<tr><td colspan="4">No scans in this range.</td></tr>'}</tbody>
  </table>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) {
      setPdfError(t('qrCard.popupBlocked', { defaultValue: 'Please allow pop-ups to export the PDF.' }));
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  const resolveEnteredRange = () => {
    const start = parseCalendarDateString(calendarMode, customRange.startDate);
    const end = parseCalendarDateString(calendarMode, customRange.endDate);
    if (!start || !end) return null;
    return start <= end ? { startDate: start, endDate: end } : { startDate: end, endDate: start };
  };

  const handleDownloadPaymentLetter = async (row) => {
    const key = cafeRowKey(row);
    setLetterBusyKey(key);
    setLetterError('');
    try {
      if (!report) {
        throw new Error(t('reports.letterFailed'));
      }
      const cafeRow =
        (report.byCampus || []).find((item) => cafeRowKey(item) === cafeRowKey(row)) ||
        (report.byCampus || []).find((item) => cafeRowKey(item) === letterCafeKey) ||
        ((report.byCampus || []).length === 1 ? report.byCampus[0] : null) ||
        null;
      if (!cafeRow) {
        throw new Error(t('reports.letterNeedScans'));
      }
      await downloadPaymentOrderFromReport({
        report,
        row: cafeRow,
        calendarMode,
      });
    } catch (err) {
      console.error(err);
      setLetterError(err.message || t('reports.letterFailed'));
    } finally {
      setLetterBusyKey('');
    }
  };

  const canWritePaymentLetter = user?.role === 'HR';

  const handlePresetClick = (presetKey) => {
    setActivePreset(presetKey);
  };

  const handleApplyCustomRange = () => {
    const entered = resolveEnteredRange();
    if (!entered) return;

    setActivePreset('custom');
    lastCustomIsoRef.current = {
      startDate: toIsoDay(entered.startDate),
      endDate: toIsoDay(entered.endDate),
    };
    loadReport({
      ...lastCustomIsoRef.current,
      calendarMode,
    });
  };

  const handleResetRange = () => {
    setCustomRange({ startDate: '', endDate: '' });
    lastCustomIsoRef.current = null;
    setActivePreset(user?.role === 'CAFE_STAFF' ? 'today' : 'thisMonth');
  };

  if (loading && !report) return <PageSkeleton cards={3} table={false} />;

  if (reportError && !report) {
    return (
      <div className="page-shell">
        <PageHeader title={t('reports.title')} />
        <p className="alert-error mt-4">{reportError}</p>
      </div>
    );
  }

  if (!report) return <PageSkeleton cards={3} table={false} />;

  const summaryItems = [
    { label: 'Date Range', value: selectedRangeLabel },
    { label: 'Coupons Scanned', value: selectedCount.toLocaleString() },
    { label: 'Standard Rate', value: `${rate.toLocaleString()} ${t('common.birr')}` },
    { label: 'Total Revenue', value: `${selectedAmount.toLocaleString()} ${t('common.birr')}` },
  ];

  return (
    <div className="page-shell space-y-6">
      {reportError && <p className="alert-error">{reportError}</p>}
      <div className="surface-card flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title={
            user?.role === 'CAFE_STAFF'
              ? t('reports.cafeTitle', { defaultValue: 'Your cafe scans' })
              : t('reports.title', { defaultValue: 'Coupon Scan Reports' })
          }
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <CalendarDays className="w-4 h-4 text-app-secondary" />
              <span>{selectedRangeLabel}</span>
              {user?.role === 'CAFE_STAFF' && user?.campus?.name && (
                <span className="badge">{user.campus.name}</span>
              )}
              {canFilterCampus && (
                <span className="badge">
                  {campusId
                    ? campuses.find((item) => item.id === campusId)?.name || t('reports.kitchen')
                    : t('reports.allCampuses')}
                </span>
              )}
            </span>
          }
        />
        <div className="flex flex-wrap gap-2">
          {canWritePaymentLetter && !paymentMismatch && (report?.byCampus || []).length === 1 && (
            <button
              type="button"
              onClick={() => handleDownloadPaymentLetter((report?.byCampus || [])[0])}
              className="btn-primary"
              disabled={!!letterBusyKey}
            >
              <FileText className="w-4 h-4" />
              <span>
                {letterBusyKey ? t('reports.letterPreparing') : t('reports.downloadWord')}
              </span>
            </button>
          )}
          <button type="button" onClick={exportPdf} className="btn-secondary">
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button type="button" onClick={exportExcel} className="btn-secondary">
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
      {pdfError && <p className="alert-error text-sm">{pdfError}</p>}
      {paymentMismatch && (
        <p className="alert-error">
          {t('reports.paymentMismatch', {
            defaultValue:
              'Payment rows do not add up to the report total. Do not download a letter until this matches. Reload Reports.',
          })}
        </p>
      )}

      <div className="surface-card flex flex-col gap-4 no-print">
        {canFilterCampus && campuses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-app-secondary uppercase tracking-wider">
              {t('reports.campusFilter')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCampusId('')}
                className={`px-4 py-2 rounded-card border text-sm font-semibold transition-colors ${
                  campusId === '' ? 'text-white border-transparent' : 'text-app-secondary border-app-border hover:text-app-primary'
                }`}
                style={campusId === '' ? { backgroundColor: 'var(--color-primary)' } : undefined}
              >
                {t('reports.allCampuses')}
              </button>
              {campuses.map((campus) => (
                <button
                  key={campus.id}
                  type="button"
                  onClick={() => setCampusId(campus.id)}
                  className={`px-4 py-2 rounded-card border text-sm font-semibold transition-colors ${
                    campusId === campus.id ? 'text-white border-transparent' : 'text-app-secondary border-app-border hover:text-app-primary'
                  }`}
                  style={campusId === campus.id ? { backgroundColor: 'var(--color-primary)' } : undefined}
                >
                  {campus.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-app-muted">{t('reports.campusFilterHelp')}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handlePresetClick(preset.key)}
              className={`px-4 py-2 rounded-card border text-sm font-semibold transition-colors ${
                activePreset === preset.key ? 'text-white border-transparent' : 'text-app-secondary border-app-border hover:text-app-primary'
              }`}
              style={activePreset === preset.key ? { backgroundColor: 'var(--color-primary)' } : undefined}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-xs font-bold text-app-secondary uppercase tracking-wider">Start Date</label>
              <CalendarDatePicker
                calendarMode={calendarMode}
                value={customRange.startDate}
                onChange={(nextValue) => setCustomRange((value) => ({ ...value, startDate: nextValue }))}
                maxDate={parseCalendarDateString(calendarMode, customRange.endDate)}
                placeholder={DATE_INPUT_FORMAT}
                className="glass-input"
              />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <label className="text-xs font-bold text-app-secondary uppercase tracking-wider">End Date</label>
              <CalendarDatePicker
                calendarMode={calendarMode}
                value={customRange.endDate}
                onChange={(nextValue) => setCustomRange((value) => ({ ...value, endDate: nextValue }))}
                minDate={parseCalendarDateString(calendarMode, customRange.startDate)}
                placeholder={DATE_INPUT_FORMAT}
                className="glass-input"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" className="btn-primary" onClick={handleApplyCustomRange}>
                Apply
              </button>
              <button type="button" className="btn-secondary" onClick={handleResetRange}>
                Reset
              </button>
            </div>
          </div>
          <p className="text-xs text-app-muted">
            Uses the {CALENDARS[calendarMode].toLowerCase()} ({DATE_INPUT_FORMAT}). Apply the range, then download the letter for those dates.
          </p>
        </div>
      </div>

      {canWritePaymentLetter && (
        <div className="surface-card space-y-3 no-print">
          <h3 className="text-lg font-semibold text-app-primary">{t('reports.paymentLetter')}</h3>
          <p className="text-sm text-app-muted">{t('reports.letterHelp')}</p>
          {letterError && <p className="alert-error text-sm">{letterError}</p>}
          {(report?.byCampus || []).length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-app-secondary">{t('reports.letterNeedScans')}</p>
              <button
                type="button"
                className="btn-primary"
                disabled={!!letterBusyKey}
                onClick={() => handleDownloadPaymentLetter(null)}
              >
                <FileText className="w-4 h-4" />
                {letterBusyKey ? t('reports.letterPreparing') : t('reports.downloadWord')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-app-secondary uppercase tracking-wider">
                  {t('reports.vendor')}
                </label>
                <select
                  className="glass-input"
                  value={letterCafeKey}
                  onChange={(e) => setLetterCafeKey(e.target.value)}
                >
                  {(report.byCampus || []).map((row) => {
                    const key = cafeRowKey(row);
                    return (
                      <option key={key} value={key}>
                        {row.vendorName} — {row.campusName} ({row.count.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={!!letterBusyKey}
                onClick={() => {
                  const rows = report.byCampus || [];
                  const row =
                    rows.find((item) => cafeRowKey(item) === letterCafeKey) ||
                    (rows.length === 1 ? rows[0] : null);
                  if (row) handleDownloadPaymentLetter(row);
                }}
              >
                <FileText className="w-4 h-4" />
                {letterBusyKey ? t('reports.letterPreparing') : t('reports.downloadWord')}
              </button>
            </div>
          )}
        </div>
      )}

      {(report?.byCampus || []).length > 0 && (
        <div className="surface-card space-y-3">
          <h3 className="text-lg font-semibold text-app-primary">
            {user?.role === 'CAFE_STAFF'
              ? t('reports.cafePayment')
              : t('reports.paymentByCafe')}
          </h3>
          <p className="text-sm text-app-muted">
            {user?.role === 'CAFE_STAFF'
              ? t('reports.cafePaymentHelp')
              : t('reports.paymentByCafeHelp')}
          </p>
          {letterError && <p className="alert-error text-sm no-print">{letterError}</p>}
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>{t('reports.kitchen')}</th>
                  <th>{t('reports.vendor')}</th>
                  <th>{t('reports.vouchers')}</th>
                  <th>{t('reports.amount')}</th>
                  {canWritePaymentLetter && (
                    <th className="no-print">{t('reports.paymentLetter')}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {report.byCampus.map((row, index) => (
                  <tr key={`${row.campusId || 'none'}-${row.vendorId || 'none'}-${index}`}>
                    <td>{row.campusName}</td>
                    <td>{row.vendorName}</td>
                    <td>{row.count.toLocaleString()}</td>
                    <td>{Number(row.amount || 0).toLocaleString()} {t('common.birr')}</td>
                    {canWritePaymentLetter && (
                      <td className="no-print">
                        <button
                          type="button"
                          className="btn-secondary !min-h-0 !py-1.5 !px-3 text-xs"
                          disabled={paymentMismatch || letterBusyKey === cafeRowKey(row)}
                          onClick={() => handleDownloadPaymentLetter(row)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {letterBusyKey === cafeRowKey(row)
                            ? t('reports.letterPreparing')
                            : t('reports.downloadWord')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="font-semibold">{t('reports.total')}</td>
                  <td className="font-semibold">{cafeTotalCount.toLocaleString()}</td>
                  <td className="font-semibold">{cafeTotalAmount.toLocaleString()} {t('common.birr')}</td>
                  {canWritePaymentLetter && <td className="no-print" />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="surface-card space-y-4">
        <p className="section-label">Summary</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-card border border-app-border p-3" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="text-[11px] uppercase tracking-wider text-app-muted">{item.label}</div>
              <div className="mt-1 text-base font-semibold text-app-primary break-words">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card space-y-4">
        <div>
          <p className="section-label mb-2">Employees</p>
          <h3 className="text-xl font-semibold text-app-primary">Employees who used vouchers</h3>
        </div>
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  {canFilterCampus && <th>{t('reports.kitchen')}</th>}
                  <th>Vouchers</th>
                  <th>Amount</th>
                  <th>Last scan</th>
                </tr>
              </thead>
              <tbody>
                {pagedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={canFilterCampus ? 6 : 5} className="text-app-muted">No voucher use in this range.</td>
                  </tr>
                ) : (
                  pagedEmployees.map((row) => (
                    <tr key={`${row.id}-${row.campusId || 'none'}`}>
                      <td>{row.name}</td>
                      <td>{row.employeeIdNumber}</td>
                      {canFilterCampus && <td>{row.campusName || t('reports.unassignedCampus')}</td>}
                      <td>{row.count.toLocaleString()}</td>
                      <td>{Number(row.amount || 0).toLocaleString()} {t('common.birr')}</td>
                      <td>{formatCalendarDate(calendarMode, row.lastIssuedAt) || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-app-border pt-4 sm:flex-row sm:items-center sm:justify-between no-print">
          <div className="text-sm text-app-secondary">
            Showing {employees.length === 0 ? 0 : (employeePage - 1) * employeePageSize + 1}-{Math.min(employeePage * employeePageSize, employees.length)} of {employees.length} employees
          </div>
          <div className="flex items-center gap-2">
            <select
              value={employeePageSize}
              onChange={(e) => {
                setEmployeePageSize(Number(e.target.value));
                setEmployeePage(1);
              }}
              className="glass-input !w-auto"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              disabled={employeePage <= 1}
              onClick={() => setEmployeePage((page) => Math.max(page - 1, 1))}
            >
              Previous
            </button>
            <span className="text-sm text-app-secondary">
              Page {employeePage} of {totalEmployeePages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={employeePage >= totalEmployeePages}
              onClick={() => setEmployeePage((page) => Math.min(page + 1, totalEmployeePages))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="surface-card space-y-4">
        <div>
          <p className="section-label mb-2">Period Analytics</p>
          <h3 className="text-xl font-semibold text-app-primary">Daily breakdown</h3>
        </div>

        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table-modern">
              <thead>
                <tr>
                  {[
                    ['date', 'Period'],
                    ['count', 'Coupons Scanned'],
                    ['amount', 'Revenue'],
                    ['rate', 'Standard Rate'],
                  ].map(([key, label]) => (
                    <th key={key} className="sticky top-0 bg-app-surface z-10">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() =>
                          setTableSort((s) => ({
                            key,
                            order: s.key === key && s.order === 'asc' ? 'desc' : 'asc',
                          }))
                        }
                      >
                        {label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedTable.map((row) => (
                  <tr key={row.date} className="hover:bg-app-surface-2/10">
                    <td>{row.label}</td>
                    <td>{row.count.toLocaleString()}</td>
                    <td>{row.amount.toLocaleString()} {t('common.birr')}</td>
                    <td>{rate.toLocaleString()} {t('common.birr')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-app-border pt-4 sm:flex-row sm:items-center sm:justify-between no-print">
          <div className="text-sm text-app-secondary">
            Showing {sortedTable.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}-{Math.min(tablePage * tablePageSize, sortedTable.length)} of {sortedTable.length} days
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tablePageSize}
              onChange={(e) => {
                setTablePageSize(Number(e.target.value));
                setTablePage(1);
              }}
              className="glass-input !w-auto"
            >
              {[5, 10, 25, 50].map((size) => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              disabled={tablePage <= 1}
              onClick={() => setTablePage((page) => Math.max(page - 1, 1))}
            >
              Previous
            </button>
            <span className="text-sm text-app-secondary">
              Page {tablePage} of {totalTablePages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={tablePage >= totalTablePages}
              onClick={() => setTablePage((page) => Math.min(page + 1, totalTablePages))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
