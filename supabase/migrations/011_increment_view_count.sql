-- ============================================================
-- 011_increment_view_count.sql
-- 조회수(view_count) 원자적 증가 RPC
--   기존: 클라이언트에서 read-modify-write (동시 조회 시 덮어쓰기 발생)
--   변경: DB 단일 UPDATE로 원자적 증가
-- 멱등성 보장: create or replace 로 여러 번 실행해도 안전
-- ============================================================

create or replace function public.increment_view_count(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
     set view_count = view_count + 1
   where id = p_id;
$$;

-- 익명/로그인 사용자 모두 조회수 증가 가능
grant execute on function public.increment_view_count(uuid) to anon, authenticated;
