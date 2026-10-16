-- ============================================================
-- seed/partner_jangawon.sql — 첫 제휴 가게 초기 데이터
-- 014_partner_stores.sql 적용 후 실행. 여러 번 실행해도 같은 결과(slug 기준 upsert).
-- 매장 QR 코드·직원 PIN은 여기에 넣지 않는다 → 관리자 화면(2차)에서 입력·재발급.
-- ⚠️ 중국어·일본어 상호 표기(张家园 / チャンガウォン)는 사장님께 확인 필요
-- ============================================================

INSERT INTO public.partner_stores (
  slug, name, intro, address, transit_note, phone,
  open_time, close_time, hours_note, image, stamps_per_reward, translations, active, sort_order
) VALUES (
  'jangawon',
  '장가원 양꼬치',
  '남산역 근처의 양꼬치 전문점이에요. The Well 회원이라면 방문할 때마다 스탬프를 모아 음료 혜택을 받을 수 있어요.',
  '부산 금정구 금강로 672 1층',
  '남산역 7번 출구 도보 9분',
  '051-518-4318',
  '16:00', '24:00', NULL,
  '/campus/partner-jangawon.jpg',
  3,
  '{
    "en": {
      "name": "Jangawon Lamb Skewers",
      "intro": "A lamb skewer restaurant near Namsan Station. As a The Well member, collect a stamp on every visit and get a free drink.",
      "address": "1F, 672 Geumgang-ro, Geumjeong-gu, Busan",
      "transit_note": "9-min walk from Namsan Station Exit 7"
    },
    "zh": {
      "name": "张家园羊肉串",
      "intro": "位于南山站附近的羊肉串专门店。The Well 会员每次到店都可以集章，兑换免费饮料。",
      "address": "釜山金井区金刚路672 1楼",
      "transit_note": "南山站7号出口步行9分钟"
    },
    "ja": {
      "name": "チャンガウォン 羊串焼き",
      "intro": "南山駅近くの羊串焼き専門店です。The Well会員なら来店ごとにスタンプを集めて、ドリンクの特典を受けられます。",
      "address": "釜山広域市金井区金剛路672 1階",
      "transit_note": "南山駅7番出口から徒歩9分"
    }
  }'::jsonb,
  true,
  0
)
ON CONFLICT (slug) DO UPDATE SET
  name              = EXCLUDED.name,
  intro             = EXCLUDED.intro,
  address           = EXCLUDED.address,
  transit_note      = EXCLUDED.transit_note,
  phone             = EXCLUDED.phone,
  open_time         = EXCLUDED.open_time,
  close_time        = EXCLUDED.close_time,
  hours_note        = EXCLUDED.hours_note,
  image             = EXCLUDED.image,
  stamps_per_reward = EXCLUDED.stamps_per_reward,
  translations      = EXCLUDED.translations,
  active            = EXCLUDED.active,
  sort_order        = EXCLUDED.sort_order;

-- 비밀값 자리만 만든다 (값은 비워 둠)
INSERT INTO public.partner_store_secrets (store_id)
SELECT id FROM public.partner_stores WHERE slug = 'jangawon'
ON CONFLICT (store_id) DO NOTHING;
