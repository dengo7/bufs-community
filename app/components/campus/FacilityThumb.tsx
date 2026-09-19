import type { LucideIcon } from 'lucide-react';
import {
  Store, Coffee, Utensils, BookOpen, Printer, Mail, PenTool, Camera, Plane, House, Phone,
  ArrowUpDown, Search, Sofa, Cross, ShowerHead, PackageOpen, Bus, MapPinned, Library,
} from 'lucide-react';
import type { CampusFacility, CampusIconName, FacilityType } from '../../lib/campusFacilities';

// 데이터에는 아이콘 이름만 있고, 실제 컴포넌트는 여기서 연결한다
export const CAMPUS_ICONS: Record<CampusIconName, LucideIcon> = {
  Store, Coffee, Utensils, BookOpen, Printer, Mail, PenTool, Camera, Plane, House, Phone,
  ArrowUpDown, Search, Sofa, Cross, ShowerHead, PackageOpen, Bus, MapPinned, Library,
};

// ── 파스텔 톤 (The Well 블루·옐로 + 보조 파스텔) ──────────────
export type CampusTone = 'blue' | 'yellow' | 'purple' | 'mint' | 'pink' | 'sky' | 'peach' | 'gray';

export const CAMPUS_TONES: Record<CampusTone, { bg: string; border: string; fg: string }> = {
  blue:   { bg: '#EFF6FF', border: '#DBE7FE', fg: '#1D4ED8' },
  yellow: { bg: '#FFF7DB', border: '#FBE9A8', fg: '#B8900E' },
  purple: { bg: '#F3EEFD', border: '#E4D9FA', fg: '#7C3AED' },
  mint:   { bg: '#E6F7F0', border: '#C9ECDD', fg: '#1F9D6E' },
  pink:   { bg: '#FDEEF3', border: '#F9D5E1', fg: '#D6497A' },
  sky:    { bg: '#E8F5FC', border: '#CBE7F6', fg: '#1F8AC0' },
  peach:  { bg: '#FDEFE6', border: '#FADCC8', fg: '#D9722E' },
  gray:   { bg: '#F1F5F9', border: '#E2E8F0', fg: '#64748B' },
};

const TYPE_TONE: Record<FacilityType, CampusTone> = {
  'convenience-store': 'blue',
  cafe: 'peach',
  restaurant: 'yellow',
  bookstore: 'mint',
  'print-shop': 'blue',
  'post-office': 'pink',
  stationery: 'purple',
  'photo-studio': 'sky',
  'travel-agency': 'sky',
  'real-estate': 'mint',
  'student-room': 'blue',
  lounge: 'purple',
  'study-room': 'mint',
  clinic: 'pink',
  shower: 'sky',
  elevator: 'gray',
  'lost-found': 'yellow',
  contact: 'blue',
  library: 'mint',
  shuttle: 'blue',
  'campus-map': 'purple',
};

export const toneOf = (f: CampusFacility) => CAMPUS_TONES[TYPE_TONE[f.type]];

interface Props {
  facility: CampusFacility;
  /** list: 목록 카드 썸네일 / round: 정보 카드의 원형 아이콘 / hero: 상세 상단 대표 영역 */
  variant: 'list' | 'round' | 'hero';
}

/**
 * 시설 대표 이미지. 실제 사진(image)이 생기면 그대로 보여 주고,
 * 없으면 유형별 파스텔 배경 + lucide 아이콘 placeholder 로 대체한다.
 */
export default function FacilityThumb({ facility, variant }: Props) {
  const tone = toneOf(facility);
  const Icon = CAMPUS_ICONS[facility.icon];

  const frame =
    variant === 'list'  ? 'w-[72px] h-[72px] rounded-xl shrink-0'
    : variant === 'round' ? 'w-11 h-11 rounded-full shrink-0'
    : 'w-full h-[200px]';
  const iconSize = variant === 'list' ? 30 : variant === 'round' ? 20 : 72;

  if (facility.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={facility.image} alt="" className={`${frame} object-cover`} />
    );
  }

  return (
    <div
      className={`${frame} flex items-center justify-center overflow-hidden`}
      style={{
        backgroundColor: tone.bg,
        backgroundImage: variant === 'hero'
          ? `radial-gradient(circle at 80% 20%, ${tone.border} 0, transparent 45%), radial-gradient(circle at 15% 85%, ${tone.border} 0, transparent 40%)`
          : undefined,
      }}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={variant === 'hero' ? 1.4 : 1.8} color={tone.fg} />
    </div>
  );
}
