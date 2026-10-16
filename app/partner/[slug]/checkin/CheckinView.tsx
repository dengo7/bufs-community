'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Clock3, PartyPopper, Stamp, Ticket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLang } from '../../../lib/lang';
import {
  currentUserId, isValidCodeFormat, loginHref, partnerCheckin, PARTNER_T, type CheckinResult,
} from '../../../lib/partners';

/**
 * 매장 QR → 방문 인증.
 * 로그인돼 있으면 바로 적립, 아니면 로그인 화면으로 보냈다가 같은 주소로 돌아와 적립한다.
 * (iOS 기본 카메라로 찍으면 앱이 아니라 Safari가 열리므로 그쪽 로그인도 이 흐름을 탄다)
 */
export default function CheckinView({ slug }: { slug: string }) {
  const lang = useLang();
  const t = PARTNER_T[lang];
  const code = useSearchParams().get('code');
  const [result, setResult] = useState<CheckinResult | null>(null);
  const startedRef = useRef(false);   // StrictMode 이중 실행에도 RPC는 한 번만

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      if (!isValidCodeFormat(code)) {
        setResult({ status: 'invalid_code' });
        return;
      }
      const uid = await currentUserId();
      if (!uid) {
        // 풀 리로드로 이동 — 로그인 후 /auth 가 next 로 다시 이 주소를 연다
        window.location.href = loginHref(window.location.pathname + window.location.search);
        return;
      }
      const res = await partnerCheckin(slug, code);
      if (res.status === 'not_logged_in') {
        window.location.href = loginHref(window.location.pathname + window.location.search);
        return;
      }
      setResult(res);
    })();
  }, [code, slug]);

  const view = describe(result, t);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 max-w-[480px] w-full mx-auto px-5 flex flex-col items-center justify-center text-center pb-safe">
        {!view ? (
          <>
            <span className="h-14 w-14 rounded-full border-4 border-[#F5D9BF] border-t-[#C2611F] animate-spin" aria-hidden="true" />
            <p className="mt-4 text-[15px] font-semibold text-[#475569]">{t.processing}</p>
          </>
        ) : (
          <>
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: view.bg, color: view.fg }}
            >
              <view.Icon size={38} strokeWidth={1.8} />
            </span>
            <h1 className="mt-5 text-[22px] font-extrabold leading-snug">{view.title}</h1>
            {view.sub && <p className="mt-2 text-[14px] text-[#64748B] leading-relaxed">{view.sub}</p>}

            {view.progress && (
              <div className="mt-6 w-full rounded-2xl border border-[#F5D9BF] bg-white px-4 py-4">
                <p className="text-[13px] font-bold text-[#C2611F]">{t.stampProgress(view.progress.stamps, view.progress.per)}</p>
                <div className="mt-3 flex justify-center gap-2" aria-hidden="true">
                  {Array.from({ length: view.progress.per }).map((_, i) => (
                    <span
                      key={i}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2
                        ${i < view.progress!.stamps ? 'border-[#C2611F] bg-[#C2611F] text-white' : 'border-dashed border-[#E5E7EB]'}`}
                    >
                      {i < view.progress!.stamps && <Stamp size={18} strokeWidth={2} />}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 w-full space-y-2">
              {view.coupons > 0 && (
                <Link
                  href={`/partner/${slug}/coupon`}
                  className="w-full h-12 flex items-center justify-center gap-1.5 rounded-xl bg-[#C2611F] text-[15px] font-bold text-white no-underline"
                >
                  <Ticket size={18} strokeWidth={2} />
                  {t.useCoupon} · {t.couponCount(view.coupons)}
                </Link>
              )}
              <Link
                href={`/partner/${slug}`}
                className="w-full h-12 flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[15px] font-semibold text-[#334155] no-underline"
              >
                {t.viewShop}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type View = {
  Icon: LucideIcon;
  bg: string;
  fg: string;
  title: string;
  sub?: string;
  progress?: { stamps: number; per: number };
  coupons: number;
};

/** 결과 5종(적립됨 / 쿠폰 발급됨 / 오늘 이미 적립 / 영업시간 아님 / 잘못된 코드) + 오류 */
function describe(r: CheckinResult | null, t: (typeof PARTNER_T)['ko']): View | null {
  if (!r) return null;
  const progress = 'per_reward' in r && r.per_reward ? { stamps: r.stamps ?? 0, per: r.per_reward } : undefined;
  const coupons = 'coupons' in r ? (r.coupons ?? 0) : 0;
  const ok = { bg: '#FFF1E3', fg: '#C2611F' };
  const warn = { bg: '#F1F5F9', fg: '#475569' };
  const bad = { bg: '#FEF2F2', fg: '#B91C1C' };

  switch (r.status) {
    case 'stamped':
      return { Icon: Stamp, ...ok, title: t.resStamped, progress, coupons };
    case 'coupon_issued':
      return { Icon: PartyPopper, ...ok, title: t.resCoupon, sub: t.resCouponSub(coupons), progress, coupons };
    case 'already_today':
      return { Icon: Stamp, ...warn, title: t.resAlready, sub: t.resAlreadySub, progress, coupons };
    case 'closed':
      return {
        Icon: Clock3, ...warn, title: t.resClosed,
        sub: 'open_time' in r && r.open_time && r.close_time ? t.resClosedSub(r.open_time, r.close_time) : undefined,
        coupons: 0,
      };
    case 'invalid_code':
      return { Icon: AlertCircle, ...bad, title: t.resInvalid, sub: t.resInvalidSub, coupons: 0 };
    default:
      return { Icon: AlertCircle, ...bad, title: t.resError, coupons: 0 };
  }
}
