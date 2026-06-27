'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, X } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import BottomTabBar from '../components/BottomTabBar';
import { formatTimeAgo, type UILang } from '../lib/utils';
import { getLang, setLang as persistLang } from '../lib/lang';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: {
    title: '검색',
    placeholder: '검색',
    hint: '두 글자 이상 입력하세요',
    noResults: '검색 결과가 없어요',
    loading: '검색 중...',
  },
  en: {
    title: 'Search',
    placeholder: 'Search',
    hint: 'Enter 2 or more characters',
    noResults: 'No results',
    loading: 'Searching...',
  },
  zh: {
    title: '搜索',
    placeholder: '搜索',
    hint: '请输入2个以上字符',
    noResults: '没有搜索结果',
    loading: '搜索中...',
  },
  ja: {
    title: '検索',
    placeholder: '検索',
    hint: '2文字以上入力してください',
    noResults: '検索結果がありません',
    loading: '検索中...',
  },
} as const;

type PostResult = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  profiles: { nickname: string; nationality: string | null } | null;
};

export default function SearchPage() {
  const [lang, setLang] = useState<UILang>(getLang);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = T[lang];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const client = getSupabaseClient();
      const { data } = await client
        .from('posts')
        .select('id, title, content, created_at, like_count, comment_count, profiles(nickname, nationality)')
        .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(30);

      setResults((data ?? []) as PostResult[]);
      setLoading(false);
      setSearched(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const trimmed = query.trim();

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* 헤더 */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2 pt-[env(safe-area-inset-top)]">

          <Link
            href="/"
            className="p-1.5 -ml-1 text-gray-700 no-underline flex items-center shrink-0"
            aria-label="홈으로"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </Link>

          {/* 검색 입력창 */}
          <div className="flex-1 flex items-center bg-[#F5F6FA] rounded-xl px-3 gap-2 h-[38px]">
            <Search size={16} className="text-gray-400 shrink-0" strokeWidth={1.8} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 bg-transparent text-[14px] outline-none text-[#1A1A1A] placeholder-gray-400"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-gray-400 flex items-center shrink-0"
                aria-label="지우기"
              >
                <X size={15} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* 언어 선택 */}
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); persistLang(l); }}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* 본문 */}
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">

        {/* 2글자 미만 안내 */}
        {trimmed.length > 0 && trimmed.length < 2 && (
          <p className="text-center text-[13px] text-gray-400 mt-12">{t.hint}</p>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="space-y-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-200 rounded mb-1 w-full" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* 결과 없음 */}
        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20">
            <Search size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[14px] text-gray-400">{t.noResults}</p>
          </div>
        )}

        {/* 결과 목록 */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map(post => (
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
                  </div>
                  <span>{formatTimeAgo(post.created_at, lang)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
