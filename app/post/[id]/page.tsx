import { after } from 'next/server';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import PostView from './PostView';

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // ── 1단계 ── 게시글 · 유저 정보는 서로 독립적이므로 병렬 실행
  const [postResult, userResult] = await Promise.all([
    supabase
      .from('posts')
      .select(`
        id, title, content, category, created_at, view_count,
        comment_count, like_count, author_id, image_urls,
        pinned, pin_scope, pinned_at,
        profiles ( nickname, nationality, avatar_url, role )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single(),
    supabase.auth.getUser(),
  ]);

  const { data: post, error } = postResult;
  if (error || !post) notFound();

  const user = userResult.data.user;

  // ── 2단계 ── user id 기반 조회. 차단목록·좋아요여부·프로필은 서로 독립적이며
  // 모두 user.id만 필요하므로(차단목록에 의존하지 않음) 동시 실행.
  // (차단목록은 이후 본문 노출 여부 판정과 댓글 필터에 사용된다)
  let blockedIds: string[] = [];
  let isLiked = false;
  let currentUserProfile: { nickname: string; nationality: string | null; avatar_url: string | null } | null = null;
  let isCurrentUserAdmin = false;

  if (user) {
    const [blocksResult, likeResult, profileResult] = await Promise.all([
      supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id),
      supabase
        .from('likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('nickname, nationality, avatar_url, role')
        .eq('id', user.id)
        .single(),
    ]);

    blockedIds = (blocksResult.data ?? []).map((b: { blocked_id: string }) => b.blocked_id);
    isLiked = !!likeResult.data;
    if (profileResult.data) {
      currentUserProfile = {
        nickname: profileResult.data.nickname,
        nationality: profileResult.data.nationality ?? null,
        avatar_url: profileResult.data.avatar_url ?? null,
      };
      isCurrentUserAdmin = (profileResult.data as any).role === 'admin';
    }
  }

  // 차단한 작성자의 글이면 노출하지 않음
  if (blockedIds.includes(post.author_id)) notFound();

  // ── 3단계 ── 댓글 조회 — 차단한 작성자 제외 (빈 배열이면 필터 미적용: PostgREST 빈 in() 오류 방지)
  // 서버 필터에 blockedIds가 필요하므로 2단계 완료 후 실행한다.
  let commentsQuery = supabase
    .from('comments')
    .select(`
      id, post_id, author_id, parent_id, content, is_deleted, created_at,
      profiles ( nickname, nationality, avatar_url, role )
    `)
    .eq('post_id', id)
    .eq('is_deleted', false);
  if (blockedIds.length) {
    commentsQuery = commentsQuery.not('author_id', 'in', `(${blockedIds.join(',')})`);
  }
  const commentsResult = await commentsQuery.order('created_at', { ascending: true });
  const comments = commentsResult.data;

  // view_count +1 (원자적 증가 RPC — 동시 조회 시에도 정확)
  // 렌더를 막지 않도록 응답 완료 후 실행(next/server after).
  after(async () => {
    const { error: rpcError } = await supabase.rpc('increment_view_count', { p_id: id });
    if (rpcError) console.error('[increment_view_count]', rpcError.message);
  });

  return (
    <PostView
      post={post as any}
      currentUserId={user?.id ?? null}
      currentUserProfile={currentUserProfile}
      isCurrentUserAdmin={isCurrentUserAdmin}
      isLiked={isLiked}
      initialComments={(comments ?? []) as any}
    />
  );
}
