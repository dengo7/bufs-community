import type { Metadata } from 'next';
import ScanTestView from './ScanTestView';

// 실기기 QR 스캔 동작 확인용 숨김 페이지 — 메뉴에 노출하지 않고 DB도 쓰지 않는다
export const metadata: Metadata = {
  title: 'QR scan test',
  robots: { index: false, follow: false },
};

export default function ScanTestPage() {
  return <ScanTestView />;
}
