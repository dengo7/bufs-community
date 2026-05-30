'use client';

import { useEffect, useRef } from 'react';
import BottomTabBar from '../components/BottomTabBar';
import { SCHEDULE, fmtDate, fmtRange, type ScheduleItem } from '../lib/schedule';

/* ── 전처리: 연도 구분선 플래그 + 상태 분류 ── */
function buildItems(today: string) {
  let nearestIdx = -1;
  for (let i = 0; i < SCHEDULE.length; i++) {
    if ((SCHEDULE[i].end ?? SCHEDULE[i].start) >= today) {
      nearestIdx = i;
      break;
    }
  }

  return SCHEDULE.map((item, idx) => {
    const year   = item.start.slice(0, 4);
    const prevY  = idx > 0 ? SCHEDULE[idx - 1].start.slice(0, 4) : null;
    const endKey = item.end ?? item.start;
    return {
      ...item,
      idx,
      year,
      showYear: prevY === null || year !== prevY,
      past:     endKey < today,
      nearest:  idx === nearestIdx,
    };
  });
}

export default function SchedulePage() {
  const today   = new Date().toISOString().split('T')[0];
  const items   = buildItems(today);
  const nearRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    nearRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center h-[54px] px-4">
          <span className="text-[15px] font-bold">학사일정</span>
          <span className="ml-2 text-[12px] text-gray-400">2026–2027</span>
        </div>
      </header>

      {/* ── 리스트 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-3 pb-24">
        {items.map(item => (
          <div key={item.idx}>
            {/* 연도 구분 */}
            {item.showYear && (
              <div className={`pb-2 ${item.idx === 0 ? 'pt-1' : 'pt-5'}`}>
                <span className="text-[11px] font-bold text-[#F6C21A] bg-[#2F2F2F] px-2.5 py-0.5 rounded">
                  {item.year}
                </span>
              </div>
            )}

            {/* 일정 행 */}
            <div
              ref={item.nearest ? nearRef : null}
              className={[
                'flex items-start gap-3 py-3 border-b border-gray-100 transition-opacity',
                item.nearest  ? 'bg-[#FFF9E6] rounded-xl -mx-2 px-2' : '',
                item.past     ? 'opacity-35' : '',
              ].join(' ')}
            >
              {/* 날짜 뱃지 */}
              <span
                className={[
                  'shrink-0 mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                  item.nearest ? 'bg-[#F6C21A] text-[#2F2F2F]'
                    : item.past  ? 'bg-gray-100 text-gray-400'
                    :              'bg-[#EBEBEB] text-gray-600',
                ].join(' ')}
              >
                {fmtRange(item)}
              </span>

              {/* 제목 */}
              <span
                className={[
                  'text-[13px] leading-snug flex-1',
                  item.nearest ? 'font-semibold text-[#1A1A1A]'
                    : item.past  ? 'text-gray-400'
                    :              'text-[#1A1A1A]',
                ].join(' ')}
              >
                {item.title}
              </span>
            </div>
          </div>
        ))}

        <p className="text-center text-[11px] text-gray-300 pt-6 pb-2">
          부산외국어대학교 2026–2027학년도 학사일정
        </p>
      </div>

      <BottomTabBar />
    </div>
  );
}
