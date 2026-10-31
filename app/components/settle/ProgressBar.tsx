import { loc, type PlanEntry } from '../../lib/settle';
import { SETTLE_T } from '../../lib/settleI18n';
import type { SettleCategory } from '../../lib/settleItems';
import type { UILang } from '../../lib/lang';
import { toneOf } from './visual';

const CATEGORIES: SettleCategory[] = ['admin', 'life', 'academic'];

/** 칸형 진행률 — 지금 보이는 항목 하나당 한 칸, 카테고리 색. 아래에 색 범례 */
export default function ProgressBar({ lang, entries, done }: { lang: UILang; entries: PlanEntry[]; done: ReadonlySet<string> }) {
  const t = SETTLE_T[lang];
  const doneCount = entries.filter(e => done.has(e.item.id)).length;
  const shown = CATEGORIES.filter(c => entries.some(e => e.item.category === c));
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13.5px] font-bold text-[#111827]">{t.progress}</h2>
        <p className="text-[12.5px] text-[#64748B] tabular-nums">
          <b className="text-[16px] text-[#1D4ED8]">{doneCount}</b> / {entries.length}
        </p>
      </div>
      <div className="mt-2 flex gap-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={entries.length} aria-valuenow={doneCount} aria-label={t.progress}>
        {entries.map(({ item }) => {
          const c = toneOf(item.category);
          const on = done.has(item.id);
          return (
            <span
              key={item.id}
              title={loc(item.name, lang)}
              className="h-2 flex-1 rounded border"
              style={{ backgroundColor: on ? c.fg : c.bg, borderColor: on ? c.fg : c.border }}
            />
          );
        })}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-[#94A3B8]">
        {shown.map(c => (
          <span key={c} className="flex items-center gap-1">
            <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: toneOf(c).fg }} />{t.category[c]}
          </span>
        ))}
        {doneCount === entries.length && entries.length > 0 && <span className="text-[#15803D] font-semibold">{t.allDone}</span>}
      </p>
    </section>
  );
}
