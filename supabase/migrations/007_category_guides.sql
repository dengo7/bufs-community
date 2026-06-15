-- ============================================================
-- 007_category_guides.sql
-- 카테고리 가이드 섹션
-- ⚠️ 이미 Supabase 대시보드에서 실행 완료 — 기록용 보관
-- ============================================================

CREATE TABLE IF NOT EXISTS public.category_guides (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text        NOT NULL
    CHECK (category_slug IN ('housing','bank','telecom','insurance','medical')),
  card_type     text        NOT NULL
    CHECK (card_type IN ('procedure','places','checklist','info')),
  title         text        NOT NULL,
  content_type  text        NOT NULL
    CHECK (content_type IN ('rich_text','structured')),
  rich_content  text,
  content       jsonb       NOT NULL DEFAULT '{}',
  sort_order    int         NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid        REFERENCES public.profiles(id)
);

CREATE TRIGGER category_guides_updated_at
  BEFORE UPDATE ON public.category_guides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_guides_unique
  ON public.category_guides (category_slug, sort_order);

CREATE INDEX IF NOT EXISTS idx_category_guides_slug
  ON public.category_guides (category_slug, sort_order ASC);

ALTER TABLE public.category_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guides_select_all" ON public.category_guides;
CREATE POLICY "guides_select_all"
  ON public.category_guides FOR SELECT USING (true);

DROP POLICY IF EXISTS "guides_admin_write" ON public.category_guides;
CREATE POLICY "guides_admin_write"
  ON public.category_guides FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.update_category_guide(
  p_id          uuid,
  p_rich_content text DEFAULT NULL,
  p_content     jsonb DEFAULT NULL,
  p_title       text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Permission denied: admin only'; END IF;
  UPDATE public.category_guides
  SET
    title        = COALESCE(p_title, title),
    rich_content = COALESCE(p_rich_content, rich_content),
    content      = COALESCE(p_content, content),
    updated_by   = auth.uid(),
    updated_at   = now()
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide not found'; END IF;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_category_guide(uuid, text, jsonb, text)
  TO authenticated;

INSERT INTO public.category_guides
  (category_slug, card_type, title, content_type, rich_content, content, sort_order)
VALUES
  ('housing',   'procedure', '방 구하는 절차',       'rich_text',  '내용을 입력해주세요', '{}',          0),
  ('housing',   'places',    '추천 부동산',           'structured', NULL,                '{"items":[]}', 1),
  ('housing',   'checklist', '계약 전 체크리스트',    'structured', NULL,                '{"items":[]}', 2),
  ('bank',      'procedure', '계좌 개설 절차',        'rich_text',  '내용을 입력해주세요', '{}',          0),
  ('bank',      'places',    '추천 은행 지점',         'structured', NULL,                '{"items":[]}', 1),
  ('telecom',   'procedure', '유심 개통 절차',        'rich_text',  '내용을 입력해주세요', '{}',          0),
  ('telecom',   'places',    '추천 통신사·매장',      'structured', NULL,                '{"items":[]}', 1),
  ('insurance', 'procedure', '유학생 보험 가입 방법', 'rich_text',  '내용을 입력해주세요', '{}',          0),
  ('insurance', 'info',      '보험 종류 정리',         'rich_text',  '내용을 입력해주세요', '{}',          1),
  ('medical',   'procedure', '병원 이용 절차',        'rich_text',  '내용을 입력해주세요', '{}',          0),
  ('medical',   'places',    '추천 병원',             'structured', NULL,                '{"items":[]}', 1)
ON CONFLICT (category_slug, sort_order) DO NOTHING;
