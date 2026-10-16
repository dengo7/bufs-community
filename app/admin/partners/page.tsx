import type { Metadata } from 'next';
import AdminPartnersView from './AdminPartnersView';

export const metadata: Metadata = {
  title: '제휴 가게 관리',
  robots: { index: false, follow: false },
};

export default function AdminPartnersPage() {
  return <AdminPartnersView />;
}
