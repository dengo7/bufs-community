// 통학버스(마을버스 금정 3번 순환 노선) 데이터 · 도메인 로직
// - 단일 순환 노선: 부산외대에서 출발해 한 바퀴 돌아 다시 부산외대로 돌아온다.
// - 모든 시간표는 "부산외국어대학교 출발 기준". 역별 도착 시각은 공식 자료가 없어 제공하지 않는다.
// - React 에 의존하지 않는 순수 데이터로 유지한다. UI 라벨은 shuttleI18n.ts 에 둔다.
import type { UILang } from './categories';
import { SCHEDULE } from './schedule';

export const SHUTTLE_SOURCE = {
  /** 출처 (학교 공지 기반) */
  name: '부산외국어대학교 통학버스 안내',
  lastVerified: '2026-09-19',
} as const;

/** 운행 시간대 (공지 기준) */
export const SHUTTLE_SERVICE_HOURS = '07:00~23:00';

// ── 운행 구분 ─────────────────────────────────────────────────
export type ShuttleScheduleKey = 'regular-mon-thu' | 'regular-fri' | 'seasonal' | 'break';
export type ShuttleLineKey = 'geumjeong-3' | 'geumjeong-3-2';
export type ShuttleFare = 'free' | 'paid';

type L10n = Record<UILang, string>;

export const SHUTTLE_LINE_NAMES: Record<ShuttleLineKey, L10n> = {
  'geumjeong-3':   { ko: '금정 3번',   en: 'Geumjeong 3',   zh: '金井3路',   ja: '金井3番' },
  'geumjeong-3-2': { ko: '금정 3-2번', en: 'Geumjeong 3-2', zh: '金井3-2路', ja: '金井3-2番' },
};

// ── 시간표 (전부 부산외국어대학교 출발 기준) ──────────────────
export const TIMES_REGULAR_MON_THU: string[] = [
  '07:00', '07:15', '07:30', '07:45', '08:00', '08:05', '08:10', '08:15', '08:20', '08:25',
  '08:30', '08:35', '08:40', '08:45', '08:50', '08:55', '09:00', '09:04', '09:08', '09:12',
  '09:16', '09:20', '09:24', '09:28', '09:32', '09:36', '09:40', '09:45', '09:50', '09:55',
  '10:00', '10:04', '10:08', '10:12', '10:16', '10:20', '10:24', '10:28', '10:32', '10:36',
  '10:43', '10:47', '10:54', '11:01', '11:08', '11:15', '11:22', '11:29', '11:36', '11:43',
  '11:50', '11:57', '12:04', '12:11', '12:18', '12:25', '12:32', '12:39', '12:46', '12:53',
  '13:00', '13:05', '13:10', '13:15', '13:20', '13:25', '13:30', '13:35', '13:40', '13:45',
  '13:52', '13:59', '14:06', '14:13', '14:20', '14:27', '14:34', '14:41', '14:48', '14:55',
  '15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40', '15:45',
  '15:50', '15:55', '16:00', '16:05', '16:10', '16:15', '16:20', '16:25', '16:30', '16:35',
  '16:40', '16:45', '16:50', '16:55', '17:00', '17:05', '17:10', '17:15', '17:20', '17:25',
  '17:30', '17:35', '17:40', '17:45', '17:50', '17:55', '18:00', '18:10', '18:20', '18:30',
  '18:43', '18:56', '19:09', '19:22', '19:35', '19:48', '20:01', '20:14', '20:27', '20:40',
  '20:53', '21:06', '21:19', '21:32', '21:45', '21:58', '22:11', '22:24', '22:37', '23:00',
];

export const TIMES_REGULAR_FRI: string[] = [
  '07:00', '07:15', '07:30', '07:45', '08:00', '08:08', '08:16', '08:24', '08:32', '08:40',
  '08:48', '08:56', '09:04', '09:12', '09:20', '09:28', '09:36', '09:44', '09:52', '10:00',
  '10:08', '10:16', '10:24', '10:32', '10:40', '10:48', '10:56', '11:04', '11:12', '11:20',
  '11:28', '11:36', '11:44', '11:52', '12:07', '12:19', '12:31', '12:43', '12:55', '13:07',
  '13:11', '13:23', '13:31', '13:39', '13:47', '13:55', '14:03', '14:11', '14:19', '14:27',
  '14:35', '14:43', '14:51', '14:59', '15:07', '15:15', '15:23', '15:31', '15:39', '15:47',
  '15:55', '16:03', '16:11', '16:19', '16:27', '16:35', '16:43', '16:51', '16:59', '17:07',
  '17:15', '17:30', '17:38', '17:46', '18:00', '18:15', '18:28', '18:41', '18:54', '19:07',
  '19:20', '19:33', '19:46', '19:59', '20:12', '20:25', '20:38', '20:51', '21:04', '21:17',
  '21:30', '21:43', '21:56', '22:09', '22:22', '22:35', '22:48', '23:00',
];

export const TIMES_SEASONAL: string[] = [
  '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '09:08',
  '09:16', '09:24', '09:32', '09:40', '09:48', '09:56', '10:04', '10:12', '10:20', '10:30',
  '10:40', '10:50', '11:00', '11:10', '11:20', '11:30', '11:40', '11:50', '12:00', '12:10',
  '12:20', '12:30', '12:40', '12:50', '13:00', '13:08', '13:16', '13:24', '13:32', '13:40',
  '13:50', '14:00', '14:10', '14:20', '14:30', '14:40', '14:50', '15:00', '15:10', '15:20',
  '15:30', '15:40', '15:50', '16:00', '16:10', '16:20', '16:30', '16:40', '16:50', '17:00',
  '17:10', '17:17', '17:24', '17:31', '17:38', '17:45', '17:52', '18:00', '18:13', '18:26',
  '18:39', '18:52', '19:05', '19:18', '19:31', '19:44', '19:57', '20:10', '20:23', '20:36',
  '20:49', '21:02', '21:15', '21:28', '21:41', '21:54', '22:07', '22:20', '22:33', '22:46',
  '23:00',
];

export const TIMES_BREAK_GEUMJEONG_3: string[] = [
  '07:00', '07:25', '08:15', '08:40', '09:05', '09:30', '09:55', '10:20', '10:45', '11:10',
  '11:35', '12:00', '12:25', '12:50', '13:15', '13:40', '14:05', '14:30', '14:55', '15:20',
  '15:45', '16:10', '16:35', '17:25', '17:50', '18:15', '18:40', '19:05', '19:30', '19:55',
  '20:20', '20:45', '21:10', '21:35', '22:00', '22:25', '22:50',
];

export const TIMES_BREAK_GEUMJEONG_3_2: string[] = [
  '06:45', '07:15', '08:15', '08:45', '09:15', '09:45', '10:15', '10:45', '11:15', '11:45',
  '12:15', '12:45', '13:15', '13:45', '14:15', '14:45', '15:15', '15:45', '16:15', '16:45',
  '17:45', '18:15', '18:45', '19:15', '19:45', '20:15', '20:45', '21:15', '21:45', '22:15',
  '22:45',
];

/** 탭 하나가 보여 줄 시간표 섹션. line 이 null 이면 노선 구분 없이 단일 표. */
export type ShuttleSection = { line: ShuttleLineKey | null; times: string[] };

export type ShuttleTab = {
  key: ShuttleScheduleKey;
  fare: ShuttleFare;
  sections: ShuttleSection[];
};

// 방학·주말 탭은 3-2번(첫차 06:45, 배차 촘촘)을 위에 배치한다.
export const SHUTTLE_TABS: ShuttleTab[] = [
  { key: 'regular-mon-thu', fare: 'free', sections: [{ line: null, times: TIMES_REGULAR_MON_THU }] },
  { key: 'regular-fri',     fare: 'free', sections: [{ line: null, times: TIMES_REGULAR_FRI }] },
  { key: 'seasonal',        fare: 'free', sections: [{ line: null, times: TIMES_SEASONAL }] },
  {
    key: 'break',
    fare: 'paid',
    sections: [
      { line: 'geumjeong-3-2', times: TIMES_BREAK_GEUMJEONG_3_2 },
      { line: 'geumjeong-3',   times: TIMES_BREAK_GEUMJEONG_3 },
    ],
  },
];

export const getShuttleTab = (key: ShuttleScheduleKey): ShuttleTab =>
  SHUTTLE_TABS.find(tab => tab.key === key)!;

// ── 노선 (순환, 부산외대 출발 기준) ───────────────────────────
export const SHUTTLE_ROUTE_STOPS: { name: L10n }[] = [
  {
    name: {
      ko: '범어사역 (3번 출구 엘리베이터 뒤)',
      en: 'Beomeosa Station (behind the Exit 3 elevator)',
      zh: '梵鱼寺站（3号出口电梯后方）',
      ja: '梵魚寺駅（3番出口エレベーター裏）',
    },
  },
  {
    name: {
      ko: '해성체르니아파트',
      en: 'Haeseong Cherny Apt.',
      zh: 'Haeseong Cherny 公寓',
      ja: 'ヘソンチェルニーアパート',
    },
  },
  {
    name: {
      ko: '남산고등학교',
      en: 'Namsan High School',
      zh: '南山高中',
      ja: '南山高等学校',
    },
  },
  {
    name: {
      ko: '남산역 3번 출구',
      en: 'Namsan Station Exit 3',
      zh: '南山站3号出口',
      ja: '南山駅3番出口',
    },
  },
  {
    name: {
      ko: 'GS25 외대정문점',
      en: 'GS25 (BUFS Main Gate branch)',
      zh: 'GS25 外大正门店',
      ja: 'GS25 外大正門店',
    },
  },
  {
    name: {
      ko: '남산소방서 100m 위 금산빌라',
      en: 'Geumsan Villa (100m above Namsan Fire Station)',
      zh: 'Geumsan Villa（南山消防署上方100米）',
      ja: 'クムサンビラ（南山消防署から100m上）',
    },
  },
  {
    name: {
      ko: '부산외대 정문 (구포국수 앞)',
      en: 'BUFS Main Gate (in front of Gupo Guksu)',
      zh: '釜山外大正门（Gupo Guksu 前）',
      ja: '釜山外大正門（クポククス前）',
    },
  },
];

// ── 탑승 위치 ─────────────────────────────────────────────────
export type ShuttleBoardingPoint = {
  id: string;
  name: L10n;
  desc: L10n;
  /** 실제 사진 경로. 없으면 아이콘 폴백 (FacilityThumb 패턴) */
  image?: string;
};

export const SHUTTLE_BOARDING_POINTS: ShuttleBoardingPoint[] = [
  {
    id: 'beomeosa',
    name: { ko: '범어사역', en: 'Beomeosa Station', zh: '梵鱼寺站', ja: '梵魚寺駅' },
    desc: {
      ko: '3번 출구 엘리베이터 뒤',
      en: 'Behind the elevator at Exit 3',
      zh: '3号出口电梯后方',
      ja: '3番出口エレベーターの裏',
    },
  },
  {
    id: 'namsan',
    name: { ko: '남산역', en: 'Namsan Station', zh: '南山站', ja: '南山駅' },
    desc: {
      ko: '3번 출구 인근',
      en: 'Near Exit 3',
      zh: '3号出口附近',
      ja: '3番出口付近',
    },
  },
  {
    id: 'bufs-main-gate',
    name: { ko: '부산외대 정문', en: 'BUFS Main Gate', zh: '釜山外大正门', ja: '釜山外大正門' },
    desc: {
      ko: '11037 남산고교 방면 정류장 (2025.03.01.부터 변경)',
      en: 'Stop no. 11037, toward Namsan High School (changed as of Mar 1, 2025)',
      zh: '11037 南山高中方向车站（自2025.03.01起变更）',
      ja: '11037 南山高校方面のりば（2025.03.01より変更）',
    },
  },
];

// ── 운행 구분 자동 판정 ───────────────────────────────────────
// 기간은 학사일정(app/lib/schedule.ts)의 공식 항목에서 그대로 가져온 값이다.
//  - 하계방학 2026-06-15 ~ 2026-08-30 / 동계방학 2026-12-14 ~ 2027-02-28
//  - 하계 계절학기 2026-06-22 ~ 2026-07-10 / 동계 계절학기 2026-12-21 ~ 2027-01-12
const VACATION_PERIODS: [string, string][] = [
  ['2026-06-15', '2026-08-30'],
  ['2026-12-14', '2027-02-28'],
];
const SEASONAL_PERIODS: [string, string][] = [
  ['2026-06-22', '2026-07-10'],
  ['2026-12-21', '2027-01-12'],
];

const inPeriods = (dateStr: string, periods: [string, string][]) =>
  periods.some(([start, end]) => dateStr >= start && dateStr <= end);

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 날짜 문자열(YYYY-MM-DD) — schedule.ts 의 kstToday 와 같은 방식, 시각 파라미터만 받는다 */
export function kstDateStr(nowMs: number): string {
  return new Date(nowMs + KST_OFFSET_MS).toISOString().split('T')[0];
}

/** KST 기준 요일 (1=월 ~ 7=일) */
export function kstDayOfWeek(nowMs: number): number {
  const day = new Date(nowMs + KST_OFFSET_MS).getUTCDay(); // 0=일
  return day === 0 ? 7 : day;
}

/** KST 기준 자정 이후 경과 분 */
export function kstMinutesOfDay(nowMs: number): number {
  const d = new Date(nowMs + KST_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** 학사일정의 '공휴일' 항목에 해당하는 날인지 (임시휴업일은 공휴일이 아니므로 제외) */
export function isKstHoliday(dateStr: string): boolean {
  return SCHEDULE.some(item =>
    item.title.includes('공휴일') && dateStr >= item.start && dateStr <= (item.end ?? item.start)
  );
}

/**
 * 오늘의 운행 구분 판정.
 * 주말·공휴일 → break / 계절학기 기간 평일 → seasonal /
 * 방학 기간 평일 → break / 학기 중 금요일 → regular-fri / 그 외 평일 → regular-mon-thu
 */
export function classifyShuttleDay(nowMs: number): ShuttleScheduleKey {
  const dateStr = kstDateStr(nowMs);
  const dow = kstDayOfWeek(nowMs);

  if (dow >= 6 || isKstHoliday(dateStr)) return 'break';
  if (inPeriods(dateStr, SEASONAL_PERIODS)) return 'seasonal';
  if (inPeriods(dateStr, VACATION_PERIODS)) return 'break';
  return dow === 5 ? 'regular-fri' : 'regular-mon-thu';
}

// ── 다음 버스 계산 ────────────────────────────────────────────
const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export type NextBus = { time: string; inMinutes: number };
export type NextBusWithLine = NextBus & { line: ShuttleLineKey | null };

/** 시간표에서 현재 시각(자정 이후 분) 이후의 첫 출발. 없으면 null (막차 지남) */
export function getNextBus(times: string[], nowMinutes: number): NextBus | null {
  for (const time of times) {
    const t = toMinutes(time);
    if (t >= nowMinutes) return { time, inMinutes: t - nowMinutes };
  }
  return null;
}

/**
 * 운행 구분 기준 다음 버스. break 는 금정 3번·3-2번 중 더 빠른 쪽을 노선명과 함께 반환
 * (같은 시각이면 섹션 순서상 앞에 있는 3-2번 우선).
 */
export function getNextBusForKey(key: ShuttleScheduleKey, nowMinutes: number): NextBusWithLine | null {
  let best: NextBusWithLine | null = null;
  for (const section of getShuttleTab(key).sections) {
    const next = getNextBus(section.times, nowMinutes);
    if (next && (!best || next.inMinutes < best.inMinutes)) {
      best = { ...next, line: section.line };
    }
  }
  return best;
}

/** 운행 구분 기준 첫차 (운행 종료 후 안내용). break 는 더 이른 3-2번 첫차. */
export function getFirstBusForKey(key: ShuttleScheduleKey): NextBusWithLine {
  let best: { time: string; line: ShuttleLineKey | null } | null = null;
  for (const section of getShuttleTab(key).sections) {
    const first = section.times[0];
    if (!best || toMinutes(first) < toMinutes(best.time)) {
      best = { time: first, line: section.line };
    }
  }
  return { ...best!, inMinutes: 0 };
}
