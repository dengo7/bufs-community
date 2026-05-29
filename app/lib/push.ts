import { getSupabaseClient } from './supabase/client';

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPushPermissionState(): PushPermissionState {
  try {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('PushManager' in window) ||
      !('serviceWorker' in navigator)
    ) {
      return 'unsupported';
    }
    return Notification.permission as PushPermissionState;
  } catch (err) {
    console.error('[push] getPushPermissionState error:', err);
    return 'unsupported';
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch (err) {
    console.error('[push] isPushSubscribed error:', err);
    return false;
  }
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });

    const json = sub.toJSON();
    const endpoint = json.endpoint!;
    const p256dh = (json.keys as Record<string, string>).p256dh;
    const auth = (json.keys as Record<string, string>).auth;

    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[push] subscribeToPush: no authenticated user');
      return false;
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('[push] subscribeToPush upsert error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[push] subscribeToPush error:', err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push] unsubscribeFromPush delete error:', error);
    }

    await sub.unsubscribe();
    return true;
  } catch (err) {
    console.error('[push] unsubscribeFromPush error:', err);
    return false;
  }
}
