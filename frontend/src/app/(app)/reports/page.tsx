'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { formatRupiah } from '@/lib/format';
import { formatDateId, getBusinessDate, getRelativeBusinessDate } from '@/lib/date';
import { FinancialReportSummary } from '@/lib/finance/auto-ledger';
import {
  downloadFinancialReportCsv,
  openPrintableReportPdf,
} from '@/lib/finance/report-exporter';
import {
  Store,
  Calendar,
  RefreshCw,
  FileText,
  Download,
  BarChart3,
  PieChart,
  Package,
  CreditCard,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { MetricStrip } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ReportsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [period, setPeriod] = useState<string>('this_month'); // today | yesterday | this_week | this_month | last_month | custom
  const [customStart, setCustomStart] = useState<string>(getRelativeBusinessDate(-29));
  const [customEnd, setCustomEnd] = useState<string>(getBusinessDate());

  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'branches' | 'products'>('overview');
  const [report, setReport] = useState<FinancialReportSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches');
      const json = await res.json();
      if (res.ok && json.data) {
        setBranches(json.data.filter((b: Branch) => b.is_active));
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch PnL Report
  const fetchReport = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setErrorMsg(null);

        const params = new URLSearchParams();
        if (selectedBranchId !== 'ALL') params.set('branch_id', selectedBranchId);
        params.set('period', period);
        if (period === 'custom') {
          params.set('start_date', customStart);
          params.set('end_date', customEnd);
        }

        const res = await fetch(`/api/reports/pnl?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error?.message || 'Gagal memuat laporan finansial');
        }

        setReport(json.data);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data laporan');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedBranchId, period, customStart, customEnd]
  );

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Max value in daily timeline for dynamic bar height calculation
  const maxDailyValue = useMemo(() => {
    if (!report?.daily_timeline || report.daily_timeline.length === 0) return 1;
    const maxRev = Math.max(...report.daily_timeline.map((d) => d.revenue));
    const maxExp = Math.max(...report.daily_timeline.map((d) => d.expenses));
    return Math.max(maxRev, maxExp, 1);
  }, [report?.daily_timeline]);

  // Export handlers
  const handleExportCsv = () => {
    if (!report) {
      alert('Data laporan belum siap diekspor.');
      return;
    }
    const currentBranchName =
      selectedBranchId === 'ALL'
        ? 'Seluruh Cabang'
        : branches.find((b) => b.id === selectedBranchId)?.name || 'Cabang';
    downloadFinancialReportCsv(report, `Alur - ${currentBranchName}`);
  };

  const handleExportPdf = () => {
    if (!report) {
      alert('Data laporan belum siap dicetak.');
      return;
    }
    const currentBranchName =
      selectedBranchId === 'ALL'
        ? 'Seluruh Cabang'
        : branches.find((b) => b.id === selectedBranchId)?.name || 'Cabang';
    openPrintableReportPdf(report, 'Alur UMKM', currentBranchName);
  };

  const branchDisplay =
    selectedBranchId === 'ALL'
      ? '(Seluruh Cabang)'
      : branches.find((b) => b.id === selectedBranchId)?.name || 'Cabang Terpilih';

  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Laporan Keuangan
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Ringkasan omzet, modal barang, pengeluaran, dan laba usaha.
            </p>
          </div>

          {/* Quick Actions (F4 Export Handlers) */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              disabled={!report || loading}
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 shadow-2xs"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Ekspor Dokumen PDF</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={!report || loading}
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ekspor CSV</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Branch & Preset Period */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Store className="w-4 h-4 text-slate-400" />
              <select
                aria-label="Filter Cabang Laporan"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs">
              {[
                { id: 'yesterday', label: 'Kemarin' },
                { id: 'this_month', label: '30 Hari Terakhir' },
                { id: 'custom', label: 'Rentang Kustom' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    period === p.id
                       ? 'bg-white text-brand-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers & Refresh */}
          <div className="flex items-center gap-2 justify-end">
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  aria-label="Tanggal mulai kustom"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 text-xs"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  aria-label="Tanggal akhir kustom"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 text-xs"
                />
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReport(true)}
              disabled={refreshing || loading}
              className="h-9 w-9 p-0 flex items-center justify-center text-slate-600 hover:text-slate-900"
              title="Perbarui Data Laporan"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-sage-600' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-600 font-bold ml-2 hover:text-rose-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !report ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3 rounded-xl border border-slate-200 bg-white">
            <Loader2 className="w-8 h-8 animate-spin text-sage-600" />
            <p className="text-xs font-semibold text-slate-600">
              Menghitung buku besar otomatis dan mengagregasi laporan finansial...
            </p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* 4-KPI Metric Strip */}
            <MetricStrip
              title={`Laporan Keuangan ${branchDisplay}`}
              action={
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-slate-700 font-semibold">
                      {formatDateId(report.period.start_date)} – {formatDateId(report.period.end_date)}
                    </span>
                    <span>({report.period.total_days} hari)</span>
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-slate-800 font-mono">{report.metrics.total_transactions}</strong> transaksi
                    {report.metrics.void_count > 0 && (
                      <span className="text-rose-600 ml-1">({report.metrics.void_count} dibatalkan)</span>
                    )}
                  </span>
                </div>
              }
              metrics={[
                {
                  label: 'Total Omzet',
                  value: formatRupiah(report.metrics.total_revenue),
                  subtext: `Rata-rata ${formatRupiah(report.metrics.average_ticket_size)}/transaksi`,
                },
                {
                  label: 'Modal Barang',
                  value: formatRupiah(report.metrics.total_cogs),
                  subtext:
                    report.metrics.total_revenue > 0
                      ? `${((report.metrics.total_cogs / report.metrics.total_revenue) * 100).toFixed(1)}% dari omzet`
                      : '0% dari omzet',
                },
                {
                  label: 'Pengeluaran Operasional',
                  value: formatRupiah(report.metrics.total_expenses),
                  subtext: `${report.expenses_by_category.length} kategori pengeluaran`,
                },
                {
                  label: 'Laba Bersih',
                  value: `${report.metrics.net_profit >= 0 ? '+' : ''}${formatRupiah(report.metrics.net_profit)}`,
                  subtext: `Margin bersih ${report.metrics.net_margin_pct}%`,
                  badge:
                    report.metrics.net_profit >= 0 ? (
                      <Badge variant="success" dot>
                        Surplus
                      </Badge>
                    ) : (
                      <Badge variant="danger" dot>
                        Defisit
                      </Badge>
                    ),
                },
              ]}
            />

            {/* TAB NAVIGATION (Segmented Control) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
              {[
                { id: 'overview', label: 'Ringkasan', icon: BarChart3 },
                { id: 'expenses', label: 'Pengeluaran', icon: PieChart },
                { id: 'branches', label: 'Cabang', icon: Building2 },
                { id: 'products', label: 'Produk', icon: Package },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: IKHTISAR & TREN FINANSIAL */}
            {/* ========================================================================= */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left (2 cols): Daily Timeline Visualizer */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                         Omzet dan Pengeluaran Harian
                       </h2>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                        <span>Omzet</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                         <span>Pengeluaran</span>
                      </div>
                    </div>
                  </div>

                  {/* SVG / Bar Chart Container */}
                  <div className="pt-4 border-t border-slate-100">
                    {report.daily_timeline.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        Tidak ada transaksi pada periode yang dipilih.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-end gap-1.5 h-48 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                          {report.daily_timeline.map((point) => {
                            const revHeight = Math.max(
                              4,
                              Math.round((point.revenue / maxDailyValue) * 160)
                            );
                            const expHeight = Math.max(
                              4,
                              Math.round((point.expenses / maxDailyValue) * 160)
                            );

                            return (
                              <div
                                key={point.date}
                                className="flex-1 min-w-[28px] max-w-[44px] flex flex-col items-center gap-1 group relative cursor-pointer"
                              >
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col z-20 bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                                  <span className="font-bold text-slate-300">
                                    {formatDateId(point.date)}
                                  </span>
                                  <span>Omzet: {formatRupiah(point.revenue)}</span>
                                  <span>Beban: {formatRupiah(point.expenses)}</span>
                                  <span
                                    className={`font-bold ${
                                      point.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    Laba: {formatRupiah(point.net_profit)}
                                  </span>
                                </div>

                                <div className="w-full flex items-end justify-center gap-1 h-40">
                                  {/* Revenue bar */}
                                  <div
                                    style={{ height: `${revHeight}px` }}
                                    className="w-2.5 bg-brand-500 group-hover:bg-brand-600 rounded-t transition-all"
                                  />
                                  {/* Expense bar */}
                                  <div
                                    style={{ height: `${expHeight}px` }}
                                    className="w-2.5 bg-rose-400 group-hover:bg-rose-500 rounded-t transition-all"
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                                  {point.date.slice(8, 10)}/{point.date.slice(5, 7)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Arahkan kursor ke tiap batang tanggal untuk melihat rincian laba harian.</span>
                          <span className="font-mono text-slate-600">
                            Puncak: {formatRupiah(maxDailyValue)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right (1 col): Payment Methods & Flow */}
                <div className="space-y-6">
                  {/* Payment Method Distribution */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-sage-600" />
                        Metode Pembayaran
                      </h2>
                      <Badge variant="neutral" className="text-[10px]">
                        Kas Masuk
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {report.revenue_by_payment_method.map((pm) => (
                        <div key={pm.payment_method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">
                              {pm.payment_method === 'CASH'
                                ? 'Tunai'
                                : pm.payment_method === 'QRIS_SIM'
                                ? 'QRIS'
                                : pm.payment_method}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatRupiah(pm.total_amount)}{' '}
                              <span className="text-slate-400 font-normal">
                                ({pm.percentage_of_revenue}%)
                              </span>
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${pm.percentage_of_revenue}%` }}
                              className={`h-full rounded-full ${
                                pm.payment_method === 'CASH' ? 'bg-brand-500' : 'bg-sage-500'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Summary Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">
                        Ringkasan Laba Rugi
                      </h2>
                      <Badge variant="intelligence" className="text-[10px]">
                        Dihitung otomatis
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100">
                         <span className="text-slate-600">Omzet</span>
                        <span className="font-mono font-bold text-brand-700">
                          {formatRupiah(report.metrics.total_revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100 text-slate-500">
                         <span>Modal Barang</span>
                        <span className="font-mono text-slate-600">
                          -{formatRupiah(report.metrics.total_cogs)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100 font-semibold text-sage-700">
                        <span>Laba Kotor <span className="font-normal text-sage-600">({report.metrics.gross_margin_pct}%)</span></span>
                        <span className="font-mono">{formatRupiah(report.metrics.gross_profit)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3 py-2 border-b border-slate-100 text-slate-600">
                        <span>Beban Operasional</span>
                        <span className="font-mono text-rose-600">-{formatRupiah(report.metrics.total_expenses)}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3 rounded-lg bg-sage-50 px-3 py-3 font-bold text-sm text-sage-800">
                        <span>Laba Bersih</span>
                        <span className="font-mono">{formatRupiah(report.metrics.net_profit)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: STRUKTUR BEBAN BIAYA */}
            {/* ========================================================================= */}
            {activeTab === 'expenses' && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Distribusi Beban Operasional per Kategori
                  </h2>
                  <p className="text-xs text-slate-500">
                     Rincian pengeluaran berdasarkan kategori.
                  </p>
                </div>

                {report.expenses_by_category.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      icon={PieChart}
                      title="Belum ada data pengeluaran"
                      description="Tidak ada catatan pengeluaran operasional yang terdaftar pada periode laporan yang dipilih."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report.expenses_by_category.map((cat, idx) => (
                      <div
                        key={cat.category}
                        className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{cat.category}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-rose-600">
                            {formatRupiah(cat.total_amount)}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            style={{ width: `${cat.percentage_of_expenses}%` }}
                            className="bg-rose-500 h-full rounded-full transition-all"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{cat.count} kali transaksi pengeluaran</span>
                          <span className="font-bold text-slate-700">
                            {cat.percentage_of_expenses}% dari total biaya
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: KLASEMEN & PERFORMA ANTARCABANG */}
            {/* ========================================================================= */}
            {activeTab === 'branches' && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                       Performa Cabang
                    </h2>
                    <p className="text-xs text-slate-500">
                       Omzet, laba, dan capaian target setiap cabang.
                    </p>
                  </div>
                  <Badge variant="neutral" className="w-fit">
                     {report.branch_performance.length} Cabang
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Nama Cabang</th>
                        <th className="py-3 px-4 text-right">Omzet</th>
                         <th className="py-3 px-4 text-right">Modal Barang</th>
                         <th className="py-3 px-4 text-right">Laba Kotor</th>
                         <th className="py-3 px-4 text-right">Pengeluaran</th>
                        <th className="py-3 px-4 text-right">Laba Bersih</th>
                        <th className="py-3 px-4 text-center">Capaian Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {report.branch_performance.map((b) => (
                        <tr key={b.branch_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">{b.branch_name}</span>
                            <span className="text-[10px] text-slate-400">
                               {b.tx_count} transaksi • Rata-rata: {formatRupiah(b.average_ticket)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatRupiah(b.revenue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                            {formatRupiah(b.cogs)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-sage-700 whitespace-nowrap">
                            <span className="font-bold block">{formatRupiah(b.gross_profit)}</span>
                            <span className="text-[10px] text-sage-600 font-sans">
                              ({b.gross_margin_pct}%)
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-rose-600 whitespace-nowrap">
                            {formatRupiah(b.expenses)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                            <span className={b.net_profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {b.net_profit >= 0 ? '+' : ''}
                              {formatRupiah(b.net_profit)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans block">
                              ({b.net_margin_pct}%)
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {b.daily_target > 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-slate-800">
                                  {b.target_achievement_pct}%
                                </span>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                                  <div
                                    style={{ width: `${Math.min(100, b.target_achievement_pct)}%` }}
                                    className={`h-full rounded-full ${
                                      b.target_achievement_pct >= 100
                                        ? 'bg-emerald-500'
                                        : 'bg-brand-500'
                                    }`}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum diatur</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: PERINGKAT MARGIN PRODUK */}
            {/* ========================================================================= */}
            {activeTab === 'products' && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="text-base font-bold text-slate-900">
                     Produk Teratas
                  </h2>
                  <p className="text-xs text-slate-500">
                     Omzet dan laba kotor per produk.
                  </p>
                </div>

                {report.top_products.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      icon={Package}
                      title="Belum ada data penjualan produk"
                      description="Tidak ada transaksi produk yang tercatat pada rentang periode yang dipilih."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Nama Produk</th>
                          <th className="py-3 px-4 text-center">Kuantitas Terjual</th>
                           <th className="py-3 px-4 text-right">Omzet</th>
                           <th className="py-3 px-4 text-right">Modal Barang</th>
                          <th className="py-3 px-4 text-right">Laba Kotor</th>
                           <th className="py-3 px-4 text-center">Margin Kotor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {report.top_products.map((p, idx) => (
                          <tr key={p.product_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                              <span className="w-5 h-5 rounded-md bg-brand-50 text-brand-700 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span>{p.product_name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                              {p.quantity_sold} unit
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {formatRupiah(p.revenue)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                              {formatRupiah(p.cogs)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sage-700 whitespace-nowrap">
                              {formatRupiah(p.gross_profit)}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <Badge variant="enterprise" className="text-[11px] font-bold">
                                {p.gross_margin_pct}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </RoleGuard>
  );
}
