'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from 'recharts';
import { RoleGuard } from '@/components/role-guard';
import { formatRupiah, formatPercent } from '@/lib/format';
import { formatDateId } from '@/lib/date';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard, type StatTone } from '@/components/ui/stat-card';
import { Dialog } from '@/components/ui/dialog';
import {
  CheckCircle2,
  ArrowRightLeft,
  Sparkles,
  ShieldAlert,
  Loader2,
  RefreshCw,
  PackageCheck,
  Check,
  Building2,
  ArrowRight,
  Calendar,
  BarChart3,
  Lock,
  Volume2,
  TrendingUp,
  Wallet,
  Target,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useMorningBriefing } from '@/hooks/use-morning-briefing';
import { MorningBriefingPlayer } from '@/components/dashboard/morning-briefing-player';

interface AnomalyItem {
  id: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  branch_id: string;
  branch_name?: string;
  entity_id?: string;
  entity_type: string;
  metric_value: number;
  baseline_value: number;
  z_score?: number | null;
  suggested_action: string;
  detected_at: string;
  is_resolved: boolean;
}

interface TransferRecommendationItem {
  id: string;
  from_branch_id: string;
  from_branch_name: string;
  from_product_id: string;
  to_branch_id: string;
  to_branch_name: string;
  to_product_id: string;
  sku: string;
  product_name: string;
  transfer_qty: number;
  from_current_stock: number;
  from_stock_after: number;
  to_current_stock: number;
  to_stock_after: number;
  to_days_of_supply_before: number;
  to_days_of_supply_after: number;
  potential_saved_revenue: number;
  estimated_gross_profit: number;
  net_benefit: number;
  urgency: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
}

/** Bentuk minimal respons /api/reports/pnl yang dipakai dashboard. */
interface DashboardPnl {
  metrics: {
    total_revenue: number;
    total_cogs: number;
    gross_margin_pct: number;
    net_profit: number;
    total_transactions: number;
  };
  cashflow: { cash_in: number; cash_out: number; net_cashflow: number };
  branch_performance: Array<{
    branch_id: string;
    revenue: number;
    tx_count: number;
    target_achievement_pct: number;
  }>;
  daily_timeline: Array<{ date: string; revenue: number; net_profit: number }>;
}

interface BranchRow {
  id: string;
  name: string;
  location: string;
  daily_target: number;
  is_active: boolean;
}

interface BranchDashboard {
  id: string;
  name: string;
  city: string;
  /** Omzet kemarin (PnL period=yesterday). */
  revenue: number;
  dailyTarget: number;
  /** Pencapaian omzet kemarin terhadap target harian, persen. */
  progress: number;
  txCount: number;
  stockStatus: string;
}

type SummaryCard = {
  label: string;
  value: string;
  hint: string;
  trend?: { text: string; className: string };
  icon: LucideIcon;
  tone: StatTone;
};

const severityMeta = {
  CRITICAL: { label: 'Mendesak', badge: 'danger' as const, dot: 'bg-rose-500' },
  HIGH: { label: 'Penting', badge: 'warning' as const, dot: 'bg-amber-500' },
  MEDIUM: { label: 'Perlu dicek', badge: 'neutral' as const, dot: 'bg-stone-400' },
  LOW: { label: 'Catatan', badge: 'neutral' as const, dot: 'bg-stone-300' },
};

function cleanAnomalyDescription(description: string): string {
  // Skor statistik tetap ada di data, tetapi tidak perlu memenuhi ringkasan untuk pengguna.
  return description.replace(/\s*\(z:\s*[-+]?\d+(?:\.\d+)?\)/gi, '').trim();
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-soft">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-stone-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <span className="font-medium tabular-nums text-stone-900">
              {formatRupiah(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'anomalies'>('overview');
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [anomalySummary, setAnomalySummary] = useState<{
    total_open: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
  }>({ total_open: 0, critical_count: 0, high_count: 0, medium_count: 0 });

  const [recommendations, setRecommendations] = useState<TransferRecommendationItem[]>([]);
  const [recommendationSummary, setRecommendationSummary] = useState<{
    total_recommendations: number;
    total_units_to_transfer: number;
    total_potential_net_benefit: number;
    critical_count: number;
  }>({ total_recommendations: 0, total_units_to_transfer: 0, total_potential_net_benefit: 0, critical_count: 0 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Resolution Modal State
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // Executing Transfer State
  const [executingId, setExecutingId] = useState<string | null>(null);

  // AI Voice Morning Briefing State
  const [showBriefingPlayer, setShowBriefingPlayer] = useState(false);
  const morningBriefing = useMorningBriefing();

  // Migration onboarding: org with an empty catalog is likely pre-migration.
  const [isEmptyOrg, setIsEmptyOrg] = useState(false);
  const [greeting, setGreeting] = useState('Selamat pagi');

  // Data keuangan & cabang dari database (bukan lagi angka contoh).
  const [pnlWeek, setPnlWeek] = useState<DashboardPnl | null>(null);
  const [pnlYesterday, setPnlYesterday] = useState<DashboardPnl | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [totalBranchCount, setTotalBranchCount] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam'
    );
  }, []);

  // Fetch Dashboard Intelligence
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      // Empty-catalog signal for the migration banner
      const prodRes = await fetch('/api/products');
      const prodJson = await prodRes.json();
      setIsEmptyOrg(prodRes.ok && Array.isArray(prodJson.data) && prodJson.data.length === 0);


      // Fetch anomali, rekomendasi, laporan keuangan & cabang secara paralel
      // agar tidak ada jeda di mana satu kartu sudah terisi dan kartu lain
      // masih kosong. PnL "yesterday" untuk capaian target harian per cabang,
      // "this_week" untuk tren 7 hari, margin, dan arus kas.
      const [anomRes, recRes, pnlWeekRes, pnlYesterdayRes, branchRes] = await Promise.all([
        fetch('/api/anomalies?status=OPEN'),
        fetch('/api/stock/recommendations'),
        fetch('/api/reports/pnl?period=this_week'),
        fetch('/api/reports/pnl?period=yesterday'),
        fetch('/api/branches?all=true'),
      ]);
      const [anomJson, recJson, pnlWeekJson, pnlYesterdayJson, branchJson] = await Promise.all([
        anomRes.json(),
        recRes.json(),
        pnlWeekRes.json(),
        pnlYesterdayRes.json(),
        branchRes.json(),
      ]);

      if (pnlWeekRes.ok && pnlWeekJson.data) {
        setPnlWeek(pnlWeekJson.data);
      }
      if (pnlYesterdayRes.ok && pnlYesterdayJson.data) {
        setPnlYesterday(pnlYesterdayJson.data);
      }
      if (branchRes.ok && Array.isArray(branchJson.data)) {
        const rows: BranchRow[] = branchJson.data;
        setBranches(rows);
        setTotalBranchCount(rows.length);
      }

      if (anomRes.ok && anomJson.data) {
        setAnomalies(anomJson.data.anomalies || []);
        if (anomJson.data.summary) {
          setAnomalySummary(anomJson.data.summary);
        }
      }

      if (recRes.ok && recJson.data) {
        setRecommendations(recJson.data.recommendations || []);
        if (recJson.data.summary) {
          setRecommendationSummary(recJson.data.summary);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Resolve Anomaly
  const handleResolveAnomaly = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedAnomaly) return;

    try {
      setResolving(true);
      const res = await fetch(`/api/anomalies/${selectedAnomaly.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolution_note: resolutionNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Gagal menyelesaikan anomali');
      }

      toast.success('Catatan tersimpan', {
        description: `"${selectedAnomaly.title}" sudah ditandai selesai.`,
      });
      setSelectedAnomaly(null);
      setResolutionNote('');
      fetchDashboardData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setResolving(false);
    }
  };

  // Handle 1-Click Execute Stock Transfer
  const handleExecuteTransfer = async (rec: TransferRecommendationItem) => {
    try {
      setExecutingId(rec.id);
      const res = await fetch(`/api/stock/recommendations/${rec.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_product_id: rec.from_product_id,
          to_product_id: rec.to_product_id,
          quantity: rec.transfer_qty,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Gagal mengeksekusi mutasi stok');
      }

      toast.success('Stok berhasil dipindahkan', {
        description: `${rec.transfer_qty} unit ${rec.product_name} dari ${rec.from_branch_name} ke ${rec.to_branch_name}.`,
      });
      fetchDashboardData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan saat mutasi');
    } finally {
      setExecutingId(null);
    }
  };

  // Nilai turunan dari database: tren 7 hari & performa cabang kemarin.
  const activeBranches = branches.filter((b) => b.is_active);
  const dailyTargetTotal = activeBranches.reduce(
    (sum, b) => sum + Number(b.daily_target || 0),
    0
  );
  const sevenDaysTrend = (pnlWeek?.daily_timeline ?? []).map((day) => ({
    date: formatDateId(day.date, 'd MMM'),
    omzet: day.revenue,
    target: dailyTargetTotal,
  }));
  const branchList: BranchDashboard[] = activeBranches.map((b) => {
    const perf = pnlYesterday?.branch_performance.find((p) => p.branch_id === b.id);
    const needsTransfer = recommendations.some((r) => r.to_branch_id === b.id);
    return {
      id: b.id,
      name: b.name,
      city: b.location,
      revenue: perf?.revenue ?? 0,
      dailyTarget: Number(b.daily_target || 0),
      progress: perf?.target_achievement_pct ?? 0,
      txCount: perf?.tx_count ?? 0,
      stockStatus: needsTransfer ? 'Perlu mutasi stok' : 'Stok aman',
    };
  });
  const yesterdayMetrics = pnlYesterday?.metrics ?? null;
  const targetDeltaPct =
    yesterdayMetrics && dailyTargetTotal > 0
      ? ((yesterdayMetrics.total_revenue - dailyTargetTotal) / dailyTargetTotal) * 100
      : null;
  const cashflow = pnlWeek?.cashflow;

  const summaryCards: SummaryCard[] = [
    {
      label: 'Laba kemarin',
      value: loading ? '—' : formatRupiah(yesterdayMetrics?.net_profit ?? 0),
      hint: yesterdayMetrics
        ? `Omzet ${formatRupiah(yesterdayMetrics.total_revenue)} · modal ${formatRupiah(yesterdayMetrics.total_cogs)}`
        : 'Belum ada penjualan tercatat',
      trend:
        targetDeltaPct !== null
          ? {
              text: `${targetDeltaPct >= 0 ? '+' : ''}${formatPercent(targetDeltaPct)} dari target harian`,
              className: targetDeltaPct >= 0 ? 'text-emerald-600' : 'text-rose-600',
            }
          : undefined,
      icon: TrendingUp,
      tone:
        (yesterdayMetrics?.net_profit ?? 0) >= 0
          ? 'success'
          : 'warning',
    },
    {
      label: 'Arus kas 7 hari',
      value: loading ? '—' : formatRupiah(cashflow?.net_cashflow ?? 0),
      hint: cashflow
        ? `Masuk ${formatRupiah(cashflow.cash_in)} · keluar ${formatRupiah(cashflow.cash_out)}`
        : 'Belum ada data transaksi',
      trend: { text: 'Dari penjualan & pengeluaran tercatat', className: 'text-stone-500' },
      icon: Wallet,
      tone: (cashflow?.net_cashflow ?? 0) >= 0 ? 'neutral' : 'warning',
    },
    {
      label: 'Perlu diperhatikan',
      value: loading ? '—' : `${anomalySummary.total_open} pengeluaran`,
      hint: loading
        ? 'Memeriksa transaksi seluruh gerai...'
        : `${anomalySummary.critical_count} transaksi mendesak untuk dicek`,
      trend: loading
        ? undefined
        : anomalySummary.total_open > 0
        ? { text: 'Tinjau sebelum tutup buku', className: 'text-amber-700' }
        : { text: 'Semua transaksi wajar', className: 'text-emerald-600' },
      icon: ShieldAlert,
      tone: anomalySummary.total_open > 0 ? 'warning' : 'success',
    },
    {
      label: 'Saran mutasi stok',
      value: loading ? '—' : `${recommendations.length} rekomendasi`,
      hint: loading
        ? 'Menghitung saran antarcabang...'
        : `Potensi hemat ${formatRupiah(recommendationSummary.total_potential_net_benefit)}`,
      trend: loading
        ? undefined
        : { text: 'Mencegah kehabisan stok', className: 'text-sage-700' },
      icon: ArrowRightLeft,
      tone: 'info',
    },
  ];

  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="mx-auto max-w-[1400px] space-y-7 pb-16">
        {/* ======================================================== */}
        {/* HEADER */}
        {/* ======================================================== */}
        <header
          id="tour-dashboard-greeting"
          className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"
        >
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-stone-500">
              <Calendar className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
              {formatDateId(new Date(), 'EEEE, d MMMM yyyy')}
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-stone-900 sm:text-[28px]">
              {greeting}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-stone-600">
              {loading
                ? 'Merangkum data gerai Anda…'
                : `Ini ringkasan ${branchList.length} gerai Anda: apa yang terjadi kemarin, apa yang perlu diperhatikan, dan apa yang bisa dilakukan sekarang.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:shrink-0">
            <Button
              id="tour-briefing-button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const nextState = !showBriefingPlayer;
                setShowBriefingPlayer(nextState);
                if (nextState && morningBriefing.status === 'idle') {
                  morningBriefing.play();
                }
              }}
              className={
                showBriefingPlayer
                  ? 'border-sage-200 bg-sage-50 text-sage-800 hover:bg-sage-100'
                  : 'border-stone-200 text-stone-700'
              }
            >
              <Volume2 className="h-3.5 w-3.5 text-sage-600" aria-hidden="true" />
              <span>
                {morningBriefing.status === 'speaking'
                  ? 'Sedang membacakan...'
                  : 'Dengarkan briefing'}
              </span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="border-stone-200 text-stone-700"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`}
                aria-hidden="true"
              />
              <span>{refreshing && !loading ? 'Menyegarkan...' : 'Segarkan'}</span>
            </Button>
          </div>
        </header>

        {/* AI Voice Morning Briefing Player Panel */}
        {showBriefingPlayer && (
          <MorningBriefingPlayer
            briefing={morningBriefing}
            onClose={() => {
              morningBriefing.stop();
              setShowBriefingPlayer(false);
            }}
          />
        )}

        {/* Migration onboarding banner (only when the org has no products yet) */}
        {isEmptyOrg && (
          <Link
            href="/import"
            className="block rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 hover:border-brand-300 transition-colors"
          >
            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Punya bisnis yang sudah berjalan?
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Migrasikan katalog produk + stok awal, riwayat penjualan, dan pengeluaran Anda sekali
              unggah — lalu lanjutkan operasional di BizPulse.
            </p>
          </Link>
        )}

                {/* ======================================================== */}
        {/* 3. SEGMENTED TABS SWITCHER (refrence1 (4).png) */}

        {/* ======================================================== */}
        {/* TABS */}
        {/* ======================================================== */}
        <div id="tour-dashboard-tabs">
          <Tabs
            variant="underline"
            className="w-full"
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as 'overview' | 'branches' | 'anomalies')}
            items={[
              { id: 'overview', label: '3 pertanyaan pagi', icon: Sparkles },
              { id: 'branches', label: 'Performa cabang', icon: Building2, count: branchList.length },
              { id: 'anomalies', label: 'Perlu dicek', icon: ShieldAlert, count: anomalySummary.total_open },
            ]}
          />
        </div>

        {/* ======================================================== */}
        {/* RINGKASAN ANGKA */}
        {/* ======================================================== */}
        <div id="tour-metric-strip" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              hint={card.hint}
              icon={card.icon}
              tone={card.tone}
              trend={
                card.trend ? (
                  <span className={card.trend.className}>{card.trend.text}</span>
                ) : undefined
              }
            />
          ))}
        </div>

        {/* ======================================================== */}
        {/* KONTEN UTAMA */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {activeTab !== 'branches' && (
              <>
                {/* APA YANG PERLU DIPERHATIKAN */}
                <Card id="tour-anomaly-card" className="overflow-hidden">
                  <SectionHeader
                    icon={ShieldAlert}
                    tone="warning"
                    title="Apa yang perlu diperhatikan?"
                    description="Pengeluaran dan transaksi yang tidak biasa, diurutkan dari yang paling mendesak."
                    actions={
                      <Badge variant={anomalySummary.total_open > 0 ? 'warning' : 'success'}>
                        {anomalySummary.total_open > 0
                          ? `${anomalySummary.total_open} perlu dicek`
                          : 'Semua normal'}
                      </Badge>
                    }
                  />

                  <CardContent className="p-0">
                    {loading && anomalies.length === 0 ? (
                      <div className="space-y-3 p-5 sm:p-6">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-16 animate-pulse rounded-lg bg-stone-100" />
                        ))}
                      </div>
                    ) : anomalies.length === 0 ? (
                      <div className="p-5 sm:p-6">
                        <EmptyState
                          icon={CheckCircle2}
                          title="Tidak ada yang mencurigakan"
                          description="Tidak ditemukan lonjakan biaya, selisih kas, atau transaksi yang perlu ditinjau. Usaha Anda dalam kondisi baik."
                        />
                      </div>
                    ) : (
                      <ul className="divide-y divide-stone-100">
                        {anomalies.map((anom) => {
                          const meta = severityMeta[anom.severity] ?? severityMeta.MEDIUM;
                          return (
                            <li key={anom.id} className="px-5 py-4 sm:px-6">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                <div className="flex min-w-0 gap-3">
                                  <span
                                    aria-hidden="true"
                                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-medium leading-snug text-stone-900">
                                        {anom.title}
                                      </p>
                                      <Badge variant={meta.badge}>{meta.label}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                                      {cleanAnomalyDescription(anom.description)}
                                    </p>
                                    <p className="mt-2 text-xs text-stone-400">
                                      {anom.branch_name || 'Seluruh cabang'} ·{' '}
                                      {formatDateId(anom.detected_at, 'd MMM, HH:mm')}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedAnomaly(anom)}
                                  className="shrink-0 justify-self-end"
                                >
                                  Tinjau
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* APA YANG PERLU DILAKUKAN */}
                <Card id="tour-transfer-card" className="overflow-hidden">
                  <SectionHeader
                    icon={ArrowRightLeft}
                    tone="info"
                    title="Apa yang perlu dilakukan?"
                    description="Mutasi stok antarcabang untuk mencegah kehabisan di gerai yang ramai."
                    actions={
                      recommendations.length > 0 ? (
                        <Badge variant="intelligence">
                          {recommendations.length} saran
                        </Badge>
                      ) : undefined
                    }
                  />

                  <CardContent className="space-y-3 p-5 sm:p-6">
                    {loading && recommendations.length === 0 ? (
                      <div className="space-y-3">
                        {[0, 1].map((i) => (
                          <div key={i} className="h-40 animate-pulse rounded-xl bg-stone-100" />
                        ))}
                      </div>
                    ) : recommendations.length === 0 ? (
                      <EmptyState
                        icon={PackageCheck}
                        title="Persediaan dalam kondisi prima"
                        description="Stok seluruh gerai masih dalam batas aman. Belum ada mutasi yang perlu dilakukan hari ini."
                      />
                    ) : (
                      <>
                        {recommendations.slice(0, 2).map((rec) => (
                        <div
                          key={rec.id}
                          className="rounded-xl border border-stone-200/80 bg-white p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-stone-900">
                                {rec.product_name}
                              </p>
                              <p className="mt-0.5 font-mono text-xs text-stone-400">
                                {rec.sku}
                              </p>
                            </div>
                            <Badge
                              variant={rec.urgency === 'CRITICAL' ? 'danger' : 'intelligence'}
                            >
                              {rec.urgency === 'CRITICAL' ? 'Mendesak' : 'Disarankan'}
                            </Badge>
                          </div>

                          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-stone-50/80 px-3 py-3 ring-1 ring-inset ring-stone-200/60">
                            <div className="min-w-0">
                              <p className="text-[11px] text-stone-400">Dari</p>
                              <p className="truncate text-sm font-medium text-stone-800">
                                {rec.from_branch_name}
                              </p>
                              <p className="mt-0.5 text-xs tabular-nums text-stone-500">
                                {rec.from_current_stock} → {rec.from_stock_after} unit
                              </p>
                            </div>

                            <div className="flex flex-col items-center gap-1 text-sage-600">
                              <span className="rounded-full bg-sage-50 px-2 py-0.5 text-xs font-medium tabular-nums">
                                +{rec.transfer_qty}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </div>

                            <div className="min-w-0 text-right">
                              <p className="text-[11px] text-stone-400">Ke</p>
                              <p className="truncate text-sm font-medium text-stone-800">
                                {rec.to_branch_name}
                              </p>
                              <p className="mt-0.5 text-xs tabular-nums text-stone-500">
                                {rec.to_current_stock} →{' '}
                                <span className="font-medium text-emerald-700">
                                  {rec.to_stock_after}
                                </span>{' '}
                                unit
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs leading-relaxed text-stone-500">
                              Potensi hemat{' '}
                              <span className="font-medium text-emerald-700">
                                {formatRupiah(rec.net_benefit)}
                              </span>{' '}
                              · cukup untuk ±{rec.to_days_of_supply_after} hari
                            </p>

                            <Button
                              variant="primary"
                              size="sm"
                              disabled={executingId === rec.id}
                              onClick={() => handleExecuteTransfer(rec)}
                              className="w-full shrink-0 sm:w-auto"
                            >
                              {executingId === rec.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Memproses...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Pindahkan {rec.transfer_qty} unit</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}

                        {recommendations.length > 2 && (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="w-full text-stone-600"
                          >
                            <Link href="/stock">
                              <span>
                                Lihat {recommendations.length - 2} saran lainnya
                              </span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* TREN FINANSIAL */}
                <Card id="tour-trend-chart" className="overflow-hidden">
                  <SectionHeader
                    icon={BarChart3}
                    tone="success"
                    title="Tren finansial 7 hari terakhir"
                    description="Omzet harian dibanding target penjualan."
                    actions={
                      <Button asChild variant="outline" size="sm">
                        <Link href="/reports">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Laporan laba rugi</span>
                        </Link>
                      </Button>
                    }
                  />

                  <CardContent className="p-5 sm:p-6">
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={sevenDaysTrend}
                          margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#EEECE7"
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: '#78716C' }}
                            dy={8}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            width={52}
                            tick={{ fontSize: 11, fill: '#A8A29E' }}
                            tickFormatter={(value: number) =>
                              `${Math.round(Number(value) / 1_000_000)} jt`
                            }
                          />
                          <Tooltip
                            content={<TrendTooltip />}
                            cursor={{ fill: 'rgba(246, 130, 31, 0.06)' }}
                          />
                          <Bar
                            dataKey="omzet"
                            name="Omzet"
                            fill="#F6821F"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={40}
                          />
                          <Line
                            dataKey="target"
                            name="Target"
                            type="monotone"
                            stroke="#668D72"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-orange-500" />
                          Omzet
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-sage-500" />
                          Target
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        Rata-rata margin kotor{' '}
                        <span className="font-medium text-emerald-700">
                          {formatPercent(pnlWeek?.metrics.gross_margin_pct ?? 0)}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* TAB: PERFORMA CABANG */}
            {activeTab === 'branches' && (
              <Card className="overflow-hidden">
                <SectionHeader
                  icon={Building2}
                  title={`Performa ${branchList.length} cabang aktif`}
                  description="Pencapaian target penjualan dan kesehatan operasional tiap gerai."
                  actions={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/branches">Kelola cabang</Link>
                    </Button>
                  }
                />

                <CardContent className="space-y-3 p-5 sm:p-6">
                  {branchList.map((branch) => (
                    <div
                      key={branch.id}
                      className="rounded-xl border border-stone-200/80 p-4 transition-colors hover:border-stone-300 sm:p-5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-stone-900">
                            {branch.name}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-500">{branch.city}</p>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-sm font-semibold tabular-nums text-stone-900">
                            {formatRupiah(branch.revenue)}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-400">
                            {Math.round(branch.progress)}% dari target{' '}
                            {formatRupiah(branch.dailyTarget)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-orange-400 transition-all"
                          style={{ width: `${Math.min(100, Math.round(branch.progress))}%` }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                        <span>{branch.txCount} transaksi kemarin</span>
                        <span>{branch.stockStatus}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ======================================================== */}
          {/* RAIL KANAN */}
          {/* ======================================================== */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-4 lg:self-start">
            <Card id="tour-target-card" className="overflow-hidden">
              <SectionHeader icon={Target} title="Target harian per cabang" />
              <CardContent className="space-y-4 px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-6">
                {branchList.map((branch) => (
                  <div key={branch.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-medium text-stone-700">
                        {branch.name}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-stone-900">
                        {Math.round(branch.progress)}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all"
                        style={{ width: `${Math.min(100, Math.round(branch.progress))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] tabular-nums text-stone-400">
                      <span>{formatRupiah(branch.revenue)}</span>
                      <span>dari {formatRupiah(branch.dailyTarget)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <SectionHeader icon={ArrowRightLeft} title="Ringkasan mutasi" />
              <CardContent className="p-5">
                <dl className="divide-y divide-stone-100 text-sm">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Total unit</dt>
                    <dd className="font-medium tabular-nums text-stone-900">
                      {recommendationSummary.total_units_to_transfer} unit
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Potensi hemat</dt>
                    <dd className="font-medium tabular-nums text-emerald-700">
                      {formatRupiah(recommendationSummary.total_potential_net_benefit)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Mendesak</dt>
                    <dd className="font-medium text-stone-900">
                      {recommendationSummary.critical_count} saran
                    </dd>
                  </div>
                </dl>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full justify-between px-0 text-stone-600 hover:bg-transparent"
                >
                  <Link href="/stock">
                    <span>Buka inventaris</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card id="tour-account-status" className="overflow-hidden">
              <SectionHeader icon={ShieldCheck} title="Status akun & sistem" />
              <CardContent className="p-5">
                <dl className="divide-y divide-stone-100 text-sm">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Cabang aktif</dt>
                    <dd className="font-medium text-stone-900">
                      {branchList.length} dari {totalBranchCount}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Keamanan data</dt>
                    <dd className="flex items-center gap-1.5 font-medium text-stone-900">
                      <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      Terproteksi
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Pencatatan transaksi</dt>
                    <dd className="flex items-center gap-1.5 font-medium text-stone-900">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      Otomatis
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-stone-500">Laporan keuangan</dt>
                    <dd className="font-medium text-stone-900">Standar usaha</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card
              id="tour-quick-guide"
              className="overflow-hidden border-sage-100 bg-sage-50/50 shadow-none"
            >
              <CardContent className="space-y-3 px-5 pb-5 pt-7 sm:pt-7">
                <div className="flex items-center gap-2 text-sage-700">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <p className="text-sm font-medium">Panduan uji coba</p>
                </div>
                <p className="text-sm leading-relaxed text-stone-600">
                  Jalankan skenario kasir, catat pengeluaran, dan pindahkan stok untuk melihat
                  alur kerja Alur dari awal sampai akhir.
                </p>
                <Button asChild variant="secondary" size="sm" className="w-full bg-white">
                  <Link href="/demo-guide">
                    <span>Buka panduan demo</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Link
                  href="/reports"
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-sage-700 hover:text-sage-800"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Lihat contoh laporan
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DIALOG PEMERIKSAAN ANOMALI */}
        {/* ======================================================== */}
        <Dialog
          open={!!selectedAnomaly}
          onClose={() => {
            setSelectedAnomaly(null);
            setResolutionNote('');
          }}
          title="Pemeriksaan pengeluaran"
          description={
            selectedAnomaly?.branch_name
              ? `Cabang ${selectedAnomaly.branch_name}`
              : 'Seluruh cabang'
          }
          maxWidth="md"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={resolving}
                onClick={() => handleResolveAnomaly('DISMISSED')}
              >
                Abaikan
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={resolving}
                onClick={() => handleResolveAnomaly('RESOLVED')}
              >
                {resolving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyelesaikan...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Tandai selesai</span>
                  </>
                )}
              </Button>
            </>
          }
        >
          {selectedAnomaly && (
            <div className="space-y-4">
              <div>
                <p className="text-base font-medium leading-snug text-stone-900">
                  {selectedAnomaly.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {selectedAnomaly.description}
                </p>
              </div>

              {selectedAnomaly.suggested_action && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3.5">
                  <p className="text-xs font-medium text-amber-900">Saran tindakan</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">
                    {selectedAnomaly.suggested_action}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="resolution-note"
                  className="text-sm font-medium text-stone-700"
                >
                  Catatan Anda <span className="font-normal text-stone-400">(opsional)</span>
                </label>
                <textarea
                  id="resolution-note"
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Contoh: sudah dikonfirmasi ke kasir, lonjakan karena ada pesanan katering."
                  className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/15"
                />
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </RoleGuard>
  );
}
