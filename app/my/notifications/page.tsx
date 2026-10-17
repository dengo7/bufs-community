'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, BookOpen, Globe, MessageCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import BottomTabBar from '../../components/BottomTabBar';
import NativePushDiagnostics from '../../components/NativePushDiagnostics';
import { useLang } from '../../lib/lang';
import { getSupabaseClient } from '../../lib/supabase/client';
import {
  getPushPermissionState,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../lib/push';
import {
  checkNativePushPermission,
  disableNativePush,
  enableNativePush,
  isNativePushEnabled,
  isNativePushSupported,
} from '../../lib/nativePush';
import {
  DEFAULT_PREFERENCES,
  fetchNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../../lib/notificationPreferences';

const T = {
  ko: {
    title: '알림 설정',
    pushLabel: '푸시 알림',
    infoNative: '앱을 닫아도 새 공지와 댓글 알림을 받습니다.',
    infoWeb: '댓글과 답글 알림을 받습니다. 좋아요 알림은 제공되지 않습니다.',
    deniedHintNative: '기기 설정 > The Well > 알림에서 허용이 필요해요',
    deniedHint: '브라우저 설정에서 알림 허용이 필요해요',
    unsupportedHint: '이 브라우저는 푸시 알림을 지원하지 않아요',
    typesTitle: '받을 알림',
    academic: '학사 공지',
    academicDesc: '수강신청·시험·학사일정 등',
    global: '국제교류처 공지',
    globalDesc: '교환학생·장학·행사 등',
    community: '커뮤니티 활동',
    communityDesc: '내 글의 댓글, 내 댓글의 답글',
    saveError: '설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    enableError: '알림을 켜지 못했어요. 잠시 후 다시 시도해주세요.',
  },
  en: {
    title: 'Notification Settings',
    pushLabel: 'Push Notifications',
    infoNative: 'Get new notices and comment alerts even when the app is closed.',
    infoWeb: 'You will receive notifications for comments and replies. Like notifications are not provided.',
    deniedHintNative: 'Allow notifications in Settings > The Well > Notifications',
    deniedHint: 'Allow notifications in your browser settings',
    unsupportedHint: 'Push notifications are not supported in this browser',
    typesTitle: 'What to receive',
    academic: 'Academic notices',
    academicDesc: 'Registration, exams, academic calendar',
    global: 'Global Affairs notices',
    globalDesc: 'Exchange, scholarships, events',
    community: 'Community activity',
    communityDesc: 'Comments on my posts, replies to my comments',
    saveError: "Couldn't save settings. Please try again later.",
    enableError: "Couldn't turn on notifications. Please try again later.",
  },
  zh: {
    title: '通知设置',
    pushLabel: '推送通知',
    infoNative: '即使关闭应用，也能收到新公告和评论通知。',
    infoWeb: '您将收到评论和回复的通知。不提供点赞通知。',
    deniedHintNative: '请在 设置 > The Well > 通知 中允许',
    deniedHint: '请在浏览器设置中允许通知',
    unsupportedHint: '此浏览器不支持推送通知',
    typesTitle: '接收内容',
    academic: '学事公告',
    academicDesc: '选课、考试、学事日程等',
    global: '国际交流处公告',
    globalDesc: '交换、奖学金、活动等',
    community: '社区动态',
    communityDesc: '我的帖子的评论、我的评论的回复',
    saveError: '无法保存设置，请稍后再试。',
    enableError: '无法开启通知，请稍后再试。',
  },
  ja: {
    title: '通知設定',
    pushLabel: 'プッシュ通知',
    infoNative: 'アプリを閉じていても新しいお知らせやコメント通知を受け取れます。',
    infoWeb: 'コメントと返信の通知を受け取ります。いいねの通知は提供されません。',
    deniedHintNative: '設定 > The Well > 通知 で許可してください',
    deniedHint: 'ブラウザの設定で通知を許可してください',
    unsupportedHint: 'このブラウザはプッシュ通知に対応していません',
    typesTitle: '受け取る通知',
    academic: '学事のお知らせ',
    academicDesc: '履修登録・試験・学事日程など',
    global: '国際交流処のお知らせ',
    globalDesc: '交換留学・奨学金・イベントなど',
    community: 'コミュニティ',
    communityDesc: '自分の投稿へのコメント、自分のコメントへの返信',
    saveError: '設定を保存できませんでした。しばらくしてからお試しください。',
    enableError: '通知をオンにできませんでした。しばらくしてからお試しください。',
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

type PrefKey = keyof NotificationPreferences;

// 마스터 스위치 상태 — 네이티브(iOS 앱)와 웹 푸시를 같은 모양으로 다룬다
// permission 'unknown' = 상태 확인 실패(에러) — 거부와 구분하고, 토글을 누르면 권한 요청을 시도한다
type MasterState = {
  mode: 'native' | 'web';
  permission: 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported';
  on: boolean;
};

export default function NotificationSettingsPage() {
  const router = useRouter();
  const lang = useLang();
  const t = T[lang];

  const [userId, setUserId]   = useState<string | null>(null);
  const [master, setMaster]   = useState<MasterState | null>(null);
  const [busy, setBusy]       = useState(false);
  const [prefs, setPrefs]     = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [prefsReady, setPrefsReady] = useState(false);
  const [toast, setToast]     = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // ── 초기화: 마스터 스위치 + 알림 종류 설정 ──────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (isNativePushSupported()) {
        const [{ permission }, on] = await Promise.all([checkNativePushPermission(), isNativePushEnabled()]);
        if (!cancelled) setMaster({ mode: 'native', permission, on });
      } else {
        const perm = getPushPermissionState();
        const on = perm !== 'unsupported' ? await isPushSubscribed() : false;
        if (!cancelled) {
          setMaster({ mode: 'web', permission: perm === 'default' ? 'prompt' : perm, on });
        }
      }
    })();

    getSupabaseClient().auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      const uid = data.session?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) {
        const loaded = await fetchNotificationPreferences(uid);
        if (!cancelled) setPrefs(loaded);
      }
      if (!cancelled) setPrefsReady(true);
    });

    return () => { cancelled = true; };
  }, []);

  // ── 마스터 스위치 토글 ──────────────────────────────────────
  const handleMasterToggle = async () => {
    if (!master || busy) return;
    if (master.permission === 'denied') {
      showToast(master.mode === 'native' ? t.deniedHintNative : t.deniedHint);
      return;
    }
    if (master.permission === 'unsupported') { showToast(t.unsupportedHint); return; }

    setBusy(true);
    try {
      if (master.mode === 'native') {
        if (master.on) {
          if (await disableNativePush()) setMaster({ ...master, on: false });
        } else {
          // prompt·unknown 이면 enableNativePush 가 requestPermissions() 를 직접 호출한다
          const { ok, permission, error } = await enableNativePush();
          setMaster({ mode: 'native', permission, on: ok });
          if (!ok && permission === 'denied') showToast(t.deniedHintNative);
          else if (!ok) showToast(error ? `${t.enableError} (${error})` : t.enableError);
        }
      } else {
        if (master.on) {
          if (await unsubscribeFromPush()) setMaster({ ...master, on: false });
        } else if (await subscribeToPush()) {
          setMaster({ mode: 'web', permission: 'granted', on: true });
        } else {
          const perm = getPushPermissionState();
          setMaster({ mode: 'web', permission: perm === 'default' ? 'prompt' : perm, on: false });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // ── 알림 종류 토글 (낙관적 갱신, 실패 시 되돌림) ───────────
  const handlePrefToggle = async (key: PrefKey) => {
    if (!userId || !prefsReady) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const ok = await saveNotificationPreferences(userId, next);
    if (!ok) {
      setPrefs(prefs);
      showToast(t.saveError);
    }
  };

  const isDenied = master?.permission === 'denied';
  const isUnsupported = master?.permission === 'unsupported';
  const masterDisabled = !master || busy || isDenied;

  const prefRows: { key: PrefKey; icon: typeof BookOpen; color: string; bg: string; label: string; desc: string }[] = [
    { key: 'notice_academic', icon: BookOpen,      color: '#1D4ED8', bg: '#EFF6FF', label: t.academic,  desc: t.academicDesc },
    { key: 'notice_global',   icon: Globe,         color: '#059669', bg: '#ECFDF5', label: t.global,    desc: t.globalDesc },
    { key: 'community',       icon: MessageCircle, color: '#D97706', bg: '#FFFBEB', label: t.community, desc: t.communityDesc },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[15px] font-bold">{t.title}</span>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-6 pb-tabbar">

        {/* 푸시 알림 마스터 토글 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={handleMasterToggle}
            disabled={!master}
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
              : <ToggleSwitch on={master?.on ?? false} disabled={masterDisabled} />}
          </button>
        </div>

        {/* 안내 문구 */}
        <p className="text-[12px] text-gray-400 mt-3 px-1 leading-relaxed">
          {master?.mode === 'native' ? t.infoNative : t.infoWeb}
        </p>
        {isDenied && (
          <p className="text-[12px] text-amber-500 mt-1.5 px-1 leading-relaxed">
            {master?.mode === 'native' ? t.deniedHintNative : t.deniedHint}
          </p>
        )}

        {/* 받을 알림 종류 */}
        {userId && (
          <>
            <h2 className="text-[13px] font-semibold text-gray-500 mt-7 mb-2 px-1">{t.typesTitle}</h2>
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#F0F0F0]">
              {prefRows.map(({ key, icon: Icon, color, bg, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePrefToggle(key)}
                  disabled={!prefsReady}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-transparent border-none cursor-pointer
                             hover:bg-gray-50 active:bg-gray-100 transition-colors text-left disabled:cursor-default"
                >
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <Icon size={18} strokeWidth={1.8} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#1A1A1A]">{label}</div>
                    <div className="text-[12px] text-gray-400 mt-0.5 break-keep">{desc}</div>
                  </div>
                  <ToggleSwitch on={prefs[key]} disabled={!prefsReady} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* 관리자 전용 푸시 진단 (일반 사용자에게는 렌더링되지 않음) */}
        {userId && <NativePushDiagnostics userId={userId} />}
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed top-[66px] left-1/2 -translate-x-1/2 z-[400] max-w-[90vw] text-center
          bg-[#2F2F2F] text-white text-[13px] font-medium px-4 py-2 rounded-2xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <BottomTabBar lang={lang} />
    </div>
  );
}
