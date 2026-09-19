'use client';

import Link from 'next/link';
import { Bus, ChevronRight } from 'lucide-react';
import type { UILang } from '../../lib/categories';
import { useNowMinute } from '../../lib/useNowMinute';
import { SHUTTLE_T } from '../../lib/shuttleI18n';
import {
  SHUTTLE_LINE_NAMES, classifyShuttleDay, kstMinutesOfDay, getNextBusForKey, getFirstBusForKey,
} from '../../lib/shuttleBus';

interface Props {
  lang: UILang;
}

/** 홈 — 통학버스 다음 출발 퀵 카드. 전체 시간표는 /campus/shuttle 에서 본다. */
export default function ShuttleQuickCard({ lang }: Props) {
  const t = SHUTTLE_T[lang];
  const now = useNowMinute();

  // SSR/하이드레이션 중(now === null)에는 시각 계산을 하지 않고 자리만 유지한다.
  const todayKey = now === null ? null : classifyShuttleDay(now);
  const nextBus = now === null || todayKey === null
    ? null
    : getNextBusForKey(todayKey, kstMinutesOfDay(now));
  const firstBus = todayKey === null ? null : getFirstBusForKey(todayKey);
  const ended = now !== null && nextBus === null;

  const line = ended ? firstBus?.line : nextBus?.line;

  return (
    <Link
      href="/campus/shuttle"
      className="mt-2 flex items-center gap-3 bg-white rounded-2xl border border-[#E5E7EB] px-3.5 py-3 no-underline
                 hover:border-[#CBD5E1] active:scale-[0.99] transition-all"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] shrink-0">
        <Bus size={20} strokeWidth={1.8} className="text-[#1D4ED8]" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#1D4ED8]">{t.nextBus}</span>
          <span className="text-[9.5px] text-[#94A3B8]">· {t.departBase}</span>
        </div>

        {now === null ? (
          // 하이드레이션 전 자리표시 (레이아웃 흔들림 방지)
          <div className="mt-0.5 h-[20px]" aria-hidden="true" />
        ) : ended ? (
          <p className="mt-0.5 text-[13px] text-[#475569] truncate">
            <span className="font-bold text-[#0F172A]">{t.serviceEnded}</span>
            {firstBus && (
              <span className="ml-1.5">
                {t.firstBus} <span className="font-bold tabular-nums">{firstBus.time}</span>
              </span>
            )}
          </p>
        ) : (
          <p className="mt-0.5 flex items-baseline gap-1.5 min-w-0">
            <span className="text-[17px] font-extrabold tabular-nums text-[#0F172A] leading-none shrink-0">
              {nextBus!.time}
            </span>
            <span className="text-[12px] font-semibold text-[#1D4ED8] truncate">
              {nextBus!.inMinutes === 0 ? t.departsNow : t.departsIn.replace('{n}', String(nextBus!.inMinutes))}
            </span>
          </p>
        )}
      </div>

      {line && (
        <span className="shrink-0 text-[10px] font-bold text-[#92702A] bg-[#FFF7DB] border border-[#FBE9A8] rounded-md px-1.5 py-[2px]">
          {SHUTTLE_LINE_NAMES[line][lang]}
        </span>
      )}
      <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-[#CBD5E1]" />
    </Link>
  );
}
