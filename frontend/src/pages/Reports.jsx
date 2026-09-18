import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useCalendar } from '../context/CalendarContext.jsx';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { getCouponScanReport } from '../services/couponScan.service.js';
import { downloadPaymentOrderFromReport } from '../utils/downloadPaymentOrder.js';
import {
  formatCalendarDate,
  formatCalendarDateRange,
  formatCalendarShortDate,
  parseCalendarDateString,
  toIsoDay,
} from '../utils/ethiopianDate.js';
import { CalendarDays, Download, FileText, Printer, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

const formatPct = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
};

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
  const [letterBusyKey, setLetterBusyKey] = useState('');
  const [letterError, setLetterError] = useState('');
  const [letterCafeKey, setLetterCafeKey] = useState('');
  const [pdfError, setPdfError] = useState('');

  const loadReport = async (params = {}) => {
    setLoading(true);
    try {
      const res = await getCouponScanReport(params);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load coupon scan report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPresetReport = async (presetKey) => {
    await loadReport({ range: presetKey, calendarMode });
  };

  useEffect(() => {
    if (!isPresetKey(activePreset)) return;
    loadPresetReport(activePreset);
  }, [activePreset, calendarMode]);

  useEffect(() => {
    setCustomRange({ startDate: '', endDate: '' });
  }, [calendarMode]);

  useEffect(() => {
    if (!report?.selectedRange?.startDate || !report?.selectedRange?.endDate) return;
    if (!isPresetKey(activePreset)) return;
    setCustomRange({
      startDate: formatCalendarDate(calendarMode, report.selectedRange.startDate),
      endDate: formatCalendarDate(calendarMode, report.selectedRange.endDate),
    });
  }, [report, activePreset, calendarMode]);

  useEffect(() => {
    setTablePage(1);
  }, [activePreset, tableSort.key, tableSort.order]);

  useEffect(() => {
    const rows = report?.byCampus || [];
    if (rows.length === 0) {
      setLetterCafeKey('');
      return;
    }
    setLetterCafeKey(`${rows[0].campusId || 'none'}-${rows[0].vendorId || 'none'}-0`);
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
  const comparison = report?.comparison;
  const summary = report?.summary || {};

  const dailyRows = useMemo(
    () =>
      series.map((item) => ({
        ...item,
        label: formatCalendarShortDate(calendarMode, item.date) || item.label,
      })),
    [series, calendarMode]
  );

  const summaryHighestDay = useMemo(() => {
    if (!summary.highestScanDay) return null;
    return {
      ...summary.highestScanDay,
      label: formatCalendarShortDate(calendarMode, summary.highestScanDay.date) || summary.highestScanDay.label,
    };
  }, [summary.highestScanDay, calendarMode]);

  const summaryLowestDay = useMemo(() => {
    if (!summary.lowestScanDay) return null;
    return {
      ...summary.lowestScanDay,
      label: formatCalendarShortDate(calendarMode, summary.lowestScanDay.date) || summary.lowestScanDay.label,
    };
  }, [summary.lowestScanDay, calendarMode]);

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

  const comparisonBadge = (value) => {
    if (value === null || value === undefined) return <span className="text-app-muted">No comparison</span>;
    const isPositive = value >= 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
        <Icon className="w-3.5 h-3.5" />
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    );
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = sortedTable.map((row) => ({
      Date: row.label,
      Coupons: row.count,
      Revenue: row.amount,
      Rate: rate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Coupon Scan Report');
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
  <div class="meta">${escapeHtml(selectedRangeLabel)}${user?.campus?.name ? ` · ${escapeHtml(user.campus.name)}` : ''}</div>
  <h2>Summary</h2>
  <div class="grid">
    <div class="card"><div class="label">Coupons scanned</div><div class="value">${escapeHtml(selectedCount.toLocaleString())}</div></div>
    <div class="card"><div class="label">Total revenue</div><div class="value">${escapeHtml(selectedAmount.toLocaleString())} Birr</div></div>
    <div class="card"><div class="label">Standard rate</div><div class="value">${escapeHtml(rate.toLocaleString())} Birr</div></div>
    <div class="card"><div class="label">Average / day</div><div class="value">${escapeHtml(summary.averagePerDay?.toLocaleString?.() ?? summary.averagePerDay ?? 0)}</div></div>
    <div class="card"><div class="label">Revenue / day</div><div class="value">${escapeHtml(summary.averageRevenuePerDay?.toLocaleString?.() ?? summary.averageRevenuePerDay ?? 0)} Birr</div></div>
    <div class="card"><div class="label">Highest day</div><div class="value">${escapeHtml(summaryHighestDay?.label || '—')}</div></div>
    <div class="card"><div class="label">Lowest day</div><div class="value">${escapeHtml(summaryLowestDay?.label || '—')}</div></div>
    <div class="card"><div class="label">Vs previous period</div><div class="value">${escapeHtml(formatPct(comparison?.selectedVsPreviousCount))}</div></div>
    <div class="card"><div class="label">Revenue change</div><div class="value">${escapeHtml(formatPct(comparison?.selectedVsPreviousAmount))}</div></div>
  </div>
  ${cafeTable}
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

  const handleDownloadPaymentLetter = async (row) => {
    const key = `${row?.campusId || 'none'}-${row?.vendorId || 'none'}`;
    setLetterBusyKey(key);
    setLetterError('');
    try {
      await downloadPaymentOrderFromReport({
        report,
        row: row || (report?.byCampus || [])[0] || null,
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
    const start = parseCalendarDateString(calendarMode, customRange.startDate);
    const end = parseCalendarDateString(calendarMode, customRange.endDate);
    if (!start || !end) return;

    const startDate = start <= end ? start : end;
    const endDate = start <= end ? end : start;

    setActivePreset('custom');
    loadReport({
      startDate: toIsoDay(startDate),
      endDate: toIsoDay(endDate),
      calendarMode,
    });
  };

  const handleResetRange = () => {
    setCustomRange({ startDate: '', endDate: '' });
    setActivePreset('thisMonth');
  };

  if (loading || !report) return <PageSkeleton cards={3} table={false} />;

  const summaryItems = [
    { label: 'Date Range', value: selectedRangeLabel },
    { label: 'Coupons Scanned', value: selectedCount.toLocaleString() },
    { label: 'Standard Rate', value: `${rate.toLocaleString()} ${t('common.birr')}` },
    { label: 'Total Revenue', value: `${selectedAmount.toLocaleString()} ${t('common.birr')}` },
    { label: 'Average / Day', value: summary.averagePerDay?.toLocaleString?.() ?? summary.averagePerDay ?? 0 },
    { label: 'Revenue / Day', value: `${summary.averageRevenuePerDay?.toLocaleString?.() ?? summary.averageRevenuePerDay ?? 0} ${t('common.birr')}` },
    { label: 'Highest Day', value: summaryHighestDay?.label || '-' },
    { label: 'Lowest Day', value: summaryLowestDay?.label || '-' },
  ];

  return (
    <div className="page-shell space-y-6">
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
              {user?.campus?.name && (
                <span className="badge">{user.campus.name}</span>
              )}
            </span>
          }
        />
        <div className="flex flex-wrap gap-2">
          {canWritePaymentLetter && (
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

      <div className="surface-card flex flex-col gap-4 no-print">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-app-secondary uppercase tracking-wider">Start Date</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              value={customRange.startDate}
              onChange={(e) => setCustomRange((value) => ({ ...value, startDate: e.target.value }))}
              className="glass-input"
            />
            <p className="text-xs text-app-muted">Enter the {CALENDARS[calendarMode].toLowerCase()} date in DD/MM/YYYY format.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-app-secondary uppercase tracking-wider">End Date</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              value={customRange.endDate}
              onChange={(e) => setCustomRange((value) => ({ ...value, endDate: e.target.value }))}
              className="glass-input"
            />
            <p className="text-xs text-app-muted">Stored and queried as Gregorian UTC behind the scenes.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary w-full" onClick={handleApplyCustomRange}>
              Apply
            </button>
            <button className="btn-secondary w-full" onClick={handleResetRange}>
              Reset
            </button>
          </div>
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
                  {(report.byCampus || []).map((row, index) => {
                    const key = `${row.campusId || 'none'}-${row.vendorId || 'none'}-${index}`;
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
                    rows.find((item, index) => `${item.campusId || 'none'}-${item.vendorId || 'none'}-${index}` === letterCafeKey) ||
                    rows[0];
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
                    <td>{row.amount.toLocaleString()} {t('common.birr')}</td>
                    {canWritePaymentLetter && (
                      <td className="no-print">
                        <button
                          type="button"
                          className="btn-secondary !min-h-0 !py-1.5 !px-3 text-xs"
                          disabled={letterBusyKey === `${row.campusId || 'none'}-${row.vendorId || 'none'}`}
                          onClick={() => handleDownloadPaymentLetter(row)}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {letterBusyKey === `${row.campusId || 'none'}-${row.vendorId || 'none'}`
                            ? t('reports.letterPreparing')
                            : t('reports.downloadWord')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

        <div className="surface-card space-y-3">
          <p className="section-label">Comparison</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-app-muted">Vs previous period</span>
              {comparison ? comparisonBadge(comparison.selectedVsPreviousCount) : <span className="text-app-muted">No comparison</span>}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-app-muted">Revenue change</span>
              {comparison ? comparisonBadge(comparison.selectedVsPreviousAmount) : <span className="text-app-muted">No comparison</span>}
            </div>
            <div className="pt-2 border-t border-app-border text-xs text-app-muted">
              {summaryHighestDay?.label && (
                <div>
                  Highest day: <span className="text-app-primary">{summaryHighestDay.label}</span>
                </div>
              )}
              {summaryLowestDay?.label && (
                <div>
                  Lowest day: <span className="text-app-primary">{summaryLowestDay.label}</span>
                </div>
              )}
            </div>
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
