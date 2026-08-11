'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronDown, ChevronRight,
  ListChecks, MapPin, ClipboardList, ScrollText,
} from 'lucide-react';
import BottomTabBar from '../components/BottomTabBar';
import {
  getCategoryBySlug,
  getCategoryLabel,
  uiLangToLanguage,
  type UILang,
} from '../lib/categories';
import { getLang } from '../lib/lang';
import { getSupabaseClient } from '../lib/supabase/client';

// CategoryView의 GUIDE_CATEGORY_SLUGS와 동일한 목록/순서
const GUIDE_CATEGORY_SLUGS = ['housing', 'bank', 'telecom', 'insurance', 'medical', 'visa', 'part-time'];

// CategoryView의 GUIDE_CARD_ICONS와 동일한 매핑
const GUIDE_CARD_ICONS = {
  procedure: ListChecks,
  places:    MapPin,
  checklist: ClipboardList,
  info:      ScrollText,
} as const;

const T = {
  ko: { title: '관리자 가이드', empty: '내용을 준비 중이에요', backAria: '뒤로가기' },
  en: { title: 'Admin Guide',   empty: 'Content coming soon',  backAria: 'Back' },
  zh: { title: '管理员指南',     empty: '内容正在准备中',        backAria: '返回' },
  ja: { title: '管理者ガイド',   empty: 'コンテンツを準備中です', backAria: '戻る' },
} as const;

type GuideItem = {
  id: string;
  category_slug: string;
  card_type: keyof typeof GUIDE_CARD_ICONS;
  title: string;
  sort_order: number;
  // ko는 title 컬럼, 그 외 언어는 translations[lang].title
  translations?: { [lang: string]: { title?: string } | undefined } | null;
};

export default function GuidesPage() {
  const router = useRouter();

  const [lang, setLang] = useState<UILang>('ko');
  useEffect(() => { setLang(getLang()); }, []);

  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);

  // 가이드 카테고리 전체를 한 번의 쿼리로 가져와 slug별로 그룹핑한다
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await getSupabaseClient()
        .from('category_guides')
        .select('id, category_slug, card_type, title, translations, sort_order')
        .in('category_slug', GUIDE_CATEGORY_SLUGS)
        .order('sort_order', { ascending: true });

      if (cancelled) return;
      setGuides((data ?? []) as GuideItem[]);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const t = T[lang];
  const dbLang = uiLangToLanguage(lang);

  // 가이드 제목: ko이거나 번역이 없으면 한국어 원본으로 폴백
  const guideTitle = (g: GuideItem) =>
    (lang !== 'ko' && g.translations?.[lang]?.title) || g.title;

  const bySlug = (slug: string) => guides.filter(g => g.category_slug === slug);

  const toggle = (slug: string) =>
    setExpanded(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.backAria}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[15px] font-bold truncate">{t.title}</span>
        </div>
      </header>

      {/* ── 카테고리 아코디언 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">
        {loading ? (
          <div className="space-y-2.5">
            {GUIDE_CATEGORY_SLUGS.map(slug => (
              <div key={slug} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {GUIDE_CATEGORY_SLUGS.map(slug => {
              const category = getCategoryBySlug(slug);
              const Icon = category?.Icon;
              const items = bySlug(slug);
              const open = expanded.includes(slug);

              return (
                <div key={slug} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

                  {/* 카테고리 행 */}
                  <button
                    type="button"
                    onClick={() => toggle(slug)}
                    aria-expanded={open}
                    className="w-full flex items-center gap-2.5 px-4 py-3.5 bg-transparent border-none
                               cursor-pointer text-left active:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#EFF6FD] flex items-center justify-center shrink-0">
                      {Icon && <Icon size={17} strokeWidth={1.8} className="text-[#1B7CC0]" />}
                    </div>
                    <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#1A1A1A] truncate">
                      {getCategoryLabel(slug, dbLang)}
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={2}
                      className={`text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* 펼침 영역 — grid-template-rows 0fr↔1fr 트랜지션 */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out
                      ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      {items.length === 0 ? (
                        <p className="px-4 pb-4 pt-1 text-[13px] text-gray-400">{t.empty}</p>
                      ) : (
                        <div className="px-3 pb-3 pt-1 space-y-1.5">
                          {items.map(g => {
                            const CardIcon = GUIDE_CARD_ICONS[g.card_type] ?? ScrollText;
                            return (
                              <Link
                                key={g.id}
                                href={`/guide/${g.id}`}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-100
                                           bg-[#FAFBFC] no-underline hover:border-gray-200
                                           active:scale-[0.99] transition-all"
                              >
                                <CardIcon size={15} strokeWidth={1.8} className="text-[#1B7CC0] shrink-0" />
                                <span className="flex-1 min-w-0 text-[13px] font-medium text-[#1A1A1A] truncate">
                                  {guideTitle(g)}
                                </span>
                                <ChevronRight size={14} strokeWidth={2} className="text-gray-300 shrink-0" />
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
