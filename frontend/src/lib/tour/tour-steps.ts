import type { DriveStep } from 'driver.js';

export interface TourOptions {
  role?: 'OWNER' | 'CASHIER';
  isDashboard?: boolean;
}

export function getTourSteps(options: TourOptions): DriveStep[] {
  const isOwner = options.role !== 'CASHIER';
  const steps: DriveStep[] = [];

  // ==========================================
  // SIDEBAR NAVIGATION STEPS
  // ==========================================
  steps.push({
    element: '#tour-sidebar-logo',
    popover: {
      title: '🏢 Identitas Bisnis & Peran',
      description:
        'Menampilkan nama usaha dan status peran aktif Anda (Owner Pusat atau Kasir Cabang) secara transparan.',
      side: 'right',
      align: 'start',
    },
  });

  steps.push({
    element: '#tour-sidebar-search',
    popover: {
      title: '🔍 Navigasi Cepat (Ctrl+K)',
      description:
        'Gunakan shortcut Ctrl+K untuk melompat instan ke halaman apapun tanpa perlu menelusuri menu secara manual.',
      side: 'right',
      align: 'start',
    },
  });

  if (isOwner) {
    steps.push({
      element: '#tour-nav-dashboard',
      popover: {
        title: '📊 Dashboard Bisnis',
        description:
          'Pusat kendali owner: evaluasi 3 Pertanyaan Pagi, deteksi anomali biaya Z-Score, rekomendasi mutasi stok, dan tren omzet.',
        side: 'right',
        align: 'start',
      },
    });
  }

  steps.push({
    element: '#tour-nav-pos',
    popover: {
      title: '🛒 Kasir POS Interaktif',
      description:
        'Operasional kasir cepat: input transaksi Tunai & QRIS dinamis, cetak struk thermal, dan pembatalan (Void Sale) dengan pemulihan stok otomatis.',
      side: 'right',
      align: 'start',
    },
  });

  steps.push({
    element: '#tour-nav-transactions',
    popover: {
      title: '🧾 Riwayat Transaksi',
      description:
        'Audit trail seluruh penjualan kasir. Anda dapat memfilter transaksi berdasarkan tanggal, kasir, atau cabang.',
      side: 'right',
      align: 'start',
    },
  });

  steps.push({
    element: '#tour-nav-inventory',
    popover: {
      title: '📦 Inventaris & Multi-Cabang',
      description:
        'Kelola katalog produk, SKU unik, modal (HPP), dan stok per cabang. Algoritma Z-Score membantu memprediksi defisit bahan baku.',
      side: 'right',
      align: 'start',
    },
  });

  steps.push({
    element: '#tour-nav-expenses',
    popover: {
      title: '💸 Pencatatan Pengeluaran',
      description:
        'Catat seluruh beban operasional: bahan baku, gaji, atau utilitas. Sistem otomatis mendeteksi bila ada lonjakan biaya tidak wajar.',
      side: 'right',
      align: 'start',
    },
  });

  if (isOwner) {
    steps.push({
      element: '#tour-nav-reports',
      popover: {
        title: '📄 Laporan Keuangan Otomatis',
        description:
          'Buku kas otomatis (Auto-Ledger), Laba-Rugi, dan kalkulasi HPP siap ekspor PDF/Excel resmi untuk pengajuan perbankan KUR.',
        side: 'right',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-nav-management',
      popover: {
        title: '⚙️ Manajemen Multi-Cabang & Staf',
        description:
          'Kelola hingga 5 cabang gerai, penugasan staf kasir per cabang, serta fasilitas impor data produk massal lewat CSV.',
        side: 'right',
        align: 'start',
      },
    });
  }

  steps.push({
    element: '#tour-sidebar-demo',
    popover: {
      title: '🎯 Panduan Demo Juri',
      description:
        'Panduan interaktif 5 skenario pengujian alur penuh untuk dewan juri GTNIC 2026. Uji keunggulan sistem secara terstruktur dari sini.',
      side: 'right',
      align: 'start',
    },
  });

  steps.push({
    element: '#tour-trigger-btn',
    popover: {
      title: '🧭 Panduan Tur Kapan Saja',
      description:
        'Butuh melihat ulang penjelasan fitur? Cukup klik tombol ini kapan saja di sidebar untuk memutar ulang panduan interaktif.',
      side: 'right',
      align: 'start',
    },
  });

  steps.push({
    element: '#tour-sidebar-user',
    popover: {
      title: '👤 Profil & Keluar',
      description:
        'Informasi akun yang sedang aktif dan tombol keluar aman untuk mengakhiri sesi kerja Anda.',
      side: 'right',
      align: 'start',
    },
  });

  // ==========================================
  // DASHBOARD PAGE STEPS (hanya jika di /dashboard dan isOwner)
  // ==========================================
  if (options.isDashboard && isOwner) {
    steps.push({
      element: '#tour-dashboard-greeting',
      popover: {
        title: '👋 Ikhtisar Bisnis Pagi Hari',
        description:
          'Panel salam harian dan tanggal operasional. Menampilkan ringkasan gerai dan tombol pembaruan data real-time.',
        side: 'bottom',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-briefing-button',
      popover: {
        title: '🎙️ Asisten Suara: Briefing Pagi',
        description:
          'Dengarkan rangkuman kondisi bisnis secara lisan via Voice AI sintetis. Cepat, efisien, dan siap menyapa owner di pagi hari.',
        side: 'bottom',
        align: 'end',
      },
    });

    steps.push({
      element: '#tour-metric-strip',
      popover: {
        title: '📊 4 Pertanyaan Kunci Pagi Hari',
        description:
          'Status esensial harian: kemarin untung/rugi, kecocokan uang kas kasir, pengeluaran abnormal, dan potensi penghematan mutasi stok.',
        side: 'bottom',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-anomaly-card',
      popover: {
        title: '⚠️ Deteksi Anomali Z-Score',
        description:
          'Deteksi matematis otomatis terhadap anomali biaya dan selisih register. Klik tombol "Tinjau" untuk investigasi dan persetujuan tindak lanjut.',
        side: 'top',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-transfer-card',
      popover: {
        title: '🔄 Rekomendasi Mutasi Stok 1-Klik',
        description:
          'Sistem mencocokkan cabang surplus dan defisit stok. Klik "Pindahkan Stok" untuk mengeksekusi mutasi antarcabang secara instan.',
        side: 'top',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-trend-chart',
      popover: {
        title: '📈 Tren Finansial 7 Hari',
        description:
          'Visualisasi rasio omzet harian vs beban modal serta rata-rata margin keuntungan usaha Anda.',
        side: 'top',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-performance-card',
      popover: {
        title: '🏬 Performa Cabang',
        description:
          'Pencapaian target penjualan, jumlah transaksi, dan kesehatan stok tiap cabang aktif, plus tautan cepat ke manajemen cabang.',
        side: 'left',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-account-status',
      popover: {
        title: '🔒 Keamanan & Isolasi Data RLS',
        description:
          'Data terisolasi penuh dengan Row Level Security (RLS) Supabase — aman, tersertifikasi, dan bebas risiko kebocoran antar organisasi.',
        side: 'left',
        align: 'start',
      },
    });

    steps.push({
      element: '#tour-quick-guide',
      popover: {
        title: '🚀 Pintasan Uji Coba Juri',
        description:
          'Akses cepat menuju Panduan Demo 5 skenario juri dan contoh laporan laba rugi untuk simulasi instan.',
        side: 'left',
        align: 'start',
      },
    });
  }

  return steps;
}
