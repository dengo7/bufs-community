import { getSupabaseClient } from './supabase/client';

export type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'comment' | 'reply' | 'like';
  post_id: string;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    nickname: string;
    nationality: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(nickname, nationality, avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
}
