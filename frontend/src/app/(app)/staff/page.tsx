'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '@/components/role-guard';
import {
  Store,
  UserCheck,
  UserPlus,
  Search,
  Key,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Power,
  RefreshCw,
} from 'lucide-react';
import { MetricStrip } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateId } from '@/lib/date';

interface BranchOption {
  id: string;
  name: string;
  location: string;
  is_active: boolean;
}

interface CashierProfile {
  id: string;
  org_id: string;
  full_name: string;
  role: 'CASHIER';
  email: string;
  branch_id: string;
  is_active: boolean;
  created_at: string;
  branches?: {
    id: string;
    name: string;
    location: string;
  } | null;
}

export default function StaffPage() {
  const [cashiers, setCashiers] = useState<CashierProfile[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal Tambah Kasir
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addBranchId, setAddBranchId] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Modal Edit Kasir
  const [editingCashier, setEditingCashier] = useState<CashierProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal Reset Password Kasir
  const [passwordCashier, setPasswordCashier] = useState<CashierProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Fetch data kasir dan cabang
  async function loadData() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resCashiers, resBranches] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/branches?all=true'),
      ]);

      const jsonCashiers = await resCashiers.json();
      const jsonBranches = await resBranches.json();

      if (!resCashiers.ok) {
        throw new Error(jsonCashiers?.error?.message || 'Gagal memuat daftar kasir');
      }

      if (!resBranches.ok) {
        throw new Error(jsonBranches?.error?.message || 'Gagal memuat daftar cabang');
      }

      const cashierList: CashierProfile[] = jsonCashiers.data || [];
      const branchList: BranchOption[] = jsonBranches.data || [];

      setCashiers(cashierList);
      setBranches(branchList);

      const activeBranches = branchList.filter((b) => b.is_active);
      if (activeBranches.length > 0) {
        setAddBranchId((prev) => (prev ? prev : activeBranches[0].id));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter list
  const filteredCashiers = cashiers.filter((c) => {
    const matchSearch =
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.branches?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchBranch = filterBranch === 'ALL' || c.branch_id === filterBranch;
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && c.is_active) ||
      (filterStatus === 'INACTIVE' && !c.is_active);

    return matchSearch && matchBranch && matchStatus;
  });

  // KPI Metrics
  const totalCount = cashiers.length;
  const activeCount = cashiers.filter((c) => c.is_active).length;
  const uniqueBranchesCount = new Set(cashiers.map((c) => c.branch_id)).size;

  // Handle Tambah Kasir
  async function handleCreateCashier(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: addName,
          email: addEmail,
          password: addPassword,
          branch_id: addBranchId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal menambahkan kasir baru');
      }

      setSuccessMsg(`Kasir "${addName}" berhasil didaftarkan dan ditugaskan ke cabang.`);
      setIsAddOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmittingAdd(false);
    }
  }

  // Handle Update Kasir
  async function handleUpdateCashier(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCashier) return;
    setSubmittingEdit(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/staff/${editingCashier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName,
          branch_id: editBranchId,
          is_active: editActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal memperbarui data kasir');
      }

      setSuccessMsg(`Data kasir "${editName}" berhasil diperbarui.`);
      setEditingCashier(null);
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmittingEdit(false);
    }
  }

  // Handle Reset Password Kasir
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordCashier) return;
    setSubmittingPassword(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/staff/${passwordCashier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal mengatur ulang kata sandi');
      }

      setSuccessMsg(`Kata sandi untuk kasir "${passwordCashier.full_name}" berhasil diubah.`);
      setPasswordCashier(null);
      setNewPassword('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setSubmittingPassword(false);
    }
  }

  // Quick Toggle Status Aktif / Nonaktif
  async function handleToggleStatus(cashier: CashierProfile) {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/staff/${cashier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !cashier.is_active,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal mengubah status kasir');
      }

      setSuccessMsg(
        `Status kasir "${cashier.full_name}" diubah menjadi ${!cashier.is_active ? 'Aktif' : 'Nonaktif'}.`
      );
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    }
  }

  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 pb-12">
                {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kelola Kasir</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Tambah kasir, tentukan cabang, dan atur akses masuk.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={loadData}
              className="flex items-center gap-1.5 shadow-2xs"
              title="Segarkan data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                if (branches.filter((b) => b.is_active).length === 0) {
                  setErrorMsg('Belum ada cabang aktif. Buat atau aktifkan cabang terlebih dahulu sebelum menambah kasir.');
                  return;
                }
                setAddBranchId(branches.find((b) => b.is_active)?.id || '');
                setIsAddOpen(true);
              }}
              className="flex items-center gap-1.5 shadow-2xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Kasir Baru</span>
            </Button>
          </div>
        </div>

        {/* Notifikasi Toast / Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-500 hover:text-emerald-700 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4-KPI Metric Strip */}
        <MetricStrip
          title="Ringkasan Kasir"
          metrics={[
            {
              label: 'Jumlah Kasir',
              value: `${totalCount} Kasir`,
              subtext: 'Semua akun kasir',
              badge: <Badge variant="enterprise">Total</Badge>,
            },
            {
              label: 'Kasir Aktif',
              value: `${activeCount} Aktif`,
              subtext: 'Dapat masuk dan melayani transaksi',
              badge: <Badge variant="success">Aktif</Badge>,
            },
            {
              label: 'Cabang dengan Kasir',
              value: `${uniqueBranchesCount} cabang`,
              subtext: 'Memiliki setidaknya satu kasir',
              badge: <Badge variant="brand">Cabang</Badge>,
            },
          ]}
        />

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kasir, email, atau cabang..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Cabang */}
            <select
              aria-label="Filter Cabang"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-brand-600"
            >
              <option value="ALL">Semua Cabang ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {!b.is_active ? '(Nonaktif)' : ''}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              aria-label="Filter Status Kasir"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-brand-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Hanya Aktif</option>
              <option value="INACTIVE">Hanya Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Tabel Kasir */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Kasir</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filteredCashiers.length} kasir</p>
            </div>
            {branches.filter((b) => b.is_active).length > 0 && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                {branches.filter((b) => b.is_active).length} cabang aktif
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sage-600" />
              <p className="text-xs">Memuat data staf kasir...</p>
            </div>
          ) : filteredCashiers.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Belum ada kasir ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {searchQuery || filterBranch !== 'ALL' || filterStatus !== 'ALL'
                  ? 'Tidak ada akun kasir yang cocok dengan filter pencarian Anda.'
                  : 'Tambahkan kasir agar dapat mulai melayani transaksi.'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAddBranchId(branches.find((b) => b.is_active)?.id || '');
                  setIsAddOpen(true);
                }}
                className="gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Kasir Sekarang</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4">Cabang Penugasan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCashiers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nama & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {c.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{c.full_name}</p>
                            <p className="text-[11px] text-slate-400 truncate font-mono">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Cabang */}
                      <td className="py-3.5 px-4">
                        {c.branches ? (
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-800 block truncate">
                                {c.branches.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">
                                {c.branches.location}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditentukan</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={c.is_active ? 'success' : 'neutral'}>
                          {c.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateId(c.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingCashier(c);
                              setEditName(c.full_name);
                              setEditBranchId(c.branch_id);
                              setEditActive(c.is_active);
                            }}
                            className="h-7 px-2 text-[11px] flex items-center gap-1"
                            title="Edit data & cabang kasir"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setPasswordCashier(c);
                              setNewPassword('');
                            }}
                            className="h-7 px-2 text-[11px] flex items-center gap-1"
                            title="Ubah kata sandi kasir"
                          >
                            <Key className="w-3 h-3 text-slate-500" />
                            <span className="hidden sm:inline">Sandi</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(c)}
                            className={`h-7 px-2 text-[11px] flex items-center gap-1 ${
                              c.is_active
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={c.is_active ? 'Nonaktifkan akun kasir' : 'Aktifkan akun kasir'}
                          >
                            <Power className="w-3 h-3" />
                            <span className="hidden sm:inline">
                              {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </span>
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

        {/* ======================================================== */}
        {/* MODAL TAMBAH KASIR BARU */}
        {/* ======================================================== */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-xs">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Tambah Kasir</h3>
                    <p className="text-[11px] text-slate-500">
                      Akun kasir dibuat untuk cabang yang dipilih.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCashier} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Kasir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Contoh: Siti Barista"
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="Contoh: siti.kasir@kopi.id"
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Digunakan kasir untuk masuk ke aplikasi.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Awal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Minimal 6 karakter (cth: Kasir123!)"
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cabang Penugasan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    aria-label="Pilih cabang penugasan kasir"
                    value={addBranchId}
                    onChange={(e) => setAddBranchId(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-600"
                  >
                    {branches.filter((b) => b.is_active).length === 0 ? (
                      <option value="" disabled>
                        Tidak ada cabang aktif
                      </option>
                    ) : (
                      branches
                        .filter((b) => b.is_active)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.location})
                          </option>
                        ))
                    )}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Kasir hanya dapat bertransaksi dan melihat stok di cabang ini.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsAddOpen(false)}
                    disabled={submittingAdd}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submittingAdd}
                    className="gap-1.5"
                  >
                    {submittingAdd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Daftarkan Kasir</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL EDIT KASIR / PINDAH CABANG */}
        {/* ======================================================== */}
        {editingCashier && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Edit Penugasan Kasir</h3>
                    <p className="text-[11px] text-slate-500 font-mono">{editingCashier.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCashier(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateCashier} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kasir
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cabang Penugasan (Rotasi)
                  </label>
                  <select
                    required
                    aria-label="Pilih cabang rotasi kasir"
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-600"
                  >
                    {branches
                      .filter((b) => b.is_active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.location})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-700">Status Akun Kasir</span>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 relative"></div>
                    <span className="ml-2 text-xs font-medium text-slate-700">
                      {editActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setEditingCashier(null)}
                    disabled={submittingEdit}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submittingEdit}
                    className="gap-1.5"
                  >
                    {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Simpan Perubahan</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL RESET KATA SANDI KASIR */}
        {/* ======================================================== */}
        {passwordCashier && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Ubah Kata Sandi Kasir</h3>
                    <p className="text-[11px] text-slate-500 font-mono">{passwordCashier.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordCashier(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Baru untuk {passwordCashier.full_name} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan sandi baru (min. 6 karakter)"
                    className="w-full h-9 px-3 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:border-brand-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Kasir dapat langsung login dengan kata sandi baru ini.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setPasswordCashier(null)}
                    disabled={submittingPassword}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submittingPassword}
                    className="gap-1.5"
                  >
                    {submittingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Simpan Kata Sandi</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
