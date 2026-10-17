-- ============================================================
-- 019_notification_triggers_record.sql
-- notifications 생성 트리거 + 푸시 웹훅 — 기록용
--
-- ⚠️ 이미 Supabase 대시보드에서 만들어져 운영 중인 설정을 코드베이스에
--    이력으로 남기기 위한 파일. 실제 DB 에 적용하지 않는다.
--
-- ⚠️ 함수 본문은 앱 동작(댓글 → 글쓴이에게 'comment', 답글 → 부모 댓글 작성자에게
--    'reply', 좋아요 → 글쓴이에게 'like', 본인 행동은 제외)에서 역산한 재구성이다.
--    대시보드의 실제 정의와 다를 수 있으므로, 아래 "실제 정의 확인" 쿼리로
--    뽑은 결과와 대조해 이 파일을 맞춰 두는 것을 권장한다.
--
-- 실제 정의 확인 (SQL Editor 에서 실행, 읽기 전용):
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--    where tgname in ('trg_notify_on_comment', 'trg_notify_on_like', 'push_on_notification');
--   select p.proname, pg_get_functiondef(p.oid) from pg_proc p
--    join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname like '%notify%';
-- ============================================================


-- ============================================================
-- 1. 댓글·답글 → notifications
-- ============================================================
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_type      text;
begin
  if new.parent_id is null then
    -- 글에 단 댓글 → 글쓴이에게
    select author_id into v_recipient from public.posts where id = new.post_id;
    v_type := 'comment';
  else
    -- 답글 → 부모 댓글 작성자에게
    select author_id into v_recipient from public.comments where id = new.parent_id;
    v_type := 'reply';
  end if;

  -- 본인 글/댓글에 단 것은 알리지 않음
  if v_recipient is null or v_recipient = new.author_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_recipient, new.author_id, v_type, new.post_id, new.id);

  return new;
end;
$$;

drop trigger if exists trg_notify_on_comment on public.comments;
create trigger trg_notify_on_comment
  after insert on public.comments
  for each row execute function public.notify_on_comment();


-- ============================================================
-- 2. 좋아요 → notifications (type = 'like')
--    /api/push 는 like 를 푸시하지 않는다(앱 안 알림 목록에만 표시).
-- ============================================================
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select author_id into v_recipient from public.posts where id = new.post_id;

  if v_recipient is null or v_recipient = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id)
  values (v_recipient, new.user_id, 'like', new.post_id);

  return new;
end;
$$;

drop trigger if exists trg_notify_on_like on public.likes;
create trigger trg_notify_on_like
  after insert on public.likes
  for each row execute function public.notify_on_like();


-- ============================================================
-- 3. notifications INSERT → /api/push 웹훅 (Database Webhooks)
--    대시보드 Database → Webhooks 에서 만든 것이며, 내부적으로는 아래와 같은
--    supabase_functions.http_request 트리거다. 페이로드는
--    { type: 'INSERT', table: 'notifications', record: {...}, old_record: null }.
--
--    <PUSH_WEBHOOK_SECRET> 자리에는 Vercel 환경변수 PUSH_WEBHOOK_SECRET 과 같은 값이
--    들어간다. 실제 값은 저장소에 적지 않는다.
-- ============================================================
-- drop trigger if exists push_on_notification on public.notifications;
-- create trigger push_on_notification
--   after insert on public.notifications
--   for each row
--   execute function supabase_functions.http_request(
--     'https://bufs-community.vercel.app/api/push',
--     'POST',
--     '{"Content-type":"application/json","x-webhook-secret":"<PUSH_WEBHOOK_SECRET>"}',
--     '{}',
--     '5000'
--   );
