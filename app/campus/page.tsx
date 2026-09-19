import { Suspense } from 'react';
import CampusView from './CampusView';

// CampusView 는 useSearchParams 로 카테고리·상황 필터를 읽으므로 Suspense 경계가 필요하다
export default function CampusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <CampusView />
    </Suspense>
  );
}
