'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import type { UILang } from '../lib/lang';
import {
  enableNativePush,
  getNativePushPermission,
  isNativePushSupported,
  markPushPromptDismissed,
  pushPromptDismissedRecently,
} from '../lib/nativePush';

// "나중에" 를 누르면 30일(PUSH_PROMPT_DISMISS_DAYS) 동안 다시 묻지 않는다. 설정 화면에서는 언제든 켤 수 있다.
// (기록은 관리자 진단 카드의 "시트 다시 보기"로 지울 수 있다)

const T = {
  ko: {
    title: '학교 공지를 놓치지 마세요',
    body: '새 학사 공지와 국제교류처 공지가 올라오면 바로 알려드려요. 댓글·답글 알림도 함께 받을 수 있어요.',
    enable: '알림 켜기',
    later: '나중에',
    close: '닫기',
  },
  en: {
    title: "Don't miss school notices",
    body: 'Get notified when new academic and Global Affairs notices are posted. Comment and reply alerts are included.',
    enable: 'Turn on notifications',
    later: 'Later',
    close: 'Close',
  },
  zh: {
    title: '不错过学校公告',
    body: '学事公告和国际交流处公告发布时立即通知您，同时接收评论和回复提醒。',
    enable: '开启通知',
    later: '稍后',
    close: '关闭',
  },
  ja: {
    title: '学校のお知らせを見逃さない',
    body: '学事・国際交流処の新しいお知らせをすぐにお届けします。コメント・返信の通知も受け取れます。',
    enable: '通知をオンにする',
    later: 'あとで',
    close: '閉じる',
  },
} as const;


interface Props {
  lang: UILang;
}

/**
 * 로그인 후 홈에서 한 번 보여주는 권한 안내 시트.
 * 네이티브 푸시 지원 빌드 + 아직 권한을 묻지 않은 상태(prompt) 또는 확인 실패(unknown)일 때 뜬다.
 * 시스템 권한 프롬프트는 사용자가 "알림 켜기" 를 누른 뒤에만 띄운다(iOS 는 한 번뿐).
 */
export default function PushPromptSheet({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = T[lang];

  useEffect(() => {
    if (!isNativePushSupported() || pushPromptDismissedRecently()) return;
    let cancelled = false;
    getNativePushPermission().then(perm => {
      if (!cancelled && (perm === 'prompt' || perm === 'unknown')) setOpen(true);
    });
    return () => { cancelled = true; };
  }, []);

  if (!open) return null;

  const dismiss = () => { markPushPromptDismissed(); setOpen(false); };

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await enableNativePush();
    } finally {
      setBusy(false);
      // 허용·거부 어느 쪽이든 시스템 프롬프트는 끝났으므로 시트를 닫는다
      setOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="push-prompt-title">
      <button
        type="button"
        aria-label={t.close}
        onClick={dismiss}
        className="absolute inset-0 bg-black/40 border-none animate-[sheet-fade_0.2s_ease-out]"
      />
      <div className="relative w-full max-w-[600px] bg-white rounded-t-3xl px-6 pt-6 pb-safe shadow-2xl animate-[sheet-up_0.25s_ease-out]">
        <button
          type="button"
          aria-label={t.close}
          onClick={dismiss}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-gray-400 bg-transparent border-none cursor-pointer"
        >
          <X size={20} />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4">
          <Bell size={28} strokeWidth={1.8} color="#1B7CC0" />
        </div>
        <h2 id="push-prompt-title" className="text-[18px] font-bold text-[#1A1A1A] mb-2 break-keep">{t.title}</h2>
        <p className="text-[14px] text-gray-600 leading-relaxed mb-6 break-keep">{t.body}</p>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="w-full h-12 rounded-2xl bg-[#F6C21A] text-[#1A1A1A] text-[15px] font-bold border-none cursor-pointer disabled:opacity-60"
        >
          {t.enable}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="w-full h-11 mt-2 rounded-2xl bg-transparent text-gray-500 text-[14px] font-medium border-none cursor-pointer"
        >
          {t.later}
        </button>
      </div>
    </div>
  );
}
