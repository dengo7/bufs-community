-- ============================================================
-- 018_push_tokens.sql
-- 앱 푸시(FCM) 기기 토큰 / 알림 구독 설정 / 공지 발송 이력
--
-- 적용 방법: Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여 넣고 Run.
-- 멱등성 보장(두 번 실행해도 무해):
--   create table if not exists / add column if not exists
--   drop policy if exists → create policy
--
-- 이 마이그레이션을 적용하기 전에도 웹·앱 화면은 깨지지 않는다.
-- (클라이언트는 테이블이 없으면 기본값으로 동작하고, 서버 발송 라우트는
--  push_tokens 조회 실패를 "보낼 기기 없음"으로 처리한다.)
-- ============================================================


-- ============================================================
-- 1. push_tokens — 기기별 FCM 토큰
--    "기기 = 토큰 = 언어" 로 본다. 앱 실행 시마다 upsert(onConflict token) 되어
--    user_id(기기 공유·계정 전환), lang(언어 변경), last_seen_at 이 갱신된다.
-- ============================================================
create table if not exists public.push_tokens (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  token        text        not null unique,
  platform     text        not null check (platform in ('ios', 'android')),
  lang         text        not null default 'en' check (lang in ('ko', 'en', 'zh', 'ja')),
  app_version  text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
-- ↑ token UNIQUE 는 app/lib/nativePush.ts 의 upsert(onConflict: 'token') 전제

create index if not exists push_tokens_user_id_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
  on public.push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

-- upsert 는 같은 token 행의 user_id 를 현재 사용자로 바꿀 수 있어야 한다
-- (기기 공유·계정 전환). 그래서 using 은 제한하지 않고 with check 만 본인으로 묶는다.
drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
  on public.push_tokens for update
  using (true)
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- 발송(service_role)은 RLS 를 우회하므로 별도 정책 불필요.


-- ============================================================
-- 2. notification_preferences — 알림 종류별 on/off
--    행이 없으면 전부 켜짐(true)으로 본다.
-- ============================================================
create table if not exists public.notification_preferences (
  user_id         uuid        primary key references public.profiles(id) on delete cascade,
  notice_academic boolean     not null default true,   -- 학사 공지
  notice_global   boolean     not null default true,   -- 국제교류 공지
  community       boolean     not null default true,   -- 댓글·답글
  updated_at      timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
  on public.notification_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 3. notices.pushed_at — 공지 푸시 발송 이력
--    null 이면 아직 발송 전. /api/push/notices 가 발송 후 now() 로 채운다.
--    기존 공지는 전부 발송 완료로 표시해, 컬럼 추가 직후 과거 공지가
--    한꺼번에 발송되는 사고를 막는다.
-- ============================================================
alter table public.notices add column if not exists pushed_at timestamptz;

update public.notices set pushed_at = now() where pushed_at is null;

create index if not exists notices_pushed_at_null_idx
  on public.notices (created_at)
  where pushed_at is null;
