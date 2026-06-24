import { getSupabaseClient } from './supabase/client';

// 사용자 차단 — user_blocks 테이블에 (blocker_id=나, blocked_id=상대) insert
export async function blockUser(blockedId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });

  // 23505 = unique 위반(이미 차단함) → 성공으로 간주
  if (error && error.code !== '23505') throw error;
}

// 차단 해제 — 내가 만든 차단 기록 delete
export async function unblockUser(blockedId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) throw error;
}

// 내가 차단한 사용자 id 배열 반환 (비로그인 시 빈 배열)
export async function getBlockedIds(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  if (error) return [];
  return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
}
