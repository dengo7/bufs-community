import type { UILang } from './categories';

export type NoticeSource = 'academic' | 'global';

export type NoticeRow = {
  id: string;
  source: NoticeSource;
  wr_id: number;
  title: string;              // ko 원문
  category: string;
  published_at: string;       // YYYY-MM-DD
  source_url: string;
  // 가이드와 같은 관례 — ko는 title 컬럼, 그 외 언어는 translations[lang].title
  translations: { [lang: string]: { title?: string } | undefined } | null;
  created_at: string;
};

export const NOTICE_SELECT =
  'id, source, wr_id, title, category, published_at, source_url, translations, created_at';

/**
 * 수집(created_at) 48시간 이내 + 게시일(published_at) 7일 이내일 때만 NEW.
 * created_at만 보면 백필로 한꺼번에 들어온 옛 공지가 전부 NEW가 되므로 게시일도 함께 본다.
 * published_at은 날짜만 있어 Asia/Seoul 자정을 기준 시각으로 삼는다.
 */
const NEW_CREATED_WINDOW_MS = 48 * 60 * 60 * 1000;
const NEW_PUBLISHED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const isNewNotice = (createdAt: string, publishedAt: string): boolean => {
  const created = Date.parse(createdAt || '');
  if (Number.isNaN(created)) return false;
  if (Date.now() - created >= NEW_CREATED_WINDOW_MS) return false;

  const published = Date.parse(`${(publishedAt || '').slice(0, 10)}T00:00:00+09:00`);
  if (Number.isNaN(published)) return false;
  return Date.now() - published < NEW_PUBLISHED_WINDOW_MS;
};

/** 제목: ko이거나 번역이 없으면(빈 값 포함) 한국어 원문으로 폴백 */
export const noticeTitle = (n: NoticeRow, lang: UILang): string =>
  (lang !== 'ko' && n.translations?.[lang]?.title) || n.title;

/** 현재 언어의 번역본이 실제로 있는지 (자동 번역 배지용) */
export const hasTranslation = (n: NoticeRow, lang: UILang): boolean =>
  lang !== 'ko' && Boolean(n.translations?.[lang]?.title);

/** published_at(YYYY-MM-DD) → 2026.08.11 */
export const formatNoticeDate = (published: string): string =>
  (published || '').slice(0, 10).replace(/-/g, '.');

// ── 다국어 라벨 ─────────────────────────────────────────────────────────
export const NOTICE_T = {
  ko: {
    title: '학사공지', viewAll: '전체보기 →', viewOriginal: '원문 보기',
    autoTranslated: '자동 번역', loadMore: '더 보기', loading: '불러오는 중...',
    empty: '공지가 없어요',
    all: '전체', academic: '학사공지', global: '국제교류처',
    backAria: '뒤로가기',
  },
  en: {
    title: 'Notices', viewAll: 'View all →', viewOriginal: 'View original',
    autoTranslated: 'Auto-translated', loadMore: 'Load more', loading: 'Loading...',
    empty: 'No notices yet',
    all: 'All', academic: 'Academic', global: 'Global',
    backAria: 'Back',
  },
  zh: {
    title: '学校公告', viewAll: '查看全部 →', viewOriginal: '查看原文',
    autoTranslated: '自动翻译', loadMore: '加载更多', loading: '加载中...',
    empty: '暂无公告',
    all: '全部', academic: '学事', global: '国际交流处',
    backAria: '返回',
  },
  ja: {
    title: '学校からのお知らせ', viewAll: 'すべて見る →', viewOriginal: '原文を見る',
    autoTranslated: '自動翻訳', loadMore: 'もっと見る', loading: '読み込み中...',
    empty: 'お知らせがありません',
    all: 'すべて', academic: '学事', global: '国際交流処',
    backAria: '戻る',
  },
} as const;

export const NOTICE_CATEGORY_LABELS: Record<string, Record<UILang, string>> = {
  registration: { ko: '수강신청',  en: 'Registration', zh: '选课',   ja: '履修登録' },
  exam:         { ko: '시험',      en: 'Exam',         zh: '考试',   ja: '試験' },
  calendar:     { ko: '학사일정',  en: 'Calendar',     zh: '学事日程', ja: '学事日程' },
  scholarship:  { ko: '장학',      en: 'Scholarship',  zh: '奖学金', ja: '奨学金' },
  admission:    { ko: '입학',      en: 'Admission',    zh: '入学',   ja: '入学' },
  exchange:     { ko: '교환·파견', en: 'Exchange',     zh: '交换',   ja: '交換' },
  event:        { ko: '행사',      en: 'Event',        zh: '活动',   ja: 'イベント' },
  etc:          { ko: '기타',      en: 'Other',        zh: '其他',   ja: 'その他' },
};

export const noticeCategoryLabel = (category: string, lang: UILang): string =>
  NOTICE_CATEGORY_LABELS[category]?.[lang] ?? NOTICE_CATEGORY_LABELS.etc[lang];

/** 카테고리 배지 색 — 홈 최근 게시글 칩과 같은 파스텔 톤 */
export const NOTICE_CATEGORY_CHIP: Record<string, string> = {
  registration: 'bg-[#EDF4FB] text-[#2B5FA0] border-[#C4D8EE]',
  exam:         'bg-[#FAF0F2] text-[#8A3A4A] border-[#E8CDD2]',
  calendar:     'bg-[#F9F3E8] text-[#92702A] border-[#EEE0C4]',
  scholarship:  'bg-[#EBF6F1] text-[#2A6B52] border-[#B8DDD0]',
  admission:    'bg-[#EEF1FA] text-[#3A4A9A] border-[#C8CEEC]',
  exchange:     'bg-[#F2F0FB] text-[#5B52A8] border-[#D8D5EF]',
  event:        'bg-[#FBF1EB] text-[#9A5A3A] border-[#EEDDD2]',
  etc:          'bg-slate-50 text-slate-600 border-slate-200',
};

export const noticeChipClass = (category: string): string =>
  NOTICE_CATEGORY_CHIP[category] ?? NOTICE_CATEGORY_CHIP.etc;
