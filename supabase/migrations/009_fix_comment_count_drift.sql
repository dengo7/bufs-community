-- ============================================================
-- 009_fix_comment_count_drift.sql
-- comment_count 음수/드리프트 수정
--   1) 트리거 감소 시 0 미만으로 내려가지 않도록 보강 (greatest)
--   2) 전체 재집계로 기존 음수 포함 모든 포스트 카운트 교정
-- 멱등성 보장: 여러 번 실행해도 안전
-- ============================================================


-- ── 1. 댓글 카운트 트리거 보강 (감소 시 0 하한) ──────────

create or replace function public.update_post_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.is_deleted = false then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;

  elsif tg_op = 'UPDATE' then
    if old.is_deleted = false and new.is_deleted = true then
      update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;

  elsif tg_op = 'DELETE' and old.is_deleted = false then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;


-- ── 2. 전체 재집계 (음수 포함 모든 포스트 카운트 교정) ────

update public.posts p set
  comment_count = (
    select count(*) from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  );
