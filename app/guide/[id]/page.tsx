import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { ChevronLeft } from 'lucide-react';

export default async function GuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: guide, error } = await supabase
    .from('category_guides')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !guide) notFound();

  const placesItems = guide.content_type === 'structured'
    ? ((guide.content as any)?.items ?? [])
    : [];

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center h-[54px] px-3 gap-2">
          <Link
            href={`/category/${guide.category_slug}`}
            className="p-1.5 -ml-1 text-gray-700 no-underline flex items-center shrink-0"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </Link>
          <span className="text-[15px] font-bold text-[#1A1A1A] truncate">{guide.title}</span>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-28">
        {guide.content_type === 'rich_text' ? (
          <p className="text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">
            {guide.rich_content ?? '내용을 준비 중이에요.'}
          </p>
        ) : guide.card_type === 'checklist' ? (
          <div className="space-y-3">
            {((guide.content as any)?.items ?? []).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
                <div className="w-5 h-5 rounded border-2 border-[#1B7CC0] shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-800">{item.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {placesItems.map((item: any, i: number) => (
              <div key={i} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100">
                <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{item.name}</p>
                {item.address && <p className="text-[13px] text-gray-500 mb-0.5">📍 {item.address}</p>}
                {item.phone   && <p className="text-[13px] text-gray-500 mb-0.5">📞 {item.phone}</p>}
                {item.note    && <p className="text-[12px] text-[#1B7CC0] mt-1">{item.note}</p>}
              </div>
            ))}
            {placesItems.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">내용을 준비 중이에요.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
