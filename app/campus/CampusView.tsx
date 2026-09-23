'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft, Search, X, LayoutGrid, Building2, Utensils, BookOpen, Bus, ConciergeBell,
  HeartPulse, Lightbulb, Clock, GraduationCap,
} from 'lucide-react';
import BottomTabBar from '../components/BottomTabBar';
import FacilityCard, { InfoCard } from '../components/campus/FacilityCard';
import { CAMPUS_TONES, type CampusTone } from '../components/campus/FacilityThumb';
import { useLang } from '../lib/lang';
import { useNowMinute } from '../lib/useNowMinute';
import { CAMPUS_T } from '../lib/campusI18n';
import {
  CAMPUS_FACILITIES, CAMPUS_CATEGORIES, SITUATIONS, FACILITY_GROUPS, POPULAR_IDS, CAMPUS_LAST_UPDATED,
  inCategory, inFacilityGroup, matchesQuery, isCategoryFilter, isSituation,
  type CampusCategoryFilter, type SituationKey, type FacilityGroupKey, type CampusFacility,
} from '../lib/campusFacilities';

const CATEGORY_META: Record<CampusCategoryFilter, { Icon: LucideIcon; tone: CampusTone }> = {
  all:         { Icon: LayoutGrid,    tone: 'blue' },
  facility:    { Icon: Building2,     tone: 'yellow' },
  food:        { Icon: Utensils,      tone: 'peach' },
  study:       { Icon: BookOpen,      tone: 'mint' },
  transport:   { Icon: Bus,           tone: 'sky' },
  convenience: { Icon: ConciergeBell, tone: 'purple' },
  health:      { Icon: HeartPulse,    tone: 'pink' },
  tips:        { Icon: Lightbulb,     tone: 'yellow' },
};

const SITUATION_META: Record<SituationKey, { emoji: string; tone: CampusTone }> = {
  print: { emoji: '🖨', tone: 'blue' },
  eat:   { emoji: '🍚', tone: 'yellow' },
  rest:  { emoji: '🛋', tone: 'purple' },
  study: { emoji: '📚', tone: 'mint' },
  move:  { emoji: '🚌', tone: 'pink' },
  sick:  { emoji: '🏥', tone: 'sky' },
  buy:   { emoji: '🛍', tone: 'peach' },
  etc:   { emoji: '···', tone: 'gray' },
};

const isFacilityGroup = (v: string | null): v is FacilityGroupKey =>
  !!v && (FACILITY_GROUPS as string[]).includes(v);

// 내용이 있는 항목을 먼저, '준비 중' 항목은 뒤로
const pendingLast = (a: CampusFacility, b: CampusFacility) => Number(a.pending) - Number(b.pending);

export default function CampusView() {
  const lang = useLang();
  const t = CAMPUS_T[lang];
  const now = useNowMinute();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 카테고리·상황·하위 필터는 URL 이 단일 출처 → 상세에서 뒤로 와도 그대로 복원된다
  const categoryParam = searchParams.get('category');
  const needParam     = searchParams.get('need');
  const groupParam    = searchParams.get('group');
  const category: CampusCategoryFilter = isCategoryFilter(categoryParam) ? categoryParam : 'all';
  const need: SituationKey | null      = isSituation(needParam) ? needParam : null;
  const group: FacilityGroupKey        = category === 'facility' && isFacilityGroup(groupParam) ? groupParam : 'all';

  const [query, setQuery] = useState('');
  const needResultsRef = useRef<HTMLDivElement | null>(null);

  const setFilters = (next: { category?: CampusCategoryFilter; need?: SituationKey | null; group?: FacilityGroupKey }) => {
    const params = new URLSearchParams();
    const c = next.category ?? 'all';
    if (c !== 'all') params.set('category', c);
    if (next.need) params.set('need', next.need);
    if (c === 'facility' && next.group && next.group !== 'all') params.set('group', next.group);
    const qs = params.toString();
    router.replace(qs ? `/campus?${qs}` : '/campus', { scroll: false });
  };

  // 상황을 고르면 결과 목록이 보이도록 스크롤
  useEffect(() => {
    if (need) needResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [need]);

  const trimmedQuery = query.trim();
  const browsing = category !== 'all' || trimmedQuery !== '';

  const browseResults = browsing
    ? CAMPUS_FACILITIES
        .filter(f => inCategory(f, category) && inFacilityGroup(f, group) && matchesQuery(f, trimmedQuery, t.types[f.type]))
        .sort(pendingLast)
    : [];
  const needResults = need
    ? CAMPUS_FACILITIES.filter(f => f.situations.includes(need)).sort(pendingLast)
    : [];
  const popular = POPULAR_IDS
    .map(id => CAMPUS_FACILITIES.find(f => f.id === id))
    .filter((f): f is CampusFacility => !!f);

  const sectionTitleCls = 'text-[16px] font-extrabold text-[#0F172A]';
  const cardCls = 'bg-white rounded-2xl border border-[#E5E7EB]';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.back}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[15px] font-bold truncate">{t.title}</p>
            <p className="text-[10.5px] text-[#94A3B8] truncate">{t.school}</p>
          </div>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">

        {/* ── 타이틀 + 검색 ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#DBE7FE] bg-gradient-to-br from-[#EAF1FE] to-[#F5F9FF] px-4 pt-5 pb-4">
          <GraduationCap
            size={96}
            strokeWidth={1.2}
            className="absolute -right-3 -top-2 text-[#1D4ED8] opacity-[0.08] pointer-events-none"
            aria-hidden="true"
          />
          <h1 className="relative text-[24px] font-extrabold text-[#0F172A] leading-tight">{t.title}</h1>
          <p className="relative mt-1 text-[13px] text-[#475569] leading-snug">{t.mainSub}</p>

          <div className="relative mt-4">
            <Search size={18} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.searchPh}
              aria-label={t.searchPh}
              enterKeyHint="search"
              className="w-full h-12 pl-10 pr-10 text-base text-[#111827] placeholder:text-[#94A3B8] bg-white border border-[#E5E7EB] rounded-2xl
                         outline-none focus:border-[#1D4ED8] shadow-[0_2px_10px_rgba(30,64,175,0.06)] transition-colors
                         [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#94A3B8] bg-transparent border-none cursor-pointer"
                aria-label={t.clearSearch}
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* ── 카테고리 ── */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {CAMPUS_CATEGORIES.map(key => {
            const { Icon, tone } = CATEGORY_META[key];
            const c = CAMPUS_TONES[tone];
            const selected = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilters({ category: key })}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 cursor-pointer transition-all active:scale-[0.97]
                  ${selected ? 'bg-white border-[#1D4ED8] shadow-[0_2px_10px_rgba(29,78,216,0.12)]' : 'bg-white border-[#E5E7EB]'}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg }}>
                  <Icon size={20} strokeWidth={1.8} color={c.fg} />
                </span>
                <span className={`text-[11.5px] leading-tight text-center break-keep ${selected ? 'font-bold text-[#1D4ED8]' : 'font-semibold text-[#334155]'}`}>
                  {t.categories[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 카테고리·검색 결과 ── */}
        {browsing && (
          <section className="mt-6">
            <div className="flex items-baseline gap-2 mb-3 px-0.5">
              <h2 className={sectionTitleCls}>{trimmedQuery ? t.searchResults : t.categories[category]}</h2>
              <span className="text-[12px] font-semibold text-[#94A3B8]">{browseResults.length}</span>
            </div>

            {/* 교내시설 하위 필터 */}
            {category === 'facility' && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3">
                {FACILITY_GROUPS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFilters({ category: 'facility', group: g })}
                    aria-pressed={group === g}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold border cursor-pointer transition-colors
                      ${group === g ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white' : 'bg-white border-[#E5E7EB] text-[#475569]'}`}
                  >
                    {t.facilityGroups[g]}
                  </button>
                ))}
              </div>
            )}

            {browseResults.length > 0 ? (
              <div className="space-y-2">
                {browseResults.map(f => <FacilityCard key={f.id} facility={f} lang={lang} now={now} />)}
              </div>
            ) : (
              <div className={`${cardCls} flex flex-col items-center py-10 px-5 text-center`}>
                <p className="text-[14px] font-semibold text-[#111827]">{t.noResults}</p>
                <p className="mt-1 text-[12px] text-[#94A3B8]">{t.noResultsSub}</p>
                <button
                  type="button"
                  onClick={() => { setQuery(''); setFilters({}); }}
                  className="mt-4 px-5 py-2 rounded-full bg-[#EFF6FF] border border-[#DBE7FE] text-[12.5px] font-semibold text-[#1D4ED8] cursor-pointer"
                >
                  {t.resetFilter}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── 지금 많이 찾는 정보 ── */}
        {!browsing && (
          <section className="mt-6">
            <h2 className={`${sectionTitleCls} mb-3 px-0.5`}>{t.popularTitle}</h2>
            <div className={`${cardCls} overflow-hidden divide-y divide-[#F1F5F9]`}>
              {popular.map(f => <InfoCard key={f.id} facility={f} lang={lang} />)}
            </div>
          </section>
        )}

        {/* ── 학교에서 뭐가 필요하세요? ── */}
        <section className={`${cardCls} mt-6 px-4 py-4`}>
          <h2 className={sectionTitleCls}>{t.needTitle}</h2>
          <p className="mt-1 text-[12.5px] text-[#64748B] leading-snug">{t.needSub}</p>

          <div className="mt-3.5 grid grid-cols-2 min-[400px]:grid-cols-4 gap-2">
            {SITUATIONS.map(key => {
              const { emoji, tone } = SITUATION_META[key];
              const c = CAMPUS_TONES[tone];
              const selected = need === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilters({ category, group, need: selected ? null : key })}
                  aria-pressed={selected}
                  className="flex flex-col items-center justify-center gap-1.5 min-h-[84px] rounded-2xl px-2 py-3 cursor-pointer transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: c.bg,
                    border: selected ? `2px solid ${c.fg}` : `1px solid ${c.border}`,
                  }}
                >
                  <span className="text-[22px] leading-none" style={key === 'etc' ? { color: c.fg, fontWeight: 800 } : undefined} aria-hidden="true">
                    {emoji}
                  </span>
                  <span className="text-[12px] font-bold leading-tight text-center break-keep" style={{ color: c.fg }}>
                    {t.situations[key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 선택한 상황의 관련 시설·팁 */}
          {need && (
            <div ref={needResultsRef} className="mt-5 scroll-mt-[72px]">
              <div className="flex items-baseline gap-2 mb-3">
                <h3 className="text-[14px] font-extrabold text-[#0F172A]">
                  {SITUATION_META[need].emoji !== '···' && <span className="mr-1" aria-hidden="true">{SITUATION_META[need].emoji}</span>}
                  {t.situations[need]}
                  <span className="mx-1.5 text-[#CBD5E1]">·</span>
                  <span className="font-semibold text-[#64748B]">{t.resultsFor}</span>
                </h3>
                <span className="text-[12px] font-semibold text-[#94A3B8]">{needResults.length}</span>
              </div>
              <div className="space-y-2">
                {needResults.map(f => <FacilityCard key={f.id} facility={f} lang={lang} now={now} />)}
              </div>
            </div>
          )}
        </section>

        {/* ── 안내 문구 ── */}
        <section className="mt-6 rounded-2xl border border-[#DBE7FE] bg-[#F3F7FF] px-4 py-4">
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#1D4ED8]">
            <Lightbulb size={16} strokeWidth={2} className="text-[#F6C21A]" />
            {t.disclaimerTitle}
          </h2>
          <p className="mt-2 text-[12.5px] text-[#475569] leading-relaxed">{t.disclaimer}</p>
          <p className="mt-3 pt-3 border-t border-[#DBE7FE] flex items-center gap-1.5 text-[11.5px] text-[#94A3B8]">
            <Clock size={12} strokeWidth={2} />
            {t.lastUpdated} {CAMPUS_LAST_UPDATED}
          </p>
        </section>
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
