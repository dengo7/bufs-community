import type { Metadata } from 'next';
import CouponView from './CouponView';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CouponPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CouponView slug={decodeURIComponent(slug)} />;
}
