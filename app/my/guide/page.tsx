'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Check, MessageCircle, BookOpen, CalendarDays, User,
  type LucideIcon,
} from 'lucide-react';
import { getLang, type UILang } from '../../lib/lang';

const WELL_BLUE = '#1B7CC0';

interface SlideContent {
  title: string;
  desc: string;
  items: string[];
}

interface Slide {
  Icon: LucideIcon;
  content: Record<UILang, SlideContent>;
}

// ── 버튼/공통 라벨 ──────────────────────────────────────────
const UI: Record<UILang, { prev: string; next: string; start: string }> = {
  ko: { prev: '이전', next: '다음',  start: '시작하기' },
  en: { prev: 'Back', next: 'Next',  start: 'Get Started' },
  zh: { prev: '上一步', next: '下一步', start: '开始使用' },
  ja: { prev: '戻る', next: '次へ',  start: 'はじめる' },
};

// ── 슬라이드 데이터 ─────────────────────────────────────────
const SLIDES: Slide[] = [
  {
    Icon: MessageCircle,
    content: {
      ko: {
        title: '커뮤니티에서 소통해요',
        desc: '학교생활, 비자, 알바 등\n궁금한 것을 자유롭게 물어보세요',
        items: ['글쓰기 버튼으로 게시글 작성', '댓글과 답글로 소통', '좋아요로 유용한 글 표시'],
      },
      en: {
        title: 'Connect in the Community',
        desc: 'Ask freely about campus life,\nvisa, part-time jobs, and more',
        items: ['Write posts with the compose button', 'Chat via comments and replies', 'Like useful posts'],
      },
      zh: {
        title: '在社区交流',
        desc: '自由提问关于校园生活、\n签证、兼职等问题',
        items: ['点击写帖按钮发布内容', '通过评论和回复交流', '点赞有用的帖子'],
      },
      ja: {
        title: 'コミュニティで交流しよう',
        desc: 'キャンパスライフ、ビザ、\nアルバイトなど自由に質問できます',
        items: ['投稿ボタンで記事を作成', 'コメントと返信で交流', 'いいねで役立つ投稿を表示'],
      },
    },
  },
  {
    Icon: BookOpen,
    content: {
      ko: {
        title: '생활 가이드를 확인해요',
        desc: '비자부터 병원까지\n유학 생활에 필요한 정보가 모여있어요',
        items: ['비자·부동산·은행 정보', '통신·보험·병원 안내', '알바 정보까지 한 번에'],
      },
      en: {
        title: 'Explore Living Guides',
        desc: 'Everything you need for student life\nfrom visa to hospital info',
        items: ['Visa, housing, and banking info', 'Telecom, insurance, and medical', 'Part-time job info all in one place'],
      },
      zh: {
        title: '查看生活指南',
        desc: '从签证到医院\n留学生活所需信息汇集于此',
        items: ['签证·住房·银行信息', '通讯·保险·医院指南', '一站式兼职信息'],
      },
      ja: {
        title: '生活ガイドを確認しよう',
        desc: 'ビザから病院まで\n留学生活に必要な情報が揃っています',
        items: ['ビザ・住居・銀行情報', '通信・保険・病院案内', 'アルバイト情報も一括'],
      },
    },
  },
  {
    Icon: CalendarDays,
    content: {
      ko: {
        title: '학사일정을 확인해요',
        desc: '부산외대 주요 일정을\n한눈에 확인할 수 있어요',
        items: ['월별 학사 일정 제공', '진행 중인 일정 배지 표시', '오늘 날짜 자동 하이라이트'],
      },
      en: {
        title: 'Check the Academic Calendar',
        desc: 'Stay on top of BUFS\nimportant schedules at a glance',
        items: ['Monthly academic schedule', 'Ongoing event badge display', "Today's date auto-highlighted"],
      },
      zh: {
        title: '查看学术日历',
        desc: '一目了然掌握\n釜山外大重要日程',
        items: ['提供月度学术日程', '显示进行中日程标记', '自动高亮今日日期'],
      },
      ja: {
        title: '学事日程を確認しよう',
        desc: '釜山外大の重要スケジュールを\n一目で確認できます',
        items: ['月別学事日程を提供', '進行中の日程バッジ表示', '今日の日付を自動ハイライト'],
      },
    },
  },
  {
    Icon: User,
    content: {
      ko: {
        title: '내 활동을 관리해요',
        desc: '내가 쓴 글과 저장한 글을\n한 곳에서 확인하세요',
        items: ['내가 쓴 글 모아보기', '북마크로 글 저장하기', '받은 좋아요 수 확인'],
      },
      en: {
        title: 'Manage Your Activity',
        desc: 'Check your posts and saved content\nall in one place',
        items: ['View all your posts', 'Save posts with bookmarks', 'See your total likes received'],
      },
      zh: {
        title: '管理我的活动',
        desc: '在一处查看\n我的帖子和收藏内容',
        items: ['查看我发布的帖子', '用书签收藏帖子', '查看获得的点赞数'],
      },
      ja: {
        title: 'マイアクティビティを管理しよう',
        desc: '自分の投稿と保存した記事を\n一か所で確認できます',
        items: ['自分の投稿をまとめて表示', 'ブックマークで記事を保存', '受け取ったいいね数を確認'],
      },
    },
  },
];

const isUILang = (v: string | null): v is UILang =>
  v === 'ko' || v === 'en' || v === 'zh' || v === 'ja';

export default function GuidePage() {
  const router = useRouter();
  const [lang, setLang]   = useState<UILang>('ko');
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // lang 결정: URL 쿼리(?lang=)가 있으면 우선, 없으면 저장된 값(getLang) 사용
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('lang');
    if (isUILang(fromQuery)) setLang(fromQuery);
    else setLang(getLang());
  }, []);

  const total   = SLIDES.length;
  const isLast  = index === total - 1;
  const isFirst = index === 0;
  const slide   = SLIDES[index];
  const c       = slide.content[lang];
  const ui      = UI[lang];

  const goNext = () => setIndex(i => Math.min(i + 1, total - 1));
  const goPrev = () => setIndex(i => Math.max(i - 1, 0));

  // 스와이프 감지 (50px 이상)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff <= -50) goNext();
    else if (diff >= 50) goPrev();
    touchStartX.current = null;
  };

  const SlideIcon = slide.Icon;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* 우상단 X */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="닫기"
        className="fixed top-4 right-4 z-50 p-2 bg-transparent border-none cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={24} strokeWidth={2} />
      </button>

      {/* 슬라이드 영역 */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 text-center select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-20 h-20 rounded-3xl bg-[#EDF4FB] flex items-center justify-center mb-7">
          <SlideIcon size={48} strokeWidth={1.6} color={WELL_BLUE} />
        </div>

        <h1 className="text-xl font-bold text-[#1A1A1A] mb-3 leading-snug">{c.title}</h1>
        <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed mb-8">{c.desc}</p>

        <ul className="w-full max-w-[280px] space-y-3 text-left">
          {c.items.map((item, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#EDF4FB] flex items-center justify-center shrink-0">
                <Check size={12} strokeWidth={3} color={WELL_BLUE} />
              </span>
              <span className="text-sm text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 하단: dot indicator + 네비게이션 */}
      <div className="px-8 pb-10 pt-4">
        {/* dot indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-200
                ${i === index ? 'w-6 bg-[#1B7CC0]' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </div>

        {/* 이전 / 다음(or 시작하기) */}
        <div className="flex items-center gap-3">
          {!isFirst && (
            <button
              type="button"
              onClick={goPrev}
              className="px-5 py-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl border-none cursor-pointer hover:bg-gray-200 transition-colors"
            >
              {ui.prev}
            </button>
          )}
          <button
            type="button"
            onClick={isLast ? () => router.back() : goNext}
            className="flex-1 py-3 text-sm font-bold text-white bg-[#1B7CC0] rounded-xl border-none cursor-pointer hover:bg-[#1565a0] transition-colors"
          >
            {isLast ? ui.start : ui.next}
          </button>
        </div>
      </div>
    </div>
  );
}
