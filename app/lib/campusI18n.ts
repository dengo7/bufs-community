// 캠퍼스 가이드 UI 라벨 (4개 언어). 시설 콘텐츠 자체의 번역은 campusFacilities.ts 의 translations 필드에 둔다.
import type { UILang } from './categories';
import type {
  CampusCategoryFilter, SituationKey, FacilityType, FacilityGroupKey, FacilityStatus,
} from './campusFacilities';

type CampusDict = {
  title: string;
  school: string;
  homeSub: string;
  mainSub: string;
  viewAll: string;
  searchPh: string;
  clearSearch: string;
  back: string;
  homeCards: { facility: [string, string]; library: [string, string]; shuttle: [string, string]; map: [string, string] };
  categories: Record<CampusCategoryFilter, string>;
  facilityGroups: Record<FacilityGroupKey, string>;
  popularTitle: string;
  needTitle: string;
  needSub: string;
  situations: Record<SituationKey, string>;
  types: Record<FacilityType, string>;
  resultsFor: string;
  searchResults: string;
  noResults: string;
  noResultsSub: string;
  resetFilter: string;
  badgeOfficial: string;
  badgeTip: string;
  badgePending: string;
  tipNote: string;
  statusOpen: string;
  statusClosingSoon: string;
  statusClosed: string;
  open24h: string;
  detailTitle: string;
  infoHours: string;
  infoPhone: string;
  infoPrice: string;
  infoServices: string;
  infoNotes: string;
  call: string;
  locationGuide: string;
  copyLocation: string;
  copied: string;
  notFound: string;
  backToGuide: string;
  disclaimerTitle: string;
  disclaimer: string;
  lastUpdated: string;
};

export const CAMPUS_T: Record<UILang, CampusDict> = {
  ko: {
    title: '캠퍼스 가이드',
    school: '부산외국어대학교',
    homeSub: '학교생활에 필요한 정보를 빠르게 찾아보세요.',
    mainSub: '부산외대 생활에 필요한 정보를 빠르게 찾아보세요.',
    viewAll: '전체보기 ›',
    searchPh: '시설, 장소, 서비스를 검색해보세요',
    clearSearch: '검색어 지우기',
    back: '뒤로가기',
    homeCards: {
      facility: ['교내시설', '운영시간 안내'],
      library:  ['도서관', '이용시간·열람실'],
      shuttle:  ['셔틀버스', '노선·시간표'],
      map:      ['캠퍼스맵', '건물 위치 안내'],
    },
    categories: {
      all: '전체', facility: '교내시설', food: '식당·카페', study: '도서관·공부',
      transport: '이동·교통', convenience: '편의시설', health: '건강·안전', tips: '학교 꿀팁',
    },
    facilityGroups: { all: '전체', store: '편의점', food: '식당·카페', books: '서점·문구', other: '기타' },
    popularTitle: '지금 많이 찾는 정보',
    needTitle: '학교에서 뭐가 필요하세요? 😊',
    needSub: '원하는 상황을 선택하면 관련 정보를 보여드려요.',
    situations: {
      print: '출력하고 싶어요', eat: '밥 먹고 싶어요', rest: '쉬고 싶어요', study: '공부하고 싶어요',
      move: '이동하고 싶어요', sick: '아파요', buy: '물건을 사고 싶어요', etc: '기타',
    },
    types: {
      'convenience-store': '편의점', cafe: '카페', restaurant: '식당', bookstore: '서점',
      'print-shop': '프린트·인쇄', 'post-office': '우체국', stationery: '문구점', 'photo-studio': '사진관',
      'travel-agency': '여행사', 'real-estate': '부동산', 'student-room': '학생 공간', lounge: '휴게실',
      'study-room': '열람실', clinic: '의원', shower: '샤워실', elevator: '엘리베이터',
      'lost-found': '분실물', contact: '학교 문의', library: '도서관', shuttle: '셔틀버스', 'campus-map': '캠퍼스맵',
    },
    resultsFor: '관련 정보',
    searchResults: '검색 결과',
    noResults: '찾는 정보가 없어요',
    noResultsSub: '다른 검색어나 카테고리로 찾아보세요.',
    resetFilter: '필터 초기화',
    badgeOfficial: '공식 정보',
    badgeTip: '학생 팁',
    badgePending: '준비 중',
    tipNote: '학생 제보 기반 정보이며 실제 운영 상황과 다를 수 있습니다.',
    statusOpen: '영업 중',
    statusClosingSoon: '곧 마감',
    statusClosed: '영업 종료',
    open24h: '24시간 운영',
    detailTitle: '시설 상세',
    infoHours: '운영시간',
    infoPhone: '전화번호',
    infoPrice: '가격',
    infoServices: '제공 서비스',
    infoNotes: '주의사항',
    call: '전화하기',
    locationGuide: '위치 안내',
    copyLocation: '위치 복사',
    copied: '복사됨',
    notFound: '정보를 찾을 수 없어요',
    backToGuide: '캠퍼스 가이드로 돌아가기',
    disclaimerTitle: '학생 제보 기반 정보',
    disclaimer: '일부 정보는 학생들의 경험을 바탕으로 작성되었습니다. 실제 운영 상황과 다를 수 있으니 중요한 사항은 학교에 직접 확인해주세요.',
    lastUpdated: '마지막 업데이트',
  },
  en: {
    title: 'Campus Guide',
    school: 'Busan University of Foreign Studies',
    homeSub: 'Quickly find what you need for campus life.',
    mainSub: 'Quickly find what you need for life at BUFS.',
    viewAll: 'View all ›',
    searchPh: 'Search facilities, places, services',
    clearSearch: 'Clear search',
    back: 'Back',
    homeCards: {
      facility: ['Facilities', 'Opening hours'],
      library:  ['Library', 'Hours · reading rooms'],
      shuttle:  ['Shuttle bus', 'Routes · timetable'],
      map:      ['Campus map', 'Find buildings'],
    },
    categories: {
      all: 'All', facility: 'Facilities', food: 'Food & cafés', study: 'Library & study',
      transport: 'Getting around', convenience: 'Amenities', health: 'Health & safety', tips: 'Campus tips',
    },
    facilityGroups: { all: 'All', store: 'Convenience stores', food: 'Food & cafés', books: 'Books & stationery', other: 'Other' },
    popularTitle: 'Popular right now',
    needTitle: 'What do you need on campus? 😊',
    needSub: 'Pick a situation and we’ll show you what helps.',
    situations: {
      print: 'I need to print', eat: 'I want to eat', rest: 'I want to rest', study: 'I want to study',
      move: 'I need to get around', sick: 'I feel sick', buy: 'I need to buy something', etc: 'Other',
    },
    types: {
      'convenience-store': 'Convenience store', cafe: 'Café', restaurant: 'Cafeteria', bookstore: 'Bookstore',
      'print-shop': 'Print shop', 'post-office': 'Post office', stationery: 'Stationery', 'photo-studio': 'Photo studio',
      'travel-agency': 'Travel agency', 'real-estate': 'Real estate', 'student-room': 'Student room', lounge: 'Lounge',
      'study-room': 'Reading room', clinic: 'Clinic', shower: 'Shower room', elevator: 'Elevator',
      'lost-found': 'Lost & found', contact: 'School contact', library: 'Library', shuttle: 'Shuttle bus', 'campus-map': 'Campus map',
    },
    resultsFor: 'Related info',
    searchResults: 'Search results',
    noResults: 'Nothing found',
    noResultsSub: 'Try another keyword or category.',
    resetFilter: 'Reset filters',
    badgeOfficial: 'Official',
    badgeTip: 'Student tip',
    badgePending: 'Coming soon',
    tipNote: 'Based on student reports; actual operation may differ.',
    statusOpen: 'Open',
    statusClosingSoon: 'Closing soon',
    statusClosed: 'Closed',
    open24h: 'Open 24 hours',
    detailTitle: 'Facility details',
    infoHours: 'Hours',
    infoPhone: 'Phone',
    infoPrice: 'Price',
    infoServices: 'Services',
    infoNotes: 'Good to know',
    call: 'Call',
    locationGuide: 'Location',
    copyLocation: 'Copy location',
    copied: 'Copied',
    notFound: 'We couldn’t find this page',
    backToGuide: 'Back to Campus Guide',
    disclaimerTitle: 'Based on student reports',
    disclaimer: 'Some information is based on students’ experiences and may differ from actual operation. Please check important details directly with the school.',
    lastUpdated: 'Last updated',
  },
  zh: {
    title: '校园指南',
    school: '釜山外国语大学',
    homeSub: '快速找到校园生活所需的信息。',
    mainSub: '快速找到釜山外大生活所需的信息。',
    viewAll: '查看全部 ›',
    searchPh: '搜索设施、地点、服务',
    clearSearch: '清除搜索',
    back: '返回',
    homeCards: {
      facility: ['校内设施', '营业时间'],
      library:  ['图书馆', '开放时间·阅览室'],
      shuttle:  ['校车', '路线·时刻表'],
      map:      ['校园地图', '建筑位置'],
    },
    categories: {
      all: '全部', facility: '校内设施', food: '食堂·咖啡', study: '图书馆·学习',
      transport: '出行·交通', convenience: '便利设施', health: '健康·安全', tips: '校园小贴士',
    },
    facilityGroups: { all: '全部', store: '便利店', food: '食堂·咖啡', books: '书店·文具', other: '其他' },
    popularTitle: '大家都在找',
    needTitle: '在学校需要什么?😊',
    needSub: '选择你的情况,为你显示相关信息。',
    situations: {
      print: '想打印', eat: '想吃饭', rest: '想休息', study: '想学习',
      move: '想出行', sick: '不舒服', buy: '想买东西', etc: '其他',
    },
    types: {
      'convenience-store': '便利店', cafe: '咖啡店', restaurant: '食堂', bookstore: '书店',
      'print-shop': '打印·印刷', 'post-office': '邮局', stationery: '文具店', 'photo-studio': '照相馆',
      'travel-agency': '旅行社', 'real-estate': '房产中介', 'student-room': '学生空间', lounge: '休息室',
      'study-room': '阅览室', clinic: '诊所', shower: '淋浴室', elevator: '电梯',
      'lost-found': '失物招领', contact: '学校咨询', library: '图书馆', shuttle: '校车', 'campus-map': '校园地图',
    },
    resultsFor: '相关信息',
    searchResults: '搜索结果',
    noResults: '没有找到相关信息',
    noResultsSub: '试试其他关键词或分类。',
    resetFilter: '重置筛选',
    badgeOfficial: '官方信息',
    badgeTip: '学生贴士',
    badgePending: '准备中',
    tipNote: '此信息来自学生反馈,可能与实际运营情况不同。',
    statusOpen: '营业中',
    statusClosingSoon: '即将关门',
    statusClosed: '已关门',
    open24h: '24小时营业',
    detailTitle: '设施详情',
    infoHours: '营业时间',
    infoPhone: '电话',
    infoPrice: '价格',
    infoServices: '提供的服务',
    infoNotes: '注意事项',
    call: '拨打电话',
    locationGuide: '位置指引',
    copyLocation: '复制位置',
    copied: '已复制',
    notFound: '找不到该信息',
    backToGuide: '返回校园指南',
    disclaimerTitle: '基于学生反馈的信息',
    disclaimer: '部分信息根据学生的经验编写,可能与实际运营情况不同,重要事项请直接向学校确认。',
    lastUpdated: '最后更新',
  },
  ja: {
    title: 'キャンパスガイド',
    school: '釜山外国語大学',
    homeSub: '学校生活に必要な情報をすばやく探せます。',
    mainSub: '釜山外大での生活に必要な情報をすばやく探せます。',
    viewAll: 'すべて見る ›',
    searchPh: '施設・場所・サービスを検索',
    clearSearch: '検索語を消す',
    back: '戻る',
    homeCards: {
      facility: ['学内施設', '営業時間の案内'],
      library:  ['図書館', '利用時間・閲覧室'],
      shuttle:  ['シャトルバス', '路線・時刻表'],
      map:      ['キャンパスマップ', '建物の位置'],
    },
    categories: {
      all: 'すべて', facility: '学内施設', food: '食堂・カフェ', study: '図書館・勉強',
      transport: '移動・交通', convenience: '便利施設', health: '健康・安全', tips: '学校のコツ',
    },
    facilityGroups: { all: 'すべて', store: 'コンビニ', food: '食堂・カフェ', books: '書店・文具', other: 'その他' },
    popularTitle: 'いまよく見られている情報',
    needTitle: '学校で何が必要ですか?😊',
    needSub: '状況を選ぶと、関連する情報を表示します。',
    situations: {
      print: '印刷したい', eat: 'ごはんを食べたい', rest: '休みたい', study: '勉強したい',
      move: '移動したい', sick: '具合が悪い', buy: '買い物をしたい', etc: 'その他',
    },
    types: {
      'convenience-store': 'コンビニ', cafe: 'カフェ', restaurant: '食堂', bookstore: '書店',
      'print-shop': 'プリント・印刷', 'post-office': '郵便局', stationery: '文具店', 'photo-studio': '写真館',
      'travel-agency': '旅行会社', 'real-estate': '不動産', 'student-room': '学生スペース', lounge: '休憩室',
      'study-room': '閲覧室', clinic: '医院', shower: 'シャワー室', elevator: 'エレベーター',
      'lost-found': '落とし物', contact: '学校への問い合わせ', library: '図書館', shuttle: 'シャトルバス', 'campus-map': 'キャンパスマップ',
    },
    resultsFor: '関連情報',
    searchResults: '検索結果',
    noResults: '情報が見つかりません',
    noResultsSub: '別のキーワードやカテゴリーで探してみてください。',
    resetFilter: 'フィルターをリセット',
    badgeOfficial: '公式情報',
    badgeTip: '学生のヒント',
    badgePending: '準備中',
    tipNote: '学生からの情報に基づいており、実際の運営状況と異なる場合があります。',
    statusOpen: '営業中',
    statusClosingSoon: 'まもなく終了',
    statusClosed: '営業終了',
    open24h: '24時間営業',
    detailTitle: '施設の詳細',
    infoHours: '営業時間',
    infoPhone: '電話番号',
    infoPrice: '料金',
    infoServices: '提供サービス',
    infoNotes: '注意事項',
    call: '電話する',
    locationGuide: '場所の案内',
    copyLocation: '場所をコピー',
    copied: 'コピーしました',
    notFound: '情報が見つかりません',
    backToGuide: 'キャンパスガイドに戻る',
    disclaimerTitle: '学生の情報に基づく内容',
    disclaimer: '一部の情報は学生の経験をもとに作成されています。実際の運営状況と異なる場合があるため、重要な事項は学校に直接ご確認ください。',
    lastUpdated: '最終更新',
  },
};

/** '영업 중 · 17:00에 마감' 형태의 상태 문구 */
export function statusText(status: FacilityStatus, lang: UILang, withCloseTime = false): string {
  const t = CAMPUS_T[lang];
  const base = status.state === 'open' ? t.statusOpen
    : status.state === 'closing-soon' ? t.statusClosingSoon
    : t.statusClosed;
  if (!withCloseTime || status.state === 'closed') return base;
  if (!status.closesAt) return `${base} · ${t.open24h}`;
  switch (lang) {
    case 'en': return `${base} · closes ${status.closesAt}`;
    case 'zh': return `${base} · ${status.closesAt}关门`;
    case 'ja': return `${base} · ${status.closesAt}まで`;
    default:   return `${base} · ${status.closesAt}에 마감`;
  }
}
