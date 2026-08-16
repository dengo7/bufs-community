'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from './lib/supabase/client';
import { getBlockedIds } from './lib/blocks';
import BottomTabBar from './components/BottomTabBar';
import HeroBanner from './components/HeroBanner';
import NoticeSection from './components/NoticeSection';
import { formatTimeAgo } from './lib/utils';
import { fetchUnreadCount } from './lib/notifications';
import { getUpcoming, fmtRange } from './lib/schedule';
import { SCHEDULE_TITLE_I18N } from './lib/scheduleI18n';
import { getCategoryBySlug, getCategoryLabel, uiLangToLanguage } from './lib/categories';
import { useLang, setLang } from './lib/lang';
import {
  ShieldCheck,
  Search, Bell, User, Eye, Heart, MessageCircle, Bookmark, BookmarkCheck, Pin,
  ChevronRight, PenLine,
} from 'lucide-react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const PAGE_SIZE = 20;

const T = {
  ko: {
    logout: '로그아웃',
    myPosts: '내가 쓴 글', commented: '댓글 단 글', scrapped: '내 스크랩',
    calendar: '학사 일정',
    noPosts: '아직 게시글이 없어요', more: '더보기',
    headerSub: '외국인 유학생을 위한 커뮤니티',
    loadingMore: '불러오는 중...',
    lifeGuide: '생활 가이드',
    adminGuide: '관리자 가이드',
    adminGuideDesc: '비자·부동산·은행 등 정착 가이드',
    community: '커뮤니티',
    allNotices: '전체 공지',
    searchAria: '검색',
    notifAria: '알림',
    myAria: '마이',
    subtitle: '외국인 유학생을 위한 커뮤니티',
    viewAll: '전체보기 ›',
    noticeBadge: '공지',
    bookmarkAria: '저장',
    bookmarkRemoveAria: '저장 해제',
    fabAria: '글쓰기',
  },
  en: {
    logout: 'Logout',
    myPosts: 'My Posts', commented: 'Commented', scrapped: 'Scrapped',
    calendar: 'Calendar',
    noPosts: 'No posts yet', more: 'More',
    headerSub: 'Community for Int\'l Students',
    loadingMore: 'Loading...',
    lifeGuide: 'Life Guide',
    adminGuide: 'Admin Guides',
    adminGuideDesc: 'Settling-in guides: visa, housing, bank & more',
    community: 'Community',
    allNotices: 'Notices',
    searchAria: 'Search',
    notifAria: 'Notifications',
    myAria: 'My page',
    subtitle: 'Community for International Students',
    viewAll: 'View all ›',
    noticeBadge: 'Notice',
    bookmarkAria: 'Save',
    bookmarkRemoveAria: 'Remove from saved',
    fabAria: 'Write',
  },
  zh: {
    logout: '退出',
    myPosts: '我的帖子', commented: '我的评论', scrapped: '我的收藏',
    calendar: '学校日程',
    noPosts: '暂无帖子', more: '更多',
    headerSub: '留学生社区',
    loadingMore: '加载中...',
    lifeGuide: '生活指南',
    adminGuide: '管理员指南',
    adminGuideDesc: '签证·租房·银行等定居指南',
    community: '社区',
    allNotices: '全体公告',
    searchAria: '搜索',
    notifAria: '通知',
    myAria: '我的',
    subtitle: '为外国留学生打造的社区',
    viewAll: '查看全部 ›',
    noticeBadge: '公告',
    bookmarkAria: '收藏',
    bookmarkRemoveAria: '取消收藏',
    fabAria: '写帖子',
  },
  ja: {
    logout: 'ログアウト',
    myPosts: '自分の投稿', commented: 'コメントした投稿', scrapped: 'スクラップ',
    calendar: '学事日程',
    noPosts: 'まだ投稿がありません', more: 'もっと見る',
    headerSub: '留学生コミュニティ',
    loadingMore: '読み込み中...',
    lifeGuide: 'ライフガイド',
    adminGuide: '管理者ガイド',
    adminGuideDesc: 'ビザ・住まい・銀行など定着ガイド',
    community: 'コミュニティ',
    allNotices: 'お知らせ',
    searchAria: '検索',
    notifAria: '通知',
    myAria: 'マイページ',
    subtitle: '外国人留学生のためのコミュニティ',
    viewAll: 'すべて見る ›',
    noticeBadge: 'お知らせ',
    bookmarkAria: '保存',
    bookmarkRemoveAria: '保存を解除',
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
  profiles: { nickname: string; nationality: string | null; role: string | null } | null;
  bookmarked?: boolean;
};

export default function Home() {
  const lang = useLang();
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedOffset, setFeedOffset] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const t = T[lang];

  // 인증 상태
  useEffect(() => {
    const client = getSupabaseClient();
    // 화면 표시 여부(authChecked) 판단용 — 로컬 세션 읽기(네트워크 왕복 없음)
    client.auth.getSession().then(async ({ data }: { data: { session: any } }) => {
      const u = data.session?.user ?? null;
      // 비로그인 시 로그인 페이지로 리다이렉트
      if (!u) { router.push('/auth'); return; }
      setUser(u);
      setAuthChecked(true);
      const { data: bms } = await getSupabaseClient()
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', u.id);
      if (bms) setBookmarks(new Set(bms.map((b: { post_id: string }) => b.post_id)));
      fetchUnreadCount(u.id).then(setUnreadCount);
      getBlockedIds(u.id).then(setBlockedIds);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
      const u = session?.user ?? null;
      if (!u) { router.push('/auth'); return; }
      setUser(u);
      setAuthChecked(true);
      fetchUnreadCount(u.id).then(setUnreadCount);
      getBlockedIds(u.id).then(setBlockedIds);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 전체 공지 로드
  useEffect(() => {
    const fetchPinned = async () => {
      const client = getSupabaseClient();
      let query = client
        .from('posts')
        .select('id, author_id, title, content, category, created_at, view_count, comment_count, like_count, pinned, pin_scope, pinned_at, profiles(nickname, nationality, role)')
        .eq('is_deleted', false)
        .eq('pinned', true)
        .eq('pin_scope', 'global');
      if (blockedIds.length) query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);
      const { data } = await query.order('pinned_at', { ascending: false });
      if (data) setPinnedPosts(data as any[]);
    };
    fetchPinned();
  }, [blockedIds]);

  // 피드 초기 로드
  useEffect(() => {
    let cancelled = false;
    setFeedLoading(true);
    const load = async () => {
      let query = getSupabaseClient()
        .from('posts')
        .select('id, author_id, title, content, category, created_at, view_count, comment_count, like_count, profiles(nickname, nationality, role)')
        .eq('is_deleted', false)
        .eq('pinned', false);
      if (blockedIds.length) query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);
      const { data } = await query
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (!cancelled && data) {
        setFeedPosts(data as unknown as FeedPost[]);
        setFeedOffset(data.length);
        setFeedHasMore(data.length === PAGE_SIZE);
        setFeedLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [blockedIds]);

  const handleFeedLoadMore = async () => {
    if (feedLoadingMore || !feedHasMore) return;
    setFeedLoadingMore(true);
    let query = getSupabaseClient()
      .from('posts')
      .select('id, author_id, title, content, category, created_at, view_count, comment_count, like_count, profiles(nickname, nationality, role)')
      .eq('is_deleted', false)
      .eq('pinned', false);
    if (blockedIds.length) query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);
    const { data } = await query
      .order('created_at', { ascending: false })
      .range(feedOffset, feedOffset + PAGE_SIZE - 1);
    if (data) {
      setFeedPosts(prev => [...prev, ...(data as unknown as FeedPost[])]);
      setFeedOffset(prev => prev + data.length);
      setFeedHasMore(data.length === PAGE_SIZE);
    }
    setFeedLoadingMore(false);
  };

  const handleBookmarkToggle = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { return; }
    const was = bookmarks.has(postId);
    setBookmarks(prev => {
      const next = new Set(prev);
      was ? next.delete(postId) : next.add(postId);
      return next;
    });
    const supabase = getSupabaseClient();
    if (was) {
      await supabase.from('bookmarks').delete()
        .eq('user_id', user.id).eq('post_id', postId);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
    }
  };

  async function handleLogout() {
    await getSupabaseClient().auth.signOut();
  }

  // 차단한 사용자의 게시글 숨김
  const visibleFeedPosts = feedPosts.filter(p => !blockedIds.includes(p.author_id));
  const visiblePinnedPosts = pinnedPosts.filter((p: any) => !blockedIds.includes(p.author_id));

  // 인증 확인 전에는 빈 화면 (비로그인이면 /auth로 리다이렉트됨)
  if (!authChecked) {
    return <div className="min-h-screen bg-[#F8FAFC]" />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">

      {/* ── MOBILE HEADER ── */}
      <header className="xl:hidden sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center min-h-[58px] px-4 gap-2">

          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <img src="/the-well-logo-icon-transparent.png" alt="The Well" className="h-9 w-auto object-contain shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] text-[#1D4ED8] leading-tight"><span className="font-normal">The</span> <span className="font-bold">Well</span></span>
              <span className="text-[12px] text-[#64748B] truncate leading-snug">{t.headerSub}</span>
            </div>
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

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/search" aria-label={t.searchAria} className="text-gray-700 no-underline flex items-center">
              <Search size={20} strokeWidth={1.8} />
            </Link>
            <Link href="/notifications" aria-label={t.notifAria} className="text-gray-700 no-underline flex items-center relative">
              <Bell size={20} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#F6C21A] text-[#1A1A1A] text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/my" aria-label={t.myAria} className="text-gray-700 no-underline flex items-center">
              <User size={20} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── DESKTOP NAV ── */}
      <nav className="hidden xl:block bg-white border-b border-[#EBEBEB] sticky top-0 z-[200]">
        <div className="max-w-[1400px] mx-auto px-7 flex items-center h-[68px]">

          <Link href="/" className="flex items-center gap-3 mr-11 cursor-pointer shrink-0 no-underline">
            <img src="/the-well-logo-icon-transparent.png" alt="The Well" className="h-10 w-auto object-contain" />
            <div>
              <div className="text-[19px] text-[#1D4ED8] leading-[1.1]"><span className="font-normal">The</span> <span className="font-bold">Well</span></div>
              <div className="text-[11px] text-[#64748B] leading-snug">{t.subtitle}</div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="flex items-center border border-[#EBEBEB] rounded-full overflow-hidden text-[12px]">
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 border-none cursor-pointer transition-colors font-medium
                    ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F] font-bold' : 'bg-transparent text-[#BBBBBB]'}`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-7 pt-4 sm:pt-6 pb-28 md:pb-10 flex gap-6">

        {/* ── LEFT SIDEBAR (xl 이상) ── */}
        <div className="hidden xl:block w-[220px] shrink-0">

          {/* 프로필 카드 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-[22px_16px] mb-4 text-center">
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

          {/* ── 히어로 배너 ── */}
          <HeroBanner lang={lang} />

          {/* ── 학사공지 ── */}
          <NoticeSection lang={lang} />

          {/* ── LIFE GUIDE ── */}
          <div className="mt-4 mb-4">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
                <h2 className="text-[14px] font-bold text-[#111827]">{t.lifeGuide}</h2>
              </div>
            </div>
            <Link
              href="/guides"
              className="flex items-center gap-3 bg-white rounded-2xl border border-[#E5E7EB] px-4 py-4 no-underline
                         hover:border-[#CBD5E1] active:scale-[0.99] transition-all"
            >
              <span className="flex h-11 w-11 items-center justify-center bg-[#EFF6FF] rounded-xl text-[#1D4ED8] shrink-0">
                <ShieldCheck size={22} strokeWidth={1.8} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#111827] leading-tight">{t.adminGuide}</p>
                <p className="mt-1 text-[12px] text-[#6B7280] leading-snug line-clamp-2">{t.adminGuideDesc}</p>
              </div>
              <ChevronRight size={18} strokeWidth={2} className="text-[#CBD5E1] shrink-0" />
            </Link>
          </div>

          {visiblePinnedPosts.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <Pin size={13} strokeWidth={2} className="text-[#1B7CC0]" />
                <span className="text-[12px] font-semibold text-[#1B7CC0]">{t.allNotices}</span>
              </div>
              <div className="space-y-2">
                {visiblePinnedPosts.map((post: any) => (
                  <Link key={post.id} href={`/post/${post.id}`}
                    className="block bg-[#DBEAFE] rounded-xl border border-[#93C5FD] p-4 no-underline">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B7CC0] bg-white border border-blue-100 px-2 py-0.5 rounded-full">
                        <Pin size={10} strokeWidth={2.5} />
                        {t.noticeBadge}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {getCategoryLabel(post.category, uiLangToLanguage(lang))}
                      </span>
                    </div>
                    <h2 className="text-[14px] font-semibold text-gray-900 mb-1 line-clamp-2">{post.title}</h2>
                    <p className="text-[12px] text-gray-500 line-clamp-2 mb-2">{post.content}</p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <span>{post.profiles?.nickname ?? '?'}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Heart size={11} strokeWidth={1.6} />
                        {post.like_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={11} strokeWidth={1.6} />
                        {post.view_count ?? 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── 커뮤니티 (최근 게시글 피드) ── */}
          <div>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
                <h2 className="text-[14px] font-bold text-[#111827]">{t.community}</h2>
              </div>
              <Link href="/community" className="text-[12px] text-gray-400 no-underline hover:text-gray-600 transition-colors shrink-0">
                {t.viewAll}
              </Link>
            </div>

            {feedLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-[#E5EAF2] p-3.5 space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/6" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  </div>
                ))}
              </div>
            ) : visibleFeedPosts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">{t.noPosts}</p>
            ) : (
              <>
                <div className="space-y-2">
                  {visibleFeedPosts.map(post => (
                    <Link
                      key={post.id}
                      href={`/post/${post.id}`}
                      className="block bg-white rounded-xl border border-[#E5EAF2] p-3.5 no-underline
                                 hover:border-[#CBD5E1] transition-colors"
                    >
                      {/* 카테고리 칩 + 북마크 */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-[1px] rounded-md border ${getCategoryChipClass(post.category)}`}>
                          {(() => { const CatIcon = getCatIcon(post.category); return CatIcon ? <CatIcon size={9} strokeWidth={2} className="shrink-0" /> : null; })()}
                          {getCategoryLabel(post.category, uiLangToLanguage(lang))}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleBookmarkToggle(e, post.id)}
                          className="p-0 bg-transparent border-none cursor-pointer shrink-0 flex items-center"
                          aria-label={bookmarks.has(post.id) ? t.bookmarkRemoveAria : t.bookmarkAria}
                        >
                          {bookmarks.has(post.id)
                            ? <BookmarkCheck size={14} strokeWidth={1.8} className="text-[#1B7CC0]" />
                            : <Bookmark size={14} strokeWidth={1.8} className="text-[#CBD5E1]" />}
                        </button>
                      </div>

                      {/* 제목 */}
                      <h2 className="text-[14.5px] font-semibold text-[#1A2236] truncate leading-snug">
                        {post.title}
                      </h2>

                      {/* 본문 미리보기 (1줄) */}
                      <p className="mt-1 text-[12.5px] text-slate-500 line-clamp-1 leading-relaxed">
                        {post.content}
                      </p>

                      {/* 하단 메타 (한 줄) */}
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="font-medium text-slate-500 truncate max-w-[80px]">
                            {post.profiles?.nickname ?? '?'}
                          </span>
                          {post.profiles?.role === 'admin' && (
                            <ShieldCheck size={11} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                          )}
                          <span className="text-slate-300 shrink-0">·</span>
                          <span className="shrink-0">{formatTimeAgo(post.created_at, lang)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-slate-400">
                          <span className="flex items-center gap-1">
                            <Heart size={12} strokeWidth={1.6} />
                            {post.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} strokeWidth={1.6} />
                            {post.comment_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={12} strokeWidth={1.6} />
                            {post.view_count}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {feedHasMore && (
                  <div className="flex justify-center mt-4">
                    <button
                      type="button"
                      onClick={handleFeedLoadMore}
                      disabled={feedLoadingMore}
                      className="px-6 py-2.5 text-[13px] text-gray-600 bg-white border border-gray-200 rounded-full
                                 cursor-pointer hover:border-gray-400 disabled:opacity-40 transition-colors"
                    >
                      {feedLoadingMore ? t.loadingMore : t.more}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (lg 이상) ── */}
        <div className="hidden lg:block w-[240px] shrink-0">
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-[18px] py-[13px] bg-white border-b border-[#EBEBEB]">
              <span className="text-base font-bold text-[#111827]">📅 {t.calendar}</span>
            </div>
            {getUpcoming(4).map((item, i, arr) => (
              <div key={i} className={`flex gap-3 px-[18px] py-2.5 items-center ${i < arr.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}>
                <span className="text-[12px] text-[#92702A] font-bold shrink-0 bg-[#F9F3E8] border border-[#EEE0C4] px-[7px] py-0.5 rounded whitespace-nowrap">
                  {fmtRange(item)}
                </span>
                <span className="text-sm line-clamp-1">{localScheduleTitle(item.title, lang)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 글쓰기 FAB ── */}
      <Link
        href="/write"
        className="md:hidden fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-40 w-14 h-14 bg-[#F6C21A] rounded-full
                   flex items-center justify-center shadow-lg active:opacity-80 transition-opacity"
        aria-label={t.fabAria}
      >
        <PenLine size={24} color="white" strokeWidth={2} />
      </Link>

      <BottomTabBar lang={lang} user={user} />

    </div>
  );
}
