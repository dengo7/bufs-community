export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB] h-[54px]" />
      <div className="max-w-[600px] mx-auto px-4 pt-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
