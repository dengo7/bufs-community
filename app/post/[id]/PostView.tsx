'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, MessageCircle, Eye, MoreVertical } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import BottomTabBar from '../../components/BottomTabBar';
import CommentSection from './CommentSection';
import { getCategoryLabel, uiLangToLanguage, type UILang } from '../../lib/categories';
import { formatTimeAgo } from '../../lib/utils';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: { confirmDelete: '정말 삭제하시겠습니까?', delete: '삭제' },
  en: { confirmDelete: 'Delete this?',           delete: 'Delete' },
  zh: { confirmDelete: '确认删除?',               delete: '删除' },
  ja: { confirmDelete: '削除しますか?',           delete: '削除' },
} as const;

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  profiles: {
    nickname: string;
    nationality: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
};

export type PostWithProfile = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  author_id: string;
  profiles: {
    nickname: string;
    nationality: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
};

interface Props {
  post: PostWithProfile;
  currentUserId: string | null;
  currentUserProfile: { nickname: string; nationality: string | null; avatar_url: string | null } | null;
  isCurrentUserAdmin: boolean;
  isLiked: boolean;
  initialComments: CommentRow[];
}

export default function PostView({
  post,
  currentUserId,
  currentUserProfile,
  isCurrentUserAdmin,
  isLiked,
  initialComments,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<UILang>('ko');
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [showMenu, setShowMenu] = useState(false);

  const t = T[lang];
  const categoryLabel = getCategoryLabel(post.category, uiLangToLanguage(lang));
  const canDelete = currentUserId === post.author_id || isCurrentUserAdmin;

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/auth');
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => wasLiked ? c - 1 : c + 1);
    try {
      const supabase = getSupabaseClient();
      if (wasLiked) {
        const { error } = await supabase.from('likes').delete()
          .eq('post_id', post.id).eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes')
          .insert({ post_id: post.id, user_id: currentUserId });
        if (error) throw error;
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => wasLiked ? c + 1 : c - 1);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.confirmDelete)) return;
    setShowMenu(false);
    const { data, error } = await getSupabaseClient()
      .from('posts')
      .delete()
      .eq('id', post.id)
      .select('id');

    console.log('[PostDelete] data:', data, 'error:', error);

    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제된 글입니다.\n(RLS policy를 확인하세요)');
      return;
    }
    router.push(`/category/${post.category}`);
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>

          <span className="flex-1 text-[15px] font-medium text-center truncate">
            {categoryLabel}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {/* 언어 선택 */}
            <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px]">
              {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                    ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>

            {/* ⋯ 메뉴 — 본인/admin만 */}
            {canDelete && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1 text-gray-500 bg-transparent border-none cursor-pointer"
                  aria-label="메뉴"
                >
                  <MoreVertical size={20} strokeWidth={1.8} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[290]" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[90px]">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="w-full px-4 py-3 text-left text-[14px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-44">

        {/* 제목 */}
        <h1 className="text-xl font-bold leading-snug">{post.title}</h1>

        {/* 작성자 행 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0" />
          <span className="text-sm font-medium">{post.profiles?.nickname ?? '?'}</span>
          {post.profiles?.nationality && (
            <>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-500">{post.profiles.nationality}</span>
            </>
          )}
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500 shrink-0">{formatTimeAgo(post.created_at, lang)}</span>
        </div>

        <div className="border-b border-gray-100 my-4" />

        {/* 본문 텍스트 */}
        <p className="text-base whitespace-pre-wrap leading-relaxed text-gray-800">
          {post.content}
        </p>

        <div className="border-b border-gray-100 my-5" />

        {/* 좋아요 / 댓글 / 조회 */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
            aria-label="좋아요"
          >
            <Heart
              size={20}
              strokeWidth={1.8}
              className={liked ? 'text-black fill-current' : 'text-gray-500'}
            />
            <span className={`text-sm ${liked ? 'text-black font-medium' : 'text-gray-500'}`}>
              {likeCount}
            </span>
          </button>

          <div className="flex items-center gap-1.5 text-gray-500">
            <MessageCircle size={20} strokeWidth={1.8} />
            <span className="text-sm">{commentCount}</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-500">
            <Eye size={20} strokeWidth={1.8} />
            <span className="text-sm">{post.view_count ?? 0}</span>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <CommentSection
          postId={post.id}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          isCurrentUserAdmin={isCurrentUserAdmin}
          initialComments={initialComments}
          lang={lang}
          onCommentAdded={() => setCommentCount(c => c + 1)}
          onCommentRemoved={() => setCommentCount(c => Math.max(0, c - 1))}
        />
      </div>

      <BottomTabBar lang={lang} user={currentUserId ? { id: currentUserId } : undefined} />
    </div>
  );
}
