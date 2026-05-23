'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PenLine, Bell, User } from 'lucide-react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

const TAB_LABELS = {
  home:          { ko: '홈',     en: 'Home',   zh: '首页', ja: 'ホーム' },
  search:        { ko: '검색',   en: 'Search', zh: '搜索', ja: '検索' },
  write:         { ko: '글쓰기', en: 'Write',  zh: '写作', ja: '投稿' },
  notifications: { ko: '알림',   en: 'Alerts', zh: '通知', ja: '通知' },
  my:            { ko: 'MY',     en: 'MY',     zh: 'MY',   ja: 'MY' },
} as const;

interface Props {
  lang?: Lang;
  user?: any;
}

export default function BottomTabBar({ lang = 'ko', user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const label = (key: keyof typeof TAB_LABELS) => TAB_LABELS[key][lang];

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const goAuth = (path: string) => {
    if (!user) router.push('/auth');
    else router.push(path);
  };

  const tabCls = (path: string) =>
    isActive(path) ? 'text-[#F6C21A]' : 'text-gray-400';

  const labelCls = (path: string) =>
    `text-[11px] ${isActive(path) ? 'font-medium' : ''}`;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16">

        {/* 홈 */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] no-underline ${tabCls('/')}`}
        >
          <Home size={24} strokeWidth={isActive('/') ? 2 : 1.8} />
          <span className={labelCls('/')}>{label('home')}</span>
        </Link>

        {/* 검색 */}
        <Link
          href="/search"
          className={`flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] no-underline ${tabCls('/search')}`}
        >
          <Search size={24} strokeWidth={isActive('/search') ? 2 : 1.8} />
          <span className={labelCls('/search')}>{label('search')}</span>
        </Link>

        {/* 글쓰기 – 가운데 노란 원형 버튼 */}
        <button
          onClick={() => goAuth('/write')}
          className={`flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer ${tabCls('/write')}`}
        >
          <div className="w-[52px] h-[52px] -mt-[24px] shrink-0 bg-[#F6C21A] rounded-full flex items-center justify-center shadow-md">
            <PenLine size={24} color="white" strokeWidth={2} />
          </div>
          <span className={`text-[11px] ${isActive('/write') ? 'font-medium text-[#F6C21A]' : 'text-gray-400'}`}>
            {label('write')}
          </span>
        </button>

        {/* 알림 */}
        <button
          onClick={() => goAuth('/notifications')}
          className={`flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer ${tabCls('/notifications')}`}
        >
          <Bell size={24} strokeWidth={isActive('/notifications') ? 2 : 1.8} />
          <span className={labelCls('/notifications')}>{label('notifications')}</span>
        </button>

        {/* MY */}
        <button
          onClick={() => goAuth('/my')}
          className={`flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer ${tabCls('/my')}`}
        >
          <User size={24} strokeWidth={isActive('/my') ? 2 : 1.8} />
          <span className={labelCls('/my')}>{label('my')}</span>
        </button>

      </div>
    </div>
  );
}
