'use client';

import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, Phone, Wallet, ConciergeBell, TriangleAlert, Info, Copy, Check } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import FacilityThumb, { toneOf } from '../../components/campus/FacilityThumb';
import { SourceBadge, StatusBadge } from '../../components/campus/CampusBadges';
import { useLang, setLang } from '../../lib/lang';
import { useNowMinute } from '../../lib/useNowMinute';
import { CAMPUS_T } from '../../lib/campusI18n';
import { getFacilityStatus, localizeFacility, type CampusFacility } from '../../lib/campusFacilities';

type UILang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const COPIED_FEEDBACK_MS = 1500;

function InfoRow({ Icon, label, children }: { Icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#F1F5F9] last:border-b-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] shrink-0">
        <Icon size={16} strokeWidth={1.9} className="text-[#1D4ED8]" />
      </span>
      <div className="flex-1 min-w-0 pt-[2px]">
        <p className="text-[11px] text-[#94A3B8] leading-none mb-1">{label}</p>
        <div className="text-[14px] text-[#111827] leading-snug break-words">{children}</div>
      </div>
    </div>
  );
}

export default function FacilityDetailView({ facility }: { facility: CampusFacility }) {
  const lang = useLang();
  const t = CAMPUS_T[lang];
  const now = useNowMinute();
  const router = useRouter();

  const c = localizeFacility(facility, lang);
  const tone = toneOf(facility);
  const status = now === null ? null : getFacilityStatus(facility.hours, now);

  const hasInfoRows = !!c.hoursText || !!facility.phone || !!c.price || c.services.length > 0;
  // 위치가 한 곳이고 문구에 건물명이 없으면(예: 'A119') 건물명을 보조로 보여 준다
  const buildingHint = c.locations.length === 1 && c.building && !c.locations[0].includes(c.building)
    ? c.building
    : null;

  // 방금 복사한 위치 (짧은 '복사됨' 피드백용)
  const [copied, setCopied] = useState<string | null>(null);

  const copyLocation = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드 API 를 못 쓰는 환경(구형 WebView 등)용 대체 경로
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(text);
    setTimeout(() => setCopied(prev => (prev === text ? null : prev)), COPIED_FEEDBACK_MS);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.back}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[15px] font-bold truncate">{t.detailTitle}</p>
            <p className="text-[10.5px] text-[#94A3B8] truncate">{t.school}</p>
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

      <div className="max-w-[600px] mx-auto pb-28">

        {/* ── 대표 영역 (사진 placeholder) ── */}
        <FacilityThumb facility={facility} variant="hero" />

        {/* ── 기본 정보 ── */}
        <div className="relative -mt-5 rounded-t-[24px] bg-white border-t border-[#EEF2F7] px-4 pt-5 pb-5">
          <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
            {status && <StatusBadge status={status} lang={lang} withCloseTime />}
            <SourceBadge facility={facility} lang={lang} />
          </div>

          <h1 className="mt-2 text-[22px] font-extrabold text-[#0F172A] leading-snug break-words">{c.title}</h1>
          <span
            className="mt-2 inline-flex items-center text-[11.5px] font-semibold px-2.5 py-[3px] rounded-md"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            {t.types[facility.type]}
          </span>

          {c.description && (
            <p className="mt-3 text-[13.5px] text-[#475569] leading-relaxed">{c.description}</p>
          )}
          {facility.sourceType === 'student-tip' && !facility.pending && (
            <p className="mt-2 flex items-start gap-1 text-[11px] text-[#94A3B8] leading-snug">
              <Info size={12} strokeWidth={2} className="shrink-0 mt-[1px]" />
              {t.tipNote}
            </p>
          )}

          {/* 정보 영역 */}
          {hasInfoRows && (
          <div className="mt-4 rounded-2xl border border-[#EEF2F7] px-3.5">
            {c.hoursText && (
              <InfoRow Icon={Clock} label={t.infoHours}>
                {c.hoursText.map(line => <span key={line} className="block">{line}</span>)}
              </InfoRow>
            )}
            {facility.phone && (
              <InfoRow Icon={Phone} label={t.infoPhone}>
                <a href={`tel:${facility.phone.replace(/[^0-9+]/g, '')}`} className="font-semibold text-[#1D4ED8] no-underline" aria-label={`${t.call} ${facility.phone}`}>
                  {facility.phone}
                </a>
              </InfoRow>
            )}
            {c.price && (
              <InfoRow Icon={Wallet} label={t.infoPrice}>{c.price}</InfoRow>
            )}
            {c.services.length > 0 && (
              <InfoRow Icon={ConciergeBell} label={t.infoServices}>
                <span className="flex flex-wrap gap-1.5 pt-0.5">
                  {c.services.map(s => (
                    <span key={s} className="text-[12px] text-[#334155] bg-[#F8FAFC] border border-[#E5E7EB] rounded-full px-2.5 py-[3px]">{s}</span>
                  ))}
                </span>
              </InfoRow>
            )}
          </div>
          )}

          {/* ── 위치 안내 ── */}
          {c.locations.length > 0 && (
            <>
              <h2 className="mt-6 mb-3 text-[16px] font-extrabold text-[#0F172A]">{t.locationGuide}</h2>
              <div className="rounded-2xl border border-[#DBE7FE] bg-[#F5F9FF] px-3.5">
                {c.locations.map(loc => {
                  const done = copied === (buildingHint ? `${buildingHint} ${loc}` : loc);
                  return (
                    <div key={loc} className="flex items-center gap-2.5 py-3 border-b border-[#E3ECFD] last:border-b-0">
                      <MapPin size={17} strokeWidth={2} className="shrink-0 text-[#1D4ED8]" />
                      <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#111827] leading-snug break-words">
                        {loc}
                        {buildingHint && <span className="block mt-0.5 text-[12px] font-normal text-[#94A3B8]">{buildingHint}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyLocation(buildingHint ? `${buildingHint} ${loc}` : loc)}
                        className={`shrink-0 flex items-center gap-1 h-8 rounded-full border cursor-pointer transition-colors
                          ${done
                            ? 'px-2.5 bg-[#E7F7EE] border-[#C8EBD6] text-[#15803D]'
                            : 'w-8 justify-center bg-white border-[#DBE7FE] text-[#64748B] active:bg-[#EFF6FF]'}`}
                        aria-label={`${t.copyLocation}: ${loc}`}
                      >
                        {done ? <Check size={14} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={2} />}
                        {done && <span className="text-[11px] font-bold">{t.copied}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
              <span className="sr-only" role="status" aria-live="polite">{copied ? t.copied : ''}</span>
            </>
          )}

          {/* ── 주의사항 (데이터에 있을 때만) ── */}
          {c.notes && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#FBE9A8] bg-[#FFF9E6] px-3.5 py-3">
              <TriangleAlert size={16} strokeWidth={2} className="shrink-0 mt-[2px] text-[#B8900E]" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#92702A]">{t.infoNotes}</p>
                <p className="mt-0.5 text-[13px] text-[#475569] leading-relaxed break-words">{c.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
