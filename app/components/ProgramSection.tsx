'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { UILang } from '../lib/categories';
import { useNowMinute } from '../lib/useNowMinute';
import {
  PROGRAM_T, STATUS_CHIP, TYPE_CHIP,
  daysUntilClose, fetchOpenPrograms, formatDateTime, programText,
  type ProgramRow,
} from '../lib/programs';

const PREVIEW_LIMIT = 2;

interface Props {
  lang: UILang;
}

/**
 * 홈 — 지금 신청할 수 있는 비교과 프로그램 미리보기(마감 가까운 순 2건).
 * 신청 가능한 프로그램이 없거나 테이블이 아직 없으면 섹션 자체를 숨긴다.
 */
export default function ProgramSection({ lang }: Props) {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNowMinute();

  useEffect(() => {
    let cancelled = false;
    fetchOpenPrograms(PREVIEW_LIMIT).then(rows => {
      if (cancelled) return;
      setPrograms(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const t = PROGRAM_T[lang];

  // 로딩 중에도 자리를 잡지 않는다 — 0건이 흔하므로 홈 레이아웃이 들썩이지 않게
  if (loading || !programs.length) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
          <h2 className="text-[15px] font-bold text-[#111827]">{t.sectionTitle}</h2>
        </div>
        <Link
          href="/programs"
          className="text-[13px] text-gray-500 no-underline hover:text-gray-700 transition-colors shrink-0 py-2 -my-2"
        >
          {t.viewAll}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="divide-y divide-gray-50">
          {programs.map(p => {
            const days = now === null ? null : daysUntilClose(p, now);
            const type = programText(p, lang, 'program_type');
            return (
              <Link
                key={p.id}
                href={`/programs/${p.slug}`}
                className="flex items-start gap-2.5 px-4 py-3.5 no-underline
                           hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {type && (
                      <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[1px] rounded-md border ${TYPE_CHIP}`}>
                        {type}
                      </span>
                    )}
                    {days !== null && (
                      <span className={`inline-flex items-center text-[11px] font-bold px-1.5 py-[1px] rounded-md border ${STATUS_CHIP.open}`}>
                        {t.closesIn(days)}
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] text-[#111827] leading-snug line-clamp-2">
                    {programText(p, lang, 'title')}
                  </p>
                  {p.event_at && (
                    <p className="mt-1 flex items-center gap-1 text-[12.5px] text-slate-500">
                      <CalendarDays size={12} strokeWidth={1.8} className="shrink-0" />
                      {formatDateTime(p.event_at, lang)}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} strokeWidth={1.8} className="text-[#CBD5E1] shrink-0 mt-0.5" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
