// 비교과 프로그램 — 데이터 조회, 다국어 텍스트, 신청 상태 계산, UI 라벨(4개 언어).
// 데이터는 extracurricular_programs(023). 당분간 수동 입력이며 크롤러·푸시와 무관하다.
// 다국어 관례는 partner_stores 와 같다: ko 는 본 컬럼, 그 외 언어는 translations[lang][field].
import type { UILang } from './categories';
import { getSupabaseClient } from './supabase/client';

export type ProgramFormat = 'offline' | 'online' | 'hybrid';

type LocalizedTextField =
  | 'title' | 'department' | 'program_type' | 'session_label' | 'summary' | 'location' | 'target' | 'how_to_apply';

type LocalizedFields = Partial<Record<LocalizedTextField, string>> & { benefits?: string[] };

export type ProgramRow = {
  id: string;
  slug: string;
  title: string;
  department: string | null;
  contact: string | null;
  program_type: string | null;
  session_label: string | null;
  format: ProgramFormat | null;
  summary: string | null;
  event_at: string | null;
  event_end_at: string | null;
  location: string | null;
  apply_start: string | null;
  apply_end: string | null;
  capacity: number | null;
  target: string | null;
  benefits: string[];
  certificate: boolean | null;
  no_show_flag: boolean | null;
  how_to_apply: string | null;
  source_url: string | null;
  translations: Partial<Record<Exclude<UILang, 'ko'>, LocalizedFields>> | null;
  created_at: string;
};

export const PROGRAM_SELECT =
  'id, slug, title, department, contact, program_type, session_label, format, summary, ' +
  'event_at, event_end_at, location, apply_start, apply_end, capacity, target, benefits, ' +
  'certificate, no_show_flag, how_to_apply, source_url, translations, created_at';

/**
 * 공개 프로그램 전체. 신청 마감이 늦은 것부터(진행 중인 것이 위로). 마감 없는 행은 뒤로.
 * 마이그레이션 적용 전(테이블 없음)이거나 조회가 실패하면 [] → 호출부는 빈 배열이면 섹션을 숨긴다.
 */
export async function fetchPrograms(): Promise<ProgramRow[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('extracurricular_programs')
      .select(PROGRAM_SELECT)
      .eq('published', true)
      .order('apply_end', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true });
    if (error) return [];
    return (data ?? []) as unknown as ProgramRow[];
  } catch {
    return [];
  }
}

/** 홈 미리보기 — 지금 신청할 수 있는 프로그램만, 마감이 가까운 순으로 limit 건 */
export async function fetchOpenPrograms(limit: number): Promise<ProgramRow[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await getSupabaseClient()
      .from('extracurricular_programs')
      .select(PROGRAM_SELECT)
      .eq('published', true)
      .gt('apply_end', nowIso)
      .or(`apply_start.is.null,apply_start.lte.${nowIso}`)
      .order('apply_end', { ascending: true })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as unknown as ProgramRow[];
  } catch {
    return [];
  }
}

/** slug로 한 건(공개). 없거나 조회 실패면 null */
export async function fetchProgram(slug: string): Promise<ProgramRow | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('extracurricular_programs')
      .select(PROGRAM_SELECT)
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as ProgramRow;
  } catch {
    return null;
  }
}

// ── 다국어 텍스트 ───────────────────────────────────────────────────────
/** ko는 본 컬럼, 그 외 언어는 translations[lang][field] (없으면 ko로 폴백) */
export function programText(p: ProgramRow, lang: UILang, field: LocalizedTextField): string {
  const base = p[field] ?? '';
  if (lang === 'ko') return base;
  return p.translations?.[lang]?.[field] || base;
}

/** 혜택 목록 — 번역이 비어 있으면 ko 목록 그대로 */
export function programBenefits(p: ProgramRow, lang: UILang): string[] {
  if (lang === 'ko') return p.benefits ?? [];
  const tr = p.translations?.[lang]?.benefits;
  return tr && tr.length ? tr : (p.benefits ?? []);
}

/** 현재 언어의 번역본(제목 기준)이 실제로 있는지 — "번역" 배지용 */
export const hasProgramTranslation = (p: ProgramRow, lang: UILang): boolean =>
  lang !== 'ko' && Boolean(p.translations?.[lang]?.title);

// ── 신청 상태 ───────────────────────────────────────────────────────────
export type ApplyStatus = 'open' | 'upcoming' | 'closed' | 'unknown';

/** now(ms) 기준 신청 상태. 마감이 없으면 unknown(표시하지 않음) */
export function applyStatus(p: ProgramRow, now: number): ApplyStatus {
  const end = p.apply_end ? Date.parse(p.apply_end) : NaN;
  if (Number.isNaN(end)) return 'unknown';
  if (now >= end) return 'closed';
  const start = p.apply_start ? Date.parse(p.apply_start) : NaN;
  if (!Number.isNaN(start) && now < start) return 'upcoming';
  return 'open';
}

/** 마감까지 남은 일수(0 = 오늘 마감). 마감이 지났거나 없으면 null */
export function daysUntilClose(p: ProgramRow, now: number): number | null {
  const end = p.apply_end ? Date.parse(p.apply_end) : NaN;
  if (Number.isNaN(end) || now >= end) return null;
  return Math.floor((end - now) / (24 * 60 * 60 * 1000));
}

// ── 날짜·시간 표기 (Asia/Seoul 고정) ────────────────────────────────────
const LOCALE: Record<UILang, string> = { ko: 'ko-KR', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP' };
const TZ = 'Asia/Seoul';

/** 2026. 11. 26. (목) 오후 5:00 — 날짜 + 요일 + 시각 */
export function formatDateTime(iso: string | null, lang: UILang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric', weekday: 'short',
    hour: 'numeric', minute: '2-digit',
  }).format(d);
}

/** 2026. 11. 26. — 날짜만 */
export function formatDate(iso: string | null, lang: UILang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric',
  }).format(d);
}

/** 신청기간: "시작일 ~ 마감 일시". 한쪽만 있으면 그것만 */
export function formatApplyPeriod(p: ProgramRow, lang: UILang): string {
  const start = formatDate(p.apply_start, lang);
  const end = formatDateTime(p.apply_end, lang);
  if (start && end) return `${start} ~ ${end}`;
  return start || end;
}

/** 일시: 시작(+ 종료 시각이 있으면 "~ HH:MM") */
export function formatEventTime(p: ProgramRow, lang: UILang): string {
  const start = formatDateTime(p.event_at, lang);
  if (!start) return '';
  if (!p.event_end_at) return start;
  const end = new Date(p.event_end_at);
  if (Number.isNaN(end.getTime())) return start;
  const endTime = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(end);
  return `${start} ~ ${endTime}`;
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

// ── UI 라벨 ─────────────────────────────────────────────────────────────
type ProgramDict = {
  sectionTitle: string; viewAll: string; back: string;
  empty: string; notFound: string; loading: string;
  translated: string;
  format: Record<ProgramFormat, string>;
  status: Record<Exclude<ApplyStatus, 'unknown'>, string>;
  closesIn: (days: number) => string;
  when: string; where: string; applyPeriod: string; capacity: string; target: string;
  people: (n: number) => string;
  benefits: string; certificate: string; noShow: string;
  yes: string; no: string;
  certificateYes: string; certificateNo: string;
  noShowYes: string; noShowNo: string;
  howToApply: string; organizer: string; contact: string; call: string;
  loginNoticeTitle: string; loginNotice: string;
  openOriginal: string;
};

export const PROGRAM_T: Record<UILang, ProgramDict> = {
  ko: {
    sectionTitle: '비교과 프로그램', viewAll: '전체보기 →', back: '뒤로가기',
    empty: '등록된 프로그램이 없어요', notFound: '프로그램을 찾을 수 없어요', loading: '불러오는 중...',
    translated: '번역',
    format: { offline: '대면', online: '온라인', hybrid: '대면·온라인' },
    status: { open: '신청중', upcoming: '신청 예정', closed: '마감' },
    closesIn: (d) => (d === 0 ? '오늘 마감' : `마감 D-${d}`),
    when: '일시', where: '장소', applyPeriod: '신청기간', capacity: '모집인원', target: '대상',
    people: (n) => `${n}명`,
    benefits: '혜택', certificate: '수료증', noShow: '불참자 지정',
    yes: '예', no: '아니요',
    certificateYes: '발급', certificateNo: '발급 불가',
    noShowYes: '신청 후 불참하면 불참자로 기록돼요', noShowNo: '불참 기록 없음',
    howToApply: '신청 방법', organizer: '주관', contact: '문의', call: '전화 걸기',
    loginNoticeTitle: '신청은 학교 시스템에서',
    loginNotice: '이 프로그램은 BUFS 인재시스템에서 신청해요. 학교 포털 계정으로 로그인이 필요하고, The Well 앱에서는 신청할 수 없어요.',
    openOriginal: '원문 신청 페이지 열기',
  },
  en: {
    sectionTitle: 'Extracurricular Programs', viewAll: 'View all →', back: 'Back',
    empty: 'No programs yet', notFound: 'Program not found', loading: 'Loading...',
    translated: 'Translated',
    format: { offline: 'In person', online: 'Online', hybrid: 'In person & online' },
    status: { open: 'Open', upcoming: 'Opens soon', closed: 'Closed' },
    closesIn: (d) => (d === 0 ? 'Closes today' : `Closes in ${d}d`),
    when: 'When', where: 'Where', applyPeriod: 'Application period', capacity: 'Capacity', target: 'Who can apply',
    people: (n) => `${n} people`,
    benefits: 'Benefits', certificate: 'Certificate (수료증)', noShow: 'No-show record (불참자 지정)',
    yes: 'Yes', no: 'No',
    certificateYes: 'Issued', certificateNo: 'Not issued',
    noShowYes: 'If you apply and do not attend, you are recorded as a no-show', noShowNo: 'No-shows are not recorded',
    howToApply: 'How to apply', organizer: 'Organizer', contact: 'Contact', call: 'Call',
    loginNoticeTitle: 'Apply through the school system',
    loginNotice: 'Applications are made in the BUFS Talent System (BUFS 인재시스템). You need to log in with your school portal account. You cannot apply inside The Well app.',
    openOriginal: 'Open the application page',
  },
  zh: {
    sectionTitle: '非教学课程', viewAll: '查看全部 →', back: '返回',
    empty: '暂无课程', notFound: '找不到该课程', loading: '加载中...',
    translated: '已翻译',
    format: { offline: '线下', online: '线上', hybrid: '线下·线上' },
    status: { open: '报名中', upcoming: '即将开放', closed: '已截止' },
    closesIn: (d) => (d === 0 ? '今天截止' : `还剩${d}天`),
    when: '时间', where: '地点', applyPeriod: '报名期间', capacity: '招募人数', target: '对象',
    people: (n) => `${n}人`,
    benefits: '收获', certificate: '结业证书（수료증）', noShow: '缺席记录（불참자 지정）',
    yes: '是', no: '否',
    certificateYes: '发放', certificateNo: '不发放',
    noShowYes: '报名后未参加会被记录为缺席', noShowNo: '不记录缺席',
    howToApply: '报名方法', organizer: '主办', contact: '咨询', call: '拨打电话',
    loginNoticeTitle: '请在学校系统报名',
    loginNotice: '本课程需在BUFS人才系统（BUFS 인재시스템）报名，需要用学校门户账号登录。无法在The Well应用内报名。',
    openOriginal: '打开报名页面',
  },
  ja: {
    sectionTitle: '非教科プログラム', viewAll: 'すべて見る →', back: '戻る',
    empty: 'プログラムはまだありません', notFound: 'プログラムが見つかりません', loading: '読み込み中...',
    translated: '翻訳',
    format: { offline: '対面', online: 'オンライン', hybrid: '対面・オンライン' },
    status: { open: '受付中', upcoming: '受付予定', closed: '締切' },
    closesIn: (d) => (d === 0 ? '本日締切' : `締切まで${d}日`),
    when: '日時', where: '場所', applyPeriod: '申込期間', capacity: '募集人数', target: '対象',
    people: (n) => `${n}名`,
    benefits: '特典', certificate: '修了証（수료증）', noShow: '欠席記録（불참자 지정）',
    yes: 'はい', no: 'いいえ',
    certificateYes: '発行', certificateNo: '発行なし',
    noShowYes: '申し込み後に欠席すると欠席者として記録されます', noShowNo: '欠席の記録なし',
    howToApply: '申込方法', organizer: '主催', contact: 'お問い合わせ', call: '電話する',
    loginNoticeTitle: '申し込みは学校のシステムで',
    loginNotice: 'このプログラムはBUFS人材システム（BUFS 인재시스템）で申し込みます。学校ポータルのアカウントでログインが必要で、The Wellアプリ内からは申し込めません。',
    openOriginal: '申込ページを開く',
  },
};

/** 신청 상태 칩 색 — 공지 칩과 같은 파스텔 톤 */
export const STATUS_CHIP: Record<Exclude<ApplyStatus, 'unknown'>, string> = {
  open:     'bg-[#EBF6F1] text-[#2A6B52] border-[#B8DDD0]',
  upcoming: 'bg-[#EDF4FB] text-[#2B5FA0] border-[#C4D8EE]',
  closed:   'bg-slate-50 text-slate-500 border-slate-200',
};

export const TYPE_CHIP   = 'bg-[#F2F0FB] text-[#5B52A8] border-[#D8D5EF]';
export const FORMAT_CHIP = 'bg-[#F9F3E8] text-[#92702A] border-[#EEE0C4]';
