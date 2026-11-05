'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlurBrand } from '@/components/ui/alur-logo';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Coffee,
  Store,
  ShoppingBag,
  Utensils,
  Zap,
  TrendingUp,
  Boxes,
  XCircle,
  Mic,
  FileSpreadsheet,
  Activity,
  Smartphone,
  RefreshCw,
  Building2,
  FileText,
} from 'lucide-react';
import {
  BlueprintCanvas,
  DashedRule,
  CornerMarks,
  Callout,
  FeatureGrid,
  FeatureCell,
} from '@/components/ui/blueprint-grid';
import {
  SectionHeader,
  TransactionFeedDemo,
  SyncCardDemo,
  SecurityCardDemo,
  AnomalyTerminalDemo,
  Stagger,
  Reveal,
  NetworkRadarMotion,
  CtaBannerMotion,
  HeroWorkflowPreview,
} from '@/components/landing/motion';

const testimonials = [
  {
    id: 'kopi-senja',
    tag: 'Contoh penggunaan',
    brand: 'Kedai Kopi',
    icon: Coffee,
    quote:
      'Catat pesanan, pantau transaksi, dan tinjau ringkasan usaha dari satu tempat. Aktivitas cabang dapat dilihat tanpa mengumpulkan catatan secara terpisah, sehingga kondisi usaha lebih mudah dipantau.',
    author: 'Skenario ilustrasi',
    role: 'Bukan testimoni pelanggan',
    initials: 'KI',
    stats: [
      { value: 'Pesanan', label: 'Catat transaksi' },
      { value: 'Stok', label: 'Pantau persediaan' },
      { value: 'Ringkasan', label: 'Tinjau usaha' },
    ],
  },
  {
    id: 'roti-manis',
    tag: 'Contoh penggunaan',
    brand: 'Toko Roti',
    icon: Store,
    quote:
      'Pantau persediaan tiap cabang dan lihat kebutuhan stok dalam satu alur kerja. Informasi ini membantu pemilik meninjau ketersediaan barang dan menentukan langkah berikutnya.',
    author: 'Skenario ilustrasi',
    role: 'Bukan testimoni pelanggan',
    initials: 'TR',
    stats: [
      { value: 'Cabang', label: 'Lihat stok per cabang' },
      { value: 'Stok', label: 'Pantau persediaan' },
      { value: 'Mutasi', label: 'Kelola perpindahan' },
    ],
  },
  {
    id: 'toko-berkah',
    tag: 'Contoh penggunaan',
    brand: 'Toko Ritel',
    icon: ShoppingBag,
    quote:
      'Tinjau catatan transaksi dan laporan usaha untuk memahami kondisi bisnis. Ringkasan penjualan dan pengeluaran membantu pemilik melihat aktivitas usaha sebelum menentukan langkah selanjutnya.',
    author: 'Skenario ilustrasi',
    role: 'Bukan testimoni pelanggan',
    initials: 'TR',
    stats: [
      { value: 'Transaksi', label: 'Tinjau catatan usaha' },
      { value: 'Laporan', label: 'Lihat ringkasan' },
      { value: 'Cabang', label: 'Pantau beberapa lokasi' },
    ],
  },
  {
    id: 'dapur-selera',
    tag: 'Contoh penggunaan',
    brand: 'Usaha Kuliner',
    icon: Utensils,
    quote:
      'Catat transaksi dan pengeluaran, lalu tinjau ringkasannya tanpa berpindah-pindah pencatatan. Dengan begitu, catatan penjualan dan biaya lebih mudah ditinjau bersama sebagai gambaran aktivitas usaha.',
    author: 'Skenario ilustrasi',
    role: 'Bukan testimoni pelanggan',
    initials: 'UK',
    stats: [
      { value: 'Transaksi', label: 'Catat penjualan' },
      { value: 'Pengeluaran', label: 'Catat biaya usaha' },
      { value: 'Ringkasan', label: 'Tinjau catatan' },
    ],
  },
];

const featureFlows = [
  {
    id: 'voice',
    title: 'Kasir',
    icon: Mic,
    desc: 'Catat pesanan melalui suara atau input biasa, lalu periksa keranjang sebelum transaksi disimpan.',
    steps: [
      { label: 'Pesanan', sub: 'Suara atau teks' },
      { label: 'Pengenalan', sub: 'Periksa hasil' },
      { label: 'Keranjang', sub: 'Tinjau item' },
      { label: 'Pembayaran', sub: 'Pilih metode' },
      { label: 'Transaksi', sub: 'Simpan pesanan' },
    ],
  },
  {
    id: 'ledger',
    title: 'Laporan usaha',
    icon: FileSpreadsheet,
    desc: 'Catatan penjualan dan pengeluaran membantu pemilik meninjau aktivitas serta laporan usaha.',
    steps: [
      { label: 'Penjualan', sub: 'Catatan transaksi' },
      { label: 'Pengeluaran', sub: 'Catatan biaya' },
      { label: 'Rekap', sub: 'Data usaha' },
      { label: 'Laporan', sub: 'Tinjau hasil' },
      { label: 'Keputusan', sub: 'Tentukan langkah' },
    ],
  },
  {
    id: 'anomaly',
    title: 'Stok & aktivitas',
    icon: Activity,
    desc: 'Pantau perubahan aktivitas usaha dan persediaan, agar hal yang perlu diperiksa lebih mudah terlihat.',
    steps: [
      { label: 'Data usaha', sub: 'Transaksi & stok' },
      { label: 'Pemantauan', sub: 'Perubahan aktivitas' },
      { label: 'Peringatan', sub: 'Hal yang perlu dicek' },
      { label: 'Tinjau stok', sub: 'Periksa kebutuhan' },
      { label: 'Tindak lanjut', sub: 'Kelola antar cabang' },
    ],
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        setIsLoggedIn(res.ok);
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  const currentTestimonial = testimonials[activeTab];
  const currentFlow = featureFlows[activeFeatureTab];

  return (
    <div className="landing-theme min-h-screen bg-white text-slate-900">
      <BlueprintCanvas className="min-h-screen text-slate-900 flex flex-col">
        {/* ======================================================== */}
        {/* 1. TOP NAVBAR (Full-bleed Header) */}
        {/* ======================================================== */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center group">
              <AlurBrand size="md" />
            </Link>

            {/* Desktop Navigation Links (Clean & Ringkas) */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
              <a href="#solusi" className="hover:text-slate-900 transition-colors">
                Solusi
              </a>
              <a href="#fondasi" className="hover:text-slate-900 transition-colors">
                Fitur
              </a>
              <a href="#testimoni" className="hover:text-slate-900 transition-colors">
                Contoh penggunaan
              </a>
              <a href="#arsitektur" className="hover:text-slate-900 transition-colors">
                Alur Kerja
              </a>
            </nav>

            {/* Right Action Button (Masuk jika belum login, Dashboard jika sudah login) */}
            <div className="flex items-center">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="px-4 py-1.5 text-xs font-bold rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-1.5 text-xs font-bold rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* ======================================================== */}
        {/* 2. HERO CONTAINER ORANYE MELENGKUNG (redesign/home/hero.png) */}
        {/* ======================================================== */}
        <section id="hero" className="px-3 sm:px-6 md:px-8 pt-4 pb-12 sm:pb-16 max-w-[1120px] mx-auto w-full">
          <div className="relative rounded-3xl overflow-hidden bg-hero-gradient shadow-2xl shadow-brand-500/20 text-white p-6 sm:p-10 lg:p-12 flex items-center min-h-[580px]">
            {/* Tekstur Halftone Dot-Grid murni CSS */}
            <div className="absolute inset-0 bg-dot-grid opacity-35 pointer-events-none" />

            {/* Subtle Warm Glow di Bagian Bawah Hero */}
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] h-[250px] bg-white/20 blur-[100px] pointer-events-none rounded-full" />

            <div className="relative z-10 flex w-full flex-col items-center text-center">
              {/* Headline Display Masif */}
              <h1 className="mt-6 sm:mt-8 max-w-3xl text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-white">
                Dengan alur, semua cabang teratasi.
              </h1>

              {/* Subtitle Paragraf */}
              <p className="mt-5 sm:mt-6 max-w-2xl text-sm sm:text-base md:text-lg font-normal text-white/95 leading-relaxed">
                Catat pesanan, pantau persediaan, dan tinjau laporan usaha dari satu tempat. Lihat aktivitas tiap cabang untuk mengetahui hal yang perlu diperiksa.
              </p>

              {/* CTA Buttons Row */}
              <div className="mt-8 sm:mt-10 flex w-full flex-col items-center justify-center gap-3.5 sm:w-auto sm:flex-row">
                <Link
                  href="/demo-guide"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-bold text-slate-900 shadow-xl transition-all hover:scale-[1.02] hover:bg-zinc-100 active:scale-[0.98] sm:w-auto sm:text-base"
                >
                  Lihat Panduan Demo
                </Link>

                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-all hover:bg-white/20 active:scale-[0.98] sm:w-auto sm:text-base"
                >
                  Masuk
                </Link>
              </div>

              <HeroWorkflowPreview />
            </div>
          </div>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 3. SOCIAL PROOF & TESTIMONI (Clean, Simple & Elegant) */}
        {/* ======================================================== */}
        <section id="testimoni" className="relative w-full py-16 sm:py-24">
          <div className="max-w-[920px] mx-auto px-4 sm:px-6">
            {/* Section Header */}
            <SectionHeader className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                <span>Contoh penggunaan</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-slate-900">
                Satu alur untuk aktivitas usaha
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                Ilustrasi cara Alur dapat digunakan untuk mencatat transaksi dan memantau usaha.
              </p>
            </SectionHeader>

            {/* Simple Capsule Switcher (No scrollbar track) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {testimonials.map((item, idx) => {
                const isActive = activeTab === idx;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(idx)}
                    type="button"
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer select-none ${isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:border-slate-300'
                      }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                    <span>{item.brand}</span>
                  </button>
                );
              })}
            </div>

            {/* Elegant Single-Surface Testimonial Card */}
            <div className="landing-card-hover mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 md:p-12 shadow-xs relative">
              <CornerMarks />

              {/* Tag & Meta info */}
            <div className="pb-6 border-b border-slate-100">
              <span className="font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200/60 text-xs">
                {currentTestimonial.tag}
              </span>
              </div>

              {/* Large Editorial Quote */}
              <div className="py-8 sm:py-10">
                <blockquote className="text-lg sm:text-2xl font-normal text-slate-900 leading-relaxed tracking-tight">
                  “{currentTestimonial.quote}”
                </blockquote>
              </div>

              {/* Bottom Row: Founder Info on Left + 3 Clean KPI Stat Columns on Right */}
              <div className="pt-8 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                {/* Author Info */}
                <div className="flex items-center space-x-3.5 shrink-0">
                  <div className="h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-sm tracking-tight">
                    {currentTestimonial.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {currentTestimonial.author}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentTestimonial.role}
                    </p>
                  </div>
                </div>

                {/* 3 Clean KPI Columns */}
                <div className="grid grid-cols-3 gap-4 sm:gap-8 divide-x divide-slate-100 max-w-md w-full">
                  {currentTestimonial.stats.map((st, i) => (
                    <div key={i} className={i > 0 ? 'pl-4 sm:pl-8' : ''}>
                      <div className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                        {st.value}
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
                        {st.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 4. PILAR FONDASI BISNIS & TEKNOLOGI (detail-blueprint-grid.png style) */}
        {/* ======================================================== */}
        <section id="fondasi" className="relative w-full py-16 sm:py-24">
          <div className="max-w-[910px] mx-auto px-4 sm:px-6 space-y-8">
            <SectionHeader className="text-center max-w-2xl mx-auto space-y-2.5">
              <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-slate-900">
                Hal penting untuk operasional usaha
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 tracking-tight">
                Catat transaksi, pantau laporan, dan kelola persediaan dalam satu aplikasi.
              </p>
            </SectionHeader>

            {/* Feature Grid dengan CornerMarks Siku Tajam (detail-blueprint-grid.png) */}
            <FeatureGrid className="mt-8">
              <FeatureCell
                icon={Zap}
                title="Pencatatan transaksi"
                description="Catat pesanan melalui suara atau input biasa, lalu tinjau sebelum disimpan."
              />
              <FeatureCell
                icon={TrendingUp}
                title="Ringkasan usaha"
                description="Tinjau penjualan dan pengeluaran melalui laporan yang tersusun."
              />
              <FeatureCell
                icon={Boxes}
                title="Kelola persediaan"
                description="Pantau stok dan perpindahan barang antarcabang dengan lebih mudah."
              />
            </FeatureGrid>
          </div>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 5. KOMPARASI MASALAH VS SOLUSI (redesign/home/info2.png) */}
        {/* ======================================================== */}
        <section id="solusi" className="relative w-full py-16 sm:py-24">
          <div className="max-w-[910px] mx-auto px-4 sm:px-6 space-y-10">
            {/* Section Header */}
            <SectionHeader className="text-center max-w-2xl mx-auto space-y-2.5">
              <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-slate-900">
                Mengapa Memilih Alur?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 tracking-tight">
                Satukan pencatatan transaksi dan pemantauan usaha dalam satu tempat.
              </p>
            </SectionHeader>

            {/* 2-Column Side-by-Side Comparison Cards */}
            <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch" distance={18} stagger={0.14}>
              {/* Kartu Kiri: Masalah Tradisional (Dark Card with Friction Tags) */}
              <div className="landing-card-hover relative rounded-none border border-slate-200 bg-slate-50/80 shadow-sm p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <CornerMarks />

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Cara lama
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      Pencatatan terpisah
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                    Catatan usaha tersebar
                  </h3>

                  <ul className="space-y-3 text-sm text-slate-600 leading-relaxed pt-2">
                    <li className="flex items-start gap-2.5">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Transaksi dan pengeluaran dicatat di tempat berbeda.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Rekap penjualan perlu dikumpulkan dari berbagai catatan.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Informasi stok cabang tidak mudah dipantau bersama.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Pemilik perlu berpindah-pindah untuk melihat kondisi usaha.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Catatan tidak terpusat</span>
                  <span className="font-semibold text-rose-700">Sulit dipantau</span>
                </div>
              </div>

              {/* Kartu Kanan: Solusi Gesit Alur (Vibrant Orange Card) */}
              <div className="landing-card-hover relative rounded-none border border-brand-500/40 bg-hero-gradient p-6 sm:p-8 flex flex-col justify-between space-y-6 text-white shadow-xl shadow-brand-500/15">
                <CornerMarks borderClass="border-white/50" bgClass="bg-brand-600" />

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Dengan Alur</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
                    Kelola dari satu tempat
                  </h3>

                  <ul className="space-y-3 text-xs sm:text-[13px] text-white/95 leading-relaxed pt-2">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                      <span>Catat pesanan melalui suara atau input biasa.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                      <span>Tinjau penjualan dan pengeluaran melalui laporan.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                      <span>Pantau perubahan aktivitas yang perlu diperiksa.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
                      <span>Lihat persediaan dan kelola stok antarcabang.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs text-white/90">
                  <span>Informasi usaha</span>
                  <span className="font-bold text-white">Dalam satu alur</span>
                </div>
              </div>
            </Stagger>

            {/* Section Transition Heading */}
            <Reveal distance={16} delay={0.1}>
              <div className="pt-10 text-center space-y-1.5">
                <h3 className="text-xl sm:text-3xl font-medium tracking-tight text-slate-900">
                  Untuk usaha dengan banyak cabang
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Kelola aktivitas cabang dari satu tempat.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 6. ARSITEKTUR SOLUSI & ALIRAN DATA REAL-TIME */}
        {/* ======================================================== */}
        <section id="arsitektur" className="relative w-full py-16 sm:py-24">
          <div className="max-w-[910px] mx-auto px-4 sm:px-6 space-y-10">
            {/* Section Header */}
            <SectionHeader className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-slate-900">
                Alur kerja dalam satu aplikasi
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 tracking-tight">
                Lihat gambaran singkat bagaimana aktivitas usaha dicatat dan ditinjau.
              </p>
            </SectionHeader>

            {/* Capsule Tab Switcher (info3.png) */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {featureFlows.map((flow, idx) => {
                const isActive = activeFeatureTab === idx;
                const Icon = flow.icon;
                return (
                  <button
                    key={flow.id}
                    onClick={() => setActiveFeatureTab(idx)}
                    type="button"
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 scale-102'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-200/70'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{flow.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Architecture Overview Flow Box (info3.png top box) */}
            <div className="landing-card-hover relative rounded-none border border-slate-200 bg-slate-50/70 p-6 sm:p-8 space-y-6">
              <CornerMarks />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Column: Deskripsi Alur */}
                <div className="lg:col-span-5 space-y-3">
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-widest">
                    Alur kerja
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {currentFlow.title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    {currentFlow.desc}
                  </p>
                </div>

                {/* Right Column: Visual Pipeline Steps Diagram */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-4 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-right">
                    Tahapan
                  </p>
                  <Stagger className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center" distance={10} stagger={0.06}>
                    {currentFlow.steps.map((st, i) => (
                      <div
                        key={i}
                        className="border border-dashed border-slate-200 bg-slate-50/80 p-2.5 flex flex-col justify-center space-y-1 relative group hover:border-brand-500/60 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {st.label}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {st.sub}
                        </p>
                      </div>
                    ))}
                  </Stagger>
                  <p className="text-xs text-slate-500 text-center mt-3">
                    Dari pencatatan hingga laporan usaha.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 7. BENTO GRID FITUR UNGGULAN (redesign/home/info4.png) */}
        {/* ======================================================== */}
        <section id="keunggulan" className="relative w-full py-16 sm:py-24">
          <div className="max-w-[910px] mx-auto px-4 sm:px-6 space-y-10">
            {/* Section Header */}
            <SectionHeader className="text-center max-w-2xl mx-auto space-y-2.5">
              <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-slate-900">
                Fitur untuk kegiatan sehari-hari
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 tracking-tight">
                Bantu kasir mencatat transaksi dan pemilik memantau kegiatan usaha.
              </p>
            </SectionHeader>

            {/* 2x2 Asymmetric Bento Grid Container (Outer Blueprint Frame) */}
            <div className="relative rounded-none border border-slate-200 bg-white shadow-sm">
              <CornerMarks />

              <div className="grid grid-cols-1 md:grid-cols-3">
                {/* Card 1: Top-Left (Col span 2) - Fits into your existing workflows */}
                <div className="landing-card-hover md:col-span-2 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b border-slate-200 space-y-6">
                  {/* Top Visual Area: Live Transaction Register Stream (info4.png deployment list) */}
                  <TransactionFeedDemo />

                  {/* Bottom Text */}
                  <div className="space-y-1.5 pt-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Pencatatan untuk kasir
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                      Catat pesanan dan transaksi dari halaman kasir. Periksa detail sebelum menyimpannya.
                    </p>
                  </div>
                </div>

                {/* Card 2: Top-Right (Col span 1) - One network for users, apps, and data (Vibrant Orange Card) */}
                <SyncCardDemo />

                {/* Card 3: Bottom-Left (Col span 1) - Secure by default */}
                <SecurityCardDemo />

                {/* Card 4: Bottom-Right (Col span 2) - Fast path to AI adoption with Terminal */}
                <AnomalyTerminalDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 8. JARINGAN MULTI-CABANG TERHUBUNG (redesign/home/about.png) */}
        {/* ======================================================== */}
        <section id="cabang" className="relative w-full py-16 sm:py-24 overflow-hidden">
          <div className="max-w-[910px] mx-auto px-4 sm:px-6 space-y-12">
            {/* Section Header (Region: Earth in about.png) */}
            <SectionHeader className="text-center max-w-2xl mx-auto space-y-2.5">
              <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-slate-900">
                Pantau cabang dalam satu tempat
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 tracking-tight">
                Lihat aktivitas cabang dan persediaan melalui satu aplikasi.
              </p>
            </SectionHeader>

            {/* Central Visual: Multi-Branch Vector Network Globe / Radar Canvas */}
            <NetworkRadarMotion>
              <div className="landing-card-hover relative rounded-none border border-slate-200 bg-slate-50/70 p-6 sm:p-10 min-h-[440px] sm:min-h-[500px] flex flex-col justify-between items-center overflow-hidden">
                <CornerMarks />

                {/* Ambient Warm Glow */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[320px] sm:w-[480px] h-[220px] bg-brand-500/10 blur-[90px] pointer-events-none rounded-full" />

                {/* Orbit Circles (simulating globe wireframe) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[280px] sm:w-[380px] md:w-[460px] h-[280px] sm:h-[380px] md:h-[460px] rounded-full border border-dashed border-slate-300/80" />
                  <div className="absolute w-[200px] sm:w-[280px] md:w-[340px] h-[200px] sm:h-[280px] md:h-[340px] rounded-full border border-slate-300/60" />
                  <div className="absolute w-[120px] sm:w-[180px] md:w-[220px] h-[120px] sm:h-[180px] md:h-[220px] rounded-full border border-dashed border-slate-300/40" />
                </div>

                {/* SVG Arcs Connecting the Branches */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 800 460"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  {/* Curve from Hub Pusat (400, 130) to Cabang Bandung (200, 310) */}
                  <path
                    d="M 400 130 Q 280 180 200 310"
                    stroke="#EA580C"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    className="radar-arc opacity-80"
                  />
                  {/* Curve from Hub Pusat (400, 130) to Cabang Surabaya (600, 310) */}
                  <path
                    d="M 400 130 Q 520 180 600 310"
                    stroke="#EA580C"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    className="radar-arc opacity-80"
                  />
                  {/* Direct Inter-branch Mutation Line between Bandung and Surabaya */}
                  <path
                    d="M 200 310 Q 400 360 600 310"
                    stroke="#CBD5E1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="radar-arc"
                  />
                </svg>

                {/* Nodes Layer */}
                <div className="relative z-20 w-full h-full min-h-[300px] sm:min-h-[340px]">
                  {/* 1. Hub Pusat (Jakarta / Owner Control) */}
                  <div className="radar-node absolute top-[8%] sm:top-[12%] left-1/2 -translate-x-1/2 flex flex-col items-center group cursor-default">
                    <div className="relative">
                      <span className="absolute -inset-1 rounded-full bg-brand-500/30 animate-ping duration-1000" />
                      <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-hero-gradient text-white flex items-center justify-center shadow-lg shadow-brand-500/30 border border-white/20">
                        <Building2 className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-2 text-center bg-white px-3 py-1 rounded-full border border-brand-500/40 shadow-sm backdrop-blur-xs">
                      <p className="text-xs font-bold text-slate-900 leading-none">Pusat Kendali Owner</p>
                      <p className="text-[10px] text-brand-700 font-mono mt-0.5">Pusat usaha</p>
                    </div>
                  </div>

                  {/* 2. Cabang 1 */}
                  <div className="radar-node absolute bottom-[8%] sm:bottom-[12%] left-[4%] sm:left-[16%] flex flex-col items-center group cursor-default">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white text-brand-600 border border-brand-500/40 flex items-center justify-center shadow-md">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-center bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-xs">
                      <p className="text-[11px] font-bold text-slate-800 leading-none">Cabang 1</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Transaksi & stok</p>
                    </div>
                  </div>

                  {/* 3. Cabang 2 */}
                  <div className="radar-node absolute bottom-[8%] sm:bottom-[12%] right-[4%] sm:right-[16%] flex flex-col items-center group cursor-default">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white text-brand-600 border border-brand-500/40 flex items-center justify-center shadow-md">
                      <Coffee className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-center bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-sm backdrop-blur-xs">
                      <p className="text-[11px] font-bold text-slate-800 leading-none">Cabang 2</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Transaksi & stok</p>
                    </div>
                  </div>

                  {/* Callout 1 (Left) */}
                  <div className="radar-callout radar-callout-left hidden lg:block absolute top-[28%] left-2 max-w-[230px]">
                    <Callout title="Catat pesanan">
                      Masukkan pesanan melalui suara atau input biasa.
                    </Callout>
                  </div>

                  {/* Callout 2 (Right) */}
                  <div className="radar-callout radar-callout-right hidden lg:block absolute top-[24%] right-2 max-w-[240px]">
                    <Callout title="Pantau cabang">
                      Tinjau transaksi dan persediaan dari satu aplikasi.
                    </Callout>
                  </div>
                </div>

                {/* Mobile/Tablet Inline Callouts (Below map on smaller screens to prevent overlap) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6 lg:hidden relative z-20">
                  <Callout title="Catat pesanan">
                    Masukkan pesanan melalui suara atau input biasa.
                  </Callout>
                  <Callout title="Pantau cabang">
                    Tinjau transaksi dan persediaan dari satu aplikasi.
                  </Callout>
                </div>
              </div>
            </NetworkRadarMotion>

            {/* 3-Cell Feature Grid at Bottom (Run everywhere, Run anywhere, Run at massive scale) */}
            <FeatureGrid>
              <FeatureCell
                icon={Smartphone}
                title="Akses dari berbagai perangkat"
                description="Gunakan aplikasi melalui perangkat yang sesuai dengan kebutuhan usaha."
              />
              <FeatureCell
                icon={RefreshCw}
                title="Pantau transaksi dan stok"
                description="Tinjau catatan transaksi dan persediaan cabang dalam satu alur."
              />
              <FeatureCell
                icon={TrendingUp}
                title="Kelola beberapa cabang"
                description="Lihat kegiatan usaha dari berbagai cabang melalui satu aplikasi."
              />
            </FeatureGrid>
          </div>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 9. CTA BANNER PENUTUP (redesign/home/footer.png) */}
        {/* ======================================================== */}
        <section className="px-3 sm:px-6 md:px-8 py-14 sm:py-20 max-w-[1120px] mx-auto w-full">
          <CtaBannerMotion>
            <div className="relative rounded-3xl overflow-hidden bg-hero-gradient shadow-2xl shadow-brand-500/25 text-white p-7 sm:p-12 md:p-16 text-center flex flex-col items-center justify-center">
              {/* Halftone Dot-Grid Pattern */}
              <div className="absolute inset-0 bg-dot-grid opacity-35 pointer-events-none" />

              {/* Warm Ambient Glow di Bagian Bawah */}
              <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[420px] sm:w-[650px] h-[220px] bg-white/20 blur-[100px] pointer-events-none rounded-full" />

              {/* Faint Floating Diamond/Decorative Boxes (mimicking footer.png background) */}
              <div className="cta-floater hidden sm:block absolute top-8 left-12 rotate-12 border border-white/20 bg-white/5 rounded-xl p-3 opacity-30 pointer-events-none">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div className="cta-floater hidden sm:block absolute top-10 right-14 -rotate-12 border border-white/20 bg-white/5 rounded-xl p-3 opacity-30 pointer-events-none">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="cta-floater hidden md:block absolute bottom-24 left-16 -rotate-6 border border-white/20 bg-white/5 rounded-xl p-3 opacity-25 pointer-events-none">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="cta-floater hidden md:block absolute bottom-24 right-16 rotate-6 border border-white/20 bg-white/5 rounded-xl p-3 opacity-25 pointer-events-none">
                <Zap className="h-5 w-5 text-white" />
              </div>

              {/* Headline (Build without boundaries in footer.png) */}
              <h2 className="cta-animate-item relative z-10 text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
                Mulai kelola usaha dengan Alur
              </h2>

              {/* Subtitle */}
              <p className="cta-animate-item relative z-10 mt-4 text-xs sm:text-base md:text-lg text-white/95 max-w-2xl leading-relaxed">
                Kenali cara Alur membantu mencatat transaksi, memantau stok, dan meninjau laporan usaha.
              </p>

              {/* Dual Action Buttons */}
              <div className="cta-animate-item relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
                <Link
                  href="/demo-guide"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-sm sm:text-base font-bold bg-white text-slate-950 hover:bg-zinc-100 transition-all shadow-xl hover:scale-102 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  <span>Lihat Panduan Demo</span>
                </Link>

                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 rounded-full text-sm sm:text-base font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-xs transition-all cursor-pointer"
                >
                  Masuk
                </Link>
              </div>

            </div>
          </CtaBannerMotion>
        </section>

        {/* Full-bleed Horizontal Dashed Rule */}
        <DashedRule />

        {/* ======================================================== */}
        {/* 10. FOOTER MULTI-KOLOM (redesign/home/footer.png) */}
        {/* ======================================================== */}
        <footer className="w-full bg-slate-50 border-t border-slate-200 pt-14 pb-10 text-slate-600">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 space-y-12">
            {/* Top 5-Column Grid */}
            <Reveal distance={16}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10">
                {/* Brand Column (Span 4) */}
                <div className="lg:col-span-4 space-y-4">
                  <Link href="/" className="inline-flex items-center group">
                    <AlurBrand size="md" badge="" />
                  </Link>

                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-sm">
                    Alur membantu usaha mencatat transaksi, memantau stok, dan meninjau laporan.
                  </p>

                </div>

                {/* Column 1: Mulai Cepat (Span 2) */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Mulai Cepat
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <Link href="/demo-guide" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Panduan Demo
                      </Link>
                    </li>
                    <li>
                      <Link href="/pos" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Kasir
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Masuk
                      </Link>
                    </li>
                    <li>
                      <a href="#arsitektur" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Cara kerja
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Column 2: Fitur Utama (Span 2) */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Fitur Utama
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <Link href="/pos" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Pencatatan transaksi
                      </Link>
                    </li>
                    <li>
                      <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Ringkasan usaha
                      </Link>
                    </li>
                    <li>
                      <Link href="/reports" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Laporan
                      </Link>
                    </li>
                    <li>
                      <Link href="/stock" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Persediaan
                      </Link>
                    </li>
                    <li>
                      <Link href="/expenses" className="text-slate-600 hover:text-slate-900 transition-colors">
                        Pengeluaran
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Column 3: Keamanan & Standar (Span 2) */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Informasi
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li><a href="#solusi" className="hover:text-slate-900">Solusi</a></li>
                    <li><a href="#fondasi" className="hover:text-slate-900">Fitur</a></li>
                    <li><a href="#arsitektur" className="hover:text-slate-900">Cara kerja</a></li>
                  </ul>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lainnya</h4>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <a href="#testimoni" className="text-slate-600 hover:text-slate-900">Contoh penggunaan</a>
                    </li>
                    <li><a href="#cabang" className="text-slate-600 hover:text-slate-900">Multi-cabang</a></li>
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Bottom Copyright & Status Bar */}
            <Reveal distance={12} delay={0.08}>
              <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                <div>© 2026 Alur.</div>
              </div>
            </Reveal>
          </div>
        </footer>
      </BlueprintCanvas>
    </div>
  );
}
