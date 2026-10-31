'use client';

import { useSyncExternalStore } from 'react';
import { kstToday, SCHEDULE, type ScheduleItem } from './schedule';
import type { UILang } from './lang';
import { SETTLE_ITEMS, type Loc, type SettleItem, type SettleVisa, type SettleHousing } from './settleItems';

/**
 * 유학생 정착 체크리스트(/settle) 계산·저장 로직.
 * 날짜는 모두 KST 'YYYY-MM-DD' 문자열로 다룬다(kstToday 기준) — 기기 시간대와 무관.
 * 저장은 이 기기의 localStorage에만 한다(로그인·DB 없음).
 */

export const SETTLE_PROFILE_KEY = 'the-well-settle-profile';
export const SETTLE_DONE_KEY = 'the-well-settle-done';

export type SettleProfile = { arrival: string; visa: SettleVisa; housing: SettleHousing };

// ── 다국어 ────────────────────────────────────────────────────────────
/** zh/ja 번역이 아직 없으면 en으로 보여준다 */
export const loc = (v: Loc | undefined, lang: UILang): string =>
  !v ? '' : lang === 'ko' ? v.ko : lang === 'en' ? v.en : (v[lang] ?? v.en);

// ── 날짜 (KST 'YYYY-MM-DD') ───────────────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toUtcDay = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};
/** b - a (일) */
export const daysBetween = (a: string, b: string) => Math.round(toUtcDay(b) - toUtcDay(a));
export const addDays = (ymd: string, n: number) =>
  new Date((toUtcDay(ymd) + n) * 86_400_000).toISOString().slice(0, 10);

/** 입국일 기준 경과일. 입국일 당일 = 0, 입국 전이면 음수 */
export const dayN = (p: SettleProfile, today = kstToday()) => daysBetween(p.arrival, today);

// ── 수강신청: BUFS 학사일정(schedule.ts)에서 정규 학기 수강신청 기간을 찾는다 ──
const REGULAR_COURSE_REG = /^\d{4}학년도 [12]학기 수강신청$/;

/** 오늘 이후 끝나는 가장 가까운 정규 학기 수강신청. 없으면 가장 최근 지난 것 */
export function courseRegistration(today = kstToday()): ScheduleItem | null {
  const regs = SCHEDULE.filter(s => REGULAR_COURSE_REG.test(s.title));
  return regs.find(s => (s.end ?? s.start) >= today) ?? regs[regs.length - 1] ?? null;
}

// ── 노출·기한 ─────────────────────────────────────────────────────────
/** 입국 후 며칠째부터 며칠째까지 보이는지. D-4 시간제취업은 국내 체류 6개월(180일) 이후 */
export function windowOf(it: SettleItem, p: SettleProfile): { from: number; until: number | null } {
  if (it.id === 'part_time_work' && p.visa === 'd4') {
    return { from: 180, until: 180 + ((it.showUntil ?? it.showFrom) - it.showFrom) };
  }
  return { from: it.showFrom, until: it.showUntil };
}

export function isVisible(it: SettleItem, p: SettleProfile, done: ReadonlySet<string>, today = kstToday()) {
  if (it.showIf?.visa && !it.showIf.visa.includes(p.visa)) return false;
  if (it.showIf?.housing && !it.showIf.housing.includes(p.housing)) return false;
  if (it.timeAxis === 'academic') return true;
  // 법정기한이 있는 항목은 기간이 지나도 숨기지 않는다("기한 초과" 자체가 봐야 할 정보)
  const { until } = windowOf(it, p);
  if (!it.deadline && until !== null && !done.has(it.id) && dayN(p, today) > until) return false;
  return true;
}

export type DdayTone = 'red' | 'amber' | 'gray';
export type Dday = { kind: 'left' | 'today' | 'overdue' | 'closed'; days: number; tone: DdayTone };

export function ddayOf(it: SettleItem, p: SettleProfile, today = kstToday()): Dday | null {
  if (it.timeAxis === 'academic') {
    const reg = courseRegistration(today);
    if (!reg) return null;
    const left = daysBetween(today, reg.end ?? reg.start);
    if (left < 0) return { kind: 'closed', days: 0, tone: 'gray' };
    if (left === 0) return { kind: 'today', days: 0, tone: 'red' };
    return { kind: 'left', days: left, tone: left <= 3 ? 'red' : left <= 14 ? 'amber' : 'gray' };
  }
  if (it.deadline) {
    const left = it.deadline.days - dayN(p, today);
    if (left < 0) return { kind: 'overdue', days: -left, tone: 'red' };
    if (left === 0) return { kind: 'today', days: 0, tone: 'red' };
    return { kind: 'left', days: left, tone: left <= 14 ? 'red' : left <= 40 ? 'amber' : 'gray' };
  }
  return null;
}

/** 입국 후 며칠째에 시작하는지 (수강신청은 학사일정 시작일을 입국일 기준으로 환산) */
export function startDayOf(it: SettleItem, p: SettleProfile, today = kstToday()): number {
  if (it.timeAxis === 'academic') {
    const reg = courseRegistration(today);
    return reg ? daysBetween(p.arrival, reg.start) : Number.MAX_SAFE_INTEGER;
  }
  return windowOf(it, p).from;
}

/** 0 = 지금, 1 = 21일 안, 2 = 나중 */
export type Bucket = 0 | 1 | 2;
export const SOON_DAYS = 21;
/** 중요(high) 항목은 시작 며칠 전부터 "지금"으로 당겨 보여준다 (입국 당일에 지금 할 일이 비지 않게) */
export const HIGH_LEAD_DAYS = 3;
/** 법정기한이 이만큼 남으면 시작일과 관계없이 "지금" */
export const DEADLINE_NOW_DAYS = 30;
/** 수강신청이 이만큼 안에 시작하면 "지금" */
export const ACADEMIC_NOW_DAYS = 14;

/**
 * 묶음 규칙 (위에서부터 하나라도 맞으면 그 묶음)
 *  지금  ① 보이는 기간이 이미 시작됨 (showFrom ≤ 오늘)
 *        ② 입국 후이고, 중요(high) 항목이 3일 안에 시작됨
 *        ③ 법정기한이 30일 이하로 남았거나 지남
 *        ④ 수강신청이 진행 중이거나 14일 안에 시작됨
 *  21일 안  21일 안에 시작됨
 *  나중  그 밖 (마감된 수강신청 포함)
 */
export function bucketOf(it: SettleItem, p: SettleProfile, today = kstToday()): Bucket {
  const n = dayN(p, today);
  const s = startDayOf(it, p, today);
  const dday = ddayOf(it, p, today);
  if (it.timeAxis === 'academic') {
    if (dday?.kind === 'closed') return 2;
    if (s <= n + ACADEMIC_NOW_DAYS) return 0;
  } else {
    if (s <= n) return 0;
    if (n >= 0 && it.priority === 'high' && s <= n + HIGH_LEAD_DAYS) return 0;
    if (it.deadline && dday && dday.kind !== 'left') return 0;
    if (it.deadline && dday && dday.days <= DEADLINE_NOW_DAYS) return 0;
  }
  if (s <= n + SOON_DAYS) return 1;
  return 2;
}

const PRI_RANK = { high: 0, mid: 1, low: 2 } as const;

/** 프로필에 맞는 항목을 묶음·우선순위·시작일 순으로 */
export function planFor(p: SettleProfile, done: ReadonlySet<string>, today = kstToday()) {
  return SETTLE_ITEMS
    .filter(it => isVisible(it, p, done, today))
    .map(it => ({ item: it, bucket: bucketOf(it, p, today), dday: ddayOf(it, p, today) }))
    .sort((a, b) =>
      a.bucket - b.bucket
      || PRI_RANK[a.item.priority] - PRI_RANK[b.item.priority]
      || startDayOf(a.item, p, today) - startDayOf(b.item, p, today));
}

// ── 저장 (localStorage, 이 기기에만) ──────────────────────────────────
const VISAS: readonly SettleVisa[] = ['d2', 'd4', 'other'];
const HOUSINGS: readonly SettleHousing[] = ['dorm', 'solo'];

function parseProfile(raw: string | null): SettleProfile | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<SettleProfile>;
    if (typeof v.arrival !== 'string' || !DATE_RE.test(v.arrival)) return null;
    if (!VISAS.includes(v.visa as SettleVisa) || !HOUSINGS.includes(v.housing as SettleHousing)) return null;
    return { arrival: v.arrival, visa: v.visa as SettleVisa, housing: v.housing as SettleHousing };
  } catch {
    return null;
  }
}

function parseDone(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    const ids = new Set(SETTLE_ITEMS.map(it => it.id));
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && ids.has(x)) : [];
  } catch {
    return [];
  }
}

const read = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장이 막힌 환경(사생활 보호 모드 등) — 이번 화면에서만 유지된다
  }
};

type Snapshot = { ready: boolean; profile: SettleProfile | null; done: ReadonlySet<string> };
const SERVER_SNAPSHOT: Snapshot = { ready: false, profile: null, done: new Set() };
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Snapshot {
  if (snapshot === null) {
    snapshot = { ready: true, profile: parseProfile(read(SETTLE_PROFILE_KEY)), done: new Set(parseDone(read(SETTLE_DONE_KEY))) };
  }
  return snapshot;
}
function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach(fn => fn());
}
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** 첫 렌더(서버·하이드레이션)는 ready=false, 마운트 직후 저장된 값으로 바뀐다 */
export function useSettleState(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}

export function saveSettleProfile(p: SettleProfile) {
  write(SETTLE_PROFILE_KEY, JSON.stringify(p));
  emit({ ...getSnapshot(), profile: p });
}

export function toggleSettleDone(id: string) {
  const done = new Set(getSnapshot().done);
  if (done.has(id)) done.delete(id);
  else done.add(id);
  write(SETTLE_DONE_KEY, JSON.stringify([...done]));
  emit({ ...getSnapshot(), done });
}

/** 프로필 입력 화면의 날짜 기본값·범위 */
export const settleDateBounds = (today = kstToday()) => ({ min: addDays(today, -365 * 2), max: addDays(today, 365) });

// ── 타임라인 (시안 B) ────────────────────────────────────────────────
export type PlanEntry = ReturnType<typeof planFor>[number];

/**
 * 타임라인 구간. 항목의 시작일(windowOf.from)이 들어가는 구간끼리 한 마디로 묶는다.
 * 마디 표시는 "D+{구간 안 가장 이른 시작일}~{구간 끝}" — 항목이 바뀌면 마디도 따라 바뀐다.
 */
export const PHASES = [
  { key: 'arrival', from: 0, to: 0 },
  { key: 'week', from: 1, to: 6 },
  { key: 'month', from: 7, to: 30 },
  { key: 'quarter', from: 31, to: 89 },
  { key: 'half', from: 90, to: 179 },
  { key: 'later', from: 180, to: null },
] as const;
export type PhaseKey = (typeof PHASES)[number]['key'];

export type TimelineNode =
  | { kind: 'phase'; phase: PhaseKey; day: number; endDay: number | null; entries: PlanEntry[] }
  | { kind: 'deadline'; day: number; date: string; entry: PlanEntry }
  | { kind: 'academic'; day: number; schedule: ScheduleItem; entries: PlanEntry[] }
  | { kind: 'today'; day: number };

const KIND_ORDER = { phase: 0, deadline: 1, academic: 2, today: 3 } as const;

export function buildTimeline(p: SettleProfile, done: ReadonlySet<string>, today = kstToday()) {
  const plan = planFor(p, done, today);
  const n = dayN(p, today);
  const nodes: TimelineNode[] = [];

  // 입국일 기준 항목 → 구간 마디
  for (const ph of PHASES) {
    const entries = plan
      .filter(e => e.item.timeAxis === 'arrival')
      .filter(e => { const s = windowOf(e.item, p).from; return s >= ph.from && (ph.to === null || s <= ph.to); })
      .sort((a, b) => windowOf(a.item, p).from - windowOf(b.item, p).from);
    if (!entries.length) continue;
    const day = windowOf(entries[0].item, p).from;
    nodes.push({ kind: 'phase', phase: ph.key, day, endDay: ph.to !== null && ph.to > day ? ph.to : null, entries });
  }
  // 법정기한 → 빨간 마디
  for (const e of plan) {
    if (e.item.deadline) nodes.push({ kind: 'deadline', day: e.item.deadline.days, date: addDays(p.arrival, e.item.deadline.days), entry: e });
  }
  // 학사일정 기준 항목(수강신청) → 학사일정 날짜 마디
  const academic = plan.filter(e => e.item.timeAxis === 'academic');
  const reg = courseRegistration(today);
  if (academic.length && reg) nodes.push({ kind: 'academic', day: daysBetween(p.arrival, reg.start), schedule: reg, entries: academic });

  nodes.sort((a, b) => a.day - b.day || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  // 오늘 깃발: 오늘까지 시작한 마디 바로 뒤
  const at = nodes.findIndex(x => x.day > n);
  nodes.splice(at === -1 ? nodes.length : at, 0, { kind: 'today', day: n });
  return { plan, nodes, todayIndex: nodes.findIndex(x => x.kind === 'today') };
}

/** 가장 급한 할 일: 아직 안 한 항목 중 묶음 → 기한 있는 것 → 우선순위 → 시작일 순 */
export function pickUrgent(plan: PlanEntry[], done: ReadonlySet<string>): PlanEntry | null {
  const rest = plan.filter(e => !done.has(e.item.id));
  return [...rest].sort((a, b) =>
    a.bucket - b.bucket
    || Number(!a.dday || a.dday.kind === 'closed') - Number(!b.dday || b.dday.kind === 'closed')
    || (a.dday && b.dday ? (a.dday.kind === 'overdue' ? -a.dday.days : a.dday.days) - (b.dday.kind === 'overdue' ? -b.dday.days : b.dday.days) : 0))[0] ?? null;
}
