'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Gift, Handshake, MapPin } from 'lucide-react';
import type { UILang } from '../../lib/categories';
import { fetchPartnerStores, partnerText, PARTNER_T, type PartnerStore } from '../../lib/partners';
import PartnerImage from './PartnerImage';

/**
 * 캠퍼스 가이드 상단의 제휴 가게 섹션.
 * 테이블이 아직 없거나(마이그레이션 전) 비어 있으면 아무것도 그리지 않는다.
 */
export default function PartnerSection({ lang }: { lang: UILang }) {
  const t = PARTNER_T[lang];
  const [stores, setStores] = useState<PartnerStore[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPartnerStores().then(list => { if (!cancelled) setStores(list); });
    return () => { cancelled = true; };
  }, []);

  if (!stores.length) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <Handshake size={18} strokeWidth={2} className="text-[#C2611F]" />
        <h2 className="text-[16px] font-extrabold text-[#0F172A]">{t.sectionTitle}</h2>
        <span className="text-[12px] font-semibold text-[#94A3B8]">{t.sectionSub}</span>
      </div>

      <div className="space-y-2">
        {stores.map(store => {
          const name = partnerText(store, lang, 'name');
          return (
            <Link
              key={store.id}
              href={`/partner/${store.slug}`}
              className="flex items-stretch gap-3 rounded-2xl border border-[#F5D9BF] bg-white p-2.5 no-underline
                         shadow-[0_2px_10px_rgba(194,97,31,0.08)] active:scale-[0.99] transition-transform"
            >
              <PartnerImage src={store.image} alt={name} className="w-[84px] h-[84px] rounded-xl shrink-0" />
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 rounded-md bg-[#C2611F] px-1.5 py-[1px] text-[10.5px] font-bold text-white">{t.badge}</span>
                  <p className="truncate text-[15px] font-bold text-[#111827]">{name}</p>
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-[#C2611F]">
                  <Gift size={13} strokeWidth={2} className="shrink-0" />
                  <span className="truncate">{t.benefit(store.stamps_per_reward)}</span>
                </p>
                {store.transit_note && (
                  <p className="mt-1 flex items-center gap-1 text-[12px] text-[#64748B]">
                    <MapPin size={12} strokeWidth={2} className="shrink-0" />
                    <span className="truncate">{partnerText(store, lang, 'transit_note')}</span>
                  </p>
                )}
              </div>
              <ChevronRight size={18} strokeWidth={2} className="self-center shrink-0 text-[#CBD5E1]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
