import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // 코드 교환 후 이동할 내부 경로 (비밀번호 재설정 등).
  // 내부 절대 경로만 허용해 open redirect를 방지한다.
  const nextParam = searchParams.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // 코드가 없거나 교환에 실패한 경우(만료된 링크 등):
  // 재설정 플로우면 목적지 페이지로 보내 세션 부재 → 만료 안내를 띄우게 한다.
  if (next !== '/') return NextResponse.redirect(`${origin}${next}`);

  return NextResponse.redirect(`${origin}/auth?error=oauth_error`);
}
