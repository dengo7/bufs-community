'use client';

import { useState } from 'react';
import { kstToday } from '../../lib/schedule';
import { addDays, settleDateBounds, type SettleProfile } from '../../lib/settle';
import { SETTLE_T } from '../../lib/settleI18n';
import type { SettleHousing, SettleVisa } from '../../lib/settleItems';
import type { UILang } from '../../lib/lang';

const VISAS: SettleVisa[] = ['d2', 'd4', 'other'];
const HOUSINGS: SettleHousing[] = ['dorm', 'solo'];
/** 입국일 빠른 버튼 — 오늘(KST) 기준 며칠 */
const QUICK_DATES = [['in7', 7], ['today', 0], ['ago7', -7], ['ago30', -30]] as const;

/** 입국일 · 체류자격 · 거주형태 세 가지 입력 (처음 설정 / 수정 공용) */
export default function ProfileSetup({
  lang, initial, onSave, onCancel,
}: {
  lang: UILang;
  initial: SettleProfile | null;
  onSave: (p: SettleProfile) => void;
  onCancel?: () => void;
}) {
  const t = SETTLE_T[lang];
  const [arrival, setArrival] = useState(initial?.arrival ?? kstToday());
  const [visa, setVisa] = useState<SettleVisa | null>(initial?.visa ?? null);
  const [housing, setHousing] = useState<SettleHousing | null>(initial?.housing ?? null);
  const { min, max } = settleDateBounds();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(arrival) && visa !== null && housing !== null;

  const opt = (on: boolean) =>
    `h-11 rounded-xl border text-[14px] font-semibold cursor-pointer px-2 ${
      on ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#E5E7EB] bg-white text-[#374151]'}`;

  return (
    <form
      className="px-4 pt-5 pb-8"
      onSubmit={e => {
        e.preventDefault();
        if (valid) onSave({ arrival, visa: visa!, housing: housing! });
      }}
    >
      <h2 className="text-[19px] font-extrabold text-[#111827]">{t.setupTitle}</h2>
      <p className="mt-1.5 text-[13.5px] text-[#6B7280] leading-relaxed">{t.setupSub}</p>

      <fieldset className="mt-6">
        <legend className="text-[14px] font-bold text-[#111827]">{t.arrival}</legend>
        <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{t.arrivalHelp}</p>
        <input
          type="date"
          required
          value={arrival}
          min={min}
          max={max}
          onChange={e => setArrival(e.target.value)}
          className="mt-2 w-full h-12 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[15px] text-[#111827]"
        />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {QUICK_DATES.map(([key, off]) => {
            const v = addDays(kstToday(), off);
            const on = arrival === v;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setArrival(v)}
                className={`h-9 rounded-full border text-[12.5px] font-semibold cursor-pointer ${
                  on ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]' : 'border-[#E5E7EB] bg-white text-[#475569]'}`}
              >
                {t.quickDate[key]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-[14px] font-bold text-[#111827]">{t.visa}</legend>
        <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{t.visaHelp}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {VISAS.map(v => (
            <button key={v} type="button" aria-pressed={visa === v} onClick={() => setVisa(v)} className={opt(visa === v)}>
              {t.visaLabel[v]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-[14px] font-bold text-[#111827]">{t.housing}</legend>
        <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{t.housingHelp}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {HOUSINGS.map(h => (
            <button key={h} type="button" aria-pressed={housing === h} onClick={() => setHousing(h)} className={opt(housing === h)}>
              {t.housingLabel[h]}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-6 text-[12px] text-[#9CA3AF]">{t.localOnly}</p>
      <div className="mt-3 flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 h-12 rounded-2xl border border-[#E5E7EB] bg-white text-[15px] font-bold text-[#4B5563] cursor-pointer">
            {t.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={!valid}
          className="flex-[2] h-12 rounded-2xl border-none bg-[#1D4ED8] text-[15px] font-bold text-white cursor-pointer disabled:opacity-40"
        >
          {t.save}
        </button>
      </div>
    </form>
  );
}
