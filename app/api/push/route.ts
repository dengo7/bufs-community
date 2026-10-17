import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import {
  fetchPreferences,
  fetchTokensForUsers,
  sendFcmToTokens,
  type PushLang,
  type PushText,
} from '../../lib/fcm';

export const runtime = 'nodejs';

/**
 * 댓글·답글 알림 푸시 — notifications INSERT 웹훅(push_on_notification)이 호출한다.
 *  1) 웹 푸시(push_subscriptions, VAPID) — 브라우저 사용자. 기존 동작 그대로.
 *  2) 앱 푸시(push_tokens, FCM) — 받는 사람의 community 설정이 켜져 있을 때만,
 *     기기 언어(push_tokens.lang)로 보낸다.
 * like 는 둘 다 보내지 않는다.
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } }
  );
}

// 웹 푸시(기존): 한국어 고정 문구
function buildMessage(type: string, nickname: string): { title: string; body: string } {
  const title = 'BUFS Community';
  if (type === 'comment') {
    return { title, body: `${nickname}님이 회원님의 글에 댓글을 남겼습니다` };
  }
  if (type === 'reply') {
    return { title, body: `${nickname}님이 회원님의 댓글에 답글을 남겼습니다` };
  }
  return { title, body: '새 알림이 도착했습니다.' };
}

// 앱 푸시: 받는 사람 언어
const FCM_T: Record<PushLang, { comment: (n: string) => string; reply: (n: string) => string }> = {
  ko: {
    comment: n => `${n}님이 회원님의 글에 댓글을 남겼습니다`,
    reply:   n => `${n}님이 회원님의 댓글에 답글을 남겼습니다`,
  },
  en: {
    comment: n => `${n} commented on your post`,
    reply:   n => `${n} replied to your comment`,
  },
  zh: {
    comment: n => `${n} 评论了你的帖子`,
    reply:   n => `${n} 回复了你的评论`,
  },
  ja: {
    comment: n => `${n}さんがあなたの投稿にコメントしました`,
    reply:   n => `${n}さんがあなたのコメントに返信しました`,
  },
};

function buildFcmText(type: 'comment' | 'reply', nickname: string): (lang: PushLang) => PushText {
  return lang => ({ title: 'The Well', body: FCM_T[lang][type](nickname) });
}

export async function POST(request: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );

  // 인증
  const secret = (
    request.headers.get('x-webhook-secret') ??
    request.headers.get('authorization')?.replace('Bearer ', '')
  )?.trim();

  if (secret !== process.env.PUSH_WEBHOOK_SECRET!.trim()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const record = body.record as Record<string, unknown> | undefined;
  if (!record) {
    return NextResponse.json({ error: 'Missing record' }, { status: 400 });
  }

  // like는 푸시 스킵
  if (record.type === 'like') {
    return NextResponse.json({ sent: 0, failed: 0, skipped: true });
  }

  if (record.type !== 'comment' && record.type !== 'reply') {
    return NextResponse.json({ sent: 0, failed: 0, skipped: true });
  }
  const type = record.type;
  const recipientId = String(record.recipient_id ?? '');
  if (!recipientId) {
    return NextResponse.json({ error: 'Missing recipient_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // 웹 푸시 구독 + 앱 토큰(받는 사람의 community 설정이 켜진 경우만)
  const [{ data: subs, error: subError }, tokensAll, prefs] = await Promise.all([
    supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', recipientId),
    fetchTokensForUsers(supabase, [recipientId]),
    fetchPreferences(supabase, [recipientId]),
  ]);

  if (subError) {
    console.error('[push/route] fetch subscriptions error:', subError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const communityOn = prefs.get(recipientId)?.community ?? true;
  const tokens = communityOn ? tokensAll : [];

  if ((!subs || subs.length === 0) && tokens.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: false });
  }

  // 발신자 닉네임 조회
  let nickname = '누군가';
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', record.actor_id)
    .single();
  if (profile?.nickname) nickname = profile.nickname;

  const url = record.post_id ? `/post/${record.post_id}` : '/notifications';
  const tag = record.post_id ? `post-${record.post_id}` : `notif-${record.id}`;

  // ── 1) 웹 푸시 ───────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  if (subs && subs.length > 0) {
    const { title, body: msgBody } = buildMessage(type, nickname);
    const payload = JSON.stringify({ title, body: msgBody, url, tag });

    const results = await Promise.allSettled(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            // 만료된 구독 삭제
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
            console.log('[push/route] removed expired subscription');
          } else {
            console.error('[push/route] sendNotification error:', err);
          }
          throw err;
        }
      })
    );
    sent = results.filter(r => r.status === 'fulfilled').length;
    failed = results.filter(r => r.status === 'rejected').length;
  }

  // ── 2) 앱 푸시(FCM) ──────────────────────────────────────
  const fcm = await sendFcmToTokens(
    supabase,
    tokens,
    buildFcmText(type, nickname),
    { url, type },
    { collapseKey: tag }
  );

  return NextResponse.json({ sent, failed, skipped: false, fcm });
}
