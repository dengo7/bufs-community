import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { CATEGORY_SLUGS } from '../../lib/categories';
import CategoryView, { type PostRow } from './CategoryView';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!CATEGORY_SLUGS.includes(slug)) notFound();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      created_at,
      profiles ( nickname, nationality, avatar_url, role )
    `)
    .eq('category', slug)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[CategoryPage] posts query error:', error.message);
  }

  return <CategoryView slug={slug} posts={(data ?? []) as unknown as PostRow[]} />;
}
