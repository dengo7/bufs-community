import ProgramDetailView from './ProgramDetailView';

// 프로그램 데이터는 Supabase(extracurricular_programs)에서 읽는다 — 클라이언트에서 조회해 언어 설정을 따른다
export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProgramDetailView slug={decodeURIComponent(slug)} />;
}
