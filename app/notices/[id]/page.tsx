'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Languages } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import { useLang } from '../../lib/lang';
import { getSupabaseClient } from '../../lib/supabase/client';
import { NOTICE_SELECT, NOTICE_T, formatNoticeDate, noticeTitle, type NoticeRow } from '../../lib/notices';

const labels = {
  ko: { body: '공지 본문', original: '원문', unavailable: '본문을 불러올 수 없습니다. 학교 원문에서 확인해 주세요.', missing: '공지를 찾을 수 없습니다.' },
  en: { body: 'Translated notice', original: 'Korean original', unavailable: 'The translation is unavailable. Please check the original notice.', missing: 'Notice not found.' },
  zh: { body: '翻译公告', original: '韩文原文', unavailable: '暂时无法加载译文。请查看原始公告。', missing: '未找到公告。' },
  ja: { body: '翻訳されたお知らせ', original: '韓国語の原文', unavailable: '翻訳を読み込めません。原文をご確認ください。', missing: 'お知らせが見つかりません。' },
};

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lang = useLang();
  const t = NOTICE_T[lang];
  const l = labels[lang];
  const [notice, setNotice] = useState<NoticeRow | null>(null);
  const [body, setBody] = useState<{ key: string; text: string; original: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const bodyKey = notice ? `${notice.source}:${notice.wr_id}:${lang}` : '';
  const currentBody = body?.key === bodyKey ? body : null;
  const bodyLoading = Boolean(notice && !currentBody && failedKey !== bodyKey);

  useEffect(() => {
    let active = true;
    getSupabaseClient().from('notices').select(NOTICE_SELECT).eq('id', id).single()
      .then(({ data }: { data: unknown }) => {
        if (active) { setNotice(data as NoticeRow | null); setLoading(false); }
      });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!notice) return;
    let active = true;
    const controller = new AbortController();
    const query = new URLSearchParams({ source: notice.source, wr_id: String(notice.wr_id), lang });
    fetch(`/api/notices/body?${query}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(value => { if (active) setBody({ ...value, key: `${notice.source}:${notice.wr_id}:${lang}` }); })
      .catch(() => { if (active) setFailedKey(`${notice.source}:${notice.wr_id}:${lang}`); });
    return () => { active = false; controller.abort(); };
  }, [notice, lang]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A2236]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button type="button" onClick={() => router.push('/notices')}
            className="w-11 h-11 -ml-2 flex items-center justify-center" aria-label={t.backAria}>
            <ArrowLeft size={22} />
          </button>
          <span className="text-[15px] font-bold">{t.title}</span>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 pt-4 pb-tabbar">
        {loading ? <p className="text-center text-gray-400 text-sm py-16">{t.loading}</p> : !notice ? (
          <p className="text-center text-gray-400 text-sm py-16">{l.missing}</p>
        ) : (
          <article className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3">
              <Languages size={13} /> {lang === 'ko' ? l.body : t.autoTranslated}
            </div>
            <h1 className="font-bold text-[20px] leading-snug">{noticeTitle(notice, lang)}</h1>
            <p className="text-[12px] text-slate-400 mt-3">{formatNoticeDate(notice.published_at)}</p>
            <div className="border-t border-gray-100 my-5" />
            <h2 className="font-semibold text-[14px] mb-3">{l.body}</h2>
            {bodyLoading ? <p className="text-sm text-slate-400">{t.loading}</p> : currentBody ? (
              <div className="text-[14px] leading-[1.8] whitespace-pre-wrap break-words">{currentBody.text}</div>
            ) : <p className="text-sm text-slate-500">{l.unavailable}</p>}

            {currentBody && lang !== 'ko' && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setShowOriginal(value => !value)}
                  className="text-[13px] font-semibold text-[#1D4ED8]">
                  {l.original} {showOriginal ? '−' : '+'}
                </button>
                {showOriginal && <div className="mt-3 text-[13px] leading-[1.8] whitespace-pre-wrap break-words text-slate-600">{currentBody.original}</div>}
              </div>
            )}
            <a href={notice.source_url} target="_blank" rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[12px] font-semibold">
              <ExternalLink size={13} /> {t.viewOriginal}
            </a>
          </article>
        )}
      </main>
      <BottomTabBar lang={lang} />
    </div>
  );
}
