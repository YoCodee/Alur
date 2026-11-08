'use client';

import React, { useState, useEffect } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { formatRupiah } from '@/lib/format';
import {
  Store,
  Plus,
  MapPin,
  Target,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
} from 'lucide-react';
import { MetricStrip } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface Branch {
  id: string;
  name: string;
  location: string;
  daily_target: number;
  is_active: boolean;
  created_at: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [dailyTarget, setDailyTarget] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    setLoading(true);
    setErrorMsg(null);
    try {
      // all=true: inactive branches stay visible so users can see which one still
      // holds a name (see lib/branches) — the "Nonaktif" badge already exists on the card
      const res = await fetch('/api/branches?all=true');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal memuat cabang.');
      }
      setBranches(json.data || []);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingBranch(null);
    setName('');
    setLocation('');
    setDailyTarget('0');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  }

  function openEditModal(branch: Branch) {
    setEditingBranch(branch);
    setName(branch.name);
    setLocation(branch.location);
    setDailyTarget(branch.daily_target.toString());
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetVal = parseInt(dailyTarget.replace(/\D/g, ''), 10) || 0;

    try {
      if (editingBranch) {
        // PATCH
        const res = await fetch(`/api/branches/${editingBranch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            location,
            daily_target: targetVal,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || 'Gagal memperbarui cabang.');
        }
        setSuccessMsg(`Cabang "${name}" berhasil diperbarui.`);
      } else {
        // POST
        const res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            location,
            daily_target: targetVal,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || 'Gagal menambahkan cabang.');
        }
        setSuccessMsg(`Cabang "${name}" berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      loadBranches();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSoftDelete() {
    if (!deletingBranch) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/branches/${deletingBranch.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal menghapus cabang.');
      }
      setSuccessMsg(
        json?.data?.message || `Cabang "${deletingBranch.name}" berhasil dihapus.`
      );
      setDeletingBranch(null);
      loadBranches();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const activeBranchCount = branches.filter((b) => b.is_active).length;
  const isLimitReached = activeBranchCount >= 5;
  const totalTarget = branches
    .filter((b) => b.is_active)
    .reduce((sum, b) => sum + (b.daily_target || 0), 0);
  const numericTarget = parseInt(dailyTarget.replace(/\D/g, ''), 10) || 0;

  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="space-y-6">
                {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                 Kelola Cabang
              </h1>
              <Badge variant={isLimitReached ? 'warning' : 'enterprise'} dot>
                {activeBranchCount} / 5 Cabang Aktif
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Atur lokasi cabang dan target penjualan harian.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
            disabled={isLimitReached}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Cabang Baru
          </Button>
        </div>

        {/* Branch Summary */}
        <MetricStrip
          title="Ringkasan Cabang"
          metrics={[
            {
              label: 'Jumlah Cabang',
              value: branches.length,
              subtext: `${activeBranchCount} cabang aktif beroperasi`,
              badge: <Badge variant="brand">Cabang</Badge>,
            },
            {
              label: 'Sisa Slot Cabang',
              value: `${Math.max(0, 5 - activeBranchCount)} slot`,
              subtext: isLimitReached ? 'Batas maksimal 5 cabang tercapai' : 'Dapat menambah gerai baru',
              badge: isLimitReached ? (
                <Badge variant="danger" dot>
                  Penuh
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Tersedia
                </Badge>
              ),
            },
            {
              label: 'Target Harian',
              value: formatRupiah(totalTarget),
              subtext: 'Total target semua cabang aktif',
              badge: (
                <Badge variant="brand" dot>
                  Target
                </Badge>
              ),
            },
          ]}
        />

        {/* Feedback alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-700 hover:text-rose-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse space-y-4 shadow-card"
              >
                <div className="h-6 bg-slate-200 rounded-md w-1/2" />
                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                <div className="h-4 bg-slate-100 rounded-md w-1/3" />
              </div>
            ))}
          </div>
        ) : branches.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-card">
            <EmptyState
              icon={Store}
              title="Belum Ada Cabang"
              description="Tambahkan cabang untuk mengatur lokasi dan target penjualannya."
              actionLabel="Tambah Cabang Sekarang"
              onAction={openCreateModal}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-card hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
                        <h2 className="text-base font-bold text-slate-900">{b.name}</h2>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 mt-1 pl-6">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                        <span className="truncate">{b.location}</span>
                      </div>
                    </div>
                    <Badge variant={b.is_active ? 'success' : 'neutral'} dot className="text-[10px]">
                      {b.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-brand-600" />
                        Target Omzet Harian:
                      </span>
                    </div>
                    <p className="text-base font-mono font-bold text-brand-700">
                      {formatRupiah(b.daily_target)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(b)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                    title="Ubah Cabang"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingBranch(b)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    title="Hapus Cabang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Create / Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingBranch ? 'Ubah Data Cabang' : 'Tambah Cabang Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Anda dapat memiliki hingga 5 cabang aktif.
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

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Cabang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Nama cabang"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Cabang Malioboro"
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alamat / Lokasi <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    aria-label="Alamat lokasi cabang"
                    required
                    rows={2}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Contoh: Jl. Malioboro No. 45, Yogyakarta"
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Target Penjualan Harian (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Target penjualan harian"
                    type="text"
                    required
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(e.target.value)}
                    placeholder="Contoh: 3000000"
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                  />
                  {numericTarget > 0 && (
                    <p className="text-[11px] text-brand-700 font-semibold mt-1">
                      Nilai target: {formatRupiah(numericTarget)}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Digunakan untuk menampilkan capaian penjualan cabang.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan Cabang
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Hapus / Soft Delete */}
        {deletingBranch && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3 text-rose-800">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Hapus Cabang?</h3>
                  <p className="text-[11px] text-rose-600 font-mono">
                    {deletingBranch.name}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cabang <strong className="text-slate-900">&quot;{deletingBranch.name}&quot;</strong>{' '}
                  {deletingBranch.is_active
                    ? 'akan dihapus dan namanya bisa dipakai lagi. '
                    : 'akan dinonaktifkan. '}
                  Cabang yang sudah punya transaksi hanya dinonaktifkan agar riwayat laporan tetap utuh.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={submitting}
                    onClick={() => setDeletingBranch(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="destructive-solid"
                    size="sm"
                    disabled={submitting}
                    onClick={handleSoftDelete}
                    className="flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Ya, Hapus
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
