'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserX } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { unblockUser } from '../../lib/blocks';
import Avatar from '../../components/Avatar';
import BottomTabBar from '../../components/BottomTabBar';
import { getLang, setLang as persistLang, type UILang } from '../../lib/lang';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: {
    blockedUsers:   '차단 목록',
    noBlockedUsers: '차단한 사용자가 없습니다',
    unblock:        '차단 해제',
    unblockFailed:  '차단 해제에 실패했어요',
    loginRequired:  '로그인이 필요합니다',
    login:          '로그인 / 회원가입',
  },
  en: {
    blockedUsers:   'Blocked Users',
    noBlockedUsers: 'No blocked users',
    unblock:        'Unblock',
    unblockFailed:  'Failed to unblock',
    loginRequired:  'Login required',
    login:          'Login / Sign Up',
  },
  zh: {
    blockedUsers:   '屏蔽列表',
    noBlockedUsers: '没有被屏蔽的用户',
    unblock:        '解除屏蔽',
    unblockFailed:  '解除屏蔽失败',
    loginRequired:  '需要登录',
    login:          '登录 / 注册',
  },
  ja: {
    blockedUsers:   'ブロックリスト',
    noBlockedUsers: 'ブロックしたユーザーはいません',
    unblock:        'ブロック解除',
    unblockFailed:  'ブロック解除に失敗しました',
    loginRequired:  'ログインが必要です',
    login:          'ログイン / 会員登録',
  },
} as const;

type BlockedProfile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
};

export default function BlocksPage() {
  const router = useRouter();
  const [lang, setLang]         = useState<UILang>(getLang);
  const [user, setUser]         = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [blocked, setBlocked]   = useState<BlockedProfile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState<string | null>(null);
  const [toast, setToast]       = useState<string | null>(null);

  const t = T[lang];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const client = getSupabaseClient();
    client.auth.getUser().then(async ({ data }: { data: { user: any } }) => {
      const u = data.user ?? null;
      setUser(u);
      setAuthLoaded(true);

      if (!u) { setLoading(false); return; }

      // 1) 내가 차단한 사용자 id 조회
      const { data: blocks } = await client
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', u.id);

      const ids = (blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id);
      if (ids.length === 0) { setBlocked([]); setLoading(false); return; }

      // 2) 해당 사용자들의 프로필(닉네임·아바타) 조회
      const { data: profs } = await client
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', ids);

      setBlocked((profs ?? []) as BlockedProfile[]);
      setLoading(false);
    });
  }, []);

  const handleUnblock = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await unblockUser(id);
      // 차단 해제 성공 → 목록에서 즉시 제거
      setBlocked(prev => prev.filter(p => p.id !== id));
    } catch {
      showToast(t.unblockFailed);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2 pt-14">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로가기"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="flex-1 text-[15px] font-bold">{t.blockedUsers}</span>
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
      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-28">

        {/* 비로그인 */}
        {authLoaded && !user && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-[15px] font-semibold text-[#1A1A1A] mb-2">{t.loginRequired}</p>
            <Link
              href="/auth"
              className="mt-2 px-6 py-2.5 bg-[#F6C21A] text-[#2F2F2F] rounded-full font-bold text-sm no-underline"
            >
              {t.login}
            </Link>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && user && (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
                <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-16 h-8 bg-gray-100 rounded-full animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && user && blocked.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <UserX size={28} strokeWidth={1.5} className="text-gray-300" />
            </div>
            <p className="text-[15px] text-gray-400">{t.noBlockedUsers}</p>
          </div>
        )}

        {/* 차단 목록 */}
        {!loading && user && blocked.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
            {blocked.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar nickname={p.nickname} avatarUrl={p.avatar_url} size="lg" />
                <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#1A1A1A] truncate">
                  {p.nickname}
                </span>
                <button
                  type="button"
                  onClick={() => handleUnblock(p.id)}
                  disabled={busyId === p.id}
                  className="shrink-0 px-3.5 py-2 text-[13px] font-semibold text-gray-600 bg-gray-100 rounded-full
                             border-none cursor-pointer hover:bg-gray-200 active:scale-[0.97] transition-all
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t.unblock}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed top-[66px] left-1/2 -translate-x-1/2 z-[400] whitespace-nowrap
          bg-red-500 text-white text-[13px] font-medium px-4 py-2 rounded-2xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <BottomTabBar user={user} />
    </div>
  );
}
