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

  // 게시글 · 유저 정보는 서로 독립적이므로 병렬 실행
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

  // 로그인 시 차단 목록 조회 (비로그인은 빈 배열)
  let blockedIds: string[] = [];
  if (user) {
    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    blockedIds = (blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id);
  }

  // 차단한 작성자의 글이면 노출하지 않음
  if (blockedIds.includes(post.author_id)) notFound();

  // 댓글 조회 — 차단한 작성자 제외 (빈 배열이면 필터 미적용: PostgREST 빈 in() 오류 방지)
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
  await supabase.rpc('increment_view_count', { p_id: id });

  let isLiked = false;
  let currentUserProfile: { nickname: string; nationality: string | null; avatar_url: string | null } | null = null;
  let isCurrentUserAdmin = false;

  if (user) {
    const [likeResult, profileResult] = await Promise.all([
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
