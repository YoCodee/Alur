import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Uji deteksi anomali waktu-tulis (write-time) di POST & PATCH /api/expenses.
 *
 * Skenario user: transportasi Rp 50.000 dicatat, lalu gaji Rp 2.000.000 —
 * gaji tidak boleh jadi anomali hanya karena baseline rata-rata tercampur
 * lintas kategori. Baseline harus per kategori dan pakai aturan yang sama
 * dengan detector (min. 3 sampel kategori yang sama).
 */
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  const state = {
    history: [] as Row[],
    currentExpense: null as Row | null,
    inserts: [] as { table: string; payload: Row }[],
    updates: [] as { table: string; payload: Row }[],
    profile: { org_id: 'org-1', role: 'OWNER', branch_id: null as string | null },
  };

  function builder(table: string) {
    const q: Record<string, unknown> = {};
    let op: 'select' | 'insert' | 'update' = 'select';
    const chain = () => q;
    for (const m of ['select', 'eq', 'neq', 'limit', 'order', 'gte', 'lte']) {
      q[m] = chain;
    }
    q.insert = (payload: Row) => {
      op = 'insert';
      state.inserts.push({ table, payload });
      return q;
    };
    q.update = (payload: Row) => {
      op = 'update';
      state.updates.push({ table, payload });
      return q;
    };
    q.single = async () => {
      if (op === 'insert') return { data: { id: 'exp-new' }, error: null };
      if (op === 'update') return { data: { id: 'exp-1' }, error: null };
      if (table === 'profiles') return { data: state.profile, error: null };
      if (table === 'expenses' && state.currentExpense) {
        return { data: state.currentExpense, error: null };
      }
      return { data: null, error: { message: 'no row' } };
    };
    // Query yang di-await langsung (riwayat pengeluaran / insert ml_recommendations)
    q.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
      let result: unknown;
      if (table === 'expenses' && op === 'select') {
        result = { data: state.history, error: null };
      } else {
        result = { data: null, error: null };
      }
      return Promise.resolve(result).then(onFulfilled, onRejected);
    };
    return q;
  }

  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    from: (table: string) => builder(table),
  };

  return { state, supabase };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: () => db.supabase }));

import { POST } from '@/app/api/expenses/route';
import { PATCH } from '@/app/api/expenses/[id]/route';

const BRANCH_ID = '11111111-1111-4111-8111-111111111111';

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function expenseBody(amount: number, category: string, description: string) {
  return {
    branch_id: BRANCH_ID,
    category,
    description,
    amount,
    expense_date: '2026-11-05',
  };
}

function expenseInsert() {
  return db.state.inserts.find((i) => i.table === 'expenses');
}

function recInsert() {
  return db.state.inserts.find((i) => i.table === 'ml_recommendations');
}

beforeEach(() => {
  db.state.history = [];
  db.state.currentExpense = null;
  db.state.inserts = [];
  db.state.updates = [];
});

describe('POST /api/expenses — baseline anomali per kategori', () => {
  it('gaji Rp 2.000.000 tidak jadi anomali saat riwayat hanya berisi transportasi Rp 50.000', async () => {
    // Kasus user: transport 50.000 dicatat lebih dulu, lalu gaji 2.000.000.
    // Rata-rata lintas kategori (50.000) membuat gaji terbaca "40x rata-rata".
    db.state.history = [{ amount: 50000, category: 'Transportasi' }];

    await POST(makeRequest(expenseBody(2000000, 'Gaji', 'Gaji karyawan November')));

    expect(expenseInsert()?.payload.is_anomaly).toBe(false);
    expect(expenseInsert()?.payload.anomaly_reason).toBeNull();
    expect(recInsert()).toBeUndefined();
  });

  it('gaji baru muncul 1x tidak langsung jadi anomali walau nominalnya 40x riwayatnya', async () => {
    db.state.history = [{ amount: 2000000, category: 'Gaji' }];

    await POST(makeRequest(expenseBody(80000000, 'Gaji', 'Gaji direvisi')));

    expect(expenseInsert()?.payload.is_anomaly).toBe(false);
    expect(recInsert()).toBeUndefined();
  });

  it('gaji 40x rata-rata gaji sendiri tetap terdeteksi sebagai anomali', async () => {
    db.state.history = [
      { amount: 50000, category: 'Gaji' },
      { amount: 50000, category: 'Gaji' },
      { amount: 48000, category: 'Gaji' },
      { amount: 52000, category: 'Gaji' },
    ];

    await POST(makeRequest(expenseBody(2000000, 'Gaji', 'Gaji karyawan November')));

    expect(expenseInsert()?.payload.is_anomaly).toBe(true);
    const rec = recInsert();
    expect(rec).toBeDefined();
    expect(rec?.payload.title).toContain('40.0x Rata-rata');
  });

  it('transportasi 40x rata-rata transportasi sendiri tetap terdeteksi sebagai anomali', async () => {
    db.state.history = [
      { amount: 50000, category: 'Transportasi' },
      { amount: 50000, category: 'Transportasi' },
      { amount: 48000, category: 'Transportasi' },
      { amount: 52000, category: 'Transportasi' },
    ];

    await POST(makeRequest(expenseBody(2000000, 'Transportasi', 'Sewa truk kontainer')));

    expect(expenseInsert()?.payload.is_anomaly).toBe(true);
    expect(recInsert()).toBeDefined();
  });
});

describe('PATCH /api/expenses/[id] — baseline anomali per kategori', () => {
  it('menaikkan gaji jadi Rp 2.000.000 tidak menandai anomali dari riwayat transportasi', async () => {
    db.state.currentExpense = {
      org_id: 'org-1',
      branch_id: BRANCH_ID,
      category: 'Gaji',
      amount: 50000,
      description: 'Gaji karyawan',
    };
    db.state.history = [{ amount: 50000, category: 'Transportasi' }];

    await PATCH(makeRequest({ amount: 2000000 }), {
      params: { id: 'exp-1' },
    });

    const upd = db.state.updates.find((u) => u.table === 'expenses');
    expect(upd?.payload.is_anomaly).toBe(false);
    expect(upd?.payload.anomaly_reason).toBeNull();
  });
});
