'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Calendar, Table2, User } from 'lucide-react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

const TAB_LABELS = {
  home:      { ko: '홈',      en: 'Home',      zh: '首页', ja: 'ホーム' },
  community: { ko: '커뮤니티', en: 'Community', zh: '社区', ja: 'コミュニティ' },
  schedule:  { ko: '학사일정', en: 'Schedule',  zh: '日程', ja: '学事日程' },
  timetable: { ko: '시간표',  en: 'Timetable', zh: '课程表', ja: '時間割' },
  my:        { ko: '내정보',  en: 'My',         zh: '我的', ja: 'MY' },
} as const;

interface Props {
  lang?: Lang;
  // 컴포넌트 내부에서 사용하진 않지만, 호출부에서 로그인 상태를 함께 넘기는 곳들이 있어 시그니처로 받아둔다.
  user?: { id: string } | null;
}

export default function BottomTabBar({ lang = 'ko' }: Props) {
  const pathname = usePathname();

  const label = (key: keyof typeof TAB_LABELS) => TAB_LABELS[key][lang];

  const COMMUNITY_PATHS = ['/community', '/category', '/post', '/guide', '/search'];
  const isActive = (path: string) => {
    // 캠퍼스 가이드(/campus)·학사공지(/notices)는 홈 섹션에서만 진입하므로 홈 탭으로 표시
    if (path === '/') return pathname === '/' || pathname.startsWith('/campus') || pathname.startsWith('/notices');
    if (path === '/community') return COMMUNITY_PATHS.some(p => pathname.startsWith(p));
    return pathname.startsWith(path);
  };

  const tabCls = (path: string) =>
    `flex-1 flex flex-col items-center justify-end pb-[11px] gap-[3px] no-underline
     ${isActive(path) ? 'text-[#1B7CC0]' : 'text-gray-500'}`;

  const iconW = (path: string) => isActive(path) ? 2 : 1.8;

  const labelCls = (path: string) =>
    `text-[12px] ${isActive(path) ? 'font-medium' : ''}`;

  // 폭과 무관하게 항상 표시한다. 데스크톱 nav는 홈(app/page.tsx)의 xl 이상에만 있어서,
  // 예전처럼 md에서 숨기면 768~1279px 구간과 1280px 이상의 비(非)홈 페이지에
  // 네비게이션이 전혀 없어진다(App Store 심사 반려 사유).
  // safe-area는 여기서만 처리한다. 높이 h-16(64px)은 globals.css의 여백 유틸리티와 맞출 것.
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
      {/* 배경 바는 전체 폭, 탭은 본문과 같은 600px 안에서 가운데 정렬 */}
      <div className="flex h-16 max-w-[600px] mx-auto">

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

        {/* 시간표 */}
        <Link href="/timetable" className={tabCls('/timetable')}>
          <Table2 size={24} strokeWidth={iconW('/timetable')} />
          <span className={labelCls('/timetable')}>{label('timetable')}</span>
        </Link>

        {/* 내정보 */}
        <Link href="/my" className={tabCls('/my')}>
          <User size={24} strokeWidth={iconW('/my')} />
          <span className={labelCls('/my')}>{label('my')}</span>
        </Link>

      </div>
    </div>
  );
}
