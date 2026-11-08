import { describe, it, expect } from 'vitest';
import {
  calculateMean,
  calculateStdDev,
  calculateZScore,
  detectExpenseSpike,
  detectRevenueAnomalies,
  detectDuplicateTransactions,
  detectCashDiscrepancy,
} from '@/lib/anomaly/anomaly-detector';

describe('Statistical Utility Functions', () => {
  it('calculates mean correctly', () => {
    expect(calculateMean([10, 20, 30, 40, 50])).toBe(30);
    expect(calculateMean([100])).toBe(100);
    expect(calculateMean([])).toBe(0);
  });

  it('calculates sample standard deviation correctly', () => {
    // Array: [2, 4, 4, 4, 5, 5, 7, 9], sum squares = 32, sample divisor = 7 -> sqrt(32/7) ≈ 2.138
    const std = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(std).toBeCloseTo(2.138, 2);

    expect(calculateStdDev([10])).toBe(0);
    expect(calculateStdDev([])).toBe(0);
  });

  it('calculates Z-Score correctly', () => {
    expect(calculateZScore(15, 10, 2.5)).toBe(2.0);
    expect(calculateZScore(5, 10, 2.5)).toBe(-2.0);
    expect(calculateZScore(10, 10, 2.5)).toBe(0);
    expect(calculateZScore(10, 10, 0)).toBe(0); // Zero division guard
  });
});

describe('detectExpenseSpike', () => {
  const historicalUtilitas = [
    { amount: 50000, category: 'Utilitas' },
    { amount: 45000, category: 'Utilitas' },
    { amount: 55000, category: 'Utilitas' },
    { amount: 50000, category: 'Utilitas' },
  ]; // Mean = 50.000

  it('returns null for normal expected expenses', () => {
    const anomaly = detectExpenseSpike(
      {
        id: 'exp-1',
        amount: 60000,
        category: 'Utilitas',
        description: 'Beli galon air',
        branch_id: 'branch-1',
      },
      historicalUtilitas
    );
    expect(anomaly).toBeNull();
  });

  it('detects anomalous expense spike > 3x historical mean', () => {
    const anomaly = detectExpenseSpike(
      {
        id: 'exp-2',
        amount: 300000, // 6x mean
        category: 'Utilitas',
        description: 'Tagihan listrik membengkak',
        branch_id: 'branch-1',
      },
      historicalUtilitas
    );

    expect(anomaly).not.toBeNull();
    expect(anomaly?.anomaly_type).toBe('EXPENSE_SPIKE');
    expect(anomaly?.metric_value).toBe(300000);
    expect(anomaly?.baseline_value).toBe(50000);
    expect(anomaly?.severity).toBe('CRITICAL');
  });

  it('suppresses false positives below minimum threshold floor (Rp 50.000)', () => {
    const cheapHistory = [
      { amount: 2000, category: 'Operasional' },
      { amount: 2500, category: 'Operasional' },
      { amount: 3000, category: 'Operasional' },
    ]; // Mean = 2.500, 3x mean = 7.500, but below Rp 50.000 floor

    const anomaly = detectExpenseSpike(
      {
        amount: 15000,
        category: 'Operasional',
        description: 'Beli pulpen 3 buah',
        branch_id: 'branch-1',
      },
      cheapHistory
    );
    expect(anomaly).toBeNull();
  });

  it('returns null when insufficient historical data (< 3 items)', () => {
    const sparseHistory = [{ amount: 50000, category: 'Sewa' }];
    const anomaly = detectExpenseSpike(
      {
        amount: 500000,
        category: 'Sewa',
        description: 'Sewa lapak',
        branch_id: 'branch-1',
      },
      sparseHistory
    );
    expect(anomaly).toBeNull();
  });
});

describe('detectRevenueAnomalies', () => {
  it('detects statistical revenue drop and surge', () => {
    // 10 days of stable revenue ~Rp 2.000.000 ± 100.000
    const history = [
      { date: '2026-10-01', revenue: 2000000, branch_id: 'b1' },
      { date: '2026-10-02', revenue: 1950000, branch_id: 'b1' },
      { date: '2026-10-03', revenue: 2050000, branch_id: 'b1' },
      { date: '2026-10-04', revenue: 2000000, branch_id: 'b1' },
      { date: '2026-10-05', revenue: 1980000, branch_id: 'b1' },
      { date: '2026-10-06', revenue: 2020000, branch_id: 'b1' },
      { date: '2026-10-07', revenue: 2010000, branch_id: 'b1' },
      { date: '2026-10-08', revenue: 2000000, branch_id: 'b1' },
      { date: '2026-10-09', revenue: 500000, branch_id: 'b1' }, // Extreme drop
      { date: '2026-10-10', revenue: 4500000, branch_id: 'b1' }, // Extreme surge
    ];

    const anomalies = detectRevenueAnomalies(history);

    expect(anomalies.length).toBeGreaterThanOrEqual(2);

    const drop = anomalies.find((a) => a.anomaly_type === 'REVENUE_DROP');
    expect(drop).toBeDefined();
    expect(drop?.metric_value).toBe(500000);
    expect(drop?.z_score).toBeLessThan(-2.0);

    const surge = anomalies.find((a) => a.anomaly_type === 'REVENUE_SURGE');
    expect(surge).toBeDefined();
    expect(surge?.metric_value).toBe(4500000);
    expect(surge?.z_score).toBeGreaterThan(2.5);
  });

  it('returns empty array if less than minDays', () => {
    const shortHistory = [
      { date: '2026-10-01', revenue: 2000000, branch_id: 'b1' },
      { date: '2026-10-02', revenue: 500000, branch_id: 'b1' },
    ];
    expect(detectRevenueAnomalies(shortHistory)).toEqual([]);
  });
});

describe('detectDuplicateTransactions', () => {
  it('detects duplicate transactions occurring within 60 seconds with same amount and payment', () => {
    const txs = [
      {
        id: 'tx-1',
        branch_id: 'b1',
        total_revenue: 55000,
        payment_method: 'CASH',
        created_at: '2026-10-19T10:00:00Z',
      },
      {
        id: 'tx-2',
        branch_id: 'b1',
        total_revenue: 55000,
        payment_method: 'CASH',
        created_at: '2026-10-19T10:00:25Z', // 25s later
      },
    ];

    const anomalies = detectDuplicateTransactions(txs, 60);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].anomaly_type).toBe('DUPLICATE_TRANSACTION');
    expect(anomalies[0].entity_id).toBe('tx-2');
  });

  it('ignores transactions outside the time window or with different amounts', () => {
    const txs = [
      {
        id: 'tx-1',
        branch_id: 'b1',
        total_revenue: 55000,
        payment_method: 'CASH',
        created_at: '2026-10-19T10:00:00Z',
      },
      {
        id: 'tx-2',
        branch_id: 'b1',
        total_revenue: 55000,
        payment_method: 'CASH',
        created_at: '2026-10-19T10:05:00Z', // 5 minutes later
      },
      {
        id: 'tx-3',
        branch_id: 'b1',
        total_revenue: 80000, // Different amount
        payment_method: 'CASH',
        created_at: '2026-10-19T10:05:10Z',
      },
    ];

    expect(detectDuplicateTransactions(txs, 60)).toEqual([]);
  });

  it('ignores voided transactions', () => {
    const txs = [
      {
        id: 'tx-1',
        branch_id: 'b1',
        total_revenue: 55000,
        payment_method: 'CASH',
        created_at: '2026-10-19T10:00:00Z',
        status: 'VOID',
      },
      {
        id: 'tx-2',
        branch_id: 'b1',
        total_revenue: 55000,
        payment_method: 'CASH',
        created_at: '2026-10-19T10:00:20Z',
        status: 'COMPLETED',
      },
    ];

    expect(detectDuplicateTransactions(txs, 60)).toEqual([]);
  });
});

describe('detectExpenseSpike — batas severity & opsi', () => {
  const history = [
    { amount: 40000, category: 'Gaji' },
    { amount: 160000, category: 'Gaji' },
    { amount: 60000, category: 'Gaji' },
    { amount: 140000, category: 'Gaji' },
  ]; // mean = 100.000, std dev ≈ 58.878

  it('menandai HIGH saat rasio < 5x tetapi z-score > 3', () => {
    const anomaly = detectExpenseSpike(
      { id: 'exp-h', amount: 330000, category: 'Gaji', description: 'Tunjangan mendadak', branch_id: 'b1' },
      history
    );
    // 3,3x mean (lolos threshold 300.000) tapi belum 5x; z ≈ 3,9 → HIGH, bukan CRITICAL
    expect(anomaly?.severity).toBe('HIGH');
  });

  it('tidak menandai saat nominal tepat sama dengan threshold (harus >, bukan >=)', () => {
    const flat = [
      { amount: 50000, category: 'Utilitas' },
      { amount: 45000, category: 'Utilitas' },
      { amount: 55000, category: 'Utilitas' },
      { amount: 50000, category: 'Utilitas' },
    ]; // mean 50.000 → threshold max(50.000, 150.000) = 150.000
    const anomaly = detectExpenseSpike(
      { amount: 150000, category: 'Utilitas', description: 'Tepat di batas', branch_id: 'b1' },
      flat
    );
    expect(anomaly).toBeNull();
  });

  it('memakai expense_date sebagai detected_at bila disediakan', () => {
    const anomaly = detectExpenseSpike(
      {
        id: 'exp-d',
        amount: 330000,
        category: 'Gaji',
        description: 'Bayar lembur',
        branch_id: 'b1',
        expense_date: '2026-10-20',
      },
      history
    );
    expect(anomaly?.detected_at).toBe('2026-10-20');
  });
});

describe('detectRevenueAnomalies — floor stdDev, opsi & severity', () => {
  it('omzet konstan dengan satu hari jatuh tetap terdeteksi (floor stdDev 5% mean)', () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-0${i + 1}`,
      revenue: 2000000,
      branch_id: 'b1',
    }));
    days.push({ date: '2026-10-08', revenue: 1000000, branch_id: 'b1' }); // std dev = 0

    const anomalies = detectRevenueAnomalies(days);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].anomaly_type).toBe('REVENUE_DROP');
    expect(anomalies[0].severity).toBe('CRITICAL'); // z ≈ -10
  });

  it('lonjakan dengan z di rentang 2,5–3,5 berseverity MEDIUM', () => {
    const days = [
      { date: '2026-10-01', revenue: 2000000, branch_id: 'b1' },
      { date: '2026-10-02', revenue: 2100000, branch_id: 'b1' },
      { date: '2026-10-03', revenue: 1900000, branch_id: 'b1' },
      { date: '2026-10-04', revenue: 2050000, branch_id: 'b1' },
      { date: '2026-10-05', revenue: 1950000, branch_id: 'b1' },
      { date: '2026-10-06', revenue: 2000000, branch_id: 'b1' },
      { date: '2026-10-07', revenue: 2020000, branch_id: 'b1' },
      { date: '2026-10-08', revenue: 2300000, branch_id: 'b1' }, // z ≈ 3,0 (floor stdDev 5% mean aktif)
    ];

    const anomalies = detectRevenueAnomalies(days);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].anomaly_type).toBe('REVENUE_SURGE');
    expect(anomalies[0].severity).toBe('MEDIUM');
  });

  it('menghormati opsi minDays kustom', () => {
    const days = Array.from({ length: 8 }, (_, i) => ({
      date: `2026-10-0${i + 1}`,
      revenue: i === 7 ? 500000 : 2000000,
      branch_id: 'b1',
    }));
    expect(detectRevenueAnomalies(days, { minDays: 10 })).toEqual([]);
    expect(detectRevenueAnomalies(days, { minDays: 10 }).length).toBe(0);
  });
});

describe('detectDuplicateTransactions — batas aturan', () => {
  const base = {
    total_revenue: 55000,
    payment_method: 'CASH',
    created_at: '2026-10-19T10:00:00Z',
  };

  it('mengabaikan pasangan beda cabang walau nominal & waktu identik', () => {
    const txs = [
      { id: 'tx-a', branch_id: 'b1', ...base },
      { id: 'tx-b', branch_id: 'b2', ...base, created_at: '2026-10-19T10:00:15Z' },
    ];
    expect(detectDuplicateTransactions(txs)).toEqual([]);
  });

  it('mengabaikan pasangan beda metode bayar', () => {
    const txs = [
      { id: 'tx-a', branch_id: 'b1', ...base },
      { id: 'tx-b', branch_id: 'b1', ...base, payment_method: 'QRIS', created_at: '2026-10-19T10:00:15Z' },
    ];
    expect(detectDuplicateTransactions(txs)).toEqual([]);
  });

  it('tetap mendeteksi walau input tidak terurut waktu', () => {
    const txs = [
      { id: 'tx-later', branch_id: 'b1', ...base, created_at: '2026-10-19T10:00:20Z' },
      { id: 'tx-earlier', branch_id: 'b1', ...base, created_at: '2026-10-19T10:00:00Z' },
    ];
    const anomalies = detectDuplicateTransactions(txs, 60);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].entity_id).toBe('tx-later'); // selalu transaksi kedua (berurutan waktu)
  });
});

describe('detectCashDiscrepancy — toleransi kustom', () => {
  it('menghormati parameter toleransi persentase', () => {
    // Selisih 30.000: ditolak dengan toleransi bawaan 2% (batas 20.000)...
    expect(detectCashDiscrepancy(1000000, 1030000, 'b1')).not.toBeNull();
    // ...tapi diterima bila toleransi dilonggarkan ke 5% (batas 50.000)
    expect(detectCashDiscrepancy(1000000, 1030000, 'b1', 'Kasir A', 0.05)).toBeNull();
  });

  it('selisih tepat sebesar batas toleransi tidak dianggap anomali (harus >)', () => {
    expect(detectCashDiscrepancy(1000000, 1020000, 'b1')).toBeNull();
  });
});

describe('detectCashDiscrepancy', () => {
  it('detects cash shortage and surplus beyond tolerance', () => {
    // Expected: 1.000.000, Actual: 850.000 (Shortage of 150.000 > tolerance of 20.000)
    const shortage = detectCashDiscrepancy(1000000, 850000, 'b1');
    expect(shortage).not.toBeNull();
    expect(shortage?.anomaly_type).toBe('CASH_DISCREPANCY');
    expect(shortage?.severity).toBe('CRITICAL');
    expect(shortage?.title).toContain('Kurang');

    // Expected: 500.000, Actual: 540.000 (Surplus of 40.000 > tolerance of 10.000)
    const surplus = detectCashDiscrepancy(500000, 540000, 'b1');
    expect(surplus).not.toBeNull();
    expect(surplus?.title).toContain('Berlebih');
  });

  it('ignores minor variances within tolerance', () => {
    // Expected: 1.000.000, Actual: 1.005.000 (difference 5.000 <= 10.000 tolerance floor)
    const ok = detectCashDiscrepancy(1000000, 1005000, 'b1');
    expect(ok).toBeNull();
  });
});

describe('detectExpenseSpike — baseline per kategori (bukan lintas kategori)', () => {
  const transportHistory = [
    { amount: 50000, category: 'Transportasi' },
    { amount: 50000, category: 'Transportasi' },
    { amount: 48000, category: 'Transportasi' },
    { amount: 52000, category: 'Transportasi' },
  ]; // mean transport = 50.000

  it('gaji Rp 2.000.000 tidak jadi anomali hanya karena transport Rp 50.000 ada di riwayat', () => {
    // Kasus user: baseline lintas kategori membuat gaji terbaca "40x rata-rata 50.000"
    const anomaly = detectExpenseSpike(
      { amount: 2000000, category: 'Gaji', description: 'Gaji karyawan', branch_id: 'b1' },
      transportHistory
    );
    expect(anomaly).toBeNull();
  });

  it('gaji 40x rata-rata gaji sendiri tetap terdeteksi', () => {
    const gajiHistory = [
      { amount: 50000, category: 'Gaji' },
      { amount: 50000, category: 'Gaji' },
      { amount: 48000, category: 'Gaji' },
      { amount: 52000, category: 'Gaji' },
    ];
    const anomaly = detectExpenseSpike(
      { amount: 2000000, category: 'Gaji', description: 'Gaji karyawan', branch_id: 'b1' },
      gajiHistory
    );
    expect(anomaly).not.toBeNull();
    expect(anomaly?.baseline_value).toBe(50000);
    expect(anomaly?.title).toContain('40.0x Rata-rata');
  });

  it('transportasi 40x rata-rata transportasi sendiri tetap terdeteksi', () => {
    const anomaly = detectExpenseSpike(
      { amount: 2000000, category: 'Transportasi', description: 'Sewa truk', branch_id: 'b1' },
      transportHistory
    );
    expect(anomaly).not.toBeNull();
    expect(anomaly?.baseline_value).toBe(50000);
  });
});
