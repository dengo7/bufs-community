import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const runtime = 'nodejs';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  // A: 쿠키 기반 SSR 클라이언트로 로그인 유저 확인
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // B: profiles.role = 'admin' 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, action } = body as { userId?: unknown; action?: unknown };

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (action !== 'ban' && action !== 'unban') {
    return NextResponse.json({ error: "action must be 'ban' or 'unban'" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
  }

  // C: service_role 클라이언트 생성 (검증 통과 후에만)
  const admin = getSupabaseAdmin();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: action === 'ban' ? '876000h' : 'none',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, banned: action === 'ban' });
}
