-- ============================================================
-- 012_fix_profiles_rls.sql
-- profiles UPDATE RLS 권한 상승 취약점 수정
-- 멱등성 보장: drop policy if exists → create 로 여러 번 실행해도 안전
-- ============================================================

-- 기존 취약 정책 제거
drop policy if exists "profiles_update_own" on public.profiles;

-- WITH CHECK 명시한 안전한 정책으로 교체
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select p.role from public.profiles p where p.id = auth.uid()
    )
    and created_at = (
      select p.created_at from public.profiles p where p.id = auth.uid()
    )
  );
