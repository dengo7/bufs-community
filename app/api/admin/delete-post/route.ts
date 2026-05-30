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

  const { postId } = body as { postId?: unknown };

  if (!postId || typeof postId !== 'string' || postId.trim() === '') {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }

  // C: service_role 클라이언트 생성 (검증 통과 후에만)
  const admin = getSupabaseAdmin();

  // 1) notifications 삭제
  const { error: notifError } = await admin
    .from('notifications')
    .delete()
    .eq('post_id', postId);
  if (notifError) {
    return NextResponse.json({ error: notifError.message }, { status: 500 });
  }

  // 2) likes 삭제
  const { error: likesError } = await admin
    .from('likes')
    .delete()
    .eq('post_id', postId);
  if (likesError) {
    return NextResponse.json({ error: likesError.message }, { status: 500 });
  }

  // 3) comments 삭제
  const { error: commentsError } = await admin
    .from('comments')
    .delete()
    .eq('post_id', postId);
  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  // 4) post 삭제
  const { error: postError } = await admin
    .from('posts')
    .delete()
    .eq('id', postId);
  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedPostId: postId });
}
