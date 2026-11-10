'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatRupiah } from '@/lib/format';
import { formatDateTimeId, getBusinessDate } from '@/lib/date';
import { MetricStrip, MetricItem } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Receipt,
  Filter,
  Calendar,
  Store,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  Printer,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  MousePointer,
  Sparkles,
  X,
  CreditCard,
  Banknote,
  RotateCcw,
} from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

interface TransactionItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  org_id: string;
  branch_id: string;
  created_by: string;
  client_tx_id?: string | null;
  transaction_date: string;
  business_date: string;
  input_method: 'MANUAL' | 'VOICE' | 'IMPORT' | 'DEMO';
  payment_method: 'CASH' | 'QRIS_SIM';
  status: 'COMPLETED' | 'VOID';
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  voided_at?: string | null;
  void_reason?: string | null;
  transaction_items: TransactionItem[];
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('OWNER');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(getBusinessDate());
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Void Modal State
  const [voidingTx, setVoidingTx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // Fetch Current User
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (res.ok && json.data) {
          setCurrentUserRole(json.data.role);
        }
      } catch {
        // Fallback to default
      }
    }
    fetchMe();
  }, []);

  // Fetch Branches
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch('/api/branches');
        const json = await res.json();
        if (res.ok) {
          setBranches(json.data || []);
        }
      } catch {
        // Fallback
      }
    }
    fetchBranches();
  }, []);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', pageSize.toString());

      if (selectedBranchId !== 'ALL') {
        params.set('branch_id', selectedBranchId);
      }
      if (selectedDate) {
        params.set('date', selectedDate);
      }
      if (selectedStatus !== 'ALL') {
        params.set('status', selectedStatus);
      }
      if (selectedPayment !== 'ALL') {
        params.set('payment_method', selectedPayment);
      }

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memuat riwayat transaksi');
      }

      setTransactions(json.data || []);
      setTotalCount(json.meta?.total ?? 0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, selectedBranchId, selectedDate, selectedStatus, selectedPayment]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset pagination when filter changes
  const handleFilterChange = () => {
    setPage(1);
  };

  // Branch mapping
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  // Summary Metrics for the current view
  const summaryMetrics = useMemo(() => {
    let completedCount = 0;
    let completedRevenue = 0;
    let voidCount = 0;
    let cashRevenue = 0;

    transactions.forEach((tx) => {
      if (tx.status === 'COMPLETED') {
        completedCount++;
        completedRevenue += Number(tx.total_revenue || 0);
        if (tx.payment_method === 'CASH') {
          cashRevenue += Number(tx.total_revenue || 0);
        }
      } else if (tx.status === 'VOID') {
        voidCount++;
      }
    });

    return { completedCount, completedRevenue, voidCount, cashRevenue };
  }, [transactions]);

  // Handle Void Submit
  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingTx) return;

    if (!voidReason.trim() || voidReason.trim().length < 3) {
      alert('Alasan pembatalan minimal 3 karakter.');
      return;
    }

    try {
      setVoidSubmitting(true);
      const res = await fetch(`/api/transactions/${voidingTx.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal membatalkan transaksi.');
      }

      alert('Transaksi berhasil dibatalkan dan stok telah dikembalikan ke cabang.');
      setVoidingTx(null);
      setVoidReason('');
      if (selectedTx?.id === voidingTx.id) {
        setSelectedTx(null);
      }
      fetchTransactions();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat membatalkan transaksi');
    } finally {
      setVoidSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Render input method badge
  const renderInputBadge = (method: string) => {
    switch (method) {
      case 'IMPORT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
            <FileSpreadsheet className="w-3 h-3 text-brand-600" /> Import
          </span>
        );
      case 'DEMO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <Sparkles className="w-3 h-3 text-amber-600" /> Demo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            <MousePointer className="w-3 h-3 text-slate-500" /> Manual
          </span>
        );
    }
  };

  const metricStripItems: MetricItem[] = [
    {
      label: 'Omzet Transaksi Selesai',
      value: formatRupiah(summaryMetrics.completedRevenue),
      subtext: `${summaryMetrics.completedCount} transaksi sukses tercatat`,
      badge: (
        <Badge variant="success" dot>
          Selesai
        </Badge>
      ),
    },
    {
      label: 'Pembayaran Tunai',
      value: formatRupiah(summaryMetrics.cashRevenue),
      subtext: 'Pembayaran tunai wajib ada di laci',
      badge: (
        <Badge variant="neutral" dot>
          Tunai
        </Badge>
      ),
    },
    {
      label: 'Transaksi Dibatalkan',
      value: `${summaryMetrics.voidCount} Nota`,
      subtext: summaryMetrics.voidCount > 0 ? 'Stok otomatis dikembalikan' : 'Nihil pembatalan',
      badge: (
        <Badge variant={summaryMetrics.voidCount > 0 ? 'danger' : 'neutral'} dot>
          {summaryMetrics.voidCount > 0 ? 'Perlu Ditinjau' : 'Nihil'}
        </Badge>
      ),
    },
    {
      label: 'Rata-rata Nilai Belanja',
      value: formatRupiah(
        summaryMetrics.completedCount > 0
          ? Math.round(summaryMetrics.completedRevenue / summaryMetrics.completedCount)
          : 0
      ),
       subtext: 'Rata-rata nilai transaksi',
      badge: (
              <Badge variant="enterprise" dot className="!bg-sage-50 !text-sage-700">
          Rata-rata
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Riwayat Transaksi Penjualan
            </h1>
            <Badge variant="neutral" className="font-mono">
              {totalCount} Transaksi
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Lihat transaksi, rincian pembayaran QRIS dan tunai, serta kelola pembatalan transaksi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTransactions}
            disabled={loading}
            className="gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sage-600' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip (Pola refrence1 (4).png) */}
      <MetricStrip
        title="Ringkasan Transaksi"
        metrics={metricStripItems}
      />

      {/* Filter Toolbar (Pola refrence1 (1).png) */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-brand-600" />
            <span>Filter Data Transaksi</span>
          </div>

          {(selectedBranchId !== 'ALL' ||
            selectedDate !== getBusinessDate() ||
            selectedStatus !== 'ALL' ||
            selectedPayment !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedBranchId('ALL');
                setSelectedDate(getBusinessDate());
                setSelectedStatus('ALL');
                setSelectedPayment('ALL');
                setPage(1);
              }}
              className="text-xs text-brand-600 hover:text-brand-700 font-bold cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Branch Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Cabang</label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label="Pilih cabang"
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  handleFilterChange();
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <option value="ALL">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Tanggal Bisnis</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                aria-label="Pilih tanggal bisnis"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Metode Bayar</label>
            <select
              aria-label="Pilih metode bayar"
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">Semua Metode Pembayaran</option>
              <option value="CASH">Tunai</option>
              <option value="QRIS_SIM">QRIS Simulasi</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">Status Nota</label>
            <select
              aria-label="Pilih status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Nota</option>
              <option value="COMPLETED">Selesai</option>
              <option value="VOID">Dibatalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs">
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

      {/* Transactions Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
            <p className="text-xs font-medium text-slate-600">Memuat riwayat transaksi...</p>
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Tidak Ada Transaksi Ditemukan"
            description="Tidak ada transaksi yang cocok dengan filter tanggal atau cabang terpilih. Coba ubah rentang tanggal."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">ID Nota</th>
                  <th className="py-3 px-4">Waktu (WIB)</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Metode Input</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isVoid = tx.status === 'VOID';
                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isVoid ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{tx.id.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateTimeId(tx.transaction_date || tx.business_date, 'd MMM yyyy, HH:mm')}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {branchMap.get(tx.branch_id) || 'Cabang'}
                      </td>
                      <td className="py-3.5 px-4">{renderInputBadge(tx.input_method)}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          {tx.payment_method === 'CASH' ? (
                            <>
                              <Banknote className="w-3.5 h-3.5 text-slate-500" /> Tunai
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-sage-600" /> QRIS
                            </>
                          )}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold font-mono ${
                          isVoid ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(tx.total_revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isVoid ? (
                          <Badge variant="danger" dot>
                            DIBATALKAN
                          </Badge>
                        ) : (
                          <Badge variant="success" dot>
                            SELESAI
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail Nota"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {currentUserRole === 'OWNER' && !isVoid && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidingTx(tx);
                                setVoidReason('');
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Batalkan Transaksi"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan{' '}
            <span className="font-bold text-slate-700">
              {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>{' '}
            sampai{' '}
            <span className="font-bold text-slate-700">
              {Math.min(page * pageSize, totalCount)}
            </span>{' '}
            dari <span className="font-bold text-slate-700">{totalCount}</span> nota transaksi
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </Button>
            <span className="px-2 font-mono font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1 font-semibold"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DETAIL MODAL (Thermal Receipt + Audit Information) */}
      {/* ======================================================== */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Rincian Nota Transaksi</h3>
                <p className="text-xs text-slate-500 font-mono">#{selectedTx.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Alert if Void */}
              {selectedTx.status === 'VOID' && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Transaksi Dibatalkan</span>
                  </div>
                  <p className="pt-0.5">Alasan: {selectedTx.void_reason || '-'}</p>
                  {selectedTx.voided_at && (
                    <p className="text-[10px] text-rose-600 font-mono">
                      Waktu Pembatalan: {formatDateTimeId(selectedTx.voided_at, 'd MMM yyyy, HH:mm')} WIB
                    </p>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Cabang</span>
                  <span className="font-bold text-slate-800">
                    {branchMap.get(selectedTx.branch_id) || 'Cabang'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Waktu Transaksi</span>
                  <span className="font-bold text-slate-800">
                    {formatDateTimeId(selectedTx.transaction_date || selectedTx.business_date, 'd MMM, HH:mm')} WIB
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Metode Pembayaran</span>
                  <span className="font-bold text-slate-800">
                    {selectedTx.payment_method === 'CASH' ? 'Tunai' : 'QRIS Simulasi'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Metode Input</span>
                  <span className="font-bold text-slate-800">{selectedTx.input_method}</span>
                </div>
              </div>

              {/* Purchased Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Produk yang Dibeli
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2.5">Produk</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Harga</th>
                        <th className="p-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTx.transaction_items?.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2.5 font-medium text-slate-800">
                            {item.product_name}
                          </td>
                          <td className="p-2.5 text-center text-slate-600 font-mono">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-right text-slate-600 font-mono">
                            {formatRupiah(item.unit_price)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                            {formatRupiah(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-700 font-bold text-sm">
                  <span>Total Tagihan</span>
                  <span className="text-brand-600 font-mono">
                    {formatRupiah(selectedTx.total_revenue)}
                  </span>
                </div>
                {currentUserRole === 'OWNER' && (
                  <>
                    <div className="flex justify-between text-slate-500 pt-1.5 border-t border-slate-200">
                      <span>Modal Barang</span>
                      <span className="font-mono">{formatRupiah(selectedTx.total_cogs)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                       <span>Laba Kotor</span>
                      <span className="font-mono">{formatRupiah(selectedTx.gross_profit)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Nota</span>
              </Button>

              <div className="flex items-center gap-2">
                {currentUserRole === 'OWNER' && selectedTx.status === 'COMPLETED' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setVoidingTx(selectedTx);
                      setVoidReason('');
                    }}
                    className="gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Batalkan Transaksi</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedTx(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Transaction cancellation confirmation modal */}
      {/* ======================================================== */}
      {voidingTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center gap-2.5 text-rose-800">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                <Ban className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Batalkan Transaksi</h3>
                <p className="text-[11px] text-rose-600 font-mono">
                  #{voidingTx.id.slice(0, 8)}
                </p>
              </div>
            </div>

            <form onSubmit={handleVoidSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda akan membatalkan transaksi sebesar{' '}
                <strong className="text-slate-900 font-mono">
                  {formatRupiah(voidingTx.total_revenue)}
                </strong>
                . Seluruh item produk akan{' '}
                <strong className="text-emerald-700">otomatis dikembalikan ke stok cabang</strong> secara aman.
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Pelanggan salah pesan / transaksi dobel kasir..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={voidSubmitting}
                  onClick={() => setVoidingTx(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={voidSubmitting}
                  className="gap-1.5"
                >
                  {voidSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Konfirmasi Pembatalan</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
