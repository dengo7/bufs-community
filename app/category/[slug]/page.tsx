import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { CATEGORY_SLUGS } from '../../lib/categories';
import CategoryView, { type PostRow } from './CategoryView';

const GUIDE_CATEGORY_SLUGS = ['housing','bank','telecom','insurance','medical','visa','part-time'] as const;

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

  const isGuideCategory = GUIDE_CATEGORY_SLUGS.includes(slug as any);

  // 차단한 사용자 목록 (로그인 시) — 해당 작성자 게시글 제외
  const { data: { user } } = await supabase.auth.getUser();
  let blockList: string | null = null;
  if (user) {
    const { data: blocks } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id);
    const ids = (blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id);
    if (ids.length) blockList = `(${ids.join(',')})`;
  }
  // 차단 작성자 제외 필터 (.order 전에 적용)
  const withBlock = (q: any) => blockList ? q.not('author_id', 'in', blockList) : q;

  // 게시글 쿼리 병렬 실행 (서로 독립적)
  const [globalPinned, categoryPinned, regular, guide] = await Promise.all([
    // 전체 공지 (pin_scope='global') — 카테고리 무관하게 항상 표시
    withBlock(
      supabase
        .from('posts')
        .select(SELECT_FIELDS)
        .eq('is_deleted', false)
        .eq('pinned', true)
        .eq('pin_scope', 'global')
    ).order('pinned_at', { ascending: false }),
    // 카테고리 고정글 (pin_scope='category')
    withBlock(
      supabase
        .from('posts')
        .select(SELECT_FIELDS)
        .eq('category', slug)
        .eq('is_deleted', false)
        .eq('pinned', true)
        .eq('pin_scope', 'category')
    ).order('pinned_at', { ascending: false }),
    // 일반 게시글
    withBlock(
      supabase
        .from('posts')
        .select(SELECT_FIELDS)
        .eq('category', slug)
        .eq('is_deleted', false)
        .eq('pinned', false)
    )
      .order('created_at', { ascending: false })
      .limit(50),
    // 가이드 카드 — 가이드 카테고리에서만 조회
    isGuideCategory
      ? supabase
          .from('category_guides')
          .select('id, category_slug, card_type, title, content_type, rich_content, content, sort_order, updated_at')
          .eq('category_slug', slug)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] as GuideCard[] }),
  ]);

  const { data: regularData, error } = regular;
  if (error) console.error('[CategoryPage] posts query error:', error.message);

  // 전체 공지 먼저, 카테고리 고정글 뒤
  const allPinnedData = [
    ...(globalPinned.data ?? []),
    ...(categoryPinned.data ?? []),
  ];

  const guideCards = (guide.data ?? []) as GuideCard[];

  return (
    <CategoryView
      slug={slug}
      posts={(regularData ?? []) as unknown as PostRow[]}
      pinnedPosts={(allPinnedData) as unknown as PostRow[]}
      guideCards={guideCards}
    />
  );
}
