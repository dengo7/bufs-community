-- ============================================================
-- 003_fix_posts_update_rls.sql
-- posts UPDATE RLS 정책 수정
--
-- [문제]
-- posts_select: using (is_deleted = false)
-- posts_update_own: using (auth.uid() = author_id) — WITH CHECK 미지정
--
-- PostgreSQL은 UPDATE policy에 WITH CHECK가 없으면
-- SELECT policy의 USING 조건을 새 row 검증(WITH CHECK)에 암묵 적용.
-- → is_deleted = true로 update 시 새 row가 is_deleted = false를 불만족
-- → "new row violates row-level security policy" 에러 발생
--
-- [수정]
-- UPDATE policy에 WITH CHECK (true) 명시
-- → SELECT policy 간섭 차단, 권한 있는 사용자는 어떤 값이든 변경 가능
-- ============================================================

-- 기존 update_own 재생성 — WITH CHECK 명시
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts for update
  using  (auth.uid() = author_id)
  with check (true);

-- admin update 정책 추가 (soft delete 포함)
drop policy if exists "posts_update_admin" on public.posts;
create policy "posts_update_admin"
  on public.posts for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (true);
