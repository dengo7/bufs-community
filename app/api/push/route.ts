import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

export const runtime = 'nodejs';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

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

export async function POST(request: NextRequest) {
  // 인증
  const secret =
    request.headers.get('x-webhook-secret') ??
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
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

  const supabase = getSupabaseAdmin();

  // 구독 목록 조회
  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', record.recipient_id);

  if (subError) {
    console.error('[push/route] fetch subscriptions error:', subError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!subs || subs.length === 0) {
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

  const { title, body: msgBody } = buildMessage(record.type as string, nickname);
  const url = record.post_id ? `/post/${record.post_id}` : '/notifications';
  const tag = record.post_id ? `post-${record.post_id}` : `notif-${record.id}`;
  const payload = JSON.stringify({ title, body: msgBody, url, tag });

  // 병렬 발송
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
          console.log('[push/route] removed expired subscription:', sub.endpoint);
        } else {
          console.error('[push/route] sendNotification error:', err);
        }
        throw err;
      }
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ sent, failed, skipped: false });
}
