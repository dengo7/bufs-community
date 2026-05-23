'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { formatTimeAgo } from '../../lib/utils';
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
  const mainTextareaRef  = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const t = T[lang];
  const topLevel  = comments.filter(c => c.parent_id === null);
  const repliesOf = (parentId: string) => comments.filter(c => c.parent_id === parentId);
  const canModify = (c: CommentRow) =>
    currentUserId === c.author_id || isCurrentUserAdmin;

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
      profiles: currentUserProfile ? { ...currentUserProfile, role: 'user' } : null,
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
    const { error } = await getSupabaseClient()
      .from('comments').update({ is_deleted: true }).eq('id', commentId);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      onCommentRemoved();
    }
  };

  // render 함수 — 컴포넌트 내부 정의 시 remount 문제 방지
  const renderComment = (comment: CommentRow, isReply = false) => (
    <div key={comment.id} className="flex gap-2.5 py-3">
      <div className="w-8 h-8 rounded-full bg-gray-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">

        {/* 작성자 + ⋯ */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
            <span className="text-[13px] font-medium">{comment.profiles?.nickname ?? '?'}</span>
            {comment.profiles?.nationality && (
              <>
                <span className="text-[12px] text-gray-400">·</span>
                <span className="text-[12px] text-gray-500">{comment.profiles.nationality}</span>
              </>
            )}
            <span className="text-[12px] text-gray-400">·</span>
            <span className="text-[12px] text-gray-400 shrink-0">
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
                <MoreVertical size={15} strokeWidth={1.8} />
              </button>
              {menuOpenId === comment.id && (
                <>
                  <div className="fixed inset-0 z-[290]" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute right-0 top-full mt-1 z-[300] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[80px]">
                    <button
                      type="button"
                      onClick={() => deleteComment(comment.id)}
                      className="w-full px-3 py-2.5 text-left text-[13px] text-red-500 bg-transparent border-none cursor-pointer hover:bg-gray-50"
                    >
                      {t.delete}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 내용 */}
        <p className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
          {comment.content}
        </p>

        {/* 답글 버튼 — 대댓글에는 없음 */}
        {!isReply && currentUserId && (
          <button
            type="button"
            onClick={() => {
              if (replyingTo === comment.id) {
                setReplyingTo(null);
                setReplyText('');
              } else {
                setReplyingTo(comment.id);
                setReplyText('');
                setTimeout(() => replyTextareaRef.current?.focus(), 50);
              }
            }}
            className="mt-1 text-xs text-gray-400 bg-transparent border-none cursor-pointer p-0 hover:text-gray-600 transition-colors"
          >
            {t.reply}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── 댓글 목록 ── */}
      <div className="mt-6">
        <p className="text-sm font-medium text-gray-700 mb-2">
          {t.commentCount(comments.length)}
        </p>

        {comments.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">{t.noComments}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {topLevel.map(comment => {
              const replies = repliesOf(comment.id);
              return (
                <div key={comment.id}>
                  {renderComment(comment, false)}

                  {/* 대댓글 */}
                  {replies.length > 0 && (
                    <div className="pl-10 ml-1 border-l-2 border-gray-100 mb-1">
                      {replies.map(reply => renderComment(reply, true))}
                    </div>
                  )}

                  {/* 답글 입력창 */}
                  {replyingTo === comment.id && (
                    <div className="pl-10 ml-1 mb-3">
                      <textarea
                        ref={replyTextareaRef}
                        value={replyText}
                        onChange={e => {
                          setReplyText(e.target.value.slice(0, 500));
                          autoResize(e.target);
                        }}
                        placeholder={t.replyTo(comment.profiles?.nickname ?? '?')}
                        rows={1}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm
                                   resize-none focus:outline-none focus:border-gray-400 transition-colors"
                        style={{ maxHeight: '120px', overflowY: 'auto' }}
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-gray-400">{replyText.length}/500</span>
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
              );
            })}
          </div>
        )}
      </div>

      {/* ── 하단 고정 댓글 입력창 ── */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100">
        <div className="max-w-[600px] mx-auto px-4 py-3">
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
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm
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
              <div className="text-right mt-1">
                <span className="text-[11px] text-gray-400">{inputText.length}/500</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
