'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Calendar, User } from 'lucide-react';

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

export default function BottomTabBar({ lang = 'ko', user }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const label = (key: keyof typeof TAB_LABELS) => TAB_LABELS[key][lang];

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  const tabCls = (path: string) =>
    `flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] no-underline
     ${isActive(path) ? 'text-[#F6C21A]' : 'text-gray-400'}`;

  const iconW = (path: string) => isActive(path) ? 2 : 1.8;

  const labelCls = (path: string) =>
    `text-[11px] ${isActive(path) ? 'font-medium' : ''}`;

  const goAuth = (path: string) => {
    if (!user) router.push('/auth');
    else router.push(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16">

        {/* 홈 */}
        <Link href="/" className={tabCls('/')}>
          <Home size={24} strokeWidth={iconW('/')} />
          <span className={labelCls('/')}>{label('home')}</span>
        </Link>

        {/* 커뮤니티 */}
        <Link href="/community" className={tabCls('/community')}>
          <MessageCircle size={24} strokeWidth={iconW('/community')} />
          <span className={labelCls('/community')}>{label('community')}</span>
        </Link>

        {/* 학사일정 */}
        <Link href="/schedule" className={tabCls('/schedule')}>
          <Calendar size={24} strokeWidth={iconW('/schedule')} />
          <span className={labelCls('/schedule')}>{label('schedule')}</span>
        </Link>

        {/* 내정보 */}
        <button
          type="button"
          onClick={() => goAuth('/my')}
          className={`flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer
            ${isActive('/my') ? 'text-[#F6C21A]' : 'text-gray-400'}`}
        >
          <User size={24} strokeWidth={iconW('/my')} />
          <span className={labelCls('/my')}>{label('my')}</span>
        </button>

      </div>
    </div>
  );
}
