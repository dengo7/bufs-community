-- ============================================================
-- 006_pin_posts.sql
-- posts 핀·공지 기능
-- ⚠️ 이미 Supabase 대시보드에서 실행 완료 — 기록용 보관
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS pinned     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_scope  text
    CHECK (pin_scope IN ('global', 'category')),
  ADD COLUMN IF NOT EXISTS pinned_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_posts_pinned_global
  ON public.posts (pinned_at DESC)
  WHERE pinned = true
    AND pin_scope = 'global'
    AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_posts_pinned_category
  ON public.posts (category, pinned_at DESC)
  WHERE pinned = true
    AND pin_scope = 'category'
    AND is_deleted = false;

CREATE OR REPLACE FUNCTION public.toggle_pin_post(
  p_post_id   uuid,
  p_pinned    boolean,
  p_pin_scope text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  IF p_pinned = true AND p_pin_scope NOT IN ('global', 'category') THEN
    RAISE EXCEPTION 'pin_scope must be ''global'' or ''category'' when pinning';
  END IF;

  UPDATE public.posts
  SET
    pinned    = p_pinned,
    pin_scope = CASE WHEN p_pinned THEN p_pin_scope ELSE NULL END,
    pinned_at = CASE WHEN p_pinned THEN now()       ELSE NULL END
  WHERE id = p_post_id
    AND is_deleted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found or already deleted';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_pin_post(uuid, boolean, text)
  TO authenticated;
