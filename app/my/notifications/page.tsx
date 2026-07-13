'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';
import BottomTabBar from '../../components/BottomTabBar';
import { getLang, setLang as persistLang, type UILang } from '../../lib/lang';
import {
  getPushPermissionState,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from '../../lib/push';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: {
    title: '알림 설정',
    pushLabel: '푸시 알림',
    info: '댓글과 답글 알림을 받습니다. 좋아요 알림은 제공되지 않습니다.',
    deniedHint: '브라우저 설정에서 알림 허용이 필요해요',
    unsupportedHint: '이 브라우저는 푸시 알림을 지원하지 않아요',
  },
  en: {
    title: 'Notification Settings',
    pushLabel: 'Push Notifications',
    info: 'You will receive notifications for comments and replies. Like notifications are not provided.',
    deniedHint: 'Allow notifications in your browser settings',
    unsupportedHint: 'Push notifications are not supported in this browser',
  },
  zh: {
    title: '通知设置',
    pushLabel: '推送通知',
    info: '您将收到评论和回复的通知。不提供点赞通知。',
    deniedHint: '请在浏览器设置中允许通知',
    unsupportedHint: '此浏览器不支持推送通知',
  },
  ja: {
    title: '通知設定',
    pushLabel: 'プッシュ通知',
    info: 'コメントと返信の通知を受け取ります。いいねの通知は提供されません。',
    deniedHint: 'ブラウザの設定で通知を許可してください',
    unsupportedHint: 'このブラウザはプッシュ通知に対応していません',
  },
} as const;

function ToggleSwitch({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <div
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200
        ${disabled ? 'opacity-40' : ''}
        ${on ? 'bg-[#F6C21A]' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
          ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </div>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<UILang>('ko');
  useEffect(() => { setLang(getLang()); }, []);

  // 푸시 알림 상태
  const [pushPerm, setPushPerm]   = useState<PushPermissionState>('default');
  const [pushOn, setPushOn]       = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [pushBusy, setPushBusy]   = useState(false);
  const [toast, setToast]         = useState<string | null>(null);

  const t = T[lang];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── 푸시 알림 초기화 ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = getPushPermissionState();
      const sub  = perm !== 'unsupported' ? await isPushSubscribed() : false;
      if (!cancelled) {
        setPushPerm(perm);
        setPushOn(sub);
        setPushReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePushToggle = async () => {
    if (pushPerm === 'denied')      { showToast(t.deniedHint); return; }
    if (pushPerm === 'unsupported') { showToast(t.unsupportedHint); return; }
    if (pushBusy || !pushReady)     return;

    setPushBusy(true);
    try {
      if (pushOn) {
        if (await unsubscribeFromPush()) setPushOn(false);
      } else {
        if (await subscribeToPush()) { setPushOn(true); setPushPerm('granted'); }
        else setPushPerm(getPushPermissionState());
      }
    } finally {
      setPushBusy(false);
    }
  };

  const isDenied = pushPerm === 'denied';
  const isUnsupported = pushPerm === 'unsupported';

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[15px] font-bold">{t.title}</span>
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); persistLang(l); }}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-6 pb-28">

        {/* 푸시 알림 토글 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={handlePushToggle}
            disabled={!pushReady}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-transparent border-none cursor-pointer
                       hover:bg-gray-50 active:bg-gray-100 transition-colors text-left disabled:cursor-default"
          >
            <div
              className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
              style={{ backgroundColor: '#EFF6FF' }}
            >
              <Bell size={18} strokeWidth={1.8} color="#1B7CC0" />
            </div>
            <span className="flex-1 text-[14px] font-semibold text-[#1A1A1A]">{t.pushLabel}</span>
            {isUnsupported
              ? <span className="text-[11px] text-gray-300 shrink-0">{t.unsupportedHint}</span>
              : <ToggleSwitch on={pushOn} disabled={isDenied || pushBusy || !pushReady} />}
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="text-[12px] text-gray-400 mt-3 px-1 leading-relaxed">
          {t.info}
        </p>
        {isDenied && (
          <p className="text-[12px] text-amber-500 mt-1.5 px-1 leading-relaxed">
            {t.deniedHint}
          </p>
        )}
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed top-[66px] left-1/2 -translate-x-1/2 z-[400] whitespace-nowrap
          bg-[#2F2F2F] text-white text-[13px] font-medium px-4 py-2 rounded-2xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <BottomTabBar lang={lang} />
    </div>
  );
}
