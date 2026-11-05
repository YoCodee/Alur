'use client';

import React from 'react';
import { RoleGuard } from '@/components/role-guard';
import { MigrationWizard } from '@/components/import/migration-wizard';

export default function ImportPage() {
  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Impor Data Bisnis
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Tambahkan produk, riwayat penjualan, dan pengeluaran dari file.
            </p>
          </div>
        </div>

        {/* Recommended order */}
        <div className="rounded-xl border border-amber-200/70 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-1">Urutan yang disarankan</p>
          <p>
            1) <strong>Produk &amp; stok awal</strong> &rarr; 2) <strong>Riwayat penjualan</strong> &rarr; 3){' '}
            <strong>Pengeluaran</strong>. Penjualan lama tidak mengubah stok; penjualan baru akan
            mengurangi stok secara otomatis.
          </p>
        </div>

        <MigrationWizard />
      </div>
    </RoleGuard>
  );
}
