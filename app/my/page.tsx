'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, SquarePen, Bookmark, Compass,
  FileText, ShieldCheck, LogOut, ChevronRight,
  Heart, User, UserX,
  type LucideIcon,
} from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import { getLang, setLang as persistLang, type UILang } from '../lib/lang';
import BottomTabBar from '../components/BottomTabBar';
import {
  getPushPermissionState,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from '../lib/push';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: {
    subtitle: '외국인 유학생을 위한 커뮤니티',
    loginRequired: '로그인이 필요합니다',
    login: '로그인',
    signup: '회원가입',
    likes: (n: number) => `받은 좋아요 ${n}`,
    sectionSettings: '환경 설정',
    pushNotification: '알림 설정',
    pushDesc: '관심 있는 소식 기준으로 알림을 설정해요',
    sectionActivity: '활동',
    myPosts: '내가 쓴 글',
    myPostsDesc: '내가 작성한 글을 관리해요',
    savedPosts: '저장한 글',
    savedPostsDesc: '북마크한 게시글을 관리해요',
    guide: '앱 사용법',
    guideDesc: '주요 기능을 다시 확인할 수 있어요',
    sectionAccount: '계정',
    blockedUsers: '차단 목록',
    terms: '이용약관',
    privacy: '개인정보처리방침',
    logout: '로그아웃',
    deleteAccount: '회원 탈퇴',
    deleteConfirm: '정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다',
    deleteError: '탈퇴 처리 중 오류가 발생했습니다',
  },
  en: {
    subtitle: 'Community for International Students',
    loginRequired: 'Login required',
    login: 'Login',
    signup: 'Sign Up',
    likes: (n: number) => `${n} likes received`,
    sectionSettings: 'Settings',
    pushNotification: 'Notifications',
    pushDesc: 'Set alerts for topics you care about',
    sectionActivity: 'Activity',
    myPosts: 'My Posts',
    myPostsDesc: 'Manage your posts',
    savedPosts: 'Saved Posts',
    savedPostsDesc: 'Manage your bookmarked posts',
    guide: 'How to Use',
    guideDesc: 'Review key features anytime',
    sectionAccount: 'Account',
    blockedUsers: 'Blocked Users',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    logout: 'Logout',
    deleteAccount: 'Delete Account',
    deleteConfirm: 'Are you sure you want to delete your account? All your data will be erased',
    deleteError: 'An error occurred while deleting your account',
  },
  zh: {
    subtitle: '面向外国留学生的社区',
    loginRequired: '需要登录',
    login: '登录',
    signup: '注册',
    likes: (n: number) => `获得 ${n} 个点赞`,
    sectionSettings: '环境设置',
    pushNotification: '通知设置',
    pushDesc: '根据感兴趣的内容设置通知',
    sectionActivity: '活动',
    myPosts: '我的帖子',
    myPostsDesc: '管理我发布的帖子',
    savedPosts: '已收藏',
    savedPostsDesc: '管理书签帖子',
    guide: '使用指南',
    guideDesc: '随时查看主要功能',
    sectionAccount: '账户',
    blockedUsers: '屏蔽列表',
    terms: '服务条款',
    privacy: '隐私政策',
    logout: '退出登录',
    deleteAccount: '注销账号',
    deleteConfirm: '确定要注销账号吗？所有数据将被删除',
    deleteError: '注销过程中发生错误',
  },
  ja: {
    subtitle: '外国人留学生のためのコミュニティ',
    loginRequired: 'ログインが必要です',
    login: 'ログイン',
    signup: '会員登録',
    likes: (n: number) => `もらったいいね ${n}`,
    sectionSettings: '環境設定',
    pushNotification: '通知設定',
    pushDesc: '関心のある情報の通知を設定します',
    sectionActivity: 'アクティビティ',
    myPosts: '自分の投稿',
    myPostsDesc: '自分の投稿を管理します',
    savedPosts: '保存した記事',
    savedPostsDesc: 'ブックマークした投稿を管理します',
    guide: 'アプリの使い方',
    guideDesc: '主な機能をいつでも確認できます',
    sectionAccount: 'アカウント',
    blockedUsers: 'ブロックリスト',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
    logout: 'ログアウト',
    deleteAccount: '退会する',
    deleteConfirm: '本当に退会しますか？すべてのデータが削除されます',
    deleteError: '退会処理中にエラーが発生しました',
  },
} as const;

// ── 서브 컴포넌트 ──────────────────────────────────────────────

function IconBox({ icon: Icon, danger }: { icon: LucideIcon; danger?: boolean }) {
  return (
    <div
      className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
      style={{ backgroundColor: danger ? '#FEE9E9' : '#EFF6FF' }}
    >
      <Icon size={18} strokeWidth={1.8} color={danger ? '#E05050' : '#1B7CC0'} />
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
  const [lang, setLang]             = useState<UILang>(getLang);
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
  const router = useRouter();

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

  const handleDeleteAccount = async () => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      // service role 키로 계정을 삭제하는 API 라우트 호출
      // (세션 쿠키로 본인 확인하므로 signOut 이전에 호출해야 함)
      const res = await fetch('/api/delete-account', { method: 'POST' });
      if (!res.ok) { showToast(t.deleteError); return; }
      await getSupabaseClient().auth.signOut();
      router.push('/auth');
    } catch {
      showToast(t.deleteError);
    }
  };

  const nickname = profile?.nickname
    || user?.user_metadata?.nickname
    || user?.email?.split('@')[0]
    || '회원';

  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-4 gap-3 pt-[env(safe-area-inset-top)]">
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <img src="/the-well-mark.png" alt="The Well" className="h-9 w-auto object-contain shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] text-[#1D4ED8] leading-tight"><span className="font-normal">The</span> <span className="font-bold">Well</span></span>
              <span className="text-[11px] text-gray-500 truncate leading-tight">{t.subtitle}</span>
            </div>
          </Link>
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
            <p className="text-[15px] font-semibold text-[#1A1A1A] mb-1">{t.loginRequired}</p>
            <p className="text-[13px] text-gray-400 mb-6">로그인하고 더 많은 기능을 이용해요</p>
            <Link
              href="/auth"
              className="px-6 py-2.5 bg-[#F6C21A] text-[#2F2F2F] rounded-full font-bold text-sm no-underline hover:opacity-90 transition-opacity"
            >
              {t.login} / {t.signup}
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

              {/* 닉네임 */}
              <span className="text-[18px] font-bold text-[#1A1A1A] mb-2.5">{nickname}</span>

              {/* 받은 좋아요 pill */}
              <span className="inline-flex items-center gap-1.5 bg-[#FFF4D6] text-[#B8900E] text-[12px] font-semibold px-3 py-1 rounded-full">
                <Heart size={11} strokeWidth={0} className="fill-[#F6C21A]" />
                {t.likes(totalLikes)}
              </span>
            </div>

            {/* ── 환경 설정 ── */}
            <SectionCard label={t.sectionSettings}>
              <MenuRow
                icon={Bell}
                title={t.pushNotification}
                desc={t.pushDesc}
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
            <SectionCard label={t.sectionActivity}>
              <MenuRow icon={SquarePen}  title={t.myPosts}    desc={t.myPostsDesc}    onClick={() => router.push('/my/posts')} />
              <MenuRow icon={Bookmark}   title={t.savedPosts} desc={t.savedPostsDesc} onClick={() => router.push('/my/saved')} />
              <MenuRow icon={Compass}    title={t.guide}      desc={t.guideDesc}      onClick={() => router.push('/my/guide')} />
            </SectionCard>

            {/* ── 계정 ── */}
            <SectionCard label={t.sectionAccount}>
              <MenuRow icon={UserX}       title={t.blockedUsers} onClick={() => router.push('/my/blocks')} />
              <MenuRow icon={FileText}    title={t.terms}   onClick={() => router.push('/my/terms')} />
              <MenuRow icon={ShieldCheck} title={t.privacy} onClick={() => router.push('/my/privacy')} />
              <MenuRow icon={LogOut}      title={t.logout}  onClick={handleLogout} danger />
            </SectionCard>

            {/* ── 회원 탈퇴 ── */}
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="text-[12px] text-red-400 hover:text-red-500 underline underline-offset-2 transition-colors"
              >
                {t.deleteAccount}
              </button>
            </div>
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
