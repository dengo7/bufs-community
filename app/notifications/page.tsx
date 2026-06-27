'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient } from '../lib/supabase/client';
import BottomTabBar from '../components/BottomTabBar';
import { formatTimeAgo } from '../lib/utils';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  type NotificationRow,
} from '../lib/notifications';

type Lang = 'ko' | 'en' | 'zh' | 'ja';

const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const T = {
  ko: {
    title: '알림',
    markAllRead: '전체 읽음',
    empty: '알림이 없어요',
    loginRequired: '로그인이 필요해요',
    comment: '회원님의 글에 댓글을 남겼어요',
    reply: '회원님의 댓글에 답글을 남겼어요',
    like: '회원님의 글을 좋아합니다',
  },
  en: {
    title: 'Notifications',
    markAllRead: 'Mark all read',
    empty: 'No notifications',
    loginRequired: 'Please sign in',
    comment: 'commented on your post',
    reply: 'replied to your comment',
    like: 'liked your post',
  },
  zh: {
    title: '通知',
    markAllRead: '全部已读',
    empty: '暂无通知',
    loginRequired: '请先登录',
    comment: '评论了你的帖子',
    reply: '回复了你的评论',
    like: '赞了你的帖子',
  },
  ja: {
    title: '通知',
    markAllRead: '全て既読',
    empty: '通知はありません',
    loginRequired: 'ログインしてください',
    comment: 'あなたの投稿にコメントしました',
    reply: 'あなたのコメントに返信しました',
    like: 'あなたの投稿にいいねしました',
  },
} as const;

export default function NotificationsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ko');
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const t = T[lang];

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        fetchNotifications(userId),
        fetchUnreadCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      const u = data.user ?? null;
      setUser(u);
      if (u) load(u.id);
      else setLoading(false);
    });
  }, [load]);

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    await load(user.id);
  };

  const handleRowClick = async (notif: NotificationRow) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
    }
    router.push(`/post/${notif.post_id}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center min-h-[54px] px-4 gap-3">
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0 no-underline">
            <img src="/the-well-mark.png" alt="The Well" className="h-9 w-auto object-contain shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] text-[#1D4ED8] leading-tight"><span className="font-normal">The</span> <span className="font-bold">Well</span></span>
              <span className="text-[11px] text-gray-500 truncate leading-tight">외국인 유학생을 위한 커뮤니티</span>
            </div>
          </Link>
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-[8px] py-[6px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {l === 'ko' ? 'KR' : l === 'en' ? 'EN' : l === 'zh' ? '中' : '日'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-24">

        <div className="flex items-center justify-between mb-3 h-9">
          <h1 className="text-[18px] font-bold m-0">{t.title}</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-[12px] text-gray-500 border border-gray-200 rounded-full px-3 py-1 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {t.markAllRead}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-gray-300 text-sm">···</div>
        ) : !user ? (
          <div className="text-center py-16 text-gray-400 text-sm">{t.loginRequired}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">{t.empty}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleRowClick(notif)}
                className={`w-full text-left rounded-2xl border border-gray-100 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100
                  ${!notif.is_read ? 'bg-gray-50' : 'bg-white'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-[7px] shrink-0">
                    {!notif.is_read
                      ? <span className="block w-2 h-2 rounded-full bg-[#F6C21A]" />
                      : <span className="block w-2 h-2" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="border border-gray-200 rounded-full flex items-center gap-1 px-1.5 py-px shrink-0">
                        <span className="text-[11px] font-medium text-gray-900 leading-none">
                          {notif.actor?.nickname ?? '—'}
                        </span>
                      </span>
                      <span className="text-[13px] text-gray-700">{t[notif.type]}</span>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {formatTimeAgo(notif.created_at, lang)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

      </div>

      <BottomTabBar lang={lang} user={user} />
    </div>
  );
}
