'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Bus, Clock, MapPin, Info, TriangleAlert, Wallet, CalendarDays, Route as RouteIcon,
} from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import { useLang } from '../../lib/lang';
import { useNowMinute } from '../../lib/useNowMinute';
import { SHUTTLE_T } from '../../lib/shuttleI18n';
import {
  SHUTTLE_TABS, SHUTTLE_ROUTE_STOPS, SHUTTLE_BOARDING_POINTS, SHUTTLE_LINE_NAMES,
  SHUTTLE_SERVICE_HOURS, SHUTTLE_SOURCE,
  classifyShuttleDay, kstMinutesOfDay, getNextBus, getNextBusForKey, getFirstBusForKey,
  type ShuttleScheduleKey, type ShuttleSection, type ShuttleLineKey,
} from '../../lib/shuttleBus';

/** 시간표 grid 한 개 (탭의 섹션 단위). 오늘 탭일 때만 지난 시각 흐림·다음 차 강조 */
function TimeGrid({ times, nowMinutes, isToday }: {
  times: string[];
  nowMinutes: number | null;
  isToday: boolean;
}) {
  const next = isToday && nowMinutes !== null ? getNextBus(times, nowMinutes) : null;
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {times.map(time => {
        const isNext = next?.time === time;
        const isPast = isToday && nowMinutes !== null && !isNext
          && (() => { const [h, m] = time.split(':').map(Number); return h * 60 + m < nowMinutes; })();
        return (
          <span
            key={time}
            className={`text-center text-[13px] tabular-nums py-1.5 rounded-lg transition-colors
              ${isNext
                ? 'bg-[#1D4ED8] text-white font-bold'
                : isPast
                  ? 'text-[#CBD5E1]'
                  : 'text-[#334155]'}`}
          >
            {time}
          </span>
        );
      })}
    </div>
  );
}

export default function ShuttleView() {
  const lang = useLang();
  const t = SHUTTLE_T[lang];
  const router = useRouter();
  const now = useNowMinute();

  // 오늘의 운행 구분 (SSR 중에는 null → 다음 버스 카드는 마운트 후 표시)
  const todayKey: ShuttleScheduleKey | null = now === null ? null : classifyShuttleDay(now);
  const nowMinutes = now === null ? null : kstMinutesOfDay(now);

  const [selected, setSelected] = useState<ShuttleScheduleKey | null>(null);
  // 방학·주말 탭의 노선 토글. 기본은 첫차가 더 이른 금정 3-2번.
  const [breakLine, setBreakLine] = useState<ShuttleLineKey>('geumjeong-3-2');
  // 기본 선택 탭 = 오늘 구분. 사용자가 고르기 전까지는 자동 값을 따른다.
  const activeKey: ShuttleScheduleKey = selected ?? todayKey ?? 'regular-mon-thu';
  const activeTab = SHUTTLE_TABS.find(tab => tab.key === activeKey)!;
  const isTodayTab = todayKey !== null && activeKey === todayKey;

  // 다음 버스 (항상 오늘 구분 기준, break 는 두 노선 중 빠른 쪽)
  const nextBus = todayKey !== null && nowMinutes !== null
    ? getNextBusForKey(todayKey, nowMinutes)
    : null;
  const firstBus = todayKey !== null ? getFirstBusForKey(todayKey) : null;

  const lineLabel = (line: ShuttleSection['line']) => (line ? SHUTTLE_LINE_NAMES[line][lang] : null);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.back}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[15px] font-bold truncate">{t.title}</p>
            <p className="text-[10.5px] text-[#94A3B8] truncate">{t.school}</p>
          </div>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">

        {/* ── 다음 버스 카드 ── */}
        <div className="rounded-2xl border-2 border-[#1D4ED8]/25 bg-[#EFF6FF] px-4 py-4">
          <div className="flex items-center gap-1.5 text-[#1D4ED8]">
            <Clock size={15} strokeWidth={2.2} />
            <span className="text-[12px] font-bold">{t.nextBus}</span>
            <span className="ml-auto text-[10.5px] font-semibold text-[#1D4ED8]/70 bg-white/70 border border-[#DBE7FE] rounded-md px-2 py-[3px]">
              {t.departBase}
            </span>
          </div>

          {now === null ? (
            // 하이드레이션 전 자리표시 (레이아웃 흔들림 방지)
            <div className="mt-2 h-[38px]" aria-hidden="true" />
          ) : nextBus ? (
            <div className="mt-1.5 flex items-baseline gap-2.5 flex-wrap">
              <span className="text-[34px] font-extrabold tabular-nums text-[#0F172A] leading-none">{nextBus.time}</span>
              <span className="text-[13.5px] font-semibold text-[#1D4ED8]">
                {nextBus.inMinutes === 0 ? t.departsNow : t.departsIn.replace('{n}', String(nextBus.inMinutes))}
              </span>
              {nextBus.line && (
                <span className="text-[11px] font-bold text-[#92702A] bg-[#FFF7DB] border border-[#FBE9A8] rounded-md px-2 py-[3px]">
                  {lineLabel(nextBus.line)}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-1.5">
              <p className="text-[16px] font-extrabold text-[#0F172A]">{t.serviceEnded}</p>
              {firstBus && (
                <p className="mt-1 text-[13px] text-[#475569]">
                  {t.firstBus} <span className="font-bold tabular-nums">{firstBus.time}</span>
                  {firstBus.line && <span className="ml-1.5 text-[11.5px] text-[#92702A]">{lineLabel(firstBus.line)}</span>}
                </p>
              )}
            </div>
          )}

          <p className="mt-2.5 text-[10.5px] text-[#64748B] leading-snug">{t.disclaimer}</p>
        </div>

        {/* ── 운행 구분 탭 ── */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SHUTTLE_TABS.map(tab => {
            const active = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelected(tab.key)}
                className={`flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left cursor-pointer transition-colors
                  ${active
                    ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                    : 'bg-white border-[#E5E7EB] text-[#475569] hover:border-[#CBD5E1]'}`}
              >
                <span className="text-[12.5px] font-bold leading-tight">{t.tabs[tab.key]}</span>
                <span
                  className={`shrink-0 text-[10px] font-bold rounded-md px-1.5 py-[2px]
                    ${active
                      ? 'bg-white/20 text-white'
                      : tab.fare === 'free'
                        ? 'bg-[#E6F7F0] text-[#1F9D6E]'
                        : 'bg-[#FFF7DB] text-[#B8900E]'}`}
                >
                  {tab.fare === 'free' ? t.fareFree : t.farePaid}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 시간표 ── */}
        <div className="mt-4 rounded-2xl bg-white border border-[#E5E7EB] px-4 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarDays size={15} strokeWidth={2} className="text-[#1D4ED8]" />
            <h2 className="text-[14px] font-bold text-[#111827]">{t.timetableTitle}</h2>
            <span className="text-[10.5px] text-[#94A3B8]">· {t.tabs[activeKey]}</span>
          </div>

          {/* 방학·주말 탭에만 노선 토글 (상위 탭과 구분되는 하위 세그먼트 컨트롤) */}
          {activeKey === 'break' && (
            <div
              role="group"
              aria-label={t.lineSelect}
              className="mb-3 flex bg-[#F1F5F9] rounded-xl p-1"
            >
              {activeTab.sections.map(section => section.line && (
                <button
                  key={section.line}
                  type="button"
                  onClick={() => setBreakLine(section.line!)}
                  className={`flex-1 py-1.5 text-[12.5px] font-semibold rounded-lg border-none cursor-pointer transition-all
                    ${breakLine === section.line
                      ? 'bg-white text-[#1D4ED8] shadow-sm font-bold'
                      : 'bg-transparent text-[#64748B]'}`}
                >
                  {lineLabel(section.line)}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {(activeKey === 'break'
              ? activeTab.sections.filter(section => section.line === breakLine)
              : activeTab.sections
            ).map(section => (
              <TimeGrid
                key={section.line ?? 'single'}
                times={section.times}
                nowMinutes={nowMinutes}
                isToday={isTodayTab}
              />
            ))}
          </div>
        </div>

        {/* ── 노선 안내 ── */}
        <div className="mt-4 rounded-2xl bg-white border border-[#E5E7EB] px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <RouteIcon size={15} strokeWidth={2} className="text-[#1D4ED8]" />
            <h2 className="text-[14px] font-bold text-[#111827]">{t.routeTitle}</h2>
          </div>
          <p className="mb-3 text-[11.5px] text-[#64748B] leading-snug">{t.routeNote}</p>

          <ol className="flex flex-col">
            {SHUTTLE_ROUTE_STOPS.map((stop, i) => {
              const isLast = i === SHUTTLE_ROUTE_STOPS.length - 1;
              return (
                <li key={stop.name.ko} className="flex gap-3">
                  {/* 타임라인 점·선 */}
                  <div className="flex flex-col items-center w-3 shrink-0">
                    <span className={`mt-[5px] h-2.5 w-2.5 rounded-full border-2 shrink-0
                      ${i === 0 || isLast ? 'bg-[#1D4ED8] border-[#1D4ED8]' : 'bg-white border-[#93C5FD]'}`} />
                    {!isLast && <span className="w-[2px] flex-1 min-h-[14px] bg-[#DBE7FE]" />}
                  </div>
                  <p className={`pb-3 text-[13px] leading-snug ${i === 0 || isLast ? 'font-bold text-[#0F172A]' : 'text-[#475569]'}`}>
                    {stop.name[lang]}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── 탑승 위치 ── */}
        <div className="mt-4 rounded-2xl bg-white border border-[#E5E7EB] px-4 py-4">
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin size={15} strokeWidth={2} className="text-[#1D4ED8]" />
            <h2 className="text-[14px] font-bold text-[#111827]">{t.boardingTitle}</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {SHUTTLE_BOARDING_POINTS.map(point => (
              <div key={point.id} className="flex items-center gap-3 rounded-xl border border-[#EEF2F7] p-2.5">
                {point.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={point.image} alt="" className="w-[64px] h-[64px] rounded-lg object-cover shrink-0" />
                ) : (
                  <span className="flex w-[64px] h-[64px] items-center justify-center rounded-lg bg-[#EFF6FF] shrink-0" aria-hidden="true">
                    <Bus size={26} strokeWidth={1.6} className="text-[#1D4ED8]" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-[#0F172A]">{point.name[lang]}</p>
                  <p className="mt-0.5 text-[12px] text-[#64748B] leading-snug">{point.desc[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 운행 안내 ── */}
        <div className="mt-4 rounded-2xl bg-white border border-[#E5E7EB] px-4 py-1">
          <div className="flex items-center gap-1.5 pt-3 pb-1">
            <Info size={15} strokeWidth={2} className="text-[#1D4ED8]" />
            <h2 className="text-[14px] font-bold text-[#111827]">{t.infoTitle}</h2>
          </div>
          {[
            { Icon: CalendarDays, label: t.infoCategory, value: t.infoCategoryValue },
            { Icon: Bus, label: t.infoBase, value: t.infoBaseValue },
            { Icon: Clock, label: t.infoHours, value: SHUTTLE_SERVICE_HOURS },
            { Icon: Wallet, label: t.infoFare, value: `${t.infoFareValue} (${t.fareUnknown})` },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 py-3 border-b border-[#F1F5F9] last:border-b-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] shrink-0">
                <Icon size={16} strokeWidth={1.9} className="text-[#1D4ED8]" />
              </span>
              <div className="flex-1 min-w-0 pt-[2px]">
                <p className="text-[11px] text-[#94A3B8] leading-none mb-1">{label}</p>
                <p className="text-[14px] text-[#111827] leading-snug break-words">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 참고사항 (정문 정류장 변경) */}
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#FBE9A8] bg-[#FFF9E6] px-3.5 py-3">
          <TriangleAlert size={16} strokeWidth={2} className="shrink-0 mt-[2px] text-[#B8900E]" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#92702A]">{t.infoNotes}</p>
            <p className="mt-0.5 text-[13px] text-[#475569] leading-relaxed break-words">{t.infoNotesValue}</p>
          </div>
        </div>

        {/* 출처 · 기준일 */}
        <p className="mt-4 text-[10.5px] text-[#94A3B8] text-center">
          {t.sourceLabel}: {SHUTTLE_SOURCE.name} · {t.lastVerified}: {SHUTTLE_SOURCE.lastVerified}
        </p>
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
