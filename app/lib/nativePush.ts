// 앱(Capacitor) 푸시 — FCM 기기 토큰 등록·정리.
//
// 동작 조건: iOS 네이티브 앱이면서 PushNotifications 플러그인이 들어 있는 빌드.
//  - 웹 브라우저: isNativePushSupported() 가 false → 아무 일도 하지 않는다.
//  - 플러그인이 없는 구버전 앱: isPluginAvailable 이 false → 아무 일도 하지 않는다.
//  - Android: google-services.json 이 아직 없어 register() 가 실패하므로 막아 둔다.
//    (다음 단계에서 'android' 를 허용 목록에 추가)
//
// 토큰은 push_tokens 에 upsert(onConflict token) 된다. "기기 = 토큰 = 언어".
import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from './supabase/client';
import { getLang, type UILang } from './lang';

const TOKEN_KEY = 'the-well-push-token';
const ENABLED_PLATFORMS: readonly string[] = ['ios'];
const REGISTER_TIMEOUT_MS = 15_000;

export type NativePushPermission = 'granted' | 'denied' | 'prompt';

export function isNativePushSupported(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      Capacitor.isNativePlatform() &&
      ENABLED_PLATFORMS.includes(Capacitor.getPlatform()) &&
      Capacitor.isPluginAvailable('PushNotifications')
    );
  } catch {
    return false;
  }
}

async function plugin() {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return PushNotifications;
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage 를 못 써도 등록 자체는 진행한다
  }
}

export async function getNativePushPermission(): Promise<NativePushPermission> {
  try {
    const { receive } = await (await plugin()).checkPermissions();
    if (receive === 'granted') return 'granted';
    if (receive === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.error('[nativePush] checkPermissions error:', err);
    return 'denied';
  }
}

/** 토큰을 push_tokens 에 저장(갱신). 로그인 상태가 아니면 false. */
async function saveToken(token: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform: Capacitor.getPlatform(),
        lang: getLang(),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
  if (error) {
    // 018 미적용(테이블 없음) 등 — 화면은 깨지지 않게 로그만 남긴다
    console.error('[nativePush] upsert push_tokens error:', error.message);
    return false;
  }
  storeToken(token);
  return true;
}

/**
 * register() 를 호출하고 'registration' 이벤트로 받은 토큰을 저장한다.
 * 권한은 미리 받아 두어야 한다(requestPermissions 는 enableNativePush 가 한다).
 */
async function registerAndSave(): Promise<boolean> {
  const push = await plugin();

  let finish: (v: string | null) => void = () => {};
  const result = new Promise<string | null>(resolve => {
    let done = false;
    finish = v => { if (!done) { done = true; resolve(v); } };
  });
  const timer = setTimeout(() => finish(null), REGISTER_TIMEOUT_MS);

  // 한 번만 쓰는 리스너 — 결과가 정해지면 정리
  const okHandle = await push.addListener('registration', t => finish(t.value));
  const errHandle = await push.addListener('registrationError', e => {
    console.error('[nativePush] registrationError:', e.error);
    finish(null);
  });

  try {
    await push.register();
  } catch (err) {
    console.error('[nativePush] register error:', err);
    finish(null);
  }

  const token = await result;
  clearTimeout(timer);
  okHandle.remove();
  errHandle.remove();

  if (!token) return false;
  return saveToken(token);
}

/** 설정 화면·안내 시트에서 "알림 켜기" — 권한 요청 후 등록. */
export async function enableNativePush(): Promise<{ ok: boolean; permission: NativePushPermission }> {
  try {
    const push = await plugin();
    let { receive } = await push.checkPermissions();
    if (receive !== 'granted' && receive !== 'denied') {
      receive = (await push.requestPermissions()).receive;
    }
    if (receive !== 'granted') {
      return { ok: false, permission: receive === 'denied' ? 'denied' : 'prompt' };
    }
    const ok = await registerAndSave();
    return { ok, permission: 'granted' };
  } catch (err) {
    console.error('[nativePush] enableNativePush error:', err);
    return { ok: false, permission: 'denied' };
  }
}

/** 설정 화면에서 "알림 끄기" — 이 기기의 토큰 행 삭제. */
export async function disableNativePush(): Promise<boolean> {
  const token = storedToken();
  try {
    if (token) {
      const { error } = await getSupabaseClient().from('push_tokens').delete().eq('token', token);
      if (error) console.error('[nativePush] delete push_tokens error:', error.message);
    }
    storeToken(null);
    try { await (await plugin()).unregister(); } catch { /* 선택 사항 */ }
    return true;
  } catch (err) {
    console.error('[nativePush] disableNativePush error:', err);
    return false;
  }
}

/** 이 기기에서 켜져 있는지 — 권한 + 저장된 토큰 + DB 행 존재. */
export async function isNativePushEnabled(): Promise<boolean> {
  const token = storedToken();
  if (!token) return false;
  if ((await getNativePushPermission()) !== 'granted') return false;
  const { data, error } = await getSupabaseClient()
    .from('push_tokens')
    .select('id')
    .eq('token', token)
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

/**
 * 앱 실행·로그인 직후 — 이 기기에서 이미 켜 둔 상태라면 조용히 다시 등록해
 * 토큰·언어·last_seen_at 을 갱신한다. 켜 둔 적이 없으면 아무것도 하지 않는다.
 */
export async function syncNativePushOnLaunch(): Promise<void> {
  if (!isNativePushSupported()) return;
  if (!storedToken()) return;
  if ((await getNativePushPermission()) !== 'granted') return;
  await registerAndSave().catch(err => console.error('[nativePush] sync error:', err));
}

/** 언어 변경 시 — 토큰 행의 lang 갱신. */
export async function updateNativePushLang(lang: UILang): Promise<void> {
  const token = storedToken();
  if (!isNativePushSupported() || !token) return;
  const { error } = await getSupabaseClient()
    .from('push_tokens')
    .update({ lang })
    .eq('token', token);
  if (error) console.error('[nativePush] update lang error:', error.message);
}

/**
 * 로그아웃 직전 — 이 기기의 토큰 행을 지워 다음 사용자에게 알림이 가지 않게 한다.
 * (signOut 전에 호출해야 RLS 로 본인 행을 지울 수 있다.)
 * localStorage 의 토큰은 남겨 두어, 같은 기기에서 다시 로그인하면 자동으로 재등록된다.
 */
export async function removeNativePushTokenForLogout(): Promise<void> {
  const token = storedToken();
  if (!isNativePushSupported() || !token) return;
  const { error } = await getSupabaseClient().from('push_tokens').delete().eq('token', token);
  if (error) console.error('[nativePush] logout cleanup error:', error.message);
}

/** 알림을 탭해 앱이 열렸을 때 — data.url 로 이동. 해제 함수를 돌려준다. */
export async function listenNativePushActions(onUrl: (url: string) => void): Promise<() => void> {
  if (!isNativePushSupported()) return () => {};
  const push = await plugin();
  const handle = await push.addListener('pushNotificationActionPerformed', action => {
    const url = (action.notification.data as Record<string, unknown> | undefined)?.url;
    if (typeof url === 'string' && url.startsWith('/')) onUrl(url);
  });
  return () => { handle.remove(); };
}
