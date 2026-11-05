'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Languages, ChevronDown, Info } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import { setLang, useLang } from '../../lib/lang';
import { getSupabaseClient } from '../../lib/supabase/client';
import { NOTICE_SELECT, NOTICE_T, formatNoticeDate, noticeTitle, type NoticeRow } from '../../lib/notices';

const labels = {
  ko: { body: '공지 본문', original: '원문', unavailable: '본문을 불러올 수 없습니다. 학교 원문에서 확인해 주세요.', missing: '공지를 찾을 수 없습니다.' },
  en: { body: 'Translated notice', original: 'Korean original', unavailable: 'The translation is unavailable. Please check the original notice.', missing: 'Notice not found.' },
  zh: { body: '翻译公告', original: '韩文原文', unavailable: '暂时无法加载译文。请查看原始公告。', missing: '未找到公告。' },
  ja: { body: '翻訳されたお知らせ', original: '韓国語の原文', unavailable: '翻訳を読み込めません。原文をご確認ください。', missing: 'お知らせが見つかりません。' },
};

const demoNotice: NoticeRow = {
  id: 'demo', source: 'academic', wr_id: 0, category: 'etc',
  title: '학생증 수령 안내', published_at: '2026-11-05', created_at: '2026-11-05',
  source_url: '',
  translations: {
    en: { title: 'How to Pick Up Your Student ID Card' },
    zh: { title: '学生证领取指南' },
    ja: { title: '学生証の受け取りについて' },
  },
};

const demoText = {
  ko: `학생증을 신청한 학생은 발급 완료 안내를 받은 후 학생지원팀에서 학생증을 수령할 수 있습니다. 방문 전 본인의 신청 상태를 확인해 주세요.\n\n수령 장소\n학생회관 1층 학생지원팀 안내 데스크\n\n준비물\n본인 확인이 가능한 여권 또는 외국인등록증을 지참해 주세요. 대리 수령을 원할 경우에는 사전에 담당 부서에 문의해 주세요.\n\n방문 전 확인\n운영 시간과 수령 가능 여부는 학교 공지 원문을 확인해 주세요. 신청 내역이나 학생증 발급에 관해 궁금한 점이 있으면 학생지원팀으로 문의해 주세요.`,
  en: `Students who applied for a student ID card can pick it up at the Student Support Office after receiving a notification that it is ready. Please check your application status before visiting.\n\nPickup location\nStudent Support Office information desk, first floor of the Student Center\n\nWhat to bring\nBring your passport or alien registration card to verify your identity. If someone else needs to collect the card for you, contact the office in advance.\n\nBefore you visit\nCheck the original university notice for office hours and pickup availability. If you have questions about your application or card issuance, contact the Student Support Office.`,
  zh: `申请学生证的同学在收到制作完成通知后，可以前往学生支援团队领取。请在前往之前确认申请状态。\n\n领取地点\n学生会馆一楼学生支援团队服务台\n\n需要携带\n请携带护照或外国人登录证以核实身份。如需他人代领，请提前联系负责部门。\n\n前往之前\n请查看学校原公告，确认办公时间和领取情况。如对申请或学生证发放有疑问，请咨询学生支援团队。`,
  ja: `学生証を申請した学生は、発行完了のお知らせを受け取った後、学生支援チームで受け取れます。訪問前に申請状況を確認してください。\n\n受け取り場所\n学生会館1階、学生支援チームの案内デスク\n\n持ち物\n本人確認のため、パスポートまたは外国人登録証をご持参ください。代理での受け取りを希望する場合は、事前に担当部署へお問い合わせください。\n\n訪問前の確認\n受付時間と受け取り可能な状況は、大学の原文のお知らせで確認してください。申請や学生証の発行について質問がある場合は、学生支援チームへお問い合わせください。`,
};

const demoLabel = {
  ko: '미리보기 예시 · 실제 학교 공지가 아닙니다',
  en: 'Preview example · Not an official university notice',
  zh: '预览示例 · 非学校正式公告',
  ja: 'プレビュー例 · 大学の正式なお知らせではありません',
};

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isDemo = id === 'demo';
  const router = useRouter();
  const lang = useLang();
  const t = NOTICE_T[lang];
  const l = labels[lang];
  const [notice, setNotice] = useState<NoticeRow | null>(null);
  const [body, setBody] = useState<{ key: string; text: string; original: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const selectedNotice = isDemo ? demoNotice : notice;
  const bodyKey = selectedNotice ? `${selectedNotice.source}:${selectedNotice.wr_id}:${lang}` : '';
  const currentBody = isDemo
    ? { text: demoText[lang], original: demoText.ko }
    : body?.key === bodyKey ? body : null;
  const bodyLoading = Boolean(selectedNotice && !currentBody && failedKey !== bodyKey);

  useEffect(() => {
    if (id === 'demo') return;
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
        {isDemo && (
          <div className="mb-3 rounded-xl bg-[#FFF4DE] border border-[#F3DEB6] px-4 py-3 flex gap-2 items-start text-[12px] leading-relaxed text-[#805917]">
            <Info size={16} className="mt-0.5 shrink-0" /> {demoLabel[lang]}
          </div>
        )}
        {isDemo && (
          <label className="mb-3 flex items-center justify-between rounded-xl bg-white border border-gray-100 px-4 py-3 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-2"><Languages size={17} /> {lang === 'ko' ? '번역 언어' : 'Language'}</span>
            <span className="relative inline-flex items-center text-[#1D4ED8] font-semibold">
              <select value={lang} onChange={event => setLang(event.target.value as typeof lang)} className="appearance-none bg-transparent pr-5 outline-none cursor-pointer">
                <option value="ko">한국어</option><option value="en">English</option>
                <option value="zh">中文</option><option value="ja">日本語</option>
              </select>
              <ChevronDown size={14} className="absolute right-0 pointer-events-none" />
            </span>
          </label>
        )}
        {loading && !isDemo ? <p className="text-center text-gray-400 text-sm py-16">{t.loading}</p> : !selectedNotice ? (
          <p className="text-center text-gray-400 text-sm py-16">{l.missing}</p>
        ) : (
          <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-1 bg-[#1D4ED8]" />
            <div className="p-5">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#1D4ED8] font-semibold bg-[#EFF6FF] rounded-full px-2.5 py-1 mb-4">
              <Languages size={13} /> {lang === 'ko' ? l.body : t.autoTranslated}
            </div>
            <h1 className="font-bold text-[21px] leading-snug">{noticeTitle(selectedNotice, lang)}</h1>
            <p className="text-[12px] text-slate-400 mt-3">{formatNoticeDate(selectedNotice.published_at)} · {isDemo ? 'The Well demo' : selectedNotice.source === 'academic' ? t.academic : t.global}</p>
            <div className="border-t border-gray-100 my-5" />
            <h2 className="font-semibold text-[15px] mb-4">{l.body}</h2>
            {bodyLoading ? <p className="text-sm text-slate-400">{t.loading}</p> : currentBody ? isDemo ? (
              <div className="space-y-5 text-[14px] leading-[1.9] text-[#334155]">
                {currentBody.text.split('\n\n').map((section, index) => {
                  const [heading, ...rest] = section.split('\n');
                  return index === 0 ? (
                    <p key={index} className="rounded-xl bg-[#F1F6FF] px-4 py-4 border border-[#DCE9FF]">{section}</p>
                  ) : (
                    <section key={index} className="pl-3 border-l-[3px] border-[#B6CDF8]">
                      <h3 className="font-bold text-[#1D4ED8] mb-1">{heading}</h3>
                      <p className="whitespace-pre-wrap">{rest.join('\n')}</p>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="text-[14px] leading-[1.9] whitespace-pre-wrap break-words text-[#334155]">{currentBody.text}</div>
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
            {!isDemo && <a href={selectedNotice.source_url} target="_blank" rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[12px] font-semibold">
              <ExternalLink size={13} /> {t.viewOriginal}
            </a>}
            </div>
          </article>
        )}
      </main>
      <BottomTabBar lang={lang} />
    </div>
  );
}
