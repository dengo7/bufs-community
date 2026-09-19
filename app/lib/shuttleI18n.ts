// 통학버스 화면 UI 라벨 (4개 언어). 노선·정류장 등 데이터 자체의 명칭은 shuttleBus.ts 에 둔다.
// campusI18n.ts 와 같은 패턴.
import type { UILang } from './categories';
import type { ShuttleScheduleKey } from './shuttleBus';

type ShuttleDict = {
  title: string;
  school: string;
  back: string;
  departBase: string;          // "부산외대 출발 기준"
  nextBus: string;
  /** {n}이 분으로 치환된다 */
  departsIn: string;
  departsNow: string;
  serviceEnded: string;
  firstBus: string;
  disclaimer: string;
  tabs: Record<ShuttleScheduleKey, string>;
  fareFree: string;
  farePaid: string;
  lineSelect: string;
  timetableTitle: string;
  routeTitle: string;
  routeNote: string;           // 순환 노선 설명
  boardingTitle: string;
  infoTitle: string;
  infoCategory: string;
  infoCategoryValue: string;
  infoBase: string;
  infoBaseValue: string;
  infoHours: string;
  infoFare: string;
  infoFareValue: string;
  infoNotes: string;
  infoNotesValue: string;
  fareUnknown: string;         // "확인 필요"
  lastVerified: string;
  sourceLabel: string;
};

export const SHUTTLE_T: Record<UILang, ShuttleDict> = {
  ko: {
    title: '통학버스',
    school: '부산외국어대학교',
    back: '뒤로가기',
    departBase: '부산외대 출발 기준',
    nextBus: '다음 버스',
    departsIn: '약 {n}분 후 출발합니다',
    departsNow: '곧 출발합니다',
    serviceEnded: '오늘 운행이 종료되었습니다',
    firstBus: '첫차',
    disclaimer: '시간표 기준 안내이며, 실시간 교통 상황에 따라 실제 운행시간과 차이가 있을 수 있습니다.',
    tabs: {
      'regular-mon-thu': '정규학기 월~목',
      'regular-fri': '정규학기 금요일',
      seasonal: '계절학기',
      break: '방학·주말',
    },
    fareFree: '무료',
    farePaid: '유료',
    lineSelect: '노선 선택',
    timetableTitle: '시간표',
    routeTitle: '노선 안내',
    routeNote: '금정 3번 단일 순환 노선 · 부산외대에서 출발해 한 바퀴 돌아 다시 부산외대로 돌아옵니다.',
    boardingTitle: '탑승 위치',
    infoTitle: '운행 안내',
    infoCategory: '운행 구분',
    infoCategoryValue: '정규학기(월~목/금) · 계절학기 · 방학·주말',
    infoBase: '기준',
    infoBaseValue: '부산외국어대학교 출발',
    infoHours: '운행 시간대',
    infoFare: '요금',
    infoFareValue: '정규학기·계절학기 무료 / 방학·주말·공휴일 유료',
    infoNotes: '참고사항',
    infoNotesValue: '부산외대 정문 정류장은 2025.03.01.부터 11037 남산고교 방면 정류장으로 변경되었습니다.',
    fareUnknown: '요금 확인 필요',
    lastVerified: '기준일',
    sourceLabel: '출처',
  },
  en: {
    title: 'Campus Shuttle',
    school: 'Busan Univ. of Foreign Studies',
    back: 'Back',
    departBase: 'Departures from BUFS',
    nextBus: 'Next Bus',
    departsIn: 'Departs in about {n} min',
    departsNow: 'Departing soon',
    serviceEnded: 'Service has ended for today',
    firstBus: 'First bus',
    disclaimer: 'Times are based on the timetable; actual departures may vary with traffic conditions.',
    tabs: {
      'regular-mon-thu': 'Semester Mon–Thu',
      'regular-fri': 'Semester Friday',
      seasonal: 'Seasonal Session',
      break: 'Break · Weekends',
    },
    fareFree: 'Free',
    farePaid: 'Paid',
    lineSelect: 'Select line',
    timetableTitle: 'Timetable',
    routeTitle: 'Route',
    routeNote: 'Single circular route (Geumjeong 3): departs BUFS, loops around, and returns to BUFS.',
    boardingTitle: 'Boarding Points',
    infoTitle: 'Service Info',
    infoCategory: 'Schedules',
    infoCategoryValue: 'Semester (Mon–Thu / Fri) · Seasonal session · Break & weekends',
    infoBase: 'Basis',
    infoBaseValue: 'Departures from BUFS',
    infoHours: 'Service hours',
    infoFare: 'Fare',
    infoFareValue: 'Free during semester & seasonal session / Paid during breaks, weekends & holidays',
    infoNotes: 'Notes',
    infoNotesValue: 'As of Mar 1, 2025, the BUFS Main Gate stop moved to stop no. 11037 (toward Namsan High School).',
    fareUnknown: 'Fare to be confirmed',
    lastVerified: 'As of',
    sourceLabel: 'Source',
  },
  zh: {
    title: '通学巴士',
    school: '釜山外国语大学',
    back: '返回',
    departBase: '以釜山外大发车时间为准',
    nextBus: '下一班车',
    departsIn: '约{n}分钟后发车',
    departsNow: '即将发车',
    serviceEnded: '今日运行已结束',
    firstBus: '首班车',
    disclaimer: '以时刻表为准，实际发车时间可能因交通状况而有所不同。',
    tabs: {
      'regular-mon-thu': '正规学期 周一~周四',
      'regular-fri': '正规学期 周五',
      seasonal: '季节学期',
      break: '假期·周末',
    },
    fareFree: '免费',
    farePaid: '收费',
    lineSelect: '选择路线',
    timetableTitle: '时刻表',
    routeTitle: '路线指南',
    routeNote: '金井3路单一循环路线：从釜山外大出发，绕行一圈后返回釜山外大。',
    boardingTitle: '乘车位置',
    infoTitle: '运行指南',
    infoCategory: '运行区分',
    infoCategoryValue: '正规学期（周一~周四/周五）· 季节学期 · 假期·周末',
    infoBase: '基准',
    infoBaseValue: '釜山外国语大学发车',
    infoHours: '运行时间段',
    infoFare: '车费',
    infoFareValue: '正规学期·季节学期免费 / 假期·周末·公休日收费',
    infoNotes: '参考事项',
    infoNotesValue: '自2025.03.01起，釜山外大正门车站变更为11037南山高中方向车站。',
    fareUnknown: '车费待确认',
    lastVerified: '基准日',
    sourceLabel: '来源',
  },
  ja: {
    title: '通学バス',
    school: '釜山外国語大学',
    back: '戻る',
    departBase: '釜山外大発の時刻基準',
    nextBus: '次のバス',
    departsIn: '約{n}分後に出発します',
    departsNow: 'まもなく出発します',
    serviceEnded: '本日の運行は終了しました',
    firstBus: '始発',
    disclaimer: '時刻表基準の案内であり、交通状況により実際の運行時間と異なる場合があります。',
    tabs: {
      'regular-mon-thu': '正規学期 月~木',
      'regular-fri': '正規学期 金曜日',
      seasonal: '季節学期',
      break: '休み·週末',
    },
    fareFree: '無料',
    farePaid: '有料',
    lineSelect: '路線を選択',
    timetableTitle: '時刻表',
    routeTitle: '路線案内',
    routeNote: '金井3番の単一循環路線：釜山外大を出発し、一周して再び釜山外大に戻ります。',
    boardingTitle: '乗車位置',
    infoTitle: '運行案内',
    infoCategory: '運行区分',
    infoCategoryValue: '正規学期（月~木/金）· 季節学期 · 休み·週末',
    infoBase: '基準',
    infoBaseValue: '釜山外国語大学発',
    infoHours: '運行時間帯',
    infoFare: '料金',
    infoFareValue: '正規学期·季節学期は無料 / 休み·週末·祝日は有料',
    infoNotes: '参考事項',
    infoNotesValue: '2025.03.01より、釜山外大正門のりばは11037南山高校方面のりばに変更されました。',
    fareUnknown: '料金要確認',
    lastVerified: '基準日',
    sourceLabel: '出典',
  },
};
