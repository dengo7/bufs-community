import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * FIREBASE_SERVICE_ACCOUNT_JSON 환경변수 점검용.
 *
 * 값 자체는 절대 응답·로그에 내보내지 않는다. 돌려주는 것은
 *   configured    환경변수가 비어 있지 않은지
 *   format        'json'(원문 JSON) | 'base64'(base64로 감싼 JSON) | null(해석 실패)
 *   validJson     JSON 객체로 파싱됐는지
 *   hasProjectId  project_id 가 비어 있지 않은 문자열인지
 * 네 가지 불리언/라벨뿐이다.
 *
 * 인증: x-webhook-secret 헤더(PUSH_WEBHOOK_SECRET) 또는 관리자 로그인 세션.
 */

type CheckResult = {
  configured: boolean;
  format: 'json' | 'base64' | null;
  validJson: boolean;
  hasProjectId: boolean;
};

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return v !== null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function inspect(raw: string | undefined): CheckResult {
  const value = raw?.trim() ?? '';
  if (!value) return { configured: false, format: null, validJson: false, hasProjectId: false };

  let parsed = tryParse(value);
  let format: CheckResult['format'] = parsed ? 'json' : null;

  if (!parsed) {
    // Vercel 등에서 base64 로 감싸 넣는 경우도 허용
    try {
      parsed = tryParse(Buffer.from(value, 'base64').toString('utf8'));
      if (parsed) format = 'base64';
    } catch {
      parsed = null;
    }
  }

  const projectId = parsed?.project_id;
  return {
    configured: true,
    format,
    validJson: parsed !== null,
    hasProjectId: typeof projectId === 'string' && projectId.trim() !== '',
  };
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const expected = process.env.PUSH_WEBHOOK_SECRET?.trim();
  const given = (
    request.headers.get('x-webhook-secret') ??
    request.headers.get('authorization')?.replace('Bearer ', '')
  )?.trim();
  if (expected && given && given === expected) return true;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return profile?.role === 'admin';
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(inspect(process.env.FIREBASE_SERVICE_ACCOUNT_JSON), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
