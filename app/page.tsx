'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient } from './lib/supabase/client';
import { getBlockedIds } from './lib/blocks';
import BottomTabBar from './components/BottomTabBar';
import HeroBanner from './components/HeroBanner';
import HomeQuickLinks from './components/HomeQuickLinks';
import NoticeSection from './components/NoticeSection';
import CampusGuideSection from './components/campus/CampusGuideSection';
import { formatTimeAgo } from './lib/utils';
import { fetchUnreadCount } from './lib/notifications';
import { getUpcoming, fmtRange } from './lib/schedule';
import { SCHEDULE_TITLE_I18N } from './lib/scheduleI18n';
import { getCategoryBySlug, getCategoryLabel, uiLangToLanguage } from './lib/categories';
import { useLang } from './lib/lang';
import {
  ShieldCheck,
  Search, Bell, Eye, Heart, MessageCircle,
  PenLine,
} from 'lucide-react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

// 홈 "최근 커뮤니티"에 미리 보여줄 최신 게시글 수 (나머지는 전체보기 → /community)
const RECENT_LIMIT = 3;

const T = {
  ko: {
    logout: '로그아웃',
    myPosts: '내가 쓴 글', commented: '댓글 단 글', scrapped: '내 스크랩',
    myInfo: '내정보',
    calendar: '학사 일정',
    headerSub: '외국인 유학생을 위한 커뮤니티',
    noPosts: '아직 게시글이 없어요',
    loadError: '게시글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    recentCommunity: '최근 커뮤니티',
    searchAria: '검색',
    notifAria: '알림',
    subtitle: '외국인 유학생을 위한 커뮤니티',
    viewAll: '전체보기 ›',
    fabAria: '글쓰기',
  },
  en: {
    logout: 'Logout',
    myPosts: 'My Posts', commented: 'Commented', scrapped: 'Scrapped',
    myInfo: 'My',
    calendar: 'Calendar',
    headerSub: 'Community for Int\'l Students',
    noPosts: 'No posts yet',
    loadError: "Couldn't load posts. Please try again later.",
    recentCommunity: 'Recent Community',
    searchAria: 'Search',
    notifAria: 'Notifications',
    subtitle: 'Community for International Students',
    viewAll: 'View all ›',
    fabAria: 'Write',
  },
  zh: {
    logout: '退出',
    myPosts: '我的帖子', commented: '我的评论', scrapped: '我的收藏',
    myInfo: '我的',
    calendar: '学校日程',
    headerSub: '留学生社区',
    noPosts: '暂无帖子',
    loadError: '无法加载帖子，请稍后再试。',
    recentCommunity: '最新社区',
    searchAria: '搜索',
    notifAria: '通知',
    subtitle: '为外国留学生打造的社区',
    viewAll: '查看全部 ›',
    fabAria: '写帖子',
  },
  ja: {
    logout: 'ログアウト',
    myPosts: '自分の投稿', commented: 'コメントした投稿', scrapped: 'スクラップ',
    myInfo: 'MY',
    calendar: '学事日程',
    headerSub: '留学生コミュニティ',
    noPosts: 'まだ投稿がありません',
    loadError: '投稿を読み込めませんでした。しばらくしてからもう一度お試しください。',
    recentCommunity: '最近のコミュニティ',
    searchAria: '検索',
    notifAria: '通知',
    subtitle: '外国人留学生のためのコミュニティ',
    viewAll: 'すべて見る ›',
    fabAria: '投稿する',
  },
} as const;

const getCatIcon = (slug: string) =>
  getCategoryBySlug(slug)?.Icon ?? null;

/** 학사일정 제목 번역 — app/schedule/page.tsx의 localTitle과 동일한 관례 */
const localScheduleTitle = (koTitle: string, lang: Lang): string => {
  if (lang === 'ko') return koTitle;
  return SCHEDULE_TITLE_I18N[koTitle]?.[lang] ?? koTitle;
};

// 최근 게시글 카테고리 칩의 연한 파스텔 색상 (slug별)
const CATEGORY_CHIP: Record<string, string> = {
  'school-life':      'bg-[#F9F3E8] text-[#92702A] border-[#EEE0C4]',
  'visa':             'bg-[#EDF4FB] text-[#2B5FA0] border-[#C4D8EE]',
  'housing':          'bg-[#EBF6F1] text-[#2A6B52] border-[#B8DDD0]',
  'bank':             'bg-[#EEF1FA] text-[#3A4A9A] border-[#C8CEEC]',
  'telecom':          'bg-[#EBF5FA] text-[#2A6A8A] border-[#B8D8EA]',
  'insurance':        'bg-[#EBF7F8] text-[#2A7080] border-[#B8D8DC]',
  'medical':          'bg-[#FAF0F2] text-[#8A3A4A] border-[#E8CDD2]',
  'part-time':        'bg-[#F3EEF9] text-[#6A3A9A] border-[#DDD0EE]',
};
const getCategoryChipClass = (slug: string) =>
  CATEGORY_CHIP[slug] ?? 'bg-slate-50 text-slate-600 border-slate-100';

type FeedPost = {
  id: string;
  author_id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  profiles: { nickname: string; role: string | null } | null;
};

export default function Home() {
  const lang = useLang();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const t = T[lang];

  // 인증 상태
  useEffect(() => {
    const client = getSupabaseClient();
    // 화면 표시 여부(authChecked) 판단용 — 로컬 세션 읽기(네트워크 왕복 없음)
    client.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      const u = data.session?.user ?? null;
      // 비로그인 시 로그인 페이지로 리다이렉트
      if (!u) { router.push('/auth'); return; }
      setUser(u);
      setAuthChecked(true);
      fetchUnreadCount(u.id).then(setUnreadCount);
      getBlockedIds(u.id).then(setBlockedIds);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const u = session?.user ?? null;
      if (!u) { router.push('/auth'); return; }
      setUser(u);
      setAuthChecked(true);
      fetchUnreadCount(u.id).then(setUnreadCount);
      getBlockedIds(u.id).then(setBlockedIds);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 최근 커뮤니티 — 기존 접근 권한(RLS)으로 조회 가능한 최신 게시글 RECENT_LIMIT개만 미리보기
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setFeedLoading(true);
      setFeedError(false);
      let query = getSupabaseClient()
        .from('posts')
        .select('id, author_id, title, content, category, created_at, view_count, comment_count, like_count, profiles(nickname, role)')
        .eq('is_deleted', false)
        .eq('pinned', false);
      if (blockedIds.length) query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(0, RECENT_LIMIT - 1);
      if (cancelled) return;
      if (error) {
        setFeedError(true);
      } else {
        setFeedPosts((data ?? []) as unknown as FeedPost[]);
      }
      setFeedLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [blockedIds]);

  async function handleLogout() {
    await getSupabaseClient().auth.signOut();
  }

  // 차단한 사용자의 게시글 숨김
  const visibleFeedPosts = feedPosts.filter(p => !blockedIds.includes(p.author_id));

  // 인증 확인 전에는 빈 화면 (비로그인이면 /auth로 리다이렉트됨)
  if (!authChecked) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">

      {/* ── MOBILE HEADER ── */}
      <header className="xl:hidden sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center min-h-[58px] px-4 gap-2">

          {/* 로고 + 부제 — 부제는 화면 폭·언어와 무관하게 항상 "The Well" 아래 두 번째 줄.
              두 줄은 로고 아이콘 옆에서 세로 가운데 정렬된다. 말줄임 없음 */}
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <img src="/the-well-logo-icon-transparent.png" alt="The Well" className="h-9 w-auto object-contain shrink-0" />
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[17px] text-[#1D4ED8] leading-tight whitespace-nowrap"><span className="font-normal">The</span> <span className="font-bold">Well</span></span>
              <span className="text-[12px] text-gray-500 leading-tight break-keep">{t.headerSub}</span>
            </div>
          </Link>

          {/* 검색·알림 (44px 터치영역). 프로필 아이콘은 하단 '내정보' 탭과 기능이 같아 제거 */}
          <div className="flex items-center gap-1 shrink-0">
            <Link href="/search" aria-label={t.searchAria} className="w-11 h-11 flex items-center justify-center text-gray-700 no-underline">
              <Search size={22} strokeWidth={1.8} />
            </Link>
            <Link href="/notifications" aria-label={t.notifAria} className="w-11 h-11 flex items-center justify-center text-gray-700 no-underline relative">
              <Bell size={22} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[#F6C21A] text-[#1A1A1A] text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ── DESKTOP NAV ── */}
      <nav className="hidden xl:block bg-white border-b border-[#EBEBEB] sticky top-0 z-[200]">
        <div className="max-w-[1200px] mx-auto px-7 flex items-center h-[68px]">

          <Link href="/" className="flex items-center gap-3 mr-11 cursor-pointer shrink-0 no-underline">
            <img src="/the-well-logo-icon-transparent.png" alt="The Well" className="h-10 w-auto object-contain" />
            <div>
              <div className="text-[19px] text-[#1D4ED8] leading-[1.1]"><span className="font-normal">The</span> <span className="font-bold">Well</span></div>
              <div className="text-[11px] text-[#64748B] leading-snug">{t.subtitle}</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <Link href="/notifications" aria-label={t.notifAria} className="text-gray-700 no-underline flex items-center relative hover:text-[#1D4ED8] transition-colors">
              <Bell size={20} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#F6C21A] text-[#1A1A1A] text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[#111827] text-sm font-semibold">{user?.user_metadata?.nickname || user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white text-[#555] border border-[#E5E7EB] rounded-full text-sm cursor-pointer hover:bg-[#F5F5F5] transition-colors"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── BODY LAYOUT ── */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-7 pt-4 sm:pt-6 pb-tabbar flex gap-6">

        {/* ── LEFT SIDEBAR (xl 이상) ── */}
        <div className="hidden xl:block w-[220px] shrink-0 space-y-8">

          {/* 프로필 카드 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-[24px_16px] text-center">
            <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-3" />
            <div className="text-[15px] font-bold mb-4">
              {user?.user_metadata?.nickname || user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#555] cursor-pointer bg-white hover:bg-[#F5F5F5] transition-colors"
            >
              {t.logout}
            </button>
          </div>

          {/* 글쓰기 (데스크톱 전용 — 모바일은 FAB) */}
          <Link
            href="/write"
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white text-[#555] text-sm font-medium border border-[#E5E7EB] rounded-lg no-underline hover:bg-[#F5F5F5] transition-colors"
          >
            <PenLine size={16} strokeWidth={1.5} />
            {t.fabAria}
          </Link>

          {/* 빠른 메뉴 (로그인 후에만) */}
          {user && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              {[
                { icon: '👤', label: t.myInfo, href: '/my' },
                { icon: '📝', label: t.myPosts, href: '/my/posts' },
                { icon: '⭐', label: t.scrapped, href: '/my/saved' },
              ].map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-[15px] text-[15px] text-[#1A1A1A] no-underline hover:bg-[#F5F5F5] transition-colors ${i < 2 ? 'border-b border-[#F5F5F5]' : ''}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* 학사일정 카드 — 빠른 메뉴와 시각적으로 분리되게 간격을 크게 둔다 */}
          <div className="mt-24 bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-[18px] py-[15px] bg-white border-b border-[#EBEBEB]">
              <span className="text-base font-bold text-[#111827]">📅 {t.calendar}</span>
            </div>
            {getUpcoming(6).map((item, i) => (
              <div key={i} className="flex gap-3 px-[18px] py-2.5 items-center border-b border-[#F5F5F5]">
                <span className="text-[12px] text-[#92702A] font-bold shrink-0 bg-[#F9F3E8] border border-[#EEE0C4] px-[7px] py-0.5 rounded whitespace-nowrap">
                  {fmtRange(item)}
                </span>
                <span className="text-sm line-clamp-1">{localScheduleTitle(item.title, lang)}</span>
              </div>
            ))}
            <div className="px-[18px] py-2.5 text-right">
              <Link href="/schedule" className="text-[12px] text-gray-400 no-underline hover:text-gray-600 transition-colors">
                {t.viewAll}
              </Link>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">

          {/* ── ① 환영 배너 (축소) ── */}
          <HeroBanner lang={lang} />

          {/* ── ② 바로가기 4개 ── */}
          <HomeQuickLinks lang={lang} />

          {/* ── ③ 학사공지 (2개 미리보기 + 전체보기) ── */}
          <NoticeSection lang={lang} />

          {/* ── ④ 최근 커뮤니티 (최신 RECENT_LIMIT개 + 전체보기) ── */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
                <h2 className="text-[15px] font-bold text-[#111827]">{t.recentCommunity}</h2>
              </div>
              <Link href="/community" className="text-[13px] text-gray-500 no-underline hover:text-gray-700 transition-colors shrink-0 py-2 -my-2">
                {t.viewAll}
              </Link>
            </div>

            {feedLoading ? (
              <div className="space-y-2">
                {Array.from({ length: RECENT_LIMIT }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#E5EAF2] p-4 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/6" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  </div>
                ))}
              </div>
            ) : feedError ? (
              <p className="text-center text-gray-500 text-[14px] py-8 bg-white rounded-2xl border border-[#E5EAF2]">
                {t.loadError}
              </p>
            ) : visibleFeedPosts.length === 0 ? (
              <p className="text-center text-gray-500 text-[14px] py-8 bg-white rounded-2xl border border-[#E5EAF2]">
                {t.noPosts}
              </p>
            ) : (
              <div className="space-y-2">
                {visibleFeedPosts.map(post => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="block bg-white rounded-2xl border border-[#E5EAF2] p-4 no-underline
                               hover:border-[#CBD5E1] transition-colors"
                  >
                    {/* 카테고리 칩 */}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[2px] rounded-md border ${getCategoryChipClass(post.category)}`}>
                      {(() => { const CatIcon = getCatIcon(post.category); return CatIcon ? <CatIcon size={10} strokeWidth={2} className="shrink-0" /> : null; })()}
                      {getCategoryLabel(post.category, uiLangToLanguage(lang))}
                    </span>

                    {/* 제목 */}
                    <h3 className="mt-1.5 text-[15px] font-semibold text-[#1A2236] truncate leading-snug">
                      {post.title}
                    </h3>

                    {/* 하단 메타 — 닉네임 · 작성 시간 · 좋아요/댓글/조회 (기존 정책 그대로) */}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[12.5px] text-slate-500">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="font-medium text-slate-600 truncate max-w-[100px]">
                          {post.profiles?.nickname ?? '?'}
                        </span>
                        {post.profiles?.role === 'admin' && (
                          <ShieldCheck size={12} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                        )}
                        <span className="text-slate-300 shrink-0">·</span>
                        <span className="shrink-0">{formatTimeAgo(post.created_at, lang)}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1">
                          <Heart size={13} strokeWidth={1.6} />
                          {post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={13} strokeWidth={1.6} />
                          {post.comment_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={13} strokeWidth={1.6} />
                          {post.view_count}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── ⑤ 캠퍼스 가이드 (기존 콘텐츠 그대로) ── */}
          <CampusGuideSection lang={lang} />
        </div>

      </div>

      {/* 홈의 글쓰기 FAB는 제거 — 글쓰기 진입은 커뮤니티 페이지에서 */}

      <BottomTabBar lang={lang} user={user} />

    </div>
  );
}
