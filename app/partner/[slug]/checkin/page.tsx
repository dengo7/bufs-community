import { Suspense } from 'react';
import type { Metadata } from 'next';
import CheckinView from './CheckinView';

// 매장 QR 스티커가 여는 주소. 검색엔진에 노출하지 않는다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // CheckinView 는 useSearchParams 로 code 를 읽으므로 Suspense 경계가 필요하다
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <CheckinView slug={decodeURIComponent(slug)} />
    </Suspense>
  );
}
