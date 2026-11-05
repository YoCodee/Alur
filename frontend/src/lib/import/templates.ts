/**
 * Migration templates: column specs for the three importable datasets.
 * Column aliases cover common Indonesian headers found in owner spreadsheets.
 */

import { EXPENSE_CATEGORIES } from '@/lib/validators/expenses';

export type MigrationDataType = 'PRODUCTS' | 'SALES' | 'EXPENSES';

/** One row of the in-app "columns & accepted values" guide. */
export interface FieldGuideEntry {
  /** Canonical field name (== template column). */
  field: string;
  /** What to put in the cell, in plain Indonesian. */
  hint: string;
  /** Exact allowed values when the field is a fixed list. */
  allowed?: readonly string[];
  required: boolean;
}

export interface TemplateSpec {
  type: MigrationDataType;
  /** Primary headers written into the downloadable template. */
  columns: string[];
  /** Canonical field each column maps to. */
  fields: string[];
  sampleRows: string[][];
  needsBranch: boolean;
  /** Per-column guide so the user knows what values are accepted. */
  fieldGuide: FieldGuideEntry[];
}

export const MIGRATION_TEMPLATES: Record<MigrationDataType, TemplateSpec> = {
  PRODUCTS: {
    type: 'PRODUCTS',
    columns: ['sku', 'name', 'category', 'cost_price', 'selling_price', 'stock', 'min_stock_alert'],
    fields: ['sku', 'name', 'category', 'cost_price', 'selling_price', 'stock', 'min_stock_alert'],
    sampleRows: [
      ['KP-001', 'Es Kopi Susu Aren', 'Minuman', '7000', '18000', '24', '10'],
      ['MN-002', 'Red Velvet Latte', 'Minuman', '9000', '22000', '15', '10'],
      ['SN-001', 'Butter Croissant', 'Makanan', '5000', '15000', '8', '5'],
    ],
    needsBranch: true,
    fieldGuide: [
      { field: 'sku', hint: 'Teks unik di cabang, mis. KP-001', required: true },
      { field: 'name', hint: 'Nama produk, mis. Es Kopi Susu Aren', required: true },
      { field: 'category', hint: 'Teks bebas, mis. Minuman / Makanan / Non-Kopi', required: true },
      { field: 'cost_price', hint: 'Harga modal rupiah, angka ≥ 0 (boleh "Rp 12.500")', required: true },
      { field: 'selling_price', hint: 'Harga jual rupiah, angka ≥ 1', required: true },
      { field: 'stock', hint: 'Stok awal, angka ≥ 0 — hanya diterapkan untuk produk baru', required: false },
      { field: 'min_stock_alert', hint: 'Batas stok minimum, angka ≥ 0', required: false },
    ],
  },
  SALES: {
    type: 'SALES',
    columns: ['transaction_date', 'payment_method', 'sku', 'quantity', 'unit_price'],
    fields: ['transaction_date', 'payment_method', 'sku', 'quantity', 'unit_price'],
    sampleRows: [
      ['2026-10-20', 'CASH', 'KP-001', '2', '18000'],
      ['2026-10-20', 'CASH', 'SN-001', '1', '15000'],
      ['2026-10-21', 'QRIS', 'MN-002', '3', '22000'],
    ],
    needsBranch: true,
    fieldGuide: [
      { field: 'transaction_date', hint: 'Tanggal transaksi: 2026-10-20 atau 20/10/2026', required: true },
      { field: 'payment_method', hint: 'Metode bayar — tulis persis salah satu:', allowed: ['CASH', 'QRIS'], required: true },
      { field: 'sku', hint: 'Kode produk yang sudah ada di katalog cabang', required: true },
      { field: 'quantity', hint: 'Jumlah terjual, angka ≥ 1', required: true },
      { field: 'unit_price', hint: 'Harga satuan rupiah, angka ≥ 0 — kosongkan untuk harga katalog', required: false },
    ],
  },
  EXPENSES: {
    type: 'EXPENSES',
    columns: ['expense_date', 'category', 'description', 'amount'],
    fields: ['expense_date', 'category', 'description', 'amount'],
    sampleRows: [
      ['2026-10-20', 'Utilitas', 'Listrik warung bulan Oktober', '350000'],
      ['2026-10-21', 'Lainnya', 'Belanja susu & sirup', '780000'],
    ],
    needsBranch: true,
    fieldGuide: [
      { field: 'expense_date', hint: 'Tanggal pengeluaran: 2026-10-20 atau 20/10/2026', required: true },
      { field: 'category', hint: 'Kategori biaya — tulis persis salah satu:', allowed: EXPENSE_CATEGORIES, required: true },
      { field: 'description', hint: 'Keterangan biaya, mis. Listrik warung bulan Oktober', required: true },
      { field: 'amount', hint: 'Nominal rupiah, angka ≥ 1 (boleh "Rp 12.500")', required: true },
    ],
  },
};

/** Maps localized/aliased spreadsheet headers onto canonical fields. */
const HEADER_ALIASES: Record<string, string[]> = {
  sku: ['sku', 'kode', 'kode produk', 'kodeproduk', 'kode sku'],
  name: ['name', 'nama', 'nama produk', 'namaproduk', 'item'],
  category: ['category', 'kategori', 'jenis'],
  cost_price: ['cost_price', 'harga modal', 'hargamodal', 'hpp', 'modal', 'harga beli'],
  selling_price: ['selling_price', 'harga jual', 'hargajual', 'harga', 'harga satuan'],
  stock: ['stock', 'stok', 'stok awal', 'stokawal', 'jumlah stok', 'sisa stok'],
  min_stock_alert: ['min_stock_alert', 'stok minimum', 'stokminimum', 'batas minimum', 'alert minimum'],
  transaction_date: ['transaction_date', 'tanggal', 'tanggal transaksi', 'tanggaltransaksi', 'tgl'],
  payment_method: ['payment_method', 'metode pembayaran', 'metodepembayaran', 'pembayaran', 'bayar'],
  quantity: ['quantity', 'jumlah', 'qty', 'banyak', 'terjual'],
  unit_price: ['unit_price', 'harga satuan', 'hargasatuan', 'harga'],
  expense_date: ['expense_date', 'tanggal', 'tanggal pengeluaran', 'tanggalpengeluaran', 'tgl'],
  description: ['description', 'deskripsi', 'keterangan', 'catatan', 'uraian'],
  amount: ['amount', 'jumlah (rp)', 'jumlah rp', 'nominal', 'total', 'biaya', 'pengeluaran'],
};

/**
 * Normalizes a raw spreadsheet header into a canonical field name.
 * Returns null for unrecognized columns (they are dropped).
 */
export function mapHeader(rawHeader: string): string | null {
  const normalized = rawHeader.toLowerCase().replace(/[^a-z0-9( )]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}
