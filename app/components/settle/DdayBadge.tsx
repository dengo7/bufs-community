import type { Dday } from '../../lib/settle';
import type { SettleDict } from '../../lib/settleI18n';

// 캠퍼스 가이드 배지(CampusBadges)와 같은 테두리형 알약
const TONE = {
  red: 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
  amber: 'bg-[#FFF4D6] border-[#FBE9A8] text-[#B45309]',
  gray: 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]',
} as const;

export const PILL = 'inline-flex items-center h-[22px] px-2 rounded-full border text-[11.5px] font-bold whitespace-nowrap';

export function ddayText(d: Dday, t: SettleDict): string {
  if (d.kind === 'closed') return t.closed;
  if (d.kind === 'overdue') return t.overdue(d.days);
  if (d.kind === 'today') return t.ddayToday;
  return t.ddayLeft(d.days);
}

export default function DdayBadge({ dday, t }: { dday: Dday; t: SettleDict }) {
  return <span className={`${PILL} ${TONE[dday.tone]}`}>{ddayText(dday, t)}</span>;
}

export function CheckingBadge({ t }: { t: SettleDict }) {
  return <span className={`${PILL} ${TONE.gray}`}>{t.checking}</span>;
}
