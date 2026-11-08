'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatRupiah } from '@/lib/format';
import { formatDateId, getBusinessDate } from '@/lib/date';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/lib/validators/expenses';
import {
  Wallet,
  Plus,
  Filter,
  Calendar,
  Store,
  Tag,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  MousePointer,
  Sparkles,
  RotateCcw,
  X,
} from 'lucide-react';
import { MetricStrip } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BranchRequiredNotice } from '@/components/branch-required-notice';

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

interface Expense {
  id: string;
  org_id: string;
  branch_id: string;
  created_by?: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  input_method: 'MANUAL' | 'VOICE' | 'IMPORT' | 'DEMO';
  is_anomaly: boolean;
  anomaly_score: number;
  anomaly_reason?: string | null;
  created_at: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('OWNER');
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const currentMonth = useMemo(() => {
    const today = getBusinessDate();
    return today.slice(0, 7); // YYYY-MM
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(getBusinessDate());
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Utilitas');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');

  // Delete Modal
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch Current User
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (res.ok && json.data) {
          setCurrentUserRole(json.data.role);
          setUserBranchId(json.data.branch_id);
          if (json.data.role !== 'OWNER' && json.data.branch_id) {
            setSelectedBranchId(json.data.branch_id);
            setFormBranchId(json.data.branch_id);
          }
        }
      } catch {
        // Fallback
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
          const activeBranches = (json.data || []).filter((b: Branch) => b.is_active);
          setBranches(activeBranches);
          setBranchesLoaded(true);
          if (activeBranches.length > 0 && !formBranchId) {
            setFormBranchId(activeBranches[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }
    fetchBranches();
  }, [formBranchId]);

  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const params = new URLSearchParams();
      if (selectedBranchId !== 'ALL') {
        params.set('branch_id', selectedBranchId);
      }
      if (selectedCategory !== 'ALL') {
        params.set('category', selectedCategory);
      }
      if (selectedMonth) {
        params.set('month', selectedMonth);
      }

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal memuat daftar pengeluaran');
      }

      setExpenses(json.data || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat pengeluaran');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedCategory, selectedMonth]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Branch mapping
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let total = 0;
    let anomalyCount = 0;
    const catMap: Record<string, number> = {};
    const dateSet = new Set<string>();

    expenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      total += amt;
      catMap[e.category] = (catMap[e.category] || 0) + amt;
      if (e.is_anomaly) anomalyCount += 1;
      if (e.expense_date) dateSet.add(e.expense_date);
    });

    let topCategory = '-';
    let topCategoryAmount = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    const activeDays = dateSet.size || 1;
    const dailyAverage = Math.round(total / activeDays);

    return {
      totalAmount: total,
      count: expenses.length,
      topCategory,
      topCategoryAmount,
      anomalyCount,
      dailyAverage,
    };
  }, [expenses]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormBranchId(
      currentUserRole !== 'OWNER' && userBranchId
        ? userBranchId
        : branches[0]?.id || ''
    );
    setFormDate(getBusinessDate());
    setFormCategory('Utilitas');
    setFormDescription('');
    setFormAmount('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormBranchId(expense.branch_id);
    setFormDate(expense.expense_date);
    setFormCategory(expense.category);
    setFormDescription(expense.description);
    setFormAmount(expense.amount);
    setIsModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formBranchId) {
      alert('Cabang wajib dipilih.');
      return;
    }
    if (!formDescription.trim() || formDescription.trim().length < 3) {
      alert('Deskripsi pengeluaran minimal 3 karakter.');
      return;
    }
    if (typeof formAmount !== 'number' || formAmount <= 0) {
      alert('Nominal pengeluaran harus lebih besar dari Rp 0.');
      return;
    }

    try {
      setModalSubmitting(true);

      if (editingExpense) {
        // Edit mode (PATCH)
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formCategory,
            description: formDescription.trim(),
            amount: formAmount,
            expense_date: formDate,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Gagal mengubah pengeluaran');
        }
      } else {
        // Create mode (POST)
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch_id: formBranchId,
            category: formCategory,
            description: formDescription.trim(),
            amount: formAmount,
            expense_date: formDate,
            input_method: 'MANUAL',
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Gagal menambah pengeluaran');
        }
      }

      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteSubmit = async () => {
    if (!deletingExpense) return;
    try {
      setDeleteSubmitting(true);
      const res = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal menghapus pengeluaran');
      }

      setDeletingExpense(null);
      fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus data');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Input badge
  const renderInputBadge = (method: string) => {
    switch (method) {
      case 'IMPORT':
        return (
          <Badge variant="neutral" className="text-[10px] py-0.5">
            <FileSpreadsheet className="w-2.5 h-2.5 mr-0.5" /> Import
          </Badge>
        );
      case 'DEMO':
        return (
          <Badge variant="brand" className="text-[10px] py-0.5">
            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Demo
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="text-[10px] py-0.5">
            <MousePointer className="w-2.5 h-2.5 mr-0.5" /> Manual
          </Badge>
        );
    }
  };

  // Category badge
  const renderCategoryBadge = (category: ExpenseCategory) => {
    let variant: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'enterprise' = 'neutral';
    switch (category) {
      case 'Perlengkapan Operasional':
        variant = 'brand';
        break;
      case 'Gaji':
        variant = 'enterprise';
        break;
      case 'Utilitas':
        variant = 'warning';
        break;
      case 'Pemasaran':
        variant = 'enterprise';
        break;
      case 'Perawatan':
        variant = 'warning';
        break;
      case 'Transportasi':
        variant = 'neutral';
        break;
      case 'Sewa':
        variant = 'enterprise';
        break;
      default:
        variant = 'neutral';
    }
    return (
      <Badge variant={variant} className="text-[10px]">
        {category}
      </Badge>
    );
  };

  const isFilterActive =
    selectedBranchId !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedMonth !== currentMonth;

  // Owner tanpa cabang: arahkan ke manajemen cabang dulu
  if (branchesLoaded && branches.length === 0 && currentUserRole === 'OWNER') {
    return (
      <div className="space-y-6 pb-12">
        <BranchRequiredNotice />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pengeluaran
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Pencatatan biaya operasional harian cabang dan deteksi biaya tidak wajar
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Catat Pengeluaran
          </Button>
        </div>
      </div>

      {/* 4-KPI Metric Strip */}
      <MetricStrip
        title="Ringkasan Pengeluaran"
        action={
          <span className="text-xs text-slate-500 font-medium">
            Periode: <span className="font-semibold text-slate-700 font-mono">{selectedMonth}</span>
          </span>
        }
        metrics={[
          {
            label: 'Total Pengeluaran Bulan Ini',
            value: formatRupiah(summaryMetrics.totalAmount),
            subtext: `${summaryMetrics.count} transaksi operasional`,
            badge: (
              <Badge variant="brand" dot>
                Pengeluaran
              </Badge>
            ),
          },
          {
            label: 'Rata-rata Harian',
            value: formatRupiah(summaryMetrics.dailyAverage),
            subtext: 'Berdasarkan hari aktif pencatatan',
            badge: <Badge variant="neutral">Rata-rata</Badge>,
          },
          {
            label: 'Kategori Terbesar',
            value: summaryMetrics.topCategory,
            subtext:
              summaryMetrics.topCategoryAmount > 0
                ? formatRupiah(summaryMetrics.topCategoryAmount)
                : 'Belum ada data',
            badge: <Badge variant="enterprise">Dominan</Badge>,
          },
          {
            label: 'Pengeluaran Tidak Wajar',
            value: `${summaryMetrics.anomalyCount} Perlu Dicek`,
            subtext:
              summaryMetrics.anomalyCount > 0
                ? 'Perlu evaluasi pemilik cabang'
                : 'Semua transaksi dalam batas wajar',
            badge:
              summaryMetrics.anomalyCount > 0 ? (
                <Badge variant="danger" dot>
                  Perhatian
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Normal
                </Badge>
              ),
          },
        ]}
      />

      {/* Filters Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
             <Filter className="h-4 w-4 text-brand-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filter Pengeluaran
            </span>
            {isFilterActive && (
              <Badge variant="brand" className="text-[10px]">
                Filter Aktif
              </Badge>
            )}
          </div>
          {isFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (currentUserRole === 'OWNER') setSelectedBranchId('ALL');
                setSelectedCategory('ALL');
                setSelectedMonth(currentMonth);
              }}
              className="h-7 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Reset Filter
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          {/* Branch Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Cabang
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label="Pilih cabang"
                disabled={currentUserRole !== 'OWNER'}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                 className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {currentUserRole === 'OWNER' && (
                  <option value="ALL">Semua Cabang</option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Periode Bulan
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                aria-label="Pilih periode bulan"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                 className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Kategori Biaya
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label="Pilih kategori biaya"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                 className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
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

      {/* Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
             <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
            <p className="text-sm font-medium text-slate-600">Memuat data pengeluaran...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Wallet}
              title="Tidak ada pengeluaran pada periode ini"
              description="Belum ada pengeluaran untuk filter ini. Gunakan tombol 'Catat Pengeluaran' untuk menambahkan data."
              actionLabel="Catat Pengeluaran Baru"
              onAction={handleOpenAdd}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tanggal (WIB)</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {formatDateId(exp.expense_date)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {branchMap.get(exp.branch_id) || 'Cabang'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderCategoryBadge(exp.category)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={exp.description}>
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{renderInputBadge(exp.input_method)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {exp.is_anomaly ? (
                        <Badge
                          variant="danger"
                          dot
                          className="text-[10px]"
                          title={exp.anomaly_reason || 'Pengeluaran melonjak tidak wajar dibanding rata-rata biasanya'}
                        >
                          <AlertTriangle className="w-3 h-3 mr-0.5" /> Perlu Dicek
                        </Badge>
                      ) : (
                        <Badge variant="success" dot className="text-[10px]">
                          Wajar
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(exp)}
                          title="Edit Pengeluaran"
                           className="h-7 w-7 p-0 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingExpense(exp)}
                          title="Hapus Pengeluaran"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Isi rincian biaya operasional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {/* Branch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cabang <span className="text-rose-500">*</span>
                </label>
                <select
                  aria-label="Pilih cabang"
                  disabled={!!editingExpense || currentUserRole !== 'OWNER'}
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                   className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 disabled:bg-slate-100 transition-colors"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <input
                  aria-label="Pilih tanggal pengeluaran"
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                   className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kategori Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <select
                  aria-label="Pilih kategori pengeluaran"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                   className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deskripsi / Keterangan <span className="text-rose-500">*</span>
                </label>
                <input
                  aria-label="Keterangan pengeluaran"
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contoh: Beli token listrik PLN, Beli gula & susu..."
                   className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nominal Biaya (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  aria-label="Nominal pengeluaran"
                  type="number"
                  min="1"
                  required
                  value={formAmount}
                  onChange={(e) =>
                    setFormAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  placeholder="50000"
                   className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                />
                {typeof formAmount === 'number' && formAmount > 0 && (
                   <p className="text-[11px] text-brand-700 font-semibold mt-1">
                    Terbaca: {formatRupiah(formAmount)}
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={modalSubmitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex items-center gap-1.5"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pengeluaran'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3 text-rose-800">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Hapus Pengeluaran</h3>
                <p className="text-[11px] text-rose-600 font-mono">
                  {formatRupiah(deletingExpense.amount)} • {deletingExpense.category}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan biaya:{' '}
                <strong className="text-slate-900">&quot;{deletingExpense.description}&quot;</strong>?
                Data yang dihapus tidak dapat dipulihkan.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={deleteSubmitting}
                  onClick={() => setDeletingExpense(null)}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive-solid"
                  size="sm"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteSubmit}
                  className="flex items-center gap-1.5"
                >
                  {deleteSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    'Hapus Sekarang'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
