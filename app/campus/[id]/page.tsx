import { notFound } from 'next/navigation';
import { CAMPUS_FACILITIES, getFacilityById } from '../../lib/campusFacilities';
import FacilityDetailView from './FacilityDetailView';

export function generateStaticParams() {
  // shuttle 은 전용 페이지(app/campus/shuttle)가 있으므로 공용 상세에서 제외
  return CAMPUS_FACILITIES.filter(f => f.id !== 'shuttle').map(f => ({ id: f.id }));
}

export default async function FacilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const facility = getFacilityById(decodeURIComponent(id));
  if (!facility) notFound();

  return <FacilityDetailView facility={facility} />;
}
