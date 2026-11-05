'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  ArrowDownCircle,
  FileSpreadsheet,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronsUpDown,
  Search,
  ChevronRight,
  Boxes,
  LayoutGrid,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlurLogoIcon } from '@/components/ui/alur-logo';
import { AIFloatingChat } from '@/components/assistant/ai-floating-chat';
import { useDashboardTour } from '@/hooks/use-dashboard-tour';
import { Toaster } from 'sonner';
interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: 'OWNER' | 'CASHIER';
  org_id: string;
  org_name: string;
  is_demo: boolean;
  branch_id: string | null;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly: boolean;
  tourId?: string;
  badge?: string;
  matchPrefixes?: string[];
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupName: 'Operasional Kasir',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        ownerOnly: true,
        tourId: 'tour-nav-dashboard',
      },
      {
        name: 'Kasir (POS)',
        href: '/pos',
        icon: ShoppingCart,
        ownerOnly: false,
        tourId: 'tour-nav-pos',
      },
      {
        name: 'Riwayat Transaksi',
        href: '/transactions',
        icon: Receipt,
        ownerOnly: false,
        tourId: 'tour-nav-transactions',
      },
    ],
  },
  {
    groupName: 'Finansial & Inventaris',
    items: [
      {
        name: 'Inventaris',
        href: '/inventory',
        icon: Boxes,
        ownerOnly: false,
        matchPrefixes: ['/inventory', '/products', '/stock'],
        tourId: 'tour-nav-inventory',
      },
      {
        name: 'Pengeluaran',
        href: '/expenses',
        icon: ArrowDownCircle,
        ownerOnly: false,
        tourId: 'tour-nav-expenses',
      },
      {
        name: 'Laporan Keuangan',
        href: '/reports',
        icon: FileSpreadsheet,
        ownerOnly: true,
        tourId: 'tour-nav-reports',
      },
    ],
  },
  {
    groupName: 'Manajemen Bisnis',
    items: [
      {
        name: 'Manajemen',
        href: '/management',
        icon: LayoutGrid,
        ownerOnly: true,
        matchPrefixes: ['/management', '/branches', '/staff', '/import'],
        tourId: 'tour-nav-management',
      },
    ],
  },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchNav, setSearchNav] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hook Driver.js Interactive Tour
  const { startTour } = useDashboardTour({
    role: profile?.role,
    pathname,
    autoStart: true,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.data) {
            setProfile(json.data);
          }
        }
      } catch {
        // Ignored
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Shortcut Ctrl+K untuk fokus ke pencarian navigasi
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  const isCashier = profile?.role === 'CASHIER';

  // Nama profil demo sering menyertakan keterangan dalam tanda kurung
  // (mis. "Budi Santoso (Owner)"). Tampilkan nama intinya saja.
  const displayName =
    profile?.full_name?.replace(/\s*\(.*\)\s*$/, '').trim() || 'Pengguna';

  // Filter kelompok navigasi berdasarkan role dan pencarian cepat
  const filteredGroups = navGroups
    .map((group) => {
      const allowedItems = group.items.filter((item) => (isCashier ? !item.ownerOnly : true));
      const searchedItems = allowedItems.filter((item) =>
        searchNav ? item.name.toLowerCase().includes(searchNav.toLowerCase()) : true
      );
      return {
        ...group,
        items: searchedItems,
      };
    })
    .filter((group) => group.items.length > 0);

  // Helper untuk mengecek apakah item navigasi sedang aktif
  function isItemActive(item: NavItem): boolean {
    if (pathname === item.href) return true;
    if (item.matchPrefixes && item.matchPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return true;
    }
    return false;
  }

  // Cari nama halaman aktif untuk breadcrumb topbar
  const allFlattenedItems = navGroups.flatMap((g) => g.items);
  const currentItem =
    allFlattenedItems.find((item) => pathname === item.href) ||
    allFlattenedItems.find((item) =>
      item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix))
    );

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-stone-900">
      <div className="flex flex-1">
        {/* ======================================================== */}
        {/* SIDEBAR DESKTOP (256px - Mengacu ke redesign/dashboard/sidebar (1).png) */}
        {/* ======================================================== */}
        <aside className="hidden md:fixed md:inset-y-0 md:z-30 md:flex md:w-64 md:flex-col border-r border-stone-200/80 bg-white">
          {/* Header Sidebar: Workspace / Akun Selector (Tinggi 56px) */}
          <div
            id="tour-sidebar-logo"
            className="flex h-14 shrink-0 items-center justify-between border-b border-stone-100 bg-white px-4"
          >
            <div className="flex min-w-0 items-center space-x-2.5">
              {/* Logo Alur Icon */}
              <div className="shrink-0 transition-transform hover:scale-105">
                <AlurLogoIcon size={32} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-sm font-extrabold tracking-tight text-stone-900">Alur</span>
                  <span className="text-[10px] text-stone-300">•</span>
                  <p
                    className="truncate text-xs font-medium text-stone-600"
                    title={profile?.org_name || 'POS'}
                  >
                    {profile?.org_name || 'POS'}
                  </p>
                </div>
                <p className="truncate text-xs text-stone-500">
                  {profile?.role === 'CASHIER' ? 'Kasir Cabang' : 'Owner Pusat'}
                </p>
              </div>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-stone-400" />
          </div>

          {/* Quick Search Bar (Ctrl+K) */}
          <div id="tour-sidebar-search" className="shrink-0 px-3 pb-2 pt-3">
            <div className="relative flex w-full items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-stone-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchNav}
                onChange={(e) => setSearchNav(e.target.value)}
                placeholder="Cari menu..."
                className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50/70 pl-8 pr-12 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/15"
              />
              <kbd className="pointer-events-none absolute right-2 inline-flex items-center rounded border border-stone-200 bg-white px-1 py-0.5 font-mono text-[9px] font-medium text-stone-400 shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          </div>

          {/* Navigasi Grouped */}
          <div className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
            {filteredGroups.map((group) => (
              <div key={group.groupName} className="space-y-1">
                <p className="px-2.5 text-[11px] font-medium tracking-wide text-stone-400">
                  {group.groupName}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isItemActive(item);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        id={item.tourId}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group relative flex select-none items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                          isActive
                            ? 'bg-orange-50/80 font-medium text-orange-900'
                            : 'font-normal text-stone-600 hover:bg-stone-100/70 hover:text-stone-900'
                        }`}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-orange-500"
                          />
                        )}
                        <div className="flex min-w-0 items-center">
                          <Icon
                            className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-orange-600'
                                : 'text-stone-400 group-hover:text-stone-600'
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {item.badge && (
                            <span className="rounded-md border border-stone-200/70 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight
                            className={`h-3 w-3 transition-opacity ${
                              isActive
                                ? 'text-orange-400 opacity-80'
                                : 'text-stone-300 opacity-0 group-hover:opacity-100'
                            }`}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panduan Demo Link di Sidebar Footer */}
          <div id="tour-sidebar-demo" className="shrink-0 border-t border-stone-100 bg-white px-3 py-2">
            <Link
              href="/demo-guide"
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                pathname === '/demo-guide'
                  ? 'bg-orange-50/80 font-medium text-orange-900'
                  : 'font-normal text-stone-500 hover:bg-stone-100/70 hover:text-stone-900'
              }`}
            >
              <div className="flex min-w-0 items-center">
                <Sparkles className="mr-2.5 h-4 w-4 shrink-0 text-orange-500" />
                <span className="truncate">Panduan Demo</span>
              </div>
            </Link>
          </div>

          {/* Tombol Panduan Fitur */}
          <div className="shrink-0 border-t border-stone-100 bg-white px-3 py-1.5">
            <button
              id="tour-trigger-btn"
              type="button"
              onClick={startTour}
              className="group flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] font-medium text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/25"
              title="Lihat panduan fitur"
            >
              <div className="flex min-w-0 items-center">
                <Compass className="mr-2.5 h-4 w-4 shrink-0 text-orange-500 transition-transform group-hover:rotate-45" />
                <span className="truncate">Panduan Fitur</span>
              </div>
            </button>
          </div>

          {/* Footer Sidebar: Profil Pengguna & Keluar */}
          <div id="tour-sidebar-user" className="shrink-0 border-t border-stone-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center space-x-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold uppercase text-stone-600 ring-1 ring-stone-200/70">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium leading-tight text-stone-900">
                    {displayName || 'Pengguna'}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-stone-400">
                    {profile?.email || ''}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLogout}
                title="Keluar dari akun"
                className="text-stone-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MAIN WORKSPACE WRAPPER (Desktop md:pl-64) */}
        {/* ======================================================== */}
        <div className="md:pl-64 flex flex-col flex-1 min-w-0">
          {/* ======================================================== */}
          {/* TOPBAR DESKTOP (Tinggi 52px - Mengacu ke redesign/dashboard/topbar.png) */}
          {/* ======================================================== */}
          <header className="sticky top-0 z-20 hidden h-14 shrink-0 items-center justify-between border-b border-stone-200/70 bg-canvas/85 px-6 backdrop-blur-sm md:flex">
            {/* Breadcrumb / Halaman Aktif */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-stone-400">Alur</span>
              <span className="text-stone-300">/</span>
              <span className="font-medium text-stone-800">
                {currentItem?.name || 'Area Kerja'}
              </span>
            </div>

          </header>

          {/* ======================================================== */}
          {/* TOPBAR MOBILE (Tinggi 56px) */}
          {/* ======================================================== */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200/70 bg-canvas/90 px-4 backdrop-blur-sm md:hidden">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Buka menu navigasi"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="flex items-center space-x-1.5">
                <div className="shrink-0">
                  <AlurLogoIcon size={24} />
                </div>
                <span className="font-sans text-sm font-extrabold tracking-tight text-stone-900">Alur</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-stone-500">
                {profile?.role === 'CASHIER' ? 'Kasir' : 'Owner'}
              </span>
            </div>
          </header>

          {/* Drawer Navigasi Mobile */}
          {mobileMenuOpen && (
            <div className="z-20 space-y-4 border-b border-stone-200/70 bg-white px-4 py-4 shadow-lg md:hidden">
              {filteredGroups.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <p className="text-[11px] font-medium tracking-wide text-stone-400">
                    {group.groupName}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = isItemActive(item);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                            isActive
                              ? 'bg-orange-50/80 font-medium text-orange-900'
                              : 'font-normal text-stone-600 hover:bg-stone-100/70'
                          }`}
                        >
                          <div className="flex items-center">
                            <Icon
                              className={`mr-3 h-4 w-4 ${
                                isActive ? 'text-orange-600' : 'text-stone-400'
                              }`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 ring-1 ring-stone-200/70">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Panduan Demo di Mobile Drawer */}
              <div className="border-t border-stone-100 pt-3">
                <Link
                  href="/demo-guide"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                    pathname === '/demo-guide'
                      ? 'bg-orange-50/80 font-medium text-orange-900'
                      : 'font-normal text-stone-600 hover:bg-stone-100/70'
                  }`}
                >
                  <div className="flex items-center">
                    <Sparkles className="mr-3 h-4 w-4 text-orange-500" />
                    <span>Panduan Demo</span>
                  </div>
                </Link>
              </div>

              {/* Panduan Tur di Mobile Drawer */}
              <div className="border-t border-stone-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    startTour();
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  <div className="flex items-center">
                    <Compass className="mr-3 h-4 w-4 text-orange-500" />
                    <span>Panduan Fitur</span>
                  </div>
                </button>
              </div>

              {/* Aksi keluar di bagian bawah menu mobile */}
              <div className="border-t border-stone-100 pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4 text-stone-400" aria-hidden="true" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          )}

          {/* Area Konten Halaman */}
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
            {children}
          </main>

          {/* Floating AI Assistant (Hanya untuk Owner) */}
          {!isCashier && <AIFloatingChat />}
        </div>
      </div>

      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          className: 'font-sans text-sm',
        }}
      />
    </div>
  );
}
