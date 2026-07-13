'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, PenLine, Pin, ShieldCheck,
  ListChecks, MapPin, ClipboardList, BookOpen, ChevronRight, ScrollText,
} from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import {
  getCategoryBySlug,
  getCategoryLabel,
  uiLangToLanguage,
  type UILang,
} from '../../lib/categories';
import { getLang, setLang as persistLang } from '../../lib/lang';
import { getSupabaseClient } from '../../lib/supabase/client';
import { getBlockedIds } from '../../lib/blocks';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const GUIDE_CATEGORY_SLUGS = ['housing', 'bank', 'telecom', 'insurance', 'medical', 'visa', 'part-time'];

const SELECT_FIELDS = `
  id, author_id, title, content, created_at,
  pinned, pin_scope, pinned_at,
  profiles ( nickname, nationality, avatar_url, role )
`;

const T = {
  ko: {
    noPosts: '아직 게시글이 없어요',
    writeFirst: '첫 글을 작성해 보세요!',
    write: '글쓰기',
    justNow: '방금 전',
  },
  en: {
    noPosts: 'No posts yet',
    writeFirst: 'Be the first to write!',
    write: 'Write',
    justNow: 'just now',
  },
  zh: {
    noPosts: '暂无帖子',
    writeFirst: '来写第一篇帖子吧！',
    write: '写作',
    justNow: '刚刚',
  },
  ja: {
    noPosts: 'まだ投稿がありません',
    writeFirst: '最初の投稿をしてみよう！',
    write: '投稿',
    justNow: 'たった今',
  },
} as const;

export interface PostRow {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  pinned:    boolean;
  pin_scope: 'global' | 'category' | null;
  pinned_at: string | null;
  profiles: {
    nickname: string;
    nationality: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
}

export type GuideCard = {
  id: string;
  category_slug: string;
  card_type: 'procedure' | 'places' | 'checklist' | 'info';
  title: string;
  content_type: 'rich_text' | 'structured';
  rich_content: string | null;
  content: Record<string, unknown>;
  sort_order: number;
  updated_at: string;
};

const GUIDE_CARD_ICONS = {
  procedure: ListChecks,
  places:    MapPin,
  checklist: ClipboardList,
  info:      ScrollText,
} as const;

function formatRelativeTime(dateStr: string, lang: UILang): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);

  if (lang === 'ko') {
    if (mins  < 1)  return '방금 전';
    if (mins  < 60) return `${mins}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }
  if (lang === 'en') {
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  if (lang === 'zh') {
    if (mins  < 1)  return '刚刚';
    if (mins  < 60) return `${mins}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }
  // ja
  if (mins  < 1)  return 'たった今';
  if (mins  < 60) return `${mins}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
}

interface Props {
  slug: string;
}

export default function CategoryView({ slug }: Props) {
  const [lang, setLang] = useState<UILang>('ko');
  useEffect(() => { setLang(getLang()); }, []);

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<PostRow[]>([]);
  const [guideCards, setGuideCards] = useState<GuideCard[]>([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드 (브라우저 Supabase 클라이언트)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const client = getSupabaseClient();
      const isGuideCategory = GUIDE_CATEGORY_SLUGS.includes(slug);

      // 게시글 + 가이드 + 차단 목록을 모두 병렬 실행
      const [blockedIds, globalPinned, categoryPinned, regular, guide] = await Promise.all([
        getBlockedIds(),
        client
          .from('posts')
          .select(SELECT_FIELDS)
          .eq('is_deleted', false)
          .eq('pinned', true)
          .eq('pin_scope', 'global')
          .order('pinned_at', { ascending: false }),
        client
          .from('posts')
          .select(SELECT_FIELDS)
          .eq('category', slug)
          .eq('is_deleted', false)
          .eq('pinned', true)
          .eq('pin_scope', 'category')
          .order('pinned_at', { ascending: false }),
        client
          .from('posts')
          .select(SELECT_FIELDS)
          .eq('category', slug)
          .eq('is_deleted', false)
          .eq('pinned', false)
          .order('created_at', { ascending: false })
          .limit(50),
        isGuideCategory
          ? client
              .from('category_guides')
              .select('id, category_slug, card_type, title, content_type, rich_content, content, sort_order, updated_at')
              .eq('category_slug', slug)
              .order('sort_order', { ascending: true })
          : Promise.resolve({ data: [] as GuideCard[] }),
      ]);

      if (cancelled) return;

      // 차단 작성자 제외 (JS 후처리 필터)
      const blocked = new Set(blockedIds);
      const exclude = (rows: unknown): PostRow[] =>
        ((rows ?? []) as PostRow[]).filter(r => !blocked.size || !blocked.has(r.author_id));

      setPinnedPosts([
        ...exclude(globalPinned.data),
        ...exclude(categoryPinned.data),
      ]);
      setPosts(exclude(regular.data));
      setGuideCards((guide.data ?? []) as GuideCard[]);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [slug]);

  const t = T[lang];
  const category = getCategoryBySlug(slug);
  const categoryName = getCategoryLabel(slug, uiLangToLanguage(lang));
  const Icon = category?.Icon;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* 헤더 */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center min-h-[54px] px-3 gap-2">

          <Link
            href="/"
            className="p-1.5 -ml-1 text-gray-700 no-underline flex items-center shrink-0"
            aria-label="홈으로"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </Link>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {Icon && <Icon size={17} className="text-gray-700 shrink-0" strokeWidth={1.8} />}
            <span className="text-[15px] font-bold text-[#1A1A1A] truncate">{categoryName}</span>
          </div>

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

      {/* 글 목록 */}
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">
        {loading ? (
          /* 로딩 중 — 게시글 목록 자리에 스켈레톤 표시 (헤더/언어필터는 그대로) */
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-4/5 mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-100 rounded w-16" />
                  <div className="h-3 bg-gray-100 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
        {/* 가이드 섹션 */}
        {guideCards.length > 0 && (
          <div className="mb-5 bg-[#EFF6FD] rounded-2xl border border-blue-100 overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-blue-100">
              <BookOpen size={15} strokeWidth={2} className="text-[#1B7CC0]" />
              <span className="text-[13px] font-semibold text-[#1B7CC0]">관리자 가이드</span>
            </div>

            {/* 카드 그리드 */}
            <div className={`grid gap-2 p-3 ${guideCards.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {guideCards.map(card => {
                const CardIcon = GUIDE_CARD_ICONS[card.card_type];
                return (
                  <Link
                    key={card.id}
                    href={`/guide/${card.id}`}
                    className="bg-white rounded-xl border border-blue-100 p-3 no-underline
                               hover:border-blue-200 active:scale-[0.98] transition-all
                               flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6FD] flex items-center justify-center shrink-0">
                      <CardIcon size={16} strokeWidth={1.8} className="text-[#1B7CC0]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#1A1A1A] leading-tight truncate">
                        {card.title}
                      </p>
                    </div>
                    <ChevronRight size={14} strokeWidth={2} className="text-[#1B7CC0] shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* 최종 수정 */}
            {guideCards[0]?.updated_at && (
              <p className="text-[10px] text-[#1B7CC0] opacity-60 text-right px-4 pb-2.5">
                최종 수정 {formatRelativeTime(guideCards[0].updated_at, lang)}
              </p>
            )}
          </div>
        )}

        {/* 공지 섹션 */}
        {pinnedPosts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <Pin size={13} strokeWidth={2} className="text-[#1B7CC0]" />
              <span className="text-[12px] font-semibold text-[#1B7CC0]">공지</span>
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
                      {post.pin_scope === 'global' ? '전체 공지' : '카테고리 공지'}
                    </span>
                  </div>
                  <h2 className="text-[14px] font-semibold text-[#1A1A1A] truncate mb-1 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-[13px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-600 truncate max-w-[80px]">
                        {post.profiles?.nickname ?? '?'}
                      </span>
                      <ShieldCheck size={11} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                    </div>
                    <span>{formatRelativeTime(post.created_at, lang)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 일반 게시글 또는 빈 상태 */}
        {posts.length === 0 ? (
          pinnedPosts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[15px] text-gray-400 mb-2">{t.noPosts}</p>
              <Link
                href={`/write?category=${slug}`}
                className="inline-flex items-center gap-1.5 mt-2 px-5 py-2.5 bg-[#F6C21A] text-[#2F2F2F]
                           rounded-full text-[13px] font-bold no-underline hover:opacity-90 transition-opacity"
              >
                <PenLine size={15} strokeWidth={2} />
                {t.writeFirst}
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 no-underline
                           hover:border-gray-300 active:scale-[0.99] transition-all"
              >
                <h2 className="text-[15px] font-semibold text-[#1A1A1A] truncate mb-1 leading-snug">
                  {post.title}
                </h2>
                <p className="text-[13px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                  {post.content}
                </p>
                <div className="flex items-center justify-between text-[12px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-600">
                      {post.profiles?.nickname ?? '?'}
                    </span>
                    {post.profiles?.role === 'admin' && (
                      <ShieldCheck size={11} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                    )}
                  </div>
                  <span>{formatRelativeTime(post.created_at, lang)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* 플로팅 글쓰기 버튼 (모바일) */}
      <Link
        href={`/write?category=${slug}`}
        className="md:hidden fixed bottom-[88px] right-4 z-40 w-14 h-14 bg-[#F6C21A] rounded-full
                   flex items-center justify-center shadow-lg active:opacity-80 transition-opacity"
        aria-label={t.write}
      >
        <PenLine size={24} color="white" strokeWidth={2} />
      </Link>

      <BottomTabBar lang={lang} />
    </div>
  );
}
