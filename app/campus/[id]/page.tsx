import { notFound } from 'next/navigation';
import { CAMPUS_FACILITIES, getFacilityById } from '../../lib/campusFacilities';
import FacilityDetailView from './FacilityDetailView';

export function generateStaticParams() {
  return CAMPUS_FACILITIES.map(f => ({ id: f.id }));
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
