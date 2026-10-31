'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ClipboardCopy, Info, Sparkles } from 'lucide-react';
import { loc } from '../../lib/settle';
import { SETTLE_T } from '../../lib/settleI18n';
import { SETTLE_ITEMS } from '../../lib/settleItems';
import type { SettleGuide } from '../../lib/settleGuide';
import type { UILang } from '../../lib/lang';
import { PILL } from './DdayBadge';
import RichText from './RichText';

/** 클립보드 복사 — 막힌 환경에서는 textarea + execCommand로 한 번 더 시도 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * 상세 시트의 "정착 가이드" 박스 — 지금 확인할 점(맞춤 문장) · 끝내면 가능해지는 일 · AI 프롬프트 복사.
 * 문장과 출처는 lib/settleGuide.ts 가 고른다.
 */
export default function GuideBox({
  lang, guide, buildPrompt, onOpenItem,
}: {
  lang: UILang;
  guide: SettleGuide;
  /** 누를 때만 프롬프트를 만든다 */
  buildPrompt: () => string;
  onOpenItem: (id: string) => void;
}) {
  const t = SETTLE_T[lang];
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    const ok = await copyText(buildPrompt());
    setToast(ok ? t.aiCopied : t.aiCopyFailed);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2000);
  };

  return (
    <section className="mt-4 rounded-2xl border border-[#DBE7FE] bg-gradient-to-br from-[#EAF1FE] to-[#F5F9FF] px-3.5 pt-3 pb-3.5">
      <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#1D4ED8]">
        <Sparkles size={14} strokeWidth={2.2} />{t.guideTag}
      </p>

      <h3 className="mt-2 text-[13.5px] font-bold text-[#111827]">{t.guideNow}</h3>
      <ul className="mt-1.5 space-y-1.5">
        {guide.lines.map((g, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-[#1F2937]">
            <span className="shrink-0 mt-[9px] h-1 w-1 rounded-full bg-[#1D4ED8]" />
            <span>
              <RichText text={loc(g.text, lang)} />
              {g.confidence === 'medium' && (
                <span className={`${PILL} ml-1.5 align-middle bg-[#EFF6FF] border-[#DBE7FE] text-[#1D4ED8]`}>{t.confidence.medium}</span>
              )}
              {g.source && (
                <a href={g.source.url} target={g.source.url.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="ml-1.5 text-[11px] text-[#94A3B8] underline">
                  {t.sources}
                </a>
              )}
            </span>
          </li>
        ))}
        {guide.pending && (
          <li className="flex gap-2 text-[13px] leading-relaxed text-[#475569]">
            <Info size={15} className="shrink-0 mt-[3px] text-[#94A3B8]" />{t.guidePending}
          </li>
        )}
      </ul>

      {guide.unlocks.length > 0 && (
        <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5">
          <p className="text-[12.5px] font-bold text-[#475569]">→ {t.guideUnlock}</p>
          <ul className="mt-1.5 space-y-1.5">
            {guide.unlocks.map((u, i) => {
              const target = u.target ? SETTLE_ITEMS.find(x => x.id === u.target) : null;
              return (
                <li key={i} className="text-[13px] leading-relaxed text-[#1F2937]">
                  <RichText text={loc(u.text, lang)} />
                  <a href={u.source.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[11px] text-[#94A3B8] underline">{t.sources}</a>
                  {target && (
                    <button
                      type="button"
                      onClick={() => onOpenItem(target.id)}
                      className="mt-1.5 flex h-8 items-center gap-1 rounded-full border border-[#DBE7FE] bg-[#EFF6FF] px-3 text-[12.5px] font-semibold text-[#1D4ED8] cursor-pointer"
                    >
                      {loc(target.name, lang)}<ArrowRight size={14} strokeWidth={2.2} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={copy}
        className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#1D4ED8] bg-white text-[13.5px] font-bold text-[#1D4ED8] cursor-pointer"
      >
        <ClipboardCopy size={16} strokeWidth={2} />{t.aiCopy}
      </button>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#64748B]">{t.aiHint}</p>
      <p className="mt-2 border-t border-[#DBE7FE] pt-2 text-[11.5px] leading-relaxed text-[#64748B]">📌 {t.guideBasedOn}</p>

      {toast && (
        <div role="status" className="fixed left-1/2 bottom-24 z-[600] -translate-x-1/2 rounded-full bg-[#111827]/90 px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
