import type { SupabaseClient } from '@supabase/supabase-js';

export type BranchNameRelease = 'released' | 'unchanged' | 'held-by-history';

/**
 * The unique branch name per org applies to EVERY row, including inactive (soft-deleted)
 * ones, so a name from an "deleted" branch can stay taken forever. Release an inactive
 * row that has no related data (FK blocks hard delete when history remains) so the name
 * can be reused; rows with history are kept so old reports stay intact.
 */
export async function releaseBranchName(
  supabase: SupabaseClient,
  orgId: string,
  name: string,
  excludeId?: string
): Promise<BranchNameRelease> {
  const { data: conflicting } = await supabase
    .from('branches')
    .select('id, is_active')
    .eq('org_id', orgId)
    .eq('name', name)
    .maybeSingle();

  // No row, name still used by an active branch, or the row is the branch being
  // edited → let the real conflict speak for itself
  if (!conflicting || conflicting.is_active || conflicting.id === excludeId) return 'unchanged';

  const { error } = await supabase.from('branches').delete().eq('id', conflicting.id);
  return error ? 'held-by-history' : 'released';
}
