-- ============================================================
-- 004_add_comments_delete_policy.sql
-- comments hard delete 정책 추가
--
-- [문제 1] comments_update로 soft delete 시도
--   → comments_select: using (is_deleted = false) 가
--     UPDATE WITH CHECK에 간섭 → "new row violates" 에러
--
-- [문제 2] comments 테이블에 DELETE 정책 자체가 없음
--   → hard delete 시도해도 RLS로 차단
--
-- [수정] DELETE 정책 추가 (본인/admin)
-- cascade: parent 댓글 삭제 시 대댓글도 자동 삭제됨 (FK cascade 설정됨)
-- ============================================================

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete"
  on public.comments for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
