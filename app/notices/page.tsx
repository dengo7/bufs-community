'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Languages } from 'lucide-react';
import BottomTabBar from '../components/BottomTabBar';
import { useLang } from '../lib/lang';
import { getSupabaseClient } from '../lib/supabase/client';
import {
  NOTICE_SELECT, NOTICE_T,
  formatNoticeDate, hasTranslation, isNewNotice,
  noticeChipClass, noticeCategoryLabel, noticeTitle,
  type NoticeRow, type NoticeSource,
} from '../lib/notices';

const PAGE_SIZE = 20;

type Filter = 'all' | NoticeSource;

export default function NoticesPage() {
  const router = useRouter();
  // 진입 경로로 그대로 돌아간다. 히스토리가 없을 때만 홈으로 폴백.
  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const lang = useLang();

  const [filter, setFilter] = useState<Filter>('all');
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (source: Filter, from: number) => {
    let query = getSupabaseClient()
      .from('notices')
      .select(NOTICE_SELECT)
      .order('published_at', { ascending: false })
      .order('wr_id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (source !== 'all') query = query.eq('source', source);

    const { data } = await query;
    return (data ?? []) as NoticeRow[];
  }, []);

  // 필터가 바뀌면 처음부터 다시 읽는다
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchPage(filter, 0).then(rows => {
      if (cancelled) return;
      setNotices(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [filter, fetchPage]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const rows = await fetchPage(filter, notices.length);
    setNotices(prev => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const t = NOTICE_T[lang];
  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: t.all },
    { key: 'academic', label: t.academic },
    { key: 'global',   label: t.global },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.backAria}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[15px] font-bold truncate">{t.title}</span>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">

        {/* ── 소스 필터 칩 ── */}
        <div className="flex gap-2 mb-3">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer
                          transition-colors
                          ${filter === f.key
                            ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── 목록 ── */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-16 mb-2.5" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-50 rounded w-20" />
              </div>
            ))}
          </div>
        ) : !notices.length ? (
          <p className="text-center text-gray-400 text-sm py-16">{t.empty}</p>
        ) : (
          <>
            <div className="space-y-2">
              {notices.map(n => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-[1px]
                                      rounded-md border ${noticeChipClass(n.category)}`}>
                      {noticeCategoryLabel(n.category, lang)}
                    </span>
                    {isNewNotice(n.created_at, n.published_at) && (
                      <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA]
                                       rounded-md px-1.5 py-[1px]">
                        NEW
                      </span>
                    )}
                    {hasTranslation(n, lang) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500
                                       bg-slate-50 border border-slate-200 rounded-md px-1.5 py-[1px]">
                        <Languages size={9} strokeWidth={2} />
                        {t.autoTranslated}
                      </span>
                    )}
                  </div>

                  <p className="text-[14px] text-[#1A2236] leading-snug line-clamp-2">
                    {noticeTitle(n, lang)}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">{formatNoticeDate(n.published_at)}</span>
                    <a
                      href={n.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold
                                 bg-[#EFF6FF] text-[#1D4ED8] no-underline active:scale-95 transition-transform"
                    >
                      <ExternalLink size={11} strokeWidth={2} />
                      {t.viewOriginal}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 text-[13px] text-gray-600 bg-white border border-gray-200 rounded-full
                             cursor-pointer hover:border-gray-400 disabled:opacity-40 transition-colors"
                >
                  {loadingMore ? t.loading : t.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
