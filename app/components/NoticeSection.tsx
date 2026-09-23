'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import type { UILang } from '../lib/categories';
import {
  NOTICE_SELECT, NOTICE_T,
  formatNoticeDate, isNewNotice, noticeChipClass, noticeCategoryLabel, noticeTitle,
  type NoticeRow,
} from '../lib/notices';

interface Props {
  lang: UILang;
}

/** 홈 — 두 소스 통합 최신 2건 미리보기. 항목을 누르면 원문을 새 탭으로, 나머지는 전체보기(/notices)로. */
export default function NoticeSection({ lang }: Props) {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await getSupabaseClient()
        .from('notices')
        .select(NOTICE_SELECT)
        .order('published_at', { ascending: false })
        .order('wr_id', { ascending: false })
        .limit(2);

      if (cancelled) return;
      setNotices((data ?? []) as NoticeRow[]);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const t = NOTICE_T[lang];

  // 공지가 하나도 없으면 섹션 자체를 숨긴다
  if (!loading && !notices.length) return null;

  return (
    <div className="mt-4 mb-4">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
          <h2 className="text-[15px] font-bold text-[#111827]">{t.title}</h2>
        </div>
        <Link
          href="/notices"
          className="text-[13px] text-gray-500 no-underline hover:text-gray-700 transition-colors shrink-0 py-2 -my-2"
        >
          {t.viewAll}
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[0, 1].map(i => (
              <div key={i} className="px-4 py-3.5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-14 mb-2" />
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notices.map(n => (
              <a
                key={n.id}
                href={n.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 px-4 py-3.5 no-underline
                           hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[1px]
                                      rounded-md border ${noticeChipClass(n.category)}`}>
                      {noticeCategoryLabel(n.category, lang)}
                    </span>
                    {isNewNotice(n.created_at, n.published_at) && (
                      <span className="text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA]
                                       rounded-md px-1.5 py-[1px]">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] text-[#111827] leading-snug line-clamp-2">
                    {noticeTitle(n, lang)}
                  </p>
                  <p className="mt-1 text-[12.5px] text-slate-500">{formatNoticeDate(n.published_at)}</p>
                </div>
                <ExternalLink size={14} strokeWidth={1.8} className="text-[#CBD5E1] shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
