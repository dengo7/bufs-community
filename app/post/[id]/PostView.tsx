'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, MessageCircle, Eye,
  MoreHorizontal, ShieldCheck, Trash2, Ban, ShieldOff,
  Bookmark, BookmarkCheck, Pin, PinOff, Pencil, Flag, UserX,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { blockUser } from '../../lib/blocks';
import BottomTabBar from '../../components/BottomTabBar';
import CommentSection from './CommentSection';
import AdminConfirmModal from '../../components/AdminConfirmModal';
import Avatar from '../../components/Avatar';
import { getCategoryLabel, uiLangToLanguage, type UILang } from '../../lib/categories';
import { getLang, setLang as persistLang } from '../../lib/lang';
import { formatTimeAgo } from '../../lib/utils';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: { confirmDelete: '정말 삭제하시겠습니까?', delete: '삭제', block: '차단하기', confirmBlock: '이 사용자를 차단하시겠어요?', blockFailed: '차단에 실패했어요' },
  en: { confirmDelete: 'Delete this?',           delete: 'Delete', block: 'Block', confirmBlock: 'Block this user?', blockFailed: 'Failed to block' },
  zh: { confirmDelete: '确认删除?',               delete: '删除', block: '屏蔽', confirmBlock: '要屏蔽该用户吗？', blockFailed: '屏蔽失败' },
  ja: { confirmDelete: '削除しますか?',           delete: '削除', block: 'ブロック', confirmBlock: 'このユーザーをブロックしますか？', blockFailed: 'ブロックに失敗しました' },
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
  image_urls: string[];
  pinned:    boolean;
  pin_scope: 'global' | 'category' | null;
  pinned_at: string | null;
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

type AdminModal = 'deletePost' | 'banUser' | null;

export default function PostView({
  post,
  currentUserId,
  currentUserProfile,
  isCurrentUserAdmin,
  isLiked,
  initialComments,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<UILang>(getLang);
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [showMenu, setShowMenu] = useState(false);
  const [adminModal, setAdminModal] = useState<AdminModal>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [isPinned, setIsPinned] = useState(post.pinned ?? false);
  const [pinScope, setPinScope] = useState<'global' | 'category' | null>(post.pin_scope ?? null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);

  const t = T[lang];
  const categoryLabel = getCategoryLabel(post.category, uiLangToLanguage(lang));
  const isOwnPost = currentUserId === post.author_id;

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLike = async () => {
    if (!currentUserId) { router.push('/auth'); return; }
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

  // 비관리자 본인 글 삭제 (기존 Supabase 클라이언트 경로)
  const handleDelete = async () => {
    if (!confirm(t.confirmDelete)) return;
    setShowMenu(false);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('posts').delete().eq('id', post.id).select('id');

    if (error) { alert(`삭제 실패: ${error.message}`); return; }
    if (!data || data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제된 글입니다.');
      return;
    }

    if (post.image_urls?.length > 0) {
      const paths = post.image_urls.map(url => url.split('post-images/')[1]).filter(Boolean);
      if (paths.length > 0) {
        try { await supabase.storage.from('post-images').remove(paths); } catch { /* no-op */ }
      }
    }
    router.push(`/category/${post.category}`);
  };

  // 관리자 글 하드 삭제 (API 경로)
  const handleAdminDeletePost = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '삭제 실패');
      router.push('/');
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '삭제 실패');
      setAdminModal(null);
    } finally {
      setAdminLoading(false);
    }
  };

  // 관리자 밴
  const handleAdminBan = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: post.author_id, action: 'ban' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '밴 처리 실패');
      showToast(true, '밴 처리 완료');
      setAdminModal(null);
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '처리 실패');
      setAdminModal(null);
    } finally {
      setAdminLoading(false);
    }
  };

  // 관리자 밴 해제 (확인 없이 즉시 실행)
  const handleAdminUnban = async () => {
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: post.author_id, action: 'unban' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '밴 해제 실패');
      showToast(true, '밴 해제 완료');
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '처리 실패');
    }
  };

  // 북마크 초기화 — maybeSingle() 대신 limit(1) 사용(버전별 동작 차이 방지)
  useEffect(() => {
    if (!currentUserId || !post.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await getSupabaseClient()
        .from('bookmarks')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error('[bookmark] init error — code:', error.code,
          '| msg:', error.message, '| details:', error.details);
      }
      setIsBookmarked(Array.isArray(data) && data.length > 0);
    })();
    return () => { cancelled = true; };
  }, [currentUserId, post.id]);

  const handleBookmark = async () => {
    if (!currentUserId) { showToast(false, '로그인이 필요해요'); return; }
    if (!post.id || bookmarkBusy) return;
    const was = isBookmarked;
    setIsBookmarked(!was);
    setBookmarkBusy(true);
    try {
      const supabase = getSupabaseClient();
      if (was) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id);
        if (error) {
          console.error('[bookmark] delete — code:', error.code,
            '| msg:', error.message, '| details:', error.details);
          throw new Error(error.message);
        }
        showToast(true, '저장을 해제했어요');
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: currentUserId, post_id: post.id });
        if (error) {
          console.error('[bookmark] insert — code:', error.code,
            '| msg:', error.message, '| details:', error.details);
          throw new Error(error.message);
        }
        showToast(true, '저장했어요');
      }
    } catch (err: unknown) {
      setIsBookmarked(was);
      const msg = err instanceof Error ? err.message : '오류가 발생했어요';
      showToast(false, msg);
    } finally {
      setBookmarkBusy(false);
    }
  };

  const handleReport = async () => {
    if (!currentUserId) { showToast(false, '로그인이 필요해요'); return; }
    if (!reportReason) { showToast(false, '신고 사유를 선택해주세요'); return; }
    if (reportBusy) return;
    setReportBusy(true);
    try {
      const { error } = await getSupabaseClient()
        .from('reports')
        .insert({
          reporter_id: currentUserId,
          target_type: 'post',
          target_id: post.id,
          reason: reportReason,
        });
      if (error) throw error;
      fetch('/api/report-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'post',
          target_id: post.id,
          reason: reportReason,
          reporter_id: currentUserId,
        }),
      });
      showToast(true, '신고가 접수됐어요');
      setShowReportModal(false);
      setReportReason('');
    } catch (e: any) {
      if (e?.code === '23505') showToast(false, '이미 신고한 게시글이에요');
      else showToast(false, '오류가 발생했어요');
    } finally {
      setReportBusy(false);
    }
  };

  // 사용자 차단 — 성공 시 이전 페이지로 이동
  const handleBlock = async () => {
    setShowMenu(false);
    if (!confirm(t.confirmBlock)) return;
    try {
      await blockUser(post.author_id);
      router.back();
    } catch {
      showToast(false, t.blockFailed);
    }
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('posts')
        .update({ title: editTitle.trim(), content: editContent.trim() })
        .eq('id', post.id);
      if (!error) {
        post.title = editTitle.trim();
        post.content = editContent.trim();
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePin = async (scope: 'global' | 'category' | null) => {
    setShowMenu(false);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('toggle_pin_post', {
        p_post_id:   post.id,
        p_pinned:    scope !== null,
        p_pin_scope: scope,
      });
      if (error) throw error;
      setIsPinned(scope !== null);
      setPinScope(scope);
      showToast(true,
        scope === 'global'   ? '전체 공지로 고정됐어요' :
        scope === 'category' ? '카테고리 공지로 고정됐어요' :
                               '공지 해제됐어요'
      );
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '처리 실패');
    }
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

          {/* 언어 선택 */}
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

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-44">

        {/* 핀 배지 */}
        {isPinned && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold
                             text-[#1B7CC0] bg-[#EFF6FD] border border-blue-100
                             px-2.5 py-1 rounded-full">
              <Pin size={10} strokeWidth={2.5} />
              {pinScope === 'global' ? '전체 공지' : '카테고리 공지'}
            </span>
          </div>
        )}

        {/* 제목 */}
        {isEditing ? (
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="w-full text-xl font-bold leading-snug border border-blue-300 rounded-lg px-3 py-2 outline-none focus:border-[#1B7CC0]"
          />
        ) : (
          <h1 className="text-[18px] font-bold leading-snug text-gray-900 mt-1">{post.title}</h1>
        )}

        {/* 작성자 행 */}
        <div className="flex items-center gap-2 mt-2.5">
          <Avatar
            nickname={post.profiles?.nickname ?? ''}
            avatarUrl={post.profiles?.avatar_url ?? null}
            size="md"
          />
          <span className="text-[13px] font-semibold text-gray-900">{post.profiles?.nickname ?? '?'}</span>
          {post.profiles?.role === 'admin' && (
            <ShieldCheck size={14} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
          )}
          <span className="text-sm text-gray-300">·</span>
          <span className="text-[12px] text-gray-400 shrink-0">{formatTimeAgo(post.created_at, lang)}</span>

          {/* 저장 + ⋯ 메뉴 */}
          <div className="flex items-center gap-0.5 ml-auto shrink-0">

            {/* 북마크 */}
            <button
              type="button"
              onClick={handleBookmark}
              className="p-1 bg-transparent border-none cursor-pointer"
              aria-label={isBookmarked ? '저장 해제' : '저장'}
            >
              {isBookmarked
                ? <BookmarkCheck size={18} strokeWidth={1.8} className="text-[#F6C21A]" />
                : <Bookmark size={18} strokeWidth={1.8} className="text-gray-400" />}
            </button>

            {/* 관리자 ⋯ 메뉴 */}
            {isCurrentUserAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1 text-gray-500 bg-transparent border-none cursor-pointer"
                  aria-label="관리자 메뉴"
                >
                  <MoreHorizontal size={18} strokeWidth={1.8} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[290]" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden min-w-[130px]">
                      <button
                        onClick={() => {
                          setEditTitle(post.title);
                          setEditContent(post.content ?? '');
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil size={15} className="text-gray-500" />
                        글 수정
                      </button>
                      {/* 핀 토글 */}
                      {isPinned ? (
                        <button
                          type="button"
                          onClick={() => handleTogglePin(null)}
                          className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px]
                                     text-[#1B7CC0] bg-transparent border-none cursor-pointer hover:bg-gray-50"
                        >
                          <PinOff size={14} strokeWidth={1.8} />
                          공지 해제
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTogglePin('global')}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px]
                                       text-[#1B7CC0] bg-transparent border-none cursor-pointer hover:bg-gray-50"
                          >
                            <Pin size={14} strokeWidth={1.8} />
                            전체 공지 고정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePin('category')}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px]
                                       text-[#1B7CC0] bg-transparent border-none cursor-pointer hover:bg-gray-50"
                          >
                            <Pin size={14} strokeWidth={1.8} />
                            카테고리 고정
                          </button>
                        </>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        type="button"
                        onClick={() => { setShowMenu(false); setAdminModal('deletePost'); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                        게시물 삭제
                      </button>
                      {!isOwnPost && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setShowMenu(false); setAdminModal('banUser'); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                          >
                            <Ban size={14} strokeWidth={1.8} />
                            작성자 밴
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowMenu(false); handleAdminUnban(); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px] text-gray-600 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                          >
                            <ShieldOff size={14} strokeWidth={1.8} />
                            밴 해제
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 비관리자 본인 삭제 메뉴 */}
            {!isCurrentUserAdmin && isOwnPost && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1 text-gray-500 bg-transparent border-none cursor-pointer"
                  aria-label="메뉴"
                >
                  <MoreHorizontal size={18} strokeWidth={1.8} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[290]" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden min-w-[90px]">
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

            {/* 비관리자 + 타인 글 신고 메뉴 */}
            {!isCurrentUserAdmin && !isOwnPost && currentUserId && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1 text-gray-500 bg-transparent border-none cursor-pointer"
                  aria-label="메뉴"
                >
                  <MoreHorizontal size={18} strokeWidth={1.8} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[290]" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden min-w-[110px]">
                      <button
                        type="button"
                        onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                      >
                        <Flag size={14} strokeWidth={1.8} />
                        신고하기
                      </button>
                      <button
                        type="button"
                        onClick={handleBlock}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                      >
                        <UserX size={14} strokeWidth={1.8} />
                        {t.block}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>

        <div className="border-b border-gray-100 my-3" />

        {/* 본문 텍스트 */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={10}
              className="w-full text-[15px] leading-relaxed text-gray-800 border border-blue-300 rounded-lg px-3 py-2 outline-none focus:border-[#1B7CC0] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-[13px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleEditSave}
                disabled={isSaving}
                className="px-4 py-2 text-[13px] text-white bg-[#1B7CC0] rounded-lg hover:bg-[#1565a0] disabled:opacity-50"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed text-[14px] text-gray-700">{post.content}</p>
        )}

        {/* 첨부 이미지 */}
        {post.image_urls?.length > 0 && (
          <div className="space-y-2 mt-4">
            {post.image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-auto rounded-lg border border-gray-100 object-contain"
              />
            ))}
          </div>
        )}

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

      {/* ── 관리자 확인 모달 ── */}
      {adminModal === 'deletePost' && (
        <AdminConfirmModal
          title="게시물을 삭제할까요?"
          description="댓글·좋아요·알림까지 모두 삭제되며 복구할 수 없습니다."
          confirmLabel="삭제"
          loading={adminLoading}
          onConfirm={handleAdminDeletePost}
          onCancel={() => setAdminModal(null)}
        />
      )}
      {adminModal === 'banUser' && (
        <AdminConfirmModal
          title="이 작성자를 밴할까요?"
          description="로그인이 차단됩니다."
          confirmLabel="밴"
          loading={adminLoading}
          onConfirm={handleAdminBan}
          onCancel={() => setAdminModal(null)}
        />
      )}

      {showReportModal && (
        <>
          <div className="fixed inset-0 z-[390] bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] bg-white rounded-2xl shadow-xl w-[280px] p-5">
            <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-1">신고하기</h3>
            <p className="text-[12px] text-gray-400 mb-4">신고 사유를 선택해주세요</p>
            <div className="space-y-2 mb-4">
              {[
                { value: 'spam',    label: '스팸 / 광고' },
                { value: 'hate',    label: '욕설 / 혐오 표현' },
                { value: 'privacy', label: '개인정보 노출' },
                { value: 'other',   label: '기타' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReportReason(value)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] border transition-colors bg-transparent cursor-pointer
                    ${reportReason === value
                      ? 'border-[#1B7CC0] text-[#1B7CC0] bg-[#EFF6FF]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] text-gray-500 border border-gray-200 bg-transparent cursor-pointer hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={!reportReason || reportBusy}
                className="flex-1 py-2.5 rounded-xl text-[13px] text-white bg-[#1B7CC0] border-none cursor-pointer disabled:opacity-40"
              >
                {reportBusy ? '신고 중...' : '신고'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 토스트 ── */}
      {toast && (
        <div className={`fixed top-[62px] left-1/2 -translate-x-1/2 z-[400] whitespace-nowrap
          px-4 py-2 rounded-2xl text-sm font-medium shadow-lg pointer-events-none
          ${toast.ok ? 'bg-[#2F2F2F] text-white' : 'bg-red-500 text-white'}`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
