// 알림 종류별 on/off (notification_preferences). 행이 없거나 테이블이 아직 없으면 전부 켜짐.
import { getSupabaseClient } from './supabase/client';

export type NotificationPreferences = {
  notice_academic: boolean;
  notice_global: boolean;
  community: boolean;
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  notice_academic: true,
  notice_global: true,
  community: true,
};

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await getSupabaseClient()
    .from('notification_preferences')
    .select('notice_academic, notice_global, community')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_PREFERENCES };
  return {
    notice_academic: Boolean(data.notice_academic),
    notice_global: Boolean(data.notice_global),
    community: Boolean(data.community),
  };
}

export async function saveNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences
): Promise<boolean> {
  const { error } = await getSupabaseClient()
    .from('notification_preferences')
    .upsert(
      { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) {
    console.error('[notificationPreferences] upsert error:', error.message);
    return false;
  }
  return true;
}
