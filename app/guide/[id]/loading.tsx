export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB] h-[54px]" />
      <div className="max-w-[600px] mx-auto px-4 pt-4 animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
    </div>
  );
}
