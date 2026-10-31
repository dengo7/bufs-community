/**
 * 유학생 정착 체크리스트(/settle) 항목 데이터 — BUFS 기준
 *
 * ▸ 조사일 2026-10-20. 모든 사실에 출처 URL을 붙인다. 출처로 확인 못 한 값은 넣지 않는다.
 * ▸ confidence: high = 학교·정부 공식 페이지에서 직접 확인 / medium = 2차 자료·옛 공식 자료 / low = 미확인
 *   low인 항목·기관은 화면에 "확인 중"으로 표시하고, 기관의 전화·주소·운영시간을 가린다.
 * ▸ 학교마다 다른 절차를 확인하지 못했으면 askSchool로 "학교 국제교류 부서에 문의"만 안내한다.
 * ▸ zh/ja는 번역 전 — 비워 두면 en으로 보인다.
 */

/** zh/ja가 없으면 en으로 보여준다 */
export type Loc = { ko: string; en: string; zh?: string; ja?: string };
export type Confidence = 'high' | 'medium' | 'low';

export type SettleVisa = 'd2' | 'd4' | 'other';
export type SettleHousing = 'dorm' | 'solo';
export type SettleCategory = 'admin' | 'life' | 'academic';
/** /guides 카테고리 (category_guides.category_slug) */
export type SettleGuideSlug = 'housing' | 'bank' | 'telecom' | 'insurance' | 'visa' | 'part-time';

export type SettleSource = { label: Loc; url: string };

export type SettleOrg = {
  name: Loc;
  /** 대표 행동 버튼에 쓰는 짧은 이름 ("{short}에 전화") */
  short: Loc;
  phone?: string;
  address?: Loc;
  hours?: Loc;
  /** 기관 카드 아래 한 줄 안내 */
  note?: Loc;
  url?: string;
  /** 이 기관 정보(이름·번호·주소)를 확인한 공식 페이지 — 필수 */
  source: string;
  /** low면 전화·주소·운영시간을 "확인 중"으로 가린다 */
  confidence: Confidence;
};

export type SettleItem = {
  id: string;
  category: SettleCategory;
  priority: 'high' | 'mid' | 'low';
  /** arrival: 입국일 기준 / academic: 학사일정(수강신청) 기준 */
  timeAxis: 'arrival' | 'academic';
  /** 입국 후 며칠째부터 보일지 (academic은 무시) */
  showFrom: number;
  /** 며칠째까지 보일지. null = 계속 */
  showUntil: number | null;
  estimatedMinutes: number;
  showIf?: { visa?: SettleVisa[]; housing?: SettleHousing[] };
  /** 관련 /guides 카테고리 (없으면 가이드 링크를 숨긴다) */
  guideSlug?: SettleGuideSlug;
  name: Loc;
  summary: Loc;
  /** 법정 기한 (입국일 기준). penalty는 출처로 확인된 경우에만 */
  deadline?: { days: number; penalty?: Loc; lawRef: string; source: string };
  detail: {
    documents?: { name: Loc; note?: Loc; required?: boolean }[];
    steps?: Loc[];
    orgs?: SettleOrg[];
    /** amount null = 금액 미확인(표시 안 함) */
    cost?: { amount: number | null; note?: Loc; confidence: Confidence };
    links?: SettleSource[];
    cautions?: Loc[];
    /** 학교마다 다른 절차 — "학교 국제교류 부서에 문의" 안내를 띄운다 */
    askSchool?: boolean;
    sources: SettleSource[];
    confidence: Confidence;
  };
};

// ── 출처 ─────────────────────────────────────────────────────────────
export const SRC = {
  bufsArc: { label: { ko: 'BUFS 국제교류처 — 외국인등록(Residence Card)', en: 'BUFS Office of International Affairs — Residence Card' }, url: 'https://oiaglobal.bufs.ac.kr/arc' },
  bufsContact: { label: { ko: 'BUFS 국제교류처 — 연락처', en: 'BUFS Office of International Affairs — Contact us' }, url: 'https://oiaglobal.bufs.ac.kr/contact_us' },
  bufsBank: { label: { ko: 'BUFS 국제교류처 — 은행', en: 'BUFS Office of International Affairs — Bank' }, url: 'https://oiaglobal.bufs.ac.kr/bank' },
  bufsNh: { label: { ko: 'BUFS 국제교류처 — 국민건강보험', en: 'BUFS Office of International Affairs — National Health Insurance' }, url: 'https://oiaglobal.bufs.ac.kr/NH' },
  bufsIt: { label: { ko: 'BUFS 국제교류처 — IT 서비스', en: 'BUFS Office of International Affairs — IT services' }, url: 'https://oiaglobal.bufs.ac.kr/it' },
  bufsSugang: { label: { ko: 'BUFS 수강신청 사이트', en: 'BUFS course registration site' }, url: 'https://sugang.bufs.ac.kr' },
  bufsAcaNotice: { label: { ko: 'BUFS 학사공지 게시판', en: 'BUFS academic notices' }, url: 'https://www.bufs.ac.kr/bbs/board.php?bo_table=notice_aca' },
  mojArc: { label: { ko: '법무부 출입국·외국인정책본부 — 외국인등록 안내', en: 'Korea Immigration Service — Foreigner registration' }, url: 'https://www.immigration.go.kr/bbs/moj/93/559234/artclView.do' },
  busanImmigration: { label: { ko: '부산출입국·외국인청 — 관할구역·연락처', en: 'Busan Immigration Office — Jurisdiction and contact' }, url: 'https://www.immigration.go.kr/immigration/2058/subview.do' },
  nhisForeigner: { label: { ko: '국민건강보험공단 — 외국인 지역가입자 자격', en: 'NHIS — Health insurance for foreign residents' }, url: 'https://www.nhis.or.kr/nhis/policy/wbhada04900m01.do' },
  nhisEn: { label: { ko: '국민건강보험공단 (영문)', en: 'NHIS (English)' }, url: 'https://www.nhis.or.kr/english/wbheaa02900m01.do' },
  fscLimit: { label: { ko: '금융위원회 — 한도제한계좌 한도 상향 (2024.05.02)', en: 'Financial Services Commission — Higher limits on limited accounts (2024-05-02)' }, url: 'https://m.korea.kr/briefing/pressReleaseView.do?newsId=156628669' },
  partTime2023: { label: { ko: '정책브리핑 — 유학생 시간제취업 허용시간 확대 (2023.06.23)', en: 'Korea.kr — Expanded part-time work hours for students (2023-06-23)' }, url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148916751' },
  hikorea: { label: { ko: '하이코리아 (전자민원)', en: 'HiKorea (e-application)' }, url: 'https://www.hikorea.go.kr' },
  // 휴대폰 개통 (조사일 2026-10-20 — 통신사·정부 공식 페이지만)
  studyInKoreaLife: { label: { ko: 'Study in Korea(국립국제교육원) — 생활 정보: 휴대폰 개통', en: 'Study in Korea (NIIED) — Living in Korea: mobile phones' }, url: 'https://www.studyinkorea.go.kr/eng/life/livingAndHousing.do' },
  sktPrepaid: { label: { ko: 'SK텔레콤 — 선불(PPS) 요금제 안내 (영문)', en: 'SK Telecom — Prepaid (PPS) plans' }, url: 'https://www.tworld.co.kr/poc/eng/html/EN1.2T.html' },
  sktSwitch: { label: { ko: 'SK텔레콤 — 선후불 번호이동 FAQ', en: 'SK Telecom — Prepaid/postpaid switching FAQ' }, url: 'https://m.tworld.co.kr/customer/faq/view?faq_Id=1000059680' },
  sktCenter: { label: { ko: 'SK텔레콤 — 외국인 고객센터 안내 (영문)', en: 'SK Telecom — Customer center for foreigners' }, url: 'https://www.tworld.co.kr/poc/eng/html/EN4.1.html' },
  ktForeigner: { label: { ko: 'KT — 외국인 선불 요금제·외국인 전용 고객센터', en: 'KT — Prepaid plan for foreigners and foreigner customer center' }, url: 'https://product.kt.com/wDic/productDetail.do?ItemCode=1612' },
  lguKoreaSim: { label: { ko: 'LG U+ — Korea SIM (여행자 선불 SIM)', en: 'LG U+ — Korea SIM (prepaid SIM for visitors)' }, url: 'https://www.lguplus.com/korea-sim/eng/pc/product/simcard?tab=data-voice' },
  lguForeignerPlan: { label: { ko: 'LG U+ 뉴스룸 — 외국인 전용 요금제 (2025.07.23)', en: 'LG U+ Newsroom — Plans for foreigners (2025-07-23)' }, url: 'https://news.lguplus.com/19825' },
  ktmMobileFaq: { label: { ko: 'KT M모바일(알뜰폰) — 외국인 가입 FAQ', en: 'KT M Mobile (MVNO) — FAQ for foreigners' }, url: 'https://www.ktmmobile.com/cs/faqList.do?pageNo=1&searchNm=%EC%99%B8%EA%B5%AD%EC%9D%B8' },
  // 정착 가이드 맞춤 문장용 (lib/settleGuide.ts)
  nhisNotice: { label: { ko: '보건복지부고시 — 장기체류 재외국민 및 외국인 건강보험 적용기준', en: 'Ministry of Health and Welfare notice — Health insurance for long-term foreign residents' }, url: 'https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=41' },
  partTimePermit: { label: { ko: '성신여대 국제교류 공지 — 시간제취업 허가 (2026.03)', en: 'Sungshin Women\'s Univ. notice — Part-time work permission (2026-03)' }, url: 'https://sungshin.ac.kr/bbs/main_eng/4941/153101/artclView.do' },
  wellSchedule: { label: { ko: 'The Well 학사일정 (BUFS 학사일정)', en: 'The Well academic calendar (BUFS)' }, url: '/schedule' },
} satisfies Record<string, SettleSource>;

// ── 기관 — 항목마다 실제 담당 기관만. 같은 기관을 여러 항목에 반복하지 않는다 ──
const ORG = {
  oiaArc: {
    name: { ko: '부산외국어대학교 국제교류처 (외국인등록 단체접수)', en: 'BUFS Office of International Affairs (group filing for the Residence Card)' },
    short: { ko: '국제교류처', en: 'the international office' },
    phone: '051-509-5000',
    note: { ko: '학교 대표번호예요. 국가·지역별 담당자 번호는 연락처 페이지에서 확인하세요.', en: 'This is the main university number. Find the staff for your country or region on the contact page.' },
    url: 'https://oiaglobal.bufs.ac.kr/contact_us',
    source: 'https://oiaglobal.bufs.ac.kr/contact_us',
    confidence: 'high',
  },
  busanImmigration: {
    name: { ko: '부산출입국·외국인청', en: 'Busan Immigration Office' },
    short: { ko: '부산출입국·외국인청', en: 'Busan Immigration' },
    phone: '051-461-3126',
    address: { ko: '부산 중구 충장대로 22-1', en: '22-1 Chungjang-daero, Jung-gu, Busan' },
    url: 'https://www.immigration.go.kr/immigration/2058/subview.do',
    source: 'https://www.immigration.go.kr/immigration/2058/subview.do',
    confidence: 'high',
  },
  contact1345: {
    name: { ko: '외국인종합안내센터', en: 'Immigration Contact Center' },
    short: { ko: '1345', en: '1345' },
    phone: '1345',
    note: { ko: '국번 없이 1345 · 다국어 상담', en: 'Dial 1345 with no area code · multilingual' },
    source: 'https://www.immigration.go.kr/bbs/moj/93/559234/artclView.do',
    confidence: 'high',
  },
  bnkBufs: {
    name: { ko: 'BNK부산은행 BUFS점 (교내)', en: 'BNK Busan Bank, BUFS branch (on campus)' },
    short: { ko: '부산은행 BUFS점', en: 'Busan Bank BUFS' },
    phone: '051-512-0301',
    address: { ko: '글로벌센터 A121', en: 'Global Center A121' },
    hours: { ko: '평일 09:30~15:30', en: 'Mon–Fri 09:30–15:30' },
    source: 'https://oiaglobal.bufs.ac.kr/bank',
    confidence: 'high',
  },
  nhis: {
    name: { ko: '국민건강보험공단 외국인(영어) 상담', en: 'NHIS English consultation' },
    short: { ko: '건강보험공단', en: 'NHIS' },
    phone: '033-811-2000',
    note: { ko: '일반 고객센터는 1577-1000', en: 'General call center: 1577-1000' },
    url: 'https://www.nhis.or.kr/english/wbheaa02900m01.do',
    source: 'https://www.nhis.or.kr/english/wbheaa02900m01.do',
    confidence: 'high',
  },
  hikorea: {
    name: { ko: '하이코리아 (시간제취업 사전허가 전자민원)', en: 'HiKorea (e-application for part-time work permission)' },
    short: { ko: '하이코리아', en: 'HiKorea' },
    url: 'https://www.hikorea.go.kr',
    source: 'https://www.hikorea.go.kr',
    confidence: 'high',
  },
  studyInKorea: {
    name: { ko: 'Study in Korea — 휴대폰 개통 안내 (정부)', en: 'Study in Korea — Mobile phone guide (government)' },
    short: { ko: '안내 페이지', en: 'the guide' },
    note: { ko: '통신사마다 조건이 달라요. 가입하려는 통신사에 꼭 확인하세요.', en: 'Requirements vary by carrier. Check with the carrier you want to join.' },
    url: 'https://www.studyinkorea.go.kr/eng/life/livingAndHousing.do',
    source: 'https://www.studyinkorea.go.kr/eng/life/livingAndHousing.do',
    confidence: 'high',
  },
  skt: {
    name: { ko: 'SK텔레콤 고객센터', en: 'SK Telecom customer center' },
    short: { ko: 'SK텔레콤', en: 'SK Telecom' },
    phone: '080-252-5011',
    note: { ko: '영어·중국어·일본어 상담', en: 'English, Chinese and Japanese' },
    url: 'https://www.tworld.co.kr/poc/eng/html/EN4.1.html',
    source: 'https://www.tworld.co.kr/poc/eng/html/EN4.1.html',
    confidence: 'high',
  },
  kt: {
    name: { ko: 'KT 외국인 전용 고객센터', en: 'KT customer center for foreigners' },
    short: { ko: 'KT', en: 'KT' },
    phone: '080-448-0100',
    note: { ko: '영어·중국어·베트남어·러시아어 상담', en: 'English, Chinese, Vietnamese and Russian' },
    url: 'https://product.kt.com/wDic/productDetail.do?ItemCode=1612',
    source: 'https://product.kt.com/wDic/productDetail.do?ItemCode=1612',
    confidence: 'high',
  },
  lgu: {
    name: { ko: 'LG U+ 고객센터 (국내 거주 외국인)', en: 'LG U+ customer center (foreign residents)' },
    short: { ko: 'LG U+', en: 'LG U+' },
    phone: '080-851-1004',
    note: { ko: 'LG U+ 고객이면 114', en: 'U+ customers: 114' },
    url: 'https://www.lguplus.com/korea-sim/eng/pc/product/simcard?tab=data-voice',
    source: 'https://www.lguplus.com/korea-sim/eng/pc/product/simcard?tab=data-voice',
    confidence: 'high',
  },
  bufsIt: {
    name: { ko: 'BUFS 국제교류처 — IT 서비스 안내', en: 'BUFS Office of International Affairs — IT services' },
    short: { ko: 'IT 서비스 안내', en: 'IT services page' },
    note: { ko: '학교 앱 목록(모바일 학생증 포함)', en: 'List of school apps, including the mobile student card' },
    url: 'https://oiaglobal.bufs.ac.kr/it',
    source: 'https://oiaglobal.bufs.ac.kr/it',
    confidence: 'medium',
  },
  bufsSugang: {
    name: { ko: 'BUFS 수강신청 사이트', en: 'BUFS course registration site' },
    short: { ko: '수강신청 사이트', en: 'course registration site' },
    url: 'https://sugang.bufs.ac.kr',
    source: 'https://sugang.bufs.ac.kr',
    confidence: 'high',
  },
} satisfies Record<string, SettleOrg>;

export const SETTLE_ITEMS: SettleItem[] = [
  {
    id: 'mobile_sim',
    category: 'life',
    priority: 'high',
    timeAxis: 'arrival',
    showFrom: 0,
    showUntil: 14,
    estimatedMinutes: 30,
    guideSlug: 'telecom',
    name: { ko: '휴대폰 개통 (유심)', en: 'Get a phone plan (SIM)' },
    summary: {
      ko: '**여권만 있으면 선불**, **외국인등록증이 나오면 후불** 요금제로 개통할 수 있어요.',
      en: 'With **just a passport you can get a prepaid plan**; once your **Residence Card is issued, a postpaid plan**.',
    },
    detail: {
      documents: [
        { name: { ko: '여권', en: 'Passport' }, note: { ko: '선불 요금제 가입', en: 'For a prepaid plan' }, required: true },
        { name: { ko: '외국인등록증 (체류카드)', en: 'Residence Card (ARC)' }, note: { ko: '발급된 뒤 후불 요금제 가입', en: 'For a postpaid plan, once issued' } },
        { name: { ko: '학생증', en: 'Student ID' } },
        { name: { ko: '신용카드 또는 현금', en: 'Credit card or cash' }, note: { ko: '요금·기기 비용 결제', en: 'To pay for the plan or phone' } },
      ],
      steps: [
        { ko: '여권과 학생증을 챙겨 휴대폰 대리점을 방문해요', en: 'Visit a mobile phone store with your passport and student ID' },
        { ko: '선불 요금제로 개통해요', en: 'Sign up for a prepaid plan' },
        { ko: '외국인등록증이 나오면 후불 요금제로 바꿀지 정해요', en: 'Once your Residence Card is issued, decide whether to switch to postpaid' },
      ],
      orgs: [ORG.studyInKorea, ORG.skt, ORG.kt, ORG.lgu],
      cost: { amount: null, note: { ko: '요금제마다 달라요. 결제는 신용카드 또는 현금으로 해요.', en: 'Depends on the plan. Pay by credit card or cash.' }, confidence: 'high' },
      cautions: [
        { ko: '외국인은 선불 회선을 1인 1회선까지 쓸 수 있어요. (SK텔레콤 기준)', en: 'Foreign residents can have one prepaid line each. (SK Telecom)' },
        { ko: '알뜰폰은 외국인등록증으로만 가입되는 곳이 있어요. (KT M모바일: 여권으로 가입 불가)', en: 'Some budget carriers (MVNOs) accept only a Residence Card. (KT M Mobile: no passport sign-ups)' },
      ],
      sources: [SRC.studyInKoreaLife, SRC.sktPrepaid, SRC.sktSwitch, SRC.lguKoreaSim, SRC.lguForeignerPlan, SRC.ktmMobileFaq, SRC.sktCenter, SRC.ktForeigner],
      confidence: 'high',
    },
  },
  {
    id: 'alien_registration',
    category: 'admin',
    priority: 'high',
    timeAxis: 'arrival',
    showFrom: 0,
    showUntil: 90,
    estimatedMinutes: 90,
    guideSlug: 'visa',
    name: { ko: '외국인등록 (체류카드)', en: 'Alien registration (Residence Card)' },
    summary: {
      ko: 'BUFS는 학기 초에 국제교류처가 단체로 접수해요. 입국일부터 90일 안에 마쳐야 해요.',
      en: 'At BUFS, the international office files applications as a group at the start of each semester. It must be done within 90 days of arrival.',
    },
    deadline: {
      days: 90,
      lawRef: '출입국관리법 제31조',
      source: 'https://www.immigration.go.kr/bbs/moj/93/559234/artclView.do',
    },
    detail: {
      documents: [
        { name: { ko: '신청서', en: 'Application form' }, required: true },
        { name: { ko: '여권', en: 'Passport' }, required: true },
        { name: { ko: '사진 1장', en: 'One photo' }, note: { ko: '3.5×4.5cm · 흰 배경 · 최근 6개월 이내', en: '3.5×4.5cm · white background · taken within 6 months' }, required: true },
        { name: { ko: '재학증명서', en: 'Certificate of enrollment' }, required: true },
        { name: { ko: '체류지 입증서류', en: 'Proof of residence' }, note: { ko: '전·월세 계약서 또는 기숙사 거주확인서', en: 'Lease contract or dormitory residence certificate' }, required: true },
        { name: { ko: '결핵 검진 기록', en: 'Tuberculosis check-up record' }, required: true },
      ],
      steps: [
        { ko: '국제교류처의 단체접수 공지를 확인해요', en: "Check the international office's notice for group filing" },
        { ko: '준비물을 챙겨 국제교류처에 제출해요', en: 'Hand in your documents to the international office' },
        { ko: '안내받은 일정에 따라 체류카드를 받아요', en: 'Receive your Residence Card as instructed' },
      ],
      orgs: [ORG.oiaArc, ORG.busanImmigration, ORG.contact1345],
      cost: { amount: 30000, note: { ko: '수수료 (BUFS 안내 기준)', en: 'Fee (per the BUFS guide)' }, confidence: 'high' },
      links: [SRC.bufsArc],
      cautions: [
        { ko: '단체접수 일정은 학기마다 국제교류처가 공지해요. 정확한 날짜는 국제교류처에 확인해 주세요.', en: 'The international office announces group filing dates each semester. Please confirm the exact dates with them.' },
        { ko: '체류카드 재발급은 사유가 생긴 날부터 14일 안에 신청해야 해요.', en: 'If you need a replacement card, apply within 14 days of the reason arising.' },
      ],
      sources: [SRC.bufsArc, SRC.mojArc, SRC.busanImmigration, SRC.bufsContact],
      confidence: 'high',
    },
  },
  {
    id: 'bank_account',
    category: 'admin',
    priority: 'high',
    timeAxis: 'arrival',
    showFrom: 3,
    showUntil: 30,
    estimatedMinutes: 60,
    guideSlug: 'bank',
    name: { ko: '은행 계좌 개설', en: 'Open a bank account' },
    summary: {
      ko: '교내 부산은행에서 학기 초에 예약제로 개설해요. 먼저 국제교류처에 예약하세요.',
      en: 'Busan Bank on campus opens accounts by reservation at the start of the semester. Book through the international office first.',
    },
    detail: {
      documents: [
        { name: { ko: '외국인등록증 (체류카드)', en: 'Residence Card (ARC)' }, note: { ko: '발급 전이면 여권으로 개설할 수 있지만, 발급 후 다시 개설해야 해요', en: "If it isn't issued yet, you can use your passport, but you'll need to reopen the account afterwards" }, required: true },
        { name: { ko: '재학증명서', en: 'Certificate of enrollment' }, required: true },
      ],
      steps: [
        { ko: '국제교류처에 계좌 개설 예약', en: 'Book an account-opening slot with the international office' },
        { ko: '예약한 시간에 은행을 방문해 신청서 작성', en: 'Visit the bank at your slot and fill out the form' },
      ],
      orgs: [ORG.bnkBufs],
      cost: { amount: 0, note: { ko: '체류카드 발급 후 다시 개설하면 수수료 6,000원', en: 'Reopening after your ARC is issued costs 6,000 KRW' }, confidence: 'high' },
      cautions: [
        { ko: '새로 만든 계좌는 한도제한계좌일 수 있어요. 2024년 5월부터 하루 한도는 인터넷뱅킹·ATM 각 100만원, 창구 300만원이에요.', en: 'A new account may be a limited account. Since May 2024 the daily limit is 1 million KRW each for internet banking and ATMs, and 3 million KRW at the counter.' },
        { ko: '한도를 풀려면 거래 목적 증빙이 필요하고, 서류는 은행마다 달라요.', en: 'To lift the limit you need proof of the purpose of transactions; required documents vary by bank.' },
      ],
      sources: [SRC.bufsBank, SRC.fscLimit],
      confidence: 'high',
    },
  },
  {
    id: 'housing_contract',
    category: 'life',
    priority: 'mid',
    timeAxis: 'arrival',
    showFrom: 1,
    showUntil: 30,
    estimatedMinutes: 20,
    showIf: { housing: ['solo'] },
    guideSlug: 'housing',
    name: { ko: '주거 계약 확인', en: 'Check your housing contract' },
    summary: {
      ko: '전·월세 계약서는 외국인등록 때 체류지 입증서류로 내야 해요. 계약서를 잘 보관하세요.',
      en: "Your lease contract is the proof of residence you'll submit for alien registration. Keep it safe.",
    },
    detail: {
      documents: [
        { name: { ko: '전·월세 계약서', en: 'Lease contract (yearly/monthly rent)' }, note: { ko: '외국인등록 체류지 입증서류', en: 'Proof of residence for alien registration' }, required: true },
      ],
      cautions: [
        { ko: '계약 전에 확인할 점은 아래 관련 가이드의 체크리스트를 참고하세요.', en: 'For what to check before signing, see the checklist in the related guides below.' },
      ],
      sources: [SRC.bufsArc],
      confidence: 'medium',
    },
  },
  {
    id: 'health_insurance',
    category: 'admin',
    priority: 'low',
    timeAxis: 'arrival',
    showFrom: 8,
    showUntil: 60,
    estimatedMinutes: 10,
    guideSlug: 'insurance',
    name: { ko: '건강보험 확인', en: 'Check your health insurance' },
    summary: {
      ko: '따로 신청하지 않아도 자동으로 가입돼요. 고지서를 확인하고 매달 보험료를 내면 돼요.',
      en: "You're enrolled automatically, with no application needed. Check your bill and pay the premium every month.",
    },
    detail: {
      orgs: [ORG.nhis],
      cost: { amount: null, note: { ko: '보험료는 공단 고지서와 공단 홈페이지에서 확인하세요.', en: 'Check your premium on the NHIS bill or website.' }, confidence: 'low' },
      cautions: [
        { ko: 'D-2(유학)는 입국일에 바로 가입돼요. 외국인등록일이 입국일보다 늦으면 등록일부터예요.', en: 'D-2 students are enrolled from their arrival date, or from the registration date if that is later.' },
        { ko: 'D-4(어학연수)는 입국 6개월 뒤 가입되는 것으로 보여요. 공단에 확인해 주세요.', en: 'D-4 language students appear to be enrolled 6 months after arrival. Please confirm with NHIS.' },
        { ko: '보험료는 해당 월분을 전달 25일까지 미리 내요. 자동이체도 할 수 있어요.', en: "Each month's premium is paid in advance by the 25th of the previous month. Automatic transfer is available." },
        { ko: '밀리면 보험 혜택이 제한될 수 있어요.', en: 'Late payment can limit your insurance benefits.' },
      ],
      links: [SRC.nhisForeigner],
      sources: [SRC.bufsNh, SRC.nhisForeigner, SRC.nhisEn],
      confidence: 'medium',
    },
  },
  {
    id: 'student_id',
    category: 'academic',
    priority: 'mid',
    timeAxis: 'arrival',
    showFrom: 4,
    showUntil: 30,
    estimatedMinutes: 15,
    name: { ko: '학생증 발급', en: 'Get your student ID' },
    summary: {
      ko: '학교 앱 목록에 모바일 학생증이 있어요. 발급 방법은 아직 확인 중이에요.',
      en: "A mobile student card is listed among the school's apps. How to get it is still being verified.",
    },
    detail: {
      orgs: [ORG.bufsIt],
      askSchool: true,
      sources: [SRC.bufsIt],
      confidence: 'low',
    },
  },
  {
    id: 'course_registration',
    category: 'academic',
    priority: 'mid',
    timeAxis: 'academic',
    showFrom: 0,
    showUntil: null,
    estimatedMinutes: 30,
    showIf: { visa: ['d2'] },
    name: { ko: '수강신청', en: 'Course registration' },
    summary: {
      ko: '학사일정에 맞춰 수강신청 사이트에서 신청해요. 놓치면 수강신청 확인(정정) 기간에 다시 기회가 있어요.',
      en: "Register on the course registration site during the period on the academic calendar. If you miss it, there's another chance in the add/drop period.",
    },
    detail: {
      orgs: [ORG.bufsSugang],
      links: [SRC.bufsAcaNotice],
      cautions: [
        { ko: '일정은 The Well 학사일정 탭에서도 볼 수 있어요. 바뀔 수 있으니 학사공지를 함께 확인하세요.', en: 'You can also see the dates in The Well Schedule tab. Dates may change, so check the academic notices too.' },
      ],
      sources: [SRC.bufsSugang],
      confidence: 'high',
    },
  },
  {
    id: 'part_time_work',
    category: 'life',
    priority: 'low',
    timeAxis: 'arrival',
    showFrom: 8,
    showUntil: 60,
    estimatedMinutes: 15,
    showIf: { visa: ['d2', 'd4'] },
    guideSlug: 'part-time',
    name: { ko: '시간제취업 허가 확인', en: 'Check part-time work permission' },
    summary: {
      ko: '아르바이트를 시작하기 전에 반드시 출입국 허가를 먼저 받아야 해요. 허가 없이 일하면 불법취업이에요.',
      en: 'You must get permission from immigration before starting any part-time job. Working without it is illegal employment.',
    },
    detail: {
      orgs: [ORG.hikorea, ORG.contact1345],
      cautions: [
        { ko: '허용 시간은 학위과정과 한국어 능력에 따라 달라요. 2023년 7월부터 학부 과정은 주당 25시간까지로 늘었어요(2023년 발표 기준).', en: 'Allowed hours depend on your degree level and Korean ability. From July 2023 the limit for undergraduates rose to 25 hours a week (as announced in 2023).' },
        { ko: '2026년 현재 허용 시간과 D-4의 체류 기간 요건은 확인 중이에요. 신청 전에 위의 외국인종합안내센터에 확인하세요.', en: 'Current 2026 hours and the D-4 length-of-stay requirement are still being verified. Check with the Immigration Contact Center above before applying.' },
      ],
      links: [SRC.partTime2023],
      sources: [SRC.partTime2023, SRC.hikorea, SRC.mojArc],
      confidence: 'medium',
    },
  },
];
