import type { Metadata } from 'next';
import SettleView from './SettleView';

// 유학생 정착 체크리스트 (1단계 MVP) — 아직 관리자 메뉴에서만 진입한다
export const metadata: Metadata = {
  title: 'Settling-in checklist',
  robots: { index: false, follow: false },
};

export default function SettlePage() {
  return <SettleView />;
}
