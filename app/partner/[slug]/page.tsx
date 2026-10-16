import PartnerDetailView from './PartnerDetailView';

// 가게 데이터는 Supabase(partner_stores)에서 읽는다 — 클라이언트에서 조회해 언어 설정을 따른다
export default async function PartnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PartnerDetailView slug={decodeURIComponent(slug)} />;
}
