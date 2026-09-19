import Link from 'next/link';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import type { UILang } from '../../lib/categories';
import { getFacilityStatus, localizeFacility, type CampusFacility } from '../../lib/campusFacilities';
import { CAMPUS_T } from '../../lib/campusI18n';
import FacilityThumb from './FacilityThumb';
import { SourceBadge, StatusBadge } from './CampusBadges';

interface Props {
  facility: CampusFacility;
  lang: UILang;
  /** useNowMinute() 값. null 이면(서버 렌더·하이드레이션 중) 운영 상태를 표시하지 않는다 */
  now: number | null;
}

/** 목록용 세로 카드: 썸네일 + 시설명·상태·위치·운영시간·설명·출처 */
export default function FacilityCard({ facility, lang, now }: Props) {
  const t = CAMPUS_T[lang];
  const c = localizeFacility(facility, lang);
  const status = now === null ? null : getFacilityStatus(facility.hours, now);

  return (
    <Link
      href={`/campus/${facility.id}`}
      className="flex gap-3 bg-white rounded-2xl border border-[#E5E7EB] p-3 no-underline
                 hover:border-[#CBD5E1] active:scale-[0.99] transition-all"
    >
      <FacilityThumb facility={facility} variant="list" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 min-w-0 text-[14.5px] font-bold text-[#111827] leading-snug line-clamp-2">{c.title}</h3>
          {status && <StatusBadge status={status} lang={lang} />}
        </div>

        {c.location && (
          <p className="mt-1 flex items-start gap-1 text-[12px] text-[#475569] leading-snug">
            <MapPin size={12} strokeWidth={2} className="shrink-0 mt-[2px] text-[#94A3B8]" />
            <span className="min-w-0 line-clamp-2">{c.location}</span>
          </p>
        )}
        {c.hoursText && (
          <p className="mt-0.5 flex items-start gap-1 text-[12px] text-[#475569] leading-snug">
            <Clock size={12} strokeWidth={2} className="shrink-0 mt-[2px] text-[#94A3B8]" />
            <span className="min-w-0 line-clamp-1">{c.hoursText[0]}</span>
          </p>
        )}
        {c.description && (
          <p className="mt-1 text-[12px] text-[#94A3B8] leading-snug line-clamp-2">{c.description}</p>
        )}

        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <SourceBadge facility={facility} lang={lang} />
          <span className="text-[10.5px] text-[#94A3B8]">{t.types[facility.type]}</span>
        </div>
        {facility.sourceType === 'student-tip' && !facility.pending && (
          <p className="mt-1 text-[10px] text-[#A3AEBD] leading-snug">{t.tipNote}</p>
        )}
      </div>
    </Link>
  );
}

/** "지금 많이 찾는 정보"용 한 줄 카드: 원형 아이콘 + 제목·위치 + 출처 배지 */
export function InfoCard({ facility, lang }: Omit<Props, 'now'>) {
  const c = localizeFacility(facility, lang);

  return (
    <Link
      href={`/campus/${facility.id}`}
      className="flex items-center gap-3 px-4 py-3 no-underline hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors"
    >
      <FacilityThumb facility={facility} variant="round" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-[#111827] leading-snug truncate">{c.title}</p>
        {(c.location ?? c.description) && (
          <p className="mt-0.5 text-[12px] text-[#94A3B8] leading-snug truncate">{c.location ?? c.description}</p>
        )}
      </div>
      <SourceBadge facility={facility} lang={lang} />
      <ChevronRight size={16} strokeWidth={2} className="text-[#CBD5E1] shrink-0" />
    </Link>
  );
}
