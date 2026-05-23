import {
  GraduationCap, Megaphone, Languages, FileText, Home as HomeIcon,
  Landmark, Smartphone, ShieldCheck, HeartPulse, Briefcase,
  type LucideIcon,
} from 'lucide-react';

// DB에 저장되는 언어 코드
export type Language = 'kr' | 'en' | 'cn' | 'jp';

// UI 언어 코드 (page.tsx 기존 패턴과 동일)
export type UILang = 'ko' | 'en' | 'zh' | 'ja';

/** UI lang → DB language 변환 */
export function uiLangToLanguage(lang: UILang): Language {
  const map: Record<UILang, Language> = { ko: 'kr', en: 'en', zh: 'cn', ja: 'jp' };
  return map[lang];
}

export type CategorySlug =
  | 'school-life'
  | 'announcements'
  | 'translation-help'
  | 'visa'
  | 'housing'
  | 'bank'
  | 'telecom'
  | 'insurance'
  | 'medical'
  | 'part-time';

export interface Category {
  slug: CategorySlug;
  Icon: LucideIcon;
  /** labels — page.tsx의 기존 텍스트와 100% 동일 */
  labels: Record<Language, string>;
}

// ⚠️ 라벨은 app/page.tsx CATEGORIES 배열과 완전히 동일
export const CATEGORIES: Category[] = [
  {
    slug: 'school-life',
    Icon: GraduationCap,
    labels: { kr: '학교생활',      en: 'Campus Life',      cn: '校园生活',  jp: 'キャンパスライフ' },
  },
  {
    slug: 'announcements',
    Icon: Megaphone,
    labels: { kr: '학교공지',      en: 'Announcements',    cn: '学校公告',  jp: 'お知らせ' },
  },
  {
    slug: 'translation-help',
    Icon: Languages,
    labels: { kr: '번역·도움요청', en: 'Translation·Help', cn: '翻译·求助', jp: '翻訳·助け' },
  },
  {
    slug: 'visa',
    Icon: FileText,
    labels: { kr: '비자',          en: 'Visa',             cn: '签证',      jp: 'ビザ' },
  },
  {
    slug: 'housing',
    Icon: HomeIcon,
    labels: { kr: '부동산',        en: 'Housing',          cn: '房地产',    jp: '不動産' },
  },
  {
    slug: 'bank',
    Icon: Landmark,
    labels: { kr: '은행',          en: 'Bank',             cn: '银行',      jp: '銀行' },
  },
  {
    slug: 'telecom',
    Icon: Smartphone,
    labels: { kr: '통신·유심',     en: 'Telecom·SIM',      cn: '通信·SIM', jp: '通信·SIM' },
  },
  {
    slug: 'insurance',
    Icon: ShieldCheck,
    labels: { kr: '보험',          en: 'Insurance',        cn: '保险',      jp: '保険' },
  },
  {
    slug: 'medical',
    Icon: HeartPulse,
    labels: { kr: '병원',          en: 'Medical',          cn: '医院',      jp: '病院' },
  },
  {
    slug: 'part-time',
    Icon: Briefcase,
    labels: { kr: '알바',          en: 'Part-time',        cn: '兼职',      jp: 'アルバイト' },
  },
];

export const CATEGORY_SLUGS: string[] = CATEGORIES.map(c => c.slug);

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find(c => c.slug === slug);
}

export function getCategoryLabel(slug: string, lang: Language): string {
  return getCategoryBySlug(slug)?.labels[lang] ?? slug;
}
