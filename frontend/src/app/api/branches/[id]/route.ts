import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateBranchSchema } from '@/lib/validators/branches';
import { releaseBranchName } from '@/lib/branches';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const branchId = params.id;
    const json = await request.json();
    const result = updateBranchSchema.safeParse(json);

    if (!result.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Data perubahan cabang tidak valid',
        400,
        result.error.flatten().fieldErrors
      );
    }

    const supabase = createClient();

    // Verify owner
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return apiError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', 401);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role !== 'OWNER') {
      return apiError('FORBIDDEN', 'Hanya pemilik usaha yang dapat mengubah data cabang.', 403);
    }

    // Check if activating would exceed 5 active branches limit
    if (result.data.is_active === true) {
      const { count } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('is_active', true)
        .neq('id', branchId);

      if (count !== null && count >= 5) {
        return apiError(
          'BRANCH_LIMIT_REACHED',
          'Tidak dapat mengaktifkan cabang. Batas maksimum 5 cabang aktif telah tercapai.',
          409
        );
      }
    }

    // Free the new name if it is still held by an inactive branch with no data
    const release = result.data.name
      ? await releaseBranchName(supabase, profile.org_id, result.data.name, branchId)
      : 'unchanged';

    const { data: updatedBranch, error: updateError } = await supabase
      .from('branches')
      .update(result.data)
      .eq('id', branchId)
      .select('id, org_id, name, location, daily_target, is_active, created_at')
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        if (release === 'held-by-history') {
          return apiError(
            'CONFLICT',
            `Nama "${result.data.name}" masih dipakai cabang nonaktif yang masih memiliki data terkait.`,
            409
          );
        }
        return apiError('CONFLICT', 'Nama cabang sudah digunakan.', 409);
      }
      return handleApiError(updateError);
    }

    if (!updatedBranch) {
      return apiError('NOT_FOUND', 'Cabang tidak ditemukan.', 404);
    }

    return apiSuccess(updatedBranch);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const branchId = params.id;
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return apiError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', 401);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role !== 'OWNER') {
      return apiError('FORBIDDEN', 'Hanya pemilik usaha yang dapat menonaktifkan cabang.', 403);
    }

    // Hard delete first so the name can be reused; PRD D9 only forbids permanent delete
    // when the branch has data (FK 23503) or assigned staff (profiles check 23514).
    const { data: deleted, error: deleteError } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId)
      .select('id, name, is_active')
      .maybeSingle();

    if (deleteError && deleteError.code !== '23503' && deleteError.code !== '23514') {
      return handleApiError(deleteError);
    }

    if (!deleteError && deleted) {
      return apiSuccess({
        message: `Cabang ${deleted.name} berhasil dihapus.`,
        branch: deleted,
      });
    }

    if (!deleteError && !deleted) {
      return apiError('NOT_FOUND', 'Cabang tidak ditemukan.', 404);
    }

    // Still has history → soft delete (set is_active = false) per PRD D9
    const { data: branch, error: updateError } = await supabase
      .from('branches')
      .update({ is_active: false })
      .eq('id', branchId)
      .select('id, name, is_active')
      .single();

    if (updateError) {
      return handleApiError(updateError);
    }

    if (!branch) {
      return apiError('NOT_FOUND', 'Cabang tidak ditemukan.', 404);
    }

    return apiSuccess({
      message: `Cabang ${branch.name} masih memiliki data, sehingga hanya dinonaktifkan.`,
      branch,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
