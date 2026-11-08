import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Branch name reuse test: deleting a branch must not keep its name taken forever.
 *
 * User scenario: the "Jogja" branch is deleted (it disappears from the list), yet
 * creating "Jogja" again always returns 409. Root cause: the unique (org_id, name)
 * constraint applies to every row, including soft-deleted ones (is_active = false).
 */
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;

  const state = {
    profile: { id: 'user-1', org_id: 'org-1', role: 'OWNER' } as Row | null,
    branches: [] as Row[],
    failDelete: null as { code: string; message: string } | null,
    failUpdate: null as { code: string; message: string } | null,
    seq: 0,
  };

  function builder(table: string) {
    const q: Record<string, unknown> = {};
    const filters: [string, string, unknown][] = [];
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row | undefined;
    let head = false;

    const matches = (row: Row) =>
      filters.every(([fn, key, value]) =>
        fn === 'neq' ? row[key] !== value : row[key] === value
      );

    const selectRows = () => state.branches.filter(matches);

    // Base result per operation (PostgREST-style)
    function base(): { data: unknown; error: unknown; count?: number } {
      if (table === 'profiles') {
        return { data: state.profile, error: state.profile ? null : { message: 'no profile' } };
      }

      if (op === 'select') {
        const rows = selectRows();
        if (head) return { data: null, error: null, count: rows.length };
        return { data: rows, error: null };
      }

      if (op === 'insert') {
        const row = payload as Row;
        const dup = state.branches.find(
          (b) => b.org_id === row.org_id && b.name === row.name
        );
        if (dup) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          };
        }
        const saved = { id: `b-${++state.seq}`, ...row };
        state.branches.push(saved);
        return { data: saved, error: null };
      }

      if (op === 'delete') {
        if (state.failDelete) return { data: null, error: state.failDelete };
        const rows = selectRows();
        state.branches = state.branches.filter((b) => !rows.includes(b));
        return { data: rows[0] ?? null, error: null };
      }

      // update
      if (state.failUpdate) return { data: null, error: state.failUpdate };
      const rows = selectRows();
      // unique (org_id, name) also applies on rename
      if (payload && typeof payload.name === 'string') {
        const targetOrg = rows[0]?.org_id;
        const dup = state.branches.find(
          (b) => !rows.includes(b) && b.org_id === targetOrg && b.name === (payload as Row).name
        );
        if (dup) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' },
          };
        }
      }
      rows.forEach((r) => Object.assign(r, payload));
      return { data: rows[0] ?? null, error: null };
    }

    function asSingle(maybe: boolean) {
      const { data, error } = base();
      if (error) return { data: null, error };
      const row = Array.isArray(data) ? data[0] ?? null : data;
      if (!maybe && row === null) {
        return { data: null, error: { code: 'PGRST116', message: 'no rows returned' } };
      }
      return { data: row, error: null };
    }

    function thenable(result: () => { data: unknown; error: unknown; count?: number }) {
      return {
        then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result()).then(onFulfilled, onRejected),
      };
    }

    q.select = (_cols?: unknown, opts?: { head?: boolean }) => {
      if (op === 'select') head = Boolean(opts?.head);
      return q;
    };
    q.insert = (p: Row) => {
      op = 'insert';
      payload = p;
      return q;
    };
    q.update = (p: Row) => {
      op = 'update';
      payload = p;
      return q;
    };
    q.delete = () => {
      op = 'delete';
      return q;
    };
    q.eq = (key: string, value: unknown) => {
      filters.push(['eq', key, value]);
      return q;
    };
    q.neq = (key: string, value: unknown) => {
      filters.push(['neq', key, value]);
      return q;
    };
    for (const m of ['limit', 'order', 'gte', 'lte', 'ilike']) {
      q[m] = () => q;
    }
    q.single = () => thenable(() => asSingle(false));
    q.maybeSingle = () => thenable(() => asSingle(true));
    q.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(base()).then(onFulfilled, onRejected);

    return q;
  }

  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    from: (table: string) => builder(table),
  };

  return { state, supabase };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: () => db.supabase }));

import { POST } from '@/app/api/branches/route';
import { PATCH, DELETE } from '@/app/api/branches/[id]/route';

const BRANCH_ID = '11111111-1111-4111-8111-111111111111';

function jsonRequest(body: unknown, method = 'POST'): NextRequest {
  return { json: async () => body, method } as unknown as NextRequest;
}

function branchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BRANCH_ID,
    org_id: 'org-1',
    name: 'Jogja',
    location: 'Jl. Malioboro',
    daily_target: 500000,
    is_active: true,
    ...overrides,
  };
}

beforeEach(() => {
  db.state.profile = { id: 'user-1', org_id: 'org-1', role: 'OWNER' };
  db.state.branches = [];
  db.state.failDelete = null;
  db.state.failUpdate = null;
  db.state.seq = 0;
});

describe('POST /api/branches — names left behind by deleted branches', () => {
  it('inactive branch with no data does not hold the name: insert succeeds', async () => {
    db.state.branches = [branchRow({ id: 'b-old', is_active: false })];

    const res = await POST(jsonRequest({ name: 'Jogja', location: 'Jl. Malioboro', daily_target: 0 }));

    expect(res.status).toBe(201);
    // Old inactive row released, only the new branch remains
    expect(db.state.branches).toHaveLength(1);
    expect(db.state.branches[0]).toMatchObject({ name: 'Jogja', is_active: true });
    expect(db.state.branches[0].id).not.toBe('b-old');
  });

  it('inactive branch with history keeps holding the name, with a clear message', async () => {
    db.state.branches = [branchRow({ id: 'b-old', is_active: false })];
    db.state.failDelete = { code: '23503', message: 'violates foreign key constraint' };

    const res = await POST(jsonRequest({ name: 'Jogja', location: 'Jl. Malioboro', daily_target: 0 }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.message).toContain('masih memiliki data terkait');
    // Old row must not be deleted along the way
    expect(db.state.branches).toHaveLength(1);
    expect(db.state.branches[0].id).toBe('b-old');
  });

  it('an active branch still conflicts with the original message', async () => {
    db.state.branches = [branchRow({ id: 'b-1', name: 'Malioboro' })];

    const res = await POST(jsonRequest({ name: 'Malioboro', location: 'Jl. Malioboro', daily_target: 0 }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.message).toBe('Cabang dengan nama "Malioboro" sudah ada.');
    expect(db.state.branches).toHaveLength(1);
  });
});

describe('DELETE /api/branches/[id]', () => {
  it('no related data: hard delete frees the name', async () => {
    db.state.branches = [branchRow()];

    const res = await DELETE({} as NextRequest, { params: { id: BRANCH_ID } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.message).toContain('berhasil dihapus');
    expect(db.state.branches).toHaveLength(0);
  });

  it('still has data: falls back to soft delete (inactive) per PRD D9', async () => {
    db.state.branches = [branchRow()];
    db.state.failDelete = { code: '23503', message: 'violates foreign key constraint' };

    const res = await DELETE({} as NextRequest, { params: { id: BRANCH_ID } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.message).toContain('hanya dinonaktifkan');
    expect(db.state.branches[0]).toMatchObject({ id: BRANCH_ID, is_active: false });
  });

  it('missing branch → 404', async () => {
    const res = await DELETE({} as NextRequest, { params: { id: BRANCH_ID } });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/branches/[id] — rename', () => {
  it('renaming to an inactive branch name with no data releases it, then updates', async () => {
    db.state.branches = [
      branchRow({ id: 'b-1', name: 'Pusat' }),
      branchRow({ id: 'b-2', name: 'Jogja', is_active: false }),
    ];

    const res = await PATCH(
      jsonRequest({ name: 'Jogja' }, 'PATCH'),
      { params: { id: 'b-1' } }
    );

    expect(res.status).toBe(200);
    expect(db.state.branches).toHaveLength(1);
    expect(db.state.branches[0]).toMatchObject({ id: 'b-1', name: 'Jogja' });
  });

  it('renaming to another active branch name still returns 409', async () => {
    db.state.branches = [
      branchRow({ id: 'b-1', name: 'Pusat' }),
      branchRow({ id: 'b-2', name: 'Jogja' }),
    ];

    const res = await PATCH(
      jsonRequest({ name: 'Jogja' }, 'PATCH'),
      { params: { id: 'b-1' } }
    );
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error.message).toBe('Nama cabang sudah digunakan.');
    expect(db.state.branches).toHaveLength(2);
  });

  it('renaming a branch to its own name does not delete itself', async () => {
    db.state.branches = [branchRow({ id: 'b-1', name: 'Jogja', is_active: false })];

    const res = await PATCH(
      jsonRequest({ name: 'Jogja', location: 'Jl. Baru' }, 'PATCH'),
      { params: { id: 'b-1' } }
    );

    expect(res.status).toBe(200);
    expect(db.state.branches).toHaveLength(1);
    expect(db.state.branches[0]).toMatchObject({ id: 'b-1', name: 'Jogja', location: 'Jl. Baru' });
  });
});
