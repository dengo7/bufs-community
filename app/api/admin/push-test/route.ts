import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getFirebaseMessaging } from '../../../lib/firebaseAdmin';

/**
 * 관리자 전용 — 테스트 푸시 1통을 "내 기기들"(로그인한 관리자 본인의 push_tokens)에만 보낸다.
 *
 * POST { delaySeconds?: 0 | 5 }
 *  - 관리자 확인은 서버에서(쿠키 세션 → profiles.role = 'admin'). 그 외는 401/403.
 *  - delaySeconds=5 면 서버에서 5초 기다린 뒤 보낸다 → 그 사이 앱을 끄거나 홈으로 나가 백그라운드 수신을 확인.
 *    (클라이언트에서 기다리면 앱이 백그라운드로 가는 순간 JS가 멈춰 발송이 안 되므로 서버에서 기다린다)
 *  - 결과: 기기별 성공 여부와 FCM 에러 코드·메시지 원문. 토큰은 앞 8자리만 돌려준다.
 *  - DB 쓰기 없음(죽은 토큰도 지우지 않고 결과로만 보여준다).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_DELAY_SECONDS = 10;

type TokenRow = { token: string; platform: string | null; lang: string | null; last_seen_at: string | null };

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  // ── 관리자 확인 (서버) ─────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: '로그인이 필요해요' }, 401);
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return json({ ok: false, error: '관리자만 사용할 수 있어요' }, 403);

  let delaySeconds = 0;
  try {
    const body = (await request.json()) as { delaySeconds?: unknown };
    const n = Number(body?.delaySeconds);
    if (Number.isFinite(n)) delaySeconds = Math.min(MAX_DELAY_SECONDS, Math.max(0, Math.round(n)));
  } catch {
    // 본문 없음 → 바로 발송
  }

  // ── 내 기기 토큰 ───────────────────────────────────────────────────
  const { data: rows, error: tokenError } = await serviceClient()
    .from('push_tokens')
    .select('token, platform, lang, last_seen_at')
    .eq('user_id', user.id);
  if (tokenError) {
    return json({ ok: false, error: `push_tokens 조회 실패: ${tokenError.code ?? ''} ${tokenError.message}` }, 500);
  }
  const tokens = (rows ?? []) as TokenRow[];
  if (!tokens.length) {
    return json({ ok: false, devices: 0, error: '이 계정에 등록된 기기가 없어요 (먼저 "권한 요청 테스트"로 토큰을 저장하세요)' });
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return json({ ok: false, devices: tokens.length, error: 'FCM 미설정 — FIREBASE_SERVICE_ACCOUNT_JSON 이 없거나 해석할 수 없어요' }, 500);
  }

  if (delaySeconds) await new Promise(r => setTimeout(r, delaySeconds * 1000));

  // ── 발송 ───────────────────────────────────────────────────────────
  try {
    const res = await messaging.sendEachForMulticast({
      tokens: tokens.map(t => t.token),
      notification: { title: 'The Well', body: '테스트 알림입니다' },
      data: { url: '/notices', type: 'test' },
      apns: { payload: { aps: { sound: 'default' } } },
      android: { priority: 'high', notification: { sound: 'default' } },
    });

    const results = res.responses.map((r, i) => ({
      device: `${tokens[i].token.slice(0, 8)}…`,
      platform: tokens[i].platform,
      lastSeenAt: tokens[i].last_seen_at,
      ok: r.success,
      messageId: r.messageId ?? null,
      error: r.error ? `${r.error.code}: ${r.error.message}` : null,
    }));

    return json({
      ok: res.successCount > 0,
      devices: tokens.length,
      sent: res.successCount,
      failed: res.failureCount,
      delaySeconds,
      sentAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    return json({ ok: false, devices: tokens.length, delaySeconds, error: `발송 실패: ${e.code ? `${e.code}: ` : ''}${e.message}` }, 500);
  }
}
