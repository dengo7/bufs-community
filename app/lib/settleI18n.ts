import type { UILang } from './lang';
import type { SettleCategory, SettleHousing, SettleVisa } from './settleItems';

/** 정착 체크리스트(/settle) 화면 문구. ko/en 완성, zh/ja는 번역 전이라 en을 그대로 쓴다 */
export type SettleDict = {
  title: string;
  backAria: string;
  editProfile: string;
  // 프로필
  setupTitle: string;
  setupSub: string;
  arrival: string;
  arrivalHelp: string;
  visa: string;
  visaHelp: string;
  housing: string;
  housingHelp: string;
  visaLabel: Record<SettleVisa, string>;
  housingLabel: Record<SettleHousing, string>;
  save: string;
  cancel: string;
  localOnly: string;
  // 헤더 요약
  dayAfter: (n: number) => string;
  dayBefore: (n: number) => string;
  arrivalToday: string;
  // 진행률
  progress: string;
  progressCount: (done: number, total: number) => string;
  allDone: string;
  // 목록
  filterAll: string;
  category: Record<SettleCategory, string>;
  bucket: [string, string, string];
  bucketEmpty: string;
  doneSection: string;
  minutes: (n: number) => string;
  priority: { high: string; mid: string; low: string };
  ddayLeft: (n: number) => string;
  ddayToday: string;
  overdue: (n: number) => string;
  closed: string;
  checking: string;
  markDone: string;
  markUndone: string;
  doneLabel: string;
  // 시안 B — 급한 일·타임라인
  urgentEyebrow: string;
  viewDetail: string;
  deadlineOn: (date: string) => string;
  timelineTitle: string;
  today: string;
  phase: { arrival: string; week: string; month: string; quarter: string; half: string; later: string };
  deadlineNode: (name: string) => string;
  academicNode: string;
  // 상세 시트 — 연락처
  whereWho: string;
  callTo: (name: string) => string;
  openSite: (name: string) => string;
  otherContacts: (n: number) => string;
  // 정착 가이드 박스
  guideTag: string;
  guideNow: string;
  guideUnlock: string;
  guidePending: string;
  guideBasedOn: string;
  aiCopy: string;
  aiHint: string;
  aiCopied: string;
  aiCopyFailed: string;
  // 프로필 — 입국일 빠른 버튼
  quickDate: { in7: string; today: string; ago7: string; ago30: string };
  // 기타 비자
  otherVisaTitle: string;
  otherVisaBody: string;
  // 상세
  close: string;
  legalDeadline: string;
  deadlineBasis: (days: number) => string;
  penalty: string;
  lawRef: string;
  documents: string;
  required: string;
  steps: string;
  where: string;
  phone: string;
  hours: string;
  cost: string;
  free: string;
  won: (n: number) => string;
  cautions: string;
  links: string;
  courseReg: string;
  courseRegClosed: string;
  askSchool: string;
  askSchoolBody: string;
  relatedGuides: string;
  guidesLoading: string;
  openGuideCategory: string;
  sources: string;
  confidence: { high: string; medium: string; low: string };
  notVerified: string;
};

const KO: SettleDict = {
  title: '정착 체크리스트',
  backAria: '뒤로 가기',
  editProfile: '정보 수정',
  setupTitle: '나에게 맞는 할 일을 알려드릴게요',
  setupSub: '세 가지만 알려주세요. 입국일을 기준으로 해야 할 일을 순서대로 보여드려요.',
  arrival: '입국일',
  arrivalHelp: '아직 입국 전이면 예정일을 넣어주세요.',
  visa: '체류자격 (비자)',
  visaHelp: '비자에 따라 수강신청·시간제취업 안내가 달라져요.',
  housing: '거주형태',
  housingHelp: '자취를 고르면 주거 계약 확인 항목이 추가돼요.',
  visaLabel: { d2: 'D-2 학위과정', d4: 'D-4 어학연수', other: '기타' },
  housingLabel: { dorm: '기숙사', solo: '자취' },
  save: '저장',
  cancel: '취소',
  localOnly: '입력한 정보와 체크 상태는 이 기기에만 저장돼요.',
  dayAfter: n => `입국 D+${n}`,
  dayBefore: n => `입국까지 D-${n}`,
  arrivalToday: '입국 당일 (D+0)',
  progress: '정착 진행률',
  progressCount: (d, t) => `${t}개 중 ${d}개 완료`,
  allDone: '지금 보이는 할 일을 모두 마쳤어요!',
  filterAll: '전체',
  category: { admin: '행정', life: '생활', academic: '학업' },
  bucket: ['지금 할 일', '21일 안에', '나중에'],
  bucketEmpty: '해당하는 할 일이 없어요.',
  doneSection: '완료한 일',
  minutes: n => `약 ${n}분`,
  priority: { high: '중요', mid: '보통', low: '여유' },
  ddayLeft: n => `D-${n}`,
  ddayToday: '오늘 마감',
  overdue: n => `기한 ${n}일 초과`,
  closed: '기간 종료',
  checking: '확인 중',
  markDone: '완료로 표시',
  markUndone: '완료 취소',
  doneLabel: '완료',
  urgentEyebrow: '가장 급한 할 일',
  viewDetail: '자세히 보기',
  deadlineOn: d => `법정 기한 ${d}`,
  timelineTitle: '나의 정착 타임라인',
  today: '오늘',
  phase: { arrival: '입국', week: '첫 주', month: '한 달 안에', quarter: '석 달 안에', half: '6개월 안에', later: '6개월 이후' },
  deadlineNode: name => `${name} 법정 기한`,
  academicNode: '학사일정',
  whereWho: '어디서 · 누구에게',
  callTo: name => `${name}에 전화`,
  openSite: name => `${name} 열기`,
  otherContacts: n => `다른 연락처 ${n}곳`,
  guideTag: '정착 가이드',
  guideNow: '지금 확인할 점',
  guideUnlock: '끝내면 이런 게 가능해져요',
  guidePending: '이 항목은 아직 공식 자료로 확인 중이라 맞춤 안내가 없어요.',
  guideBasedOn: '회원님의 비자 · 거주형태 · 입국 경과일을 바탕으로 작성되었어요. 법적 판단이 필요한 건 학교 국제교류처나 출입국에 확인하세요.',
  aiCopy: 'AI 프롬프트 복사',
  aiHint: '복사해서 ChatGPT나 Gemini 같은 AI 챗봇에 붙여넣으면, 내 상황에 맞춘 설명을 받아볼 수 있어요. 이름 같은 개인정보는 들어가지 않아요.',
  aiCopied: '프롬프트를 복사했어요',
  aiCopyFailed: '복사하지 못했어요. 다시 시도해 주세요.',
  quickDate: { in7: '일주일 뒤', today: '오늘', ago7: '일주일 전', ago30: '한 달 전' },
  otherVisaTitle: '이 체류자격은 아직 준비 중이에요',
  otherVisaBody: '지금은 D-2 · D-4 기준으로 확인된 안내만 보여드려요. 잘못된 안내를 피하려고 목록을 숨겼어요. 학교 국제교류 부서나 외국인종합안내센터(1345)에 문의해 주세요.',
  close: '닫기',
  legalDeadline: '법정 기한',
  deadlineBasis: d => `입국일로부터 ${d}일 이내`,
  penalty: '지키지 않으면',
  lawRef: '근거',
  documents: '준비물',
  required: '필수',
  steps: '진행 순서',
  where: '어디서',
  phone: '전화',
  hours: '운영시간',
  cost: '비용',
  free: '무료',
  won: n => `${n.toLocaleString('ko-KR')}원`,
  cautions: '꼭 알아둘 점',
  links: '바로가기',
  courseReg: '다음 수강신청',
  courseRegClosed: '등록된 다음 수강신청 일정이 없어요. 학사일정을 확인해 주세요.',
  askSchool: '학교 국제교류 부서에 문의',
  askSchoolBody: '학교마다 절차가 달라요. 정확한 절차와 일정은 학교 국제교류 부서에 꼭 확인해 주세요.',
  relatedGuides: '관련 가이드',
  guidesLoading: '가이드를 불러오는 중…',
  openGuideCategory: '가이드 전체 보기',
  sources: '출처',
  confidence: { high: '공식 자료 확인', medium: '확인 권장', low: '확인 중' },
  notVerified: '아직 확인 중인 정보예요. 실제와 다를 수 있어요.',
};

const EN: SettleDict = {
  title: 'Settling-in checklist',
  backAria: 'Go back',
  editProfile: 'Edit info',
  setupTitle: "Let's find the tasks that fit you",
  setupSub: "Answer three quick questions. We'll list what to do, in order, from your arrival date.",
  arrival: 'Arrival date',
  arrivalHelp: "Not in Korea yet? Enter your expected date.",
  visa: 'Visa status',
  visaHelp: 'Course registration and part-time work guidance depend on your visa.',
  housing: 'Housing',
  housingHelp: 'Choosing off-campus adds a lease check task.',
  visaLabel: { d2: 'D-2 Degree program', d4: 'D-4 Language program', other: 'Other' },
  housingLabel: { dorm: 'Dormitory', solo: 'Off-campus' },
  save: 'Save',
  cancel: 'Cancel',
  localOnly: 'Your answers and checkmarks are saved on this device only.',
  dayAfter: n => `D+${n} since arrival`,
  dayBefore: n => `D-${n} until arrival`,
  arrivalToday: 'Arrival day (D+0)',
  progress: 'Settling-in progress',
  progressCount: (d, t) => `${d} of ${t} done`,
  allDone: "You've finished every task shown right now!",
  filterAll: 'All',
  category: { admin: 'Admin', life: 'Life', academic: 'Academic' },
  bucket: ['Do now', 'Within 21 days', 'Later'],
  bucketEmpty: 'Nothing here.',
  doneSection: 'Done',
  minutes: n => `About ${n} min`,
  priority: { high: 'Important', mid: 'Normal', low: 'Flexible' },
  ddayLeft: n => `D-${n}`,
  ddayToday: 'Due today',
  overdue: n => `${n} days overdue`,
  closed: 'Closed',
  checking: 'Being verified',
  markDone: 'Mark as done',
  markUndone: 'Undo',
  doneLabel: 'Done',
  urgentEyebrow: 'Most urgent task',
  viewDetail: 'See details',
  deadlineOn: d => `Legal deadline ${d}`,
  timelineTitle: 'My settling-in timeline',
  today: 'Today',
  phase: { arrival: 'Arrival', week: 'First week', month: 'Within a month', quarter: 'Within 3 months', half: 'Within 6 months', later: 'After 6 months' },
  deadlineNode: name => `${name} legal deadline`,
  academicNode: 'Academic calendar',
  whereWho: 'Where · who to contact',
  callTo: name => `Call ${name}`,
  openSite: name => `Open ${name}`,
  otherContacts: n => `${n} more contact${n > 1 ? 's' : ''}`,
  guideTag: 'Settling-in guide',
  guideNow: 'What to know now',
  guideUnlock: 'What this unlocks',
  guidePending: "This task is still being verified against official sources, so there's no tailored guidance yet.",
  guideBasedOn: "Based on your visa, housing, and days since arrival. For legal decisions, check with your school's international office or immigration.",
  aiCopy: 'Copy AI prompt',
  aiHint: 'Paste it into an AI chatbot like ChatGPT or Gemini to get an explanation tailored to your situation. No personal details such as your name are included.',
  aiCopied: 'Prompt copied',
  aiCopyFailed: "Couldn't copy. Please try again.",
  quickDate: { in7: 'In a week', today: 'Today', ago7: 'A week ago', ago30: 'A month ago' },
  otherVisaTitle: "This visa status isn't supported yet",
  otherVisaBody: "For now we only show verified guidance for D-2 and D-4. We've hidden the list to avoid giving you wrong information. Please contact your school's international office or the Immigration Contact Center (1345).",
  close: 'Close',
  legalDeadline: 'Legal deadline',
  deadlineBasis: d => `Within ${d} days of arrival`,
  penalty: 'If you miss it',
  lawRef: 'Legal basis',
  documents: 'What to bring',
  required: 'Required',
  steps: 'Steps',
  where: 'Where',
  phone: 'Phone',
  hours: 'Hours',
  cost: 'Cost',
  free: 'Free',
  won: n => `${n.toLocaleString('en-US')} KRW`,
  cautions: 'Good to know',
  links: 'Links',
  courseReg: 'Next course registration',
  courseRegClosed: 'No upcoming course registration is listed. Please check the academic calendar.',
  askSchool: "Ask your school's international office",
  askSchoolBody: "The process differs by school. Please confirm the exact steps and dates with your school's international office.",
  relatedGuides: 'Related guides',
  guidesLoading: 'Loading guides…',
  openGuideCategory: 'See all guides',
  sources: 'Sources',
  confidence: { high: 'Official source', medium: 'Please double-check', low: 'Being verified' },
  notVerified: 'This is still being verified and may differ from reality.',
};

// TODO(번역): zh/ja는 번역 전 — 키 구조만 맞추고 en 문구를 그대로 보여준다
const ZH: SettleDict = { ...EN };
const JA: SettleDict = { ...EN };

export const SETTLE_T: Record<UILang, SettleDict> = { ko: KO, en: EN, zh: ZH, ja: JA };
