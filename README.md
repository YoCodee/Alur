<div align="center">

<img src="./frontend/public/logo-alur.svg" alt="Alur Logo" width="120" height="120" />

# Alur
### Smart Voice POS & Asisten Keputusan Harian Bisnis UMKM Multi-Cabang

**Platform Point of Sale cerdas dengan input suara Bahasa Indonesia, auto-ledger laba rugi real-time, deteksi anomali pengeluaran, dan asisten keputusan berbasis AI untuk UMKM modern.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.1_Flash--Lite-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)

</div>

---

## 🌟 Tentang Alur

**Alur** adalah sistem aplikasi web Point of Sale (POS) dan platform operasional multi-cabang yang dirancang untuk mempercepat transformasi digital UMKM. Dilengkapi dengan asisten suara pintar berbahasa Indonesia, pembukuan otomatis (*Auto-Ledger* laba-rugi real-time), serta dashboard keputusan harian pemilik usaha menggunakan analitik Machine Learning (deteksi anomali pengeluaran *modified Z-score*, peramalan inventaris *Holt-Winters*, dan asisten cerdas Google Gemini).

---

## ✨ Fitur Unggulan

- 🎙️ **Voice-Driven Smart POS**: Input transaksi kasir secara cepat cukup dengan perintah suara alami Bahasa Indonesia.
- 📊 **Real-Time Auto-Ledger**: Sinkronisasi otomatis dari setiap transaksi ke laporan Laba/Rugi (P&L), arus kas, dan riwayat modal tanpa pembukuan manual ganda.
- 🚨 **Deteksi Anomali Biaya (Modified Z-Score)**: Algoritma statistik robust untuk mendeteksi lonjakan pengeluaran tidak wajar secara otomatis.
- 📦 **Peramalan Stok & Smart Transfer (Holt-Winters)**: Rekomendasi otomatis transfer bahan/stok antar-cabang dan estimasi habis stok untuk mencegah *out-of-stock*.
- 🤖 **Asisten Keputusan AI (Gemini 3.1 Flash-Lite & Edge-TTS)**: Fitur "3 Pertanyaan Pagi" yang memberikan briefing audio interaktif mengenai kesehatan finansial dan operasional cabang.
- 🏢 **Multi-Cabang & Keamanan Multi-Tenant**: Arsitektur multi-tenant dengan Row Level Security (RLS) PostgreSQL Supabase untuk memisahkan data tiap organisasi dan cabang.
- 🎨 **Desain Elegan & Responsif**: Palet warna hangat (Warm Canvas 60-30-10), tipografi Plus Jakarta Sans, dan splash screen animasi stroke-reveal yang modern.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend & Fullstack API:** [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript strict), [Tailwind CSS](https://tailwindcss.com/), Radix UI / shadcn, [Recharts](https://recharts.org/), Lucide Icons, GSAP Animation.
- **Database & Auth:** [Supabase](https://supabase.com/) PostgreSQL (Multi-tenant via `org_id`, Row Level Security di semua tabel, RPC atomik untuk manajemen stok & transaksi).
- **AI & ML Engine:** Google Gemini 3.1 Flash-Lite API, Microsoft Edge-TTS, serta implementasi algoritma statistik analitis di sisi server Next.js (`src/server/ml/`).
- **Testing:** [Vitest](https://vitest.dev/), Testing Library (200+ unit & integration tests).
- **Deployment:** [Vercel](https://vercel.com/) (Root Directory = `frontend`) & Supabase Cloud.

---

## 📁 Struktur Direktori

```text
alur/
├── database/                   # Skrip SQL Supabase
│   ├── schema.sql              # 12 Tabel, indeks, trigger WIB & batas cabang
│   ├── functions.sql           # RPC Security Definer (create_sale, restock, dll.)
│   └── rls.sql                 # Row Level Security & column-level GRANT
├── docs/                       # Dokumentasi spesifikasi & progres
│   ├── AGENTS.md               # Konvensi kode & panduan pengembangan
│   ├── assumptions.md          # Log keputusan teknis & arsitektur
│   ├── prdBigPulze.md          # Spesifikasi fungsional & modul sistem
│   └── progress.md             # Status & tracking implementasi
├── frontend/                   # Aplikasi Next.js (Fullstack)
│   ├── src/
│   │   ├── app/                # App Router (Pages, Layouts, API Routes)
│   │   ├── components/         # Komponen UI, Layout, dan Widget POS
│   │   ├── lib/                # Supabase client/server, utilities, date WIB
│   │   └── server/             # Server ML models, parsers, & Gemini Assistant
│   ├── tests/                  # Unit test & test fixtures (Vitest)
│   ├── public/                 # Aset statis & logo Alur
│   └── package.json
└── README.md
```

---

## 🚀 Panduan Memulai Cepat (Local Development)

### 1. Masuk ke folder frontend dan install dependensi
```bash
cd frontend
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Salin file template `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel lingkungan berikut di `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Akun Demo
NEXT_PUBLIC_DEMO_OWNER_EMAIL=owner.demo@bizpulse.id
NEXT_PUBLIC_DEMO_OWNER_PASSWORD=Demo2026!
NEXT_PUBLIC_DEMO_CASHIER_EMAIL=kasir.demo@bizpulse.id
NEXT_PUBLIC_DEMO_CASHIER_PASSWORD=Demo2026!
DEMO_SEED_ENABLED=true

# Asisten AI (Google Gemini)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash-lite
```

### 3. Setup Database Supabase
Jalankan file SQL di Supabase SQL Editor secara berurutan:
1. `database/schema.sql`
2. `database/functions.sql`
3. `database/rls.sql`

> Pastikan email confirmation dinonaktifkan di **Supabase Auth Settings** untuk kemudahan testing akun baru.

### 4. Jalankan Aplikasi
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 🧪 Perintah Pengujian & Kualitas Kode

Jalankan perintah ini dari folder `frontend/`:

```bash
npm run typecheck    # Pemeriksaan tipe TypeScript tanpa emit
npm run lint         # Pengecekan standar kode dengan ESLint
npm run test         # Menjalankan seluruh test suite dengan Vitest
npm run build        # Build produksi Next.js
```

---

## 🌐 Panduan Deployment (Vercel)

1. Hubungkan repository GitHub ini ke akun [Vercel](https://vercel.com).
2. Di bagian pengaturan proyek (**Project Settings**):
   - Atur **Root Directory** menjadi: `frontend`
   - Framework Preset: **Next.js**
3. Tambahkan semua **Environment Variables** yang ada pada `.env.local` ke tab **Settings -> Environment Variables** di Vercel.
4. Klik **Deploy**.

---

## 📜 Lisensi
MIT License - Hak Cipta (c) 2026 Alur Team.
