-- ============================================================
-- BUFS Community — 초기 마이그레이션
-- Supabase 대시보드 SQL Editor에서 전체 복사 후 Run 클릭
-- ============================================================

-- 1. 기존 테이블 / 함수 정리 (idempotent)
drop table if exists public.posts    cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user()   cascade;
drop function if exists public.handle_updated_at() cascade;

-- ============================================================
-- 2. 공용 updated_at 자동 갱신 함수
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 3. profiles 테이블
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text unique not null,
  full_name   text,
  gender      text,
  nationality text,
  avatar_url  text,
  role        text not null default 'user'
              check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- 4. 회원가입 시 profile 자동 생성 트리거
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, full_name, gender, nationality)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      'user_' || substring(new.id::text, 1, 8)
    ),
    nullif(trim(new.raw_user_meta_data->>'full_name'),   ''),
    nullif(trim(new.raw_user_meta_data->>'gender'),      ''),
    nullif(trim(new.raw_user_meta_data->>'nationality'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. 기존 가입자 profiles 채워넣기
-- ============================================================
insert into public.profiles (id, nickname, full_name, gender, nationality)
select
  id,
  coalesce(
    nullif(trim(raw_user_meta_data->>'nickname'),    ''),
    'user_' || substring(id::text, 1, 8)
  ),
  nullif(trim(raw_user_meta_data->>'full_name'),   ''),
  nullif(trim(raw_user_meta_data->>'gender'),      ''),
  nullif(trim(raw_user_meta_data->>'nationality'), '')
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- 6. 내 계정 admin 설정
-- ============================================================
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'dengo12345@naver.com'
  limit 1
);

-- ============================================================
-- 7. posts 테이블
-- ============================================================
create table public.posts (
  id         uuid        primary key default gen_random_uuid(),
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  category   text        not null
             check (category in (
               'school-life', 'announcements', 'translation-help', 'visa',
               'housing', 'bank', 'telecom', 'insurance', 'medical', 'part-time'
             )),
  title      text        not null check (char_length(title)   between 1 and 200),
  content    text        not null check (char_length(content) between 1 and 10000),
  language   text        not null default 'kr'
             check (language in ('kr', 'en', 'cn', 'jp')),
  image_urls text[]      not null default '{}',
  view_count integer     not null default 0,
  is_deleted boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index posts_category_created_idx
  on public.posts (category, created_at desc)
  where is_deleted = false;

create index posts_author_id_idx
  on public.posts (author_id);

-- updated_at 트리거
create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.posts enable row level security;

create policy "posts_select"
  on public.posts for select
  using (is_deleted = false);

create policy "posts_insert"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "posts_update_own"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "posts_delete"
  on public.posts for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
