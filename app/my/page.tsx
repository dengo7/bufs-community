'use client';

import { useState } from 'react';
import Link from 'next/link';
import BottomTabBar from '../components/BottomTabBar';
import PushNotificationToggle from './PushNotificationToggle';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const T = {
  ko: { title: 'MY', comingSoon: '준비 중입니다', backHome: '홈으로 돌아가기' },
  en: { title: 'MY', comingSoon: 'Coming Soon', backHome: 'Back to Home' },
  zh: { title: 'MY', comingSoon: '准备中', backHome: '返回首页' },
  ja: { title: 'MY', comingSoon: '準備中', backHome: 'ホームに戻る' },
} as const;

export default function MyPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[1400px] mx-auto flex items-center h-[54px] px-4 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <div className="bg-[#2F2F2F] rounded-[5px] px-[7px] py-[5px] grid grid-cols-2 gap-px shrink-0">
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[10px] font-extrabold text-white leading-none">F</span>
              <span className="text-[10px] font-extrabold text-white leading-none">S</span>
            </div>
            <span className="text-[13px] font-bold text-[#1A1A1A] truncate">BUFS COMMUNITY</span>
          </Link>
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-[8px] py-[6px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {l === 'ko' ? 'KR' : l === 'en' ? 'EN' : l === 'zh' ? '中' : '日'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-16 pb-24 text-center">
        <div className="bg-[#2F2F2F] text-white rounded-2xl px-8 py-10 mb-6 w-full">
          <p className="text-[11px] text-[#F6C21A] font-semibold tracking-widest mb-3">BUFS COMMUNITY</p>
          <h1 className="text-2xl font-bold mb-2">{t.title}</h1>
          <p className="text-white/60 text-sm">{t.comingSoon}</p>
        </div>

        <div className="text-left mb-6">
          <PushNotificationToggle lang={lang} />
        </div>

        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#F6C21A] text-[#2F2F2F] rounded-full font-bold no-underline text-sm hover:opacity-90 transition-opacity">
          ← {t.backHome}
        </Link>
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
