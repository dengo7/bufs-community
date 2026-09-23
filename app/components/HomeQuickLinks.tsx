import Link from 'next/link';
import { School, Bus, BookOpen, CalendarDays, type LucideIcon } from 'lucide-react';
import type { UILang } from '../lib/categories';

const QUICK_T = {
  ko: { campus: '캠퍼스',   shuttle: '통학버스', guide: '생활가이드', schedule: '학사일정' },
  en: { campus: 'Campus',   shuttle: 'Shuttle',  guide: 'Life Guide', schedule: 'Schedule' },
  zh: { campus: '校园',     shuttle: '校车',     guide: '生活指南',   schedule: '校历' },
  ja: { campus: 'キャンパス', shuttle: '通学バス', guide: '生活ガイド', schedule: '学事日程' },
} as const;

interface Props {
  lang: UILang;
}

/** 홈 — 주요 페이지 바로가기 4개. 모두 기존 페이지로 연결한다. */
export default function HomeQuickLinks({ lang }: Props) {
  const t = QUICK_T[lang];

  const items: { href: string; Icon: LucideIcon; label: string }[] = [
    { href: '/campus',         Icon: School,       label: t.campus },
    { href: '/campus/shuttle', Icon: Bus,          label: t.shuttle },
    { href: '/guides',         Icon: BookOpen,     label: t.guide },
    { href: '/schedule',       Icon: CalendarDays, label: t.schedule },
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
