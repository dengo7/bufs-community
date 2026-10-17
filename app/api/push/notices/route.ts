import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPreferences,
  sendFcmToTokens,
  type PushLang,
  type PushText,
  type PushTokenRow,
} from '../../../lib/fcm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 새 공지 푸시 발송 — 크롤러(scripts/crawl-notices.mjs)가 실행 끝에 한 번 호출한다.
 *
 *  - notices.pushed_at is null 인 행을 읽어 소스(academic/global)별로 묶어 보낸다.
 *  - 보낸 뒤 pushed_at 을 채우므로 다시 호출해도 중복 발송이 없다.
 *  - 저장된 지 2일이 지난 미발송 공지는 보내지 않고 발송 완료로만 표시한다
 *    (장애 뒤 복구 시 과거 공지가 한꺼번에 가는 사고 방지).
 *  - 22:00~08:00(KST) 에는 보내지 않고 남겨 둔다 → 다음 아침 실행에서 묶여 나간다.
 *  - 받는 사람 언어(push_tokens.lang)별 제목 + 번역 제목(없으면 원문).
 *
 * 인증: x-webhook-secret 헤더 = PUSH_WEBHOOK_SECRET.
 */

type NoticeSource = 'academic' | 'global';

type NoticeRow = {
  id: string;
  source: NoticeSource;
  title: string;
  translations: { [lang: string]: { title?: string } | undefined } | null;
  created_at: string;
};

const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const QUIET_START_HOUR = 22; // KST
const QUIET_END_HOUR = 8;    // KST

const T: Record<PushLang, {
  academic: string;
  global: string;
  more: (first: string, rest: number) => string;
}> = {
  ko: {
    academic: '새 학사 공지',
    global: '새 국제교류처 공지',
    more: (first, rest) => `${first} 외 ${rest}건`,
  },
  en: {
    academic: 'New academic notice',
    global: 'New Global Affairs notice',
    more: (first, rest) => `${first} and ${rest} more`,
  },
  zh: {
    academic: '新学事公告',
    global: '新国际交流处公告',
    more: (first, rest) => `${first} 等${rest + 1}条`,
  },
  ja: {
    academic: '新しい学事のお知らせ',
    global: '新しい国際交流処のお知らせ',
    more: (first, rest) => `${first} 他${rest}件`,
  },
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } }
  );
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.PUSH_WEBHOOK_SECRET?.trim();
  const given = (
    request.headers.get('x-webhook-secret') ??
    request.headers.get('authorization')?.replace('Bearer ', '')
  )?.trim();
  return Boolean(expected && given && given === expected);
}

function kstHour(now = new Date()): number {
  return (now.getUTCHours() + 9) % 24;
}

function isQuietHours(now = new Date()): boolean {
  const h = kstHour(now);
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

function titleFor(n: NoticeRow, lang: PushLang): string {
  return (lang !== 'ko' && n.translations?.[lang]?.title) || n.title;
}

function buildText(source: NoticeSource, rows: NoticeRow[]): (lang: PushLang) => PushText {
  return lang => {
    const t = T[lang];
    const first = titleFor(rows[0], lang);
    return {
      title: `${source === 'academic' ? t.academic : t.global}${rows.length > 1 ? ` (${rows.length})` : ''}`,
      body: rows.length > 1 ? t.more(first, rows.length - 1) : first,
    };
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: pending, error: noticeError } = await admin
    .from('notices')
    .select('id, source, title, translations, created_at')
    .is('pushed_at', null)
    .order('created_at', { ascending: true })
    .limit(200);

  if (noticeError) {
    // 018 미적용(pushed_at 컬럼 없음) 포함 — 크롤러를 실패시키지 않도록 200 으로 알린다
    console.error('[push/notices] fetch notices error:', noticeError.message);
    return NextResponse.json({ ok: false, reason: 'notices query failed', skipped: true });
  }

  const rows = (pending ?? []) as NoticeRow[];
  if (!rows.length) {
    return NextResponse.json({ ok: true, pending: 0, sent: 0 });
  }

  if (isQuietHours()) {
    return NextResponse.json({ ok: true, pending: rows.length, deferred: true, reason: 'quiet hours' });
  }

  const now = Date.now();
  const stale = rows.filter(r => now - new Date(r.created_at).getTime() > MAX_AGE_MS);
  const fresh = rows.filter(r => now - new Date(r.created_at).getTime() <= MAX_AGE_MS);

  // 받는 기기 전체 + 설정
  const { data: tokenRows, error: tokenError } = await admin
    .from('push_tokens')
    .select('token, lang, user_id');
  if (tokenError) console.error('[push/notices] fetch push_tokens error:', tokenError.message);
  const tokens = (tokenRows ?? []) as PushTokenRow[];
  const prefs = await fetchPreferences(admin, [...new Set(tokens.map(t => t.user_id))]);

  const summary: Record<string, unknown> = { ok: true, pending: rows.length, stale: stale.length };

  for (const source of ['academic', 'global'] as const) {
    const group = fresh.filter(r => r.source === source);
    if (!group.length) continue;

    const prefKey = source === 'academic' ? 'notice_academic' : 'notice_global';
    const recipients = tokens.filter(t => prefs.get(t.user_id)?.[prefKey] ?? true);

    const result = await sendFcmToTokens(
      admin,
      recipients,
      buildText(source, group),
      { url: '/notices', source },
      { collapseKey: `notice-${source}` }
    );
    summary[source] = { notices: group.length, recipients: recipients.length, ...result };
  }

  // 보낸 것·오래된 것 모두 발송 완료로 표시
  const ids = rows.map(r => r.id);
  const { error: markError } = await admin
    .from('notices')
    .update({ pushed_at: new Date().toISOString() })
    .in('id', ids);
  if (markError) {
    console.error('[push/notices] mark pushed_at error:', markError.message);
    summary.markError = markError.message;
  }

  return NextResponse.json(summary);
}
