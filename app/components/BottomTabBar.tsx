'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Calendar, User } from 'lucide-react';
import NProgress from 'nprogress';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

const TAB_LABELS = {
  home:      { ko: '홈',      en: 'Home',      zh: '首页', ja: 'ホーム' },
  community: { ko: '커뮤니티', en: 'Community', zh: '社区', ja: 'コミュニティ' },
  schedule:  { ko: '학사일정', en: 'Schedule',  zh: '日程', ja: '学事日程' },
  my:        { ko: '내정보',  en: 'My',         zh: '我的', ja: 'MY' },
} as const;

interface Props {
  lang?: Lang;
  user?: any;
}

export default function BottomTabBar({ lang = 'ko' }: Props) {
  const pathname = usePathname();

  const label = (key: keyof typeof TAB_LABELS) => TAB_LABELS[key][lang];

  const COMMUNITY_PATHS = ['/community', '/category', '/post', '/guide', '/search'];
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/community') return COMMUNITY_PATHS.some(p => pathname.startsWith(p));
    return pathname.startsWith(path);
  };

  const tabCls = (path: string) =>
    `flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] no-underline
     ${isActive(path) ? 'text-[#1B7CC0]' : 'text-gray-400'}`;

  const iconW = (path: string) => isActive(path) ? 2 : 1.8;

  const handleNav = (path: string) => {
    if (!isActive(path)) NProgress.start();
  };

  const labelCls = (path: string) =>
    `text-[11px] ${isActive(path) ? 'font-medium' : ''}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16">

        {/* 홈 */}
        <Link href="/" className={tabCls('/')} onClick={() => handleNav('/')}>
          <Home size={24} strokeWidth={iconW('/')} />
          <span className={labelCls('/')}>{label('home')}</span>
        </Link>

        {/* 커뮤니티 */}
        <Link href="/community" className={tabCls('/community')} onClick={() => handleNav('/community')}>
          <MessageCircle size={24} strokeWidth={iconW('/community')} />
          <span className={labelCls('/community')}>{label('community')}</span>
        </Link>

        {/* 학사일정 */}
        <Link href="/schedule" className={tabCls('/schedule')} onClick={() => handleNav('/schedule')}>
          <Calendar size={24} strokeWidth={iconW('/schedule')} />
          <span className={labelCls('/schedule')}>{label('schedule')}</span>
        </Link>

        {/* 내정보 */}
        <Link href="/my" className={tabCls('/my')} onClick={() => handleNav('/my')}>
          <User size={24} strokeWidth={iconW('/my')} />
          <span className={labelCls('/my')}>{label('my')}</span>
        </Link>

      </div>
    </div>
  );
}
