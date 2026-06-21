import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const REASON_LABELS: Record<string, string> = {
  spam:    '스팸 / 광고',
  hate:    '욕설 / 혐오 표현',
  obscene: '음란물',
  privacy: '개인정보 노출',
  other:   '기타',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target_type, target_id, reason, reporter_id } = body;

    await resend.emails.send({
      from: 'The Well <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL!,
      subject: `[The Well] 새 신고가 접수됐어요`,
      html: `
        <h2>새 신고가 접수됐어요</h2>
        <table>
          <tr><td><b>신고 유형</b></td><td>${target_type === 'post' ? '게시글' : '댓글'}</td></tr>
          <tr><td><b>대상 ID</b></td><td>${target_id}</td></tr>
          <tr><td><b>신고 사유</b></td><td>${REASON_LABELS[reason] ?? reason}</td></tr>
          <tr><td><b>신고자 ID</b></td><td>${reporter_id}</td></tr>
        </table>
        <p><a href="https://bufs-community.vercel.app/post/${target_id}">게시글 바로가기</a></p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[report-notify]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
