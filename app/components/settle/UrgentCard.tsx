'use client';

import { Check, ListChecks, PartyPopper, TriangleAlert } from 'lucide-react';
import { addDays, courseRegistration, loc, type PlanEntry, type SettleProfile } from '../../lib/settle';
import { SETTLE_T } from '../../lib/settleI18n';
import type { UILang } from '../../lib/lang';
import { ddayText } from './DdayBadge';
import { ACCENT, fmtYmd, ItemIcon } from './visual';
import RichText from './RichText';

const HERO = 'relative overflow-hidden rounded-2xl border border-[#DBE7FE] bg-gradient-to-br from-[#EAF1FE] to-[#F5F9FF] px-4 pt-[18px] pb-4';

/** 가장 급한 할 일 1장 — D-day를 크게 (캠퍼스 가이드 상단 카드와 같은 그라데이션) */
export default function UrgentCard({
  lang, entry, profile, onOpen, onDone,
}: {
  lang: UILang;
  entry: PlanEntry | null;
  profile: SettleProfile;
  onOpen: () => void;
  onDone: () => void;
}) {
  const t = SETTLE_T[lang];

  if (!entry) {
    return (
      <section className={HERO}>
        <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#1D4ED8]"><PartyPopper size={14} strokeWidth={2.2} />{t.urgentEyebrow}</p>
        <p className="mt-2 text-[17px] font-extrabold text-[#111827]">{t.allDone}</p>
      </section>
    );
  }

  const { item, dday } = entry;
  const reg = item.timeAxis === 'academic' ? courseRegistration() : null;
  const sub = item.deadline
    ? t.deadlineOn(fmtYmd(addDays(profile.arrival, item.deadline.days)))
    : reg ? `${fmtYmd(reg.start)}${reg.end ? ` ~ ${fmtYmd(reg.end).slice(5)}` : ''}` : '';
  const big = dday ? ddayText(dday, t) : t.bucket[0];
  const bigColor = dday?.tone === 'red' ? '#DC2626' : ACCENT;

  return (
    <section className={HERO}>
      <ItemIcon id={item.id} size={110} strokeWidth={1.2} className="absolute -right-3.5 -top-2.5 opacity-[0.08] pointer-events-none" color={ACCENT} aria-hidden="true" />
      <p className="relative flex items-center gap-1.5 text-[12px] font-bold text-[#1D4ED8]">
        <TriangleAlert size={14} strokeWidth={2.2} />{t.urgentEyebrow}
      </p>
      <div className="relative mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[19px] font-extrabold leading-snug text-[#111827]">{loc(item.name, lang)}</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#475569] line-clamp-2"><RichText text={loc(item.summary, lang)} /></p>
        </div>
        <div className="shrink-0 text-right">
          {/* "D-83"처럼 짧으면 크게, "기한 10일 초과"처럼 길면 줄여서 제목을 밀어내지 않게 */}
          <p className={`${big.length > 6 ? 'text-[20px]' : 'text-[34px]'} font-extrabold leading-none tracking-tight tabular-nums whitespace-nowrap`} style={{ color: bigColor }}>{big}</p>
          {sub && <p className="mt-1 text-[11px] text-[#64748B] tabular-nums whitespace-nowrap">{sub}</p>}
        </div>
      </div>
      <div className="relative mt-3.5 flex gap-2">
        <button type="button" onClick={onOpen} className="flex-1 h-[42px] flex items-center justify-center gap-1.5 rounded-xl border-none bg-[#1D4ED8] text-[14px] font-bold text-white cursor-pointer">
          <ListChecks size={17} strokeWidth={2} />{t.viewDetail}
        </button>
        <button type="button" onClick={onDone} className="h-[42px] px-3.5 flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#475569] cursor-pointer">
          <Check size={16} strokeWidth={2.4} />{t.doneLabel}
        </button>
      </div>
    </section>
  );
}
