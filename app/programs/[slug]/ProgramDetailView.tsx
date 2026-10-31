'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Award, Building2, CalendarDays, ClipboardList, ExternalLink, Gift,
  Languages, Lock, MapPin, Phone, Users, GraduationCap,
} from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import { useLang } from '../../lib/lang';
import { useNowMinute } from '../../lib/useNowMinute';
import {
  FORMAT_CHIP, PROGRAM_T, STATUS_CHIP, TYPE_CHIP,
  applyStatus, daysUntilClose, fetchProgram, formatApplyPeriod, formatEventTime,
  hasProgramTranslation, programBenefits, programText, telHref,
  type ProgramRow,
} from '../../lib/programs';

/**
 * 비교과 프로그램 상세. 원문(BUFS 인재시스템)은 로그인 뒤에 있어 앱에서 신청할 수 없으므로
 * 내용을 모두 앱 안에서 보여주고, 마지막에 "학교 시스템에서 신청" 안내와 원문 링크만 둔다.
 */
export default function ProgramDetailView({ slug }: { slug: string }) {
  const lang = useLang();
  const t = PROGRAM_T[lang];
  const router = useRouter();
  const now = useNowMinute();
  const [program, setProgram] = useState<ProgramRow | null>(null);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/programs');
  };

  useEffect(() => {
    let cancelled = false;
    fetchProgram(slug).then(p => {
      if (cancelled) return;
      setProgram(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  const cardCls = 'bg-white rounded-2xl border border-[#E5E7EB]';
  const title = program ? programText(program, lang, 'title') : '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.back}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <p className="flex-1 min-w-0 text-[15px] font-bold truncate">{title || t.sectionTitle}</p>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-tabbar">
        {loading ? (
          <div className="space-y-3">
            <div className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        ) : !program ? (
          <p className={`${cardCls} py-12 text-center text-[14px] text-gray-500`}>{t.notFound}</p>
        ) : (
          <ProgramBody program={program} lang={lang} now={now} cardCls={cardCls} />
        )}
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}

function ProgramBody({
  program: p, lang, now, cardCls,
}: {
  program: ProgramRow;
  lang: ReturnType<typeof useLang>;
  now: number | null;
  cardCls: string;
}) {
  const t = PROGRAM_T[lang];
  const status = now === null ? 'unknown' : applyStatus(p, now);
  const days = now === null ? null : daysUntilClose(p, now);
  const type = programText(p, lang, 'program_type');
  const session = programText(p, lang, 'session_label');
  const benefits = programBenefits(p, lang);
  const summary = programText(p, lang, 'summary');
  const howToApply = programText(p, lang, 'how_to_apply');
  const department = programText(p, lang, 'department');
  const location = programText(p, lang, 'location');
  const target = programText(p, lang, 'target');
  const eventTime = formatEventTime(p, lang);
  const applyPeriod = formatApplyPeriod(p, lang);

  return (
    <>
      {/* 제목 + 칩 */}
      <div className="px-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {type && (
            <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[1px] rounded-md border ${TYPE_CHIP}`}>
              {session ? `${type} · ${session}` : type}
            </span>
          )}
          {p.format && (
            <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-[1px] rounded-md border ${FORMAT_CHIP}`}>
              {t.format[p.format]}
            </span>
          )}
          {status !== 'unknown' && (
            <span className={`inline-flex items-center text-[11px] font-bold px-1.5 py-[1px] rounded-md border ${STATUS_CHIP[status]}`}>
              {status === 'open' && days !== null ? t.closesIn(days) : t.status[status]}
            </span>
          )}
          {hasProgramTranslation(p, lang) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500
                             bg-slate-50 border border-slate-200 rounded-md px-1.5 py-[1px]">
              <Languages size={10} strokeWidth={2} />
              {t.translated}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-[20px] font-extrabold leading-snug text-[#0F172A]">{programText(p, lang, 'title')}</h1>
        {summary && (
          <p className="mt-2 text-[14px] leading-relaxed text-[#475569] whitespace-pre-line">{summary}</p>
        )}
      </div>

      {/* 일시·장소·신청기간·모집인원·대상 */}
      <section className={`${cardCls} mt-4 divide-y divide-gray-50`}>
        {eventTime && <InfoRow icon={<CalendarDays size={16} strokeWidth={2} />} label={t.when} value={eventTime} />}
        {location && <InfoRow icon={<MapPin size={16} strokeWidth={2} />} label={t.where} value={location} />}
        {applyPeriod && <InfoRow icon={<ClipboardList size={16} strokeWidth={2} />} label={t.applyPeriod} value={applyPeriod} />}
        {p.capacity !== null && <InfoRow icon={<Users size={16} strokeWidth={2} />} label={t.capacity} value={t.people(p.capacity)} />}
        {target && <InfoRow icon={<GraduationCap size={16} strokeWidth={2} />} label={t.target} value={target} />}
      </section>

      {/* 혜택 */}
      {benefits.length > 0 && (
        <section className="mt-3 rounded-2xl border border-[#B8DDD0] bg-[#F3FAF7] px-4 py-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-[#2A6B52]">
            <Gift size={15} strokeWidth={2} />
            {t.benefits}
          </h2>
          <ul className="mt-2 space-y-1.5 pl-0 list-none">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] leading-snug text-[#111827]">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#2A6B52] shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 수료증 · 불참자 지정 (원문에 정보가 있을 때만) */}
      {(p.certificate !== null || p.no_show_flag !== null) && (
        <section className={`${cardCls} mt-3 divide-y divide-gray-50`}>
          {p.certificate !== null && (
            <InfoRow
              icon={<Award size={16} strokeWidth={2} />}
              label={t.certificate}
              value={p.certificate ? t.certificateYes : t.certificateNo}
            />
          )}
          {p.no_show_flag !== null && (
            <InfoRow
              icon={<ClipboardList size={16} strokeWidth={2} />}
              label={t.noShow}
              value={p.no_show_flag ? t.yes : t.no}
              note={p.no_show_flag ? t.noShowYes : t.noShowNo}
            />
          )}
        </section>
      )}

      {/* 주관 · 문의 */}
      {(department || p.contact) && (
        <section className={`${cardCls} mt-3 divide-y divide-gray-50`}>
          {department && <InfoRow icon={<Building2 size={16} strokeWidth={2} />} label={t.organizer} value={department} />}
          {p.contact && (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-[#64748B] shrink-0"><Phone size={16} strokeWidth={2} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] text-slate-500">{t.contact}</p>
                <p className="text-[14px] text-[#111827]">{p.contact}</p>
              </div>
              <a
                href={telHref(p.contact)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold
                           bg-[#EFF6FF] text-[#1D4ED8] no-underline active:scale-95 transition-transform"
              >
                <Phone size={11} strokeWidth={2} />
                {t.call}
              </a>
            </div>
          )}
        </section>
      )}

      {/* 신청 방법 + 로그인 필요 안내 + 원문 링크 */}
      <section className="mt-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-4">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-[#92400E]">
          <Lock size={15} strokeWidth={2} />
          {t.loginNoticeTitle}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#78350F]">{t.loginNotice}</p>
        {howToApply && (
          <div className="mt-3">
            <p className="text-[11.5px] font-semibold text-[#92400E]">{t.howToApply}</p>
            <p className="mt-0.5 text-[13.5px] leading-snug text-[#111827] break-keep">{howToApply}</p>
          </div>
        )}
        {p.source_url && (
          <a
            href={p.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#1D4ED8]
                       text-[14px] font-semibold text-white no-underline active:scale-[0.99] transition-transform"
          >
            <ExternalLink size={16} strokeWidth={2} />
            {t.openOriginal}
          </a>
        )}
      </section>
    </>
  );
}

function InfoRow({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-[#64748B] shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] text-slate-500">{label}</p>
        <p className="text-[14px] text-[#111827] leading-snug break-keep">{value}</p>
        {note && <p className="mt-0.5 text-[12px] text-slate-500 leading-snug">{note}</p>}
      </div>
    </div>
  );
}
