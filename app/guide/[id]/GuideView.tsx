'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, X, Check, Plus, Trash2, MapPin, Phone, ExternalLink } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { useLang } from '../../lib/lang';
import { linkifyText } from '../../lib/linkify';

type PlaceItem = { name: string; address?: string; phone?: string; note?: string; url?: string };
type CheckItem = { id: number; text: string };

// places 항목 번역값 — 없는 키는 원문을 그대로 쓴다. address는 번역 대상이 아니다.
type PlaceTranslation = { name?: string; note?: string };

// ko는 기존 title/rich_content 컬럼, 그 외 언어는 translations[lang]에 저장
type GuideTranslations = {
  // items 키/값은 card_type에 따라 다르다.
  //  - checklist: CheckItem.id를 문자열 키로, 값은 항목 텍스트(string)
  //  - places:    배열 인덱스를 문자열 키로, 값은 { name?, note? } 객체
  [lang: string]: {
    title?: string;
    rich_content?: string;
    items?: Record<string, string | PlaceTranslation | undefined>;
  } | undefined;
};

// places 버튼 라벨 (본문 번역과 같은 lang 값을 그대로 쓴다)
const PLACE_BTN = {
  ko: { map: '카카오맵', call: '전화',    visit: '바로가기' },
  en: { map: 'Map',      call: 'Call',    visit: 'Visit'    },
  zh: { map: '地图',     call: '电话',    visit: '前往'     },
  ja: { map: '地図',     call: '電話',    visit: 'リンク'   },
} as const;

type Guide = {
  id: string;
  category_slug: string;
  card_type: 'procedure' | 'places' | 'checklist' | 'info';
  title: string;
  content_type: 'rich_text' | 'structured';
  rich_content: string | null;
  content: { items?: PlaceItem[] | CheckItem[] };
  translations?: GuideTranslations | null;
};

interface Props {
  guide: Guide;
  isAdmin: boolean;
}

export default function GuideView({ guide, isAdmin }: Props) {
  const router = useRouter();
  // 진입 경로(가이드 허브 / 카테고리 게시판 등)로 그대로 돌아간다.
  // 딥링크·새로고침으로 히스토리가 없을 때만 카테고리 게시판으로 폴백.
  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(`/category/${guide.category_slug}`);
  };

  const [isAdminChecked, setIsAdminChecked] = useState(isAdmin);
  const [editing, setEditing] = useState(false);
  // 언어 감지 — 다른 페이지와 동일하게 전역 언어 스토어(useLang) 사용
  const lang = useLang();

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = getSupabaseClient();
      // 로컬 세션 읽기(네트워크 왕복 없음). 권한 재조회용 user.id만 필요.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
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
  // 체크 상태는 로컬 전용(DB 저장 없음). SSR 하이드레이션 불일치를 피하려고 마운트 후에만 읽는다.
  const checksStorageKey = `guide-checks-${guide.id}`;
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(checksStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setCheckedKeys(parsed.map(String));
    } catch {
      // 손상된 값은 무시하고 빈 상태로 시작
    }
  }, [checksStorageKey]);

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
    setPlaces(prev => [...prev, { name: '', address: '', phone: '', note: '', url: '' }]);

  // 스킴 없이 저장된 주소(www.example.com)도 외부 링크로 열리게 한다.
  const placeHref = (url: string) => /^https?:\/\//i.test(url) ? url : `https://${url}`;

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

  // 비편집 뷰용 번역 선택. ko이거나 번역이 없으면(빈 값 포함) 한국어 원본으로 폴백.
  const trField = (field: 'title' | 'rich_content'): string | undefined =>
    lang !== 'ko' ? (guide.translations?.[lang]?.[field] || undefined) : undefined;
  // checklist 항목 번역. id를 문자열 키로 조회하고, 없으면 한국어 원본으로 폴백.
  // places 번역값(객체)과 같은 items 맵을 공유하므로 문자열 값만 받아들인다.
  const trCheckText = (item: CheckItem): string => {
    const tr = lang !== 'ko' ? guide.translations?.[lang]?.items?.[String(item.id)] : undefined;
    return (typeof tr === 'string' ? tr : undefined) || item.text;
  };

  // places 항목 번역. 항목에 id가 없어 배열 인덱스를 문자열 키로 쓴다.
  // ⚠️ 인덱스 키라서 편집 모드에서 항목 순서를 바꾸거나 중간 항목을 삭제하면
  //    번역이 다른 항목에 붙는다(checklist의 id 재발급 이슈와 같은 성격).
  //    항목 순서를 손댔다면 번역도 다시 저장해야 한다.
  const trPlace = (item: PlaceItem, i: number): PlaceItem => {
    const tr = lang !== 'ko' ? guide.translations?.[lang]?.items?.[String(i)] : undefined;
    if (!tr || typeof tr === 'string') return item;
    // 없는 키(빈 값 포함)는 한국어 원문 유지. address는 번역 대상이 아니다.
    return { ...item, name: tr.name || item.name, note: tr.note || item.note };
  };

  // 체크 저장 키. id가 없는 레거시 항목은 인덱스를 대체 키로 사용.
  const checkKeyOf = (item: CheckItem, i: number): string =>
    item.id != null ? String(item.id) : `idx-${i}`;

  const toggleCheck = (key: string) => {
    const next = checkedKeys.includes(key)
      ? checkedKeys.filter(k => k !== key)
      : [...checkedKeys, key];
    setCheckedKeys(next);
    try {
      localStorage.setItem(checksStorageKey, JSON.stringify(next));
    } catch {
      // 저장 실패(용량 초과/프라이빗 모드)해도 화면 토글은 유지
    }
  };

  const btn = PLACE_BTN[lang];
  // 편집 중에는 항상 한국어 원본 제목을, 그 외에는 번역(있으면) 제목을 표시
  const displayTitle       = editing ? guide.title : (trField('title') || guide.title);
  const displayRichContent = trField('rich_content') || richText;

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer flex items-center shrink-0"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <span className="text-[15px] font-bold text-[#1A1A1A] flex-1 truncate">
            {displayTitle}
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
              className="w-full min-h-[300px] text-[16px] text-gray-800 leading-relaxed
                         border border-blue-200 rounded-xl p-4 resize-none
                         focus:outline-none focus:border-[#1B7CC0]"
              placeholder="내용을 입력해주세요"
            />
          ) : (
            <p className="text-[15px] text-gray-800 whitespace-pre-wrap leading-relaxed">
              {displayRichContent ? linkifyText(displayRichContent) : '내용을 준비 중이에요.'}
            </p>
          )
        )}

        {/* places (추천 업체/병원/지점) */}
        {guide.content_type === 'structured' && guide.card_type === 'places' && (
          <div className="space-y-3">
            {(editing ? places : placesItems).map((item, i) => {
              // 편집 중에는 항상 한국어 원본을, 그 외에는 번역(있으면)을 표시
              const view = editing ? item : trPlace(item, i);
              return editing ? (
                <div key={i} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={item.name}
                      onChange={e => updatePlace(i, 'name', e.target.value)}
                      placeholder="업체명 *"
                      className="flex-1 text-[16px] border border-gray-200 rounded-lg px-3 py-2
                                 focus:outline-none focus:border-[#1B7CC0]"
                    />
                    <button type="button" onClick={() => removePlace(i)}
                      className="p-1.5 text-red-400 bg-transparent border-none cursor-pointer">
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                  <input value={item.address ?? ''} onChange={e => updatePlace(i, 'address', e.target.value)}
                    placeholder="주소" className="w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                  <input value={item.phone ?? ''} onChange={e => updatePlace(i, 'phone', e.target.value)}
                    placeholder="전화번호" className="w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                  <input value={item.note ?? ''} onChange={e => updatePlace(i, 'note', e.target.value)}
                    placeholder="한 줄 메모" className="w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                  <input value={item.url ?? ''} onChange={e => updatePlace(i, 'url', e.target.value)}
                    placeholder="사이트 주소 (예: www.example.com)" className="w-full text-[16px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1B7CC0]" />
                </div>
              ) : (
                <div key={i} className="p-4 bg-[#F8FAFC] rounded-xl border border-gray-100">
                  <p className="text-[14px] font-semibold text-[#1A1A1A] mb-1">{view.name}</p>
                  {view.address && <p className="text-[13px] text-gray-500 mb-0.5">📍 {view.address}</p>}
                  {view.phone   && <p className="text-[13px] text-gray-500 mb-0.5">📞 {view.phone}</p>}
                  {view.note    && <p className="text-[12px] text-[#1B7CC0] mt-1">{view.note}</p>}
                  {(view.address || view.phone || view.url) && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {view.address && (
                        <a
                          /* 지도 검색어는 번역명이 아닌 한국어 원문으로 보낸다 */
                          href={`https://map.kakao.com/link/search/${encodeURIComponent(`${item.name} ${item.address}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold
                                     bg-[#FEE500] text-[#2F2F2F] no-underline active:scale-95 transition-transform"
                        >
                          <MapPin size={13} strokeWidth={2} />
                          {btn.map}
                        </a>
                      )}
                      {view.phone && (
                        <a
                          href={`tel:${view.phone.replace(/-/g, '')}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold
                                     bg-gray-100 text-gray-600 no-underline active:scale-95 transition-transform"
                        >
                          <Phone size={13} strokeWidth={2} />
                          {btn.call}
                        </a>
                      )}
                      {view.url && (
                        <a
                          href={placeHref(view.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold
                                     bg-[#EFF6FD] text-[#1B7CC0] no-underline active:scale-95 transition-transform"
                        >
                          <ExternalLink size={13} strokeWidth={2} />
                          {btn.visit}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
                    className="flex-1 text-[16px] border border-gray-200 rounded-lg px-3 py-2
                               focus:outline-none focus:border-[#1B7CC0]"
                  />
                  <button type="button" onClick={() => removeCheck(i)}
                    className="p-1.5 text-red-400 bg-transparent border-none cursor-pointer">
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </div>
              ) : (
                (() => {
                  const key = checkKeyOf(item, i);
                  const checked = checkedKeys.includes(key);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleCheck(key)}
                      aria-pressed={checked}
                      className="w-full flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-xl
                                 border border-gray-100 text-left cursor-pointer
                                 active:scale-[0.99] transition-transform"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center
                                    transition-colors duration-200
                                    ${checked ? 'bg-[#1B7CC0] border-[#1B7CC0]' : 'bg-transparent border-[#1B7CC0]'}`}
                      >
                        {checked && <Check size={13} strokeWidth={3} className="text-white" />}
                      </div>
                      <span className={`text-[14px] transition-colors duration-200 ${checked ? 'text-gray-400' : 'text-gray-800'}`}>
                        {trCheckText(item)}
                      </span>
                    </button>
                  );
                })()
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
