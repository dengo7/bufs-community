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
    id, author_id, title, content, created_at,
    pinned, pin_scope, pinned_at,
    profiles ( nickname, nationality, avatar_url, role )
  `;

  const isGuideCategory = GUIDE_CATEGORY_SLUGS.includes(slug as any);

  // getUser()는 매 요청마다 Auth 서버 왕복이 발생하므로, 로컬 세션을 읽는 getSession() 사용
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // 게시글 + 차단 목록 쿼리를 모두 병렬 실행 (서로 독립적)
  // 차단 목록은 결과가 나온 뒤 JS에서 후처리 필터링 (병렬화를 위해 DB 필터 대신 사용)
  const [globalPinned, categoryPinned, regular, guide, blocks] = await Promise.all([
    // 전체 공지 (pin_scope='global') — 카테고리 무관하게 항상 표시
    supabase
      .from('posts')
      .select(SELECT_FIELDS)
      .eq('is_deleted', false)
      .eq('pinned', true)
      .eq('pin_scope', 'global')
      .order('pinned_at', { ascending: false }),
    // 카테고리 고정글 (pin_scope='category')
    supabase
      .from('posts')
      .select(SELECT_FIELDS)
      .eq('category', slug)
      .eq('is_deleted', false)
      .eq('pinned', true)
      .eq('pin_scope', 'category')
      .order('pinned_at', { ascending: false }),
    // 일반 게시글
    supabase
      .from('posts')
      .select(SELECT_FIELDS)
      .eq('category', slug)
      .eq('is_deleted', false)
      .eq('pinned', false)
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
    // 차단한 사용자 목록 (로그인 시) — 해당 작성자 게시글 제외
    user
      ? supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id)
      : Promise.resolve({ data: [] as { blocked_id: string }[] }),
  ]);

  const { data: regularData, error } = regular;
  if (error) console.error('[CategoryPage] posts query error:', error.message);

  // 차단 작성자 제외 (JS 후처리 필터)
  const blockedIds = new Set(
    ((blocks.data ?? []) as { blocked_id: string }[]).map(b => b.blocked_id)
  );
  const excludeBlocked = <T extends { author_id?: string }>(rows: T[] | null | undefined): T[] =>
    blockedIds.size
      ? (rows ?? []).filter(r => !r.author_id || !blockedIds.has(r.author_id))
      : (rows ?? []);

  // 전체 공지 먼저, 카테고리 고정글 뒤
  const allPinnedData = [
    ...excludeBlocked(globalPinned.data as { author_id?: string }[] | null),
    ...excludeBlocked(categoryPinned.data as { author_id?: string }[] | null),
  ];

  const filteredRegular = excludeBlocked(regularData as { author_id?: string }[] | null);

  const guideCards = (guide.data ?? []) as GuideCard[];

  return (
    <CategoryView
      slug={slug}
      posts={filteredRegular as unknown as PostRow[]}
      pinnedPosts={(allPinnedData) as unknown as PostRow[]}
      guideCards={guideCards}
    />
  );
}
