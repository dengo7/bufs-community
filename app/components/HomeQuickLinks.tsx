import Link from 'next/link';
import { School, BookOpen, CalendarDays, MapPinned, type LucideIcon } from 'lucide-react';
import type { UILang } from '../lib/categories';
import { CAMPUS_T } from '../lib/campusI18n';

const QUICK_T = {
  ko: { campus: '캠퍼스',   guide: '생활가이드', schedule: '학사일정' },
  en: { campus: 'Campus',   guide: 'Life Guide', schedule: 'Schedule' },
  zh: { campus: '校园',     guide: '生活指南',   schedule: '校历' },
  ja: { campus: 'キャンパス', guide: '生活ガイド', schedule: '学事日程' },
} as const;

interface Props {
  lang: UILang;
}

/**
 * 홈 — 주요 페이지 바로가기 4개. 모두 기존 페이지로 연결한다.
 * 통학버스는 바로 위 ShuttleQuickCard가 직행 입구라 여기서는 빼고,
 * 대신 다른 입구가 없던 캠퍼스맵을 둔다(라벨은 CAMPUS_T.homeCards.map 재사용).
 */
export default function HomeQuickLinks({ lang }: Props) {
  const t = QUICK_T[lang];

  const items: { href: string; Icon: LucideIcon; label: string }[] = [
    { href: '/campus',            Icon: School,       label: t.campus },
    { href: '/guides',            Icon: BookOpen,     label: t.guide },
    { href: '/schedule',          Icon: CalendarDays, label: t.schedule },
    { href: '/campus/campus-map', Icon: MapPinned,    label: CAMPUS_T[lang].homeCards.map[0] },
  ];

  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {items.map(({ href, Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#E5EAF2] bg-white px-1 py-3 no-underline
                     active:scale-[0.98] transition-transform"
        >
          <Icon size={26} strokeWidth={1.7} className="text-[#1D4ED8]" />
          <span className="break-keep text-center text-[12.5px] font-semibold leading-tight text-[#111827]">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}
