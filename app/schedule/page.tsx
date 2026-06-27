'use client';

import { useState, useEffect, useRef } from 'react';
import { Sun } from 'lucide-react';
import BottomTabBar from '../components/BottomTabBar';
import {
  SCHEDULE,
  SCHEDULE_STYLES,
  fmtDate,
  getScheduleType,
  type ScheduleItem,
  type ScheduleType,
} from '../lib/schedule';
import { SCHEDULE_LABELS, SCHEDULE_TITLE_I18N } from '../lib/scheduleI18n';
import { getLang, setLang as persistLang } from '../lib/lang';

type UILang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

// ── 날짜 칩 포맷 ──────────────────────────────────────────────
function fmtChip(item: ScheduleItem): string {
  if (!item.end) return fmtDate(item.start);
  const sm = item.start.slice(5, 7);
  const em = item.end.slice(5, 7);
  const sd = item.start.slice(8);
  const ed = item.end.slice(8);
  return sm === em ? `${sm}.${sd}~${ed}` : `${sm}.${sd}~${em}.${ed}`;
}

// ── 타입 아이콘 ───────────────────────────────────────────────
function TypeIcon({ type, title, color }: { type: ScheduleType; title: string; color: string }) {
  const { Icon } = SCHEDULE_STYLES[type];
  const ActualIcon = (type === 'holiday' && title.includes('방학')) ? Sun : Icon;
  return <ActualIcon size={14} strokeWidth={1.8} color={color} />;
}

// ── 제목 번역 ─────────────────────────────────────────────────
function localTitle(koTitle: string, lang: UILang): string {
  if (lang === 'ko') return koTitle;
  return SCHEDULE_TITLE_I18N[koTitle]?.[lang] ?? koTitle;
}

// ── 월 헤더 레이블 ────────────────────────────────────────────
const MONTH_NAMES: Record<UILang, string[]> = {
  ko: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  zh: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
};

function monthLabel(key: string, lang: UILang): string {
  const [y, m] = key.split('-');
  const mName = MONTH_NAMES[lang][parseInt(m) - 1];
  return lang === 'en' ? `${mName} ${y}` : `${y}년 ${mName}`;
}

// ── 데이터 전처리 ─────────────────────────────────────────────
type ProcessedItem = ScheduleItem & {
  idx: number;
  past: boolean;
  nearest: boolean;
  ongoing: boolean;
  type: ScheduleType;
};

type MonthGroup = { key: string; items: ProcessedItem[] };

function buildGroups(today: string): MonthGroup[] {
  let nearestIdx = -1;
  for (let i = 0; i < SCHEDULE.length; i++) {
    if (SCHEDULE[i].start > today) { nearestIdx = i; break; }
  }
  const groups: MonthGroup[] = [];
  SCHEDULE.forEach((item, idx) => {
    const key = item.start.slice(0, 7);
    let group = groups.find(g => g.key === key);
    if (!group) { group = { key, items: [] }; groups.push(group); }
    group.items.push({
      ...item,
      idx,
      past:    (item.end ?? item.start) < today,
      ongoing: item.start <= today && (item.end ?? item.start) >= today,
      nearest: idx === nearestIdx,
      type:    getScheduleType(item.title),
    });
  });
  return groups;
}

// ── 페이지 ────────────────────────────────────────────────────
export default function SchedulePage() {
  const [lang, setLang] = useState<UILang>(getLang);
  const today   = new Date().toISOString().split('T')[0];
  const d       = new Date();
  const todayMD = `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
  const groups  = buildGroups(today);
  const labels  = SCHEDULE_LABELS[lang];
  let todayLineShown = false;
  const nearRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    nearRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const legend = [
    { color: '#D85A30', label: labels.exam },
    { color: '#378ADD', label: labels.holiday },
    { color: '#BA7517', label: labels.apply },
    { color: '#888780', label: labels.etc },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-4 gap-2">
          <span className="flex-1 text-[15px] font-bold">{labels.title}</span>
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); persistLang(l); }}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 범례 ── */}
      <div className="bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center gap-4 flex-wrap px-4 py-2.5">
          {legend.map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-600 whitespace-nowrap">
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── 타임라인 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-24">
        {groups.map(group => (
          <div key={group.key} className="mb-6">

            {/* 월 헤더 */}
            <h2
              className="text-[13px] font-bold text-[#1A1A1A] pb-2 mb-2"
              style={{ borderBottom: '0.5px solid #D1D5DB' }}
            >
              {monthLabel(group.key, lang)}
            </h2>

            {/* 아이템 카드 */}
            <div className="flex flex-col gap-[7px]">
              {group.items.map(item => {
                const style = SCHEDULE_STYLES[item.type];
                const showTodayLine = (item.nearest || item.ongoing) && !todayLineShown;
                if (showTodayLine) todayLineShown = true;
                return (
                  <div key={item.idx}>

                    {/* 오늘 구분선 */}
                    {showTodayLine && (
                      <div className="relative flex items-center gap-2.5 py-2 mb-1">
                        <div className="flex-1 h-px" style={{ backgroundColor: '#F6C21A' }} />
                        <span
                          className="text-[11px] font-bold px-2.5 py-[3px] rounded-full whitespace-nowrap shrink-0"
                          style={{ backgroundColor: '#FFF4D6', color: '#B8900E' }}
                        >
                          {labels.today} {todayMD}
                        </span>
                        <div className="flex-1 h-px" style={{ backgroundColor: '#F6C21A' }} />
                      </div>
                    )}

                    {/* 카드 */}
                    <div
                      ref={item.nearest ? nearRef : null}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-opacity',
                        item.nearest ? 'bg-[#FFF9E6]' : 'bg-white',
                        item.past    ? 'opacity-40'   : '',
                      ].join(' ')}
                      style={{
                        border: item.nearest
                          ? '1px solid #F6C21A'
                          : '0.5px solid #E5E7EB',
                      }}
                    >
                      {/* 날짜 칩 */}
                      <span
                        className="shrink-0 text-[10px] font-bold px-[6px] py-[2px] rounded whitespace-nowrap"
                        style={{ backgroundColor: style.chipBg, color: style.chipText }}
                      >
                        {fmtChip(item)}
                      </span>

                      {/* 타입 아이콘 */}
                      <span className="shrink-0">
                        <TypeIcon type={item.type} title={item.title} color={style.iconColor} />
                      </span>

                      {/* 제목 (번역) */}
                      <span className="flex-1 text-[13px] leading-snug text-[#1A1A1A] min-w-0">
                        {localTitle(item.title, lang)}
                      </span>

                      {/* 진행중 / 다가옴 태그 */}
                      {item.ongoing && (
                        <span
                          className="shrink-0 text-[10px] font-bold px-[6px] py-[2px] rounded whitespace-nowrap"
                          style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
                        >
                          진행중
                        </span>
                      )}
                      {item.nearest && !item.ongoing && (
                        <span
                          className="shrink-0 text-[10px] font-bold px-[6px] py-[2px] rounded whitespace-nowrap"
                          style={{ backgroundColor: '#FFE9A8', color: '#854F0B' }}
                        >
                          {labels.upcoming}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <p className="text-center text-[11px] text-gray-300 pt-2 pb-2">
          Busan University of Foreign Studies 2026–2027
        </p>
      </div>

      <BottomTabBar />
    </div>
  );
}
