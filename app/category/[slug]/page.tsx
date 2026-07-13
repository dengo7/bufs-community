import { notFound } from 'next/navigation';
import { CATEGORY_SLUGS } from '../../lib/categories';
import CategoryView from './CategoryView';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!CATEGORY_SLUGS.includes(slug)) notFound();

  // 데이터는 클라이언트(CategoryView)에서 fetch — 껍데기를 즉시 렌더링
  return <CategoryView slug={slug} />;
}
