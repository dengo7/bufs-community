'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, PenLine, ShieldCheck } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import {
  getCategoryBySlug,
  getCategoryLabel,
  uiLangToLanguage,
  type UILang,
} from '../../lib/categories';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: {
    noPosts: '아직 게시글이 없어요',
    writeFirst: '첫 글을 작성해 보세요!',
    write: '글쓰기',
    justNow: '방금 전',
  },
  en: {
    noPosts: 'No posts yet',
    writeFirst: 'Be the first to write!',
    write: 'Write',
    justNow: 'just now',
  },
  zh: {
    noPosts: '暂无帖子',
    writeFirst: '来写第一篇帖子吧！',
    write: '写作',
    justNow: '刚刚',
  },
  ja: {
    noPosts: 'まだ投稿がありません',
    writeFirst: '最初の投稿をしてみよう！',
    write: '投稿',
    justNow: 'たった今',
  },
} as const;

export interface PostRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  profiles: {
    nickname: string;
    nationality: string | null;
    avatar_url: string | null;
    role: string | null;
  } | null;
}

function formatRelativeTime(dateStr: string, lang: UILang): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);

  if (lang === 'ko') {
    if (mins  < 1)  return '방금 전';
    if (mins  < 60) return `${mins}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }
  if (lang === 'en') {
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  if (lang === 'zh') {
    if (mins  < 1)  return '刚刚';
    if (mins  < 60) return `${mins}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }
  // ja
  if (mins  < 1)  return 'たった今';
  if (mins  < 60) return `${mins}分前`;
  if (hours < 24) return `${hours}時間前`;
  return `${days}日前`;
}

interface Props {
  slug: string;
  posts: PostRow[];
}

export default function CategoryView({ slug, posts }: Props) {
  const [lang, setLang] = useState<UILang>('ko');

  const t = T[lang];
  const category = getCategoryBySlug(slug);
  const categoryName = getCategoryLabel(slug, uiLangToLanguage(lang));
  const Icon = category?.Icon;

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* 헤더 */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="flex items-center h-[54px] px-3 gap-2">

          <Link
            href="/"
            className="p-1.5 -ml-1 text-gray-700 no-underline flex items-center shrink-0"
            aria-label="홈으로"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </Link>

          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {Icon && <Icon size={17} className="text-gray-700 shrink-0" strokeWidth={1.8} />}
            <span className="text-[15px] font-bold text-[#1A1A1A] truncate">{categoryName}</span>
          </div>

          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* 글 목록 */}
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-gray-400 mb-2">{t.noPosts}</p>
            <Link
              href={`/write?category=${slug}`}
              className="inline-flex items-center gap-1.5 mt-2 px-5 py-2.5 bg-[#F6C21A] text-[#2F2F2F]
                         rounded-full text-[13px] font-bold no-underline hover:opacity-90 transition-opacity"
            >
              <PenLine size={15} strokeWidth={2} />
              {t.writeFirst}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 no-underline
                           hover:border-gray-300 active:scale-[0.99] transition-all"
              >
                <h2 className="text-[15px] font-semibold text-[#1A1A1A] truncate mb-1 leading-snug">
                  {post.title}
                </h2>
                <p className="text-[13px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                  {post.content}
                </p>
                <div className="flex items-center justify-between text-[12px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-600">
                      {post.profiles?.nickname ?? '?'}
                    </span>
                    {post.profiles?.role === 'admin' && (
                      <ShieldCheck size={11} strokeWidth={2} className="text-[#F6C21A] shrink-0" />
                    )}
                    {post.profiles?.nationality && (
                      <span className="text-gray-400">· {post.profiles.nationality}</span>
                    )}
                  </div>
                  <span>{formatRelativeTime(post.created_at, lang)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 플로팅 글쓰기 버튼 (모바일) */}
      <Link
        href={`/write?category=${slug}`}
        className="md:hidden fixed bottom-[88px] right-4 z-40 w-14 h-14 bg-[#F6C21A] rounded-full
                   flex items-center justify-center shadow-lg active:opacity-80 transition-opacity"
        aria-label={t.write}
      >
        <PenLine size={24} color="white" strokeWidth={2} />
      </Link>

      <BottomTabBar lang={lang} />
    </div>
  );
}
