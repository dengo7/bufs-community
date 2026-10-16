-- ============================================================
-- 014_partner_stores.sql
-- 제휴 가게 (1차: 가게 소개). 스탬프·쿠폰 테이블은 2차 마이그레이션에서 추가한다.
-- ⚠️ 아직 적용 전 — Supabase 대시보드 SQL Editor에서 실행
--
-- 비밀값(매장 QR 코드·직원 PIN)은 공개 테이블에 두지 않고 partner_store_secrets 로 분리한다.
-- partner_store_secrets 는 RLS만 켜고 정책을 두지 않아 anon/authenticated 는 읽기·쓰기 모두 불가.
-- (2차에서 SECURITY DEFINER 함수로만 해시를 확인·재발급한다)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_stores (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$' AND slug <> 'scan-test'),
  name              text        NOT NULL,
  intro             text,
  address           text,
  transit_note      text,
  phone             text,
  open_time         time,
  close_time        time,                                    -- 자정 마감은 '24:00'
  hours_note        text,                                    -- 비우면 "매일 open–close"
  image             text,                                    -- 예: /campus/partner-jangawon.jpg
  stamps_per_reward int         NOT NULL DEFAULT 3 CHECK (stamps_per_reward > 0),
  translations      jsonb       NOT NULL DEFAULT '{}',       -- { en|zh|ja: { name, intro, address, transit_note, hours_note } }
  active            boolean     NOT NULL DEFAULT true,
  sort_order        int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS partner_stores_updated_at ON public.partner_stores;
CREATE TRIGGER partner_stores_updated_at
  BEFORE UPDATE ON public.partner_stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_partner_stores_active
  ON public.partner_stores (active, sort_order);

ALTER TABLE public.partner_stores ENABLE ROW LEVEL SECURITY;

-- 공개: 운영 중인 가게만 누구나(비로그인 포함) 조회
DROP POLICY IF EXISTS "partner_stores_select_active" ON public.partner_stores;
CREATE POLICY "partner_stores_select_active"
  ON public.partner_stores FOR SELECT
  USING (active = true);

-- 관리자: 전체 조회·수정 (비활성 가게 포함)
DROP POLICY IF EXISTS "partner_stores_admin_all" ON public.partner_stores;
CREATE POLICY "partner_stores_admin_all"
  ON public.partner_stores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── 비밀값 (공개 조회 경로에서 완전히 분리) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_store_secrets (
  store_id          uuid        PRIMARY KEY REFERENCES public.partner_stores(id) ON DELETE CASCADE,
  checkin_code_hash text,                                    -- 매장 QR 코드의 해시 (원문 저장 금지)
  staff_pin_hash    text,                                    -- 직원 PIN의 해시 (원문 저장 금지)
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS partner_store_secrets_updated_at ON public.partner_store_secrets;
CREATE TRIGGER partner_store_secrets_updated_at
  BEFORE UPDATE ON public.partner_store_secrets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.partner_store_secrets ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon/authenticated 접근 불가. 테이블 권한도 회수해 이중으로 막는다.
REVOKE ALL ON public.partner_store_secrets FROM anon, authenticated;
