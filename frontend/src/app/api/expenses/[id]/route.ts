import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateExpenseSchema } from '@/lib/validators/expenses';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { detectExpenseSpike } from '@/lib/anomaly/anomaly-detector';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expenseId = params.id;
    const json = await request.json();
    const parsed = updateExpenseSchema.safeParse(json);

    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      return apiError('VALIDATION_ERROR', `Data update tidak valid: ${issues}`, 400);
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', 401);
    }

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.category !== undefined) updatePayload.category = parsed.data.category;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description;
    if (parsed.data.amount !== undefined) updatePayload.amount = parsed.data.amount;
    if (parsed.data.expense_date !== undefined) updatePayload.expense_date = parsed.data.expense_date;

    if (Object.keys(updatePayload).length === 0) {
      return apiError('VALIDATION_ERROR', 'Tidak ada data yang diubah.', 400);
    }

    // If amount or category is being updated, recalculate anomaly status
    if (parsed.data.amount !== undefined || parsed.data.category !== undefined) {
      // Get current expense for branch & org
      const { data: currentExp } = await supabase
        .from('expenses')
        .select('org_id, branch_id, category, amount, description')
        .eq('id', expenseId)
        .single();

      if (currentExp) {
        const cat = parsed.data.category || currentExp.category;
        const amt = parsed.data.amount || currentExp.amount;

        const { data: pastExpenses } = await supabase
          .from('expenses')
          .select('amount, category, description')
          .eq('org_id', currentExp.org_id)
          .neq('id', expenseId)
          .limit(100);

        // Baseline per kategori lewat detector yang sama dengan POST /api/expenses
        // (fallback ke rata-rata lintas kategori = bug gaji 40x).
        const spike = detectExpenseSpike(
          {
            amount: Number(amt),
            category: cat,
            description: parsed.data.description || currentExp.description || '',
            branch_id: currentExp.branch_id,
          },
          (pastExpenses || []).map((e) => ({ amount: Number(e.amount), category: e.category }))
        );

        updatePayload.is_anomaly = spike !== null;
        // z = 0 hanya bila stdDev 0 → pakai fallback 3.5 seperti logika lama
        updatePayload.anomaly_score = spike ? Math.min(99.99, spike.z_score || 3.5) : 0;
        updatePayload.anomaly_reason = spike
          ? `Rp ${Number(amt).toLocaleString('id-ID')}, sekitar ${(
              Number(amt) / (spike.baseline_value || 1)
            ).toFixed(1)}x dari rata-rata biasanya (Rp ${spike.baseline_value.toLocaleString('id-ID')}) untuk kategori ${cat}.`
          : null;
      }
    }

    const { data: updated, error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) {
      return handleApiError(error);
    }

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expenseId = params.id;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return apiError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', 401);
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      return handleApiError(error);
    }

    return apiSuccess({ id: expenseId, message: 'Pengeluaran berhasil dihapus' });
  } catch (error) {
    return handleApiError(error);
  }
}
