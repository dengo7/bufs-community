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

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id, title, content, category, created_at, view_count,
      comment_count, like_count, author_id, image_urls,
      pinned, pin_scope, pinned_at,
      profiles ( nickname, nationality, avatar_url, role )
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (error || !post) notFound();

  // view_count +1 (fire-and-forget)
  supabase
    .from('posts')
    .update({ view_count: ((post as any).view_count ?? 0) + 1 })
    .eq('id', id)
    .then(() => {});

  const { data: { user } } = await supabase.auth.getUser();

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

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id, post_id, author_id, parent_id, content, is_deleted, created_at,
      profiles ( nickname, nationality, avatar_url, role )
    `)
    .eq('post_id', id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

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
