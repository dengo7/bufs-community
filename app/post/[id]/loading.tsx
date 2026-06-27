export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB] h-[54px]" />
      <div className="max-w-[600px] mx-auto px-4 pt-4 animate-pulse space-y-4">
        {/* 카테고리 배지 */}
        <div className="h-5 bg-gray-200 rounded-full w-16" />
        {/* 제목 */}
        <div className="h-7 bg-gray-200 rounded w-3/4" />
        <div className="h-7 bg-gray-200 rounded w-1/2" />
        {/* 작성자 정보 */}
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {/* 본문 */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
