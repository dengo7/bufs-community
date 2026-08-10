import { ArrowLeft } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';

// 게시글 상세 진입 시 서버 컴포넌트(page.tsx)가 데이터를 await 하는 동안
// 보여줄 스켈레톤. 순수 정적 렌더만 하며 데이터 요청은 없다.
// 실제 PostView와 동일한 배경/최대폭/여백을 사용해 로딩 → 실제 화면
// 전환 시 레이아웃이 덜컹거리지 않게 한다.
export default function Loading() {
  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">

      {/* ── 헤더 (PostView와 동일 배치) ── */}
      <header
        className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          {/* 뒤로가기 (정적 아이콘) */}
          <div className="p-1.5 -ml-1 text-gray-300 shrink-0">
            <ArrowLeft size={22} strokeWidth={2} />
          </div>
          {/* 카테고리 라벨 자리 */}
          <div className="flex-1 flex justify-center">
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
          {/* 언어 선택 pill 자리 */}
          <div className="h-6 w-[104px] rounded-full bg-gray-100 animate-pulse shrink-0" />
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-44">

        {/* 제목 (2줄) */}
        <div className="mt-1 space-y-2">
          <div className="h-6 w-3/4 rounded bg-gray-200 animate-pulse" />
          <div className="h-6 w-1/2 rounded bg-gray-200 animate-pulse" />
        </div>

        {/* 작성자 / 시간 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
          <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-12 rounded bg-gray-100 animate-pulse ml-1" />
        </div>

        <div className="border-b border-gray-100 my-3" />

        {/* 본문 텍스트 (여러 줄) */}
        <div className="space-y-2.5">
          <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-11/12 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-full rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-4/5 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
        </div>

        <div className="border-b border-gray-100 my-5" />

        {/* 좋아요 / 댓글 / 조회 */}
        <div className="flex items-center gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-3.5 w-5 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* ── 댓글 목록 자리 (CommentSection과 동일 배치) ── */}
        <div className="mt-6 pb-2">
          {/* 댓글 개수 라벨 */}
          <div className="h-4 w-16 rounded bg-gray-100 animate-pulse mb-3" />
          <div className="space-y-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 py-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3.5 w-full rounded bg-gray-100 animate-pulse" />
                  <div className="h-3.5 w-4/5 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 하단 고정 댓글 입력창 자리 (CommentSection의 fixed 입력바 위치와 일치) ── */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-[600px] mx-auto px-4 py-2.5">
          <div className="h-10 w-full rounded-full bg-gray-100 animate-pulse" />
        </div>
      </div>

      {/* ── 하단 네비게이션 — 로딩 중에도 유지 (컴포넌트 그대로 재사용, 미수정) ── */}
      <BottomTabBar />
    </div>
  );
}
