'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Check, ChevronDown, ChevronRight, ExternalLink, Info, Phone, TriangleAlert, X } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { getCategoryLabel, uiLangToLanguage } from '../../lib/categories';
import { SCHEDULE_TITLE_I18N } from '../../lib/scheduleI18n';
import { addDays, courseRegistration, ddayOf, loc, type SettleProfile } from '../../lib/settle';
import { SETTLE_T, type SettleDict } from '../../lib/settleI18n';
import type { Confidence, SettleItem, SettleOrg } from '../../lib/settleItems';
import type { UILang } from '../../lib/lang';
import { buildAiPrompt, buildGuide } from '../../lib/settleGuide';
import DdayBadge, { PILL } from './DdayBadge';
import GuideBox from './GuideBox';
import { fmtYmd, ItemIcon, TILE, toneOf } from './visual';
import RichText from './RichText';

type GuideCard = {
  id: string;
  title: string;
  translations?: { [lang: string]: { title?: string } | undefined } | null;
};

const telHref = (phone: string) => `tel:${phone.replace(/[^0-9+]/g, '')}`;

// 캠퍼스 가이드 배지 색 (공식 정보 = 노랑, 확인 권장 = 파랑, 확인 중 = 회색)
const CONF_CLS: Record<Confidence, string> = {
  high: 'bg-[#FFF4D6] border-[#FBE9A8] text-[#92702A]',
  medium: 'bg-[#EFF6FF] border-[#DBE7FE] text-[#1D4ED8]',
  low: 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]',
};
function ConfidenceTag({ c, t }: { c: Confidence; t: SettleDict }) {
  return <span className={`${PILL} ${CONF_CLS[c]}`}>{t.confidence[c]}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[13px] font-bold text-[#64748B]">{title}</h3>
      {children}
    </section>
  );
}

/** 접는 영역 — 캠퍼스 가이드 카드와 같은 흰 카드 */
function Fold({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group mt-2 rounded-2xl border border-[#E5E7EB] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-3 text-[13px] font-semibold text-[#475569] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{summary}</span>
        <ChevronDown size={18} className="shrink-0 text-[#94A3B8] transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-3.5">{children}</div>
    </details>
  );
}

/** 기관 한 곳 — 이름·주소·운영시간·안내 + 출처. 대표 기관이면 행동 버튼을 크게 */
function OrgBody({ o, lang, t, primary }: { o: SettleOrg; lang: UILang; t: SettleDict; primary: boolean }) {
  const hide = o.confidence === 'low';
  const action = hide ? null
    : o.phone ? { href: telHref(o.phone), label: `${t.callTo(loc(o.short, lang))} · ${o.phone}`, Icon: Phone, external: false }
    : o.url ? { href: o.url, label: t.openSite(loc(o.short, lang)), Icon: ExternalLink, external: true }
    : null;
  return (
    <div>
      <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold text-[#111827]">
        {loc(o.name, lang)} <ConfidenceTag c={o.confidence} t={t} />
      </p>
      {o.address && <p className="mt-0.5 text-[12.5px] text-[#64748B]">{hide ? t.checking : loc(o.address, lang)}</p>}
      {o.hours && <p className="mt-0.5 text-[12.5px] text-[#64748B]">{t.hours}: {hide ? t.checking : loc(o.hours, lang)}</p>}
      {o.note && !hide && <p className="mt-0.5 text-[12px] text-[#64748B]">{loc(o.note, lang)}</p>}
      {action && (
        <a
          href={action.href}
          {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className={primary
            ? 'mt-2.5 flex h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#1D4ED8] text-[14.5px] font-bold text-white no-underline'
            : 'mt-2 inline-flex h-8 items-center gap-1 rounded-full bg-[#EFF6FF] px-3 text-[12.5px] font-semibold text-[#1D4ED8] no-underline'}
        >
          <action.Icon size={primary ? 17 : 13} strokeWidth={2} />{action.label}
        </a>
      )}
      {/* 대표 버튼이 전화면 사이트는 작은 링크로 */}
      {o.phone && o.url && !hide && (
        <a href={o.url} target="_blank" rel="noopener noreferrer" className="mt-2 mr-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D4ED8] no-underline">
          <ExternalLink size={12} />{t.links}
        </a>
      )}
      <a href={o.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] text-[#94A3B8] underline">{t.sources}</a>
    </div>
  );
}

/** 할 일 상세 — 화면 아래에서 올라오는 시트 */
export default function DetailSheet({
  lang, item, profile, doneSet, others, onToggle, onClose, onOpenItem,
}: {
  lang: UILang;
  item: SettleItem;
  profile: SettleProfile;
  doneSet: ReadonlySet<string>;
  /** 프롬프트의 "다른 할 일 진행 상황" — 지금 프로필에 보이는 다른 항목 */
  others: { name: SettleItem['name']; done: boolean }[];
  onToggle: () => void;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const done = doneSet.has(item.id);
  const t = SETTLE_T[lang];
  const d = item.detail;
  const dday = ddayOf(item, profile);
  const reg = item.timeAxis === 'academic' ? courseRegistration() : null;
  const c = toneOf(item.category);
  const [guides, setGuides] = useState<GuideCard[] | null>(null);

  // 같은 카테고리의 /guides 카드 (조회 실패면 카테고리 링크만 남긴다)
  useEffect(() => {
    const slug = item.guideSlug;
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await getSupabaseClient()
        .from('category_guides')
        .select('id, title, translations')
        .eq('category_slug', slug)
        .order('sort_order', { ascending: true });
      if (!cancelled) setGuides((data ?? []) as GuideCard[]);
    })();
    return () => { cancelled = true; };
  }, [item.guideSlug]);

  // 시트가 열려 있는 동안 뒤 화면 스크롤 막기 + Esc로 닫기
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const guideTitle = (g: GuideCard) => (lang !== 'ko' && g.translations?.[lang]?.title) || g.title;
  const regTitle = reg ? (lang === 'ko' ? reg.title : SCHEDULE_TITLE_I18N[reg.title]?.[lang] ?? reg.title) : '';
  const guide = buildGuide(item, profile, doneSet, lang);
  const [mainOrg, ...otherOrgs] = d.orgs ?? [];
  const folded = [
    d.steps?.length ? t.steps : null,
    d.cost && (d.cost.amount !== null || d.cost.note) ? t.cost : null,
    d.cautions?.length ? t.cautions : null,
  ].filter((x): x is string => !!x);

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="settle-detail-title">
      <button type="button" aria-label={t.close} onClick={onClose} className="absolute inset-0 bg-black/40 border-none animate-[sheet-fade_0.2s_ease-out]" />
      <div className={`relative w-full max-w-[600px] max-h-[88dvh] flex flex-col bg-white rounded-t-3xl shadow-2xl animate-[sheet-up_0.25s_ease-out] ${lang === 'ko' ? 'break-keep' : ''} [overflow-wrap:anywhere]`}>
        {/* 머리: 아이콘 타일 + 이름 + 배지 */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3">
            <span className={TILE} style={{ backgroundColor: c.bg, borderColor: c.border }}>
              <ItemIcon id={item.id} size={21} strokeWidth={1.8} color={c.fg} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#94A3B8]">{t.category[item.category]} · {t.minutes(item.estimatedMinutes)}</p>
              <h2 id="settle-detail-title" className="text-[19px] font-extrabold leading-snug text-[#111827]">{loc(item.name, lang)}</h2>
            </div>
            <button type="button" aria-label={t.close} onClick={onClose} className="shrink-0 w-9 h-9 -mr-2 self-start flex items-center justify-center text-gray-400 bg-transparent border-none cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {dday && <DdayBadge dday={dday} t={t} />}
            <ConfidenceTag c={d.confidence} t={t} />
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <p className="mt-4 text-[14px] leading-relaxed text-[#374151]"><RichText text={loc(item.summary, lang)} /></p>

          {item.deadline && (
            <div className="mt-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#B91C1C]">
                <TriangleAlert size={16} strokeWidth={2.2} className="shrink-0" />
                {t.legalDeadline} · {t.deadlineBasis(item.deadline.days)} ({fmtYmd(addDays(profile.arrival, item.deadline.days))})
              </p>
              {item.deadline.penalty && <p className="mt-1 text-[12.5px] leading-relaxed text-[#7F1D1D]"><b>{t.penalty}:</b> {loc(item.deadline.penalty, lang)}</p>}
              <p className="mt-1 text-[11.5px] text-[#991B1B]">
                {t.lawRef}: <a href={item.deadline.source} target="_blank" rel="noopener noreferrer" className="underline">{item.deadline.lawRef}</a>
              </p>
            </div>
          )}

          {d.confidence === 'low' && (
            <p className="mt-3 flex gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 text-[12.5px] text-[#475569]">
              <Info size={16} className="shrink-0 mt-0.5 text-[#94A3B8]" />{t.notVerified}
            </p>
          )}

          {d.askSchool && (
            <div className="mt-3 rounded-xl border border-[#DBE7FE] bg-[#EFF6FF] px-3 py-3">
              <p className="text-[13.5px] font-bold text-[#1D4ED8]">{t.askSchool}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#1E3A8A]">{t.askSchoolBody}</p>
            </div>
          )}

          <GuideBox
            lang={lang}
            guide={guide}
            buildPrompt={() => buildAiPrompt(item, profile, guide, others, lang)}
            onOpenItem={onOpenItem}
          />

          {item.timeAxis === 'academic' && (
            <Section title={t.courseReg}>
              {reg && dday?.kind !== 'closed' ? (
                <p className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 text-[13.5px] text-[#111827]">
                  <b>{regTitle}</b>
                  <span className="mt-0.5 block text-[12.5px] text-[#64748B] tabular-nums">{fmtYmd(reg.start)}{reg.end ? ` ~ ${fmtYmd(reg.end)}` : ''}</span>
                </p>
              ) : (
                <p className="text-[13px] text-[#64748B]">{t.courseRegClosed}</p>
              )}
            </Section>
          )}

          {mainOrg && (
            <Section title={t.whereWho}>
              <div className="rounded-2xl border border-[#DBE7FE] bg-[#F8FBFF] p-3">
                <OrgBody o={mainOrg} lang={lang} t={t} primary />
              </div>
              {otherOrgs.length > 0 && (
                <Fold summary={<>{t.otherContacts(otherOrgs.length)} <span className="font-normal text-[#94A3B8]">{otherOrgs.map(o => loc(o.short, lang)).join(' · ')}</span></>}>
                  <div className="space-y-3 divide-y divide-[#F1F5F9]">
                    {otherOrgs.map((o, i) => <div key={i} className={i ? 'pt-3' : ''}><OrgBody o={o} lang={lang} t={t} primary={false} /></div>)}
                  </div>
                </Fold>
              )}
            </Section>
          )}

          {d.documents?.length ? (
            <Section title={t.documents}>
              <ul className="rounded-2xl border border-[#E5E7EB] px-3.5 py-1">
                {d.documents.map((doc, i) => (
                  <li key={i} className="flex gap-2.5 border-b border-[#F1F5F9] py-2 text-[13.5px] text-[#111827] last:border-b-0">
                    <span className="shrink-0 mt-[8px] h-1.5 w-1.5 rounded-full bg-[#1D4ED8]" />
                    <span>
                      {loc(doc.name, lang)}
                      {doc.note && <span className="block text-[12px] text-[#64748B]">{loc(doc.note, lang)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {folded.length > 0 && (
            <Fold summary={folded.join(' · ')}>
              {d.steps?.length ? (
                <>
                  <p className="mb-2 text-[12.5px] font-bold text-[#64748B]">{t.steps}</p>
                  <ol className="space-y-2">
                    {d.steps.map((s, i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] text-[#111827]">
                        <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#EFF6FF] text-[11px] font-bold text-[#1D4ED8]">{i + 1}</span>
                        <span className="leading-relaxed">{loc(s, lang)}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
              {d.cost && (d.cost.amount !== null || d.cost.note) && (
                <>
                  <p className="mt-4 mb-1 text-[12.5px] font-bold text-[#64748B]">{t.cost}</p>
                  <p className="text-[13.5px] text-[#111827]">
                    {d.cost.amount !== null && d.cost.confidence !== 'low' && <b className="mr-1.5">{d.cost.amount === 0 ? t.free : t.won(d.cost.amount)}</b>}
                    {d.cost.note && <span className="text-[12.5px] text-[#64748B]">{loc(d.cost.note, lang)}</span>}
                  </p>
                </>
              )}
              {d.cautions?.length ? (
                <>
                  <p className="mt-4 mb-1 text-[12.5px] font-bold text-[#64748B]">{t.cautions}</p>
                  <ul className="space-y-1.5">
                    {d.cautions.map((x, i) => (
                      <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-[#374151]"><span className="shrink-0">•</span>{loc(x, lang)}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Fold>
          )}

          {d.links?.length ? (
            <Section title={t.links}>
              <ul className="space-y-1.5">
                {d.links.map(l => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 py-2.5 text-[13.5px] font-semibold text-[#1D4ED8] no-underline">
                      <ExternalLink size={15} className="shrink-0" /><span className="flex-1">{loc(l.label, lang)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {item.guideSlug && (
            <Section title={t.relatedGuides}>
              {guides === null ? (
                <p className="text-[12.5px] text-[#94A3B8]">{t.guidesLoading}</p>
              ) : (
                <ul className="space-y-1.5">
                  {guides.map(g => (
                    <li key={g.id}>
                      <Link href={`/guide/${g.id}`} className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 text-[13.5px] font-semibold text-[#111827] no-underline">
                        <BookOpen size={15} className="shrink-0 text-[#1D4ED8]" /><span className="flex-1">{guideTitle(g)}</span>
                        <ChevronRight size={16} className="shrink-0 text-[#CBD5E1]" />
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={`/category/${item.guideSlug}`} className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#1D4ED8] no-underline">
                      {getCategoryLabel(item.guideSlug, uiLangToLanguage(lang))} · {t.openGuideCategory}<ChevronRight size={14} />
                    </Link>
                  </li>
                </ul>
              )}
            </Section>
          )}

          {d.sources.length > 0 && (
            <Section title={t.sources}>
              <ul className="space-y-1">
                {d.sources.map(s => (
                  <li key={s.url} className="text-[11.5px] leading-snug">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#64748B] underline">{loc(s.label, lang)}</a>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* 완료 버튼 */}
        <div className="shrink-0 px-5 pt-3 pb-safe border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={done}
            className={`w-full h-12 mb-3 rounded-2xl text-[15px] font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
              done ? 'border border-[#E5E7EB] bg-white text-[#475569]' : 'border-[1.5px] border-[#1D4ED8] bg-white text-[#1D4ED8]'}`}
          >
            {done ? t.markUndone : (<><Check size={18} strokeWidth={2.5} />{t.markDone}</>)}
          </button>
        </div>
      </div>
    </div>
  );
}
