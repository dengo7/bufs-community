'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from './lib/supabase/client';
import BottomTabBar from './components/BottomTabBar';
import {
  GraduationCap, Megaphone, Languages, FileText, Home as HomeIcon,
  Landmark, Smartphone, ShieldCheck, HeartPulse, Briefcase,
} from 'lucide-react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const T = {
  ko: {
    schoolName: '부산외국어대학교', schoolNameShort: '부산외국어대학교',
    subSlogan: '외국인 유학생을 위한 BUFS 생활 커뮤니티',
    login: '로그인', logout: '로그아웃', signUp: '회원가입',
    pleaseLogin: '로그인이 필요해요',
    myPosts: '내가 쓴 글', commented: '댓글 단 글', scrapped: '내 스크랩',
    calendar: '학사 일정',
    midtermResults: '중간고사 성적 발표', courseChange: '수강변경 기간', sportsDay: '체육대회', finalsStart: '기말고사 시작',
    tabHome: '홈', tabMy: 'MY',
  },
  en: {
    schoolName: 'Busan University of Foreign Studies', schoolNameShort: 'Busan Univ. of Foreign Studies',
    subSlogan: 'BUFS Community for International Students',
    login: 'Sign In', logout: 'Logout', signUp: 'Sign Up',
    pleaseLogin: 'Please sign in',
    myPosts: 'My Posts', commented: 'Commented', scrapped: 'Scrapped',
    calendar: 'Calendar',
    midtermResults: 'Midterm Results', courseChange: 'Course Change', sportsDay: 'Sports Day', finalsStart: 'Finals Start',
    tabHome: 'Home', tabMy: 'MY',
  },
  zh: {
    schoolName: '釜山外国语大学', schoolNameShort: '釜山外国语大学',
    subSlogan: '为外国留学生打造的BUFS生活社区',
    login: '登录', logout: '退出', signUp: '注册',
    pleaseLogin: '请先登录',
    myPosts: '我的帖子', commented: '我的评论', scrapped: '我的收藏',
    calendar: '学校日程',
    midtermResults: '期中考试成绩发布', courseChange: '选课变更期间', sportsDay: '运动会', finalsStart: '期末考试开始',
    tabHome: '首页', tabMy: '我的',
  },
  ja: {
    schoolName: '釜山外国語大学', schoolNameShort: '釜山外国語大学',
    subSlogan: '外国人留学生のためのBUFS生活コミュニティ',
    login: 'ログイン', logout: 'ログアウト', signUp: '新規登録',
    pleaseLogin: 'ログインしてください',
    myPosts: '自分の投稿', commented: 'コメントした投稿', scrapped: 'スクラップ',
    calendar: '学事日程',
    midtermResults: '中間試験成績発表', courseChange: '履修変更期間', sportsDay: '体育祭', finalsStart: '期末試験開始',
    tabHome: 'ホーム', tabMy: 'MY',
  },
} as const;

const CATEGORIES = [
  { slug: 'school-life',      Icon: GraduationCap, ko: '학교생활',      en: 'Campus Life',      zh: '校园生活',  ja: 'キャンパスライフ' },
  { slug: 'announcements',    Icon: Megaphone,      ko: '학교공지',      en: 'Announcements',    zh: '学校公告',  ja: 'お知らせ' },
  { slug: 'translation-help', Icon: Languages,      ko: '번역·도움요청', en: 'Translation·Help', zh: '翻译·求助', ja: '翻訳·助け' },
  { slug: 'visa',             Icon: FileText,       ko: '비자',          en: 'Visa',             zh: '签证',      ja: 'ビザ' },
  { slug: 'housing',          Icon: HomeIcon,       ko: '부동산',        en: 'Housing',          zh: '房地产',    ja: '不動産' },
  { slug: 'bank',             Icon: Landmark,       ko: '은행',          en: 'Bank',             zh: '银行',      ja: '銀行' },
  { slug: 'telecom',          Icon: Smartphone,     ko: '통신·유심',     en: 'Telecom·SIM',      zh: '通信·SIM', ja: '通信·SIM' },
  { slug: 'insurance',        Icon: ShieldCheck,    ko: '보험',          en: 'Insurance',        zh: '保险',      ja: '保険' },
  { slug: 'medical',          Icon: HeartPulse,     ko: '병원',          en: 'Medical',          zh: '医院',      ja: '病院' },
  { slug: 'part-time',        Icon: Briefcase,      ko: '알바',          en: 'Part-time',        zh: '兼职',      ja: 'アルバイト' },
] as const;

export default function Home() {
  const [lang, setLang] = useState<Lang>('ko');
  const [user, setUser] = useState<any>(null);

  const t = T[lang];
  const bLabel = (c: { ko: string; en: string; zh: string; ja: string }) =>
    lang === 'ko' ? c.ko : lang === 'en' ? c.en : lang === 'zh' ? c.zh : c.ja;

  useEffect(() => {
    const client = getSupabaseClient();
    client.auth.getUser().then(({ data }: { data: { user: any } }) => {
      setUser(data.user ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await getSupabaseClient().auth.signOut();
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── MOBILE HEADER ── */}
      <header className="xl:hidden sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="flex items-center h-[54px] px-3 gap-2">

          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <div className="bg-[#2F2F2F] rounded-[5px] px-[7px] py-[5px] grid grid-cols-2 gap-px shrink-0">
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[10px] font-extrabold text-white leading-none">F</span>
              <span className="text-[10px] font-extrabold text-white leading-none">S</span>
            </div>
            <span className="text-[13px] font-bold text-[#1A1A1A] truncate">{t.schoolNameShort}</span>
          </Link>

          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-[8px] py-[6px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {l === 'ko' ? 'KR' : l === 'en' ? 'EN' : l === 'zh' ? '中' : '日'}
              </button>
            ))}
          </div>

          <div className="flex items-center shrink-0">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center text-[#555] bg-transparent border-none cursor-pointer"
                aria-label="프로필"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            ) : (
              <a href="/auth" className="w-8 h-8 flex items-center justify-center text-[#555] no-underline" aria-label="로그인">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── DESKTOP NAV ── */}
      <nav className="hidden xl:block bg-[#2F2F2F] sticky top-0 z-[200] shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
        <div className="max-w-[1400px] mx-auto px-7 flex items-center h-[68px]">

          <Link href="/" className="flex items-center gap-3 mr-11 cursor-pointer shrink-0 no-underline">
            <div className="bg-[#4A4A4A] rounded-[6px] px-2 py-1 grid grid-cols-2 gap-px">
              <span className="text-[13px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[13px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[13px] font-extrabold text-white leading-none">F</span>
              <span className="text-[13px] font-extrabold text-white leading-none">S</span>
            </div>
            <div>
              <div className="font-normal text-[19px] text-white leading-[1.1]">{t.schoolName}</div>
              <div className="text-[11px] text-[#aaa] leading-[1.3]">Busan University of Foreign Studies</div>
              <div className="text-[11px] text-[#F6C21A] leading-[1.5] mt-0.5">{t.subSlogan}</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="flex items-center border border-[#666] rounded-full overflow-hidden text-[12px]">
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 border-none cursor-pointer transition-colors font-medium
                    ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F] font-bold' : 'bg-transparent text-[#999]'}`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[#F6C21A] text-sm font-semibold">{user.user_metadata?.nickname || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-transparent text-[#ddd] border border-[#666] rounded-full text-sm cursor-pointer"
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <a href="/auth" className="px-[22px] py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-[15px] font-bold no-underline">
                {t.login}
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* ── BODY LAYOUT ── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-7 pt-3 sm:pt-6 pb-[76px] md:pb-8 flex gap-6">

        {/* ── LEFT SIDEBAR (xl 이상) ── */}
        <div className="hidden xl:block w-[220px] shrink-0">

          {/* 프로필 카드 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-[22px_16px] mb-4 text-center">
            {user ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-3" />
                <div className="text-[15px] font-bold mb-4">
                  {user.user_metadata?.nickname || user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#555] cursor-pointer bg-white hover:bg-[#F5F5F5] transition-colors"
                >
                  {t.logout}
                </button>
              </>
            ) : (
              <>
                <div className="w-[68px] h-[68px] bg-[#F5F5F5] rounded-full mx-auto mb-[10px] flex items-center justify-center text-[30px] border-2 border-[#E5E7EB]">
                  👤
                </div>
                <div className="text-[15px] font-bold mb-[3px]">{t.pleaseLogin}</div>
                <div className="text-xs text-[#6B7280] mb-4">BUFS International</div>
                <div className="flex gap-2">
                  <a href="/auth" className="flex-1 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm no-underline text-[#333333] flex items-center justify-center">
                    {t.signUp}
                  </a>
                  <a href="/auth" className="flex-1 py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-lg text-sm font-bold no-underline flex items-center justify-center">
                    {t.login}
                  </a>
                </div>
              </>
            )}
          </div>

          {/* 빠른 메뉴 (로그인 후에만) */}
          {user && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              {[
                { icon: '📝', label: t.myPosts },
                { icon: '💬', label: t.commented },
                { icon: '⭐', label: t.scrapped },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 px-4 py-[13px] cursor-pointer text-[15px] hover:bg-[#F5F5F5] transition-colors ${i < 2 ? 'border-b border-[#F5F5F5]' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">
          {/* BUFS COMMUNITY 메인 카테고리 */}
          <div className="bg-[#2F2F2F] rounded-2xl px-4 pt-5 pb-5 mb-3 sm:mb-5">
            <p className="text-[11px] text-[#F6C21A] font-semibold tracking-widest mb-3">BUFS COMMUNITY</p>

            {/* 5×2 그리드 */}
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(({ slug, Icon, ...labels }) => (
                <Link
                  key={slug}
                  href={`/category/${slug}`}
                  className="flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl py-3 no-underline transition-colors"
                >
                  <span className="text-white/90">
                    <Icon size={26} strokeWidth={1.7} />
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-white/90 font-medium leading-tight text-center px-1 break-keep">
                    {bLabel(labels)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (lg 이상) ── */}
        <div className="hidden lg:block w-[240px] shrink-0">
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-[18px] py-[13px] bg-[#2F2F2F] border-b-2 border-b-[#F6C21A]">
              <span className="text-base font-bold text-white">📅 {t.calendar}</span>
            </div>
            {[
              { date: '05.26', event: t.midtermResults },
              { date: '06.01', event: t.courseChange },
              { date: '06.15', event: t.sportsDay },
              { date: '06.20', event: t.finalsStart },
            ].map((item, i) => (
              <div key={i} className={`flex gap-3 px-[18px] py-2.5 items-center ${i < 3 ? 'border-b border-[#F5F5F5]' : ''}`}>
                <span className="text-[13px] text-[#F6C21A] font-bold shrink-0 bg-[#2F2F2F] px-[7px] py-0.5 rounded">{item.date}</span>
                <span className="text-sm">{item.event}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomTabBar lang={lang} user={user} />

    </div>
  );
}
