'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatRupiah } from '@/lib/format';
import {
  Package,
  Plus,
  Search,
  Store,
  Edit2,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  X,
} from 'lucide-react';
import { MetricStrip } from '@/components/ui/metric-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

interface Product {
  id: string;
  org_id: string;
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

interface UserProfile {
  role: 'OWNER' | 'CASHIER';
  branch_id: string | null;
}

export default function ProductsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  // Modal delete state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Load user profile & branches
  useEffect(() => {
    async function init() {
      try {
        const [meRes, branchRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/branches'),
        ]);

        const meJson = await meRes.json();
        const branchJson = await branchRes.json();

        if (meJson?.data) {
          setUserProfile(meJson.data);
        }

        if (branchJson?.data) {
          const activeBranches: Branch[] = branchJson.data.filter((b: Branch) => b.is_active);
          setBranches(activeBranches);

          // If cashier, lock to their assigned branch; otherwise pick first branch
          if (meJson?.data?.role === 'CASHIER' && meJson?.data?.branch_id) {
            setSelectedBranchId(meJson.data.branch_id);
          } else if (activeBranches.length > 0) {
            setSelectedBranchId(activeBranches[0].id);
          }
        }
      } catch {
        setErrorMsg('Gagal memuat konfigurasi cabang.');
      }
    }
    init();
  }, []);

  const loadProducts = useCallback(async () => {
    if (!selectedBranchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/products?branch_id=${selectedBranchId}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal memuat katalog produk.');
      }
      setProducts(json.data || []);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId) {
      loadProducts();
    }
  }, [selectedBranchId, loadProducts]);

  // Extract unique categories for filter tabs
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalProducts = products.length;
    let lowStockCount = 0;
    let lossWarningCount = 0;
    let totalMarginPct = 0;
    let validMarginCount = 0;

    products.forEach((p) => {
      if (p.stock <= p.min_stock_alert) lowStockCount += 1;
      if (p.selling_price < p.cost_price && p.cost_price > 0) lossWarningCount += 1;
      if (p.selling_price > 0) {
        const margin = ((p.selling_price - p.cost_price) / p.selling_price) * 100;
        totalMarginPct += margin;
        validMarginCount += 1;
      }
    });

    const avgMargin = validMarginCount > 0 ? Math.round(totalMarginPct / validMarginCount) : 0;

    return { totalProducts, avgMargin, lowStockCount, lossWarningCount };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  function openCreateModal() {
    setEditingProduct(null);
    setSku('');
    setName('');
    setCategory('Minuman');
    setCostPrice('0');
    setSellingPrice('0');
    setMinStockAlert('10');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  }

  function openEditModal(prod: Product) {
    setEditingProduct(prod);
    setSku(prod.sku);
    setName(prod.name);
    setCategory(prod.category);
    setCostPrice(prod.cost_price.toString());
    setSellingPrice(prod.selling_price.toString());
    setMinStockAlert(prod.min_stock_alert.toString());
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const costNum = parseInt(costPrice.replace(/\D/g, ''), 10) || 0;
    const sellNum = parseInt(sellingPrice.replace(/\D/g, ''), 10) || 0;
    const minStockNum = parseInt(minStockAlert.replace(/\D/g, ''), 10) || 0;

    try {
      if (editingProduct) {
        // PATCH
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku,
            name,
            category,
            cost_price: costNum,
            selling_price: sellNum,
            min_stock_alert: minStockNum,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || 'Gagal mengubah produk.');
        }
        setSuccessMsg(`Produk "${name}" berhasil diperbarui.`);
      } else {
        // POST
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branch_id: selectedBranchId,
            sku,
            name,
            category,
            cost_price: costNum,
            selling_price: sellNum,
            min_stock_alert: minStockNum,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || 'Gagal menambahkan produk.');
        }
        setSuccessMsg(`Produk "${name}" berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSoftDelete() {
    if (!deletingProduct) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Gagal menonaktifkan produk.');
      }
      setSuccessMsg(`Produk "${deletingProduct.name}" berhasil dinonaktifkan.`);
      setDeletingProduct(null);
      loadProducts();
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isOwner = userProfile?.role === 'OWNER';
  const numericCost = parseInt(costPrice.replace(/\D/g, ''), 10) || 0;
  const numericSell = parseInt(sellingPrice.replace(/\D/g, ''), 10) || 0;
  const isLossWarning = numericSell < numericCost && numericCost > 0;
  const calculatedMargin =
    numericSell > 0 ? Math.round(((numericSell - numericCost) / numericSell) * 100) : 0;

  const currentBranchName =
    branches.find((b) => b.id === selectedBranchId)?.name || 'Cabang Terpilih';

  return (
    <div className="space-y-6">
            {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
               Katalog Produk
            </h1>
            <Badge variant="brand">Multi-Cabang</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola kode produk, modal, harga jual, dan margin tiap cabang.
          </p>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
            disabled={!selectedBranchId}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk Baru
          </Button>
        )}
      </div>

      {/* 4-KPI Metric Strip */}
      <MetricStrip
        title={`Ringkasan Katalog — ${currentBranchName}`}
        action={
          <span className="text-xs text-slate-500 font-medium">
            <span className="font-semibold text-slate-700">{products.length} produk aktif</span>
          </span>
        }
        metrics={[
          {
            label: 'Jumlah Produk',
            value: summaryMetrics.totalProducts,
            subtext: 'Terdaftar di cabang ini',
            badge: <Badge variant="neutral">Katalog</Badge>,
          },
          {
            label: 'Rata-rata Margin Kotor',
            value: `${summaryMetrics.avgMargin}%`,
            subtext: 'Persentase laba kotor terhadap omzet',
            badge: (
              <Badge variant="brand" dot>
                Margin
              </Badge>
            ),
          },
          {
            label: 'Produk Stok Menipis',
            value: summaryMetrics.lowStockCount,
            subtext: 'Mendekati ambang batas minimum',
            badge:
              summaryMetrics.lowStockCount > 0 ? (
                <Badge variant="warning" dot>
                  Perhatian
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Aman
                </Badge>
              ),
          },
          {
            label: 'Produk di Bawah Modal',
            value: summaryMetrics.lossWarningCount,
            subtext:
              summaryMetrics.lossWarningCount > 0
                ? 'Harga jual lebih rendah dari modal barang'
                : 'Semua produk menghasilkan margin positif',
            badge:
              summaryMetrics.lossWarningCount > 0 ? (
                <Badge variant="danger" dot>
                  Rugi
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  Optimal
                </Badge>
              ),
          },
        ]}
      />

      {/* Branch selector & Search bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Branch Selector */}
          <div className="w-full md:w-72 shrink-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Pilih Cabang
            </label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                aria-label="Pilih cabang produk"
                disabled={!isOwner && !!userProfile?.branch_id}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="w-full flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Cari Produk
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama atau kode produk..."
                className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
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
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Kategori ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
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

      {/* Table Content */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card">
          <Loader2 className="w-8 h-8 animate-spin text-sage-600 mx-auto" />
          <p className="text-sm font-medium text-slate-600 mt-2">Memuat katalog produk cabang...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-card">
          <EmptyState
            icon={Package}
            title="Tidak Ada Produk"
            description={
              searchQuery || selectedCategory !== 'ALL'
                ? 'Tidak ada produk yang cocok dengan kriteria pencarian Anda.'
                : 'Belum ada produk di cabang ini. Tambahkan produk atau gunakan akun demo.'
            }
            actionLabel={isOwner ? 'Tambah Produk Sekarang' : undefined}
            onAction={isOwner ? openCreateModal : undefined}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Kode &amp; Nama Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Modal</th>
                  <th className="py-3 px-4 text-right">Harga Jual &amp; Margin</th>
                  <th className="py-3 px-4 text-center">Stok</th>
                  {isOwner && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isStockLow = p.stock <= p.min_stock_alert;
                  const isSellingBelowCost = p.selling_price < p.cost_price;
                  const marginPct =
                    p.selling_price > 0
                      ? Math.round(((p.selling_price - p.cost_price) / p.selling_price) * 100)
                      : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 text-xs block">{p.name}</span>
                        <span className="font-mono text-[11px] text-slate-400 block">{p.sku}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="neutral" className="text-[10px]">
                          {p.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-600 whitespace-nowrap">
                        {formatRupiah(p.cost_price)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">
                          {formatRupiah(p.selling_price)}
                        </div>
                        {isSellingBelowCost ? (
                          <div className="inline-flex items-center text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                            Di bawah modal
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5 inline-block">
                            +{marginPct}% Margin
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isStockLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {p.stock}
                          </span>
                          {isStockLow && (
                            <Badge variant="danger" dot className="text-[10px] py-0 px-1.5">
                              Min {p.min_stock_alert}
                            </Badge>
                          )}
                        </div>
                      </td>
                      {isOwner && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(p)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                              title="Ubah Produk"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingProduct(p)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Nonaktifkan Produk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Create / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingProduct ? 'Ubah Produk' : 'Tambah Produk Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                   Stok awal produk baru adalah 0. Tambahkan stok setelah produk dibuat.
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

            <div className="overflow-y-auto p-6 space-y-4">
              {isLossWarning && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                     Harga jual lebih rendah dari modal. Produk ini berpotensi merugi.
                  </span>
                </div>
              )}

              {numericSell > 0 && !isLossWarning && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Estimasi Margin Laba Kotor:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">
                    +{calculatedMargin}% ({formatRupiah(numericSell - numericCost)})
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                       Kode Produk <span className="text-rose-500">*</span>
                    </label>
                    <input
                      aria-label="Kode produk"
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="Contoh: KP-001"
                       className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Kategori <span className="text-rose-500">*</span>
                    </label>
                    <input
                      aria-label="Kategori produk"
                      type="text"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Contoh: Minuman"
                       className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Nama produk"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Es Kopi Susu Aren"
                     className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                       Modal per Unit (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      aria-label="Modal per unit produk"
                      type="text"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="Contoh: 7000"
                       className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Harga Jual (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      aria-label="Harga jual produk"
                      type="text"
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="Contoh: 18000"
                       className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Batas Peringatan Stok Minimum <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-label="Batas peringatan stok minimum"
                    type="text"
                    required
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    placeholder="Default: 10"
                     className="w-full h-10 px-3 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
                  />
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
                    Simpan Produk
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Soft Delete Product */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center gap-3 text-rose-800">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Nonaktifkan Produk</h3>
                <p className="text-[11px] text-rose-600 font-mono">
                  {deletingProduct.sku} • {deletingProduct.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Produk <strong className="text-slate-900">&quot;{deletingProduct.name}&quot;</strong> akan dinonaktifkan dan tidak dapat dipilih untuk transaksi baru. Riwayat transaksi tetap tersimpan.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => setDeletingProduct(null)}
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
                  Ya, Nonaktifkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
