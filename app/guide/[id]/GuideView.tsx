'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Pencil, X, Check, Plus, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';

type PlaceItem = { name: string; address?: string; phone?: string; note?: string };
type CheckItem = { id: number; text: string };

type Guide = {
  id: string;
  category_slug: string;
  card_type: 'procedure' | 'places' | 'checklist' | 'info';
  title: string;
  content_type: 'rich_text' | 'structured';
  rich_content: string | null;
  content: { items?: PlaceItem[] | CheckItem[] };
};

interface Props {
  guide: Guide;
  isAdmin: boolean;
}

export default function GuideView({ guide, isAdmin }: Props) {
  const [isAdminChecked, setIsAdminChecked] = useState(isAdmin);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setIsAdminChecked(data?.role === 'admin');
    };
    checkAdmin();
  }, []);

  const [richText, setRichText] = useState(guide.rich_content ?? '');
  const [places, setPlaces] = useState<PlaceItem[]>(
    guide.content_type === 'structured' && guide.card_type === 'places'
      ? ((guide.content?.items ?? []) as PlaceItem[])
      : []
  );
  const [checks, setChecks] = useState<CheckItem[]>(
    guide.content_type === 'structured' && guide.card_type === 'checklist'
      ? ((guide.content?.items ?? []) as CheckItem[])
      : []
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const isStructured = guide.content_type === 'structured';
      const { error } = await supabase.rpc('update_category_guide', {
        p_id: guide.id,
        p_rich_content: !isStructured ? richText : null,
        p_content: isStructured
          ? { items: guide.card_type === 'places' ? places : checks }
          : null,
        p_title: null,
      });
      if (error) throw error;
      showToast(true, '저장됐어요');
      setEditing(false);
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const addPlace = () =>
    setPlaces(prev => [...prev, { name: '', address: '', phone: '', note: '' }]);

  const updatePlace = (i: number, field: keyof PlaceItem, value: string) =>
    setPlaces(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  const removePlace = (i: number) =>
    setPlaces(prev => prev.filter((_, idx) => idx !== i));

  const addCheck = () =>
    setChecks(prev => [...prev, { id: Date.now(), text: '' }]);

  const updateCheck = (i: number, value: string) =>
    setChecks(prev => prev.map((c, idx) => idx === i ? { ...c, text: value } : c));

  const removeCheck = (i: number) =>
    setChecks(prev => prev.filter((_, idx) => idx !== i));

  const placesItems = (guide.content?.items ?? []) as PlaceItem[];
  const checkItems  = (guide.content?.items ?? []) as CheckItem[];

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <Link
            href={`/category/${guide.category_slug}`}
            className="p-1.5 -ml-1 text-gray-700 no-underline flex items-center shrink-0"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </Link>
          <span className="text-[15px] font-bold text-[#1A1A1A] flex-1 truncate">
            {guide.title}
          </span>
          {isAdminChecked && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
                         text-[#1B7CC0] bg-[#EFF6FD] border border-blue-100 rounded-full
                         cursor-pointer border-none"
            >
              <Pencil size={12} strokeWidth={2} />
              편집
            </button>
          )}
          {isAdminChecked && editing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="p-1.5 text-gray-400 bg-transparent border-none cursor-pointer"
              >
                <X size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium
                           text-white bg-[#1B7CC0] rounded-full cursor-pointer
                           border-none disabled:opacity-50"
              >
                <Check size={12} strokeWidth={2.5} />
                {saving ? '저장 중' : '저장'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-28">

        {/* rich_text (절차 안내 / 정보 정리) */}
        {guide.content_type === 'rich_text' && (
          editing ? (
            <textarea
              value={richText}
              onChange={e => setRichText(e.target.value)}
              className="w-full min-h-[300px] text-[15px] text-gray-800 leading-relaxed
                         border border-blue-200 rounded-xl p-4 resize-none
                         focus:outline-none focus:border-[#1B7CC0]"
              placeholder="내용을 입력해주세요"
            />
          ) : (
            <p className="text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">
              {richText || '내용을 준비 중이에요.'}
            </p>
          )
        )}

        {/* places (추천 업체/병원/지점) */}
        {guide.content_type === 'structured' && guide.card_type === 'places' && (
          <div className="space-y-3">
            {(editing ? places : placesItems).map((item, i) => (
              editing ? (
                <div key={i} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.name}
                      onChange={e => updatePlace(i, 'name', e.target.value)}
                      placeholder="업체명 *"
                      className="flex-1 text-[13px] border border-gray-200 rounded-lg px-3 py-2
                                 focus:outline-none focus:border-[#1B7CC0]"
                    />
                    <button type="button" onClick={() => removePlace(i)}
                      className="p-1.5 text-red-400 bg-transparent border-none cursor-pointer">
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                  <input value={item.address ?? ''} onChange={e => updatePlace(i, 'address', e.target.value)}
                    placeholder="주소" className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                  <input value={item.phone ?? ''} onChange={e => updatePlace(i, 'phone', e.target.value)}
                    placeholder="전화번호" className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                  <input value={item.note ?? ''} onChange={e => updatePlace(i, 'note', e.target.value)}
                    placeholder="한 줄 메모" className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                </div>
              ) : (
                <div key={i} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100">
                  <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{item.name}</p>
                  {item.address && <p className="text-[13px] text-gray-500 mb-0.5">📍 {item.address}</p>}
                  {item.phone   && <p className="text-[13px] text-gray-500 mb-0.5">📞 {item.phone}</p>}
                  {item.note    && <p className="text-[12px] text-[#1B7CC0] mt-1">{item.note}</p>}
                </div>
              )
            ))}
            {editing && (
              <button type="button" onClick={addPlace}
                className="w-full flex items-center justify-center gap-2 py-3 text-[13px]
                           text-[#1B7CC0] border border-dashed border-blue-200 rounded-xl
                           bg-transparent cursor-pointer hover:bg-[#EFF6FD] transition-colors">
                <Plus size={15} strokeWidth={2} /> 업체 추가
              </button>
            )}
            {!editing && placesItems.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">내용을 준비 중이에요.</p>
            )}
          </div>
        )}

        {/* checklist */}
        {guide.content_type === 'structured' && guide.card_type === 'checklist' && (
          <div className="space-y-2">
            {(editing ? checks : checkItems).map((item, i) => (
              editing ? (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 shrink-0" />
                  <input
                    value={item.text}
                    onChange={e => updateCheck(i, e.target.value)}
                    placeholder="항목 내용"
                    className="flex-1 text-[14px] border border-gray-200 rounded-lg px-3 py-2
                               focus:outline-none focus:border-[#1B7CC0]"
                  />
                  <button type="button" onClick={() => removeCheck(i)}
                    className="p-1.5 text-red-400 bg-transparent border-none cursor-pointer">
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
                  <div className="w-5 h-5 rounded border-2 border-[#1B7CC0] shrink-0 mt-0.5" />
                  <span className="text-[14px] text-gray-800">{item.text}</span>
                </div>
              )
            ))}
            {editing && (
              <button type="button" onClick={addCheck}
                className="w-full flex items-center justify-center gap-2 py-3 text-[13px]
                           text-[#1B7CC0] border border-dashed border-blue-200 rounded-xl
                           bg-transparent cursor-pointer hover:bg-[#EFF6FD] transition-colors">
                <Plus size={15} strokeWidth={2} /> 항목 추가
              </button>
            )}
            {!editing && checkItems.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">내용을 준비 중이에요.</p>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed top-[62px] left-1/2 -translate-x-1/2 z-[400] px-4 py-2.5
                         text-[13px] font-medium rounded-full shadow-lg pointer-events-none whitespace-nowrap
                         ${toast.ok ? 'bg-[#2F2F2F] text-white' : 'bg-red-500 text-white'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
