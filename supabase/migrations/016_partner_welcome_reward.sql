-- ============================================================
-- 016_partner_welcome_reward.sql
-- 제휴 가게 첫 방문 웰컴 쿠폰 (A안)
-- ⚠️ 아직 적용 전 — 015_partner_stamps.sql 이후 Supabase 대시보드 SQL Editor에서 실행
--
-- 규칙
--   · 가게별 첫 방문(그 가게에서 처음 적립하는 날)에는 스탬프 대신 바로 쿠폰 1장, 스탬프는 0에서 시작
--   · 이후는 기존대로 stamps_per_reward 번 방문마다 쿠폰 1장
--     → stamps_per_reward = 3 이면 1·4·7·10… 번째 방문에 쿠폰
--   · partner_stores.welcome_reward(기본 true)로 가게별로 끌 수 있다(끄면 015 규칙과 같음)
--   · "첫 방문" = 그 가게 스탬프 카드가 없거나 total_visits = 0.
--     016 적용 전에 이미 적립한 사용자는 첫 방문이 아니므로 소급 쿠폰은 없다(기존 데이터 보존)
--   · 하루 1회·영업시간·쿠폰 하루 1장·직원 PIN 등 나머지 규칙은 015 그대로
-- ============================================================

ALTER TABLE public.partner_stores
  ADD COLUMN IF NOT EXISTS welcome_reward boolean NOT NULL DEFAULT true;

-- 반환 status: welcome_coupon | stamped | coupon_issued | already_today | closed | invalid_code | not_logged_in
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
  v_prev    int;
  v_card    public.partner_stamp_cards%ROWTYPE;
  v_status  text;
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
    v_status := 'already_today';
    SELECT * INTO v_card FROM public.partner_stamp_cards WHERE store_id = v_store.id AND user_id = v_uid;
  ELSE
    -- 오늘 방문 기록을 넣은 뒤라 같은 사용자·가게의 동시 요청은 위 UNIQUE에서 걸러진다
    SELECT total_visits INTO v_prev FROM public.partner_stamp_cards
     WHERE store_id = v_store.id AND user_id = v_uid
     FOR UPDATE;

    IF v_store.welcome_reward AND coalesce(v_prev, 0) = 0 THEN
      -- 첫 방문: 스탬프 대신 웰컴 쿠폰, 스탬프는 0부터
      INSERT INTO public.partner_stamp_cards AS c (store_id, user_id, stamps, total_visits)
      VALUES (v_store.id, v_uid, 0, 1)
      ON CONFLICT (store_id, user_id) DO UPDATE
        SET total_visits = c.total_visits + 1, updated_at = now()
      RETURNING * INTO v_card;
      INSERT INTO public.partner_coupons (store_id, user_id) VALUES (v_store.id, v_uid);
      v_status := 'welcome_coupon';
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
        v_status := 'coupon_issued';
      ELSE
        v_status := 'stamped';
      END IF;
    END IF;
  END IF;

  SELECT count(*) INTO v_coupons FROM public.partner_coupons
   WHERE store_id = v_store.id AND user_id = v_uid AND redeemed_at IS NULL;

  RETURN jsonb_build_object(
    'status', v_status,
    'stamps', coalesce(v_card.stamps, 0),
    'per_reward', v_store.stamps_per_reward,
    'coupons', v_coupons);
END;
$$;

-- CREATE OR REPLACE는 기존 권한을 유지하지만, 015와 같은 상태를 명시적으로 다시 맞춘다
REVOKE ALL ON FUNCTION public.partner_checkin(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_checkin(text, text) TO authenticated;
