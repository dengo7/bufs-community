-- ============================================================
-- 015_partner_stamps.sql
-- 제휴 가게 2차: QR 방문 인증(스탬프)·쿠폰·직원 PIN
-- ⚠️ 아직 적용 전 — 014_partner_stores.sql 이후 Supabase 대시보드 SQL Editor에서 실행
--
-- 규칙
--   · 적립: 매장 QR 코드 확인 → 영업시간(KST) 안 → 같은 가게 하루 1회
--   · stamps_per_reward(기본 3)개마다 쿠폰 1장. 쿠폰을 안 써도 스탬프는 계속 쌓인다(쿠폰 여러 장 가능)
--   · 쿠폰 사용: 직원 PIN 4자리 확인, 같은 가게 하루 1장. PIN 5회 연속 오류 → (사용자·가게별) 10분 잠금
--   · 매장 QR 코드는 SHA-256, 직원 PIN은 bcrypt 해시로만 저장(partner_store_secrets). 원문은 어디에도 남기지 않는다
--   · 모든 쓰기는 SECURITY DEFINER 함수로만. 테이블 직접 쓰기는 RLS·권한으로 막는다
--   · 날짜·시각 판단은 partner_now_kst() 한 곳에서 (자정을 넘겨 영업하는 가게도 "하루"는 KST 달력 날짜 기준)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── 테이블 ──────────────────────────────────────────────────────────────
-- 사용자·가게별 현재 스탬프 (쿠폰 발급 때 stamps_per_reward만큼 차감)
CREATE TABLE IF NOT EXISTS public.partner_stamp_cards (
  store_id     uuid        NOT NULL REFERENCES public.partner_stores(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stamps       int         NOT NULL DEFAULT 0 CHECK (stamps >= 0),
  total_visits int         NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, user_id)
);

-- 방문 인증 기록 (월간 통계의 원천). 같은 가게·같은 날 1건만
CREATE TABLE IF NOT EXISTS public.partner_visits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid        NOT NULL REFERENCES public.partner_stores(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_on date        NOT NULL,                       -- KST 날짜
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id, visited_on)
);
CREATE INDEX IF NOT EXISTS idx_partner_visits_store_day ON public.partner_visits (store_id, visited_on);

CREATE TABLE IF NOT EXISTS public.partner_coupons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid        NOT NULL REFERENCES public.partner_stores(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_at   timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  redeemed_on date,                                      -- KST 날짜 (하루 1장 제한용)
  CHECK ((redeemed_at IS NULL) = (redeemed_on IS NULL))
);
-- 같은 가게에서 하루 1장만 사용 (동시 요청 대비 최종 방어선)
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_coupons_daily
  ON public.partner_coupons (store_id, user_id, redeemed_on) WHERE redeemed_on IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_coupons_user_unused
  ON public.partner_coupons (user_id, store_id) WHERE redeemed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_partner_coupons_store_redeemed
  ON public.partner_coupons (store_id, redeemed_on);

-- 직원 PIN 연속 오류 (사용자·가게별)
CREATE TABLE IF NOT EXISTS public.partner_pin_attempts (
  store_id     uuid        NOT NULL REFERENCES public.partner_stores(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fail_count   int         NOT NULL DEFAULT 0,
  locked_until timestamptz,
  PRIMARY KEY (store_id, user_id)
);

-- ── RLS: 본인 것만 읽기, 관리자는 전체 읽기, 쓰기는 함수로만 ───────────
ALTER TABLE public.partner_stamp_cards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_visits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_coupons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_pin_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_cards_select_own" ON public.partner_stamp_cards;
CREATE POLICY "partner_cards_select_own" ON public.partner_stamp_cards FOR SELECT
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "partner_visits_select_own" ON public.partner_visits;
CREATE POLICY "partner_visits_select_own" ON public.partner_visits FOR SELECT
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "partner_coupons_select_own" ON public.partner_coupons;
CREATE POLICY "partner_coupons_select_own" ON public.partner_coupons FOR SELECT
  USING (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- partner_pin_attempts: 정책 없음(접근 불가)
REVOKE INSERT, UPDATE, DELETE ON public.partner_stamp_cards, public.partner_visits, public.partner_coupons
  FROM anon, authenticated;
REVOKE ALL ON public.partner_pin_attempts FROM anon, authenticated;

-- ── 내부 헬퍼 ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.partner_now_kst()
RETURNS timestamp LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Seoul')
$$;

-- 영업 중인지. close가 open보다 이르면 자정을 넘기는 영업, 같으면 24시간, '24:00' 마감 지원
CREATE OR REPLACE FUNCTION public.partner_is_open(p_open time, p_close time, p_at time)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_open IS NULL OR p_close IS NULL THEN true
    WHEN p_open < p_close THEN p_at >= p_open AND p_at < p_close
    WHEN p_open > p_close THEN p_at >= p_open OR p_at < p_close
    ELSE true
  END
$$;

CREATE OR REPLACE FUNCTION public.partner_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
$$;

-- ── 방문 인증 ───────────────────────────────────────────────────────────
-- 반환 status: stamped | coupon_issued | already_today | closed | invalid_code | not_logged_in
CREATE OR REPLACE FUNCTION public.partner_checkin(p_slug text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_store   public.partner_stores%ROWTYPE;
  v_hash    text;
  v_now     timestamp := public.partner_now_kst();
  v_rows    int;
  v_card    public.partner_stamp_cards%ROWTYPE;
  v_issued  boolean := false;
  v_coupons int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status', 'not_logged_in');
  END IF;

  SELECT * INTO v_store FROM public.partner_stores WHERE slug = p_slug AND active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;

  SELECT checkin_code_hash INTO v_hash FROM public.partner_store_secrets WHERE store_id = v_store.id;
  IF v_hash IS NULL OR p_code IS NULL OR length(p_code) > 128
     OR encode(extensions.digest(p_code, 'sha256'), 'hex') <> v_hash THEN
    RETURN jsonb_build_object('status', 'invalid_code');
  END IF;

  IF NOT public.partner_is_open(v_store.open_time, v_store.close_time, v_now::time) THEN
    RETURN jsonb_build_object(
      'status', 'closed',
      'open_time', to_char(v_store.open_time, 'HH24:MI'),
      'close_time', to_char(v_store.close_time, 'HH24:MI'));
  END IF;

  INSERT INTO public.partner_visits (store_id, user_id, visited_on)
  VALUES (v_store.id, v_uid, v_now::date)
  ON CONFLICT (store_id, user_id, visited_on) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    SELECT * INTO v_card FROM public.partner_stamp_cards WHERE store_id = v_store.id AND user_id = v_uid;
  ELSE
    INSERT INTO public.partner_stamp_cards AS c (store_id, user_id, stamps, total_visits)
    VALUES (v_store.id, v_uid, 1, 1)
    ON CONFLICT (store_id, user_id) DO UPDATE
      SET stamps = c.stamps + 1, total_visits = c.total_visits + 1, updated_at = now()
    RETURNING * INTO v_card;

    IF v_card.stamps >= v_store.stamps_per_reward THEN
      UPDATE public.partner_stamp_cards
         SET stamps = stamps - v_store.stamps_per_reward, updated_at = now()
       WHERE store_id = v_store.id AND user_id = v_uid
      RETURNING * INTO v_card;
      INSERT INTO public.partner_coupons (store_id, user_id) VALUES (v_store.id, v_uid);
      v_issued := true;
    END IF;
  END IF;

  SELECT count(*) INTO v_coupons FROM public.partner_coupons
   WHERE store_id = v_store.id AND user_id = v_uid AND redeemed_at IS NULL;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_rows = 0 THEN 'already_today' WHEN v_issued THEN 'coupon_issued' ELSE 'stamped' END,
    'stamps', coalesce(v_card.stamps, 0),
    'per_reward', v_store.stamps_per_reward,
    'coupons', v_coupons);
END;
$$;

-- ── 쿠폰 사용 ───────────────────────────────────────────────────────────
-- 반환 status: redeemed | wrong_pin | locked | already_used | daily_limit | pin_not_set | not_found | not_logged_in
CREATE OR REPLACE FUNCTION public.partner_redeem(p_coupon_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_coupon    public.partner_coupons%ROWTYPE;
  v_locked    timestamptz;
  v_pin_hash  text;
  v_fails     int;
  v_today     date := public.partner_now_kst()::date;
  c_max_fails constant int := 5;
  c_lock      constant interval := interval '10 minutes';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status', 'not_logged_in');
  END IF;

  SELECT * INTO v_coupon FROM public.partner_coupons
   WHERE id = p_coupon_id AND user_id = v_uid
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;
  IF v_coupon.redeemed_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_used', 'redeemed_at', v_coupon.redeemed_at);
  END IF;

  SELECT locked_until INTO v_locked FROM public.partner_pin_attempts
   WHERE store_id = v_coupon.store_id AND user_id = v_uid;
  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RETURN jsonb_build_object('status', 'locked', 'locked_until', v_locked);
  END IF;

  -- PIN 시도를 낭비하지 않도록 하루 1장 제한을 먼저 본다
  IF EXISTS (SELECT 1 FROM public.partner_coupons
              WHERE store_id = v_coupon.store_id AND user_id = v_uid AND redeemed_on = v_today) THEN
    RETURN jsonb_build_object('status', 'daily_limit');
  END IF;

  SELECT staff_pin_hash INTO v_pin_hash FROM public.partner_store_secrets WHERE store_id = v_coupon.store_id;
  IF v_pin_hash IS NULL THEN
    RETURN jsonb_build_object('status', 'pin_not_set');
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' OR extensions.crypt(p_pin, v_pin_hash) <> v_pin_hash THEN
    INSERT INTO public.partner_pin_attempts AS a (store_id, user_id, fail_count)
    VALUES (v_coupon.store_id, v_uid, 1)
    ON CONFLICT (store_id, user_id) DO UPDATE SET fail_count = a.fail_count + 1
    RETURNING fail_count INTO v_fails;

    IF v_fails >= c_max_fails THEN
      UPDATE public.partner_pin_attempts
         SET fail_count = 0, locked_until = now() + c_lock
       WHERE store_id = v_coupon.store_id AND user_id = v_uid
      RETURNING locked_until INTO v_locked;
      RETURN jsonb_build_object('status', 'locked', 'locked_until', v_locked);
    END IF;
    RETURN jsonb_build_object('status', 'wrong_pin', 'remaining', c_max_fails - v_fails);
  END IF;

  BEGIN
    UPDATE public.partner_coupons
       SET redeemed_at = now(), redeemed_on = v_today
     WHERE id = v_coupon.id
    RETURNING * INTO v_coupon;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'daily_limit');
  END;

  UPDATE public.partner_pin_attempts SET fail_count = 0
   WHERE store_id = v_coupon.store_id AND user_id = v_uid;

  RETURN jsonb_build_object('status', 'redeemed', 'redeemed_at', v_coupon.redeemed_at);
END;
$$;

-- ── 관리자: QR 코드 발급·직원 PIN 설정 ──────────────────────────────────
-- 새 매장 QR 코드를 만들어 해시만 저장하고 원문은 이 호출의 응답으로 한 번만 돌려준다.
-- 재발급하면 이전 QR 스티커는 즉시 무효가 된다.
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

  INSERT INTO public.partner_store_secrets AS s (store_id, checkin_code_hash)
  VALUES (p_store_id, encode(extensions.digest(v_code, 'sha256'), 'hex'))
  ON CONFLICT (store_id) DO UPDATE SET checkin_code_hash = EXCLUDED.checkin_code_hash;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_admin_set_pin(p_store_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.partner_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_pin' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partner_stores WHERE id = p_store_id) THEN
    RAISE EXCEPTION 'store_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.partner_store_secrets AS s (store_id, staff_pin_hash)
  VALUES (p_store_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)))
  ON CONFLICT (store_id) DO UPDATE SET staff_pin_hash = EXCLUDED.staff_pin_hash;

  -- PIN을 바꾸면 이 가게의 잠금·오류 횟수를 초기화
  DELETE FROM public.partner_pin_attempts WHERE store_id = p_store_id;
END;
$$;

-- 관리자 화면용: 해시는 내보내지 않고 설정 여부만
CREATE OR REPLACE FUNCTION public.partner_admin_secret_status()
RETURNS TABLE (store_id uuid, has_code boolean, has_pin boolean, updated_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.partner_is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, s.checkin_code_hash IS NOT NULL, s.staff_pin_hash IS NOT NULL, s.updated_at
      FROM public.partner_stores p
      LEFT JOIN public.partner_store_secrets s ON s.store_id = p.id;
END;
$$;

-- ── 함수 실행 권한 ──────────────────────────────────────────────────────
-- Supabase는 새 함수에 anon/authenticated 실행 권한을 기본으로 주므로 명시적으로 회수 후 필요한 것만 허용
REVOKE ALL ON FUNCTION public.partner_now_kst()                    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_is_open(time, time, time)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_is_admin()                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_checkin(text, text)          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_redeem(uuid, text)           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_admin_issue_code(uuid)       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_admin_set_pin(uuid, text)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.partner_admin_secret_status()        FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.partner_checkin(text, text)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_redeem(uuid, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_admin_issue_code(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_admin_set_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_admin_secret_status()     TO authenticated;
