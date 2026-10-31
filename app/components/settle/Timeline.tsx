'use client';

import { Check, Flag } from 'lucide-react';
import { SCHEDULE_TITLE_I18N } from '../../lib/scheduleI18n';
import { loc, type PlanEntry, type SettleProfile, type TimelineNode } from '../../lib/settle';
import { SETTLE_T, type SettleDict } from '../../lib/settleI18n';
import type { UILang } from '../../lib/lang';
import DdayBadge, { CheckingBadge } from './DdayBadge';
import { ACCENT, fmtYmd, ItemIcon, TILE, toneOf } from './visual';
import RichText from './RichText';

const LINE_DONE = ACCENT;
const LINE_TODO = '#E2E8F0';

function TimelineItem({
  lang, entry, done, onOpen, onToggle,
}: {
  lang: UILang;
  entry: PlanEntry;
  done: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const t = SETTLE_T[lang];
  const { item, dday } = entry;
  const c = toneOf(item.category);
  return (
    <li className={`mt-2 flex items-center rounded-2xl border border-[#E5E7EB] bg-white ${done ? 'opacity-55' : ''}`}>
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-2.5 py-2.5 pl-3 pr-1 text-left bg-transparent border-none cursor-pointer">
        <span className={TILE} style={{ backgroundColor: c.bg, borderColor: c.border }}>
          <ItemIcon id={item.id} size={21} strokeWidth={1.8} color={c.fg} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[14px] font-bold ${done ? 'line-through text-[#64748B]' : 'text-[#111827]'}`}>{loc(item.name, lang)}</span>
            {!done && dday && <DdayBadge dday={dday} t={t} />}
            {!done && item.detail.confidence === 'low' && <CheckingBadge t={t} />}
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[#64748B] line-clamp-2"><RichText text={loc(item.summary, lang)} /></span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${loc(item.name, lang)} — ${done ? t.markUndone : t.markDone}`}
        className="shrink-0 w-12 self-stretch flex items-center justify-center bg-transparent border-none cursor-pointer"
      >
        <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
          done ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white' : 'border-[#CBD5E1] text-transparent'}`}>
          <Check size={13} strokeWidth={3} />
        </span>
      </button>
    </li>
  );
}

function nodeHead(node: TimelineNode, profile: SettleProfile, lang: UILang, t: SettleDict, done: ReadonlySet<string>) {
  switch (node.kind) {
    case 'today':
      return <p className="text-[13px] font-extrabold text-[#1D4ED8]">{node.day < 0 ? t.dayBefore(-node.day) : `D+${node.day}`} · {t.today}</p>;
    case 'phase': {
      const range = node.endDay !== null ? `D+${node.day}~${node.endDay}` : `D+${node.day}`;
      const sub = node.phase === 'arrival' ? `${t.phase.arrival} · ${fmtYmd(profile.arrival)}` : t.phase[node.phase];
      return <p className="text-[13px] font-extrabold text-[#111827]">{range} <span className="text-[12px] font-semibold text-[#94A3B8]">{sub}</span></p>;
    }
    case 'deadline': {
      const finished = done.has(node.entry.item.id);
      const color = finished ? 'text-[#94A3B8]' : 'text-[#DC2626]';
      return (
        <p className={`text-[13px] font-extrabold ${color}`}>
          D+{node.day} <span className="text-[12px] font-semibold">{t.deadlineNode(loc(node.entry.item.name, lang))} · {fmtYmd(node.date)}</span>
          {finished && <span className="ml-1 text-[12px] font-semibold text-[#15803D]">· {t.doneLabel}</span>}
        </p>
      );
    }
    case 'academic': {
      const s = node.schedule;
      const title = lang === 'ko' ? s.title : SCHEDULE_TITLE_I18N[s.title]?.[lang] ?? s.title;
      return <p className="text-[13px] font-extrabold text-[#111827]">{fmtYmd(s.start)} <span className="text-[12px] font-semibold text-[#94A3B8]">{t.academicNode} · {title}</span></p>;
    }
  }
}

function NodeDot({ node, past, allDone, deadlineDone }: { node: TimelineNode; past: boolean; allDone: boolean; deadlineDone: boolean }) {
  if (node.kind === 'today') {
    return (
      <span className="absolute left-[-1px] top-0 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1D4ED8] shadow-[0_0_0_4px_#DBE7FE]">
        <Flag size={12} strokeWidth={2.4} color="#fff" />
      </span>
    );
  }
  if (node.kind === 'deadline') {
    return <span className={`absolute left-[2px] top-[2px] h-4 w-4 rounded-full border-2 ${deadlineDone ? 'border-[#CBD5E1] bg-white' : 'border-[#DC2626] bg-[#FEF2F2]'}`} />;
  }
  if (allDone) {
    return (
      <span className="absolute left-[1px] top-[1px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1D4ED8]">
        <Check size={11} strokeWidth={3.2} color="#fff" />
      </span>
    );
  }
  return <span className={`absolute left-[3px] top-[3px] h-3.5 w-3.5 rounded-full border-[3px] bg-white ${past ? 'border-[#1D4ED8]' : 'border-[#CBD5E1]'}`} />;
}

/** 입국일부터 이어지는 세로 타임라인 — 마디는 lib/settle.buildTimeline이 계산한다 */
export default function Timeline({
  lang, profile, nodes, todayIndex, done, onOpen, onToggle,
}: {
  lang: UILang;
  profile: SettleProfile;
  nodes: TimelineNode[];
  todayIndex: number;
  done: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const t = SETTLE_T[lang];
  return (
    <ol className="relative">
      {nodes.map((node, i) => {
        const entries = node.kind === 'phase' || node.kind === 'academic' ? node.entries : [];
        const last = i === nodes.length - 1;
        const key = node.kind === 'phase' ? `p-${node.phase}` : node.kind === 'deadline' ? `d-${node.entry.item.id}` : node.kind === 'academic' ? 'a' : 'today';
        return (
          <li key={key} className={`relative pl-[34px] ${last ? '' : 'pb-[18px]'}`}>
            {/* 이 마디에서 다음 마디까지의 선 — 오늘 이전 구간은 파란색 */}
            {!last && (
              <span
                aria-hidden="true"
                className="absolute left-[9px] top-[14px] -bottom-[4px] w-[2px]"
                style={{ backgroundColor: i < todayIndex ? LINE_DONE : LINE_TODO }}
              />
            )}
            <NodeDot
              node={node}
              past={i < todayIndex}
              allDone={entries.length > 0 && entries.every(e => done.has(e.item.id))}
              deadlineDone={node.kind === 'deadline' && done.has(node.entry.item.id)}
            />
            {nodeHead(node, profile, lang, t, done)}
            {entries.length > 0 && (
              <ul>
                {entries.map(e => (
                  <TimelineItem
                    key={e.item.id}
                    lang={lang}
                    entry={e}
                    done={done.has(e.item.id)}
                    onOpen={() => onOpen(e.item.id)}
                    onToggle={() => onToggle(e.item.id)}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
