-- ============================================================
-- 002_comments_likes.sql
-- comments, likes 테이블 + posts 카운트 컬럼 + 트리거
-- Supabase 대시보드 SQL Editor에서 전체 선택 후 실행
-- 멱등성 보장: 여러 번 실행해도 안전
-- ============================================================


-- ── 0. 이전 시도로 잘못 생성된 테이블 정리 ───────────────
-- comments, likes만 삭제 (posts, profiles는 절대 건드리지 않음)
-- cascade로 관련 인덱스/트리거/정책 함께 정리

drop table if exists public.likes    cascade;
drop table if exists public.comments cascade;


-- ── 1. comments 테이블 ─────────────────────────────────────

create table if not exists public.comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id)    on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  parent_id  uuid        references public.comments(id)          on delete cascade,
  content    text        not null check (char_length(content) between 1 and 500),
  is_deleted boolean     not null default false,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_comments_post_created
  on public.comments (post_id, created_at asc)
  where is_deleted = false;

create index if not exists idx_comments_author
  on public.comments (author_id);

create index if not exists idx_comments_parent
  on public.comments (parent_id)
  where parent_id is not null;

-- RLS
alter table public.comments enable row level security;

-- RLS 정책 (재실행 안전)
drop policy if exists "comments_select" on public.comments;
create policy "comments_select"
  on public.comments for select
  using (is_deleted = false);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert"
  on public.comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "comments_update" on public.comments;
create policy "comments_update"
  on public.comments for update
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ── 2. likes 테이블 ───────────────────────────────────────

create table if not exists public.likes (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id)    on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- 인덱스
create index if not exists idx_likes_post on public.likes (post_id);
create index if not exists idx_likes_user on public.likes (user_id);

-- RLS
alter table public.likes enable row level security;

-- RLS 정책 (재실행 안전)
drop policy if exists "likes_select" on public.likes;
create policy "likes_select"
  on public.likes for select
  using (true);

drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert"
  on public.likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete"
  on public.likes for delete
  using (auth.uid() = user_id);


-- ── 3. posts 카운트 컬럼 추가 ─────────────────────────────

alter table public.posts
  add column if not exists comment_count int not null default 0,
  add column if not exists like_count    int not null default 0;


-- ── 4. 댓글 카운트 트리거 ─────────────────────────────────

create or replace function public.update_post_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.is_deleted = false then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;

  elsif tg_op = 'UPDATE' then
    if old.is_deleted = false and new.is_deleted = true then
      update public.posts set comment_count = comment_count - 1 where id = new.post_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    end if;

  elsif tg_op = 'DELETE' and old.is_deleted = false then
    update public.posts set comment_count = comment_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comments_count on public.comments;
create trigger trg_comments_count
  after insert or update or delete on public.comments
  for each row execute function public.update_post_comment_count();


-- ── 5. 좋아요 카운트 트리거 ───────────────────────────────

create or replace function public.update_post_like_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = like_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_likes_count on public.likes;
create trigger trg_likes_count
  after insert or delete on public.likes
  for each row execute function public.update_post_like_count();


-- ── 6. 기존 posts 카운트 초기화 (안전장치) ───────────────

update public.posts p set
  comment_count = (
    select count(*) from public.comments c
    where c.post_id = p.id and c.is_deleted = false
  ),
  like_count = (
    select count(*) from public.likes l
    where l.post_id = p.id
  );
