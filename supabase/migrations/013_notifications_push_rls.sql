-- ============================================================
-- 013_notifications_push_rls.sql
-- notifications / push_subscriptions 스키마 + RLS 이력 기록
--
-- ⚠️ 이미 Supabase 대시보드에서 생성·적용 완료된 상태를
--    코드베이스에 이력으로 남기기 위한 파일 (신규 DB 변경 목적 아님).
--    fresh DB 재구성 시에도 그대로 실행 가능하도록 작성.
--
-- 멱등성 보장:
--   create table if not exists / drop policy if exists → create
--   enable row level security 는 이미 켜져 있어도 무해(no-op)
-- ============================================================


-- ============================================================
-- 1. notifications
-- ============================================================
create table if not exists public.notifications (
  id           uuid        primary key default gen_random_uuid(),
  recipient_id uuid        not null references public.profiles(id) on delete cascade,
  actor_id     uuid        not null references public.profiles(id) on delete cascade,
  type         text        not null,
  post_id      uuid,
  comment_id   uuid,
  is_read      boolean     not null default false,
  created_at   timestamptz not null default now()
);
-- ↑ actor_id 의 FK 는 Postgres 기본 규칙상 'notifications_actor_id_fkey' 로 생성됨
--   (app/lib/notifications.ts 의 profiles!notifications_actor_id_fkey 임베드와 일치)

alter table public.notifications enable row level security;

-- 본인 수신 알림만 조회
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());

-- 본인 수신 알림만 수정 (읽음 처리 등)
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- 본인 수신 알림만 삭제
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- INSERT 정책 없음: 알림 생성은 서버(service_role) 또는 트리거에서만 수행.
-- authenticated 클라이언트는 알림을 직접 만들 수 없음.


-- ============================================================
-- 2. push_subscriptions
-- ============================================================
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  user_agent text,
  created_at timestamptz not null default now()
);
-- ↑ endpoint UNIQUE 는 app/lib/push.ts 의 upsert(onConflict: 'endpoint') 전제

alter table public.push_subscriptions enable row level security;

-- 본인 구독만 조회
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

-- 본인 명의로만 구독 추가
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

-- 본인 구독만 수정
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 본인 구독만 삭제
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
