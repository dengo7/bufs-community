'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Heart, MessageCircle, Eye, PenLine, ShieldCheck, Pin } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import BottomTabBar from '../components/BottomTabBar';
import {
  CATEGORIES,
  getCategoryLabel,
  uiLangToLanguage,
  type UILang,
  type CategorySlug,
} from '../lib/categories';
import { formatTimeAgo } from '../lib/utils';
import { getLang, setLang as persistLang } from '../lib/lang';

const PAGE_SIZE = 20;

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };
const ALL_LABEL: Record<UILang, string> = { ko: '전체', en: 'All', zh: '全部', ja: 'すべて' };

type FeedPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  pinned: boolean;
  pin_scope: 'global' | 'category' | null;
  pinned_at: string | null;
  profiles: { nickname: string; nationality: string | null; role: string | null } | null;
};

export default function CommunityPage() {
  const router = useRouter();
  const [lang, setLang] = useState<UILang>(getLang);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<FeedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 전체 공지 로드
  useEffect(() => {
    const fetchPinned = async () => {
      const client = getSupabaseClient();
      const { data } = await client
        .from('posts')
        .select('id, title, content, category, created_at, view_count, comment_count, like_count, pinned, pin_scope, pinned_at, profiles(nickname, nationality, role)')
        .eq('is_deleted', false)
        .eq('pinned', true)
        .eq('pin_scope', 'global')
        .order('pinned_at', { ascending: false });
      if (data) setPinnedPosts(data as unknown as FeedPost[]);
    };
    fetchPinned();
  }, []);

  // 카테고리 변경 시 초기 로드
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setPosts([]);
    setOffset(0);
    setHasMore(true);

    const load = async () => {
      const client = getSupabaseClient();
      let query = client
        .from('posts')
        .select('id, title, content, category, created_at, view_count, comment_count, like_count, profiles(nickname, nationality, role)')
        .eq('is_deleted', false)
        .eq('pinned', false);

      if (selectedCategory) query = query.eq('category', selectedCategory);

      const { data } = await query
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (!cancelled && data) {
        setPosts(data as unknown as FeedPost[]);
        setOffset(data.length);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedCategory]);

  // 더보기
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const client = getSupabaseClient();
    let query = client
      .from('posts')
      .select('id, title, content, category, created_at, view_count, comment_count, like_count, profiles(nickname, nationality, role)')
      .eq('is_deleted', false)
      .eq('pinned', false);

    if (selectedCategory) query = query.eq('category', selectedCategory);

    const { data } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (data) {
      setPosts(prev => [...prev, ...(data as unknown as FeedPost[])]);
      setOffset(prev => prev + data.length);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center h-[54px] px-4 gap-2">
          <span className="flex-1 text-[15px] font-bold text-[#1A1A1A]">커뮤니티</span>
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); persistLang(l); }}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 검색바 ── */}
      <div className="bg-white px-4 pt-3 pb-2.5 max-w-[600px] mx-auto">
        <button
          type="button"
          onClick={() => router.push('/search')}
          className="w-full flex items-center gap-2.5 bg-[#F5F6FA] border border-[#EBEBEB] rounded-xl px-4 py-2.5 cursor-pointer"
        >
          <Search size={15} strokeWidth={1.8} className="text-gray-400 shrink-0" />
          <span className="text-[14px] text-gray-400">게시글 검색</span>
        </button>
      </div>

      {/* ── 카테고리 필터 탭 ── */}
      <div className="bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-colors
              ${!selectedCategory
                ? 'bg-[#2F2F2F] text-white border-[#2F2F2F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
          >
            {ALL_LABEL[lang]}
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-colors
                ${selectedCategory === cat.slug
                  ? 'bg-[#F6C21A] text-[#2F2F2F] border-[#F6C21A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            >
              {getCategoryLabel(cat.slug, uiLangToLanguage(lang))}
            </button>
          ))}
        </div>
      </div>

      {/* ── 피드 리스트 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-3 pb-44">
        {!loading && pinnedPosts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <Pin size={13} strokeWidth={2} className="text-[#1B7CC0]" />
              <span className="text-[12px] font-semibold text-[#1B7CC0]">전체 공지</span>
            </div>
            <div className="space-y-2">
              {pinnedPosts.map(post => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="block bg-[#EFF6FD] rounded-xl border border-blue-100 p-4 no-underline
                             hover:border-blue-200 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold
                                     text-[#1B7CC0] bg-white border border-blue-100
                                     px-2 py-0.5 rounded-full">
                      <Pin size={10} strokeWidth={2.5} />
                      공지
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {getCategoryLabel(post.category, uiLangToLanguage(lang))}
                    </span>
                  </div>
                  <h2 className="text-[15px] font-semibold text-[#1A1A1A] truncate leading-snug mb-1">
                    {post.title}
                  </h2>
                  <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed mb-2.5">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-600 truncate max-w-[80px]">
                        {post.profiles?.nickname ?? '?'}
                      </span>
                      <ShieldCheck size={11} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-0.5">
                        <Heart size={11} strokeWidth={1.6} />{post.like_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Eye size={11} strokeWidth={1.6} />{post.view_count}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/5" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-16">게시글이 없어요</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 no-underline
                             hover:border-gray-300 active:scale-[0.99] transition-all"
                >
                  {/* 카테고리 필 */}
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#B8900E] font-semibold bg-[#FFF9E6] px-2 py-0.5 rounded-full mb-2">
                    {(() => { const cat = CATEGORIES.find(c => c.slug === post.category); return cat?.Icon ? <cat.Icon size={10} strokeWidth={2} className="shrink-0" /> : null; })()}
                    {getCategoryLabel(post.category, uiLangToLanguage(lang))}
                  </span>

                  {/* 제목 */}
                  <h2 className="text-[15px] font-semibold text-[#1A1A1A] truncate leading-snug mb-1">
                    {post.title}
                  </h2>

                  {/* 본문 미리보기 */}
                  <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed mb-2.5">
                    {post.content}
                  </p>

                  {/* 하단 메타 */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="font-medium text-gray-600 truncate max-w-[80px]">
                        {post.profiles?.nickname ?? '?'}
                      </span>
                      {post.profiles?.role === 'admin' && (
                        <ShieldCheck size={11} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                      )}
                      {post.profiles?.nationality && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="truncate">{post.profiles.nationality}</span>
                        </>
                      )}
                      <span className="text-gray-300 shrink-0">·</span>
                      <span className="shrink-0">{formatTimeAgo(post.created_at, lang)}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="flex items-center gap-0.5">
                        <Heart size={11} strokeWidth={1.6} />
                        {post.like_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle size={11} strokeWidth={1.6} />
                        {post.comment_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Eye size={11} strokeWidth={1.6} />
                        {post.view_count}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 더보기 버튼 */}
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 text-[13px] text-gray-600 bg-white border border-gray-200 rounded-full
                             cursor-pointer hover:border-gray-400 disabled:opacity-40 transition-colors"
                >
                  {loadingMore ? '불러오는 중...' : '더보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 글쓰기 FAB ── */}
      <Link
        href="/write"
        className="md:hidden fixed bottom-[88px] right-4 z-40 w-14 h-14 bg-[#F6C21A] rounded-full
                   flex items-center justify-center shadow-lg active:opacity-80 transition-opacity"
        aria-label="글쓰기"
      >
        <PenLine size={24} color="white" strokeWidth={2} />
      </Link>

      <BottomTabBar lang={lang} />
    </div>
  );
}
