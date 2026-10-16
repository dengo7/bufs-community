-- ============================================================
-- 017_partner_qr_viewable.sql
-- 관리자가 현재 매장 QR(스티커)을 언제든 다시 볼 수 있게
-- ⚠️ 아직 적용 전 — 016_partner_welcome_reward.sql 이후 Supabase 대시보드 SQL Editor에서 실행
--
--   · QR 코드는 계산대에 공개로 붙는 값이라 관리자에게는 다시 보여준다
--     → partner_store_secrets.checkin_code 에 원본을 저장(관리자 전용 RPC로만 읽기)
--   · partner_store_secrets 는 계속 RLS 정책 없음 + anon/authenticated 권한 회수 → 직접 조회 불가(관리자 포함)
--   · 적립 검증은 지금처럼 checkin_code_hash(SHA-256)로 한다 (partner_checkin 변경 없음)
--   · 017 이전에 발급한 QR은 원본이 없다(해시만) → 다시 보려면 한 번 재발급해야 한다
--   · 직원 PIN은 계속 bcrypt 해시로만 저장하고 다시 보여주지 않는다
-- ============================================================

ALTER TABLE public.partner_store_secrets
  ADD COLUMN IF NOT EXISTS checkin_code text;   -- 현재 매장 QR 원본 (관리자 다시 보기용)

-- 014에서 회수했지만 새 컬럼이 생겼으니 다시 한 번 확실히 막는다
REVOKE ALL ON public.partner_store_secrets FROM anon, authenticated;

-- 발급: 해시와 함께 원본도 저장 (재발급하면 둘 다 바뀌어 이전 스티커는 즉시 무효)
CREATE OR REPLACE FUNCTION public.partner_admin_issue_code(p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT public.partner_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partner_stores WHERE id = p_store_id) THEN
    RAISE EXCEPTION 'store_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- URL에 그대로 넣을 수 있는 24자(144비트)
  v_code := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');

  INSERT INTO public.partner_store_secrets AS s (store_id, checkin_code_hash, checkin_code)
  VALUES (p_store_id, encode(extensions.digest(v_code, 'sha256'), 'hex'), v_code)
  ON CONFLICT (store_id) DO UPDATE
    SET checkin_code_hash = EXCLUDED.checkin_code_hash,
        checkin_code      = EXCLUDED.checkin_code;

  RETURN v_code;
END;
$$;

-- 관리자 전용: 현재 QR 원본. 발급 전이거나 017 이전에 발급돼 원본이 없으면 NULL
CREATE OR REPLACE FUNCTION public.partner_admin_get_code(p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT public.partner_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT checkin_code INTO v_code FROM public.partner_store_secrets WHERE store_id = p_store_id;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_admin_issue_code(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_admin_get_code(uuid)   FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_admin_issue_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_admin_get_code(uuid)   TO authenticated;
