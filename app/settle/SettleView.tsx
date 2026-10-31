'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Construction, Pencil } from 'lucide-react';
import { useLang } from '../lib/lang';
import {
  buildTimeline, dayN, pickUrgent, saveSettleProfile, toggleSettleDone, useSettleState,
} from '../lib/settle';
import { SETTLE_T } from '../lib/settleI18n';
import { SETTLE_ITEMS } from '../lib/settleItems';
import ProfileSetup from '../components/settle/ProfileSetup';
import ProgressBar from '../components/settle/ProgressBar';
import UrgentCard from '../components/settle/UrgentCard';
import Timeline from '../components/settle/Timeline';
import DetailSheet from '../components/settle/DetailSheet';

/**
 * 유학생 정착 체크리스트 — 입국일·체류자격·거주형태로 할 일을 고르고
 * 입국일부터 이어지는 세로 타임라인으로 보여준다 (시안 B).
 * 프로필과 완료 체크는 이 기기의 localStorage에만 저장한다(lib/settle.ts).
 */
export default function SettleView() {
  const router = useRouter();
  const lang = useLang();
  const t = SETTLE_T[lang];
  const { ready, profile, done } = useSettleState();
  const [editing, setEditing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeSheet = useCallback(() => setOpenId(null), []);

  const showSetup = ready && (!profile || editing);
  const timeline = profile ? buildTimeline(profile, done) : null;
  const plan = timeline?.plan ?? [];
  const urgent = pickUrgent(plan, done);
  // "끝내면 가능해져요"에서 지금 목록에 없는 항목으로 옮겨 갈 수도 있어 전체 항목에서 찾는다
  const openItem = SETTLE_ITEMS.find(it => it.id === openId) ?? null;

  const n = profile ? dayN(profile) : 0;
  const dayText = n > 0 ? t.dayAfter(n) : n < 0 ? t.dayBefore(-n) : t.arrivalToday;

  return (
    // 한국어는 어절 단위로만 줄바꿈(keep-all). 중국어·일본어는 글자 단위 줄바꿈이 정상이라 적용하지 않는다
    <div className={`min-h-screen bg-[#F5F6FA] text-[#111827] [overflow-wrap:anywhere] ${lang === 'ko' ? 'break-keep' : ''}`}>
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label={t.backAria}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          {/* 다른 화면 헤더(내정보·알림)와 같은 로고 파일·방식, 크기만 28px */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/the-well-mark.png" alt="The Well" className="h-7 w-auto object-contain shrink-0" />
          <h1 className="flex-1 min-w-0 text-[15px] font-bold truncate">{t.title}</h1>
          {profile && !showSetup && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-9 px-3 flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white text-[12.5px] font-semibold text-[#475569] cursor-pointer shrink-0"
            >
              <Pencil size={13} />{t.editProfile}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[600px] mx-auto pb-16">
        {!ready ? null : showSetup ? (
          <ProfileSetup
            lang={lang}
            initial={profile}
            onSave={p => { saveSettleProfile(p); setEditing(false); }}
            onCancel={profile ? () => setEditing(false) : undefined}
          />
        ) : profile && timeline && (
          <div className="px-4 pt-4">
            <p className="flex flex-wrap gap-1.5 text-[12px] font-semibold">
              <span className="px-2.5 py-[5px] rounded-full border border-[#DBE7FE] bg-[#EFF6FF] text-[#1D4ED8]">{dayText}</span>
              <span className="px-2.5 py-[5px] rounded-full border border-[#E5E7EB] bg-white text-[#475569]">{t.visaLabel[profile.visa]}</span>
              <span className="px-2.5 py-[5px] rounded-full border border-[#E5E7EB] bg-white text-[#475569]">{t.housingLabel[profile.housing]}</span>
            </p>

            {profile.visa === 'other' ? (
              <section className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4">
                <p className="flex items-center gap-1.5 text-[15px] font-bold text-[#111827]">
                  <Construction size={18} className="text-[#B45309]" />{t.otherVisaTitle}
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#475569]">{t.otherVisaBody}</p>
              </section>
            ) : (
              <>
                <div className="mt-3">
                  <UrgentCard
                    lang={lang}
                    entry={urgent}
                    profile={profile}
                    onOpen={() => urgent && setOpenId(urgent.item.id)}
                    onDone={() => urgent && toggleSettleDone(urgent.item.id)}
                  />
                </div>
                <div className="mt-3">
                  <ProgressBar lang={lang} entries={plan} done={done} />
                </div>

                <div className="mt-[22px] mb-3 flex items-center gap-2">
                  <span className="w-3.5 h-[3px] rounded-full bg-[#1D4ED8]" />
                  <h2 className="text-[14px] font-bold text-[#111827]">{t.timelineTitle}</h2>
                </div>
                <Timeline
                  lang={lang}
                  profile={profile}
                  nodes={timeline.nodes}
                  todayIndex={timeline.todayIndex}
                  done={done}
                  onOpen={setOpenId}
                  onToggle={toggleSettleDone}
                />
              </>
            )}
          </div>
        )}
      </main>

      {openItem && profile && (
        <DetailSheet
          key={openItem.id}
          lang={lang}
          item={openItem}
          profile={profile}
          doneSet={done}
          others={plan.filter(e => e.item.id !== openItem.id).map(e => ({ name: e.item.name, done: done.has(e.item.id) }))}
          onToggle={() => toggleSettleDone(openItem.id)}
          onClose={closeSheet}
          onOpenItem={setOpenId}
        />
      )}
    </div>
  );
}
