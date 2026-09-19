'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Plus, X, Trash2, Table2, MapPin, Clock, UserRound, GraduationCap,
  Pencil, ChevronRight, ArrowRight, Check, Megaphone, CalendarDays, MessageCircle, Languages,
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import BottomTabBar from '../components/BottomTabBar';
import { useLang, setLang } from '../lib/lang';

type UILang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

// ── 타입 ──────────────────────────────────────────────────────
type Course = {
  id: string | number;
  title: string;
  day_of_week: number;   // 1~7 = 월~일
  start_min: number;     // 자정 기준 분
  end_min: number;
  location: string | null;
  color: string | null;
  professor: string | null;
  credits: number | null;
};

type FormState = {
  id: Course['id'] | null;   // null = 새 과목
  title: string;
  day: number;
  start: string;             // 'HH:MM'
  end: string;
  location: string;
  professor: string;
  credits: string;           // 입력값 그대로 (빈 문자열 = 미입력)
  color: ColorKey;
};

type ErrKey = 'errTitle' | 'errTime' | 'errRange' | 'errOverlap' | 'errCredits' | 'errSave';

const COLS = 'id, title, day_of_week, start_min, end_min, location, color, professor, credits';

// ── 과목 색상 (The Well 블루·옐로 중심의 파스텔 8색) ──────────
const COURSE_COLORS = [
  { key: 'blue',     bg: '#E4ECFE', accent: '#2563EB' },
  { key: 'yellow',   bg: '#FDF1CF', accent: '#F6C21A' },
  { key: 'sky',      bg: '#DFF1FB', accent: '#38A5D8' },
  { key: 'lavender', bg: '#EFE8FC', accent: '#8B5CF6' },
  { key: 'mint',     bg: '#DDF5EA', accent: '#34B889' },
  { key: 'peach',    bg: '#FDE6D8', accent: '#F2935C' },
  { key: 'pink',     bg: '#FCE4EC', accent: '#E8769B' },
  { key: 'sage',     bg: '#E8F1DD', accent: '#7FA650' },
] as const;

type ColorKey = typeof COURSE_COLORS[number]['key'];

// 이전 팔레트(3색·8색)로 저장된 값 → 현재 팔레트 매핑
const LEGACY_COLOR_MAP: Record<string, ColorKey> = {
  purple: 'lavender', indigo: 'lavender',
  sand: 'yellow',
  rose: 'pink',
  teal: 'mint',
  green: 'sage',
};

const colorOf = (key: string | null) => {
  const mapped = key ? (LEGACY_COLOR_MAP[key] ?? key) : 'blue';
  return COURSE_COLORS.find(c => c.key === mapped) ?? COURSE_COLORS[0];
};

// ── 격자 설정 ─────────────────────────────────────────────────
const HOUR_H = 44;          // 1시간 높이(px)
const GRID_LINE = '#EBEEF3'; // 격자선 (표처럼 균일한 연회색 1px)
const AXIS_W = 26;           // 시간축 폭(px)
const GRID_START_H = 9;     // 오전 9시 ~ 오후 10시 고정
const GRID_END_H = 22;
const GRID_START_MIN = GRID_START_H * 60;
const GRID_END_MIN = GRID_END_H * 60;
const WEEKDAYS = [1, 2, 3, 4, 5];   // 기본 표시 열 (월~금)
const HOURS = Array.from({ length: GRID_END_H - GRID_START_H }, (_, i) => GRID_START_H + i);

// ── 다국어 ────────────────────────────────────────────────────
const T = {
  ko: {
    title: '시간표', add: '과목 추가', formAdd: '새 수업 만들기 ✨', formEdit: '수업 수정하기', preview: '미리보기', time: '시간', editBtn: '수정', close: '닫기',
    name: '과목명', namePh: '예: 한국어 회화', day: '요일', start: '시작', end: '종료',
    location: '강의실', locationPh: '예: D관 301호', professor: '교수', professorPh: '선택',
    credits: '학점', creditsPh: '선택', color: '색상',
    submitAdd: '시간표에 추가하기', submitEdit: '수정 완료', saving: '저장 중...', del: '삭제', delConfirm: '한 번 더 누르면 삭제돼요',
    emptyTitle: '아직 과목이 없어요', emptyDesc: '수업을 추가해서 나만의 시간표를 만들어 보세요', emptyCta: '첫 과목 추가하기',
    loginRequired: '로그인이 필요합니다', loginCta: '로그인 / 회원가입',
    errTitle: '과목명을 입력해 주세요', errTime: '종료 시간은 시작 시간보다 늦어야 해요',
    errRange: '시간은 09:00~22:00 사이, 30분 단위로 선택해 주세요',
    errOverlap: '같은 시간에 다른 과목이 있어요', errCredits: '학점은 0~30 사이 숫자로 입력해 주세요',
    errSave: '처리에 실패했어요. 잠시 후 다시 시도해 주세요',
    todayTitle: '오늘의 수업', todayDone: '오늘 수업 끝! 🙌', todayDoneSub: '수고했어요. 남은 하루는 편하게 보내요',
    freeTitle: '오늘은 공강이에요 🎉', freeSub: '여유로운 하루, 이런 건 어때요?',
    goNotices: '학사공지 보기', goSchedule: '학사일정 보기', goCommunity: '커뮤니티 둘러보기',
    weekTitle: '이번 주', weekClasses: ['수업', '개'], weekCampus: ['등교', '일'], weekFree: ['공강', '일'],
    exprTitle: '오늘의 표현', exprSub: '대학생활 한국어',
    days: ['월', '화', '수', '목', '금', '토', '일'],
  },
  en: {
    title: 'Timetable', add: 'Add course', formAdd: 'Create a new class ✨', formEdit: 'Edit class', preview: 'Preview', time: 'Time', editBtn: 'Edit', close: 'Close',
    name: 'Course name', namePh: 'e.g. Korean Conversation', day: 'Day', start: 'Start', end: 'End',
    location: 'Classroom', locationPh: 'e.g. Bldg D, Room 301', professor: 'Professor', professorPh: 'Optional',
    credits: 'Credits', creditsPh: 'Optional', color: 'Color',
    submitAdd: 'Add to timetable', submitEdit: 'Save changes', saving: 'Saving...', del: 'Delete', delConfirm: 'Tap again to delete',
    emptyTitle: 'No courses yet', emptyDesc: 'Add your classes to build your own timetable', emptyCta: 'Add your first course',
    loginRequired: 'Login required', loginCta: 'Log in / Sign up',
    errTitle: 'Please enter a course name', errTime: 'End time must be later than start time',
    errRange: 'Please choose a time between 09:00 and 22:00 in 30-minute steps',
    errOverlap: 'Another course is already in this time slot', errCredits: 'Credits must be a number from 0 to 30',
    errSave: 'Something went wrong. Please try again later',
    todayTitle: "Today's classes", todayDone: 'Classes done for today! 🙌', todayDoneSub: 'Nice work. Enjoy the rest of your day',
    freeTitle: 'No classes today 🎉', freeSub: 'A free day — how about one of these?',
    goNotices: 'Notices', goSchedule: 'Academic calendar', goCommunity: 'Community',
    weekTitle: 'This week', weekClasses: ['Classes', ''], weekCampus: ['Campus days', ''], weekFree: ['Free days', ''],
    exprTitle: "Today's expression", exprSub: 'Campus Korean',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  zh: {
    title: '课程表', add: '添加课程', formAdd: '创建新课程 ✨', formEdit: '编辑课程', preview: '预览', time: '时间', editBtn: '编辑', close: '关闭',
    name: '课程名称', namePh: '例:韩语会话', day: '星期', start: '开始', end: '结束',
    location: '教室', locationPh: '例:D馆301室', professor: '教授', professorPh: '选填',
    credits: '学分', creditsPh: '选填', color: '颜色',
    submitAdd: '添加到课程表', submitEdit: '完成修改', saving: '保存中...', del: '删除', delConfirm: '再点一次即可删除',
    emptyTitle: '还没有课程', emptyDesc: '添加课程,制作属于你的课程表', emptyCta: '添加第一门课程',
    loginRequired: '需要登录', loginCta: '登录 / 注册',
    errTitle: '请输入课程名称', errTime: '结束时间必须晚于开始时间',
    errRange: '请在09:00~22:00之间以30分钟为单位选择时间',
    errOverlap: '该时间段已有其他课程', errCredits: '学分请输入0~30之间的数字',
    errSave: '操作失败,请稍后再试',
    todayTitle: '今日课程', todayDone: '今天的课结束啦!🙌', todayDoneSub: '辛苦了,好好休息吧',
    freeTitle: '今天没有课 🎉', freeSub: '轻松的一天,看看这些吧',
    goNotices: '查看学校公告', goSchedule: '查看校历', goCommunity: '浏览社区',
    weekTitle: '本周', weekClasses: ['课程', '节'], weekCampus: ['到校', '天'], weekFree: ['没课', '天'],
    exprTitle: '今日表达', exprSub: '校园韩语',
    days: ['一', '二', '三', '四', '五', '六', '日'],
  },
  ja: {
    title: '時間割', add: '科目を追加', formAdd: '新しい授業を作る ✨', formEdit: '授業を編集する', preview: 'プレビュー', time: '時間', editBtn: '編集', close: '閉じる',
    name: '科目名', namePh: '例:韓国語会話', day: '曜日', start: '開始', end: '終了',
    location: '教室', locationPh: '例:D館301号室', professor: '教授', professorPh: '任意',
    credits: '単位', creditsPh: '任意', color: '色',
    submitAdd: '時間割に追加する', submitEdit: '修正完了', saving: '保存中...', del: '削除', delConfirm: 'もう一度押すと削除されます',
    emptyTitle: 'まだ科目がありません', emptyDesc: '授業を追加して自分だけの時間割を作りましょう', emptyCta: '最初の科目を追加',
    loginRequired: 'ログインが必要です', loginCta: 'ログイン / 会員登録',
    errTitle: '科目名を入力してください', errTime: '終了時間は開始時間より後にしてください',
    errRange: '時間は09:00〜22:00の間、30分単位で選択してください',
    errOverlap: '同じ時間に他の科目があります', errCredits: '単位は0~30の数字で入力してください',
    errSave: '処理に失敗しました。しばらくしてからもう一度お試しください',
    todayTitle: '今日の授業', todayDone: '今日の授業はおしまい!🙌', todayDoneSub: 'おつかれさまでした。ゆっくり休んでください',
    freeTitle: '今日は授業がない日です 🎉', freeSub: 'ゆったりした一日、こちらはいかが?',
    goNotices: '学事のお知らせ', goSchedule: '学事日程を見る', goCommunity: 'コミュニティを見る',
    weekTitle: '今週', weekClasses: ['授業', 'コマ'], weekCampus: ['登校', '日'], weekFree: ['授業なし', '日'],
    exprTitle: '今日の表現', exprSub: 'キャンパス韓国語',
    days: ['月', '火', '水', '木', '金', '土', '日'],
  },
} as const;

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 3~8월 = 1학기, 9~2월 = 2학기 (1·2월은 전년도 2학기)
function semesterLabel(y: number, m: number, lang: UILang): string {
  const sem  = m >= 3 && m <= 8 ? 1 : 2;
  const year = m <= 2 ? y - 1 : y;
  switch (lang) {
    case 'en': return `${year} Semester ${sem}`;
    case 'zh': return `${year}年第${sem}学期`;
    case 'ja': return `${year}年${sem}学期`;
    default:   return `${year}년 ${sem}학기`;
  }
}

function summaryLabel(credits: number, count: number, lang: UILang): string {
  switch (lang) {
    case 'en': return `${credits} credits · ${count} ${count === 1 ? 'course' : 'courses'}`;
    case 'zh': return `${credits}学分 · ${count}门课`;
    case 'ja': return `${credits}単位 · ${count}科目`;
    default:   return `${credits}학점 · ${count}과목`;
  }
}

function todayLabel(m: number, d: number, wd: string, lang: UILang): string {
  switch (lang) {
    case 'en': return `${wd}, ${EN_MONTHS[m - 1]} ${d}`;
    case 'zh': return `${m}月${d}日 (周${wd})`;
    case 'ja': return `${m}月${d}日 (${wd})`;
    default:   return `${m}월 ${d}일 (${wd})`;
  }
}

function creditsLabel(credits: number, lang: UILang): string {
  switch (lang) {
    case 'en': return `${credits} ${credits === 1 ? 'credit' : 'credits'}`;
    case 'zh': return `${credits}学分`;
    case 'ja': return `${credits}単位`;
    default:   return `${credits}학점`;
  }
}

// ── 시간 변환 ─────────────────────────────────────────────────
const minToHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const hhmmToMin = (v: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
};

const timeRange = (c: Course) => `${minToHHMM(c.start_min)} - ${minToHHMM(c.end_min)}`;

// KST 기준 오늘 날짜 분해 (학사일정 페이지와 동일하게 KST 고정)
function kstParts(now: Date) {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: k.getUTCFullYear(),
    m: k.getUTCMonth() + 1,
    d: k.getUTCDate(),
    day: k.getUTCDay() || 7,   // 1~7 = 월~일
    min: k.getUTCHours() * 60 + k.getUTCMinutes(),
    dayIndex: Math.floor(k.getTime() / (24 * 60 * 60 * 1000)),   // 하루 하나 로테이션용
  };
}

// ── 오늘의 표현: 유학생용 대학생활 한국어 (표현은 한국어 고정, 뜻은 UI 언어) ──
const EXPRESSIONS: { term: string; roman: string; meaning: Record<UILang, string> }[] = [
  { term: '공강', roman: 'gonggang', meaning: {
    ko: '수업과 수업 사이에 비는 시간, 또는 수업이 없는 날',
    en: 'Free period between classes, or a day with no class',
    zh: '两节课之间的空档,或没有课的一天',
    ja: '授業と授業の間の空き時間(空きコマ)、または授業のない日' } },
  { term: '개강', roman: 'gaegang', meaning: {
    ko: '새 학기 수업이 시작되는 것',
    en: 'Start of the semester',
    zh: '开学(新学期开始上课)',
    ja: '新学期の授業が始まること' } },
  { term: '종강', roman: 'jonggang', meaning: {
    ko: '한 학기 수업이 모두 끝나는 것',
    en: "End of the semester's classes",
    zh: '结课(一学期的课程全部结束)',
    ja: '学期の授業がすべて終わること' } },
  { term: '출튀', roman: 'chultwi', meaning: {
    ko: '출석만 확인하고 몰래 나가는 것 (출석 + 튀다)',
    en: 'Sneaking out right after attendance is taken',
    zh: '点完名就偷偷溜走',
    ja: '出席確認のあと、こっそり抜け出すこと' } },
  { term: '시험기간', roman: 'siheom gigan', meaning: {
    ko: '중간고사·기말고사를 준비하고 치르는 기간',
    en: 'Exam period (midterms or finals)',
    zh: '考试周(期中、期末考试期间)',
    ja: '試験期間(中間・期末試験の時期)' } },
  { term: '조별과제', roman: 'jobyeol gwaje', meaning: {
    ko: '여러 명이 한 조가 되어 함께 하는 과제',
    en: 'Group project / team assignment',
    zh: '小组作业',
    ja: 'グループ課題' } },
  { term: '팀플', roman: 'timpeul', meaning: {
    ko: '팀 프로젝트를 줄인 말. 조별과제와 비슷한 뜻',
    en: 'Team project (another word for group work)',
    zh: '团队项目(和小组作业意思相近)',
    ja: 'チームプロジェクト(グループ課題とほぼ同じ意味)' } },
  { term: '학식', roman: 'haksik', meaning: {
    ko: '학생 식당, 또는 학생 식당에서 먹는 밥',
    en: 'Campus cafeteria (or the meals there)',
    zh: '学生食堂(或食堂的饭菜)',
    ja: '学食(学生食堂、またはその食事)' } },
  { term: '동방', roman: 'dongbang', meaning: {
    ko: '동아리방을 줄인 말. 동아리 사람들이 모이는 방',
    en: 'Club room (short for "dongari-bang")',
    zh: '社团活动室("동아리방"的缩写)',
    ja: 'サークル部屋(「동아리방」の略)' } },
  { term: '복전', roman: 'bokjeon', meaning: {
    ko: '복수전공을 줄인 말. 전공을 두 개 공부하는 것',
    en: 'Double major (short for "boksu jeongong")',
    zh: '双专业("복수전공"的缩写)',
    ja: 'ダブルメジャー(「복수전공」の略)' } },
  { term: '휴학', roman: 'hyuhak', meaning: {
    ko: '일정 기간 학교를 쉬는 것',
    en: 'Taking a leave of absence from school',
    zh: '休学',
    ja: '休学' } },
  { term: '복학', roman: 'bokhak', meaning: {
    ko: '휴학을 마치고 학교로 돌아오는 것',
    en: 'Returning to school after a leave of absence',
    zh: '复学(休学后回到学校)',
    ja: '復学(休学を終えて学校に戻ること)' } },
  { term: '수강신청', roman: 'sugang sincheong', meaning: {
    ko: '다음 학기에 들을 수업을 신청하는 것',
    en: 'Course registration',
    zh: '选课',
    ja: '履修登録' } },
  { term: '과잠', roman: 'gwajam', meaning: {
    ko: '학과 이름이 적힌 단체 점퍼 (학과 + 잠바)',
    en: 'Varsity jacket with your department name on it',
    zh: '印有院系名称的棒球外套(系服)',
    ja: '学科名が入ったおそろいのスタジャン' } },
  { term: '새내기', roman: 'saenaegi', meaning: {
    ko: '신입생, 대학교 1학년 학생',
    en: 'Freshman / first-year student',
    zh: '新生(大一学生)',
    ja: '新入生(大学1年生)' } },
  { term: '학점', roman: 'hakjeom', meaning: {
    ko: '수업마다 정해진 이수 단위. 성적이라는 뜻으로도 써요',
    en: 'Course credits (also used to mean grades/GPA)',
    zh: '学分(也用来指成绩)',
    ja: '単位(成績の意味でも使います)' } },
];

// 오늘의 수업 상태 문구
function nextInLabel(d: string, lang: UILang): string {
  switch (lang) {
    case 'en': return `Next class in ${d}`;
    case 'zh': return `距离下一节课还有${d}`;
    case 'ja': return `次の授業まで${d}`;
    default:   return `다음 수업까지 ${d}`;
  }
}

function ongoingLabel(d: string, lang: UILang): string {
  switch (lang) {
    case 'en': return `In class now · ends in ${d}`;
    case 'zh': return `正在上课 · ${d}后结束`;
    case 'ja': return `授業中 · あと${d}で終了`;
    default:   return `지금 수업 중 · ${d} 후 종료`;
  }
}

// ── 시간 선택 (09:00~22:00, 30분 단위) ────────────────────────
const SLOT_MIN = 30;
const TIME_SLOTS = Array.from(
  { length: (GRID_END_MIN - GRID_START_MIN) / SLOT_MIN + 1 },
  (_, i) => GRID_START_MIN + i * SLOT_MIN,
);

// 범위 밖·30분 단위가 아닌 기존 과목은 선택 가능한 값으로 맞춘다 (시작은 내림, 종료는 올림)
function snapRange(startMin: number, endMin: number) {
  const s = Math.min(Math.max(Math.floor(startMin / SLOT_MIN) * SLOT_MIN, GRID_START_MIN), GRID_END_MIN - SLOT_MIN);
  const e = Math.min(Math.max(Math.ceil(endMin / SLOT_MIN) * SLOT_MIN, s + SLOT_MIN), GRID_END_MIN);
  return { start: minToHHMM(s), end: minToHHMM(e) };
}

function durationLabel(min: number, lang: UILang): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  switch (lang) {
    case 'en': return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
    case 'zh': return `${h ? `${h}小时` : ''}${m ? `${m}分` : ''}`;
    case 'ja': return `${h ? `${h}時間` : ''}${m ? `${m}分` : ''}`;
    default:   return [h ? `${h}시간` : '', m ? `${m}분` : ''].filter(Boolean).join(' ');
  }
}

// "09:00 → 10:30" 한 줄 타임 피커. 종료는 시작 이후만 고를 수 있고,
// 시작을 옮겨 종료가 무효해지면 시작+1시간으로 보정한다.
function TimeRangePicker({ start, end, startLabel, endLabel, lang, onChange }: {
  start: string;   // 'HH:MM'
  end: string;
  startLabel: string;
  endLabel: string;
  lang: UILang;
  onChange: (start: string, end: string) => void;
}) {
  const s = hhmmToMin(start) ?? GRID_START_MIN;
  const e = hhmmToMin(end) ?? s + 60;

  const selectCls =
    'flex-1 min-w-0 appearance-none bg-white border border-[#E5E7EB] rounded-xl py-2.5 text-center [text-align-last:center] ' +
    'text-[17px] font-bold text-[#0F172A] outline-none focus:border-[#1D4ED8] transition-colors cursor-pointer';

  return (
    <div className="flex items-center gap-2">
      <select
        id="tt-start"
        aria-label={startLabel}
        value={s}
        onChange={ev => {
          const ns = Number(ev.target.value);
          const ne = e > ns ? e : Math.min(ns + 60, GRID_END_MIN);
          onChange(minToHHMM(ns), minToHHMM(ne));
        }}
        className={selectCls}
      >
        {TIME_SLOTS.filter(m => m < GRID_END_MIN).map(m => (
          <option key={m} value={m}>{minToHHMM(m)}</option>
        ))}
      </select>
      <ArrowRight size={16} strokeWidth={2.2} className="shrink-0 text-[#94A3B8]" />
      <select
        aria-label={endLabel}
        value={e}
        onChange={ev => onChange(minToHHMM(s), minToHHMM(Number(ev.target.value)))}
        className={selectCls}
      >
        {TIME_SLOTS.filter(m => m > s).map(m => (
          <option key={m} value={m}>{minToHHMM(m)}</option>
        ))}
      </select>
      <span className="shrink-0 min-w-[58px] text-center text-[12px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] rounded-full px-2 py-1">
        {durationLabel(Math.max(0, e - s), lang)}
      </span>
    </div>
  );
}

// ── 하단 시트 ─────────────────────────────────────────────────
function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        style={{ animation: 'sheet-fade 0.2s ease-out' }}
        onClick={onClose}
      />
      <div
        className="relative bg-white w-full max-w-[480px] rounded-t-[24px] md:rounded-[24px] shadow-xl max-h-[90vh] overflow-y-auto px-5 pt-3"
        style={{
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          animation: 'sheet-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* 그랩 핸들 */}
        <div className="md:hidden w-10 h-1 rounded-full bg-gray-200 mx-auto mb-3" />
        {children}
      </div>
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────
export default function TimetablePage() {
  const lang = useLang();
  const t = T[lang];

  const [userId, setUserId]         = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [courses, setCourses]       = useState<Course[]>([]);
  const [loading, setLoading]       = useState(true);
  const [now, setNow]               = useState<Date | null>(null);   // 로드 시점 기준

  const [detail, setDetail]           = useState<Course | null>(null);
  const [form, setForm]               = useState<FormState | null>(null);
  const [formError, setFormError]     = useState<ErrKey | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [sent, setSent]               = useState(false);   // 저장 직후 미리보기 카드가 날아가는 연출

  useEffect(() => {
    const client = getSupabaseClient();
    // 로컬 세션 읽기(네트워크 왕복 없음)
    client.auth.getSession().then(async ({ data }: { data: { session: { user: { id: string } } | null } }) => {
      const uid = data.session?.user.id ?? null;
      setNow(new Date());
      setUserId(uid);
      setAuthLoaded(true);

      if (!uid) { setLoading(false); return; }

      const { data: rows } = await client
        .from('timetable_courses')
        .select(COLS)
        .eq('user_id', uid)
        .order('day_of_week', { ascending: true })
        .order('start_min', { ascending: true });

      if (rows) setCourses(rows as unknown as Course[]);
      setLoading(false);
    });
  }, []);

  // ── 표시 대상 과목 ──
  const visible = courses.filter(c => c.day_of_week >= 1 && c.day_of_week <= 7 && c.end_min > c.start_min);
  // 기본 월~금, 토·일은 해당 요일 과목이 있을 때만 열 추가 (최대 7열)
  const dayCols = [...WEEKDAYS, ...[6, 7].filter(d => visible.some(c => c.day_of_week === d))];

  // ── 오늘 ──
  const kst      = now ? kstParts(now) : null;
  const todayDay = kst ? kst.day : null;   // 1~7 = 월~일
  const todayCourses = visible
    .filter(c => c.day_of_week === todayDay)
    .sort((a, b) => a.start_min - b.start_min);
  // 진행 중인 수업이 있으면 그 수업을, 없으면 다음 수업을 강조 (로드 시점 기준)
  const nowMin      = kst ? kst.min : 0;
  const ongoing     = todayCourses.find(c => c.start_min <= nowMin && nowMin < c.end_min) ?? null;
  const focusCourse = ongoing ?? todayCourses.find(c => c.start_min > nowMin) ?? null;

  // ── 이번 주 요약 ──
  const classDays  = new Set(visible.map(c => c.day_of_week));
  const campusDays = classDays.size;                                   // 수업 있는 요일 수
  const freeDays   = WEEKDAYS.filter(d => !classDays.has(d)).length;   // 월~금 중 수업 없는 요일 수

  // ── 요약 (같은 과목명이 여러 요일에 있으면 1과목으로 집계) ──
  const byTitle = new Map<string, number>();
  visible.forEach(c => {
    const key = c.title.trim();
    byTitle.set(key, Math.max(byTitle.get(key) ?? 0, c.credits ?? 0));
  });
  const courseCount  = byTitle.size;
  const totalCredits = Array.from(byTitle.values()).reduce((sum, v) => sum + v, 0);

  // ── 시트 열기/닫기 ──
  const openDetail = (c: Course) => {
    setDetail(c);
    setFormError(null);
    setDeleteArmed(false);
  };

  const closeDetail = () => { if (!saving) setDetail(null); };

  const openForm = (next: FormState) => {
    setDetail(null);
    setForm(next);
    setFormError(null);
    setDeleteArmed(false);
  };

  const openAdd = () => openForm({
    id: null,
    title: '',
    day: todayDay ?? 1,
    start: '09:00',
    end: '10:30',
    location: '',
    professor: '',
    credits: '',
    color: COURSE_COLORS[courses.length % COURSE_COLORS.length].key,
  });

  const openEdit = (c: Course) => openForm({
    id: c.id,
    title: c.title,
    day: c.day_of_week,
    ...snapRange(c.start_min, c.end_min),
    location: c.location ?? '',
    professor: c.professor ?? '',
    credits: c.credits === null ? '' : String(c.credits),
    color: colorOf(c.color).key,
  });

  const closeForm = () => { if (!saving) setForm(null); };

  const patchForm = (patch: Partial<FormState>) => {
    setForm(f => (f ? { ...f, ...patch } : f));
    setFormError(null);
  };

  // ── 저장 ──
  const handleSave = async () => {
    if (!form || !userId || saving) return;

    const title = form.title.trim();
    const startMin = hhmmToMin(form.start);
    const endMin   = hhmmToMin(form.end);

    if (!title) { setFormError('errTitle'); return; }
    if (startMin === null || endMin === null || endMin <= startMin) { setFormError('errTime'); return; }
    if (startMin < GRID_START_MIN || endMin > GRID_END_MIN || startMin % SLOT_MIN !== 0 || endMin % SLOT_MIN !== 0) {
      setFormError('errRange');
      return;
    }

    const creditsRaw = form.credits.trim();
    const credits = creditsRaw === '' ? null : Number(creditsRaw);
    if (credits !== null && (!Number.isInteger(credits) || credits < 0 || credits > 30)) {
      setFormError('errCredits');
      return;
    }

    const overlaps = courses.some(c =>
      c.id !== form.id &&
      c.day_of_week === form.day &&
      c.start_min < endMin &&
      c.end_min > startMin
    );
    if (overlaps) { setFormError('errOverlap'); return; }

    const payload = {
      title,
      day_of_week: form.day,
      start_min: startMin,
      end_min: endMin,
      location: form.location.trim() || null,
      professor: form.professor.trim() || null,
      credits,
      color: form.color,
    };

    setSaving(true);
    const client = getSupabaseClient();
    const { data: row, error } = form.id === null
      ? await client.from('timetable_courses').insert({ ...payload, user_id: userId }).select(COLS).single()
      : await client.from('timetable_courses').update(payload).eq('id', form.id).select(COLS).single();

    if (error || !row) { setSaving(false); setFormError('errSave'); return; }

    const saved = row as unknown as Course;
    setCourses(prev => form.id === null
      ? [...prev, saved]
      : prev.map(c => (c.id === saved.id ? saved : c)));

    // 미리보기 카드가 시간표 쪽으로 날아가는 짧은 연출 뒤에 시트를 닫는다
    setSent(true);
    await new Promise(resolve => setTimeout(resolve, 380));
    setSent(false);
    setSaving(false);
    setForm(null);
  };

  // ── 삭제 (두 번 탭) ──
  const handleDelete = async () => {
    if (!detail || saving) return;
    if (!deleteArmed) { setDeleteArmed(true); return; }

    setSaving(true);
    const { error } = await getSupabaseClient()
      .from('timetable_courses')
      .delete()
      .eq('id', detail.id);
    setSaving(false);

    if (error) { setFormError('errSave'); setDeleteArmed(false); return; }

    setCourses(prev => prev.filter(c => c.id !== detail.id));
    setDetail(null);
  };

  const inputCls =
    'w-full px-3 py-2.5 text-base text-[#111827] bg-white border border-[#E5E7EB] rounded-xl outline-none focus:border-[#1D4ED8] transition-colors';
  const fieldLabelCls = 'block text-[12px] font-semibold text-[#64748B] mb-1.5';
  const cardCls = 'bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_2px_12px_rgba(30,64,175,0.04)]';

  const ready = !loading && !!userId;

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#111827]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-4 gap-2">
          <Link href="/" className="flex-1 min-w-0 text-[15px] text-[#1D4ED8] no-underline leading-tight">
            <span className="font-normal">The</span> <span className="font-bold">Well</span>
          </Link>
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-28">

        {/* 타이틀 + 추가 버튼 */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[26px] font-extrabold text-[#0F172A] leading-tight">{t.title}</h1>
            {ready && kst && (
              <p className="mt-1 text-[13px] text-[#64748B]">
                <span className="font-semibold text-[#334155]">{semesterLabel(kst.y, kst.m, lang)}</span>
                <span className="mx-1.5 text-[#CBD5E1]">·</span>
                {summaryLabel(totalCredits, courseCount, lang)}
              </p>
            )}
          </div>
          {userId && (
            <button
              type="button"
              onClick={openAdd}
              className="w-11 h-11 shrink-0 rounded-full bg-[#F6C21A] text-white border-none cursor-pointer flex items-center justify-center
                         shadow-[0_4px_12px_rgba(246,194,26,0.4)] active:opacity-80 transition-opacity"
              aria-label={t.add}
            >
              <Plus size={24} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {/* 비로그인 */}
        {authLoaded && !userId && (
          <div className={`${cardCls} flex flex-col items-center py-14 px-5 text-center`}>
            <p className="text-[15px] font-semibold text-[#111827] mb-2">{t.loginRequired}</p>
            <Link
              href="/auth"
              className="mt-2 px-6 py-2.5 bg-[#1D4ED8] text-white rounded-full font-bold text-sm no-underline"
            >
              {t.loginCta}
            </Link>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && (
          <div className={`${cardCls} p-4 space-y-2`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#F1F5F9] rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {ready && visible.length === 0 && (
          <div className={`${cardCls} flex flex-col items-center py-14 px-5 text-center`}>
            <span className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-4">
              <Table2 size={26} strokeWidth={1.8} className="text-[#1D4ED8]" />
            </span>
            <p className="text-[15px] font-semibold text-[#111827]">{t.emptyTitle}</p>
            <p className="text-[13px] text-[#94A3B8] mt-1">{t.emptyDesc}</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-5 flex items-center gap-1.5 px-6 py-2.5 bg-[#1D4ED8] text-white rounded-full font-bold text-sm border-none cursor-pointer active:opacity-80 transition-opacity"
            >
              <Plus size={16} strokeWidth={2.4} />
              {t.emptyCta}
            </button>
          </div>
        )}

        {/* 주간 격자 — 바깥 카드만 둥글고 내부는 직선적인 표 */}
        {ready && kst && visible.length > 0 && (
          <div className={`${cardCls} overflow-hidden`}>

            {/* 요일 헤더 (표 헤더처럼 평평하게, 오늘은 블루 텍스트 + 밑줄) */}
            <div className="flex bg-[#FAFBFD]">
              <div className="shrink-0" style={{ width: AXIS_W }} />
              {dayCols.map(day => {
                const isToday = todayDay === day;
                return (
                  <div
                    key={day}
                    className={`flex-1 min-w-0 py-2.5 text-center text-[12px] leading-none
                      ${isToday ? 'font-bold text-[#1D4ED8]' : 'font-semibold text-[#64748B]'}`}
                    style={{
                      borderLeft: `1px solid ${GRID_LINE}`,
                      boxShadow: isToday ? 'inset 0 -2px 0 #1D4ED8' : undefined,
                    }}
                  >
                    {t.days[day - 1]}
                  </div>
                );
              })}
            </div>

            {/* 시간축 + 요일 열 */}
            <div className="flex">
              {/* 시간 라벨: 각 행 위쪽에 숫자만 (12시간제) */}
              <div className="shrink-0" style={{ width: AXIS_W }}>
                {[...HOURS, GRID_END_H].map(h => (
                  <div
                    key={h}
                    className="pt-[3px] pr-[5px] text-right text-[10px] leading-none text-[#A3AEBD]"
                    style={{ height: h === GRID_END_H ? 16 : HOUR_H, borderTop: `1px solid ${GRID_LINE}` }}
                  >
                    {h % 12 || 12}
                  </div>
                ))}
              </div>

              {dayCols.map(day => (
                <div
                  key={day}
                  className="flex-1 min-w-0 relative overflow-hidden"
                  style={{
                    height: HOURS.length * HOUR_H + 1,
                    borderLeft: `1px solid ${GRID_LINE}`,
                    borderBottom: `1px solid ${GRID_LINE}`,
                  }}
                >
                  {/* 정시 가로선 */}
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_H, borderTop: `1px solid ${GRID_LINE}` }} />
                  ))}

                  {/* 과목 블록: 칸 폭을 꽉 채우고 격자선에 맞물림 (범위 밖은 경계에서 잘림) */}
                  {visible.filter(c => c.day_of_week === day).map(c => {
                    const from = Math.max(c.start_min, GRID_START_MIN);
                    const to   = Math.min(c.end_min, GRID_END_MIN);
                    if (to <= from) return null;

                    // 시작선 바로 아래 ~ 종료선 바로 위
                    const height = ((to - from) / 60) * HOUR_H - 1;
                    // 블록 높이에 들어가는 줄 수만큼만 표시하고 나머지는 말줄임
                    const lines  = Math.max(1, Math.floor((height - 6) / 13));
                    const extras = [c.professor, c.location].filter((v): v is string => !!v);
                    // 한 줄만 남으면 강의실 우선
                    const shown  = lines - 1 >= extras.length
                      ? extras
                      : lines >= 2 ? [c.location ?? extras[0]] : [];
                    return (
                      <button
                        key={String(c.id)}
                        type="button"
                        onClick={() => openDetail(c)}
                        className="absolute left-0 right-0 flex flex-col items-stretch justify-start px-[3px] py-[3px] text-left overflow-hidden border-none rounded-none cursor-pointer active:opacity-70 transition-opacity"
                        style={{
                          top: ((from - GRID_START_MIN) / 60) * HOUR_H + 1,
                          height,
                          backgroundColor: colorOf(c.color).bg,
                        }}
                      >
                        <span
                          className="shrink-0 text-[11px] font-bold text-[#1F2937] leading-[13px] break-all overflow-hidden"
                          style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: Math.max(1, lines - shown.length) }}
                        >
                          {c.title}
                        </span>
                        {shown.map((text, idx) => (
                          <span key={idx} className="block shrink-0 text-[10px] text-[#64748B] leading-[13px] truncate">{text}</span>
                        ))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 오늘의 수업 */}
        {ready && kst && visible.length > 0 && (
          <section className={`${cardCls} mt-4 px-4 py-4`}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="flex-1 text-[17px] font-extrabold text-[#0F172A]">{t.todayTitle}</h2>
              <span className="text-[12px] text-[#94A3B8] shrink-0">
                {todayLabel(kst.m, kst.d, t.days[kst.day - 1], lang)}
              </span>
            </div>

            {todayCourses.length === 0 ? (
              /* 공강 */
              <div className="rounded-2xl bg-[#FFF9E6] px-4 py-5 text-center">
                <p className="text-[16px] font-extrabold text-[#0F172A]">{t.freeTitle}</p>
                <p className="text-[12px] text-[#94A3B8] mt-1">{t.freeSub}</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {[
                    { href: '/notices',   Icon: Megaphone,     label: t.goNotices },
                    { href: '/schedule',  Icon: CalendarDays,  label: t.goSchedule },
                    { href: '/community', Icon: MessageCircle, label: t.goCommunity },
                  ].map(({ href, Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#E3ECFD] text-[12px] font-semibold text-[#1D4ED8] no-underline active:opacity-70 transition-opacity"
                    >
                      <Icon size={14} strokeWidth={2} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* 다음(또는 진행 중인) 수업 강조 / 모두 끝남 */}
                {focusCourse ? (
                  <button
                    type="button"
                    onClick={() => openDetail(focusCourse)}
                    className="w-full mb-3 px-4 py-3.5 rounded-2xl bg-[#EFF6FF] border border-[#DBE7FE] text-left cursor-pointer active:opacity-80 transition-opacity"
                  >
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#1D4ED8]">
                      <Clock size={13} strokeWidth={2.4} />
                      {ongoing
                        ? ongoingLabel(durationLabel(focusCourse.end_min - nowMin, lang), lang)
                        : nextInLabel(durationLabel(focusCourse.start_min - nowMin, lang), lang)}
                    </span>
                    <span className="flex items-center gap-2 mt-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorOf(focusCourse.color).accent }} />
                      <span className="flex-1 min-w-0 text-[17px] font-extrabold text-[#0F172A] truncate">{focusCourse.title}</span>
                    </span>
                    <span className="block text-[12px] text-[#64748B] mt-0.5 truncate">
                      {timeRange(focusCourse)}
                      {focusCourse.location && (
                        <>
                          <span className="mx-1.5 text-[#CBD5E1]">|</span>
                          {focusCourse.location}
                        </>
                      )}
                    </span>
                  </button>
                ) : (
                  <div className="mb-3 px-4 py-3.5 rounded-2xl bg-[#FFF9E6] text-center">
                    <p className="text-[15px] font-extrabold text-[#0F172A]">{t.todayDone}</p>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">{t.todayDoneSub}</p>
                  </div>
                )}

                {/* 오늘 전체 수업 (끝난 수업은 흐리게) */}
                <div className="space-y-2">
                  {todayCourses.map(c => (
                    <button
                      key={String(c.id)}
                      type="button"
                      onClick={() => openDetail(c)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl bg-[#F8FAFC] border-none text-left cursor-pointer active:opacity-70 transition-opacity
                        ${c.end_min <= nowMin ? 'opacity-50' : ''}`}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorOf(c.color).accent }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-bold text-[#111827] truncate">{c.title}</span>
                        <span className="block text-[12px] text-[#64748B] mt-0.5 truncate">
                          {timeRange(c)}
                          {c.location && (
                            <>
                              <span className="mx-1.5 text-[#CBD5E1]">|</span>
                              {c.location}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="w-7 h-7 rounded-full bg-[#EEF2F7] flex items-center justify-center shrink-0 text-[#334155]">
                        <ChevronRight size={15} strokeWidth={2.2} />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* 이번 주 요약 */}
        {ready && visible.length > 0 && (
          <section className={`${cardCls} mt-4 px-4 py-4`}>
            <h2 className="text-[15px] font-extrabold text-[#0F172A] mb-3">{t.weekTitle}</h2>
            <div className="flex gap-2">
              {[
                { value: visible.length, label: t.weekClasses, tone: 'text-[#1D4ED8]' },
                { value: campusDays,     label: t.weekCampus,  tone: 'text-[#1D4ED8]' },
                { value: freeDays,       label: t.weekFree,    tone: 'text-[#B8900E]' },
              ].map(({ value, label, tone }) => (
                <div key={label[0]} className="flex-1 min-w-0 rounded-2xl bg-[#F8FAFC] py-3 text-center">
                  <p className={`text-[22px] font-extrabold leading-none ${tone}`}>
                    {value}
                    {label[1] && <span className="text-[12px] font-bold ml-0.5">{label[1]}</span>}
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-1.5 truncate px-1">{label[0]}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 오늘의 표현 (대학생활 한국어, 하루 하나 로테이션) */}
        {ready && kst && (() => {
          const expr = EXPRESSIONS[kst.dayIndex % EXPRESSIONS.length];
          return (
            <section className="mt-4 rounded-[22px] px-5 py-4 bg-gradient-to-r from-[#EAF1FE] to-[#F3F7FF] border border-[#E3ECFD]">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="w-6 h-6 rounded-full bg-[#F6C21A] flex items-center justify-center shrink-0">
                  <Languages size={13} strokeWidth={2.2} color="white" />
                </span>
                <h2 className="text-[13px] font-extrabold text-[#0F172A]">{t.exprTitle}</h2>
                <span className="text-[11px] text-[#94A3B8]">· {t.exprSub}</span>
              </div>
              <p className="flex items-baseline gap-2 flex-wrap">
                <span lang="ko" className="text-[24px] font-extrabold text-[#1D4ED8] leading-tight">{expr.term}</span>
                <span className="text-[12px] text-[#94A3B8]">[{expr.roman}]</span>
              </p>
              <p className="text-[14px] text-[#334155] leading-relaxed mt-1">{expr.meaning[lang]}</p>
            </section>
          );
        })()}
      </div>

      {/* ── 과목 상세 시트 ── */}
      {detail && (
        <Sheet onClose={closeDetail}>
          <div className="flex items-start gap-3 mb-4">
            <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: colorOf(detail.color).accent }} />
            <h2 className="flex-1 min-w-0 text-[19px] font-extrabold text-[#0F172A] leading-snug break-words">{detail.title}</h2>
            <button
              type="button"
              onClick={closeDetail}
              className="p-1.5 -mr-1.5 text-gray-400 bg-transparent border-none cursor-pointer shrink-0"
              aria-label={t.close}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-1 mb-4">
            {[
              { Icon: Clock,         label: t.day,       value: `${t.days[detail.day_of_week - 1]} ${timeRange(detail)}` },
              { Icon: MapPin,        label: t.location,  value: detail.location },
              { Icon: UserRound,     label: t.professor, value: detail.professor },
              { Icon: GraduationCap, label: t.credits,   value: detail.credits === null ? null : creditsLabel(detail.credits, lang) },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-2.5 border-b border-[#EEF2F7] last:border-b-0">
                <Icon size={16} strokeWidth={1.8} className="text-[#1D4ED8] shrink-0" />
                <span className="w-16 shrink-0 text-[12px] text-[#94A3B8]">{label}</span>
                <span className={`flex-1 min-w-0 text-[14px] break-words ${value ? 'text-[#111827] font-medium' : 'text-[#CBD5E1]'}`}>
                  {value || '-'}
                </span>
              </div>
            ))}
          </div>

          {formError && <p className="text-[13px] text-red-500 mb-3">{t[formError]}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className={`flex items-center justify-center gap-1 px-4 py-3 text-sm font-semibold rounded-2xl border cursor-pointer disabled:opacity-40 transition-colors
                ${deleteArmed
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-white border-red-200 text-red-500'}`}
            >
              <Trash2 size={15} strokeWidth={2} />
              {deleteArmed ? t.delConfirm : t.del}
            </button>
            <button
              type="button"
              onClick={() => openEdit(detail)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold text-white bg-[#1D4ED8] rounded-2xl border-none cursor-pointer disabled:opacity-40 active:opacity-80 transition-opacity"
            >
              <Pencil size={15} strokeWidth={2} />
              {t.editBtn}
            </button>
          </div>
        </Sheet>
      )}

      {/* ── 과목 추가/수정 시트 ── */}
      {form && (() => {
        const color    = colorOf(form.color);
        const startMin = hhmmToMin(form.start) ?? GRID_START_MIN;
        const endMin   = hhmmToMin(form.end) ?? startMin + 60;
        const duration = Math.max(SLOT_MIN, endMin - startMin);
        // 미리보기 블록 높이: 수업 길이에 비례 (1시간 = 40px, 36~96px)
        const previewH = Math.min(96, Math.max(36, (duration / 60) * 40));
        const creditsNum  = Number(form.credits);
        const showCredits = form.credits.trim() !== '' && Number.isInteger(creditsNum) && creditsNum >= 0;

        return (
          <Sheet onClose={closeForm}>
            <div className="flex items-center mb-3">
              <h2 className="flex-1 text-[18px] font-extrabold text-[#0F172A]">
                {form.id === null ? t.formAdd : t.formEdit}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="p-1.5 -mr-1.5 text-gray-400 bg-transparent border-none cursor-pointer"
                aria-label={t.close}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* 미리보기: 시간표에 들어갈 수업 블록 (스크롤해도 상단 고정) */}
            <div className="sticky top-0 z-10 bg-white -mx-5 px-5 pb-3">
              <div className="flex items-stretch gap-3 rounded-2xl bg-[#F8FAFC] p-3">
                <div
                  className={`relative w-[46%] shrink-0 h-[96px] rounded-lg bg-white ${sent ? 'overflow-visible' : 'overflow-hidden'}`}
                  style={{
                    border: `1px solid ${GRID_LINE}`,
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 39px, ${GRID_LINE} 39px 40px)`,
                  }}
                >
                  <div
                    className="absolute left-0 right-0 top-0 px-2 py-1.5 overflow-hidden motion-reduce:transition-none"
                    style={{
                      height: previewH,
                      backgroundColor: color.bg,
                      transform: sent ? 'translateY(-56px) scale(0.55)' : 'none',
                      opacity: sent ? 0 : 1,
                      transition: 'height 0.25s ease, background-color 0.25s ease, transform 0.38s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.38s ease',
                    }}
                  >
                    <span className={`block text-[13px] font-bold leading-[16px] truncate ${form.title.trim() ? 'text-[#1F2937]' : 'text-[#1F2937]/35'}`}>
                      {form.title.trim() || t.name}
                    </span>
                    {form.professor.trim() && (
                      <span className="block text-[11px] text-[#64748B] leading-[14px] truncate">{form.professor.trim()}</span>
                    )}
                    {form.location.trim() && (
                      <span className="block text-[11px] text-[#64748B] leading-[14px] truncate">{form.location.trim()}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <span className="text-[11px] font-semibold text-[#94A3B8]">{t.preview}</span>
                  <span className="text-[14px] font-bold text-[#0F172A] leading-snug">
                    <span style={{ color: color.accent }}>●</span> {t.days[form.day - 1]}
                    <span className="mx-1 text-[#CBD5E1]">·</span>
                    {form.start} → {form.end}
                  </span>
                  <span className="text-[12px] text-[#64748B]">
                    {durationLabel(duration, lang)}
                    {showCredits && (
                      <>
                        <span className="mx-1 text-[#CBD5E1]">·</span>
                        {creditsLabel(creditsNum, lang)}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* 과목명 */}
              <div>
                <label htmlFor="tt-title" className={fieldLabelCls}>{t.name}</label>
                <input
                  id="tt-title"
                  type="text"
                  value={form.title}
                  onChange={e => patchForm({ title: e.target.value })}
                  placeholder={t.namePh}
                  maxLength={50}
                  className={inputCls}
                />
              </div>

              {/* 요일 */}
              <div>
                <span className={fieldLabelCls}>{t.day}</span>
                <div className="flex gap-1.5">
                  {t.days.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => patchForm({ day: i + 1 })}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-semibold border cursor-pointer transition-colors
                        ${form.day === i + 1
                          ? 'bg-[#F6C21A] border-[#F6C21A] text-[#2F2F2F]'
                          : 'bg-white border-[#E5E7EB] text-[#64748B]'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시간 (09:00~22:00, 30분 단위) */}
              <div>
                <label htmlFor="tt-start" className={fieldLabelCls}>{t.time}</label>
                <TimeRangePicker
                  start={form.start}
                  end={form.end}
                  startLabel={t.start}
                  endLabel={t.end}
                  lang={lang}
                  onChange={(start, end) => patchForm({ start, end })}
                />
              </div>

              {/* 강의실 */}
              <div>
                <label htmlFor="tt-location" className={fieldLabelCls}>{t.location}</label>
                <div className="relative">
                  <MapPin size={16} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  <input
                    id="tt-location"
                    type="text"
                    value={form.location}
                    onChange={e => patchForm({ location: e.target.value })}
                    placeholder={t.locationPh}
                    maxLength={50}
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>

              {/* 교수 / 학점 (선택) */}
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <label htmlFor="tt-professor" className={fieldLabelCls}>{t.professor}</label>
                  <div className="relative">
                    <UserRound size={16} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input
                      id="tt-professor"
                      type="text"
                      value={form.professor}
                      onChange={e => patchForm({ professor: e.target.value })}
                      placeholder={t.professorPh}
                      maxLength={30}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <label htmlFor="tt-credits" className={fieldLabelCls}>{t.credits}</label>
                  <div className="relative">
                    <GraduationCap size={16} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input
                      id="tt-credits"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={30}
                      step={1}
                      value={form.credits}
                      onChange={e => patchForm({ credits: e.target.value })}
                      placeholder={t.creditsPh}
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>
              </div>

              {/* 색상 */}
              <div>
                <span className={fieldLabelCls}>{t.color}</span>
                <div className="flex justify-between">
                  {COURSE_COLORS.map(c => {
                    const selected = form.color === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => patchForm({ color: c.key })}
                        aria-label={c.key}
                        aria-pressed={selected}
                        className={`w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-transform active:scale-90
                          ${selected ? 'scale-110' : ''}`}
                        style={{
                          backgroundColor: c.bg,
                          border: selected ? `2px solid ${c.accent}` : '1px solid rgba(15,23,42,0.06)',
                        }}
                      >
                        {selected && <Check size={14} strokeWidth={3} color={c.accent} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 에러 */}
              {formError && (
                <p className="text-[13px] text-red-500">{t[formError]}</p>
              )}

              {/* 저장 */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3.5 text-[15px] font-bold text-white bg-[#1D4ED8] rounded-2xl border-none cursor-pointer
                           shadow-[0_6px_16px_rgba(29,78,216,0.25)] disabled:opacity-60 active:opacity-80 transition-opacity"
              >
                {saving && !sent ? t.saving : form.id === null ? t.submitAdd : t.submitEdit}
              </button>
            </div>
          </Sheet>
        );
      })()}

      <BottomTabBar lang={lang} />
    </div>
  );
}
