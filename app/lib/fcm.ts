// 서버 전용 — FCM 발송 공통 로직.
// /api/push (댓글·답글) 와 /api/push/notices (공지) 가 함께 쓴다. (route.ts 에서만 import 할 것)
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { getFirebaseMessaging } from './firebaseAdmin';

export type PushLang = 'ko' | 'en' | 'zh' | 'ja';
export const PUSH_LANGS: readonly PushLang[] = ['ko', 'en', 'zh', 'ja'];

export type PushTokenRow = { token: string; lang: string; user_id: string };

export type PushText = { title: string; body: string };

export type SendSummary = { sent: number; failed: number; removed: number; configured: boolean };

/** 받는 사람 언어로 정규화(알 수 없으면 en). */
export function toPushLang(lang: string | null | undefined): PushLang {
  return PUSH_LANGS.includes(lang as PushLang) ? (lang as PushLang) : 'en';
}

// FCM 이 "이 토큰은 더 이상 유효하지 않다"고 알려주는 코드 → 행 삭제
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

const MULTICAST_LIMIT = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * 토큰 목록에 언어별 문구로 발송한다.
 *  - tokens 를 lang 별로 묶어 buildText(lang) 결과를 보낸다.
 *  - 죽은 토큰은 push_tokens 에서 지운다.
 *  - FCM 미설정(서비스 계정 없음)이면 configured:false 로 돌려주고 아무것도 보내지 않는다.
 *
 * collapseKey: 같은 키의 알림은 기기에서 하나로 접힌다(공지 묶음용).
 */
export async function sendFcmToTokens(
  admin: SupabaseClient,
  tokens: PushTokenRow[],
  buildText: (lang: PushLang) => PushText,
  data: Record<string, string>,
  options: { collapseKey?: string } = {}
): Promise<SendSummary> {
  const summary: SendSummary = { sent: 0, failed: 0, removed: 0, configured: true };
  if (!tokens.length) return summary;

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    summary.configured = false;
    return summary;
  }

  const byLang = new Map<PushLang, string[]>();
  for (const row of tokens) {
    const lang = toPushLang(row.lang);
    const list = byLang.get(lang) ?? [];
    list.push(row.token);
    byLang.set(lang, list);
  }

  const dead: string[] = [];

  for (const [lang, list] of byLang) {
    const text = buildText(lang);
    for (const part of chunk(list, MULTICAST_LIMIT)) {
      const message: MulticastMessage = {
        tokens: part,
        notification: { title: text.title, body: text.body },
        data,
        apns: {
          headers: options.collapseKey ? { 'apns-collapse-id': options.collapseKey } : undefined,
          payload: {
            aps: {
              sound: 'default',
              ...(options.collapseKey ? { threadId: options.collapseKey } : {}),
            },
          },
        },
        android: {
          collapseKey: options.collapseKey,
          priority: 'high',
          notification: { sound: 'default' },
        },
      };

      try {
        const res = await messaging.sendEachForMulticast(message);
        summary.sent += res.successCount;
        summary.failed += res.failureCount;
        res.responses.forEach((r, i) => {
          const code = r.error?.code;
          if (code && DEAD_TOKEN_CODES.has(code)) dead.push(part[i]);
          else if (r.error) console.error('[fcm] send error:', code ?? r.error.message);
        });
      } catch (err) {
        summary.failed += part.length;
        console.error('[fcm] multicast error:', (err as Error).message);
      }
    }
  }

  if (dead.length) {
    const { error } = await admin.from('push_tokens').delete().in('token', dead);
    if (error) console.error('[fcm] dead token cleanup error:', error.message);
    else summary.removed = dead.length;
  }

  return summary;
}

/**
 * 받는 사람들의 토큰을 읽는다. push_tokens 테이블이 아직 없으면(018 미적용)
 * 빈 배열을 돌려줘 호출부가 "보낼 기기 없음"으로 지나가게 한다.
 */
export async function fetchTokensForUsers(admin: SupabaseClient, userIds: string[]): Promise<PushTokenRow[]> {
  if (!userIds.length) return [];
  const { data, error } = await admin
    .from('push_tokens')
    .select('token, lang, user_id')
    .in('user_id', userIds);
  if (error) {
    console.error('[fcm] fetch push_tokens error:', error.message);
    return [];
  }
  return (data ?? []) as PushTokenRow[];
}

export type PreferenceRow = {
  user_id: string;
  notice_academic: boolean;
  notice_global: boolean;
  community: boolean;
};

/** 설정 행이 없는 사용자는 전부 켜짐으로 본다. 테이블이 없어도 같은 결과. */
export async function fetchPreferences(admin: SupabaseClient, userIds: string[]): Promise<Map<string, PreferenceRow>> {
  const map = new Map<string, PreferenceRow>();
  if (!userIds.length) return map;
  const { data, error } = await admin
    .from('notification_preferences')
    .select('user_id, notice_academic, notice_global, community')
    .in('user_id', userIds);
  if (error) {
    console.error('[fcm] fetch notification_preferences error:', error.message);
    return map;
  }
  for (const row of (data ?? []) as PreferenceRow[]) map.set(row.user_id, row);
  return map;
}
