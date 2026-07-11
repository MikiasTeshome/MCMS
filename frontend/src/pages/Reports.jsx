import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, PageSkeleton } from '../components/ui/Page.jsx';
import { getCouponScanReport } from '../services/couponScan.service.js';
import { CalendarDays, Download, Printer, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

const toInputDate = (date) => new Date(date).toISOString().slice(0, 10);

const Reports = () => {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [activeMetric, setActiveMetric] = useState('count');
  const [activePreset, setActivePreset] = useState('thisMonth');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [tableSort, setTableSort] = useState({ key: 'date', order: 'asc' });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [hoveredPoint, setHoveredPoint] = useState(null);

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

  useEffect(() => {
    loadReport({ range: activePreset });
  }, [activePreset]);

  useEffect(() => {
    setTablePage(1);
  }, [activePreset, tableSort.key, tableSort.order]);

  const rangeLabel = report?.selectedRange?.label || '';
  const series = report?.chartSeries || [];
  const selectedCount = report?.metrics?.selectedCount || 0;
  const selectedAmount = report?.metrics?.selectedAmount || 0;
  const rate = report?.metrics?.rate || 0;
  const comparison = report?.comparison;
  const summary = report?.summary || {};

  const chartData = useMemo(() => {
    return series.map((item, index) => ({
      ...item,
      value: activeMetric === 'amount' ? item.amount : item.count,
      index,
    }));
  }, [series, activeMetric]);

  const maxValue = Math.max(1, ...chartData.map((item) => item.value));
  const minValue = Math.min(0, ...chartData.map((item) => item.value));
  const width = 800;
  const height = 280;
  const padding = 36;

  const points = chartData.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(chartData.length - 1, 1);
    const normalized = (item.value - minValue) / Math.max(maxValue - minValue, 1);
    const y = height - padding - normalized * (height - padding * 2);
    return { ...item, x, y };
  });

  const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points.at(-1)?.x || padding} ${height - padding} L ${points[0]?.x || padding} ${height - padding} Z`;

  const sortedTable = useMemo(() => {
    const rows = [...chartData];
    rows.sort((a, b) => {
      const dir = tableSort.order === 'asc' ? 1 : -1;
      if (tableSort.key === 'count') return dir * (a.count - b.count);
      if (tableSort.key === 'amount') return dir * (a.amount - b.amount);
      return dir * a.date.localeCompare(b.date);
    });
    return rows;
  }, [chartData, tableSort]);

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
    XLSX.writeFile(wb, `coupon-scan-report-${toInputDate(new Date())}.xlsx`);
  };

  const exportPdf = () => window.print();

  if (loading || !report) return <PageSkeleton cards={3} table={false} />;

  const summaryItems = [
    { label: 'Date Range', value: rangeLabel },
    { label: 'Coupons Scanned', value: selectedCount.toLocaleString() },
    { label: 'Standard Rate', value: `${rate.toLocaleString()} ${t('common.birr')}` },
    { label: 'Total Revenue', value: `${selectedAmount.toLocaleString()} ${t('common.birr')}` },
    { label: 'Average / Day', value: summary.averagePerDay?.toLocaleString?.() ?? summary.averagePerDay ?? 0 },
    { label: 'Revenue / Day', value: `${summary.averageRevenuePerDay?.toLocaleString?.() ?? summary.averageRevenuePerDay ?? 0} ${t('common.birr')}` },
    { label: 'Highest Day', value: summary.highestScanDay?.label || '—' },
    { label: 'Lowest Day', value: summary.lowestScanDay?.label || '—' },
  ];

  return (
    <div className="page-shell space-y-6 print:space-y-4">
      <div className="surface-card flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between print:border-0 print:p-0">
        <PageHeader
          title={t('reports.title', { defaultValue: 'Coupon Scan Reports' })}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <CalendarDays className="w-4 h-4 text-app-secondary" />
              <span>{rangeLabel}</span>
            </span>
          }
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={exportPdf} className="btn-secondary print:hidden">
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button onClick={exportExcel} className="btn-secondary print:hidden">
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <div className="surface-card flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setActivePreset(preset.key)}
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
            <input type="date" value={customRange.startDate} onChange={(e) => setCustomRange((v) => ({ ...v, startDate: e.target.value }))} className="glass-input" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-app-secondary uppercase tracking-wider">End Date</label>
            <input type="date" value={customRange.endDate} onChange={(e) => setCustomRange((v) => ({ ...v, endDate: e.target.value }))} className="glass-input" />
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary w-full"
              onClick={() => {
                if (!customRange.startDate || !customRange.endDate) return;
                setActivePreset('custom');
                loadReport({ startDate: customRange.startDate, endDate: customRange.endDate });
              }}
            >
              Apply
            </button>
            <button
              className="btn-secondary w-full"
              onClick={() => {
                setCustomRange({ startDate: '', endDate: '' });
                setActivePreset('thisMonth');
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="surface-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label mb-2">Trend Chart</p>
            <h3 className="text-xl font-semibold text-app-primary">
              {activeMetric === 'count' ? 'Coupons Scanned Over Time' : 'Revenue Over Time'}
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className={`btn-secondary ${activeMetric === 'count' ? 'ring-1 ring-app-border' : ''}`} onClick={() => setActiveMetric('count')}>Coupons Scanned</button>
            <button className={`btn-secondary ${activeMetric === 'amount' ? 'ring-1 ring-app-border' : ''}`} onClick={() => setActiveMetric('amount')}>Revenue</button>
            <span className="rounded-full px-3 py-1 border border-app-border bg-app-surface-2/50 text-sm text-app-secondary">
              {selectedCount.toLocaleString()} coupons
            </span>
            <span className="rounded-full px-3 py-1 border border-app-border bg-app-surface-2/50 text-sm text-app-secondary">
              {selectedAmount.toLocaleString()} {t('common.birr')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.7fr)] gap-5">
          <div className="rounded-card border border-app-border p-4 overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="relative w-full overflow-x-auto">
              <svg ref={chartRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-[340px]">
                <defs>
                  <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.04" />
                  </linearGradient>
                </defs>
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--color-border)" strokeWidth="1" />
                <path d={areaD} fill="url(#chartFill)" />
                <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
                {points.map((point) => (
                  <g key={point.date} onMouseEnter={() => setHoveredPoint(point)} onMouseLeave={() => setHoveredPoint(null)}>
                    <circle cx={point.x} cy={point.y} r="4.5" fill="var(--color-primary)" />
                    <circle cx={point.x} cy={point.y} r="11" fill="transparent" />
                  </g>
                ))}
              </svg>

              {hoveredPoint && (
                <div className="absolute top-4 right-4 rounded-card border border-app-border bg-app-surface px-4 py-3 shadow-lg">
                  <div className="text-xs text-app-muted">{hoveredPoint.label}</div>
                  <div className="text-2xl font-semibold text-app-primary">{hoveredPoint.value.toLocaleString()}</div>
                  <div className="text-xs text-app-secondary">{activeMetric === 'count' ? 'Coupons' : `Birr (${t('common.birr')})`}</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="surface-card surface-card-hover space-y-4">
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

            <div className="surface-card surface-card-hover space-y-3">
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
                  {summary.highestScanDay?.label && (
                    <div>Highest day: <span className="text-app-primary">{summary.highestScanDay.label}</span></div>
                  )}
                  {summary.lowestScanDay?.label && (
                    <div>Lowest day: <span className="text-app-primary">{summary.lowestScanDay.label}</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-label mb-2">Period Analytics</p>
            <h3 className="text-xl font-semibold text-app-primary">Daily breakdown</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-app-secondary">
            <TrendingUp className="w-4 h-4" />
            <span>Sortable table with sticky header</span>
          </div>
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
                      <button type="button" className="inline-flex items-center gap-1" onClick={() => setTableSort((s) => ({ key, order: s.key === key && s.order === 'asc' ? 'desc' : 'asc' }))}>
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

        <div className="flex flex-col gap-3 border-t border-app-border pt-4 sm:flex-row sm:items-center sm:justify-between">
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
