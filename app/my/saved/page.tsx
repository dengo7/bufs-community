'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Heart, MessageCircle, Eye } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import BottomTabBar from '../../components/BottomTabBar';
import { getCategoryLabel, uiLangToLanguage } from '../../lib/categories';
import { formatTimeAgo } from '../../lib/utils';

type FeedPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  profiles: { nickname: string; nationality: string | null; role: string | null } | null;
};

export default function SavedPage() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [posts, setPosts]       = useState<FeedPost[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const client = getSupabaseClient();
    client.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      const u = data.user ?? null;
      setUser(u);
      setAuthLoaded(true);

      if (!u) { setLoading(false); return; }

      const { data: rows } = await client
        .from('bookmarks')
        .select(`
          created_at,
          posts (
            id, title, content, category, created_at, view_count, comment_count, like_count,
            profiles ( nickname, nationality, role )
          )
        `)
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });

      if (rows) {
        const items = (rows as unknown as Array<{ posts: FeedPost | null }>)
          .map(r => r.posts)
          .filter((p): p is FeedPost => p !== null);
        setPosts(items);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="safe-top sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="text-[15px] font-bold">저장한 글</span>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">

        {/* 비로그인 */}
        {authLoaded && !user && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-[15px] font-semibold text-[#1A1A1A] mb-2">로그인이 필요합니다</p>
            <Link
              href="/auth"
              className="mt-2 px-6 py-2.5 bg-[#F6C21A] text-[#2F2F2F] rounded-full font-bold text-sm no-underline"
            >
              로그인 / 회원가입
            </Link>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && user && (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-1/5" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && user && posts.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-[15px] text-gray-400">저장한 글이 없어요</p>
            <p className="text-[13px] text-gray-300 mt-1">글 상세에서 북마크 아이콘을 눌러 저장해 보세요</p>
          </div>
        )}

        {/* 피드 카드 */}
        {!loading && posts.length > 0 && (
          <div className="space-y-2.5">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 no-underline
                           hover:border-gray-300 active:scale-[0.99] transition-all"
              >
                {/* 카테고리 필 */}
                <span className="inline-block text-[11px] text-[#B8900E] font-semibold bg-[#FFF9E6] px-2 py-0.5 rounded-full mb-2">
                  {getCategoryLabel(post.category, uiLangToLanguage('ko'))}
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
                    <span className="text-gray-300 shrink-0">·</span>
                    <span className="shrink-0">{formatTimeAgo(post.created_at, 'ko')}</span>
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
        )}
      </div>

      <BottomTabBar user={user} />
    </div>
  );
}
