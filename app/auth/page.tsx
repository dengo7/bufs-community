'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
type Mode = 'login' | 'signup';
type Gender = 'male' | 'female';
type Country = { code: string; en: string; ko: string; zh: string; ja: string };

const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const COUNTRIES: Country[] = [
  { code: 'AF', en: 'Afghanistan', ko: '아프가니스탄', zh: '阿富汗', ja: 'アフガニスタン' },
  { code: 'AL', en: 'Albania', ko: '알바니아', zh: '阿尔巴尼亚', ja: 'アルバニア' },
  { code: 'DZ', en: 'Algeria', ko: '알제리', zh: '阿尔及利亚', ja: 'アルジェリア' },
  { code: 'AR', en: 'Argentina', ko: '아르헨티나', zh: '阿根廷', ja: 'アルゼンチン' },
  { code: 'AU', en: 'Australia', ko: '호주', zh: '澳大利亚', ja: 'オーストラリア' },
  { code: 'AT', en: 'Austria', ko: '오스트리아', zh: '奥地利', ja: 'オーストリア' },
  { code: 'AZ', en: 'Azerbaijan', ko: '아제르바이잔', zh: '阿塞拜疆', ja: 'アゼルバイジャン' },
  { code: 'BD', en: 'Bangladesh', ko: '방글라데시', zh: '孟加拉国', ja: 'バングラデシュ' },
  { code: 'BY', en: 'Belarus', ko: '벨라루스', zh: '白俄罗斯', ja: 'ベラルーシ' },
  { code: 'BE', en: 'Belgium', ko: '벨기에', zh: '比利时', ja: 'ベルギー' },
  { code: 'BO', en: 'Bolivia', ko: '볼리비아', zh: '玻利维亚', ja: 'ボリビア' },
  { code: 'BR', en: 'Brazil', ko: '브라질', zh: '巴西', ja: 'ブラジル' },
  { code: 'BG', en: 'Bulgaria', ko: '불가리아', zh: '保加利亚', ja: 'ブルガリア' },
  { code: 'KH', en: 'Cambodia', ko: '캄보디아', zh: '柬埔寨', ja: 'カンボジア' },
  { code: 'CM', en: 'Cameroon', ko: '카메룬', zh: '喀麦隆', ja: 'カメルーン' },
  { code: 'CA', en: 'Canada', ko: '캐나다', zh: '加拿大', ja: 'カナダ' },
  { code: 'CL', en: 'Chile', ko: '칠레', zh: '智利', ja: 'チリ' },
  { code: 'CN', en: 'China', ko: '중국', zh: '中国', ja: '中国' },
  { code: 'CO', en: 'Colombia', ko: '콜롬비아', zh: '哥伦比亚', ja: 'コロンビア' },
  { code: 'CI', en: "Côte d'Ivoire", ko: '코트디부아르', zh: '科特迪瓦', ja: 'コートジボワール' },
  { code: 'HR', en: 'Croatia', ko: '크로아티아', zh: '克罗地亚', ja: 'クロアチア' },
  { code: 'CU', en: 'Cuba', ko: '쿠바', zh: '古巴', ja: 'キューバ' },
  { code: 'CZ', en: 'Czech Republic', ko: '체코', zh: '捷克', ja: 'チェコ' },
  { code: 'DK', en: 'Denmark', ko: '덴마크', zh: '丹麦', ja: 'デンマーク' },
  { code: 'EC', en: 'Ecuador', ko: '에콰도르', zh: '厄瓜多尔', ja: 'エクアドル' },
  { code: 'EG', en: 'Egypt', ko: '이집트', zh: '埃及', ja: 'エジプト' },
  { code: 'SV', en: 'El Salvador', ko: '엘살바도르', zh: '萨尔瓦多', ja: 'エルサルバドル' },
  { code: 'GQ', en: 'Equatorial Guinea', ko: '적도기니', zh: '赤道几内亚', ja: '赤道ギニア' },
  { code: 'EE', en: 'Estonia', ko: '에스토니아', zh: '爱沙尼亚', ja: 'エストニア' },
  { code: 'ET', en: 'Ethiopia', ko: '에티오피아', zh: '埃塞俄比亚', ja: 'エチオピア' },
  { code: 'FJ', en: 'Fiji', ko: '피지', zh: '斐济', ja: 'フィジー' },
  { code: 'FI', en: 'Finland', ko: '핀란드', zh: '芬兰', ja: 'フィンランド' },
  { code: 'FR', en: 'France', ko: '프랑스', zh: '法国', ja: 'フランス' },
  { code: 'GH', en: 'Ghana', ko: '가나', zh: '加纳', ja: 'ガーナ' },
  { code: 'GR', en: 'Greece', ko: '그리스', zh: '希腊', ja: 'ギリシャ' },
  { code: 'GT', en: 'Guatemala', ko: '과테말라', zh: '危地马拉', ja: 'グアテマラ' },
  { code: 'HN', en: 'Honduras', ko: '온두라스', zh: '洪都拉斯', ja: 'ホンジュラス' },
  { code: 'HK', en: 'Hong Kong', ko: '홍콩', zh: '香港', ja: '香港' },
  { code: 'HU', en: 'Hungary', ko: '헝가리', zh: '匈牙利', ja: 'ハンガリー' },
  { code: 'IS', en: 'Iceland', ko: '아이슬란드', zh: '冰岛', ja: 'アイスランド' },
  { code: 'IN', en: 'India', ko: '인도', zh: '印度', ja: 'インド' },
  { code: 'ID', en: 'Indonesia', ko: '인도네시아', zh: '印度尼西亚', ja: 'インドネシア' },
  { code: 'IR', en: 'Iran', ko: '이란', zh: '伊朗', ja: 'イラン' },
  { code: 'IQ', en: 'Iraq', ko: '이라크', zh: '伊拉克', ja: 'イラク' },
  { code: 'IE', en: 'Ireland', ko: '아일랜드', zh: '爱尔兰', ja: 'アイルランド' },
  { code: 'IL', en: 'Israel', ko: '이스라엘', zh: '以色列', ja: 'イスラエル' },
  { code: 'IT', en: 'Italy', ko: '이탈리아', zh: '意大利', ja: 'イタリア' },
  { code: 'JM', en: 'Jamaica', ko: '자메이카', zh: '牙买加', ja: 'ジャマイカ' },
  { code: 'JP', en: 'Japan', ko: '일본', zh: '日本', ja: '日本' },
  { code: 'JO', en: 'Jordan', ko: '요르단', zh: '约旦', ja: 'ヨルダン' },
  { code: 'KZ', en: 'Kazakhstan', ko: '카자흐스탄', zh: '哈萨克斯坦', ja: 'カザフスタン' },
  { code: 'KE', en: 'Kenya', ko: '케냐', zh: '肯尼亚', ja: 'ケニア' },
  { code: 'KW', en: 'Kuwait', ko: '쿠웨이트', zh: '科威特', ja: 'クウェート' },
  { code: 'KG', en: 'Kyrgyzstan', ko: '키르기스스탄', zh: '吉尔吉斯斯坦', ja: 'キルギスタン' },
  { code: 'LA', en: 'Laos', ko: '라오스', zh: '老挝', ja: 'ラオス' },
  { code: 'LV', en: 'Latvia', ko: '라트비아', zh: '拉脱维亚', ja: 'ラトビア' },
  { code: 'LB', en: 'Lebanon', ko: '레바논', zh: '黎巴嫩', ja: 'レバノン' },
  { code: 'LY', en: 'Libya', ko: '리비아', zh: '利比亚', ja: 'リビア' },
  { code: 'LT', en: 'Lithuania', ko: '리투아니아', zh: '立陶宛', ja: 'リトアニア' },
  { code: 'LU', en: 'Luxembourg', ko: '룩셈부르크', zh: '卢森堡', ja: 'ルクセンブルク' },
  { code: 'MY', en: 'Malaysia', ko: '말레이시아', zh: '马来西亚', ja: 'マレーシア' },
  { code: 'MV', en: 'Maldives', ko: '몰디브', zh: '马尔代夫', ja: 'モルディブ' },
  { code: 'MT', en: 'Malta', ko: '몰타', zh: '马耳他', ja: 'マルタ' },
  { code: 'MX', en: 'Mexico', ko: '멕시코', zh: '墨西哥', ja: 'メキシコ' },
  { code: 'MD', en: 'Moldova', ko: '몰도바', zh: '摩尔多瓦', ja: 'モルドバ' },
  { code: 'MN', en: 'Mongolia', ko: '몽골', zh: '蒙古', ja: 'モンゴル' },
  { code: 'MA', en: 'Morocco', ko: '모로코', zh: '摩洛哥', ja: 'モロッコ' },
  { code: 'MM', en: 'Myanmar', ko: '미얀마', zh: '缅甸', ja: 'ミャンマー' },
  { code: 'NP', en: 'Nepal', ko: '네팔', zh: '尼泊尔', ja: 'ネパール' },
  { code: 'NL', en: 'Netherlands', ko: '네덜란드', zh: '荷兰', ja: 'オランダ' },
  { code: 'NZ', en: 'New Zealand', ko: '뉴질랜드', zh: '新西兰', ja: 'ニュージーランド' },
  { code: 'NG', en: 'Nigeria', ko: '나이지리아', zh: '尼日利亚', ja: 'ナイジェリア' },
  { code: 'KP', en: 'North Korea', ko: '북한', zh: '朝鲜', ja: '北朝鮮' },
  { code: 'MK', en: 'North Macedonia', ko: '북마케도니아', zh: '北马其顿', ja: '北マケドニア' },
  { code: 'NO', en: 'Norway', ko: '노르웨이', zh: '挪威', ja: 'ノルウェー' },
  { code: 'OM', en: 'Oman', ko: '오만', zh: '阿曼', ja: 'オマーン' },
  { code: 'PK', en: 'Pakistan', ko: '파키스탄', zh: '巴基斯坦', ja: 'パキスタン' },
  { code: 'PA', en: 'Panama', ko: '파나마', zh: '巴拿马', ja: 'パナマ' },
  { code: 'PY', en: 'Paraguay', ko: '파라과이', zh: '巴拉圭', ja: 'パラグアイ' },
  { code: 'PE', en: 'Peru', ko: '페루', zh: '秘鲁', ja: 'ペルー' },
  { code: 'PH', en: 'Philippines', ko: '필리핀', zh: '菲律宾', ja: 'フィリピン' },
  { code: 'PL', en: 'Poland', ko: '폴란드', zh: '波兰', ja: 'ポーランド' },
  { code: 'PT', en: 'Portugal', ko: '포르투갈', zh: '葡萄牙', ja: 'ポルトガル' },
  { code: 'QA', en: 'Qatar', ko: '카타르', zh: '卡塔尔', ja: 'カタール' },
  { code: 'RO', en: 'Romania', ko: '루마니아', zh: '罗马尼亚', ja: 'ルーマニア' },
  { code: 'RU', en: 'Russia', ko: '러시아', zh: '俄罗斯', ja: 'ロシア' },
  { code: 'RW', en: 'Rwanda', ko: '르완다', zh: '卢旺达', ja: 'ルワンダ' },
  { code: 'SA', en: 'Saudi Arabia', ko: '사우디아라비아', zh: '沙特阿拉伯', ja: 'サウジアラビア' },
  { code: 'SN', en: 'Senegal', ko: '세네갈', zh: '塞内加尔', ja: 'セネガル' },
  { code: 'RS', en: 'Serbia', ko: '세르비아', zh: '塞尔维亚', ja: 'セルビア' },
  { code: 'SG', en: 'Singapore', ko: '싱가포르', zh: '新加坡', ja: 'シンガポール' },
  { code: 'SK', en: 'Slovakia', ko: '슬로바키아', zh: '斯洛伐克', ja: 'スロバキア' },
  { code: 'SI', en: 'Slovenia', ko: '슬로베니아', zh: '斯洛文尼亚', ja: 'スロベニア' },
  { code: 'ZA', en: 'South Africa', ko: '남아프리카공화국', zh: '南非', ja: '南アフリカ' },
  { code: 'KR', en: 'South Korea', ko: '한국', zh: '韩国', ja: '韓国' },
  { code: 'ES', en: 'Spain', ko: '스페인', zh: '西班牙', ja: 'スペイン' },
  { code: 'LK', en: 'Sri Lanka', ko: '스리랑카', zh: '斯里兰卡', ja: 'スリランカ' },
  { code: 'SD', en: 'Sudan', ko: '수단', zh: '苏丹', ja: 'スーダン' },
  { code: 'SE', en: 'Sweden', ko: '스웨덴', zh: '瑞典', ja: 'スウェーデン' },
  { code: 'CH', en: 'Switzerland', ko: '스위스', zh: '瑞士', ja: 'スイス' },
  { code: 'SY', en: 'Syria', ko: '시리아', zh: '叙利亚', ja: 'シリア' },
  { code: 'TW', en: 'Taiwan', ko: '대만', zh: '台湾', ja: '台湾' },
  { code: 'TJ', en: 'Tajikistan', ko: '타지키스탄', zh: '塔吉克斯坦', ja: 'タジキスタン' },
  { code: 'TZ', en: 'Tanzania', ko: '탄자니아', zh: '坦桑尼亚', ja: 'タンザニア' },
  { code: 'TH', en: 'Thailand', ko: '태국', zh: '泰国', ja: 'タイ' },
  { code: 'TT', en: 'Trinidad and Tobago', ko: '트리니다드토바고', zh: '特立尼达和多巴哥', ja: 'トリニダード・トバゴ' },
  { code: 'TN', en: 'Tunisia', ko: '튀니지', zh: '突尼斯', ja: 'チュニジア' },
  { code: 'TR', en: 'Turkey', ko: '튀르키예', zh: '土耳其', ja: 'トルコ' },
  { code: 'TM', en: 'Turkmenistan', ko: '투르크메니스탄', zh: '土库曼斯坦', ja: 'トルクメニスタン' },
  { code: 'UG', en: 'Uganda', ko: '우간다', zh: '乌干达', ja: 'ウガンダ' },
  { code: 'UA', en: 'Ukraine', ko: '우크라이나', zh: '乌克兰', ja: 'ウクライナ' },
  { code: 'AE', en: 'United Arab Emirates', ko: '아랍에미리트', zh: '阿联酋', ja: 'アラブ首長国連邦' },
  { code: 'GB', en: 'United Kingdom', ko: '영국', zh: '英国', ja: 'イギリス' },
  { code: 'US', en: 'United States', ko: '미국', zh: '美国', ja: 'アメリカ' },
  { code: 'UY', en: 'Uruguay', ko: '우루과이', zh: '乌拉圭', ja: 'ウルグアイ' },
  { code: 'UZ', en: 'Uzbekistan', ko: '우즈베키스탄', zh: '乌兹别克斯坦', ja: 'ウズベキスタン' },
  { code: 'VE', en: 'Venezuela', ko: '베네수엘라', zh: '委内瑞拉', ja: 'ベネズエラ' },
  { code: 'VN', en: 'Vietnam', ko: '베트남', zh: '越南', ja: 'ベトナム' },
  { code: 'YE', en: 'Yemen', ko: '예멘', zh: '也门', ja: 'イエメン' },
  { code: 'ZM', en: 'Zambia', ko: '잠비아', zh: '赞比亚', ja: 'ザンビア' },
  { code: 'ZW', en: 'Zimbabwe', ko: '짐바브웨', zh: '津巴布韦', ja: 'ジンバブエ' },
  { code: 'XX', en: 'Other', ko: '기타', zh: '其他', ja: 'その他' },
];

const T = {
  ko: {
    titleLogin: '로그인', titleSignup: '회원가입',
    subtitle: 'BUFS 외국인 유학생 커뮤니티',
    tabLogin: '로그인', tabSignup: '회원가입',
    name: '이름', namePh: '이름을 입력하세요',
    nickname: '닉네임', nicknamePh: '닉네임을 입력하세요',
    nicknameWarn: '실명보다 별명이나 닉네임을 사용해 주세요.',
    gender: '성별', male: '남자', female: '여자',
    nationality: '국적', nationalityPh: '국적을 선택하세요',
    searchNationality: '🔍 국가명으로 검색...', noResults: '검색 결과가 없어요',
    email: '이메일', emailPh: '이메일 주소',
    pw: '비밀번호', pwPh: '비밀번호 (6자리 이상)',
    pwNew: '비밀번호', pwNewPh: '비밀번호 설정 (6자리 이상)',
    submit: '로그인', submitSignup: '회원가입',
    or: '또는',
    google: 'Google로 계속하기', kakao: 'Kakao로 계속하기',
    home: '← 홈으로 돌아가기', loading: '처리 중...',
    errLogin: '이메일 또는 비밀번호가 올바르지 않아요.',
    errName: '이름을 입력해주세요.',
    errNickname: '닉네임을 입력해주세요.',
    errGender: '성별을 선택해주세요.',
    errNationality: '국적을 선택해주세요.',
    successSignup: '✅ 가입 완료! 이메일 인증 후 로그인해주세요.',
  },
  en: {
    titleLogin: 'Sign In', titleSignup: 'Sign Up',
    subtitle: 'BUFS International Student Community',
    tabLogin: 'Sign In', tabSignup: 'Sign Up',
    name: 'Name', namePh: 'Your full name',
    nickname: 'Nickname', nicknamePh: 'Enter a nickname',
    nicknameWarn: 'Please use a nickname or alias instead of your real name.',
    gender: 'Gender', male: 'Male', female: 'Female',
    nationality: 'Nationality', nationalityPh: 'Select nationality',
    searchNationality: '🔍 Search country...', noResults: 'No results found',
    email: 'Email', emailPh: 'Email address',
    pw: 'Password', pwPh: 'Password (6+ characters)',
    pwNew: 'Password', pwNewPh: 'Set password (6+ characters)',
    submit: 'Sign In', submitSignup: 'Create Account',
    or: 'or',
    google: 'Continue with Google', kakao: 'Continue with Kakao',
    home: '← Back to Home', loading: 'Processing...',
    errLogin: 'Invalid email or password.',
    errName: 'Please enter your name.',
    errNickname: 'Please enter a nickname.',
    errGender: 'Please select your gender.',
    errNationality: 'Please select your nationality.',
    successSignup: '✅ Done! Please check your email to verify.',
  },
  zh: {
    titleLogin: '登录', titleSignup: '注册',
    subtitle: 'BUFS留学生社区',
    tabLogin: '登录', tabSignup: '注册',
    name: '姓名', namePh: '请输入您的姓名',
    nickname: '昵称', nicknamePh: '请输入昵称',
    nicknameWarn: '请使用昵称或别名，而非真实姓名。',
    gender: '性别', male: '男', female: '女',
    nationality: '国籍', nationalityPh: '请选择国籍',
    searchNationality: '🔍 搜索国家...', noResults: '未找到结果',
    email: '邮箱', emailPh: '邮箱地址',
    pw: '密码', pwPh: '密码（6位以上）',
    pwNew: '密码', pwNewPh: '设置密码（6位以上）',
    submit: '登录', submitSignup: '注册账号',
    or: '或者',
    google: '使用Google继续', kakao: '使用Kakao继续',
    home: '← 返回首页', loading: '处理中...',
    errLogin: '邮箱或密码不正确。',
    errName: '请输入姓名。',
    errNickname: '请输入昵称。',
    errGender: '请选择性别。',
    errNationality: '请选择国籍。',
    successSignup: '✅ 注册成功！请验证邮箱后登录。',
  },
  ja: {
    titleLogin: 'ログイン', titleSignup: '新規登録',
    subtitle: 'BUFS留学生コミュニティ',
    tabLogin: 'ログイン', tabSignup: '新規登録',
    name: 'お名前', namePh: 'お名前を入力してください',
    nickname: 'ニックネーム', nicknamePh: 'ニックネームを入力してください',
    nicknameWarn: '本名ではなく、ニックネームや別名をご使用ください。',
    gender: '性別', male: '男性', female: '女性',
    nationality: '国籍', nationalityPh: '国籍を選択してください',
    searchNationality: '🔍 国名で検索...', noResults: '結果が見つかりません',
    email: 'メール', emailPh: 'メールアドレス',
    pw: 'パスワード', pwPh: 'パスワード（6文字以上）',
    pwNew: 'パスワード', pwNewPh: 'パスワード設定（6文字以上）',
    submit: 'ログイン', submitSignup: '登録する',
    or: 'または',
    google: 'Googleで続ける', kakao: 'Kakaoで続ける',
    home: '← ホームへ戻る', loading: '処理中...',
    errLogin: 'メールまたはパスワードが正しくありません。',
    errName: 'お名前を入力してください。',
    errNickname: 'ニックネームを入力してください。',
    errGender: '性別を選択してください。',
    errNationality: '国籍を選択してください。',
    successSignup: '✅ 登録完了！メール認証後にログインしてください。',
  },
};

const inputCls =
  'w-full py-3 px-4 text-base border border-gray-200 rounded-xl bg-white text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder:text-gray-400';

// 국가 검색 모드(드롭다운 열림)일 때 검색창임을 강조하는 스타일
const searchInputCls =
  'w-full py-3 px-4 text-base border border-blue-300 rounded-xl bg-blue-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder-blue-300';

// ── Searchable nationality dropdown ────────────────────────────────────────
function NationalitySearch({
  value, onChange, lang, placeholder, searchPh, noResults,
}: {
  value: string;
  onChange: (code: string) => void;
  lang: Lang;
  placeholder: string;
  searchPh: string;
  noResults: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const selected = COUNTRIES.find(c => c.code === value);

  const filtered = query.trim()
    ? COUNTRIES.filter(c =>
        c[lang].toLowerCase().includes(query.toLowerCase()) ||
        c.en.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES;

  // When open: show query text. When closed: show selected country label.
  const displayValue = open ? query : (selected ? selected[lang] : '');

  function handleFocus() {
    setOpen(true);
    setQuery('');
  }

  function handleBlur() {
    // Delay so item onClick fires before dropdown closes
    setTimeout(() => {
      setOpen(false);
      setQuery('');
    }, 150);
  }

  function selectCountry(code: string) {
    onChange(code);
    setOpen(false);
    setQuery('');
  }

  function clearSelection(e: React.MouseEvent) {
    e.preventDefault();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={open ? searchPh : placeholder}
          className={`${open ? searchInputCls : inputCls} ${value ? 'pr-16' : 'pr-10'}`}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {value && (
            <button
              type="button"
              onMouseDown={clearSelection}
              className="pointer-events-auto w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
          <span className={`text-gray-400 text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">{noResults}</p>
            ) : (
              filtered.map(country => (
                <button
                  key={country.code}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectCountry(country.code)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                    value === country.code
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {country[lang]}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [nationality, setNationality] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const t = T[lang];

  function reset() { setError(''); setMessage(''); }
  function switchMode(m: Mode) { setMode(m); reset(); }

  async function handleLogin() {
    console.log('🔥 Login attempt:', { email, mode });
    setLoading(true); reset();
    try {
      const supabase = getSupabaseClient();
      console.log('📤 Sending to Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('📥 Supabase response:', { data, error });
      if (error) {
        console.log('❌ Validation failed:', error);
        setError(t.errLogin);
      } else {
        console.log('✅ Login success, redirecting...');
        window.location.href = '/';
      }
    } catch (e) {
      console.log('💥 Error caught:', e);
    }
    setLoading(false);
  }

  async function handleSignup() {
    setLoading(true); reset();
    if (!name.trim()) { setError(t.errName); setLoading(false); return; }
    if (!nickname.trim()) { setError(t.errNickname); setLoading(false); return; }
    if (!gender) { setError(t.errGender); setLoading(false); return; }
    if (!nationality) { setError(t.errNationality); setLoading(false); return; }
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), nickname: nickname.trim(), gender, nationality } },
    });
    if (error) setError(error.message);
    else setMessage(t.successSignup);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 py-10">
      {/* Language selector */}
      <div className="w-full max-w-md flex justify-end mb-3">
        <select
          value={lang}
          onChange={e => setLang(e.target.value as Lang)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 outline-none focus:border-blue-400 transition-colors"
        >
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <option key={l} value={l}>{LANG_LABELS[l]}</option>
          ))}
        </select>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="text-4xl mb-3">🎓</div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {mode === 'login' ? t.titleLogin : t.titleSignup}
            </h1>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all active:scale-[0.98] ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? t.tabLogin : t.tabSignup}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            {mode === 'signup' && (
              <>
                {/* 0. 프로필 아바타 */}
                <div className="flex justify-center mb-1">
                  <div className="w-24 h-24 rounded-full bg-gray-300" />
                </div>

                {/* 1. 이름 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.namePh}
                    autoComplete="name"
                    className={inputCls}
                  />
                </div>

                {/* 2. 닉네임 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.nickname}</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder={t.nicknamePh}
                    autoComplete="nickname"
                    className={inputCls}
                  />
                  <p className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                    <AlertTriangle size={12} />
                    {t.nicknameWarn}
                  </p>
                </div>

                {/* 3. 성별 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.gender}</label>
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    {(['male', 'female'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-3 text-base font-medium rounded-lg transition-all active:scale-[0.98] ${
                          gender === g
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {g === 'male' ? t.male : t.female}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. 국적 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.nationality}</label>
                  <NationalitySearch
                    value={nationality}
                    onChange={setNationality}
                    lang={lang}
                    placeholder={t.nationalityPh}
                    searchPh={t.searchNationality}
                    noResults={t.noResults}
                  />
                </div>
              </>
            )}

            {/* 5. 이메일 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.emailPh}
                autoComplete="email"
                className={inputCls}
              />
            </div>

            {/* 6. 비밀번호 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">
                {mode === 'login' ? t.pw : t.pwNew}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'login' ? t.pwPh : t.pwNewPh}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={inputCls}
              />
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-3 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full mt-5 py-3 text-base font-bold rounded-xl bg-blue-500 text-white active:scale-[0.98] transition-all hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t.loading : mode === 'login' ? t.submit : t.submitSignup}
          </button>

          {/* Back */}
          <div className="text-center mt-7">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {t.home}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

