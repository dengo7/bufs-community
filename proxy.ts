import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims()는 로컬에서 JWT를 검증(네트워크 왕복 없음)하고,
  // 토큰이 만료됐을 때만 내부의 getSession()이 refresh token으로
  // 자동 재발급을 트리거해 쿠키를 갱신한다.
  // → 화면 전환마다 Auth 서버를 호출하던 getUser()를 대체.
  // (비대칭 서명키 사용 시 완전 로컬 검증. 레거시 HS256이면 내부적으로
  //  getUser()로 폴백하므로, 성능 이득을 위해서는 대시보드에서
  //  비대칭 JWT signing key로 전환 필요.)
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
