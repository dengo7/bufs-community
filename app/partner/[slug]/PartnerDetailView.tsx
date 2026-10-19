'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Gift, MapPin, Phone, QrCode, Stamp, Ticket, TrainFront } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import PartnerImage from '../../components/partner/PartnerImage';
import QrScanModal from '../../components/partner/QrScanModal';
import { useLang } from '../../lib/lang';
import {
  currentUserId, fetchPartnerStore, fetchStampState, loginHref, myStampOf, partnerBenefit, partnerHours, partnerText, telHref,
  PARTNER_T, type PartnerStore, type StampState,
} from '../../lib/partners';

export default function PartnerDetailView({ slug }: { slug: string }) {
  const lang = useLang();
  const t = PARTNER_T[lang];
  const router = useRouter();
  const [store, setStore] = useState<PartnerStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [stamp, setStamp] = useState<StampState | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, uid] = await Promise.all([fetchPartnerStore(slug), currentUserId()]);
      if (cancelled) return;
      setStore(s);
      setUserId(uid);
      setLoading(false);
      if (s) {
        const state = await fetchStampState(uid);
        if (!cancelled) setStamp(state);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const onDetected = useCallback((target: { slug: string; code: string }) => {
    setScanning(false);
    router.push(`/partner/${target.slug}/checkin?code=${encodeURIComponent(target.code)}`);
  }, [router]);

  const name = store ? partnerText(store, lang, 'name') : '';
  const cardCls = 'bg-white rounded-2xl border border-[#E5E7EB]';
  const mine = store ? myStampOf(stamp, store.id) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.back}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <p className="flex-1 min-w-0 text-[15px] font-bold truncate">{name}</p>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-tabbar">
        {loading ? (
          <div className="space-y-3">
            <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        ) : !store ? (
          <p className={`${cardCls} py-12 text-center text-[14px] text-gray-500`}>{t.notFound}</p>
        ) : (
          <>
            {/* 사진 + 이름 + 소개 */}
            <PartnerImage src={store.image} alt={name} className="w-full h-48 rounded-2xl" />
            <div className="mt-4 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 rounded-md bg-[#C2611F] px-1.5 py-[1px] text-[11px] font-bold text-white">{t.badge}</span>
                <h1 className="text-[22px] font-extrabold leading-tight text-[#0F172A]">{name}</h1>
              </div>
              {store.intro && (
                <p className="mt-2 text-[14px] leading-relaxed text-[#475569]">{partnerText(store, lang, 'intro')}</p>
              )}
            </div>

            {/* 혜택 */}
            <section className="mt-5 rounded-2xl border border-[#F5D9BF] bg-[#FFF8F1] px-4 py-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-[#C2611F]">
                <Gift size={15} strokeWidth={2} />
                {t.benefitTitle}
              </h2>
              <p className="mt-1.5 text-[17px] font-extrabold leading-snug text-[#111827]">{partnerBenefit(store, lang)}</p>
              <p className="mt-1 text-[12.5px] text-[#64748B]">{t.benefitNote}</p>
            </section>

            {/* 내 스탬프 · QR 스캔 · 쿠폰 */}
            <section className={`${cardCls} mt-3 px-4 py-4`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-[#0F172A]">
                  <Stamp size={16} strokeWidth={2} className="text-[#C2611F]" />
                  {t.stampTitle}
                </h2>
                {mine && (
                  <span className="text-[13px] font-bold text-[#C2611F]">{mine.stamps}/{store.stamps_per_reward}</span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
                {Array.from({ length: store.stamps_per_reward }).map((_, i) => {
                  const filled = !!mine && i < mine.stamps;
                  return (
                    <span
                      key={i}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2
                        ${filled ? 'border-[#C2611F] bg-[#C2611F] text-white' : 'border-dashed border-[#E5E7EB]'}`}
                    >
                      {filled && <Stamp size={18} strokeWidth={2} />}
                    </span>
                  );
                })}
              </div>

              {!stamp ? null : !stamp.available ? (
                // 015 마이그레이션 적용 전
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#F1F5F9] text-[13.5px] font-semibold text-[#94A3B8] border-none cursor-not-allowed"
                >
                  <QrCode size={17} strokeWidth={2} />
                  {t.comingSoon}
                </button>
              ) : !userId ? (
                <>
                  <p className="mt-3 text-[13px] text-[#64748B]">{t.loginToCollect}</p>
                  <a
                    href={loginHref(`/partner/${store.slug}`)}
                    className="mt-3 w-full h-11 flex items-center justify-center rounded-xl bg-[#1D4ED8] text-[14px] font-semibold text-white no-underline"
                  >
                    {t.login}
                  </a>
                </>
              ) : (
                <>
                  {mine && (
                    <p className="mt-3 text-[12.5px] text-[#64748B]">
                      {store.welcome_reward && mine.totalVisits === 0
                        ? t.firstVisitHint
                        : t.nextCoupon(store.stamps_per_reward - mine.stamps)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setScanning(true)}
                    className="mt-3 w-full h-12 flex items-center justify-center gap-1.5 rounded-xl bg-[#C2611F] text-[15px] font-bold text-white border-none cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <QrCode size={19} strokeWidth={2} />
                    {t.scanToCollect}
                  </button>
                  {mine && mine.coupons > 0 && (
                    <button
                      type="button"
                      onClick={() => router.push(`/partner/${store.slug}/coupon`)}
                      className="mt-2 w-full h-12 flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#C2611F] bg-[#FFF8F1] text-[15px] font-bold text-[#C2611F] cursor-pointer"
                    >
                      <Ticket size={19} strokeWidth={2} />
                      {t.useCoupon} · {t.couponCount(mine.coupons)}
                    </button>
                  )}
                  <p className="mt-2.5 text-[11.5px] text-[#94A3B8]">{store.enforce_hours ? t.onceADay : t.onceADayAnytime}</p>
                </>
              )}
            </section>

            {/* 위치·영업시간·전화 */}
            <section className={`${cardCls} mt-3 divide-y divide-[#F1F5F9]`}>
              {store.address && (
                <InfoRow Icon={MapPin} label={t.location}>
                  {partnerText(store, lang, 'address')}
                  {store.transit_note && (
                    <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-[#64748B]">
                      <TrainFront size={13} strokeWidth={2} className="shrink-0" />
                      {partnerText(store, lang, 'transit_note')}
                    </span>
                  )}
                </InfoRow>
              )}
              {partnerHours(store, lang) && (
                <InfoRow Icon={Clock} label={t.hours}>{partnerHours(store, lang)}</InfoRow>
              )}
              {store.phone && (
                <InfoRow Icon={Phone} label={t.phone}>
                  <span className="flex items-center justify-between gap-3">
                    <span>{store.phone}</span>
                    <a
                      href={telHref(store.phone)}
                      className="shrink-0 rounded-full bg-[#EFF6FF] border border-[#DBE7FE] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1D4ED8] no-underline"
                    >
                      {t.call}
                    </a>
                  </span>
                </InfoRow>
              )}
            </section>
          </>
        )}
      </div>

      {scanning && <QrScanModal lang={lang} onClose={() => setScanning(false)} onDetected={onDetected} />}

      <BottomTabBar lang={lang} />
    </div>
  );
}

function InfoRow({ Icon, label, children }: { Icon: typeof MapPin; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <Icon size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-[#64748B]" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-[#94A3B8]">{label}</p>
        <div className="mt-0.5 text-[14px] text-[#111827] flex flex-col">{children}</div>
      </div>
    </div>
  );
}
