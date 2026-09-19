import type { UILang } from '../../lib/categories';
import type { CampusFacility, FacilityStatus } from '../../lib/campusFacilities';
import { CAMPUS_T, statusText } from '../../lib/campusI18n';

const BADGE_BASE = 'inline-flex items-center text-[10.5px] font-bold px-2 py-[2px] rounded-full border whitespace-nowrap';

/** 출처 배지: 공식 정보(옐로) / 학생 팁(블루) / 준비 중(그레이) */
export function SourceBadge({ facility, lang }: { facility: CampusFacility; lang: UILang }) {
  const t = CAMPUS_T[lang];
  if (facility.pending) {
    return <span className={`${BADGE_BASE} bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]`}>{t.badgePending}</span>;
  }
  return facility.sourceType === 'official'
    ? <span className={`${BADGE_BASE} bg-[#FFF4D6] border-[#FBE9A8] text-[#92702A]`}>{t.badgeOfficial}</span>
    : <span className={`${BADGE_BASE} bg-[#EFF6FF] border-[#DBE7FE] text-[#1D4ED8]`}>{t.badgeTip}</span>;
}

const STATUS_CLS: Record<FacilityStatus['state'], string> = {
  'open':         'bg-[#E7F7EE] border-[#C8EBD6] text-[#15803D]',
  'closing-soon': 'bg-[#FFF4D6] border-[#FBE9A8] text-[#B45309]',
  'closed':       'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]',
};

/** 운영 상태 배지: 영업 중 / 곧 마감 / 영업 종료 */
export function StatusBadge({ status, lang, withCloseTime = false }: {
  status: FacilityStatus;
  lang: UILang;
  withCloseTime?: boolean;
}) {
  return (
    <span className={`${BADGE_BASE} ${STATUS_CLS[status.state]}`}>
      {statusText(status, lang, withCloseTime)}
    </span>
  );
}
