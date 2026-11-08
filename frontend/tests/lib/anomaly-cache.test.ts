import { describe, it, expect, beforeEach } from 'vitest';
import {
  markLiveAnomalyResolved,
  isLiveAnomalyResolved,
  resolvedLiveAnomalies,
} from '@/lib/anomaly/anomaly-cache';

/**
 * Cache resolusi anomali live (duplikat transaksi & penurunan omzet)
 * yang tidak punya baris persisten di database — statusnya hanya hidup
 * di Map ini (lihat src/lib/anomaly/anomaly-cache.ts).
 */
describe('anomaly-cache', () => {
  beforeEach(() => {
    resolvedLiveAnomalies.clear();
  });

  it('anomali live baru berstatus belum resolved', () => {
    expect(isLiveAnomalyResolved('live-dup-tx-1')).toBe(false);
  });

  it('menandai anomali live sebagai resolved', () => {
    markLiveAnomalyResolved('live-dup-tx-1');
    expect(isLiveAnomalyResolved('live-dup-tx-1')).toBe(true);
  });

  it('status resolusi bersifat per-anomali (id lain tetap terbuka)', () => {
    markLiveAnomalyResolved('live-rev-b1-2026-10-30');
    expect(isLiveAnomalyResolved('live-rev-b1-2026-10-30')).toBe(true);
    expect(isLiveAnomalyResolved('live-dup-tx-9')).toBe(false);
  });

  it('menyimpan catatan resolusi & waktu penyelesaian', () => {
    markLiveAnomalyResolved('live-exp-1', 'Sudah dicek dengan kasir');
    const entry = resolvedLiveAnomalies.get('live-exp-1');
    expect(entry?.note).toBe('Sudah dicek dengan kasir');
    expect(entry?.resolved_at).toBeTruthy();
    expect(Number.isNaN(Date.parse(entry!.resolved_at))).toBe(false);
  });

  it('menimpa catatan bila anomali yang sama ditandai ulang', () => {
    markLiveAnomalyResolved('live-exp-2', 'Catatan pertama');
    markLiveAnomalyResolved('live-exp-2');
    expect(resolvedLiveAnomalies.get('live-exp-2')?.note).toBeUndefined();
    expect(isLiveAnomalyResolved('live-exp-2')).toBe(true);
  });
});
