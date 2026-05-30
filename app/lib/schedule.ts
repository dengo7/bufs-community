export type ScheduleItem = { start: string; end?: string; title: string };

export const SCHEDULE: ScheduleItem[] = [
  { start: "2026-01-05", end: "2026-01-09",  title: "학사학위 취득 유예 신청" },
  { start: "2026-01-05", end: "2026-01-16",  title: "제2전공/전부(과) 신청" },
  { start: "2026-01-07",                     title: "2025-2 성적이관, 석차조회" },
  { start: "2026-01-28", end: "2026-02-01",  title: "수강신청 장바구니 기간" },
  { start: "2026-02-09", end: "2026-02-12",  title: "2026학년도 1학기 수강신청" },
  { start: "2026-02-09", end: "2026-02-13",  title: "이수구분 변경 및 취업커뮤니티 면제 신청" },
  { start: "2026-02-20",                     title: "2025학년도 전기 학위수여식" },
  { start: "2026-02-23", end: "2026-02-25",  title: "2026학년도 1학기 등록기간" },
  { start: "2026-03-02",                     title: "2026학년도 1학기 개강 및 공휴일" },
  { start: "2026-03-04", end: "2026-03-06",  title: "수강신청 확인(정정)기간" },
  { start: "2026-03-09", end: "2026-03-20",  title: "국외단기 어학연수 학점인정신청" },
  { start: "2026-03-12",                     title: "개교기념일" },
  { start: "2026-03-26",                     title: "수업일수 1/4선" },
  { start: "2026-04-03",                     title: "수업일수 1/3선" },
  { start: "2026-04-20", end: "2026-04-24",  title: "중간고사 기간" },
  { start: "2026-04-22",                     title: "수업일수 1/2선" },
  { start: "2026-05-01",                     title: "임시휴업일(노동절)" },
  { start: "2026-05-05",                     title: "공휴일(어린이날)" },
  { start: "2026-05-07", end: "2026-05-19",  title: "부분적 성적포기 신청" },
  { start: "2026-05-19",                     title: "수업일수 3/4선" },
  { start: "2026-05-20", end: "2026-05-27",  title: "성적평가 선택제 신청" },
  { start: "2026-05-20", end: "2026-05-26",  title: "조기졸업 신청" },
  { start: "2026-05-25",                     title: "공휴일(석가탄신일)" },
  { start: "2026-05-26", end: "2026-05-28",  title: "2026학년도 하계 계절학기 수강신청" },
  { start: "2026-06-03",                     title: "공휴일(2026 지방선거)" },
  { start: "2026-06-08", end: "2026-06-12",  title: "기말고사 기간" },
  { start: "2026-06-15", end: "2026-08-30",  title: "하계방학" },
  { start: "2026-06-15", end: "2026-06-19",  title: "성적확인 및 열람기간" },
  { start: "2026-06-22", end: "2026-07-10",  title: "2026학년도 하계 계절학기" },
  { start: "2026-07-06", end: "2026-07-10",  title: "학사학위 취득 유예 신청" },
  { start: "2026-07-06", end: "2026-07-17",  title: "제2전공/전부(과) 신청" },
  { start: "2026-07-27", end: "2026-07-31",  title: "하계 집중휴무 기간(민원응대 불가)" },
  { start: "2026-08-14",                     title: "학위수여식" },
  { start: "2026-08-18", end: "2026-08-21",  title: "2026학년도 2학기 수강신청" },
  { start: "2026-08-18", end: "2026-08-21",  title: "이수구분 변경 및 취업커뮤니티 면제 신청" },
  { start: "2026-08-24", end: "2026-08-26",  title: "2026학년도 2학기 등록기간" },
  { start: "2026-08-31",                     title: "2026학년도 2학기 개강" },
  { start: "2026-09-02", end: "2026-09-04",  title: "수강신청 확인(정정)기간" },
  { start: "2026-09-24", end: "2026-09-25",  title: "공휴일(추석)" },
  { start: "2026-09-24",                     title: "수업일수 1/4선" },
  { start: "2026-10-02",                     title: "수업일수 1/3선" },
  { start: "2026-10-05",                     title: "공휴일(개천절 대체휴일)" },
  { start: "2026-10-09",                     title: "공휴일(한글날)" },
  { start: "2026-10-19", end: "2026-10-23",  title: "중간고사 기간" },
  { start: "2026-10-21",                     title: "수업일수 1/2선" },
  { start: "2026-11-17",                     title: "수업일수 3/4선" },
  { start: "2026-12-07", end: "2026-12-11",  title: "기말고사 기간" },
  { start: "2026-12-14", end: "2027-02-28",  title: "동계방학" },
  { start: "2026-12-14", end: "2026-12-18",  title: "성적확인 및 열람기간" },
  { start: "2026-12-21", end: "2027-01-12",  title: "2026학년도 동계 계절학기" },
  { start: "2027-02-15", end: "2027-02-18",  title: "2027학년도 1학기 수강신청" },
  { start: "2027-02-19",                     title: "학위수여식" },
  { start: "2027-02-22", end: "2027-02-24",  title: "2027학년도 1학기 등록기간" },
];

/** "2026-05-01" → "05.01" */
export function fmtDate(d: string): string {
  return d.slice(5).replace('-', '.');
}

/** 단일 또는 기간 문자열 */
export function fmtRange(item: ScheduleItem): string {
  return item.end ? `${fmtDate(item.start)}~${fmtDate(item.end)}` : fmtDate(item.start);
}

/** 오늘 기준 다가오는 항목 N개 (end >= today || start >= today) */
export function getUpcoming(n: number): ScheduleItem[] {
  const today = new Date().toISOString().split('T')[0];
  return SCHEDULE.filter(item => (item.end ?? item.start) >= today).slice(0, n);
}
