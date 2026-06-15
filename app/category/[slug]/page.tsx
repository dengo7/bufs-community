import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { CATEGORY_SLUGS } from '../../lib/categories';
import CategoryView, { type PostRow } from './CategoryView';

const GUIDE_CATEGORY_SLUGS = ['housing','bank','telecom','insurance','medical'] as const;

export type GuideCard = {
  id: string;
  category_slug: string;
  card_type: 'procedure' | 'places' | 'checklist' | 'info';
  title: string;
  content_type: 'rich_text' | 'structured';
  rich_content: string | null;
  content: Record<string, unknown>;
  sort_order: number;
  updated_at: string;
};

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!CATEGORY_SLUGS.includes(slug)) notFound();

  const supabase = await createSupabaseServerClient();

  const SELECT_FIELDS = `
    id, title, content, created_at,
    pinned, pin_scope, pinned_at,
    profiles ( nickname, nationality, avatar_url, role )
  `;

  // 전체 공지 (pin_scope='global') — 카테고리 무관하게 항상 표시
  const { data: globalPinnedData } = await supabase
    .from('posts')
    .select(SELECT_FIELDS)
    .eq('is_deleted', false)
    .eq('pinned', true)
    .eq('pin_scope', 'global')
    .order('pinned_at', { ascending: false });

  // 카테고리 고정글 (pin_scope='category')
  const { data: categoryPinnedData } = await supabase
    .from('posts')
    .select(SELECT_FIELDS)
    .eq('category', slug)
    .eq('is_deleted', false)
    .eq('pinned', true)
    .eq('pin_scope', 'category')
    .order('pinned_at', { ascending: false });

  // 전체 공지 먼저, 카테고리 고정글 뒤
  const allPinnedData = [
    ...(globalPinnedData ?? []),
    ...(categoryPinnedData ?? []),
  ];

  // 일반 게시글
  const { data: regularData, error } = await supabase
    .from('posts')
    .select(SELECT_FIELDS)
    .eq('category', slug)
    .eq('is_deleted', false)
    .eq('pinned', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) console.error('[CategoryPage] posts query error:', error.message);

  const isGuideCategory = GUIDE_CATEGORY_SLUGS.includes(slug as any);
  let guideCards: GuideCard[] = [];
  if (isGuideCategory) {
    const { data: guideData } = await supabase
      .from('category_guides')
      .select('id, category_slug, card_type, title, content_type, rich_content, content, sort_order, updated_at')
      .eq('category_slug', slug)
      .order('sort_order', { ascending: true });
    guideCards = (guideData ?? []) as GuideCard[];
  }

  return (
    <CategoryView
      slug={slug}
      posts={(regularData ?? []) as unknown as PostRow[]}
      pinnedPosts={(allPinnedData) as unknown as PostRow[]}
      guideCards={guideCards}
    />
  );
}
