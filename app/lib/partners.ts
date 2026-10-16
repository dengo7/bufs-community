// 제휴 가게 — 데이터 조회와 UI 라벨(4개 언어).
// 데이터는 Supabase partner_stores(공개 컬럼만). 비밀값은 partner_store_secrets 에 있어 여기서 읽지 않는다.
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
  translations: Partial<Record<Exclude<UILang, 'ko'>, LocalizedFields>> | null;
};

const PUBLIC_COLUMNS =
  'id, slug, name, intro, address, transit_note, phone, open_time, close_time, hours_note, image, stamps_per_reward, translations';

/**
 * 운영 중인 제휴 가게 목록. 마이그레이션 적용 전(테이블 없음)이거나 조회가 실패하면 []
 * → 호출부는 빈 배열이면 제휴 섹션을 숨긴다.
 */
export async function fetchPartnerStores(): Promise<PartnerStore[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('partner_stores')
      .select(PUBLIC_COLUMNS)
      .order('sort_order', { ascending: true });
    if (error) return [];
    return (data ?? []) as PartnerStore[];
  } catch {
    return [];
  }
}

/** slug로 한 곳. 없거나 조회 실패면 null */
export async function fetchPartnerStore(slug: string): Promise<PartnerStore | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('partner_stores')
      .select(PUBLIC_COLUMNS)
      .eq('slug', slug)
      .maybeSingle();
    if (error) return null;
    return (data as PartnerStore | null) ?? null;
  } catch {
    return null;
  }
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

// 앱 문구에는 주류 관련 단어를 쓰지 않는다 — 혜택은 "음료 1잔"으로만 표기
export const PARTNER_T: Record<UILang, {
  sectionTitle: string;
  sectionSub: string;
  badge: string;
  benefit: (n: number) => string;
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
}> = {
  ko: {
    sectionTitle: '제휴 가게',
    sectionSub: 'The Well 회원 전용 혜택',
    badge: '제휴',
    benefit: (n) => `방문 ${n}회마다 음료 1잔 무료`,
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
  },
  en: {
    sectionTitle: 'Partner shops',
    sectionSub: 'Perks for The Well members',
    badge: 'Partner',
    benefit: (n) => `Free drink every ${n} visits`,
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
  },
  zh: {
    sectionTitle: '合作店铺',
    sectionSub: 'The Well 会员专属优惠',
    badge: '合作',
    benefit: (n) => `每到店${n}次赠送饮料1杯`,
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
  },
  ja: {
    sectionTitle: '提携店',
    sectionSub: 'The Well会員限定の特典',
    badge: '提携',
    benefit: (n) => `${n}回の来店ごとにドリンク1杯無料`,
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
  },
};
