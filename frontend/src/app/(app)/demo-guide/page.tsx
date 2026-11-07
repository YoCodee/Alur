'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Wallet,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { MetricStrip } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DemoScenario {
  id: string;
  step: string;
  title: string;
  description: React.ReactNode;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'auth',
    step: 'Langkah 1: Masuk ke aplikasi',
    title: 'Masuk sebagai pemilik atau kasir',
    description: (
      <>
        Buka halaman{' '}
        <Link href="/login" className="text-brand-700 underline font-semibold">
          /login
        </Link>
        , lalu pilih masuk sebagai pemilik atau kasir. Pemilik dapat mengelola seluruh cabang,
        sedangkan kasir hanya dapat membuka halaman operasional cabangnya.
      </>
    ),
  },
  {
    id: 'master',
    step: 'Langkah 2: Siapkan cabang dan produk',
    title: 'Kelola cabang, kasir, dan produk',
    description: (
      <>
        Kelola cabang dan kasir di{' '}
        <Link href="/management" className="text-brand-700 underline font-semibold">
          /management
        </Link>{' '}
        serta katalog produk di{' '}
        <Link href="/inventory" className="text-brand-700 underline font-semibold">
          /inventory
        </Link>
        . Tambahkan produk, kode produk, dan modal untuk tiap cabang. Anda juga dapat mengimpor data dari file CSV.
      </>
    ),
  },
  {
    id: 'pos',
    step: 'Langkah 3: Catat penjualan',
    title: 'Catat Penjualan dan Kelola Pembatalan',
    description: (
      <>
        Lakukan transaksi di{' '}
        <Link href="/pos" className="text-brand-700 underline font-semibold">
          /pos
        </Link>{' '}
        untuk mencatat penjualan tunai atau QRIS simulasi. Lihat transaksi di{' '}
        <Link href="/transactions" className="text-brand-700 underline font-semibold">
          /transactions
        </Link>{' '}
        dan batalkan transaksi bila diperlukan. Stok akan dikembalikan otomatis.
      </>
    ),
  },
  {
    id: 'inventory',
    step: 'Langkah 4: Periksa stok dan pengeluaran',
    title: 'Periksa Pengeluaran dan Stok Cabang',
    description: (
      <>
        Periksa pengeluaran yang tidak biasa di{' '}
        <Link href="/expenses" className="text-brand-700 underline font-semibold">
          /expenses
        </Link>{' '}
        . Lihat saran penambahan atau pemindahan stok antarcabang di{' '}
        <Link href="/inventory" className="text-brand-700 underline font-semibold">
          /inventory
        </Link>
        .
      </>
    ),
  },
  {
    id: 'finance',
    step: 'Langkah 5: Lihat hasil usaha',
    title: 'Lihat Laporan Keuangan dan Ringkasan Harian',
    description: (
      <>
        Lihat omzet, modal, pengeluaran, dan laba usaha serta unduh laporan PDF di{' '}
        <Link href="/reports" className="text-brand-700 underline font-semibold">
          /reports
        </Link>
        . Buka ringkasan harian untuk mengetahui hal yang perlu diperhatikan di{' '}
        <Link href="/dashboard" className="text-brand-700 underline font-semibold">
          /dashboard
        </Link>
        .
      </>
    ),
  },
];

export default function DemoGuidePage() {
  // Muat ulang data demo (PRD §11.2 — hanya owner org demo)
  const [canReloadDemo, setCanReloadDemo] = useState(false);
  const [reloadingDemo, setReloadingDemo] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadSeedAccess() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (res.ok && json.data?.role === 'OWNER' && json.data?.is_demo) {
          setCanReloadDemo(true);
        }
      } catch {
        // Tombol cukup disembunyikan bila status peran tidak terbaca.
      }
    }
    loadSeedAccess();
  }, []);

  const handleReloadDemoData = async () => {
    const confirmed = window.confirm(
      'Seluruh data bisnis demo (transaksi, pengeluaran, mutasi stok, produk, dan cabang) akan dihapus lalu diisi ulang 30 hari data segar sesuai PRD §11.1. Lanjutkan?'
    );
    if (!confirmed) return;

    setReloadingDemo(true);
    setReloadStatus(null);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setReloadStatus({
          ok: false,
          message: json?.error?.message || 'Gagal memuat ulang data demo.',
        });
        return;
      }
      const result = json.data;
      setReloadStatus({
        ok: true,
        message: `Data demo segar siap: ${result.transactions} transaksi, ${result.transaction_items} item, ${result.expenses} pengeluaran dalam ${(result.duration_ms / 1000).toFixed(1)} detik.`,
      });
    } catch {
      setReloadStatus({ ok: false, message: 'Gagal menghubungi server. Coba lagi.' });
    } finally {
      setReloadingDemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header (Jury Evaluation Banner) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl text-slate-900 shadow-card relative overflow-hidden border border-slate-200">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-100/70 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-800 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Panduan penggunaan
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Panduan Demo
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Ikuti lima langkah singkat untuk mencoba fitur utama: cabang, produk, transaksi,
              stok, pengeluaran, dan laporan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link href="/pos">
              <Button variant="primary" size="md" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Buka Kasir POS
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('alur:show-splash'));
                }
              }}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-brand-600" /> Lihat Animasi Pembuka
            </Button>
            <Link href="/expenses">
              <Button
                variant="secondary"
                size="md"
                className="flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" /> Buka Pengeluaran
              </Button>
            </Link>
            {canReloadDemo && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleReloadDemoData}
                disabled={reloadingDemo}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${reloadingDemo ? 'animate-spin' : ''}`} />
                {reloadingDemo ? 'Memuat Ulang…' : 'Muat Ulang Data Demo'}
              </Button>
            )}
          </div>
        </div>

        {reloadStatus && (
          <p
            className={`relative z-10 text-xs mt-4 leading-relaxed ${
              reloadStatus.ok ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {reloadStatus.ok ? '✓ ' : '✕ '}
            {reloadStatus.message}
          </p>
        )}
      </div>

      {/* 4-KPI Metric Strip */}
      <MetricStrip
        title="Ringkasan Panduan"
        metrics={[
          {
            label: 'Langkah Panduan',
            value: '5 Langkah',
            subtext: 'Coba fitur utama aplikasi',
            badge: (
              <Badge variant="success" dot>
                Panduan
              </Badge>
            ),
          },
          {
            label: 'Fitur Utama',
            value: 'Operasional & laporan',
            subtext: 'Penjualan, stok, pengeluaran, dan laporan',
            badge: <Badge variant="brand">Terhubung</Badge>,
          },
          {
            label: 'Data Demo',
            value: '30 Hari Riwayat',
            subtext: '3 cabang dengan pola musiman realistis',
            badge: <Badge variant="brand" dot>Realistis</Badge>,
          },
          {
            label: 'Akses Pengguna',
            value: 'Pemilik & kasir',
            subtext: 'Menu menyesuaikan peran pengguna',
            badge: <Badge variant="neutral">Aman</Badge>,
          },
        ]}
      />

      {/* PRD Scenarios */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              Langkah Penggunaan
            </h2>
            <Badge variant="success" dot>
            5 Langkah
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ikuti langkah berikut untuk mengenal alur kerja aplikasi.
          </p>
        </div>

        <div className="space-y-4">
          {DEMO_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-brand-700 uppercase tracking-wide">
                  {scenario.step}
                </span>
                <Badge variant="success" dot className="text-[10px]">
                  Siap Dicoba
                </Badge>
              </div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {scenario.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{scenario.description}</p>
            </div>
          ))}
        </div>

        {/* Architectural Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Privasi &amp; Keamanan Data
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Data tiap usaha terpisah. Kasir hanya melihat cabangnya, sedangkan pemilik dapat
              melihat seluruh cabang.
            </p>
          </div>

          <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-brand-600" />
              Keputusan Berbasis Data
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ringkasan penjualan, biaya, laba, peringatan pengeluaran, dan saran stok membantu
              pemilik menentukan langkah berikutnya.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Mulai dari langkah pertama dan ikuti urutannya.
          </p>
          <Link href="/login">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5">
              <span>Mulai Panduan</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
