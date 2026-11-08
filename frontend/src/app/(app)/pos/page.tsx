'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { formatRupiah } from '@/lib/format';
import { formatDateId } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BranchRequiredNotice } from '@/components/branch-required-notice';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Store,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  RotateCcw,
  Package,
  X,
} from 'lucide-react';

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

interface CartItem {
  product: Product;
  quantity: number;
}

interface CompletedTransaction {
  id: string;
  business_date: string;
  transaction_date: string;
  payment_method: string;
  total_revenue: number;
  cash_tendered?: number | null;
  change_due?: number | null;
  transaction_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
}

export default function PosPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [branchesLoaded, setBranchesLoaded] = useState<boolean>(false);
  const [productLoading, setProductLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Category
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS_SIM'>('CASH');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [qrisCountdown, setQrisCountdown] = useState<number>(3);
  const [qrisTimerActive, setQrisTimerActive] = useState<boolean>(false);

  // Completed Receipt Dialog
  const [completedTx, setCompletedTx] = useState<CompletedTransaction | null>(null);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch('/api/branches');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memuat cabang');
      const activeBranches = (json.data || []).filter((b: Branch) => b.is_active);
      setBranches(activeBranches);
      setBranchesLoaded(true);
      if (activeBranches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(activeBranches[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data cabang');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Ambil role user agar guard "tambah cabang dulu" hanya untuk owner
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (res.ok && json?.data?.role) setUserRole(json.data.role);
      } catch {
        // Abaikan: guard tetap aman tanpa role
      }
    }
    fetchProfile();
  }, []);

  // Fetch products when selected branch changes
  const fetchProducts = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      setProductLoading(true);
      const res = await fetch(`/api/products?branch_id=${selectedBranchId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memuat produk');
      setProducts(json.data || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat produk');
    } finally {
      setProductLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchProducts();
    // Clear cart if branch changes
    setCart([]);
  }, [fetchProducts]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Stok ${product.name} tidak mencukupi (tersedia: ${product.stock})`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) {
              alert(`Stok ${item.product.name} tidak mencukupi (tersedia: ${item.product.stock})`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Kosongkan keranjang kasir?')) {
      setCart([]);
    }
  };

  // Cart totals
  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.product.selling_price, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Payment suggestions
  const quickCashOptions = useMemo(() => {
    if (totalAmount <= 0) return [];
    const options = [totalAmount];
    const rounded50k = Math.ceil(totalAmount / 50000) * 50000;
    const rounded100k = Math.ceil(totalAmount / 100000) * 100000;
    if (rounded50k > totalAmount && !options.includes(rounded50k)) options.push(rounded50k);
    if (rounded100k > totalAmount && !options.includes(rounded100k)) options.push(rounded100k);
    if (!options.includes(50000) && 50000 > totalAmount) options.push(50000);
    if (!options.includes(100000) && 100000 > totalAmount) options.push(100000);
    return options.sort((a, b) => a - b);
  }, [totalAmount]);

  const changeDue = useMemo(() => {
    if (typeof cashTendered !== 'number') return 0;
    return Math.max(0, cashTendered - totalAmount);
  }, [cashTendered, totalAmount]);

  const isCashInsufficient = useMemo(() => {
    if (paymentMethod !== 'CASH') return false;
    if (typeof cashTendered !== 'number') return true;
    return cashTendered < totalAmount;
  }, [paymentMethod, cashTendered, totalAmount]);

  // Handle open payment modal
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setCashTendered(totalAmount);
    setPaymentMethod('CASH');
    setIsPaymentModalOpen(true);
  };

  // Process Checkout
  const handleProcessCheckout = useCallback(
    async (simulatedQRIS = false) => {
      if (cart.length === 0 || !selectedBranchId) return;

      if (paymentMethod === 'CASH' && !simulatedQRIS && isCashInsufficient) {
        alert('Uang tunai yang diterima kurang dari total belanja.');
        return;
      }

      try {
        setSubmitting(true);
        setErrorMsg(null);

        const clientTxId = crypto.randomUUID();
        const payload = {
          branch_id: selectedBranchId,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          payment_method: paymentMethod,
          client_tx_id: clientTxId,
          cash_tendered: paymentMethod === 'CASH' ? Number(cashTendered) : totalAmount,
        };

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error?.message || 'Gagal memproses transaksi penjualan.');
        }

        // Success
        setIsPaymentModalOpen(false);
        setCompletedTx(json.data);
        setCart([]);
        // Refresh products to reflect new stock
        fetchProducts();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses transaksi';
        setErrorMsg(msg);
        alert(msg);
      } finally {
        setSubmitting(false);
        setQrisTimerActive(false);
      }
    },
    [
      cart,
      selectedBranchId,
      paymentMethod,
      isCashInsufficient,
      cashTendered,
      totalAmount,
      fetchProducts,
    ]
  );

  // Simulated QRIS countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (qrisTimerActive && qrisCountdown > 0) {
      timer = setTimeout(() => {
        setQrisCountdown((prev) => prev - 1);
      }, 1000);
    } else if (qrisTimerActive && qrisCountdown === 0) {
      handleProcessCheckout(true);
    }
    return () => clearTimeout(timer);
  }, [qrisTimerActive, qrisCountdown, handleProcessCheckout]);

  const activeBranchName = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId)?.name || 'Cabang';
  }, [branches, selectedBranchId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-sage-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Memuat terminal kasir POS...</p>
      </div>
    );
  }

  // Owner tanpa cabang: arahkan ke manajemen cabang dulu
  if (branchesLoaded && branches.length === 0 && userRole === 'OWNER') {
    return (
      <div className="space-y-6 pb-12">
        <BranchRequiredNotice />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)] max-w-[1440px] mx-auto pb-12">
      {/* ======================================================== */}
      {/* LEFT SECTION: PRODUCT CATALOG & FILTER TOOLBAR */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Error Notification Banner */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-600 font-bold ml-2 hover:text-rose-800 p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Control Bar: Branch Selector + Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Cabang Kasir:</span>
            {branches.length > 1 ? (
              <select
                aria-label="Pilih cabang aktif"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-bold"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {activeBranchName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
              Kasir Siap Transaksi
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari produk (nama / SKU)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs Switcher (Pola redesign/dashboard/refrence1 (1).png) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'ALL' ? 'Semua Kategori' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Catalog Grid (pola refrence1 (1).png) */}
        <div className="flex-1">
          {productLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sage-600 mb-2" />
              <p className="text-xs">Memuat katalog menu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Tidak Ada Produk Ditemukan"
              description={
                searchQuery
                  ? `Tidak ada hasil menu yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Belum ada produk di cabang ini. Tambahkan menu baru di halaman Produk.'
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= p.min_stock_alert;

                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`relative p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between h-44 group cursor-pointer ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-brand-50 border-brand-400 shadow-xs ring-1 ring-brand-400'
                        : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>

                        {isOutOfStock ? (
                          <Badge variant="danger" dot>
                            Habis
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="warning" dot>
                            Sisa {p.stock}
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500">
                            Stok {p.stock}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors">
                        {p.name}
                      </h3>

                      <p className="text-[10px] text-slate-400 font-mono">
                        {p.sku}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono">
                        {formatRupiah(p.selling_price)}
                      </span>

                      {inCart ? (
                        <span className="min-w-[28px] h-7 px-1.5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                          {inCart.quantity}
                        </span>
                      ) : !isOutOfStock ? (
                        <span className="h-7 w-7 rounded-full bg-slate-100 group-hover:bg-brand-500 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SECTION: CART PANEL (Touch-Friendly POS Side Rail) */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden h-[calc(100vh-140px)] sticky top-6">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Pesanan Kasir</h2>
            {cart.length > 0 && (
              <Badge variant="enterprise" className="text-[11px]">
                {totalItemsCount} item
              </Badge>
            )}
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors cursor-pointer px-2 py-1 rounded hover:bg-rose-50"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-300 mb-3">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-700 text-sm">Keranjang Masih Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Ketuk produk dari katalog di sebelah kiri.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col gap-2.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {formatRupiah(item.product.selling_price)} / unit
                    </p>
                  </div>

                  {/* Remove Button (Touch Target >= 44px) */}
                  <button
                    type="button"
                    aria-label={`Hapus ${item.product.name}`}
                    onClick={() => removeFromCart(item.product.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  {/* Stepper with Touch Target >= 44px */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg">
                    <button
                      type="button"
                      aria-label="Kurangi jumlah"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="min-w-[44px] min-h-[44px] rounded-l-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900 font-mono select-none">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah jumlah"
                      disabled={item.quantity >= item.product.stock}
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="min-w-[44px] min-h-[44px] rounded-r-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    {formatRupiah(item.quantity * item.product.selling_price)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Trigger */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal Penjualan</span>
              <span className="font-semibold text-slate-800 font-mono">{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Pajak / Diskon</span>
              <span className="font-semibold text-slate-800 font-mono">Rp 0</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-xs sm:text-sm font-bold text-slate-900">Total Tagihan</span>
              <span className="text-xl sm:text-2xl font-extrabold text-brand-600 font-mono">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            size="touch"
            disabled={cart.length === 0}
            onClick={handleOpenPayment}
            className="w-full bg-brand-500 hover:bg-brand-600 font-bold text-sm shadow-md shadow-brand-500/20 gap-2 select-none"
          >
            <CreditCard className="w-4 h-4" />
            <span>Bayar Sekarang ({formatRupiah(totalAmount)})</span>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAYMENT MODAL (Light SaaS Enterprise Styling) */}
      {/* ======================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pembayaran Kasir</h3>
                <p className="text-xs text-slate-500">
                  {totalItemsCount} item • Cabang {activeBranchName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setQrisTimerActive(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Total Banner */}
              <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 text-center">
                <span className="text-[11px] uppercase font-bold text-sage-700 tracking-wider">
                  Total yang Harus Dibayar
                </span>
                <p className="text-3xl font-extrabold text-brand-600 mt-1 font-mono">
                  {formatRupiah(totalAmount)}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CASH');
                      setQrisTimerActive(false);
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all min-h-[44px] cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-sage-600" />
                    <span className="text-xs font-bold">Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('QRIS_SIM');
                      setQrisCountdown(3);
                      setQrisTimerActive(true);
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all min-h-[44px] cursor-pointer ${
                      paymentMethod === 'QRIS_SIM'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-sage-600" />
                    <span className="text-xs font-bold">QRIS Simulasi</span>
                  </button>
                </div>
              </div>

              {/* CASH PAYMENT SECTION */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Uang Diterima dari Pelanggan
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={cashTendered}
                        onChange={(e) =>
                          setCashTendered(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                        }
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500 font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Options */}
                  <div className="flex flex-wrap gap-2">
                    {quickCashOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCashTendered(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer min-h-[36px] flex items-center ${
                          cashTendered === opt
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {opt === totalAmount ? 'Uang Pas' : formatRupiah(opt)}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculation */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Kembalian Kas:</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        isCashInsufficient ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {isCashInsufficient
                        ? `Kurang ${formatRupiah(totalAmount - (Number(cashTendered) || 0))}`
                        : formatRupiah(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS SIMULASI SECTION */}
              {paymentMethod === 'QRIS_SIM' && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-44 h-44 mx-auto bg-slate-900 text-white rounded-xl p-4 flex flex-col items-center justify-center relative shadow-inner">
                    <QrCode className="w-28 h-28 text-white" />
                    <span className="text-[10px] font-mono tracking-widest text-slate-300 mt-1">
                      ALUR-QRIS-SIM
                    </span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    {qrisCountdown > 0 ? (
                      <span>
                        Simulasi pembayaran QRIS otomatis terkonfirmasi dalam{' '}
                        <strong>{qrisCountdown} detik</strong>...
                      </span>
                    ) : (
                      <span>Memverifikasi transaksi melalui gateway...</span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="touch"
                    disabled={submitting}
                    onClick={() => handleProcessCheckout(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi Pembayaran QRIS Sekarang</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="md"
                disabled={submitting}
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setQrisTimerActive(false);
                }}
              >
                Batal
              </Button>

              {paymentMethod === 'CASH' && (
                <Button
                  variant="primary"
                  size="touch"
                  disabled={submitting || isCashInsufficient}
                  onClick={() => handleProcessCheckout(false)}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold gap-2 px-6"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selesaikan Transaksi</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPLETED RECEIPT DIALOG (Thermal Struk Display) */}
      {/* ======================================================== */}
      {completedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header Success */}
            <div className="bg-emerald-600 text-white p-5 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold">Transaksi Berhasil!</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Struk Kasir Sah Alur</p>
            </div>

            {/* Thermal Receipt Content */}
            <div className="p-6 font-mono text-xs text-slate-800 space-y-4 bg-slate-50/50">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h4 className="font-bold text-sm tracking-wider">ALUR POS</h4>
                <p className="text-[11px] text-slate-500">{activeBranchName}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  ID: {completedTx.id.slice(0, 8)} •{' '}
                  {formatDateId(completedTx.transaction_date || completedTx.business_date)}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
                {completedTx.transaction_items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-900">{it.product_name}</div>
                      <div className="text-[10px] text-slate-500">
                        {it.quantity} x {formatRupiah(it.unit_price)}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>TOTAL</span>
                  <span>{formatRupiah(completedTx.total_revenue)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Metode Bayar</span>
                  <span className="font-semibold">
                    {completedTx.payment_method === 'CASH' ? 'TUNAI' : 'QRIS SIMULASI'}
                  </span>
                </div>
                {completedTx.payment_method === 'CASH' && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Uang Diterima</span>
                      <span>{formatRupiah(completedTx.cash_tendered || completedTx.total_revenue)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Kembalian</span>
                      <span>{formatRupiah(completedTx.change_due || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
              <Button
                variant="secondary"
                size="touch"
                onClick={() => window.print()}
                className="flex-1 gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </Button>

              <Button
                variant="primary"
                size="touch"
                onClick={() => setCompletedTx(null)}
                className="flex-1 bg-brand-500 hover:bg-brand-600 gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Transaksi Baru</span>
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
