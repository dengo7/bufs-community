// 캠퍼스 가이드 데이터 · 도메인 로직
// - React/아이콘 컴포넌트에 의존하지 않는 순수 데이터로 유지한다 (추후 Supabase 테이블로 옮기기 쉽게).
// - 아이콘은 lucide 이름 문자열로만 저장하고, 실제 컴포넌트 매핑은 components/campus/FacilityThumb.tsx 에 둔다.
import type { UILang } from './categories';
import { FACILITY_TRANSLATIONS } from './campusFacilityTranslations';

// ── 분류 ──────────────────────────────────────────────────────
export type CampusCategoryKey =
  | 'facility'      // 교내시설
  | 'food'          // 식당·카페
  | 'study'         // 도서관·공부
  | 'transport'     // 이동·교통
  | 'convenience'   // 편의시설
  | 'health'        // 건강·안전
  | 'tips';         // 학교 꿀팁 (학교생활)

export type CampusCategoryFilter = 'all' | CampusCategoryKey;

export type SituationKey = 'print' | 'eat' | 'rest' | 'study' | 'move' | 'sick' | 'buy' | 'etc';

export type FacilityType =
  | 'convenience-store' | 'cafe' | 'restaurant' | 'bookstore' | 'print-shop' | 'post-office'
  | 'stationery' | 'photo-studio' | 'travel-agency' | 'real-estate'
  | 'student-room' | 'lounge' | 'study-room' | 'clinic' | 'shower' | 'elevator'
  | 'lost-found' | 'contact' | 'library' | 'shuttle' | 'campus-map';

export type SourceType = 'official' | 'student-tip';

export type CampusIconName =
  | 'Store' | 'Coffee' | 'Utensils' | 'BookOpen' | 'Printer' | 'Mail' | 'PenTool' | 'Camera'
  | 'Plane' | 'House' | 'Phone' | 'ArrowUpDown' | 'Search' | 'Sofa' | 'Cross' | 'ShowerHead'
  | 'PackageOpen' | 'Bus' | 'MapPinned' | 'Library';

// ── 운영시간 ──────────────────────────────────────────────────
/** days: 1~7 = 월~일, open/close: 'HH:MM' (자정까지는 '24:00') */
export type HoursRule = { days: number[]; open: string; close: string };

export type FacilityHours = {
  /** 화면에 그대로 보여 줄 안내 문구 (여러 줄 가능) */
  text: string[];
  /** 운영 상태 계산용. 비어 있으면 상태를 표시하지 않는다 */
  rules: HoursRule[];
};

// ── 시설/팁 레코드 ────────────────────────────────────────────
/** 번역 가능한 콘텐츠 필드 (현재는 한국어만 채워져 있음) */
export type FacilityContent = {
  title: string;
  location: string | null;
  locations: string[];
  /** 건물 표기. translations 에 없으면 localizePlace 규칙으로 변환된다 */
  building: string | null;
  description: string | null;
  services: string[];
  notes: string | null;
  price: string | null;
  /** 비워 두면 localizeHoursLine 규칙으로 변환된다 */
  hoursText: string[] | null;
};

export type CampusFacility = {
  id: string;
  title: string;
  category: CampusCategoryKey;
  /** 주 카테고리 외에 함께 노출할 카테고리 */
  extraCategories: CampusCategoryKey[];
  type: FacilityType;
  situations: SituationKey[];
  /** 카드·검색용 한 줄 요약 */
  location: string | null;
  /** 상세 "위치 안내"에 한 줄씩 보여 줄 위치 목록. 비워 두면 location 한 줄로 대체된다 */
  locations: string[];
  building: string | null;
  room: string | null;
  hours: FacilityHours | null;
  phone: string | null;
  price: string | null;
  description: string | null;
  services: string[];
  notes: string | null;
  sourceType: SourceType;
  /** 아직 내용을 확보하지 못한 항목 (출처 배지 대신 '준비 중' 표시) */
  pending: boolean;
  lastVerified: string;   // 'YYYY-MM'
  /** 실제 사진 경로. 지금은 전부 null → 카테고리별 파스텔 + 아이콘 placeholder 로 대체 */
  image: string | null;
  icon: CampusIconName;
  /** 검색 보조 키워드 (다국어 혼용 가능) */
  keywords: string[];
  /** ko 외 언어 콘텐츠 (campusFacilityTranslations.ts 에서 합쳐짐). 비어 있는 필드는 한국어로 대체된다 */
  translations: Partial<Record<Exclude<UILang, 'ko'>, Partial<FacilityContent>>>;
};

export const CAMPUS_LAST_UPDATED = '2026.09';

const WEEKDAYS = [1, 2, 3, 4, 5];
const EVERYDAY = [1, 2, 3, 4, 5, 6, 7];
const ALL_DAY: HoursRule[] = [{ days: EVERYDAY, open: '00:00', close: '24:00' }];

type Seed = Pick<CampusFacility, 'id' | 'title' | 'category' | 'type' | 'sourceType' | 'icon'> & Partial<CampusFacility>;

const make = (seed: Seed): CampusFacility => ({
  extraCategories: [],
  situations: [],
  location: null,
  locations: seed.locations ?? (seed.location ? [seed.location] : []),
  building: null,
  room: null,
  hours: null,
  phone: null,
  price: null,
  description: null,
  services: [],
  notes: null,
  pending: false,
  lastVerified: '2026-09',
  image: null,
  keywords: [],
  translations: {},
  ...seed,
});

// ── 학생 팁 (학생 제보 기반) ──────────────────────────────────
const STUDENT_TIPS: CampusFacility[] = [
  make({
    id: 'tip-free-print', title: '무료로 프린트하고 싶어요', category: 'convenience', type: 'student-room',
    sourceType: 'student-tip', icon: 'Printer', situations: ['print'],
    location: '학생회실 · 체육관 아래 1층', building: 'B동(체육관)',
    description: '학생회실에서 무료로 프린트할 수 있어요.',
    keywords: ['프린트', '인쇄', '출력', 'print', 'printer', '打印', '印刷'],
  }),
  make({
    id: 'tip-contact-school', title: '학교에 문의하고 싶어요', category: 'tips', type: 'contact',
    sourceType: 'official', icon: 'Phone', situations: ['etc'],
    phone: '051-509-5000',
    description: '수강신청, 수강정정, 장학금, 주차 등 각종 문의는 학교 대표번호로 전화하세요.',
    services: ['수강신청', '수강정정', '장학금', '주차'],
    keywords: ['문의', '전화', '대표번호', 'contact', 'phone', '咨询', '問い合わせ'],
  }),
  make({
    id: 'tip-elevator', title: '엘리베이터를 찾고 있어요', category: 'transport', type: 'elevator',
    sourceType: 'student-tip', icon: 'ArrowUpDown', situations: ['move'],
    location: '정류장 근처 지하주차장 맞은편 / G·I동 입구 계단 옆',
    locations: ['정류장 근처 지하주차장 맞은편', 'G·I동 입구 계단 옆 (건물 양쪽)'],
    description: '정류장 근처 지하주차장 맞은편에 엘리베이터가 있어요. G·I동은 입구 계단 옆, 건물 양쪽에 엘리베이터가 있어요.',
    keywords: ['엘리베이터', '승강기', 'elevator', 'lift', '电梯', 'エレベーター'],
  }),
  make({
    id: 'tip-lost-found', title: '분실물을 찾고 있어요', category: 'convenience', type: 'lost-found',
    sourceType: 'student-tip', icon: 'Search', situations: ['etc'],
    location: '학생회실 · 체육관 아래', building: 'B동(체육관)',
    description: '잃어버린 물건은 학생회실에 먼저 문의해 보세요.',
    keywords: ['분실물', '잃어버린', 'lost', 'found', '失物', '落とし物'],
  }),
  make({
    id: 'tip-rest', title: '잠깐 쉬고 싶어요', category: 'convenience', type: 'lounge',
    sourceType: 'student-tip', icon: 'Sofa', situations: ['rest'],
    location: 'D동 휴게실 · 도서관 휴게실',
    locations: ['D동 휴게실', '도서관 휴게실'],
    description: 'D동 휴게실은 선착순이고, 도서관 휴게실은 어플로 자리를 잡아야 해요.',
    keywords: ['휴게실', '쉬는', '라운지', 'rest', 'lounge', '休息', '休憩'],
  }),
  make({
    id: 'tip-quiet-study', title: '조용한 곳에서 공부하고 싶어요', category: 'study', type: 'study-room',
    sourceType: 'student-tip', icon: 'BookOpen', situations: ['study'],
    location: 'F동 2층 · 도서관 4층 열람실',
    locations: ['F동 2층', '도서관 4층 열람실'],
    description: 'F동 2층과 도서관 4층 열람실이 조용히 공부하기 좋아요.',
    keywords: ['열람실', '공부', '자습', 'study', 'reading room', '自习', '自習'],
  }),
  make({
    id: 'tip-clinic', title: '아프거나 약이 필요해요', category: 'health', type: 'clinic',
    sourceType: 'student-tip', icon: 'Cross', situations: ['sick'],
    location: 'D560-1 보아스의원', building: 'D동', room: 'D560-1',
    description: 'D동 보아스의원에서 진료를 받을 수 있어요.',
    keywords: ['병원', '의원', '약', '아파요', 'clinic', 'doctor', 'medicine', '医院', '病院'],
  }),
  make({
    id: 'tip-shower', title: '샤워하고 싶어요', category: 'convenience', type: 'shower',
    sourceType: 'student-tip', icon: 'ShowerHead', situations: ['rest'],
    location: 'B동(체육관 건물) 3층', building: 'B동(체육관)',
    description: 'B동 3층에 무료 샤워실이 있어요.',
    price: '무료',
    keywords: ['샤워', '샤워실', 'shower', '淋浴', 'シャワー'],
  }),
  make({
    id: 'room-business', title: '상경대실', category: 'convenience', extraCategories: ['health'], type: 'student-room',
    sourceType: 'student-tip', icon: 'PackageOpen', situations: ['print', 'sick'],
    location: 'B118', building: 'B동', room: 'B118',
    hours: { text: ['09:00~17:00'], rules: [{ days: WEEKDAYS, open: '09:00', close: '17:00' }] },
    description: '필요한 물품을 빌리거나 이용할 수 있는 학생 공간이에요.',
    services: ['컬러인쇄', '커피머신', '정수기', '전자레인지', '커피포트', '냉장고', '보조배터리', '여성용품', '상비약', '포인터', '우산', '충전기'],
    keywords: ['대여', '우산', '충전기', '보조배터리', '전자레인지', 'umbrella', 'charger', 'microwave'],
  }),
  make({
    id: 'room-asia', title: '아시아실', category: 'convenience', extraCategories: ['health'], type: 'student-room',
    sourceType: 'student-tip', icon: 'PackageOpen', situations: ['print', 'sick'],
    location: 'B116', building: 'B동', room: 'B116',
    hours: { text: ['09:00~17:00'], rules: [{ days: WEEKDAYS, open: '09:00', close: '17:00' }] },
    description: '필요한 물품을 빌리거나 이용할 수 있는 학생 공간이에요.',
    services: ['손 코팅 필름', 'A4 복사 용지', '포스트잇', '보조배터리', 'USB 허브', '상비약'],
    keywords: ['대여', '복사용지', '보조배터리', 'usb', 'paper'],
  }),
];

// ── 공식 교내시설 (학교 복지매장 안내 기반) ───────────────────
const CU_PHONE = '010-4917-7474';

const OFFICIAL_FACILITIES: CampusFacility[] = [
  make({
    id: 'cu-d', title: 'CU (D동)', category: 'facility', extraCategories: ['convenience'], type: 'convenience-store',
    sourceType: 'official', icon: 'Store', situations: ['eat', 'buy'],
    location: 'D113', building: 'D동', room: 'D113', phone: CU_PHONE,
    hours: { text: ['월~금 08:00~18:00'], rules: [{ days: WEEKDAYS, open: '08:00', close: '18:00' }] },
    description: '편의점 물품 판매', services: ['음료', '간식', '생활용품'],
    keywords: ['편의점', 'convenience store', '便利店', 'コンビニ'],
  }),
  make({
    id: 'cu-ig', title: 'CU (I동·G동)', category: 'facility', extraCategories: ['convenience'], type: 'convenience-store',
    sourceType: 'official', icon: 'Store', situations: ['eat', 'buy'],
    location: 'G101', building: 'G동', room: 'G101', phone: CU_PHONE,
    hours: { text: ['월~일 24시간'], rules: ALL_DAY },
    description: '편의점 물품 판매', services: ['음료', '간식', '생활용품'],
    keywords: ['편의점', '24시간', 'convenience store', '便利店', 'コンビニ'],
  }),
  make({
    id: 'cu-a', title: 'CU (A동)', category: 'facility', extraCategories: ['convenience'], type: 'convenience-store',
    sourceType: 'official', icon: 'Store', situations: ['eat', 'buy'],
    location: 'A126', building: 'A동', room: 'A126', phone: CU_PHONE,
    hours: { text: ['월~일 24시간'], rules: ALL_DAY },
    description: '편의점 물품 판매', services: ['음료', '간식', '생활용품'],
    keywords: ['편의점', '24시간', 'convenience store', '便利店', 'コンビニ'],
  }),
  make({
    id: 'cu-dorm', title: 'CU 기숙사점', category: 'facility', extraCategories: ['convenience'], type: 'convenience-store',
    sourceType: 'official', icon: 'Store', situations: ['eat', 'buy'],
    location: '기숙사', building: '기숙사',
    hours: { text: ['월~일 24시간'], rules: ALL_DAY },
    description: '편의점 물품 판매', notes: '기숙사생만 이용할 수 있어요.',
    keywords: ['편의점', '기숙사', '24시간', 'dormitory', 'convenience store', '便利店', 'コンビニ'],
  }),
  make({
    id: 'cafe-blueport-library', title: '카페 블루포트 도서관점', category: 'facility', extraCategories: ['food'], type: 'cafe',
    sourceType: 'official', icon: 'Coffee', situations: ['eat', 'rest'],
    location: '도서관', building: '도서관',
    hours: {
      text: ['월~목 09:00~19:00', '금 09:00~18:00', '토 11:00~16:00'],
      rules: [
        { days: [1, 2, 3, 4], open: '09:00', close: '19:00' },
        { days: [5], open: '09:00', close: '18:00' },
        { days: [6], open: '11:00', close: '16:00' },
      ],
    },
    description: '음료 및 디저트 판매',
    keywords: ['카페', '커피', 'cafe', 'coffee', '咖啡', 'カフェ'],
  }),
  make({
    id: 'cafe-blueport-global', title: '카페 블루포트 글로벌센터점', category: 'facility', extraCategories: ['food'], type: 'cafe',
    sourceType: 'official', icon: 'Coffee', situations: ['eat', 'rest'],
    location: 'A동', building: 'A동',
    hours: {
      text: ['월~목 09:00~18:00', '금 09:00~17:00'],
      rules: [
        { days: [1, 2, 3, 4], open: '09:00', close: '18:00' },
        { days: [5], open: '09:00', close: '17:00' },
      ],
    },
    description: '음료 및 디저트 판매',
    keywords: ['카페', '커피', 'cafe', 'coffee', '咖啡', 'カフェ'],
  }),
  make({
    id: 'ourhome-student', title: '아워홈 학생식당', category: 'facility', extraCategories: ['food'], type: 'restaurant',
    sourceType: 'official', icon: 'Utensils', situations: ['eat'],
    location: 'E동', building: 'E동', price: '식권 5,500원',
    hours: {
      text: ['월~금 조식 08:00~09:00', '월~금 중식 10:30~18:00 (금요일은 15:00까지)'],
      rules: [
        { days: WEEKDAYS, open: '08:00', close: '09:00' },
        { days: [1, 2, 3, 4], open: '10:30', close: '18:00' },
        { days: [5], open: '10:30', close: '15:00' },
      ],
    },
    description: '학생식당 (조식·중식)',
    keywords: ['학식', '학생식당', '밥', 'cafeteria', 'meal', '食堂', '学食'],
  }),
  make({
    id: 'ourhome-staff', title: '아워홈 교직원식당', category: 'facility', extraCategories: ['food'], type: 'restaurant',
    sourceType: 'official', icon: 'Utensils', situations: ['eat'],
    location: 'I동 3층', building: 'I동',
    hours: { text: ['월~금 중식 11:30~13:30'], rules: [{ days: WEEKDAYS, open: '11:30', close: '13:30' }] },
    description: '교직원식당 (중식)',
    keywords: ['식당', '밥', 'cafeteria', 'meal', '食堂'],
  }),
  make({
    id: 'ourhome-dorm', title: '아워홈 기숙사식당', category: 'facility', extraCategories: ['food'], type: 'restaurant',
    sourceType: 'official', icon: 'Utensils', situations: ['eat'],
    location: '기숙사 지하', building: '기숙사', phone: '010-2845-6070',
    hours: {
      text: [
        '평일 조식 07:30~09:00 · 중식 11:30~13:30 · 석식 17:30~19:00',
        '주말 조식 08:00~09:00 · 중식 12:00~13:00 · 석식 18:00~19:00',
      ],
      rules: [
        { days: WEEKDAYS, open: '07:30', close: '09:00' },
        { days: WEEKDAYS, open: '11:30', close: '13:30' },
        { days: WEEKDAYS, open: '17:30', close: '19:00' },
        { days: [6, 7], open: '08:00', close: '09:00' },
        { days: [6, 7], open: '12:00', close: '13:00' },
        { days: [6, 7], open: '18:00', close: '19:00' },
      ],
    },
    description: '기숙사식당 (조식·중식·석식)',
    keywords: ['기숙사', '식당', '밥', 'dormitory', 'cafeteria', '食堂'],
  }),
  make({
    id: 'bookstore', title: '부산외대 구내서점', category: 'facility', extraCategories: ['convenience', 'study'], type: 'bookstore',
    sourceType: 'official', icon: 'BookOpen', situations: ['buy', 'study'],
    location: 'A119', building: 'A동', room: 'A119', phone: '051-509-6833',
    hours: { text: ['월~금 09:00~17:00'], rules: [{ days: WEEKDAYS, open: '09:00', close: '17:00' }] },
    description: '도서 및 학습용품 판매',
    keywords: ['서점', '교재', '책', 'bookstore', 'textbook', '书店', '書店'],
  }),
  make({
    id: 'print-center', title: '꿈키움 출력센터', category: 'facility', extraCategories: ['convenience'], type: 'print-shop',
    sourceType: 'official', icon: 'Printer', situations: ['print'],
    location: 'A130', building: 'A동', room: 'A130', phone: '051-517-9848',
    hours: { text: ['월~금 09:00~18:00'], rules: [{ days: WEEKDAYS, open: '09:00', close: '18:00' }] },
    description: '프린트·인쇄',
    keywords: ['프린트', '인쇄', '출력', '복사', 'print', 'copy', '打印', '印刷'],
  }),
  make({
    id: 'post-office', title: '부산외대 우편취급국', category: 'facility', extraCategories: ['convenience'], type: 'post-office',
    sourceType: 'official', icon: 'Mail', situations: ['etc'],
    location: 'A118', building: 'A동', room: 'A118', phone: '051-583-6669',
    hours: {
      text: ['월~금 09:00~18:00', '휴게시간 12:00~13:00'],
      rules: [
        { days: WEEKDAYS, open: '09:00', close: '12:00' },
        { days: WEEKDAYS, open: '13:00', close: '18:00' },
      ],
    },
    description: '우편 발송',
    keywords: ['우체국', '우편', '택배', 'post office', 'mail', 'EMS', '邮局', '郵便局'],
  }),
  make({
    id: 'stationery-mbg', title: '문구점 MBG', category: 'facility', extraCategories: ['convenience'], type: 'stationery',
    sourceType: 'official', icon: 'PenTool', situations: ['buy', 'study'],
    location: 'A131', building: 'A동', room: 'A131', phone: '010-3245-6573',
    hours: { text: ['월~금 09:30~17:30'], rules: [{ days: WEEKDAYS, open: '09:30', close: '17:30' }] },
    description: '문구·사무용품 판매',
    keywords: ['문구', '펜', '노트', 'stationery', '文具'],
  }),
  make({
    id: 'photo-studio', title: '부산외대 사진관', category: 'facility', extraCategories: ['convenience'], type: 'photo-studio',
    sourceType: 'official', icon: 'Camera', situations: ['etc'],
    location: 'A128', building: 'A동', room: 'A128', phone: '051-631-0631',
    hours: { text: ['월~금 09:30~17:00'], rules: [{ days: WEEKDAYS, open: '09:30', close: '17:00' }] },
    description: '사진 촬영',
    keywords: ['사진', '증명사진', 'photo', 'ID photo', '照片', '写真'],
  }),
  make({
    id: 'hanatour', title: '하나투어 여행사', category: 'facility', type: 'travel-agency',
    sourceType: 'official', icon: 'Plane', situations: ['etc'],
    location: 'A127', building: 'A동', room: 'A127', phone: '051-518-7080',
    hours: { text: ['월~금 09:00~18:00'], rules: [{ days: WEEKDAYS, open: '09:00', close: '18:00' }] },
    description: '여행 상품 상담·예약',
    keywords: ['여행', '항공권', 'travel', 'flight', '旅行'],
  }),
  make({
    id: 'realestate-daeho', title: '대호공인중개사', category: 'facility', type: 'real-estate',
    sourceType: 'official', icon: 'House', situations: ['etc'],
    location: 'A120', building: 'A동', room: 'A120', phone: '010-9190-8295',
    hours: { text: ['월~금 10:00~17:00'], rules: [{ days: WEEKDAYS, open: '10:00', close: '17:00' }] },
    description: '방 구하기 상담',
    notes: '자리를 비우는 경우가 많아요. 방문 전에 꼭 전화로 확인하세요.',
    keywords: ['부동산', '원룸', '방', '집', 'real estate', 'housing', 'room', '房产', '不動産'],
  }),
];

// ── 준비 중 항목 (홈 바로가기·인기 정보에서 연결, 내용 확보 후 채울 것) ──
const PENDING_NOTE = '자세한 내용은 준비 중이에요. 급한 내용은 학교 대표번호(051-509-5000)로 문의해 주세요.';

const PENDING_ITEMS: CampusFacility[] = [
  make({
    id: 'library', title: '도서관 이용시간이 궁금해요', category: 'study', type: 'library',
    sourceType: 'official', icon: 'Library', situations: ['study'], pending: true,
    location: '중앙도서관', building: '도서관',
    description: '중앙도서관 · 열람실 정보', notes: PENDING_NOTE,
    keywords: ['도서관', '열람실', 'library', '图书馆', '図書館'],
  }),
  make({
    id: 'shuttle', title: '셔틀버스 시간표가 궁금해요', category: 'transport', type: 'shuttle',
    sourceType: 'official', icon: 'Bus', situations: ['move'], pending: true,
    description: '노선 · 승차장 안내', notes: PENDING_NOTE,
    keywords: ['셔틀', '버스', '시간표', 'shuttle', 'bus', '校车', 'シャトルバス'],
  }),
  make({
    id: 'campus-map', title: '캠퍼스맵', category: 'transport', type: 'campus-map',
    sourceType: 'official', icon: 'MapPinned', situations: ['move'], pending: true,
    description: '건물 위치 안내', notes: PENDING_NOTE,
    keywords: ['지도', '캠퍼스맵', '건물', 'map', 'campus map', '地图', 'マップ'],
  }),
];

export const CAMPUS_FACILITIES: CampusFacility[] = [...STUDENT_TIPS, ...OFFICIAL_FACILITIES, ...PENDING_ITEMS]
  .map(f => ({ ...f, translations: FACILITY_TRANSLATIONS[f.id] ?? f.translations }));

/** "지금 많이 찾는 정보" 노출 순서 */
export const POPULAR_IDS = ['tip-free-print', 'tip-rest', 'library', 'shuttle'];

// ── 화면 구성용 정의 ──────────────────────────────────────────
export const CAMPUS_CATEGORIES: CampusCategoryFilter[] =
  ['all', 'facility', 'food', 'study', 'transport', 'convenience', 'health', 'tips'];

export const SITUATIONS: SituationKey[] = ['print', 'eat', 'rest', 'study', 'move', 'sick', 'buy', 'etc'];

/** 교내시설 목록의 하위 필터 칩 */
export type FacilityGroupKey = 'all' | 'store' | 'food' | 'books' | 'other';
export const FACILITY_GROUPS: FacilityGroupKey[] = ['all', 'store', 'food', 'books', 'other'];

const FACILITY_GROUP_TYPES: Record<Exclude<FacilityGroupKey, 'all' | 'other'>, FacilityType[]> = {
  store: ['convenience-store'],
  food:  ['cafe', 'restaurant'],
  books: ['bookstore', 'stationery'],
};

export function inFacilityGroup(f: CampusFacility, group: FacilityGroupKey): boolean {
  if (group === 'all') return true;
  if (group === 'other') return !Object.values(FACILITY_GROUP_TYPES).some(types => types.includes(f.type));
  return FACILITY_GROUP_TYPES[group].includes(f.type);
}

export const isCategoryFilter = (v: string | null): v is CampusCategoryFilter =>
  !!v && (CAMPUS_CATEGORIES as string[]).includes(v);

export const isSituation = (v: string | null): v is SituationKey =>
  !!v && (SITUATIONS as string[]).includes(v);

// ── 조회 ──────────────────────────────────────────────────────
export const getFacilityById = (id: string) => CAMPUS_FACILITIES.find(f => f.id === id) ?? null;

export function inCategory(f: CampusFacility, category: CampusCategoryFilter): boolean {
  if (category === 'all') return true;
  // 학교 꿀팁 = 학교생활 항목 + 학생 제보 팁 전체
  if (category === 'tips') return f.category === 'tips' || f.sourceType === 'student-tip';
  return f.category === category || f.extraCategories.includes(category);
}

// ── 표기 규칙 변환 (번역 데이터가 없는 위치·운영시간용) ────────
type ForeignLang = Exclude<UILang, 'ko'>;

const PLACE_WORDS: [RegExp, Record<ForeignLang, string>][] = [
  [/중앙도서관/g, { en: 'Central Library', zh: '中央图书馆', ja: '中央図書館' }],
  [/도서관/g,     { en: 'Library',         zh: '图书馆',     ja: '図書館' }],
  [/기숙사/g,     { en: 'Dormitory',       zh: '宿舍',       ja: '寮' }],
  [/체육관/g,     { en: 'Gym',             zh: '体育馆',     ja: '体育館' }],
  [/지하/g,       { en: 'basement',        zh: '地下',       ja: '地下' }],
];

/** 'D동' → Bldg. D / D栋 / D棟, '3층' → 3F / 3楼 / 3階, 도서관·기숙사·체육관 등 공통 장소명 */
export function localizePlace(text: string, lang: UILang): string {
  if (lang === 'ko') return text;
  let out = text
    .replace(/([A-Z])동/g, (_, b: string) => (lang === 'en' ? `Bldg. ${b}` : lang === 'zh' ? `${b}栋` : `${b}棟`))
    .replace(/(\d+)층/g, (_, n: string) => (lang === 'en' ? `${n}F` : lang === 'zh' ? `${n}楼` : `${n}階`));
  for (const [pattern, words] of PLACE_WORDS) out = out.replace(pattern, words[lang]);
  // 영어는 괄호 앞을 띄운다: 'Bldg. B(Gym)' → 'Bldg. B (Gym)'
  if (lang === 'en') out = out.replace(/(\S)\(/g, '$1 (');
  return out;
}

const DAY_NAMES: Record<ForeignLang, Record<string, string>> = {
  en: { 월: 'Mon', 화: 'Tue', 수: 'Wed', 목: 'Thu', 금: 'Fri', 토: 'Sat', 일: 'Sun' },
  zh: { 월: '周一', 화: '周二', 수: '周三', 목: '周四', 금: '周五', 토: '周六', 일: '周日' },
  ja: { 월: '月', 화: '火', 수: '水', 목: '木', 금: '金', 토: '土', 일: '日' },
};

const HOURS_WORDS: [RegExp, Record<ForeignLang, string>][] = [
  [/\(금요일은 (\d{2}:\d{2})까지\)/g, { en: '(until $1 on Fri)', zh: '(周五至$1)', ja: '(金曜は$1まで)' }],
  [/24시간/g,   { en: '24 hours',  zh: '24小时',   ja: '24時間' }],
  [/휴게시간/g, { en: 'Break',     zh: '休息时间', ja: '休憩時間' }],
  [/평일/g,     { en: 'Weekdays',  zh: '工作日',   ja: '平日' }],
  [/주말/g,     { en: 'Weekends',  zh: '周末',     ja: '週末' }],
  [/조식/g,     { en: 'Breakfast', zh: '早餐',     ja: '朝食' }],
  [/중식/g,     { en: 'Lunch',     zh: '午餐',     ja: '昼食' }],
  [/석식/g,     { en: 'Dinner',    zh: '晚餐',     ja: '夕食' }],
];

/** 운영시간 문구의 요일('월~금', '금')·식사 구분·'24시간' 등을 표시 시점에 언어별로 변환한다 */
export function localizeHoursLine(line: string, lang: UILang): string {
  if (lang === 'ko') return line;
  const days = DAY_NAMES[lang];
  let out = line;
  for (const [pattern, words] of HOURS_WORDS) out = out.replace(pattern, words[lang]);
  out = out
    // 요일 범위: 월~금 → Mon–Fri / 周一至周五 / 月~金
    .replace(/([월화수목금토일])~([월화수목금토일])/g, (_, a: string, b: string) =>
      lang === 'en' ? `${days[a]}–${days[b]}` : lang === 'zh' ? `${days[a]}至${days[b]}` : `${days[a]}~${days[b]}`)
    // 줄 맨 앞의 단일 요일: '금 09:00' → 'Fri 09:00'
    .replace(/^([월화수목금토일])(?=\s)/, (_, d: string) => days[d]);
  // 영어는 시간 범위를 en dash 로
  if (lang === 'en') out = out.replace(/(\d{2}:\d{2})~(\d{2}:\d{2})/g, '$1–$2');
  return out;
}

/** 현재 언어의 콘텐츠. 번역이 있으면 쓰고, 없으면 표기 규칙 변환 → 그래도 없으면 한국어로 대체한다 */
export function localizeFacility(f: CampusFacility, lang: UILang): FacilityContent {
  if (lang === 'ko') {
    return {
      title: f.title,
      location: f.location,
      locations: f.locations,
      building: f.building,
      description: f.description,
      services: f.services,
      notes: f.notes,
      price: f.price,
      hoursText: f.hours?.text ?? null,
    };
  }

  const tr = f.translations[lang] ?? {};
  const location = tr.location ?? (f.location ? localizePlace(f.location, lang) : null);
  return {
    title: tr.title ?? f.title,
    location,
    // 위치가 한 곳뿐이면 location 번역을 그대로 쓴다
    locations: tr.locations
      ?? (f.locations.length === 1 && location ? [location] : f.locations.map(l => localizePlace(l, lang))),
    building: tr.building ?? (f.building ? localizePlace(f.building, lang) : null),
    description: tr.description ?? f.description,
    services: tr.services ?? f.services,
    notes: tr.notes ?? f.notes,
    price: tr.price ?? f.price,
    hoursText: tr.hoursText ?? f.hours?.text.map(line => localizeHoursLine(line, lang)) ?? null,
  };
}

const SEARCH_LANGS: UILang[] = ['ko', 'en', 'zh', 'ja'];

/**
 * 검색: 제목·위치·설명·서비스·주의사항·키워드 + 화면에 보이는 유형 라벨.
 * UI 언어와 상관없이 모든 언어의 콘텐츠를 대상으로 한다 (영어 UI 에서 'print', 한국어 UI 에서 '打印' 모두 검색됨).
 */
export function matchesQuery(f: CampusFacility, query: string, typeLabel: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const contents = SEARCH_LANGS.map(l => localizeFacility(f, l));
  const haystack = [
    ...contents.flatMap(c => [c.title, c.location, ...c.locations, c.building, c.description, c.notes, c.price, ...c.services, ...(c.hoursText ?? [])]),
    f.room, f.phone, typeLabel, ...f.keywords,
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every(word =>
    // 'Bldg. D' 의 'd' 같은 영숫자 한 글자는 독립된 토큰일 때만 일치로 본다 (아무 단어의 d 에 걸리지 않게)
    /^[a-z0-9]$/.test(word)
      ? new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`).test(haystack)
      : haystack.includes(word));
}

// ── 운영 상태 ─────────────────────────────────────────────────
export type FacilityStatus = {
  state: 'open' | 'closing-soon' | 'closed';
  /** 영업 중일 때 마감 시각 'HH:MM' (24시간 운영이면 null) */
  closesAt: string | null;
};

const CLOSING_SOON_MIN = 60;
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * 현재 시각(KST) 기준 운영 상태.
 * 요일별로 시간이 다른 경우(금요일 단축, 주말 시간, 점심 휴게 등)는 rules 를 나눠서 표현한다.
 * 운영시간 데이터가 없으면 null.
 */
export function getFacilityStatus(hours: FacilityHours | null, nowMs: number): FacilityStatus | null {
  if (!hours || !hours.rules.length) return null;

  const kst = new Date(nowMs + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay() || 7;   // 1~7 = 월~일
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();

  const current = hours.rules.find(r => r.days.includes(day) && toMin(r.open) <= min && min < toMin(r.close));
  if (!current) return { state: 'closed', closesAt: null };

  const close = toMin(current.close);
  if (close === 24 * 60) {
    // 자정을 넘어 다음 날 00:00 부터 이어서 여는 경우(24시간)는 마감으로 보지 않는다
    const nextDay = (day % 7) + 1;
    const continues = hours.rules.some(r => r.days.includes(nextDay) && toMin(r.open) === 0);
    if (continues) return { state: 'open', closesAt: null };
  }

  return {
    state: close - min <= CLOSING_SOON_MIN ? 'closing-soon' : 'open',
    closesAt: current.close,
  };
}
