// 앱(Capacitor) 푸시 — FCM 기기 토큰 등록·정리.
//
// 동작 조건: iOS 네이티브 앱이면서 PushNotifications 플러그인이 들어 있는 빌드.
//  - 웹 브라우저: isNativePushSupported() 가 false → 아무 일도 하지 않는다.
//  - 플러그인이 없는 구버전 앱: isPluginAvailable 이 false → 아무 일도 하지 않는다.
//  - Android: google-services.json 이 아직 없어 register() 가 실패하므로 막아 둔다.
//    (다음 단계에서 'android' 를 허용 목록에 추가)
//
// 토큰은 register_push_token() (022) 으로 push_tokens 에 저장된다. "기기 = 토큰 = 언어".
// 같은 기기에서 계정이 바뀌어도 함수가 토큰 주인을 지금 로그인한 사용자로 옮긴다.
import { Capacitor } from '@capacitor/core';
import type { PushNotificationsPlugin } from '@capacitor/push-notifications';
import { getSupabaseClient } from './supabase/client';
import { getLang, type UILang } from './lang';
import { removeWebPushSubscriptionForLogout } from './push';

const TOKEN_KEY = 'the-well-push-token';
const ENABLED_PLATFORMS: readonly string[] = ['ios'];
const REGISTER_TIMEOUT_MS = 15_000;
const PERMISSION_TIMEOUT_MS = 8_000;

/** 'unknown' = 권한 상태를 확인하지 못함(에러·시간 초과). 거부(denied)와 구분한다. */
export type NativePushPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

// ── 권한 안내 시트 "나중에" 기록 (PushPromptSheet·진단 카드 공용) ─────────
export const PUSH_PROMPT_DISMISS_KEY = 'the-well-push-prompt-dismissed-at';

export function pushPromptDismissedAt(): number | null {
  try {
    const at = Number(localStorage.getItem(PUSH_PROMPT_DISMISS_KEY));
    return Number.isFinite(at) && at > 0 ? at : null;
  } catch {
    return null;
  }
}

/** "나중에"를 누르면 이 기간 동안 시트를 다시 띄우지 않는다 */
export const PUSH_PROMPT_DISMISS_DAYS = 30;

export function pushPromptDismissedRecently(): boolean {
  const at = pushPromptDismissedAt();
  return at !== null && Date.now() - at < PUSH_PROMPT_DISMISS_DAYS * 86_400_000;
}

export function markPushPromptDismissed(): void {
  try { localStorage.setItem(PUSH_PROMPT_DISMISS_KEY, String(Date.now())); } catch { /* 무시 */ }
}

export function clearPushPromptDismissed(): void {
  try { localStorage.removeItem(PUSH_PROMPT_DISMISS_KEY); } catch { /* 무시 */ }
}

/** 에러를 'denied' 등으로 바꾸지 않고 원문 그대로 문자열로 (Capacitor 에러의 code·data 포함) */
export function nativePushErrorText(err: unknown): string {
  if (err instanceof Error) {
    const extra = err as Error & { code?: unknown; data?: unknown };
    const parts = [`${err.name}: ${err.message}`];
    if (extra.code !== undefined) parts.push(`code=${JSON.stringify(extra.code)}`);
    if (extra.data !== undefined) parts.push(`data=${JSON.stringify(extra.data)}`);
    return parts.join(' | ');
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: ${ms / 1000}초 동안 응답 없음`)), ms)),
  ]);
}

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

/**
 * 플러그인을 { push } 로 감싸서 돌려준다.
 * ⚠️ Capacitor 플러그인 객체는 Proxy라 어떤 속성이든 함수를 돌려준다 — 'then' 도 마찬가지라 thenable 로 보인다.
 * async 함수에서 플러그인을 그대로 return 하면 Promise 가 그 'then' 을 호출하고
 * ("PushNotifications.then()" is not implemented on ios) resolve 되지 않아 await 가 영원히 멈춘다.
 * 그래서 반드시 객체로 감싸서 반환한다.
 */
async function plugin(): Promise<{ push: PushNotificationsPlugin }> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return { push: PushNotifications };
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

const toPermission = (receive: string): NativePushPermission =>
  receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'prompt';

/** 권한 상태 + (확인 실패 시) 에러 원문. 에러를 'denied' 로 바꾸지 않는다. */
export async function checkNativePushPermission(): Promise<{ permission: NativePushPermission; error?: string }> {
  try {
    const { push } = await plugin();
    const { receive } = await withTimeout(push.checkPermissions(), PERMISSION_TIMEOUT_MS, 'checkPermissions');
    return { permission: toPermission(receive) };
  } catch (err) {
    const error = nativePushErrorText(err);
    console.error('[nativePush] checkPermissions error:', error);
    return { permission: 'unknown', error };
  }
}

export async function getNativePushPermission(): Promise<NativePushPermission> {
  return (await checkNativePushPermission()).permission;
}

/** PostgREST: 함수가 없음(022 적용 전) */
const isMissingFunction = (error: { code?: string } | null) => error?.code === 'PGRST202' || error?.code === '42883';

/**
 * 토큰을 push_tokens 에 저장(갱신). 로그인 상태가 아니면 false.
 * register_push_token() 이 같은 토큰 행의 주인을 지금 사용자로 옮기고 언어·last_seen_at 을 갱신한다.
 * 022 적용 전(함수 없음)에는 예전처럼 직접 upsert 한다 — 본인 토큰 갱신은 그대로 되고,
 * 다른 사람 행이 남은 기기에서의 계정 전환만 예전처럼 실패한다.
 */
async function saveToken(token: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인 상태가 아님' };

  const platform = Capacitor.getPlatform();
  const lang = getLang();
  let { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: platform, p_lang: lang });
  if (isMissingFunction(error)) {
    ({ error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: user.id, token, platform, lang, last_seen_at: new Date().toISOString() },
        { onConflict: 'token' }
      ));
  }
  if (error) {
    // 018 미적용(테이블 없음) 등 — 화면은 깨지지 않게 로그만 남긴다
    console.error('[nativePush] register push token error:', error.message);
    return { ok: false, error: `push_tokens 저장 실패: ${error.code ?? ''} ${error.message}` };
  }
  storeToken(token);
  return { ok: true };
}

/** 단계별 결과를 알려 주는 콜백 (진단 카드의 "권한 요청 테스트"용) */
export type NativePushStep = (step: string, detail: string) => void;
const noStep: NativePushStep = () => {};

/**
 * register() 를 호출하고 'registration' 이벤트로 받은 토큰을 저장한다.
 * 권한은 미리 받아 두어야 한다(requestPermissions 는 enableNativePush 가 한다).
 */
async function registerAndSave(onStep: NativePushStep = noStep): Promise<{ ok: boolean; error?: string }> {
  const { push } = await plugin();

  let finish: (v: { token: string | null; error?: string }) => void = () => {};
  const result = new Promise<{ token: string | null; error?: string }>(resolve => {
    let done = false;
    finish = v => { if (!done) { done = true; resolve(v); } };
  });
  const timer = setTimeout(
    () => finish({ token: null, error: `registration 이벤트가 ${REGISTER_TIMEOUT_MS / 1000}초 안에 오지 않음` }),
    REGISTER_TIMEOUT_MS,
  );

  // 한 번만 쓰는 리스너 — 결과가 정해지면 정리
  const okHandle = await push.addListener('registration', t => finish({ token: t.value }));
  const errHandle = await push.addListener('registrationError', e => {
    console.error('[nativePush] registrationError:', e.error);
    finish({ token: null, error: `registrationError: ${e.error}` });
  });

  try {
    await push.register();
    onStep('register()', '호출 완료 — 토큰 기다리는 중');
  } catch (err) {
    const error = nativePushErrorText(err);
    console.error('[nativePush] register error:', error);
    finish({ token: null, error: `register() 실패: ${error}` });
  }

  const { token, error } = await result;
  clearTimeout(timer);
  okHandle.remove();
  errHandle.remove();

  if (!token) {
    onStep('토큰', `실패 — ${error}`);
    return { ok: false, error };
  }
  onStep('토큰', `받음 (${token.slice(0, 8)}… / ${token.length}자)`);
  const saved = await saveToken(token);
  onStep('push_tokens 저장', saved.ok ? '성공' : `실패 — ${saved.error}`);
  return saved;
}

/**
 * 설정 화면·안내 시트에서 "알림 켜기" — 권한 요청 후 등록.
 * 권한이 prompt 이거나 확인에 실패(unknown)했으면 requestPermissions() 를 직접 호출한다.
 * 실패해도 'denied' 로 바꾸지 않고 에러 원문을 error 로 돌려준다.
 */
export async function enableNativePush(
  onStep: NativePushStep = noStep,
): Promise<{ ok: boolean; permission: NativePushPermission; error?: string }> {
  try {
    const { push } = await plugin();
    onStep('플러그인', 'PushNotifications 불러옴');

    const checked = await checkNativePushPermission();
    onStep('checkPermissions()', checked.error ? `에러 — ${checked.error}` : checked.permission);

    let permission = checked.permission;
    if (permission === 'prompt' || permission === 'unknown') {
      try {
        const { receive } = await push.requestPermissions();
        permission = toPermission(receive);
        onStep('requestPermissions()', receive);
      } catch (err) {
        const error = nativePushErrorText(err);
        console.error('[nativePush] requestPermissions error:', error);
        onStep('requestPermissions()', `에러 — ${error}`);
        return { ok: false, permission: 'unknown', error: `requestPermissions() 실패: ${error}` };
      }
    }
    if (permission !== 'granted') {
      return { ok: false, permission };
    }

    const saved = await registerAndSave(onStep);
    return { ok: saved.ok, permission: 'granted', error: saved.error };
  } catch (err) {
    const error = nativePushErrorText(err);
    console.error('[nativePush] enableNativePush error:', error);
    onStep('enableNativePush', `에러 — ${error}`);
    return { ok: false, permission: 'unknown', error };
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
    try { await (await plugin()).push.unregister(); } catch { /* 선택 사항 */ }
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
  const r = await registerAndSave().catch(err => ({ ok: false, error: nativePushErrorText(err) }));
  if (!r.ok) console.error('[nativePush] sync error:', r.error);
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

/** 이 기기의 앱 토큰 행 삭제 (실패해도 던지지 않는다) */
async function removeNativeTokenRow(): Promise<void> {
  try {
    const token = storedToken();
    if (!isNativePushSupported() || !token) return;
    const { error } = await getSupabaseClient().from('push_tokens').delete().eq('token', token);
    if (error) console.error('[nativePush] logout cleanup error:', error.message);
  } catch (err) {
    console.error('[nativePush] logout cleanup error:', nativePushErrorText(err));
  }
}

const LOGOUT_CLEANUP_TIMEOUT_MS = 4_000;

/**
 * 로그아웃 직전 — 이 기기·브라우저로 다음 사용자에게 이전 사용자의 알림이 가지 않게 정리한다.
 *  - 앱: push_tokens 의 이 기기 토큰 행 삭제 (localStorage 토큰은 남겨, 같은 기기에서
 *    다시 로그인하면 자동으로 재등록된다)
 *  - 웹: 이 브라우저의 push_subscriptions 행 삭제 + 브라우저 구독 해지
 * signOut 전에 호출해야 RLS 로 본인 행을 지울 수 있다.
 * 실패하거나 느려도 로그아웃은 막지 않는다(최대 4초 기다리고 진행). 앱 토큰 정리가 실패해도
 * 다음 로그인 때 register_push_token() 이 토큰 주인을 새 사용자로 바로잡는다.
 */
export async function cleanupPushForLogout(): Promise<void> {
  const cleanup = Promise.allSettled([removeNativeTokenRow(), removeWebPushSubscriptionForLogout()]);
  await Promise.race([cleanup, new Promise(resolve => setTimeout(resolve, LOGOUT_CLEANUP_TIMEOUT_MS))]);
}

/**
 * @deprecated 예전 이름 — 지금은 웹 구독 정리까지 하는 cleanupPushForLogout 과 같다.
 * (호출부 app/my/page.tsx 는 다른 미커밋 작업이 있어 이번에 바꾸지 않았다. 다음에 이름을 맞출 것)
 */
export const removeNativePushTokenForLogout = cleanupPushForLogout;

/** 알림을 탭해 앱이 열렸을 때 — data.url 로 이동. 해제 함수를 돌려준다. */
export async function listenNativePushActions(onUrl: (url: string) => void): Promise<() => void> {
  if (!isNativePushSupported()) return () => {};
  const { push } = await plugin();
  const handle = await push.addListener('pushNotificationActionPerformed', action => {
    const url = (action.notification.data as Record<string, unknown> | undefined)?.url;
    if (typeof url === 'string' && url.startsWith('/')) onUrl(url);
  });
  return () => { handle.remove(); };
}
