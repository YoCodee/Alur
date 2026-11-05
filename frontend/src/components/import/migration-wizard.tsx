'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  UploadCloud,
  Wallet,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  buildErrorCsv,
  chunkRows,
  parseCsvText,
  parseExcelBuffer,
  type ParsedImportFile,
  type ParsedImportRow,
} from '@/lib/import/csv-parser';
import { MIGRATION_TEMPLATES, type MigrationDataType } from '@/lib/import/templates';

const BATCH_SIZE = 500;

const TYPE_META: Record<MigrationDataType, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  PRODUCTS: { label: 'Katalog + Stok Awal', icon: Package, desc: 'Master produk, harga, dan stok per cabang.' },
  SALES: { label: 'Riwayat Penjualan', icon: ShoppingCart, desc: 'Transaksi historis; stok tidak dipotong (sudah diwakili stok awal).' },
  EXPENSES: { label: 'Pengeluaran', icon: Wallet, desc: 'Catatan biaya historis per kategori.' },
};

interface Branch { id: string; name: string }
interface ProductLite { id: string; sku: string; branch_id: string }

export function MigrationWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dataType, setDataType] = useState<MigrationDataType>('PRODUCTS');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const template = MIGRATION_TEMPLATES[dataType];

  useEffect(() => {
    async function load() {
      try {
        const [branchRes, productRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/products'),
        ]);
        const branchJson = await branchRes.json();
        const productJson = await productRes.json();
        if (branchRes.ok && branchJson.data) setBranches(branchJson.data as Branch[]);
        if (productRes.ok && productJson.data) {
          setProducts(productJson.data as ProductLite[]);
        }
      } catch {
        // Branch select will show empty; retry available via Refresh.
      }
    }
    void load();
  }, []);

  const branchProducts = useMemo(
    () => products.filter((p) => p.branch_id === branchId),
    [products, branchId]
  );
  const skuToId = useMemo(() => {
    const map = new Map<string, string>();
    branchProducts.forEach((p) => map.set(p.sku.toLowerCase(), p.id));
    return map;
  }, [branchProducts]);

  // Sales rows whose SKU is unknown on the selected branch cannot be imported.
  const unknownSkuLines = useMemo(() => {
    if (dataType !== 'SALES' || !parsed) return new Set<number>();
    return new Set(
      parsed.rows
        .filter((row) => row.errors.length === 0 && !skuToId.has((row.data.sku || '').toLowerCase()))
        .map((row) => row.line)
    );
  }, [parsed, dataType, skuToId]);

  const validRows: ParsedImportRow[] = useMemo(
    () =>
      (parsed?.rows ?? []).filter(
        (row) => row.errors.length === 0 && !unknownSkuLines.has(row.line)
      ),
    [parsed, unknownSkuLines]
  );
  const invalidRows: ParsedImportRow[] = useMemo(
    () => (parsed?.rows ?? []).filter((row) => row.errors.length > 0 || unknownSkuLines.has(row.line)),
    [parsed, unknownSkuLines]
  );

  const downloadTemplate = useCallback(() => {
    const csv = [template.columns.join(','), ...template.sampleRows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = `template_migrasi_${dataType.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [template, dataType]);

  async function handleFile(file: File) {
    setErrorMsg(null);
    setResultSummary(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const parsedFile = file.name.toLowerCase().endsWith('.xlsx')
        ? await parseExcelBuffer(await file.arrayBuffer(), dataType)
        : parseCsvText(await file.text(), dataType);
      if (parsedFile.rows.length === 0) {
        throw new Error('File tidak berisi baris data.');
      }
      setParsed(parsedFile);
    } catch (err) {
      setParsed(null);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membaca file.');
    } finally {
      setParsing(false);
    }
  }

  function groupSalesTransactions(rows: ParsedImportRow[]) {
    const groups = new Map<string, { transaction_date: string; payment_method: string; items: Array<{ product_id: string; quantity: number; unit_price?: number }> }>();
    for (const row of rows) {
      const date = row.data.transaction_date;
      const payment = row.data.payment_method || 'CASH';
      const key = `${date}|${payment}`;
      const product_id = skuToId.get((row.data.sku || '').toLowerCase());
      if (!product_id) continue;
      const group = groups.get(key) || { transaction_date: date, payment_method: payment, items: [] };
      const item: { product_id: string; quantity: number; unit_price?: number } = {
        product_id,
        quantity: Number(row.data.quantity),
      };
      if (row.data.unit_price) item.unit_price = Number(row.data.unit_price);
      group.items.push(item);
      groups.set(key, group);
    }
    return Array.from(groups.values());
  }

  async function handleCommit() {
    setErrorMsg(null);
    setCommitting(true);
    setStep(3);
    try {
      let payloadRows: unknown[];
      if (dataType === 'SALES') {
        payloadRows = groupSalesTransactions(validRows);
      } else {
        payloadRows = validRows.map((row) => row.data);
      }
      const chunks = chunkRows(payloadRows, BATCH_SIZE);
      setProgressTotal(chunks.length);
      setProgressDone(0);

      let created = 0;
      let updated = 0;
      for (const chunk of chunks) {
        const res = await fetch(`/api/import/${dataType}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch_id: branchId, file_name: fileName, rows: chunk }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Data gagal disimpan.');
        created += Number(json.data.created ?? json.data.inserted ?? 0);
        updated += Number(json.data.updated ?? 0);
        setProgressDone((done) => done + 1);
      }

      const unit = dataType === 'PRODUCTS' ? 'produk' : 'data';
      setResultSummary(
        `Berhasil: ${created + updated} ${unit} (baru ${created}, diperbarui ${updated}).` +
        (invalidRows.length > 0 ? ` ${invalidRows.length} baris dilewati karena error.` : '')
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengimpor data.');
    } finally {
      setCommitting(false);
    }
  }

  function downloadErrorCsv() {
    const csv = buildErrorCsv(invalidRows);
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = `baris_gagal_${dataType.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function resetAll() {
    setParsed(null);
    setFileName('');
    setResultSummary(null);
    setErrorMsg(null);
    setStep(1);
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-2 flex-wrap">
      {(['Pilih data', 'Periksa file', 'Hasil impor'] as const).map((label, i) => {
          const stepNumber = (i + 1) as 1 | 2 | 3;
          const active = step === stepNumber;
          const passed = step > stepNumber;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  passed
                    ? 'bg-emerald-100 text-emerald-700'
                    : active
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {passed ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                {label}
              </span>
              {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: choose dataset + branch + template */}
      {step === 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(Object.keys(TYPE_META) as MigrationDataType[]).map((key) => {
              const meta = TYPE_META[key];
              const Icon = meta.icon;
              const active = dataType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setDataType(key); setParsed(null); }}
                  className={`text-left rounded-xl border p-3.5 transition-colors ${
                    active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1.5 ${active ? 'text-brand-700' : 'text-slate-400'}`} />
                  <p className="text-xs font-bold text-slate-900">{meta.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{meta.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cabang</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-9 w-full px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="">-- Pilih cabang --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" size="md" onClick={downloadTemplate} className="flex items-center gap-1.5">
              <Download className="w-4 h-4" /> Unduh Template CSV
            </Button>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1.5">Panduan kolom file</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500">
                    <th className="pb-1 pr-3 font-semibold">Kolom</th>
                    <th className="pb-1 pr-3 font-semibold">Contoh isi</th>
                    <th className="pb-1 font-semibold">Wajib</th>
                  </tr>
                </thead>
                <tbody>
                  {template.fieldGuide.map((entry) => (
                    <tr key={entry.field} className="border-t border-slate-200 align-top">
                      <td className="py-1.5 pr-3 font-mono text-slate-800 whitespace-nowrap">{entry.field}</td>
                      <td className="py-1.5 pr-3">
                        <span>{entry.hint}</span>
                        {entry.allowed && (
                          <span className="flex flex-wrap gap-1 mt-1">
                            {entry.allowed.map((value) => (
                              <Badge key={value} variant="outline">
                                {value}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5">
                        {entry.required ? (
                          <Badge variant="brand">Wajib</Badge>
                        ) : (
                          <span className="text-slate-400">Opsional</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 mt-2">
              <li>Nama kolom umum seperti &ldquo;Harga Jual&rdquo; dan &ldquo;Stok&rdquo; akan dikenali otomatis.</li>
              <li>Uang boleh memakai titik ribuan (&ldquo;Rp 12.500&rdquo;). Tanggal: 2026-01-31 atau 31/01/2026.</li>
              {dataType === 'PRODUCTS' && <li><strong>Stok awal</strong> hanya berlaku untuk produk baru; stok produk yang sudah ada tidak diubah (gunakan Opname Stok).</li>}
              {dataType === 'SALES' && <li>Kode produk harus sudah ada di katalog cabang. Penjualan lama tidak mengubah stok.</li>}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" size="md" disabled={!branchId} onClick={() => setStep(2)} className="flex items-center gap-1.5">
              Lanjut Unggah <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: upload + preview */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-card space-y-3">
            <UploadCloud className="w-10 h-10 mx-auto text-brand-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">
                Unggah file {TYPE_META[dataType].label.toLowerCase()}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih file CSV atau Excel (.xlsx). File besar akan diproses bertahap.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
            <Button variant="primary" size="md" disabled={parsing} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {parsing ? 'Membaca file...' : 'Pilih Berkas'}
            </Button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}

          {parsed && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs">
                  <p className="font-bold text-slate-900">{fileName}</p>
                  <p className="text-slate-500 mt-0.5">
                    <span className="font-semibold text-emerald-700">{validRows.length} baris siap impor</span>
                    {invalidRows.length > 0 && (
                    <span className="text-rose-600 font-semibold"> · {invalidRows.length} baris bermasalah</span>
                    )}
                  </p>
                </div>
                {invalidRows.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={downloadErrorCsv} className="h-8 text-[11px] flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Unduh Baris Bermasalah
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Baris</th>
                      <th className="py-2 px-3">Isi</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.rows.slice(0, 50).map((row) => {
                      const rowErrors = [...row.errors, ...(unknownSkuLines.has(row.line) ? ['Kode produk tidak ada di katalog cabang ini'] : [])];
                      return (
                        <tr key={row.line}>
                          <td className="py-1.5 px-3 font-mono text-slate-400">{row.line}</td>
                          <td className="py-1.5 px-3 text-slate-700 truncate max-w-[340px]">
                            {Object.entries(row.data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </td>
                          <td className="py-1.5 px-3">
                            {rowErrors.length === 0 ? (
                              <Badge variant="success" className="text-[10px]">Siap</Badge>
                            ) : (
                              <span className="text-rose-600 text-[10px]">{rowErrors.join('; ')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={resetAll} className="h-8 text-xs">Ulangi dari Awal</Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={validRows.length === 0 || committing}
                  onClick={() => void handleCommit()}
                  className="flex items-center gap-1.5"
                >
                  Impor {validRows.length} Baris <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs">
            Kembali
          </Button>
        </div>
      )}

      {/* Step 3: progress + result */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card space-y-3 text-center">
          {committing ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-sage-600 mx-auto" />
              <p className="text-sm font-bold text-slate-900">Mengimpor data...</p>
              <p className="text-xs text-slate-500">
                Bagian {progressDone} dari {progressTotal}
              </p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progressTotal > 0 ? (progressDone / progressTotal) * 100 : 0}%` }}
                />
              </div>
            </>
          ) : errorMsg ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <X className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-900">Sebagian data gagal diimpor</p>
              <p className="text-xs text-slate-500">{errorMsg}</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button variant="secondary" size="md" onClick={resetAll}>Coba Lagi</Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-900">Migrasi {TYPE_META[dataType].label.toLowerCase()} selesai</p>
              <p className="text-xs text-slate-500">{resultSummary}</p>
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <Button variant="secondary" size="md" onClick={resetAll} className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" /> Migrasi Data Lain
                </Button>
                <Button variant="primary" size="md" onClick={() => (window.location.href = '/pos')}>
                  Mulai Pakai POS
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty guard */}
      {branches.length === 0 && step === 1 && (
        <EmptyState
          icon={Package}
          title="Belum ada cabang"
          description="Buat cabang terlebih dahulu di menu Manajemen Organisasi sebelum melakukan migrasi data."
        />
      )}
    </div>
  );
}
