import Link from 'next/link';
import { Store, BookOpen, Bus, MapPinned } from 'lucide-react';
import type { UILang } from '../../lib/categories';
import { CAMPUS_T } from '../../lib/campusI18n';
import { CAMPUS_TONES, type CampusTone } from './FacilityThumb';

interface Props {
  lang: UILang;
}

/** 홈 — 캠퍼스 가이드 바로가기 4개. 전체 내용은 /campus 에서 본다. */
export default function CampusGuideSection({ lang }: Props) {
  const t = CAMPUS_T[lang];

  const cards: { href: string; Icon: typeof Store; tone: CampusTone; label: readonly [string, string] }[] = [
    { href: '/campus?category=facility',  Icon: Store,     tone: 'yellow', label: t.homeCards.facility },
    { href: '/campus?category=study',     Icon: BookOpen,  tone: 'blue',   label: t.homeCards.library },
    { href: '/campus?category=transport', Icon: Bus,       tone: 'purple', label: t.homeCards.shuttle },
    { href: '/campus/campus-map',         Icon: MapPinned, tone: 'mint',   label: t.homeCards.map },
  ];

  return (
    <div className="mt-4 mb-4">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
          <h2 className="text-[14px] font-bold text-[#111827]">{t.title}</h2>
        </div>
        <Link
          href="/campus"
          className="text-[12px] text-gray-400 no-underline hover:text-gray-600 transition-colors shrink-0"
        >
          {t.viewAll}
        </Link>
      </div>
      <p className="mt-1 mb-3 px-0.5 text-[12px] text-[#6B7280] leading-snug">{t.homeSub}</p>

      <div className="grid grid-cols-4 gap-2">
        {cards.map(({ href, Icon, tone, label }) => {
          const c = CAMPUS_TONES[tone];
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center text-center rounded-2xl border px-1 py-3 no-underline
                         active:scale-[0.98] transition-transform"
              style={{ backgroundColor: c.bg, borderColor: c.border }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
                <Icon size={21} strokeWidth={1.8} color={c.fg} />
              </span>
              <span className="mt-2 text-[12px] font-bold text-[#111827] leading-tight break-keep">{label[0]}</span>
              <span className="mt-0.5 text-[10px] text-[#6B7280] leading-tight break-keep">{label[1]}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
