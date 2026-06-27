import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseServerClient } from '../../lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const REASON_LABELS: Record<string, string> = {
  spam:    '스팸 / 광고',
  hate:    '욕설 / 혐오 표현',
  obscene: '음란물',
  privacy: '개인정보 노출',
  other:   '기타',
};

// HTML 인젝션 방지 — 이메일 본문에 들어가는 사용자 값 escape
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: NextRequest) {
  try {
    // 인증 확인 — 로그인한 사용자만 신고 가능
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { target_type, target_id, reason } = body;

    // 신고자 ID는 클라이언트 입력이 아닌 세션에서 신뢰
    const reporterId = user.id;
    const safeTargetId = escapeHtml(target_id);

    await resend.emails.send({
      from: 'The Well <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL!,
      subject: `[The Well] 새 신고가 접수됐어요`,
      html: `
        <h2>새 신고가 접수됐어요</h2>
        <table>
          <tr><td><b>신고 유형</b></td><td>${target_type === 'post' ? '게시글' : '댓글'}</td></tr>
          <tr><td><b>대상 ID</b></td><td>${safeTargetId}</td></tr>
          <tr><td><b>신고 사유</b></td><td>${escapeHtml(REASON_LABELS[reason] ?? reason)}</td></tr>
          <tr><td><b>신고자 ID</b></td><td>${escapeHtml(reporterId)}</td></tr>
        </table>
        <p><a href="https://bufs-community.vercel.app/post/${encodeURIComponent(String(target_id ?? ''))}">게시글 바로가기</a></p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[report-notify]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
