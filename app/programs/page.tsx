'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CalendarDays, ChevronRight, Languages } from 'lucide-react';
import BottomTabBar from '../components/BottomTabBar';
import { useLang } from '../lib/lang';
import { useNowMinute } from '../lib/useNowMinute';
import {
  FORMAT_CHIP, PROGRAM_T, STATUS_CHIP, TYPE_CHIP,
  applyStatus, daysUntilClose, fetchPrograms, formatDateTime, hasProgramTranslation, programText,
  type ProgramRow,
} from '../lib/programs';

/** 비교과 프로그램 목록 — 공개 행 전체. 항목을 누르면 앱 안의 상세(/programs/[slug])로. */
export default function ProgramsPage() {
  const router = useRouter();
  const lang = useLang();
  const t = PROGRAM_T[lang];
  const now = useNowMinute();

  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 진입 경로로 그대로 돌아간다. 히스토리가 없을 때만 홈으로 폴백.
  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  useEffect(() => {
    let cancelled = false;
    fetchPrograms().then(rows => {
      if (cancelled) return;
      setPrograms(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.back}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[15px] font-bold truncate">{t.sectionTitle}</span>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-tabbar">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-24 mb-2.5" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-50 rounded w-32" />
              </div>
            ))}
          </div>
        ) : !programs.length ? (
          <p className="text-center text-gray-400 text-sm py-16">{t.empty}</p>
        ) : (
          <div className="space-y-2">
            {programs.map(p => {
              // 서버 렌더/하이드레이션 중(now === null)에는 상태 칩을 그리지 않는다
              const status = now === null ? 'unknown' : applyStatus(p, now);
              const days = now === null ? null : daysUntilClose(p, now);
              const type = programText(p, lang, 'program_type');
              return (
                <Link
                  key={p.id}
                  href={`/programs/${p.slug}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 no-underline
                             hover:border-[#CBD5E1] active:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {type && (
                      <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-[1px] rounded-md border ${TYPE_CHIP}`}>
                        {type}
                      </span>
                    )}
                    {p.format && (
                      <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-[1px] rounded-md border ${FORMAT_CHIP}`}>
                        {t.format[p.format]}
                      </span>
                    )}
                    {status !== 'unknown' && (
                      <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-[1px] rounded-md border ${STATUS_CHIP[status]}`}>
                        {status === 'open' && days !== null ? t.closesIn(days) : t.status[status]}
                      </span>
                    )}
                    {hasProgramTranslation(p, lang) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500
                                       bg-slate-50 border border-slate-200 rounded-md px-1.5 py-[1px]">
                        <Languages size={9} strokeWidth={2} />
                        {t.translated}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <p className="flex-1 min-w-0 text-[14px] font-semibold text-[#1A2236] leading-snug line-clamp-2">
                      {programText(p, lang, 'title')}
                    </p>
                    <ChevronRight size={16} strokeWidth={1.8} className="text-[#CBD5E1] shrink-0 mt-0.5" />
                  </div>

                  <div className="mt-2.5 flex flex-col gap-1 text-[12px] text-slate-500">
                    {p.department && (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Building2 size={12} strokeWidth={1.8} className="shrink-0 text-slate-400" />
                        <span className="truncate">{programText(p, lang, 'department')}</span>
                      </span>
                    )}
                    {p.event_at && (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <CalendarDays size={12} strokeWidth={1.8} className="shrink-0 text-slate-400" />
                        <span className="truncate">{formatDateTime(p.event_at, lang)}</span>
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
