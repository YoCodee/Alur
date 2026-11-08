'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RoleGuard } from '@/components/role-guard';
import { formatRupiah } from '@/lib/format';
import { formatUnitCount } from '@/lib/stock/recommendation-explainer';
import { formatDateId } from '@/lib/date';
import {
  Boxes,
  ArrowLeftRight,
  History,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  Store,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Sparkles,
  PackageCheck,
  Check,
  ArrowRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { StockTransferRecommendation } from '@/lib/stock/transfer-recommender';
import {
  RestockRecommendationItem,
  RestockRecommendationPanel,
} from '@/components/stock/restock-recommendation-panel';
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

interface Product {
  id: string;
  branch_id: string;
  sku: string;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock: number;
  min_stock_alert: number;
  is_active: boolean;
}

interface StockMovement {
  id: string;
  branch_id: string;
  product_id: string;
  movement_type: string;
  quantity_change: number;
  stock_after: number;
  unit_cost?: number | null;
  note?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
  products?: {
    sku: string;
    name: string;
    category: string;
  } | null;
}

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<
    'inventory' | 'transfer' | 'recommendation' | 'history'
  >('inventory');

  // Master Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inventory Tab Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Restock Modal State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockCost, setRestockCost] = useState<number | ''>('');
  const [restockNote, setRestockNote] = useState('');
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // Adjust Modal State
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Transfer Tab State
  const [fromBranchId, setFromBranchId] = useState<string>('');
  const [toBranchId, setToBranchId] = useState<string>('');
  const [fromProductId, setFromProductId] = useState<string>('');
  const [toProductId, setToProductId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<number | ''>('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Smart Recommendations State
  const [recommendations, setRecommendations] = useState<StockTransferRecommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [executingRecId, setExecutingRecId] = useState<string | null>(null);

  // Movements History State
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyBranchId, setHistoryBranchId] = useState<string>('ALL');
  const [historyType, setHistoryType] = useState<string>('ALL');
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Stock Recommendation State
  const [recommendationRefreshKey, setRecommendationRefreshKey] = useState(0);

  // Fetch Branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches');
      const json = await res.json();
      if (res.ok) {
        const activeBranches = (json.data || []).filter((b: Branch) => b.is_active);
        setBranches(activeBranches);
        setBranchesLoaded(true);
        if (activeBranches.length > 0) {
          if (!fromBranchId) setFromBranchId(activeBranches[0].id);
          if (activeBranches.length > 1 && !toBranchId) setToBranchId(activeBranches[1].id);
        }
      }
    } catch {
      // Fallback
    }
  }, [fromBranchId, toBranchId]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/products');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memuat produk');
      setProducts(json.data || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Movements
  const fetchMovements = useCallback(async () => {
    try {
      setMovementsLoading(true);
      const params = new URLSearchParams();
      if (historyBranchId !== 'ALL') params.set('branch_id', historyBranchId);
      if (historyType !== 'ALL') params.set('movement_type', historyType);
      params.set('limit', '50');

      const res = await fetch(`/api/stock/movements?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setMovements(json.data || []);
      }
    } catch {
      // Fallback
    } finally {
      setMovementsLoading(false);
    }
  }, [historyBranchId, historyType]);

  // Fetch Smart Stock Transfer Recommendations
  const fetchRecommendations = useCallback(async () => {
    try {
      setRecsLoading(true);
      const res = await fetch('/api/stock/recommendations');
      const json = await res.json();
      if (res.ok && json.data) {
        setRecommendations(json.data.recommendations || []);
      }
    } catch {
      // Fallback
    } finally {
      setRecsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchProducts();
  }, [fetchBranches, fetchProducts]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchMovements();
    } else if (activeTab === 'transfer') {
      fetchRecommendations();
    }
  }, [activeTab, fetchMovements, fetchRecommendations]);

  // Branch map
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  // Filtered Products for Inventory Tab
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchBranch = selectedBranchId === 'ALL' || p.branch_id === selectedBranchId;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchBranch && matchQuery;
    });
  }, [products, selectedBranchId, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalItems = filteredProducts.length;
    let outOfStock = 0;
    let lowStock = 0;
    let totalAssetValue = 0;

    filteredProducts.forEach((p) => {
      if (p.stock <= 0) outOfStock += 1;
      else if (p.stock <= p.min_stock_alert) lowStock += 1;
      totalAssetValue += (p.stock > 0 ? p.stock : 0) * (p.cost_price || 0);
    });

    return { totalItems, outOfStock, lowStock, totalAssetValue };
  }, [filteredProducts]);

  // Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    if (typeof restockQty !== 'number' || restockQty <= 0) {
      alert('Jumlah restock harus lebih dari 0.');
      return;
    }

    try {
      setRestockSubmitting(true);
      const res = await fetch('/api/stock/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: restockProduct.id,
          quantity: restockQty,
          unit_cost: typeof restockCost === 'number' && restockCost >= 0 ? restockCost : undefined,
          note: restockNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal melakukan restock');

      alert(`Barang masuk berhasil dicatat. Stok ${restockProduct.name} bertambah ${restockQty} unit.`);
      setRestockProduct(null);
      setRestockQty('');
      setRestockCost('');
      setRestockNote('');
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat restock');
    } finally {
      setRestockSubmitting(false);
    }
  };

  // Adjust Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    if (typeof adjustNewStock !== 'number' || adjustNewStock < 0) {
      alert('Stok fisik baru harus berupa bilangan bulat >= 0.');
      return;
    }
    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      alert('Alasan penyesuaian opname wajib diisi minimal 3 karakter.');
      return;
    }

    try {
      setAdjustSubmitting(true);
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: adjustProduct.id,
          new_stock: adjustNewStock,
          reason: adjustReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal menyesuaikan stok');

      alert(`Stok ${adjustProduct.name} berhasil disesuaikan menjadi ${adjustNewStock} unit.`);
      setAdjustProduct(null);
      setAdjustNewStock('');
      setAdjustReason('');
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat penyesuaian stok');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Products available in fromBranch
  const fromBranchProducts = useMemo(() => {
    return products.filter((p) => p.branch_id === fromBranchId);
  }, [products, fromBranchId]);

  // Selected fromProduct
  const selectedFromProduct = useMemo(() => {
    return products.find((p) => p.id === fromProductId);
  }, [products, fromProductId]);

  // Corresponding products in toBranch with same SKU
  const toBranchEligibleProducts = useMemo(() => {
    if (!selectedFromProduct) return [];
    return products.filter(
      (p) => p.branch_id === toBranchId && p.sku === selectedFromProduct.sku
    );
  }, [products, toBranchId, selectedFromProduct]);

  // Selected toProduct
  const selectedToProduct = useMemo(() => {
    return products.find((p) => p.id === toProductId);
  }, [products, toProductId]);

  // Auto-select toProductId if only one match
  useEffect(() => {
    if (toBranchEligibleProducts.length === 1) {
      setToProductId(toBranchEligibleProducts[0].id);
    } else if (toBranchEligibleProducts.length === 0) {
      setToProductId('');
    }
  }, [toBranchEligibleProducts]);

  // Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromProductId || !toProductId) {
      alert('Pilih produk asal dan produk tujuan yang sesuai.');
      return;
    }
    if (fromProductId === toProductId) {
      alert('Produk asal dan tujuan tidak boleh sama.');
      return;
    }
    if (typeof transferQty !== 'number' || transferQty <= 0) {
      alert('Jumlah transfer harus lebih dari 0.');
      return;
    }
    if (selectedFromProduct && transferQty > selectedFromProduct.stock) {
      alert(`Stok cabang asal tidak mencukupi (Tersedia: ${selectedFromProduct.stock}).`);
      return;
    }

    try {
      setTransferSubmitting(true);
      const res = await fetch('/api/stock/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_product_id: fromProductId,
          to_product_id: toProductId,
          quantity: transferQty,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal melakukan transfer stok');

      alert(`Transfer stok berhasil! ${transferQty} unit dipindahkan.`);
      setTransferQty('');
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat transfer');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Catat Restock dari rekomendasi stok (PRD FR-4.3): buka modal restock
  // yang sudah terisi qty usulan dari hasil analisis tren penjualan.
  const handleRequestRestock = (item: RestockRecommendationItem) => {
    setRestockProduct({
      id: item.product_id,
      branch_id: item.branch_id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      stock: item.current_stock,
      min_stock_alert: item.min_stock_alert,
      is_active: true,
    });
    setRestockQty(item.suggested_qty);
    setRestockCost(item.cost_price);
    setRestockNote(`Rekomendasi stok ${item.branch_name} (${item.sku})`);
  };

  // 1-Click Execute Stock Transfer from Recommendation
  const handleExecuteRecommendation = async (rec: StockTransferRecommendation) => {
    try {
      setExecutingRecId(rec.id || 'executing');
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
      if (!res.ok) throw new Error(json.error?.message || 'Gagal mengeksekusi mutasi stok');

      alert(
        `Sukses! ${rec.transfer_qty} unit ${rec.product_name} berhasil dimutasi dari ${rec.from_branch_name} ke ${rec.to_branch_name}.`
      );
      fetchProducts();
      fetchRecommendations();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengeksekusi transfer');
    } finally {
      setExecutingRecId(null);
    }
  };

  // Prefill Manual Form with Recommendation Details
  const handlePrefillTransfer = (rec: StockTransferRecommendation) => {
    setFromBranchId(rec.from_branch_id);
    setToBranchId(rec.to_branch_id);
    setFromProductId(rec.from_product_id);
    setToProductId(rec.to_product_id);
    setTransferQty(rec.transfer_qty);
  };

  // Movement badge formatter
  const renderMovementBadge = (type: string, change: number) => {
    let variant: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' = 'neutral';
    let label = type;

    switch (type) {
      case 'SALE':
        variant = 'brand';
        label = 'Penjualan';
        break;
      case 'VOID_RETURN':
        variant = 'warning';
        label = 'Stok kembali dari pembatalan';
        break;
      case 'RESTOCK':
        variant = 'success';
        label = 'Barang Masuk';
        break;
      case 'ADJUSTMENT':
        variant = 'warning';
        label = 'Penyesuaian Stok';
        break;
      case 'TRANSFER_OUT':
        variant = 'brand';
        label = 'Pemindahan Keluar';
        break;
      case 'TRANSFER_IN':
        variant = 'brand';
        label = 'Pemindahan Masuk';
        break;
      case 'IMPORT':
        variant = 'neutral';
        label = 'Impor Data';
        break;
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant={variant} className="text-[10px] py-0.5">
          {label}
        </Badge>
        <span
          className={`font-mono font-bold text-xs ${
            change > 0 ? 'text-emerald-600' : change < 0 ? 'text-rose-600' : 'text-slate-500'
          }`}
        >
          {change > 0 ? `+${change}` : change}
        </span>
      </div>
    );
  };

  // Owner tanpa cabang: arahkan ke manajemen cabang dulu
  if (branchesLoaded && branches.length === 0) {
    return (
      <RoleGuard allowedRoles={['OWNER']}>
        <div className="space-y-6 pb-12">
          <BranchRequiredNotice />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['OWNER']}>
      <div className="space-y-6">
                {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Stok &amp; Pemindahan Antarcabang
              </h1>
              <Badge variant="brand">Khusus Owner</Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Catat barang masuk, sesuaikan stok, dan pindahkan barang antarcabang.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchProducts();
                if (activeTab === 'transfer') fetchRecommendations();
                if (activeTab === 'history') fetchMovements();
                if (activeTab === 'recommendation') {
                  setRecommendationRefreshKey((key) => key + 1);
                }
              }}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </Button>
          </div>
        </div>

        {/* Navigation Tabs (Segmented Control) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Inventaris
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'transfer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Pemindahan Antarcabang
            {recommendations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-brand-500 text-white">
                {recommendations.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommendation')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'recommendation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Rekomendasi Stok
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Riwayat Perubahan Stok
          </button>
        </div>

        {/* Error Banner */}
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

        {/* TAB 1: INVENTORY & QUICK ACTIONS */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* 4-KPI Metric Strip */}
            <MetricStrip
              title="Ringkasan Persediaan Barang"
              action={
                <span className="text-xs text-slate-500 font-medium">
                  Filter Cabang:{' '}
                  <span className="font-semibold text-slate-700">
                    {selectedBranchId === 'ALL'
                      ? 'Semua Cabang'
                      : branchMap.get(selectedBranchId) || selectedBranchId}
                  </span>
                </span>
              }
              metrics={[
                {
                  label: 'Jumlah Produk',
                  value: summaryMetrics.totalItems,
                  subtext: 'Produk aktif dalam katalog',
                  badge: <Badge variant="neutral">Katalog</Badge>,
                },
                {
                  label: 'Stok Menipis (Alert)',
                  value: summaryMetrics.lowStock,
                  subtext: 'Mendekati ambang batas minimum',
                  badge:
                    summaryMetrics.lowStock > 0 ? (
                      <Badge variant="warning" dot>
                        Peringatan
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Aman
                      </Badge>
                    ),
                },
                {
                  label: 'Stok Kosong / Habis',
                  value: summaryMetrics.outOfStock,
                  subtext: 'Perlu segera restock suplai',
                  badge:
                    summaryMetrics.outOfStock > 0 ? (
                      <Badge variant="danger" dot>
                        Kritis
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Tersedia
                      </Badge>
                    ),
                },
                {
                  label: 'Nilai Aset Persediaan',
                  value: formatRupiah(summaryMetrics.totalAssetValue),
                  subtext: 'Modal barang × jumlah stok',
                  badge: <Badge variant="brand">Aset Modal</Badge>,
                },
              ]}
            />

            {/* Filter Bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Store className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  aria-label="Pilih cabang"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors cursor-pointer"
                >
                  <option value="ALL">Semua Cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari kode produk, nama, atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Memuat stok persediaan produk...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Boxes}
                    title="Tidak ada produk ditemukan"
                    description="Tidak ada item stok yang cocok dengan kriteria cabang atau kata kunci pencarian."
                    actionLabel="Reset Pencarian"
                    onAction={() => {
                      setSelectedBranchId('ALL');
                      setSearchQuery('');
                    }}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Kode / Nama Produk</th>
                        <th className="py-3 px-4">Cabang</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4 text-right">Modal</th>
                        <th className="py-3 px-4 text-center">Jumlah Stok</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const isOutOfStock = p.stock <= 0;
                        const isLow = p.stock > 0 && p.stock <= p.min_stock_alert;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-[11px] font-bold text-slate-500 block">
                                {p.sku}
                              </span>
                              <span className="font-semibold text-slate-900 text-xs">
                                {p.name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                              {branchMap.get(p.branch_id) || 'Cabang'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                              <Badge variant="neutral" className="text-[10px]">
                                {p.category}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                              {formatRupiah(p.cost_price)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                              {p.stock}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {isOutOfStock ? (
                                <Badge variant="danger" dot className="text-[10px]">
                                  Habis
                                </Badge>
                              ) : isLow ? (
                                <Badge variant="warning" dot className="text-[10px]">
                                  Menipis (&le; {p.min_stock_alert})
                                </Badge>
                              ) : (
                                <Badge variant="success" dot className="text-[10px]">
                                  Aman
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setRestockProduct(p);
                                    setRestockQty('');
                                    setRestockCost(p.cost_price);
                                    setRestockNote('');
                                  }}
                                  className="h-7 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 flex items-center gap-1"
                                  title="Catat barang masuk"
                                >
                                  <Plus className="w-3 h-3 text-emerald-600" /> Barang Masuk
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setAdjustProduct(p);
                                    setAdjustNewStock(p.stock);
                                    setAdjustReason('');
                                  }}
                                  className="h-7 text-[11px] text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1"
                                  title="Penyesuaian stok opname fisik"
                                >
                                  <RefreshCw className="w-3 h-3 text-slate-500" /> Sesuaikan
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INTER-BRANCH STOCK TRANSFER */}
        {activeTab === 'transfer' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Smart Balancing Recommendations Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        Rekomendasi Mutasi Antarcabang Otomatis
                      </h2>
                      {recommendations.length > 0 && (
                        <Badge variant="brand" className="text-[10px]">
                          {recommendations.length} Saran Aktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kami mencari cabang yang kelebihan atau kekurangan stok untuk menyarankan pemindahan barang.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchRecommendations}
                  disabled={recsLoading}
                  className="h-8 text-xs text-brand-700 bg-white hover:bg-brand-50 border-brand-200 flex items-center gap-1.5 w-fit"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} />
                  Refresh Analisis
                </Button>
              </div>

              {recsLoading ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-sage-600" />
                  <span className="text-xs font-medium">Menganalisis pergerakan stok seluruh cabang...</span>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="bg-white/90 border border-slate-200/80 rounded-xl p-4 flex items-center gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Persediaan Seluruh Cabang Seimbang &amp; Optimal.</span>
                    <p className="text-slate-500 mt-0.5">
                      Tidak ditemukan cabang kritis yang defisit stok sementara cabang lain memiliki surplus berlebih.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-brand-300 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant={rec.urgency === 'CRITICAL' ? 'danger' : 'warning'}
                            dot
                            className="text-[10px]"
                          >
                            {rec.urgency === 'CRITICAL' ? 'Kritis / Habis' : 'Disarankan'}
                          </Badge>
                          <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Perkiraan manfaat: +{formatRupiah(rec.net_benefit)}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{rec.product_name}</h3>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">Kode produk: {rec.sku}</p>
                        </div>

                        {/* Route Transfer (stock levels shown inline; reason stays below) */}
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div className="text-left min-w-0">
                            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                              Asal (Surplus)
                            </span>
                            <span className="font-bold text-slate-800 block truncate">
                              {rec.from_branch_name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Stok: <span className="font-mono font-bold text-slate-700">{formatUnitCount(rec.from_current_stock)}</span>
                              {' → '}
                              {formatUnitCount(rec.from_stock_after)}
                            </span>
                          </div>
                          <div className="flex flex-col items-center px-2">
                            <span className="text-[10px] font-medium text-brand-700 bg-brand-100 px-2 py-0.5 rounded-md">
                              {rec.transfer_qty} unit
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 my-0.5" />
                          </div>
                          <div className="text-right min-w-0">
                            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                              Tujuan (Defisit)
                            </span>
                            <span className="font-bold text-slate-800 block truncate">
                              {rec.to_branch_name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Stok: <span className="font-mono font-bold text-slate-700">{formatUnitCount(rec.to_current_stock)}</span>
                              {' → '}
                              {formatUnitCount(rec.to_stock_after)}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/60 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePrefillTransfer(rec)}
                          className="h-8 text-xs text-slate-600"
                        >
                          Isi Form Manual
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleExecuteRecommendation(rec)}
                          disabled={executingRecId === rec.id}
                          className="h-8 text-xs flex items-center gap-1.5"
                        >
                          {executingRecId === rec.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Memutasi...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Pindahkan Stok
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Transfer Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Form Transfer Manual Antarcabang</h2>
                <p className="text-xs text-slate-500">
                  Pindahkan produk dengan kode yang sama dari satu cabang ke cabang lain.
                </p>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-5">
                {/* Branch Source & Target Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Source Branch */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <ArrowUpRight className="w-4 h-4 text-rose-500" /> Cabang Asal (Pengirim)
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Pilih Cabang Asal
                      </label>
                      <select
                        aria-label="Pilih cabang asal"
                        value={fromBranchId}
                        onChange={(e) => {
                          setFromBranchId(e.target.value);
                          setFromProductId('');
                          setToProductId('');
                        }}
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Pilih Produk yang Ditransfer
                      </label>
                      <select
                        aria-label="Pilih produk yang ditransfer"
                        value={fromProductId}
                        onChange={(e) => {
                          setFromProductId(e.target.value);
                          setToProductId('');
                        }}
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                      >
                        <option value="">-- Pilih Produk --</option>
                        {fromBranchProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Stok: {p.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedFromProduct && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                        <span className="text-slate-500">Stok Tersedia Cabang Asal:</span>
                        <span className="text-sm font-mono font-bold text-slate-900">
                          {selectedFromProduct.stock} unit
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Target Branch */}
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> Cabang Tujuan (Penerima)
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Pilih Cabang Tujuan
                      </label>
                      <select
                        aria-label="Pilih cabang tujuan"
                        value={toBranchId}
                        onChange={(e) => {
                          setToBranchId(e.target.value);
                          setToProductId('');
                        }}
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                      >
                        {branches
                          .filter((b) => b.id !== fromBranchId)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Produk Tujuan
                      </label>
                      <select
                        aria-label="Pilih produk target"
                        disabled={!selectedFromProduct || toBranchEligibleProducts.length === 0}
                        value={toProductId}
                        onChange={(e) => setToProductId(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 disabled:bg-slate-100 transition-colors"
                      >
                        {toBranchEligibleProducts.length === 0 ? (
                          <option value="">
                            {selectedFromProduct
                              ? 'Produk ini belum tersedia di cabang tujuan'
                              : '-- Pilih produk asal dahulu --'}
                          </option>
                        ) : (
                          toBranchEligibleProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — Stok Sekarang: {p.stock}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {selectedToProduct && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                        <span className="text-slate-500">Stok Saat Ini Cabang Tujuan:</span>
                        <span className="text-sm font-mono font-bold text-slate-900">
                          {selectedToProduct.stock} unit
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transfer Quantity & Calculation */}
                <div className="p-4 bg-brand-50/40 border border-brand-200/80 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Jumlah Unit yang Ditransfer <span className="text-rose-500">*</span>
                    </label>
                    <input
                      aria-label="Jumlah unit transfer"
                      type="number"
                      min="1"
                      max={selectedFromProduct ? selectedFromProduct.stock : undefined}
                      value={transferQty}
                      onChange={(e) =>
                        setTransferQty(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                      }
                      placeholder="Contoh: 10"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                    />
                  </div>

                  {selectedFromProduct && selectedToProduct && typeof transferQty === 'number' && transferQty > 0 && (
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-brand-200/60">
                      <div>
                        <span className="text-slate-500">Sisa Stok Cabang Asal:</span>
                        <p className="font-mono font-bold text-rose-600 mt-0.5">
                          {selectedFromProduct.stock - transferQty} unit
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Stok Akhir Cabang Tujuan:</span>
                        <p className="font-mono font-bold text-emerald-600 mt-0.5">
                          {selectedToProduct.stock + transferQty} unit
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={
                      transferSubmitting ||
                      !fromProductId ||
                      !toProductId ||
                      typeof transferQty !== 'number' ||
                      transferQty <= 0
                    }
                    className="flex items-center gap-2"
                  >
                    {transferSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memproses Transfer...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="w-4 h-4" />
                        Eksekusi Transfer Stok
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: REKOMENDASI STOK BERBASIS TREN PENJUALAN */}
        {activeTab === 'recommendation' && (
          <RestockRecommendationPanel
            branches={branches}
            refreshKey={recommendationRefreshKey}
            onRequestRestock={handleRequestRestock}
          />
        )}

        {/* TAB 4: MOVEMENTS AUDIT LOG */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-brand-600 shrink-0" />
                <select
                  aria-label="Pilih cabang riwayat mutasi"
                  value={historyBranchId}
                  onChange={(e) => setHistoryBranchId(e.target.value)}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors cursor-pointer"
                >
                  <option value="ALL">Semua Cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Pilih jenis mutasi stok"
                  value={historyType}
                  onChange={(e) => setHistoryType(e.target.value)}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors cursor-pointer"
                >
                  <option value="ALL">Semua Jenis Mutasi</option>
                  <option value="SALE">Penjualan</option>
                  <option value="VOID_RETURN">Stok kembali dari pembatalan</option>
                  <option value="RESTOCK">Barang masuk</option>
                  <option value="ADJUSTMENT">Penyesuaian stok</option>
                  <option value="TRANSFER_OUT">Transfer Keluar</option>
                  <option value="TRANSFER_IN">Transfer Masuk</option>
                  <option value="IMPORT">Impor data</option>
                </select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMovements}
                className="h-8 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${movementsLoading ? 'animate-spin' : ''}`} /> Segarkan
              </Button>
            </div>

            {/* Movements Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
              {movementsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
                  <p className="text-sm font-medium text-slate-600">Memuat log pergerakan stok...</p>
                </div>
              ) : movements.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={History}
                    title="Belum ada riwayat pergerakan stok"
                    description="Perubahan stok dari penjualan, barang masuk, penyesuaian, dan pemindahan antarcabang tercatat di sini."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Waktu (WIB)</th>
                        <th className="py-3 px-4">Cabang</th>
                        <th className="py-3 px-4">Produk</th>
                        <th className="py-3 px-4">Jenis &amp; Perubahan</th>
                        <th className="py-3 px-4 text-center">Stok Akhir</th>
                        <th className="py-3 px-4">Catatan / Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movements.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {formatDateId(m.created_at)}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                            {branchMap.get(m.branch_id) || 'Cabang'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 block">
                              {m.products?.name || 'Produk'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              {m.products?.sku}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderMovementBadge(m.movement_type, m.quantity_change)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                            {m.stock_after}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={m.note || '-'}>
                            {m.note || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESTOCK MODAL */}
        {restockProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-emerald-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Catat Barang Masuk</h3>
                    <p className="text-[11px] text-emerald-700 font-mono">
                      {restockProduct.name} ({restockProduct.sku})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Stok Saat Ini:</span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {restockProduct.stock} unit
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jumlah Barang Masuk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Jumlah barang masuk"
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) =>
                      setRestockQty(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    placeholder="Contoh: 50"
                    className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                  />
                  {typeof restockQty === 'number' && restockQty > 0 && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                      Stok akhir setelah restock: <strong>{restockProduct.stock + restockQty} unit</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Harga Beli Modal per Unit (Opsional)
                  </label>
                  <input
                    aria-label="Harga modal per unit"
                    type="number"
                    min="0"
                    value={restockCost}
                    onChange={(e) =>
                      setRestockCost(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Catatan Supplier / No. Faktur (Opsional)
                  </label>
                  <input
                    aria-label="Catatan supplier faktur"
                    type="text"
                    value={restockNote}
                    onChange={(e) => setRestockNote(e.target.value)}
                    placeholder="Contoh: Faktur #INV-9821 Distributor Kopi"
                    className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={restockSubmitting}
                    onClick={() => setRestockProduct(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={restockSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border-transparent shadow-xs"
                  >
                    {restockSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Barang Masuk'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADJUST OPNAME MODAL */}
        {adjustProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-amber-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Penyesuaian Stok</h3>
                    <p className="text-[11px] text-amber-700 font-mono">
                      {adjustProduct.name} ({adjustProduct.sku})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustProduct(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Stok Saat Ini:</span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {adjustProduct.stock} unit
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jumlah Stok Hasil Hitung <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Stok fisik hasil hitung"
                    type="number"
                    min="0"
                    required
                    value={adjustNewStock}
                    onChange={(e) =>
                      setAdjustNewStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    placeholder="0"
                    className="w-full h-10 px-3.5 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors"
                  />
                  {typeof adjustNewStock === 'number' && (
                    <p
                      className={`text-[11px] font-semibold mt-1 ${
                        adjustNewStock - adjustProduct.stock === 0
                          ? 'text-slate-500'
                          : adjustNewStock - adjustProduct.stock > 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      Selisih:{' '}
                      {adjustNewStock - adjustProduct.stock > 0
                        ? `+${adjustNewStock - adjustProduct.stock}`
                        : adjustNewStock - adjustProduct.stock}{' '}
                      unit
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Alasan Penyesuaian <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    aria-label="Alasan selisih opname"
                    required
                    rows={3}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Contoh: Barang rusak saat display, selisih salah hitung kasir..."
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={adjustSubmitting}
                    onClick={() => setAdjustProduct(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    disabled={adjustSubmitting}
                    className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 border-transparent shadow-xs"
                  >
                    {adjustSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Penyesuaian'
                    )}
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
