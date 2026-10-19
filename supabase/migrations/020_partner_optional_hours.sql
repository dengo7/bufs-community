-- ============================================================
-- 020_partner_optional_hours.sql
-- 제휴 가게 QR 적립의 영업시간 제한을 가게별 선택 설정으로
-- ⚠️ 아직 적용 전 — 014 → seed → 015 → 016 → 017 이후 Supabase 대시보드 SQL Editor에서 실행
--   (018·019는 푸시 관련이라 순서 무관. 019는 기록용)
--
-- 규칙
--   · partner_stores.enforce_hours (기본 false) 추가
--     → 기존 가게(장가원 포함)는 모두 false = 시간 상관없이 적립
--   · enforce_hours = true 인 가게만 영업시간(open_time~close_time, KST) 밖 스캔을 'closed'로 거부
--   · 하루 1회 적립·첫 방문 웰컴 쿠폰·N회마다 쿠폰·쿠폰 하루 1장·직원 PIN 등 나머지는 016 그대로
--     (partner_checkin 본문은 016과 같고 영업시간 검사 조건만 바뀜. partner_redeem 변경 없음)
--   · 컬럼 추가뿐이라 기존 데이터(스탬프·방문·쿠폰)는 그대로. 여러 번 실행해도 안전
--   · open_time/close_time/partner_is_open 은 지우지 않는다(가게 정보 표시·다시 켤 때 사용)
--   · 다시 켜려면: UPDATE public.partner_stores SET enforce_hours = true WHERE slug = '<slug>';
-- ============================================================

ALTER TABLE public.partner_stores
  ADD COLUMN IF NOT EXISTS enforce_hours boolean NOT NULL DEFAULT false;

-- 반환 status: welcome_coupon | stamped | coupon_issued | already_today | closed | invalid_code | not_logged_in
--   closed 는 enforce_hours = true 인 가게에서만 나온다
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

  -- 020: 영업시간 검사는 enforce_hours = true 인 가게만
  IF v_store.enforce_hours
     AND NOT public.partner_is_open(v_store.open_time, v_store.close_time, v_now::time) THEN
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

-- CREATE OR REPLACE는 기존 권한을 유지하지만, 015·016과 같은 상태를 명시적으로 다시 맞춘다
REVOKE ALL ON FUNCTION public.partner_checkin(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_checkin(text, text) TO authenticated;
