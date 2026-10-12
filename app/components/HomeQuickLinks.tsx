import Link from 'next/link';
import { School, BookOpen, Utensils, type LucideIcon } from 'lucide-react';
import type { UILang } from '../lib/categories';
import { CAMPUS_T } from '../lib/campusI18n';

const QUICK_T = {
  ko: { campus: '캠퍼스',   guide: '생활가이드' },
  en: { campus: 'Campus',   guide: 'Life Guide' },
  zh: { campus: '校园',     guide: '生活指南' },
  ja: { campus: 'キャンパス', guide: '生活ガイド' },
} as const;

interface Props {
  lang: UILang;
}

/**
 * 홈 — 주요 페이지 바로가기 3개. 모두 기존 페이지로 연결한다.
 * 통학버스는 바로 위 ShuttleQuickCard가 직행 입구라 여기서는 빼둔다.
 * 학사일정은 하단 탭(모든 폭)과 데스크톱 사이드바 위젯이 입구라 빼고, 식당·카페 필터로 직행한다.
 */
export default function HomeQuickLinks({ lang }: Props) {
  const t = QUICK_T[lang];

  const items: { href: string; Icon: LucideIcon; label: string }[] = [
    { href: '/campus',               Icon: School,   label: t.campus },
    { href: '/guides',               Icon: BookOpen, label: t.guide },
    // 라벨·아이콘은 캠퍼스 화면의 food 카테고리 칩과 같게 (CampusView CATEGORY_META)
    { href: '/campus?category=food', Icon: Utensils, label: CAMPUS_T[lang].categories.food },
  ];

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
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
