'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  getPushPermissionState,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from '../lib/push';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

const T = {
  ko: {
    label: '푸시 알림',
    deniedHint: '브라우저 설정에서 알림 허용이 필요해요',
    unsupportedHint: '이 브라우저는 푸시 알림을 지원하지 않아요',
  },
  en: {
    label: 'Push Notifications',
    deniedHint: 'Allow notifications in your browser settings',
    unsupportedHint: 'Push notifications are not supported in this browser',
  },
  zh: {
    label: '推送通知',
    deniedHint: '请在浏览器设置中允许通知',
    unsupportedHint: '此浏览器不支持推送通知',
  },
  ja: {
    label: 'プッシュ通知',
    deniedHint: 'ブラウザの設定で通知を許可してください',
    unsupportedHint: 'このブラウザはプッシュ通知に対応していません',
  },
} as const;

interface Props {
  lang: Lang;
}

export default function PushNotificationToggle({ lang }: Props) {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const t = T[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const perm = getPushPermissionState();
      const sub = perm !== 'unsupported' ? await isPushSubscribed() : false;
      if (!cancelled) {
        setPermission(perm);
        setSubscribed(sub);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  if (permission === 'unsupported') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 text-[13px] text-gray-400">
        {t.unsupportedHint}
      </div>
    );
  }

  const isDenied = permission === 'denied';

  const handleToggle = async () => {
    if (isDenied || busy) return;
    setBusy(true);
    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) setSubscribed(false);
      } else {
        const ok = await subscribeToPush();
        if (ok) {
          setSubscribed(true);
          setPermission('granted');
        } else {
          setPermission(getPushPermissionState());
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Bell size={18} className="text-gray-500 shrink-0" strokeWidth={1.5} />
        <span className="flex-1 text-[14px] font-medium text-[#1A1A1A]">{t.label}</span>
        <button
          role="switch"
          aria-checked={subscribed}
          disabled={isDenied || busy}
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none
            ${isDenied || busy ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            ${subscribed ? 'bg-[#F6C21A]' : 'bg-gray-200'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
              ${subscribed ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>
      {isDenied && (
        <p className="mt-2 text-[12px] text-gray-400 pl-[30px]">{t.deniedHint}</p>
      )}
    </div>
  );
}
