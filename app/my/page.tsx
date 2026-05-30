'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell, SquarePen, Bookmark, Compass, Headphones,
  FileText, ShieldCheck, LogOut, ChevronRight,
  Pencil, Heart, User,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import BottomTabBar from '../components/BottomTabBar';
import {
  getPushPermissionState,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from '../lib/push';

// ── 서브 컴포넌트 ──────────────────────────────────────────────

function IconBox({ icon: Icon, danger }: { icon: LucideIcon; danger?: boolean }) {
  return (
    <div
      className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
      style={{ backgroundColor: danger ? '#FEE9E9' : '#FFF4D6' }}
    >
      <Icon size={18} strokeWidth={1.8} color={danger ? '#E05050' : '#B8900E'} />
    </div>
  );
}

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

function MenuRow({
  icon,
  title,
  desc,
  onClick,
  right,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-transparent border-none cursor-pointer
                 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      <IconBox icon={icon} danger={danger} />
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-semibold leading-snug ${danger ? 'text-red-500' : 'text-[#1A1A1A]'}`}>
          {title}
        </p>
        {desc && (
          <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
        )}
      </div>
      {right !== undefined
        ? right
        : <ChevronRight size={16} strokeWidth={2} className="text-gray-300 shrink-0" />}
    </button>
  );
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-[12px] font-semibold text-gray-400 px-1 mb-2 tracking-wide">{label}</p>
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────
export default function MyPage() {
  const [user, setUser]             = useState<any>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [profile, setProfile]       = useState<{ nickname: string; avatar_url: string | null } | null>(null);
  const [totalLikes, setTotalLikes] = useState(0);
  const [toast, setToast]           = useState<string | null>(null);

  // 푸시 알림 상태
  const [pushPerm, setPushPerm]         = useState<PushPermissionState>('default');
  const [pushOn, setPushOn]             = useState(false);
  const [pushReady, setPushReady]       = useState(false);
  const [pushBusy, setPushBusy]         = useState(false);

  // ── 토스트 ────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };
  const comingSoon = () => showToast('준비 중입니다');

  // ── 인증 + 프로필 + 받은 좋아요 ──────────────────────────
  useEffect(() => {
    const client = getSupabaseClient();

    const load = async (u: any) => {
      setUser(u);
      setAuthLoaded(true);
      if (!u) return;

      const [{ data: prof }, { data: posts }] = await Promise.all([
        client.from('profiles').select('nickname, avatar_url').eq('id', u.id).single(),
        client.from('posts').select('like_count').eq('author_id', u.id).eq('is_deleted', false),
      ]);

      if (prof) setProfile(prof);
      setTotalLikes(
        ((posts ?? []) as { like_count: number }[]).reduce((s, p) => s + (p.like_count ?? 0), 0)
      );
    };

    client.auth.getUser().then(({ data }: { data: { user: any } }) => load(data.user ?? null));

    const { data: { subscription } } = client.auth.onAuthStateChange((_e: any, session: any) => {
      load(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
    if (pushPerm === 'denied')      { showToast('브라우저 설정에서 알림 허용이 필요해요'); return; }
    if (pushPerm === 'unsupported') { showToast('이 브라우저는 푸시 알림을 지원하지 않아요'); return; }
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

  const handleLogout = async () => {
    await getSupabaseClient().auth.signOut();
    setUser(null);
    setProfile(null);
    setTotalLikes(0);
  };

  const nickname = profile?.nickname
    || user?.user_metadata?.nickname
    || user?.email?.split('@')[0]
    || '회원';

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center h-[54px] px-4 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <div className="bg-[#2F2F2F] rounded-[5px] px-[7px] py-[5px] grid grid-cols-2 gap-px shrink-0">
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[10px] font-extrabold text-white leading-none">F</span>
              <span className="text-[10px] font-extrabold text-white leading-none">S</span>
            </div>
            <span className="text-[13px] font-bold text-[#1A1A1A] truncate">BUFS COMMUNITY</span>
          </Link>
          <Link
            href="/notifications"
            className="text-gray-700 no-underline flex items-center shrink-0"
            aria-label="알림"
          >
            <Bell size={20} strokeWidth={1.8} />
          </Link>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-6 pb-28">

        {/* ── 비로그인 상태 ── */}
        {authLoaded && !user && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <User size={36} strokeWidth={1.5} className="text-gray-300" />
            </div>
            <p className="text-[15px] font-semibold text-[#1A1A1A] mb-1">로그인이 필요합니다</p>
            <p className="text-[13px] text-gray-400 mb-6">로그인하고 더 많은 기능을 이용해요</p>
            <Link
              href="/auth"
              className="px-6 py-2.5 bg-[#F6C21A] text-[#2F2F2F] rounded-full font-bold text-sm no-underline hover:opacity-90 transition-opacity"
            >
              로그인 / 회원가입
            </Link>
          </div>
        )}

        {/* ── 로그인 상태 ── */}
        {user && (
          <>
            {/* 프로필 */}
            <div className="flex flex-col items-center mb-8">
              {/* 아바타 */}
              <div className="w-[76px] h-[76px] rounded-full bg-gray-200 flex items-center justify-center mb-3 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={34} strokeWidth={1.4} className="text-gray-400" />
                )}
              </div>

              {/* 닉네임 + 수정 */}
              <button
                type="button"
                onClick={comingSoon}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 mb-2.5"
              >
                <span className="text-[18px] font-bold text-[#1A1A1A]">{nickname}</span>
                <Pencil size={14} strokeWidth={2} className="text-gray-400" />
              </button>

              {/* 받은 좋아요 pill */}
              <span className="inline-flex items-center gap-1.5 bg-[#FFF4D6] text-[#B8900E] text-[12px] font-semibold px-3 py-1 rounded-full">
                <Heart size={11} strokeWidth={0} className="fill-[#F6C21A]" />
                받은 좋아요 {totalLikes}
              </span>
            </div>

            {/* ── 환경 설정 ── */}
            <SectionCard label="환경 설정">
              <MenuRow
                icon={Bell}
                title="알림 설정"
                desc="관심 있는 소식 기준으로 알림을 설정해요"
                onClick={handlePushToggle}
                right={
                  !pushReady || pushPerm === 'unsupported'
                    ? <span className="text-[11px] text-gray-300 shrink-0">미지원</span>
                    : <ToggleSwitch
                        on={pushOn}
                        disabled={pushPerm === 'denied' || pushBusy}
                      />
                }
              />
            </SectionCard>

            {/* ── 활동 ── */}
            <SectionCard label="활동">
              <MenuRow icon={SquarePen}  title="내가 쓴 글"  desc="내가 작성한 글을 관리해요"           onClick={comingSoon} />
              <MenuRow icon={Bookmark}   title="저장한 글"   desc="북마크한 게시글을 관리해요"           onClick={comingSoon} />
              <MenuRow icon={Compass}    title="앱 사용법"   desc="주요 기능을 다시 확인할 수 있어요"    onClick={comingSoon} />
              <MenuRow icon={Headphones} title="문의하기"    desc="운영팀에 의견을 남겨요"               onClick={comingSoon} />
            </SectionCard>

            {/* ── 계정 ── */}
            <SectionCard label="계정">
              <MenuRow icon={FileText}    title="이용약관"          onClick={comingSoon} />
              <MenuRow icon={ShieldCheck} title="개인정보처리방침"   onClick={comingSoon} />
              <MenuRow icon={LogOut}      title="로그아웃"           onClick={handleLogout} danger />
            </SectionCard>
          </>
        )}
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div className="fixed top-[66px] left-1/2 -translate-x-1/2 z-[400] whitespace-nowrap
          bg-[#2F2F2F] text-white text-[13px] font-medium px-4 py-2 rounded-2xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <BottomTabBar user={user} />
    </div>
  );
}
