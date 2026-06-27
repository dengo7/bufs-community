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

  // 게시글 · 댓글 · 유저 정보는 서로 독립적이므로 병렬 실행
  const [postResult, commentsResult, userResult] = await Promise.all([
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
    supabase
      .from('comments')
      .select(`
        id, post_id, author_id, parent_id, content, is_deleted, created_at,
        profiles ( nickname, nationality, avatar_url, role )
      `)
      .eq('post_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const { data: post, error } = postResult;
  if (error || !post) notFound();

  const comments = commentsResult.data;
  const user = userResult.data.user;

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
