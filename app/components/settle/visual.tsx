import { createElement } from 'react';
import {
  BookOpen, Briefcase, GraduationCap, HeartPulse, House, IdCard, Landmark, Smartphone,
  type LucideIcon, type LucideProps,
} from 'lucide-react';
import { CAMPUS_TONES, type CampusTone } from '../campus/FacilityThumb';
import type { SettleCategory } from '../../lib/settleItems';

/** 정착 체크리스트 색·아이콘 — 캠퍼스 가이드의 CAMPUS_TONES를 그대로 쓴다 */
export const ACCENT = '#1D4ED8';

export const CATEGORY_TONE: Record<SettleCategory, CampusTone> = {
  admin: 'blue',
  life: 'mint',
  academic: 'purple',
};

export const toneOf = (c: SettleCategory) => CAMPUS_TONES[CATEGORY_TONE[c]];

const ITEM_ICONS: Record<string, LucideIcon> = {
  mobile_sim: Smartphone,
  alien_registration: IdCard,
  bank_account: Landmark,
  housing_contract: House,
  health_insurance: HeartPulse,
  student_id: GraduationCap,
  course_registration: BookOpen,
  part_time_work: Briefcase,
};
export const iconOf = (id: string): LucideIcon => ITEM_ICONS[id] ?? BookOpen;

/** 항목 아이콘 — 렌더 중에 컴포넌트를 고르지 않도록 createElement로 그린다 */
export function ItemIcon({ id, ...props }: { id: string } & LucideProps) {
  return createElement(iconOf(id), props);
}

/** 40px 아이콘 타일 (캠퍼스 가이드와 같은 크기·모서리) */
export const TILE = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border';

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
export const fmtYmd = (d: string) => d.replaceAll('-', '.');
