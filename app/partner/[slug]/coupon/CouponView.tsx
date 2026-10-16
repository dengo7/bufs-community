'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CircleCheck, Lock, Ticket } from 'lucide-react';
import BottomTabBar from '../../../components/BottomTabBar';
import { useLang } from '../../../lib/lang';
import {
  currentUserId, fetchMyCoupons, fetchPartnerStore, fmtDateTime, fmtTime, loginHref, partnerRedeem, partnerText,
  PARTNER_T, type PartnerCoupon, type PartnerStore,
} from '../../../lib/partners';

/**
 * 쿠폰 사용: 손님이 화면을 직원에게 보여주면 직원이 PIN 4자리를 입력하고 "사용 완료".
 * 사용한 쿠폰은 사용 시각과 함께 남고 다시 쓸 수 없다. (음료 종류는 매장에서 고른다)
 */
export default function CouponView({ slug }: { slug: string }) {
  const lang = useLang();
  const t = PARTNER_T[lang];
  const router = useRouter();

  const [store, setStore] = useState<PartnerStore | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<{ unused: PartnerCoupon[]; used: PartnerCoupon[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'lock'; text: string } | null>(null);
  const [justUsed, setJustUsed] = useState<string | null>(null);   // 방금 사용한 시각

  const reload = useCallback(async (s: PartnerStore, uid: string) => {
    setCoupons(await fetchMyCoupons(s.id, uid));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await currentUserId();
      if (!uid) {
        window.location.href = loginHref(window.location.pathname);
        return;
      }
      const s = await fetchPartnerStore(slug);
      if (cancelled) return;
      setStore(s);
      setUserId(uid);
      if (s) await reload(s, uid);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, reload]);

  const current = coupons?.unused[0] ?? null;

  async function submit() {
    if (!current || !store || !userId || pin.length !== 4 || submitting) return;
    setSubmitting(true);
    setMessage(null);
    const r = await partnerRedeem(current.id, pin);
    setPin('');
    switch (r.status) {
      case 'redeemed':
        setJustUsed(r.redeemed_at);
        await reload(store, userId);
        break;
      case 'already_used':
        await reload(store, userId);
        break;
      case 'wrong_pin':
        setMessage({ kind: 'error', text: t.wrongPin(r.remaining) });
        break;
      case 'locked':
        setMessage({ kind: 'lock', text: t.locked(fmtTime(r.locked_until, lang)) });
        break;
      case 'daily_limit':
        setMessage({ kind: 'error', text: t.dailyLimit });
        break;
      case 'pin_not_set':
        setMessage({ kind: 'error', text: t.pinNotSet });
        break;
      default:
        setMessage({ kind: 'error', text: t.resError });
    }
    setSubmitting(false);
  }

  const name = store ? partnerText(store, lang, 'name') : '';

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
          <p className="flex-1 min-w-0 text-[15px] font-bold truncate">{t.couponTitle}</p>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-tabbar">
        {loading ? (
          <div className="h-72 rounded-3xl bg-gray-100 animate-pulse" />
        ) : !store || !coupons ? (
          <p className="bg-white rounded-2xl border border-[#E5E7EB] py-12 text-center text-[14px] text-gray-500">{t.notFound}</p>
        ) : (
          <>
            {/* 방금 사용 완료 */}
            {justUsed && (
              <div className="mb-4 rounded-3xl border-2 border-[#16A34A] bg-[#F0FDF4] px-5 py-6 text-center">
                <CircleCheck size={44} strokeWidth={1.8} className="mx-auto text-[#16A34A]" />
                <p className="mt-3 text-[20px] font-extrabold">{t.usedDone}</p>
                <p className="mt-1 text-[14px] font-semibold text-[#15803D]">{t.usedAt(fmtDateTime(justUsed, lang))}</p>
                <p className="mt-2 text-[12.5px] text-[#64748B]">{t.cannotReuse}</p>
              </div>
            )}

            {current ? (
              <section className="rounded-3xl border-2 border-dashed border-[#C2611F] bg-white px-5 py-6 text-center">
                <Ticket size={40} strokeWidth={1.7} className="mx-auto text-[#C2611F]" />
                <p className="mt-2 text-[13px] font-semibold text-[#64748B]">{name}</p>
                <h1 className="mt-1 text-[24px] font-extrabold leading-tight">{t.couponTitle}</h1>
                <p className="mt-1 text-[12px] text-[#94A3B8]">{t.issuedAt(fmtDateTime(current.issued_at, lang))}</p>
                <p className="mt-4 rounded-xl bg-[#FFF8F1] px-3 py-2.5 text-[14px] font-bold text-[#C2611F]">{t.showStaff}</p>

                <label className="mt-5 block text-left text-[12.5px] font-semibold text-[#475569]" htmlFor="staff-pin">
                  {t.staffPin}
                </label>
                <input
                  id="staff-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                  className="mt-1.5 w-full h-14 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] text-center text-[26px] tracking-[0.6em] font-bold outline-none focus:border-[#C2611F]"
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={pin.length !== 4 || submitting}
                  className="mt-3 w-full py-3.5 rounded-2xl bg-[#C2611F] text-[16px] font-bold text-white border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t.confirmUse}
                </button>

                {message && (
                  <p
                    role="alert"
                    className={`mt-3 flex items-center justify-center gap-1.5 text-[13.5px] font-semibold
                      ${message.kind === 'lock' ? 'text-[#475569]' : 'text-[#B91C1C]'}`}
                  >
                    {message.kind === 'lock' && <Lock size={15} strokeWidth={2} />}
                    {message.text}
                  </p>
                )}

                {coupons.unused.length > 1 && (
                  <p className="mt-4 text-[12.5px] text-[#64748B]">{t.couponsLeft(coupons.unused.length)}</p>
                )}
              </section>
            ) : (
              !justUsed && (
                <p className="bg-white rounded-2xl border border-[#E5E7EB] py-12 text-center text-[14px] text-gray-500">{t.noCoupons}</p>
              )
            )}

            {/* 사용한 쿠폰 */}
            {coupons.used.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-2 px-0.5 text-[13px] font-bold text-[#64748B]">{t.usedHistory}</h2>
                <ul className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F1F5F9]">
                  {coupons.used.map(c => (
                    <li key={c.id} className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#94A3B8]">
                      <Ticket size={15} strokeWidth={1.8} className="shrink-0" />
                      <span className="line-through">{t.couponTitle}</span>
                      <span className="ml-auto shrink-0">{t.usedAt(fmtDateTime(c.redeemed_at!, lang))}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <BottomTabBar lang={lang} />
    </div>
  );
}
