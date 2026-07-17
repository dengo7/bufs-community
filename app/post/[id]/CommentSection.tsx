'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, ShieldCheck, Trash2, Ban, ShieldOff, Flag, UserX } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { blockUser, getBlockedIds } from '../../lib/blocks';
import { formatTimeAgo } from '../../lib/utils';
import { REPORT_REASONS } from '../../lib/constants';
import AdminConfirmModal from '../../components/AdminConfirmModal';
import Avatar from '../../components/Avatar';
import type { CommentRow } from './PostView';
import type { UILang } from '../../lib/categories';

const T = {
  ko: {
    writeComment:  '댓글을 입력하세요',
    reply:         '답글',
    replyTo:       (name: string) => `@${name} 에게 답글`,
    submit:        '등록',
    cancel:        '취소',
    delete:        '삭제',
    confirmDelete: '정말 삭제하시겠습니까?',
    noComments:    '아직 댓글이 없어요',
    commentCount:  (n: number) => `댓글 ${n}개`,
    loginRequired: '로그인 후 댓글 작성 가능',
    login:         '로그인',
    report:        '신고하기',
    block:         '차단하기',
    confirmBlock:  '이 사용자를 차단하시겠어요?',
    blockFailed:   '차단에 실패했어요',
    reportTitle:   '댓글 신고',
    reportGuide:   '신고 사유를 선택해주세요',
    reporting:     '신고 중...',
  },
  en: {
    writeComment:  'Write a comment',
    reply:         'Reply',
    replyTo:       (name: string) => `Reply to @${name}`,
    submit:        'Post',
    cancel:        'Cancel',
    delete:        'Delete',
    confirmDelete: 'Delete this?',
    noComments:    'No comments yet',
    commentCount:  (n: number) => `${n} comment${n === 1 ? '' : 's'}`,
    loginRequired: 'Login required to comment',
    login:         'Login',
    report:        'Report',
    block:         'Block',
    confirmBlock:  'Block this user?',
    blockFailed:   'Failed to block',
    reportTitle:   'Report Comment',
    reportGuide:   'Select a reason',
    reporting:     'Reporting...',
  },
  zh: {
    writeComment:  '写评论',
    reply:         '回复',
    replyTo:       (name: string) => `回复 @${name}`,
    submit:        '发布',
    cancel:        '取消',
    delete:        '删除',
    confirmDelete: '确认删除?',
    noComments:    '暂无评论',
    commentCount:  (n: number) => `${n}条评论`,
    loginRequired: '登录后可评论',
    login:         '登录',
    report:        '举报',
    block:         '屏蔽',
    confirmBlock:  '要屏蔽该用户吗？',
    blockFailed:   '屏蔽失败',
    reportTitle:   '举报评论',
    reportGuide:   '选择举报原因',
    reporting:     '举报中...',
  },
  ja: {
    writeComment:  'コメントを書く',
    reply:         '返信',
    replyTo:       (name: string) => `@${name} に返信`,
    submit:        '投稿',
    cancel:        'キャンセル',
    delete:        '削除',
    confirmDelete: '削除しますか?',
    noComments:    'コメントはまだありません',
    commentCount:  (n: number) => `コメント ${n}件`,
    loginRequired: 'ログイン後コメント可能',
    login:         'ログイン',
    report:        '報告する',
    block:         'ブロック',
    confirmBlock:  'このユーザーをブロックしますか？',
    blockFailed:   'ブロックに失敗しました',
    reportTitle:   'コメントを報告',
    reportGuide:   '理由を選択してください',
    reporting:     '報告中...',
  },
} as const;

interface UserProfile {
  nickname: string;
  nationality: string | null;
  avatar_url: string | null;
}

interface Props {
  postId: string;
  currentUserId: string | null;
  currentUserProfile: UserProfile | null;
  isCurrentUserAdmin: boolean;
  initialComments: CommentRow[];
  lang: UILang;
  onCommentAdded: () => void;
  onCommentRemoved: () => void;
}

type CommentAdminModal = {
  type: 'banUser';
  userId: string;
  nickname: string;
} | null;

export default function CommentSection({
  postId,
  currentUserId,
  currentUserProfile,
  isCurrentUserAdmin,
  initialComments,
  lang,
  onCommentAdded,
  onCommentRemoved,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [inputText, setInputText]   = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [hiddenAuthorIds, setHiddenAuthorIds] = useState<Set<string>>(new Set());
  const [commentAdminModal, setCommentAdminModal] = useState<CommentAdminModal>(null);
  const [commentAdminLoading, setCommentAdminLoading] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const mainTextareaRef  = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 마운트 시 차단 목록 로드 — 차단한 사용자의 댓글을 숨김
  useEffect(() => {
    getBlockedIds().then(ids => {
      if (ids.length) setHiddenAuthorIds(new Set(ids));
    });
  }, []);

  const t = T[lang];
  const visibleComments = comments.filter(c => !hiddenAuthorIds.has(c.author_id));
  const topLevel  = visibleComments.filter(c => c.parent_id === null);
  const repliesOf = (parentId: string) => visibleComments.filter(c => c.parent_id === parentId);
  const canModify = (c: CommentRow) =>
    currentUserId === c.author_id || isCurrentUserAdmin;

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const submitComment = async (parentId: string | null, text: string) => {
    if (!currentUserId || !text.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentRow = {
      id: tempId,
      post_id: postId,
      author_id: currentUserId,
      parent_id: parentId,
      content: text.trim(),
      is_deleted: false,
      created_at: new Date().toISOString(),
      profiles: currentUserProfile
        ? { ...currentUserProfile, role: isCurrentUserAdmin ? 'admin' : 'user' }
        : null,
    };

    setComments(prev => [...prev, optimistic]);
    onCommentAdded();

    if (parentId) {
      setReplyingTo(null);
      setReplyText('');
    } else {
      setInputText('');
      if (mainTextareaRef.current) mainTextareaRef.current.style.height = 'auto';
    }

    try {
      const { data, error } = await getSupabaseClient()
        .from('comments')
        .insert({ post_id: postId, author_id: currentUserId, parent_id: parentId, content: text.trim() })
        .select('id, created_at')
        .single();
      if (error) throw error;
      setComments(prev =>
        prev.map(c => c.id === tempId ? { ...c, id: data.id, created_at: data.created_at } : c)
      );
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId));
      onCommentRemoved();
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm(t.confirmDelete)) return;
    setMenuOpenId(null);

    const { data, error } = await getSupabaseClient()
      .from('comments').delete().eq('id', commentId).select('id');

    if (error) { alert(`댓글 삭제 실패: ${error.message}`); return; }
    if (!data || data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제된 댓글입니다.');
      return;
    }

    const replyIds = comments.filter(c => c.parent_id === commentId).map(c => c.id);
    const removeSet = new Set([commentId, ...replyIds]);
    setComments(prev => prev.filter(c => !removeSet.has(c.id)));
    removeSet.forEach(() => onCommentRemoved());
  };

  const handleCommentBan = async (userId: string) => {
    setCommentAdminLoading(true);
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'ban' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '밴 처리 실패');
      showToast(true, '밴 처리 완료');
      setCommentAdminModal(null);
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '처리 실패');
      setCommentAdminModal(null);
    } finally {
      setCommentAdminLoading(false);
    }
  };

  const handleCommentUnban = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'unban' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '밴 해제 실패');
      showToast(true, '밴 해제 완료');
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '처리 실패');
    }
  };

  const handleCommentReport = async () => {
    if (!currentUserId || !reportTarget) return;
    if (!reportReason) return;
    if (reportBusy) return;
    setReportBusy(true);
    try {
      const { error } = await getSupabaseClient()
        .from('reports')
        .insert({
          reporter_id: currentUserId,
          target_type: 'comment',
          target_id: reportTarget,
          reason: reportReason,
        });
      if (error) throw error;
      fetch('/api/report-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'comment',
          target_id: reportTarget,
          reason: reportReason,
          reporter_id: currentUserId,
        }),
      });
      setReportTarget(null);
      setReportReason('');
    } catch (e: any) {
      if (e?.code === '23505') alert('이미 신고한 댓글이에요');
      else alert('오류가 발생했어요');
    } finally {
      setReportBusy(false);
    }
  };

  const handleBlock = async (authorId: string) => {
    setMenuOpenId(null);
    if (!confirm(t.confirmBlock)) return;
    try {
      await blockUser(authorId);
      // 차단 성공 → 해당 작성자 댓글 즉시 숨김
      setHiddenAuthorIds(prev => new Set(prev).add(authorId));
    } catch {
      showToast(false, t.blockFailed);
    }
  };

  const renderComment = (comment: CommentRow, isReply = false) => (
    <div key={comment.id} className="flex gap-2.5 py-2">
      <Avatar
        nickname={comment.profiles?.nickname ?? ''}
        avatarUrl={comment.profiles?.avatar_url ?? null}
        size={isReply ? 'sm' : 'md'}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">

        {/* 작성자 + ⋯ */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
            <span className="text-[13px] font-semibold text-gray-900">{comment.profiles?.nickname ?? '?'}</span>
            {comment.profiles?.role === 'admin' && (
              <ShieldCheck size={13} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
            )}
            <span className="text-[11px] text-gray-300">·</span>
            <span className="text-[11px] text-gray-400 shrink-0">
              {formatTimeAgo(comment.created_at, lang)}
            </span>
          </div>
          {canModify(comment) && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                className="p-1 text-gray-400 bg-transparent border-none cursor-pointer"
              >
                <MoreHorizontal size={15} strokeWidth={1.8} />
              </button>
              {menuOpenId === comment.id && (
                <>
                  <div className="fixed inset-0 z-[290]" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden min-w-[110px]">
                    <button
                      type="button"
                      onClick={() => deleteComment(comment.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                      {t.delete}
                    </button>
                    {isCurrentUserAdmin && comment.author_id !== currentUserId && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenId(null);
                            setCommentAdminModal({
                              type: 'banUser',
                              userId: comment.author_id,
                              nickname: comment.profiles?.nickname ?? '?',
                            });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                        >
                          <Ban size={13} strokeWidth={1.8} />
                          작성자 밴
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpenId(null);
                            handleCommentUnban(comment.author_id);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-gray-600 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                        >
                          <ShieldOff size={13} strokeWidth={1.8} />
                          밴 해제
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {currentUserId && !isCurrentUserAdmin && comment.author_id !== currentUserId && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpenId(menuOpenId === comment.id ? null : comment.id)}
                className="p-1 text-gray-400 bg-transparent border-none cursor-pointer"
                aria-label="메뉴"
              >
                <MoreHorizontal size={15} strokeWidth={1.8} />
              </button>
              {menuOpenId === comment.id && (
                <>
                  <div className="fixed inset-0 z-[290]" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden min-w-[110px]">
                    <button
                      type="button"
                      onClick={() => { setMenuOpenId(null); setReportTarget(comment.id); setReportReason(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                    >
                      <Flag size={13} strokeWidth={1.8} />
                      {t.report}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBlock(comment.author_id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                    >
                      <UserX size={13} strokeWidth={1.8} />
                      {t.block}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 내용 */}
        <p className="text-[13px] whitespace-pre-wrap text-gray-700 leading-relaxed mt-0.5">
          {comment.content}
        </p>

        {/* 답글 버튼 — 대댓글은 최상위 댓글(parent_id) 기준으로 입력창 오픈 (3단계 중첩 방지) */}
        {currentUserId && (() => {
          const targetId = isReply ? comment.parent_id : comment.id;
          if (!targetId) return null;
          return (
            <button
              type="button"
              onClick={() => {
                if (replyingTo === targetId) {
                  setReplyingTo(null);
                  setReplyText('');
                } else {
                  setReplyingTo(targetId);
                  setReplyText('');
                  setTimeout(() => replyTextareaRef.current?.focus(), 50);
                }
              }}
              className="mt-1.5 text-[11px] text-gray-500 bg-transparent border-none cursor-pointer p-0 hover:text-gray-700 transition-colors font-medium"
            >
              {t.reply}
            </button>
          );
        })()}
      </div>
    </div>
  );

  return (
    <>
      {/* ── 댓글 목록 ── */}
      <div className="mt-6 pb-2">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {t.commentCount(comments.length)}
        </p>

        {comments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">{t.noComments}</p>
        ) : (
          <div className="space-y-1">
            {topLevel.map(comment => {
              const replies = repliesOf(comment.id);
              return (
                <div key={comment.id} className="py-1">
                  {renderComment(comment, false)}

                  {/* 대댓글 + 답글 입력창 */}
                  {(replies.length > 0 || replyingTo === comment.id) && (
                    <div className="ml-6 pl-2.5 mb-1">
                      {replies.map(reply => renderComment(reply, true))}

                      {replyingTo === comment.id && (
                        <div className="mb-3">
                          <textarea
                            ref={replyTextareaRef}
                            value={replyText}
                            onChange={e => {
                              setReplyText(e.target.value.slice(0, 500));
                              autoResize(e.target);
                            }}
                            placeholder={t.replyTo(comment.profiles?.nickname ?? '?')}
                            rows={1}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-base
                                       resize-none focus:outline-none focus:border-gray-400 transition-colors"
                            style={{ maxHeight: '120px', overflowY: 'auto' }}
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11px] text-gray-300">{replyText.length}/500</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-full border-none cursor-pointer"
                              >
                                {t.cancel}
                              </button>
                              <button
                                type="button"
                                onClick={() => submitComment(comment.id, replyText)}
                                disabled={!replyText.trim() || isSubmitting}
                                className="px-3 py-1.5 text-xs text-white bg-[#2F2F2F] rounded-full border-none cursor-pointer
                                           disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {t.submit}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 하단 고정 댓글 입력창 ── */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[600px] mx-auto px-4 py-2.5">
          {!currentUserId ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{t.loginRequired}</span>
              <button
                type="button"
                onClick={() => router.push('/auth')}
                className="px-4 py-1.5 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-sm font-bold border-none cursor-pointer"
              >
                {t.login}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={mainTextareaRef}
                  value={inputText}
                  onChange={e => {
                    setInputText(e.target.value.slice(0, 500));
                    autoResize(e.target);
                  }}
                  placeholder={t.writeComment}
                  rows={1}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-base
                             resize-none focus:outline-none focus:border-gray-400 transition-colors"
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                />
                <button
                  type="button"
                  onClick={() => submitComment(null, inputText)}
                  disabled={!inputText.trim() || isSubmitting}
                  className="px-4 py-2 bg-[#2F2F2F] text-white rounded-xl text-sm font-medium border-none cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {t.submit}
                </button>
              </div>
              <div className="flex justify-end mt-1 pr-1">
                <span className="text-[11px] text-gray-300">{inputText.length}/500</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 댓글 관리자 확인 모달 ── */}
      {commentAdminModal?.type === 'banUser' && (
        <AdminConfirmModal
          title="이 작성자를 밴할까요?"
          description="로그인이 차단됩니다."
          confirmLabel="밴"
          loading={commentAdminLoading}
          onConfirm={() => handleCommentBan(commentAdminModal.userId)}
          onCancel={() => setCommentAdminModal(null)}
        />
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

      {reportTarget && (
        <>
          <div className="fixed inset-0 z-[390] bg-black/40" onClick={() => setReportTarget(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] bg-white rounded-2xl shadow-xl w-[280px] p-5">
            <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-1">{t.reportTitle}</h3>
            <p className="text-[12px] text-gray-400 mb-4">{t.reportGuide}</p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReportReason(value)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] border transition-colors bg-transparent cursor-pointer
                    ${reportReason === value
                      ? 'border-[#1B7CC0] text-[#1B7CC0] bg-[#EFF6FF]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {label[lang]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setReportTarget(null); setReportReason(''); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] text-gray-500 border border-gray-200 bg-transparent cursor-pointer hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleCommentReport}
                disabled={!reportReason || reportBusy}
                className="flex-1 py-2.5 rounded-xl text-[13px] text-white bg-[#1B7CC0] border-none cursor-pointer disabled:opacity-40"
              >
                {reportBusy ? t.reporting : t.report}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
