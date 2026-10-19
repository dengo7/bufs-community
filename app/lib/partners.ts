// 제휴 가게 — 데이터 조회, 스탬프·쿠폰 RPC, QR 주소 판별, UI 라벨(4개 언어).
// 공개 정보는 partner_stores(공개 컬럼만). 비밀값(QR 코드·직원 PIN 해시)은 partner_store_secrets 에 있어
// 클라이언트는 절대 읽지 않고, 적립·사용·발급은 모두 SECURITY DEFINER RPC로만 한다.
import type { UILang } from './categories';
import { getSupabaseClient } from './supabase/client';

type LocalizedFields = Partial<Record<'name' | 'intro' | 'address' | 'transit_note' | 'hours_note', string>>;

export type PartnerStore = {
  id: string;
  slug: string;
  name: string;
  intro: string | null;
  address: string | null;
  transit_note: string | null;
  phone: string | null;
  open_time: string | null;   // 'HH:MM:SS'
  close_time: string | null;
  hours_note: string | null;
  image: string | null;
  stamps_per_reward: number;
  /** 첫 방문 웰컴 쿠폰 (016). 016 적용 전에는 컬럼이 없어 false로 본다 */
  welcome_reward: boolean;
  /** 영업시간에만 적립 (020). 020 적용 전에는 DB가 항상 영업시간을 검사하므로 true로 본다 */
  enforce_hours: boolean;
  translations: Partial<Record<Exclude<UILang, 'ko'>, LocalizedFields>> | null;
};

const BASE_COLUMNS =
  'id, slug, name, intro, address, transit_note, phone, open_time, close_time, hours_note, image, stamps_per_reward, translations';
/**
 * 나중 마이그레이션에서 추가된 컬럼. 적용 전이면 그 컬럼을 고를 때 42703이 나므로
 * 최신 컬럼부터 하나씩 빼며 다시 읽는다.
 *  - 016 welcome_reward 없음 → false (기존 "N회마다" 규칙 문구)
 *  - 020 enforce_hours 없음 → true  (020 전 RPC는 항상 영업시간을 검사)
 */
const COLUMN_TIERS = [
  `${BASE_COLUMNS}, welcome_reward, enforce_hours`,
  `${BASE_COLUMNS}, welcome_reward`,
  BASE_COLUMNS,
];

/** PostgREST: 없는 컬럼을 고르면 42703 */
const isMissingColumn = (error: { code?: string } | null) => error?.code === '42703';

/** partner_stores 조회. 마이그레이션 적용 전 컬럼은 빼고 다시 읽어 기본값으로 채운다 */
async function selectStores(
  build: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
): Promise<{ data: PartnerStore[]; error: boolean }> {
  let tier = 0;
  let res = await build(COLUMN_TIERS[tier]);
  while (isMissingColumn(res.error) && tier < COLUMN_TIERS.length - 1) {
    res = await build(COLUMN_TIERS[++tier]);
  }
  if (res.error) return { data: [], error: true };
  const rows = (Array.isArray(res.data) ? res.data : res.data ? [res.data] : []) as PartnerStore[];
  return {
    data: rows.map(r => ({
      ...r,
      welcome_reward: tier <= 1 ? !!r.welcome_reward : false,
      enforce_hours: tier === 0 ? r.enforce_hours !== false : true,
    })),
    error: false,
  };
}

/** 매장 QR 스티커가 가리키는 주소의 기준 (앱 WebView가 띄우는 프로덕션 도메인) */
export const PARTNER_QR_ORIGIN = 'https://bufs-community.vercel.app';

/**
 * 운영 중인 제휴 가게 목록. 마이그레이션 적용 전(테이블 없음)이거나 조회가 실패하면 []
 * → 호출부는 빈 배열이면 제휴 섹션을 숨긴다.
 * (관리자는 RLS상 비활성 가게도 보이므로 active 조건을 명시한다)
 */
export async function fetchPartnerStores(): Promise<PartnerStore[]> {
  try {
    const client = getSupabaseClient();
    const { data } = await selectStores(cols =>
      client.from('partner_stores').select(cols).eq('active', true).order('sort_order', { ascending: true }));
    return data;
  } catch {
    return [];
  }
}

/** slug로 한 곳(운영 중). 없거나 조회 실패면 null */
export async function fetchPartnerStore(slug: string): Promise<PartnerStore | null> {
  try {
    const client = getSupabaseClient();
    const { data } = await selectStores(cols =>
      client.from('partner_stores').select(cols).eq('slug', slug).eq('active', true).maybeSingle());
    return data[0] ?? null;
  } catch {
    return null;
  }
}

/** 혜택 한 줄 — 웰컴 쿠폰이 켜져 있으면 "첫 방문 1잔 + 이후 N번마다 1잔" */
export function partnerBenefit(store: PartnerStore, lang: UILang): string {
  const t = PARTNER_T[lang];
  return store.welcome_reward ? t.benefitWithWelcome(store.stamps_per_reward) : t.benefit(store.stamps_per_reward);
}

/** ko는 기본 컬럼, 그 외 언어는 translations[lang][field] (없으면 ko로) */
export function partnerText(store: PartnerStore, lang: UILang, field: keyof LocalizedFields): string {
  const base = (store[field] ?? '') as string;
  if (lang === 'ko') return base;
  return store.translations?.[lang]?.[field] || base;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

/** "매일 16:00 – 24:00" 또는 hours_note */
export function partnerHours(store: PartnerStore, lang: UILang): string {
  const note = partnerText(store, lang, 'hours_note');
  if (note) return note;
  if (!store.open_time || !store.close_time) return '';
  return `${PARTNER_T[lang].daily} ${hhmm(store.open_time)} – ${hhmm(store.close_time)}`;
}

/** tel: 링크용 숫자만 */
export const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, '')}`;

/** 로그인 후 돌아올 주소를 붙인 로그인 경로 */
export const loginHref = (next: string) => `/auth?next=${encodeURIComponent(next)}`;

/** 현재 로그인 사용자 id (로컬 세션, 네트워크 왕복 없음) */
export async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── 스탬프·쿠폰 현황 ────────────────────────────────────────────────────
export type StampState = {
  /** 2차 마이그레이션(015)이 적용돼 스탬프 기능을 쓸 수 있는지 */
  available: boolean;
  /** store_id → 내 스탬프·미사용 쿠폰 수 (비로그인이면 비어 있음) */
  byStore: Map<string, MyStamp>;
};

export type MyStamp = { stamps: number; coupons: number; totalVisits: number };
const EMPTY_STAMP: MyStamp = { stamps: 0, coupons: 0, totalVisits: 0 };
export const myStampOf = (state: StampState | null, storeId: string): MyStamp | null =>
  state?.available ? (state.byStore.get(storeId) ?? EMPTY_STAMP) : null;

/**
 * 내 스탬프 현황. 테이블이 없으면(015 적용 전) available=false.
 * RLS상 관리자는 다른 사용자 행도 보이므로 user_id 조건을 반드시 건다.
 */
export async function fetchStampState(userId: string | null): Promise<StampState> {
  const byStore = new Map<string, MyStamp>();
  try {
    const client = getSupabaseClient();
    if (!userId) {
      // 비로그인: 기능 사용 가능 여부만 확인 (RLS로 0행, 테이블이 없으면 에러)
      const { error } = await client.from('partner_stamp_cards').select('store_id').limit(0);
      return { available: !error, byStore };
    }
    const [cards, coupons] = await Promise.all([
      client.from('partner_stamp_cards').select('store_id, stamps, total_visits').eq('user_id', userId),
      client.from('partner_coupons').select('store_id').eq('user_id', userId).is('redeemed_at', null),
    ]);
    if (cards.error || coupons.error) return { available: false, byStore };
    for (const c of (cards.data ?? []) as { store_id: string; stamps: number; total_visits: number }[]) {
      byStore.set(c.store_id, { stamps: c.stamps, coupons: 0, totalVisits: c.total_visits });
    }
    for (const c of (coupons.data ?? []) as { store_id: string }[]) {
      const cur = byStore.get(c.store_id) ?? { ...EMPTY_STAMP };
      cur.coupons++;
      byStore.set(c.store_id, cur);
    }
    return { available: true, byStore };
  } catch {
    return { available: false, byStore };
  }
}

export type PartnerCoupon = { id: string; issued_at: string; redeemed_at: string | null };

/** 이 가게의 내 쿠폰 (미사용 오래된 순 + 최근 사용 5장) */
export async function fetchMyCoupons(storeId: string, userId: string): Promise<{ unused: PartnerCoupon[]; used: PartnerCoupon[] } | null> {
  try {
    const client = getSupabaseClient();
    const [unused, used] = await Promise.all([
      client.from('partner_coupons').select('id, issued_at, redeemed_at')
        .eq('store_id', storeId).eq('user_id', userId).is('redeemed_at', null)
        .order('issued_at', { ascending: true }),
      client.from('partner_coupons').select('id, issued_at, redeemed_at')
        .eq('store_id', storeId).eq('user_id', userId).not('redeemed_at', 'is', null)
        .order('redeemed_at', { ascending: false }).limit(5),
    ]);
    if (unused.error || used.error) return null;
    return { unused: (unused.data ?? []) as PartnerCoupon[], used: (used.data ?? []) as PartnerCoupon[] };
  } catch {
    return null;
  }
}

// ── RPC ─────────────────────────────────────────────────────────────────
export type CheckinStatus =
  | 'welcome_coupon' | 'stamped' | 'coupon_issued' | 'already_today' | 'closed' | 'invalid_code' | 'not_logged_in';
export type CheckinResult =
  | { status: CheckinStatus; stamps?: number; per_reward?: number; coupons?: number; open_time?: string; close_time?: string }
  | { status: 'error' };

export async function partnerCheckin(slug: string, code: string): Promise<CheckinResult> {
  try {
    const { data, error } = await getSupabaseClient().rpc('partner_checkin', { p_slug: slug, p_code: code });
    if (error || !data) return { status: 'error' };
    return data as CheckinResult;
  } catch {
    return { status: 'error' };
  }
}

export type RedeemResult =
  | { status: 'redeemed' | 'already_used'; redeemed_at: string }
  | { status: 'wrong_pin'; remaining: number }
  | { status: 'locked'; locked_until: string }
  | { status: 'daily_limit' | 'pin_not_set' | 'not_found' | 'not_logged_in' | 'error' };

export async function partnerRedeem(couponId: string, pin: string): Promise<RedeemResult> {
  try {
    const { data, error } = await getSupabaseClient().rpc('partner_redeem', { p_coupon_id: couponId, p_pin: pin });
    if (error || !data) return { status: 'error' };
    return data as RedeemResult;
  } catch {
    return { status: 'error' };
  }
}

// ── 매장 QR 주소 ────────────────────────────────────────────────────────
const CODE_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** 매장 QR에 넣을 적립 주소 */
export const checkinUrl = (slug: string, code: string) =>
  `${PARTNER_QR_ORIGIN}/partner/${slug}/checkin?code=${encodeURIComponent(code)}`;

export const isValidCodeFormat = (code: string | null): code is string => !!code && CODE_RE.test(code);

/**
 * 스캔한 문자열이 우리 가게 QR(적립 주소)인지 판별. 아니면 null.
 * 프로덕션 도메인과 현재 접속 도메인(개발 서버)만 허용한다.
 */
export function parseCheckinUrl(text: string): { slug: string; code: string } | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  const hosts = new Set([new URL(PARTNER_QR_ORIGIN).host]);
  if (typeof window !== 'undefined') hosts.add(window.location.host);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) return null;
  if (!hosts.has(url.host)) return null;

  const m = /^\/partner\/([a-z0-9-]+)\/checkin\/?$/.exec(url.pathname);
  const code = url.searchParams.get('code');
  if (!m || !isValidCodeFormat(code)) return null;
  return { slug: m[1], code };
}

// ── 날짜 표기 ───────────────────────────────────────────────────────────
const LOCALE: Record<UILang, string> = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP' };

export function fmtDateTime(iso: string, lang: UILang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

export function fmtTime(iso: string, lang: UILang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

// ── 문구 (4개 언어) ─────────────────────────────────────────────────────
// 앱 문구에는 주류 관련 단어를 쓰지 않는다 — 혜택은 "음료 1잔"으로만 표기
type PartnerDict = {
  sectionTitle: string;
  sectionSub: string;
  badge: string;
  benefit: (n: number) => string;
  benefitWithWelcome: (n: number) => string;
  benefitTitle: string;
  benefitNote: string;
  stampTitle: string;
  comingSoon: string;
  hours: string;
  daily: string;
  location: string;
  phone: string;
  call: string;
  notFound: string;
  back: string;
  // 스탬프·쿠폰
  stampProgress: (s: number, p: number) => string;
  couponCount: (n: number) => string;
  nextCoupon: (left: number) => string;
  firstVisitHint: string;
  scanToCollect: string;
  loginToCollect: string;
  login: string;
  useCoupon: string;
  onceADay: string;
  /** 영업시간 제한이 없는 가게(enforce_hours=false) */
  onceADayAnytime: string;
  // 스캐너
  scanTitle: string;
  scanHint: string;
  cameraFailed: string;
  takePhoto: string;
  retryCamera: string;
  notOurQr: string;
  noQrInPhoto: string;
  scanError: string;
  close: string;
  // 적립 결과
  processing: string;
  resStamped: string;
  resCoupon: string;
  resWelcome: string;
  resCouponSub: (n: number) => string;
  resAlready: string;
  resAlreadySub: string;
  resClosed: string;
  resClosedSub: (open: string, close: string) => string;
  resInvalid: string;
  resInvalidSub: string;
  resError: string;
  viewShop: string;
  // 쿠폰
  couponTitle: string;
  showStaff: string;
  staffPin: string;
  confirmUse: string;
  usedDone: string;
  usedAt: (t: string) => string;
  cannotReuse: string;
  wrongPin: (n: number) => string;
  locked: (t: string) => string;
  dailyLimit: string;
  pinNotSet: string;
  noCoupons: string;
  usedHistory: string;
  issuedAt: (t: string) => string;
  couponsLeft: (n: number) => string;
};

export const PARTNER_T: Record<UILang, PartnerDict> = {
  ko: {
    sectionTitle: '제휴 가게',
    sectionSub: 'The Well 회원 전용 혜택',
    badge: '제휴',
    benefit: (n) => `방문 ${n}회마다 음료 1잔 무료`,
    benefitWithWelcome: (n) => `첫 방문 음료 1잔 + 이후 ${n}번 방문마다 1잔`,
    benefitTitle: '혜택',
    benefitNote: '음료 종류는 매장에서 골라 주세요.',
    stampTitle: '내 스탬프',
    comingSoon: '스탬프 적립은 곧 시작돼요',
    hours: '영업시간',
    daily: '매일',
    location: '위치',
    phone: '전화',
    call: '전화 걸기',
    notFound: '가게 정보를 찾을 수 없어요',
    back: '뒤로',
    stampProgress: (s, p) => `스탬프 ${s}/${p}`,
    couponCount: (n) => `쿠폰 ${n}장`,
    nextCoupon: (left) => `${left}번 더 방문하면 음료 1잔 쿠폰`,
    firstVisitHint: '첫 방문에 적립하면 바로 음료 1잔 쿠폰을 드려요',
    scanToCollect: 'QR 스캔해서 적립',
    loginToCollect: '로그인하면 스탬프를 모을 수 있어요',
    login: '로그인',
    useCoupon: '쿠폰 사용하기',
    onceADay: '같은 가게는 하루 1번, 영업시간에만 적립돼요.',
    onceADayAnytime: '같은 가게는 하루 1번 적립돼요.',
    scanTitle: '매장 QR 스캔',
    scanHint: '계산대의 The Well QR을 화면 안에 맞춰 주세요',
    cameraFailed: '카메라를 쓸 수 없어요. QR을 사진으로 찍어 주세요.',
    takePhoto: '사진 찍어서 스캔',
    retryCamera: '카메라 다시 시도',
    notOurQr: 'The Well 제휴 가게 QR이 아니에요',
    noQrInPhoto: '사진에서 QR을 찾지 못했어요. 다시 찍어 주세요.',
    scanError: 'QR을 읽지 못했어요. 다시 시도해 주세요.',
    close: '닫기',
    processing: '적립 중…',
    resStamped: '스탬프 1개 적립!',
    resCoupon: '쿠폰이 발급됐어요!',
    resWelcome: '첫 방문 웰컴 음료 쿠폰이 발급됐어요!',
    resCouponSub: (n) => `음료 1잔 쿠폰 · 보유 ${n}장`,
    resAlready: '오늘은 이미 적립했어요',
    resAlreadySub: '같은 가게는 하루 1번 적립돼요.',
    resClosed: '지금은 영업시간이 아니에요',
    resClosedSub: (o, c) => `영업시간(${o}–${c})에 다시 스캔해 주세요.`,
    resInvalid: '잘못된 QR이에요',
    resInvalidSub: '매장에 있는 QR을 다시 스캔해 주세요.',
    resError: '잠시 후 다시 시도해 주세요',
    viewShop: '가게 정보 보기',
    couponTitle: '음료 1잔 무료 쿠폰',
    showStaff: '직원에게 이 화면을 보여주세요',
    staffPin: '직원 PIN 4자리',
    confirmUse: '사용 완료',
    usedDone: '쿠폰을 사용했어요',
    usedAt: (t) => `사용 완료 · ${t}`,
    cannotReuse: '사용한 쿠폰은 다시 쓸 수 없어요.',
    wrongPin: (n) => `PIN이 틀렸어요 (남은 횟수 ${n}번)`,
    locked: (t) => `PIN을 5번 틀려 ${t}까지 잠겼어요`,
    dailyLimit: '쿠폰은 같은 가게에서 하루 1장만 쓸 수 있어요.',
    pinNotSet: '이 가게는 아직 쿠폰을 받을 준비가 안 됐어요.',
    noCoupons: '사용할 수 있는 쿠폰이 없어요',
    usedHistory: '사용한 쿠폰',
    issuedAt: (t) => `발급 ${t}`,
    couponsLeft: (n) => `남은 쿠폰 ${n}장`,
  },
  en: {
    sectionTitle: 'Partner shops',
    sectionSub: 'Perks for The Well members',
    badge: 'Partner',
    benefit: (n) => `Free drink every ${n} visits`,
    benefitWithWelcome: (n) => `Free drink on your first visit + every ${n} visits after`,
    benefitTitle: 'Perk',
    benefitNote: 'Choose your drink at the shop.',
    stampTitle: 'My stamps',
    comingSoon: 'Stamp collection is coming soon',
    hours: 'Hours',
    daily: 'Daily',
    location: 'Location',
    phone: 'Phone',
    call: 'Call',
    notFound: "Couldn't find this shop",
    back: 'Back',
    stampProgress: (s, p) => `Stamps ${s}/${p}`,
    couponCount: (n) => (n === 1 ? '1 coupon' : `${n} coupons`),
    nextCoupon: (left) => (left === 1 ? '1 more visit for a free drink' : `${left} more visits for a free drink`),
    firstVisitHint: 'Get a free drink coupon right on your first visit',
    scanToCollect: 'Scan QR to collect',
    loginToCollect: 'Log in to collect stamps',
    login: 'Log in',
    useCoupon: 'Use coupon',
    onceADay: 'One stamp per shop per day, during opening hours.',
    onceADayAnytime: 'One stamp per shop per day.',
    scanTitle: 'Scan shop QR',
    scanHint: 'Fit The Well QR at the counter inside the frame',
    cameraFailed: "Camera isn't available. Take a photo of the QR instead.",
    takePhoto: 'Take a photo to scan',
    retryCamera: 'Try camera again',
    notOurQr: "This isn't a The Well partner QR",
    noQrInPhoto: "Couldn't find a QR in the photo. Please try again.",
    scanError: "Couldn't read the QR. Please try again.",
    close: 'Close',
    processing: 'Collecting…',
    resStamped: 'Stamp collected!',
    resCoupon: 'You got a coupon!',
    resWelcome: 'Welcome! Here is a free drink coupon for your first visit',
    resCouponSub: (n) => `Free drink coupon · ${n} in total`,
    resAlready: 'Already collected today',
    resAlreadySub: 'You can collect once a day per shop.',
    resClosed: 'The shop is closed now',
    resClosedSub: (o, c) => `Please scan again during opening hours (${o}–${c}).`,
    resInvalid: 'Invalid QR code',
    resInvalidSub: 'Please scan the QR at the shop again.',
    resError: 'Something went wrong. Please try again.',
    viewShop: 'View shop',
    couponTitle: 'Free drink coupon',
    showStaff: 'Show this screen to the staff',
    staffPin: 'Staff PIN (4 digits)',
    confirmUse: 'Mark as used',
    usedDone: 'Coupon used',
    usedAt: (t) => `Used · ${t}`,
    cannotReuse: 'A used coupon cannot be used again.',
    wrongPin: (n) => `Wrong PIN (${n} ${n === 1 ? 'try' : 'tries'} left)`,
    locked: (t) => `Too many wrong PINs. Locked until ${t}.`,
    dailyLimit: 'You can use only one coupon per shop per day.',
    pinNotSet: "This shop isn't ready to accept coupons yet.",
    noCoupons: 'No coupons available',
    usedHistory: 'Used coupons',
    issuedAt: (t) => `Issued ${t}`,
    couponsLeft: (n) => (n === 1 ? '1 coupon left' : `${n} coupons left`),
  },
  zh: {
    sectionTitle: '合作店铺',
    sectionSub: 'The Well 会员专属优惠',
    badge: '合作',
    benefit: (n) => `每到店${n}次赠送饮料1杯`,
    benefitWithWelcome: (n) => `首次到店赠饮料1杯 + 之后每到店${n}次再赠1杯`,
    benefitTitle: '优惠',
    benefitNote: '饮料种类请在店内选择。',
    stampTitle: '我的印章',
    comingSoon: '集章功能即将上线',
    hours: '营业时间',
    daily: '每天',
    location: '位置',
    phone: '电话',
    call: '拨打电话',
    notFound: '找不到店铺信息',
    back: '返回',
    stampProgress: (s, p) => `印章 ${s}/${p}`,
    couponCount: (n) => `优惠券${n}张`,
    nextCoupon: (left) => `再到店${left}次即可获得饮料券`,
    firstVisitHint: '首次到店集章即送饮料券1张',
    scanToCollect: '扫码集章',
    loginToCollect: '登录后即可集章',
    login: '登录',
    useCoupon: '使用优惠券',
    onceADay: '同一店铺每天限集章1次，仅限营业时间内。',
    onceADayAnytime: '同一店铺每天限集章1次。',
    scanTitle: '扫描店铺二维码',
    scanHint: '请将收银台的 The Well 二维码对准取景框',
    cameraFailed: '无法使用相机，请拍摄二维码照片。',
    takePhoto: '拍照扫描',
    retryCamera: '重试相机',
    notOurQr: '这不是 The Well 合作店铺的二维码',
    noQrInPhoto: '照片中未找到二维码，请重拍。',
    scanError: '无法识别二维码，请重试。',
    close: '关闭',
    processing: '正在集章…',
    resStamped: '集章成功！',
    resCoupon: '已获得优惠券！',
    resWelcome: '首次到店欢迎饮料券已发放！',
    resCouponSub: (n) => `免费饮料券 · 共${n}张`,
    resAlready: '今天已经集过章了',
    resAlreadySub: '同一店铺每天只能集章一次。',
    resClosed: '现在不是营业时间',
    resClosedSub: (o, c) => `请在营业时间（${o}–${c}）内重新扫描。`,
    resInvalid: '二维码无效',
    resInvalidSub: '请重新扫描店内的二维码。',
    resError: '出错了，请稍后再试',
    viewShop: '查看店铺',
    couponTitle: '免费饮料券',
    showStaff: '请向店员出示此页面',
    staffPin: '店员PIN（4位）',
    confirmUse: '确认使用',
    usedDone: '优惠券已使用',
    usedAt: (t) => `已使用 · ${t}`,
    cannotReuse: '已使用的优惠券不能再次使用。',
    wrongPin: (n) => `PIN错误（剩余${n}次）`,
    locked: (t) => `PIN错误次数过多，已锁定至${t}`,
    dailyLimit: '同一店铺每天只能使用一张优惠券。',
    pinNotSet: '该店铺暂时无法使用优惠券。',
    noCoupons: '没有可用的优惠券',
    usedHistory: '已使用的优惠券',
    issuedAt: (t) => `发放 ${t}`,
    couponsLeft: (n) => `剩余优惠券${n}张`,
  },
  ja: {
    sectionTitle: '提携店',
    sectionSub: 'The Well会員限定の特典',
    badge: '提携',
    benefit: (n) => `${n}回の来店ごとにドリンク1杯無料`,
    benefitWithWelcome: (n) => `初回来店でドリンク1杯 + 以降${n}回来店ごとに1杯`,
    benefitTitle: '特典',
    benefitNote: 'ドリンクの種類は店内でお選びください。',
    stampTitle: 'マイスタンプ',
    comingSoon: 'スタンプ機能はまもなく開始します',
    hours: '営業時間',
    daily: '毎日',
    location: '場所',
    phone: '電話',
    call: '電話する',
    notFound: '店舗情報が見つかりません',
    back: '戻る',
    stampProgress: (s, p) => `スタンプ ${s}/${p}`,
    couponCount: (n) => `クーポン${n}枚`,
    nextCoupon: (left) => `あと${left}回の来店でドリンク1杯クーポン`,
    firstVisitHint: '初回来店のスタンプですぐにドリンク1杯クーポン',
    scanToCollect: 'QRをスキャンして貯める',
    loginToCollect: 'ログインするとスタンプを貯められます',
    login: 'ログイン',
    useCoupon: 'クーポンを使う',
    onceADay: '同じ店舗は1日1回、営業時間内のみ貯まります。',
    onceADayAnytime: '同じ店舗は1日1回貯まります。',
    scanTitle: '店舗のQRをスキャン',
    scanHint: 'レジのThe Well QRを枠内に合わせてください',
    cameraFailed: 'カメラを使えません。QRの写真を撮ってください。',
    takePhoto: '写真を撮ってスキャン',
    retryCamera: 'カメラを再試行',
    notOurQr: 'The Well提携店のQRではありません',
    noQrInPhoto: '写真からQRが見つかりません。もう一度撮ってください。',
    scanError: 'QRを読み取れませんでした。もう一度お試しください。',
    close: '閉じる',
    processing: 'スタンプ処理中…',
    resStamped: 'スタンプを1つ獲得！',
    resCoupon: 'クーポンが発行されました！',
    resWelcome: '初回来店ウェルカムドリンククーポンが発行されました！',
    resCouponSub: (n) => `ドリンク1杯無料クーポン · 計${n}枚`,
    resAlready: '本日はすでに獲得済みです',
    resAlreadySub: '同じ店舗は1日1回までです。',
    resClosed: '現在は営業時間外です',
    resClosedSub: (o, c) => `営業時間（${o}–${c}）にもう一度スキャンしてください。`,
    resInvalid: '無効なQRです',
    resInvalidSub: '店内のQRをもう一度スキャンしてください。',
    resError: 'エラーが発生しました。しばらくしてから再試行してください',
    viewShop: '店舗を見る',
    couponTitle: 'ドリンク1杯無料クーポン',
    showStaff: 'この画面をスタッフに見せてください',
    staffPin: 'スタッフPIN（4桁）',
    confirmUse: '使用済みにする',
    usedDone: 'クーポンを使用しました',
    usedAt: (t) => `使用済み · ${t}`,
    cannotReuse: '使用済みのクーポンは再利用できません。',
    wrongPin: (n) => `PINが違います（残り${n}回）`,
    locked: (t) => `PINを5回間違えたため${t}までロックされています`,
    dailyLimit: '同じ店舗で使えるクーポンは1日1枚までです。',
    pinNotSet: 'この店舗はまだクーポンに対応していません。',
    noCoupons: '使えるクーポンがありません',
    usedHistory: '使用済みクーポン',
    issuedAt: (t) => `発行 ${t}`,
    couponsLeft: (n) => `残りクーポン${n}枚`,
  },
};

/** 매장 QR 스티커 안내 문구 — 4개 언어를 한 장에 함께 인쇄한다 */
export const STICKER_LINES = [
  'The Well 앱에서 스캔하세요',
  'Scan with The Well app',
  '请用 The Well 应用扫描',
  'The Wellアプリでスキャンしてください',
] as const;
