-- ============================================================
-- 022_push_tokens_register_rpc.sql
-- 앱 푸시 기기 토큰(push_tokens) 권한 수정 + 등록 함수
-- ⚠️ 아직 적용 전 — 018 이후 Supabase 대시보드 SQL Editor에서 실행. 여러 번 실행해도 안전.
--
-- 고치는 문제
--   1) 018의 UPDATE 정책이 using (true) 라서, 로그인한 사용자가 필터 없는 UPDATE로
--      다른 사람의 토큰 행을 자기 것으로 바꿀 수 있었다.
--      → UPDATE 는 본인 행만 (using / with check 모두 auth.uid() = user_id).
--   2) 같은 기기에서 계정이 바뀌면(이전 사용자의 행이 남은 상태) 클라이언트 upsert
--      (INSERT … ON CONFLICT DO UPDATE)가 RLS 에 막혀 새 사용자가 등록되지 못했다.
--      → 기기 토큰 등록은 register_push_token() 으로만 한다. 토큰을 가진 기기에서
--        로그인한 사용자가 그 토큰의 주인이 된다(이전 주인 행은 새 사용자로 이전).
--
-- 그대로인 것
--   · SELECT / INSERT / DELETE 정책 (본인 행만)
--   · 발송 서버(service_role)는 RLS 를 우회하므로 영향 없음
--   · 기존 행 데이터
-- ============================================================

-- 1. UPDATE 정책: 본인 행만
drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 2. 기기 토큰 등록 함수
--    앱(nativePush.ts)이 FCM 토큰을 받을 때마다 호출한다(앱 실행·로그인·알림 켜기).
--    같은 토큰 행이 있으면 주인·플랫폼·언어·last_seen_at 을 갱신하고, 없으면 새로 만든다.
--    토큰은 그 기기에서만 받을 수 있는 값이므로, 토큰을 제출한 로그인 사용자를 주인으로 본다.
create or replace function public.register_push_token(
  p_token    text,
  p_platform text,
  p_lang     text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_token is null or length(btrim(p_token)) = 0 or length(p_token) > 4096 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;

  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'invalid_platform' using errcode = '22023';
  end if;

  -- 018 의 push_tokens.lang CHECK 와 같은 값
  if p_lang is null or p_lang not in ('ko', 'en', 'zh', 'ja') then
    raise exception 'invalid_lang' using errcode = '22023';
  end if;

  insert into public.push_tokens as t (user_id, token, platform, lang, last_seen_at)
  values (v_uid, p_token, p_platform, p_lang, now())
  on conflict (token) do update
    set user_id      = excluded.user_id,
        platform     = excluded.platform,
        lang         = excluded.lang,
        last_seen_at = now();
end;
$$;

-- 실행 권한: 로그인 사용자만
revoke all on function public.register_push_token(text, text, text) from public;
revoke all on function public.register_push_token(text, text, text) from anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;
