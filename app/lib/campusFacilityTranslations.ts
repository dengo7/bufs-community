// 캠퍼스 가이드 시설 콘텐츠 번역 (en/zh/ja). campusFacilities.ts 에서 각 항목의 translations 필드로 합쳐진다.
//
// 작성 규칙
// - 시설 고유명(CU, Bluport, Ourhome, MBG …)은 원문/음역을 유지하고 설명어만 번역한다.
// - 한국어 간판으로만 찾을 수 있는 곳은 괄호에 한국어 원문을 함께 적는다. 예) Asia Room (아시아실)
// - 건물 표기: 'D동' → en 'Bldg. D' / zh 'D栋' / ja 'D棟', 층: '3층' → '3F' / '3楼' / '3階'
// - 'D113' 같은 호실 코드, 'A동'·'도서관'·'기숙사' 처럼 단순한 위치는 여기 적지 않아도
//   campusFacilities.ts 의 localizePlace() 규칙으로 자동 변환된다.
// - 운영시간 문구(요일·식사 구분)는 localizeHoursLine() 이 표시 시점에 변환하므로 hoursText 는 비워 둔다.
// - 비워 둔 필드는 한국어로 대체된다.
import type { CampusFacility } from './campusFacilities';

type Translations = CampusFacility['translations'];

const STORE_DESC = { en: 'Convenience store goods', zh: '销售便利店商品', ja: 'コンビニ商品の販売' };
const STORE_SERVICES = {
  en: ['Drinks', 'Snacks', 'Daily necessities'],
  zh: ['饮料', '零食', '生活用品'],
  ja: ['飲み物', 'お菓子', '生活用品'],
};
const CAFE_DESC = { en: 'Drinks and desserts', zh: '销售饮料和甜点', ja: 'ドリンクとデザートの販売' };
const STUDENT_ROOM_DESC = {
  en: 'A student space where you can borrow or use everyday items.',
  zh: '可以借用或使用各种物品的学生空间。',
  ja: '必要な物品を借りたり使ったりできる学生スペースです。',
};
const PENDING_NOTE = {
  en: 'Details are coming soon. For anything urgent, please call the school’s main number (051-509-5000).',
  zh: '详细内容正在准备中。如有急事,请拨打学校总机(051-509-5000)。',
  ja: '詳しい内容は準備中です。お急ぎの場合は学校の代表番号(051-509-5000)にお問い合わせください。',
};

export const FACILITY_TRANSLATIONS: Record<string, Translations> = {
  // ── 학생 팁 ──
  'tip-free-print': {
    en: {
      title: 'I want to print for free',
      location: 'Student Council Room · 1F, below the Gym',
      description: 'You can print for free at the Student Council Room.',
    },
    zh: {
      title: '想免费打印',
      location: '学生会室 · 体育馆下方1楼',
      description: '在学生会室可以免费打印。',
    },
    ja: {
      title: '無料で印刷したい',
      location: '学生会室 · 体育館の下の1階',
      description: '学生会室で無料で印刷できます。',
    },
  },
  'tip-contact-school': {
    en: {
      title: 'I want to contact the school',
      description: 'For questions about course registration, course changes, scholarships, parking and more, call the school’s main number.',
      services: ['Course registration', 'Course changes', 'Scholarships', 'Parking'],
    },
    zh: {
      title: '想咨询学校',
      description: '选课、改课、奖学金、停车等各类咨询,请拨打学校总机。',
      services: ['选课', '改课', '奖学金', '停车'],
    },
    ja: {
      title: '学校に問い合わせたい',
      description: '履修登録、履修修正、奨学金、駐車などのお問い合わせは、学校の代表番号にお電話ください。',
      services: ['履修登録', '履修修正', '奨学金', '駐車'],
    },
  },
  'tip-elevator': {
    en: {
      title: 'I’m looking for an elevator',
      location: 'Across from the underground parking near the bus stop / Next to the entrance stairs of Bldg. G·I',
      locations: [
        'Across from the underground parking lot near the bus stop',
        'Next to the entrance stairs of Bldg. G and I (both sides of the building)',
      ],
      description: 'There is an elevator across from the underground parking lot near the bus stop. In Bldg. G and I, the elevators are next to the entrance stairs, on both sides of the building.',
    },
    zh: {
      title: '在找电梯',
      location: '车站附近地下停车场对面 / G·I栋入口楼梯旁',
      locations: ['车站附近地下停车场对面', 'G·I栋入口楼梯旁(楼的两侧)'],
      description: '车站附近的地下停车场对面有电梯。G·I栋的电梯在入口楼梯旁,楼的两侧都有。',
    },
    ja: {
      title: 'エレベーターを探しています',
      location: '停留所近くの地下駐車場の向かい / G・I棟の入口階段の横',
      locations: ['停留所近くの地下駐車場の向かい', 'G・I棟の入口階段の横(建物の両側)'],
      description: '停留所近くの地下駐車場の向かいにエレベーターがあります。G・I棟は入口階段の横、建物の両側にあります。',
    },
  },
  'tip-lost-found': {
    en: {
      title: 'I’m looking for a lost item',
      location: 'Student Council Room · below the Gym',
      description: 'If you lost something, ask at the Student Council Room first.',
    },
    zh: {
      title: '在找丢失的物品',
      location: '学生会室 · 体育馆下方',
      description: '丢了东西,请先到学生会室询问。',
    },
    ja: {
      title: '落とし物を探しています',
      location: '学生会室 · 体育館の下',
      description: '落とし物は、まず学生会室に問い合わせてみてください。',
    },
  },
  'tip-rest': {
    en: {
      title: 'I want to take a short break',
      location: 'Bldg. D lounge · Library lounge',
      locations: ['Bldg. D lounge', 'Library lounge'],
      description: 'The Bldg. D lounge is first come, first served. For the library lounge, you need to reserve a seat in the app.',
    },
    zh: {
      title: '想休息一下',
      location: 'D栋休息室 · 图书馆休息室',
      locations: ['D栋休息室', '图书馆休息室'],
      description: 'D栋休息室先到先得,图书馆休息室需要用APP预约座位。',
    },
    ja: {
      title: '少し休みたい',
      location: 'D棟の休憩室 · 図書館の休憩室',
      locations: ['D棟の休憩室', '図書館の休憩室'],
      description: 'D棟の休憩室は先着順、図書館の休憩室はアプリで席を確保する必要があります。',
    },
  },
  'tip-quiet-study': {
    en: {
      title: 'I want to study somewhere quiet',
      location: 'Bldg. F, 2F · Library 4F reading room',
      locations: ['Bldg. F, 2F', 'Library 4F reading room'],
      description: 'Bldg. F 2F and the reading room on the 4th floor of the library are good places to study quietly.',
    },
    zh: {
      title: '想在安静的地方学习',
      location: 'F栋2楼 · 图书馆4楼阅览室',
      locations: ['F栋2楼', '图书馆4楼阅览室'],
      description: 'F栋2楼和图书馆4楼阅览室很适合安静学习。',
    },
    ja: {
      title: '静かな場所で勉強したい',
      location: 'F棟2階 · 図書館4階の閲覧室',
      locations: ['F棟2階', '図書館4階の閲覧室'],
      description: 'F棟2階と図書館4階の閲覧室は、静かに勉強するのにぴったりです。',
    },
  },
  'tip-clinic': {
    en: {
      title: 'I’m sick or need medicine',
      location: 'D560-1 Boas Clinic (보아스의원)',
      description: 'You can see a doctor at Boas Clinic in Bldg. D.',
    },
    zh: {
      title: '生病了或需要药',
      location: 'D560-1 Boas诊所(보아스의원)',
      description: '可以在D栋的Boas诊所看病。',
    },
    ja: {
      title: '具合が悪い・薬が必要',
      location: 'D560-1 ボアス医院(보아스의원)',
      description: 'D棟のボアス医院で診察を受けられます。',
    },
  },
  'tip-shower': {
    en: {
      title: 'I want to take a shower',
      location: 'Bldg. B (Gym building), 3F',
      description: 'There is a free shower room on the 3rd floor of Bldg. B.',
      price: 'Free',
    },
    zh: {
      title: '想洗澡',
      location: 'B栋(体育馆楼)3楼',
      description: 'B栋3楼有免费淋浴室。',
      price: '免费',
    },
    ja: {
      title: 'シャワーを浴びたい',
      location: 'B棟(体育館の建物)3階',
      description: 'B棟3階に無料のシャワー室があります。',
      price: '無料',
    },
  },
  'room-business': {
    en: {
      title: 'Business College Room (상경대실)',
      description: STUDENT_ROOM_DESC.en,
      services: ['Color printing', 'Coffee machine', 'Water purifier', 'Microwave', 'Electric kettle', 'Refrigerator', 'Power bank', 'Feminine products', 'First-aid medicine', 'Laser pointer', 'Umbrella', 'Charger'],
    },
    zh: {
      title: '商经学院室(상경대실)',
      description: STUDENT_ROOM_DESC.zh,
      services: ['彩色打印', '咖啡机', '净水器', '微波炉', '电热水壶', '冰箱', '充电宝', '女性用品', '常备药', '激光笔', '雨伞', '充电器'],
    },
    ja: {
      title: '商経大室(상경대실)',
      description: STUDENT_ROOM_DESC.ja,
      services: ['カラー印刷', 'コーヒーマシン', '浄水器', '電子レンジ', '電気ポット', '冷蔵庫', 'モバイルバッテリー', '生理用品', '常備薬', 'ポインター', '傘', '充電器'],
    },
  },
  'room-asia': {
    en: {
      title: 'Asia Room (아시아실)',
      description: STUDENT_ROOM_DESC.en,
      services: ['Self-laminating film', 'A4 copy paper', 'Sticky notes', 'Power bank', 'USB hub', 'First-aid medicine'],
    },
    zh: {
      title: '亚洲室(아시아실)',
      description: STUDENT_ROOM_DESC.zh,
      services: ['手贴塑封膜', 'A4复印纸', '便利贴', '充电宝', 'USB集线器', '常备药'],
    },
    ja: {
      title: 'アジア室(아시아실)',
      description: STUDENT_ROOM_DESC.ja,
      services: ['手貼りラミネートフィルム', 'A4コピー用紙', '付箋', 'モバイルバッテリー', 'USBハブ', '常備薬'],
    },
  },

  // ── 공식 교내시설 ──
  'cu-d': {
    en: { title: 'CU (Bldg. D)', description: STORE_DESC.en, services: STORE_SERVICES.en },
    zh: { title: 'CU(D栋)', description: STORE_DESC.zh, services: STORE_SERVICES.zh },
    ja: { title: 'CU(D棟)', description: STORE_DESC.ja, services: STORE_SERVICES.ja },
  },
  'cu-ig': {
    en: { title: 'CU (Bldg. I·G)', description: STORE_DESC.en, services: STORE_SERVICES.en },
    zh: { title: 'CU(I栋·G栋)', description: STORE_DESC.zh, services: STORE_SERVICES.zh },
    ja: { title: 'CU(I棟・G棟)', description: STORE_DESC.ja, services: STORE_SERVICES.ja },
  },
  'cu-a': {
    en: { title: 'CU (Bldg. A)', description: STORE_DESC.en, services: STORE_SERVICES.en },
    zh: { title: 'CU(A栋)', description: STORE_DESC.zh, services: STORE_SERVICES.zh },
    ja: { title: 'CU(A棟)', description: STORE_DESC.ja, services: STORE_SERVICES.ja },
  },
  'cu-dorm': {
    en: { title: 'CU (Dormitory)', description: STORE_DESC.en, notes: 'Only dormitory residents can use this store.' },
    zh: { title: 'CU宿舍店', description: STORE_DESC.zh, notes: '仅限住宿生使用。' },
    ja: { title: 'CU寮店', description: STORE_DESC.ja, notes: '寮生のみ利用できます。' },
  },
  'cafe-blueport-library': {
    en: { title: 'Cafe Bluport (Library)', description: CAFE_DESC.en },
    zh: { title: 'Bluport咖啡 图书馆店', description: CAFE_DESC.zh },
    ja: { title: 'カフェ・ブルーポート 図書館店', description: CAFE_DESC.ja },
  },
  'cafe-blueport-global': {
    en: { title: 'Cafe Bluport (Global Center)', description: CAFE_DESC.en },
    zh: { title: 'Bluport咖啡 国际中心店', description: CAFE_DESC.zh },
    ja: { title: 'カフェ・ブルーポート グローバルセンター店', description: CAFE_DESC.ja },
  },
  'ourhome-student': {
    en: { title: 'Ourhome Student Cafeteria', description: 'Student cafeteria (breakfast · lunch)', price: 'Meal ticket ₩5,500' },
    zh: { title: 'Ourhome学生食堂', description: '学生食堂(早餐·午餐)', price: '餐券 5,500韩元' },
    ja: { title: 'アワーホーム学生食堂', description: '学生食堂(朝食・昼食)', price: '食券 5,500ウォン' },
  },
  'ourhome-staff': {
    en: { title: 'Ourhome Faculty & Staff Cafeteria', location: 'Bldg. I, 3F', description: 'Faculty & staff cafeteria (lunch)' },
    zh: { title: 'Ourhome教职工食堂', location: 'I栋3楼', description: '教职工食堂(午餐)' },
    ja: { title: 'アワーホーム教職員食堂', location: 'I棟3階', description: '教職員食堂(昼食)' },
  },
  'ourhome-dorm': {
    en: { title: 'Ourhome Dormitory Cafeteria', location: 'Dormitory, basement floor', description: 'Dormitory cafeteria (breakfast · lunch · dinner)' },
    zh: { title: 'Ourhome宿舍食堂', location: '宿舍地下层', description: '宿舍食堂(早餐·午餐·晚餐)' },
    ja: { title: 'アワーホーム寮食堂', location: '寮の地下', description: '寮食堂(朝食・昼食・夕食)' },
  },
  'bookstore': {
    en: { title: 'BUFS Campus Bookstore', description: 'Books and study supplies' },
    zh: { title: '釜山外大校内书店', description: '销售图书和学习用品' },
    ja: { title: '釜山外大 構内書店', description: '書籍・学習用品の販売' },
  },
  'print-center': {
    en: { title: 'Kkumkium Print Center (꿈키움 출력센터)', description: 'Printing services' },
    zh: { title: 'Kkumkium打印中心(꿈키움 출력센터)', description: '打印·印刷' },
    ja: { title: 'クムキウム出力センター(꿈키움 출력센터)', description: 'プリント・印刷' },
  },
  'post-office': {
    en: { title: 'BUFS Post Office', description: 'Send mail' },
    zh: { title: '釜山外大邮政代办所', description: '邮件寄送' },
    ja: { title: '釜山外大 郵便取扱局', description: '郵便の発送' },
  },
  'stationery-mbg': {
    en: { title: 'MBG Stationery Store', description: 'Stationery and office supplies' },
    zh: { title: 'MBG文具店', description: '销售文具和办公用品' },
    ja: { title: '文具店MBG', description: '文具・事務用品の販売' },
  },
  'photo-studio': {
    en: { title: 'BUFS Photo Studio', description: 'Photography' },
    zh: { title: '釜山外大照相馆', description: '拍照' },
    ja: { title: '釜山外大 写真館', description: '写真撮影' },
  },
  'hanatour': {
    en: { title: 'Hanatour Travel Agency', description: 'Travel consultation and booking' },
    zh: { title: 'Hanatour旅行社', description: '旅游产品咨询·预订' },
    ja: { title: 'ハナツアー旅行会社', description: '旅行商品の相談・予約' },
  },
  'realestate-daeho': {
    en: {
      title: 'Daeho Real Estate Agency (대호공인중개사)',
      description: 'Help finding a room',
      notes: 'The agent is often out. Be sure to call before you visit.',
    },
    zh: {
      title: 'Daeho房产中介(대호공인중개사)',
      description: '租房咨询',
      notes: '经常不在,去之前请务必先打电话确认。',
    },
    ja: {
      title: 'テホ不動産(대호공인중개사)',
      description: '部屋探しの相談',
      notes: '不在のことが多いので、訪問前に必ず電話で確認してください。',
    },
  },

  // ── 준비 중 ──
  'library': {
    en: { title: 'What are the library hours?', location: 'Central Library', description: 'Central Library · reading room info', notes: PENDING_NOTE.en },
    zh: { title: '想知道图书馆开放时间', location: '中央图书馆', description: '中央图书馆 · 阅览室信息', notes: PENDING_NOTE.zh },
    ja: { title: '図書館の利用時間を知りたい', location: '中央図書館', description: '中央図書館 · 閲覧室の情報', notes: PENDING_NOTE.ja },
  },
  'shuttle': {
    en: { title: 'What is the shuttle bus timetable?', description: 'Routes · boarding points' },
    zh: { title: '想知道校车时刻表', description: '路线 · 乘车点' },
    ja: { title: 'シャトルバスの時刻表を知りたい', description: '路線 · 乗り場の案内' },
  },
  'campus-map': {
    en: { title: 'Campus map', description: 'Find buildings', notes: PENDING_NOTE.en },
    zh: { title: '校园地图', description: '建筑位置指引', notes: PENDING_NOTE.zh },
    ja: { title: 'キャンパスマップ', description: '建物の位置案内', notes: PENDING_NOTE.ja },
  },
};
