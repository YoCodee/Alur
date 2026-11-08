import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBranchSchema } from '@/lib/validators/branches';
import { releaseBranchName } from '@/lib/branches';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    let query = supabase
      .from('branches')
      .select('id, org_id, name, location, daily_target, is_active, created_at')
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: branches, error } = await query;

    if (error) {
      return handleApiError(error);
    }

    return apiSuccess(branches || []);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const result = createBranchSchema.safeParse(json);

    if (!result.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Data cabang tidak valid',
        400,
        result.error.flatten().fieldErrors
      );
    }

    const supabase = createClient();

    // Check user profile for org_id and role
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return apiError('UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.', 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return apiError('NOT_FOUND', 'Profil pengguna tidak ditemukan.', 404);
    }

    if (profile.role !== 'OWNER') {
      return apiError('FORBIDDEN', 'Hanya pemilik usaha yang dapat menambahkan cabang.', 403);
    }

    // Check branch limit in app layer as pre-check (PRD §7.1: max 5 active branches)
    const { count, error: countError } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', profile.org_id)
      .eq('is_active', true);

    if (!countError && count !== null && count >= 5) {
      return apiError(
        'BRANCH_LIMIT_REACHED',
        'Batas maksimum 5 cabang aktif telah tercapai untuk usaha ini.',
        409
      );
    }

    const { name, location, daily_target } = result.data;

    // Free the name if it is still held by an inactive branch with no data (see lib/branches)
    const release = await releaseBranchName(supabase, profile.org_id, name);

    const { data: newBranch, error: insertError } = await supabase
      .from('branches')
      .insert({
        org_id: profile.org_id,
        name,
        location,
        daily_target,
        is_active: true,
      })
      .select('id, org_id, name, location, daily_target, is_active, created_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique violation (org_id, name)
        if (release === 'held-by-history') {
          return apiError(
            'CONFLICT',
            `Nama "${name}" masih dipakai cabang nonaktif yang masih memiliki data terkait.`,
            409
          );
        }
        return apiError('CONFLICT', `Cabang dengan nama "${name}" sudah ada.`, 409);
      }
      return handleApiError(insertError);
    }

    return apiSuccess(newBranch, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
