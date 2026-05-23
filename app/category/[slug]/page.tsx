'use client';

import { useState } from 'react';
import Link from 'next/link';
import { use } from 'react';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const CATEGORY_LABELS: Record<string, Record<Lang, string>> = {
  'school-life':      { ko: '학교생활',      en: 'Campus Life',      zh: '校园生活',  ja: 'キャンパスライフ' },
  'announcements':    { ko: '학교공지',      en: 'Announcements',    zh: '学校公告',  ja: 'お知らせ' },
  'translation-help': { ko: '번역·도움요청', en: 'Translation·Help', zh: '翻译·求助', ja: '翻訳·助け' },
  'visa':             { ko: '비자',          en: 'Visa',             zh: '签证',      ja: 'ビザ' },
  'housing':          { ko: '부동산',        en: 'Housing',          zh: '房地产',    ja: '不動産' },
  'bank':             { ko: '은행',          en: 'Bank',             zh: '银行',      ja: '銀行' },
  'telecom':          { ko: '통신·유심',     en: 'Telecom·SIM',      zh: '通信·SIM', ja: '通信·SIM' },
  'insurance':        { ko: '보험',          en: 'Insurance',        zh: '保险',      ja: '保険' },
  'medical':          { ko: '병원',          en: 'Medical',          zh: '医院',      ja: '病院' },
  'part-time':        { ko: '알바',          en: 'Part-time',        zh: '兼职',      ja: 'アルバイト' },
};

const COMING_SOON: Record<Lang, string> = {
  ko: '준비 중입니다',
  en: 'Coming Soon',
  zh: '准备中',
  ja: '準備中',
};

const BACK_HOME: Record<Lang, string> = {
  ko: '홈으로 돌아가기',
  en: 'Back to Home',
  zh: '返回首页',
  ja: 'ホームに戻る',
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [lang, setLang] = useState<Lang>('ko');

  const labels = CATEGORY_LABELS[slug];
  const title = labels ? labels[lang] : slug;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* 헤더 */}
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

      {/* 본문 */}
      <div className="max-w-[600px] mx-auto px-4 pt-16 pb-12 text-center">
        <div className="bg-[#2F2F2F] text-white rounded-2xl px-8 py-10 mb-6 inline-block w-full">
          <p className="text-[11px] text-[#F6C21A] font-semibold tracking-widest mb-3">BUFS COMMUNITY</p>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-white/60 text-sm">{COMING_SOON[lang]}</p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#F6C21A] text-[#2F2F2F] rounded-full font-bold no-underline text-sm hover:opacity-90 transition-opacity"
        >
          ← {BACK_HOME[lang]}
        </Link>
      </div>

    </div>
  );
}
