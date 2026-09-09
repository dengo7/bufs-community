'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useLang } from '../lib/lang';

// Google Play 심사용 "웹에서 접근 가능한 계정 삭제 경로" 페이지.
// 비로그인 접근이 가능해야 하므로 인증 게이트·로그인 전제 UI를 두지 않는다.
const CONTENT = {
  ko: {
    title: '계정 삭제 안내',
    intro: `The Well 계정과 관련 데이터를 삭제하는 방법을 안내합니다. 계정 삭제는 앱과 웹 어디서든 직접 진행할 수 있습니다.`,
    sections: [
      {
        h: '1. 앱/웹에서 직접 삭제하기',
        b: `1) The Well 앱 또는 웹사이트(bufs-community.vercel.app)에 로그인합니다.
2) 하단의 '내정보' 탭으로 이동합니다.
3) '계정 삭제'를 누르고 확인하면 즉시 삭제됩니다.`,
      },
      {
        h: '2. 로그인할 수 없는 경우',
        b: `비밀번호 분실 등으로 로그인할 수 없다면 아래 이메일로 삭제를 요청해주세요.

요청 이메일: dengo12345@naver.com
- 가입할 때 사용한 이메일 주소를 본문에 명시해주세요.
- 가입 이메일로 본인 확인을 거친 뒤 삭제를 처리해드립니다.`,
      },
      {
        h: '3. 삭제되는 데이터와 시점',
        b: `계정 삭제 시 다음 데이터가 즉시 함께 삭제됩니다.
- 프로필(이메일, 닉네임)
- 작성한 게시글과 댓글
- 좋아요, 저장(북마크) 등 활동 기록

삭제 후 별도로 보존하는 데이터는 없으며, 삭제된 데이터는 복구할 수 없습니다.`,
      },
    ],
    footer: `운영자: Dengo
문의: dengo12345@naver.com`,
  },
  en: {
    title: 'Account Deletion',
    intro: `This page explains how to delete your The Well account and related data. You can delete your account directly from the app or the web.`,
    sections: [
      {
        h: '1. Delete Directly in the App or on the Web',
        b: `1) Sign in to the The Well app or website (bufs-community.vercel.app).
2) Go to the 'My' tab at the bottom.
3) Tap 'Delete Account' and confirm. Deletion takes effect immediately.`,
      },
      {
        h: '2. If You Cannot Sign In',
        b: `If you cannot sign in (e.g., forgotten password), request deletion by email.

Request email: dengo12345@naver.com
- Please include the email address you signed up with.
- We will verify your identity via the registered email and then process the deletion.`,
      },
      {
        h: '3. What Is Deleted and When',
        b: `When your account is deleted, the following data is deleted immediately:
- Profile (email, nickname)
- Posts and comments you wrote
- Activity records such as likes and bookmarks

No data is retained after deletion, and deleted data cannot be recovered.`,
      },
    ],
    footer: `Operator: Dengo
Contact: dengo12345@naver.com`,
  },
  zh: {
    title: '账号删除指南',
    intro: `本页面介绍如何删除您的 The Well 账号及相关数据。您可以在应用或网页中直接删除账号。`,
    sections: [
      {
        h: '1. 在应用/网页中直接删除',
        b: `1) 登录 The Well 应用或网站（bufs-community.vercel.app）。
2) 进入底部的"我的"标签页。
3) 点击"删除账号"并确认，即会立即删除。`,
      },
      {
        h: '2. 无法登录时',
        b: `如果因忘记密码等原因无法登录，请通过以下邮箱申请删除。

申请邮箱：dengo12345@naver.com
- 请在邮件中注明注册时使用的邮箱地址。
- 我们将通过注册邮箱确认本人身份后处理删除。`,
      },
      {
        h: '3. 删除的数据与时间',
        b: `删除账号时，以下数据将立即一并删除：
- 个人资料（邮箱、昵称）
- 您发布的帖子和评论
- 点赞、收藏等活动记录

删除后不会另行保留任何数据，已删除的数据无法恢复。`,
      },
    ],
    footer: `运营者：Dengo
联系方式：dengo12345@naver.com`,
  },
  ja: {
    title: 'アカウント削除のご案内',
    intro: `The Well のアカウントと関連データを削除する方法をご案内します。アカウント削除はアプリ・ウェブのどちらからでも直接行えます。`,
    sections: [
      {
        h: '1. アプリ/ウェブから直接削除する',
        b: `1) The Well アプリまたはウェブサイト（bufs-community.vercel.app）にログインします。
2) 下部の「MY」タブに移動します。
3) 「アカウント削除」を押して確認すると、即時に削除されます。`,
      },
      {
        h: '2. ログインできない場合',
        b: `パスワードを忘れた場合など、ログインできないときは以下のメールアドレスに削除をご依頼ください。

依頼先メール：dengo12345@naver.com
- 登録時に使用したメールアドレスを本文に明記してください。
- 登録メールでご本人確認を行ったうえで削除を処理いたします。`,
      },
      {
        h: '3. 削除されるデータと時期',
        b: `アカウント削除時、以下のデータが即時に一括削除されます。
- プロフィール（メールアドレス、ニックネーム）
- 投稿した記事とコメント
- いいね、保存（ブックマーク）などの活動記録

削除後に別途保存されるデータはなく、削除されたデータは復元できません。`,
      },
    ],
    footer: `運営者：Dengo
お問い合わせ：dengo12345@naver.com`,
  },
} as const;

export default function AccountDeletionPage() {
  const router = useRouter();
  const lang = useLang();
  const c = CONTENT[lang];

  return (
    <div className="min-h-screen bg-gray-50 text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-4 gap-2">
          <button
            type="button"
            // Play Console 링크로 직접 진입하면 히스토리가 없으므로 홈으로 폴백
            onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
            aria-label="뒤로가기"
            className="p-1 -ml-1 bg-transparent border-none cursor-pointer text-gray-700 flex items-center"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          <span className="text-[15px] font-bold">{c.title}</span>
        </div>
      </header>

      {/* ── 본문 ── */}
      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-16">
        <p className="text-[13px] text-gray-600 leading-relaxed">{c.intro}</p>
        {c.sections.map((s, i) => (
          <div key={i} className="border-b border-gray-100 pb-4">
            <h2 className="text-[14px] font-semibold text-gray-900 mt-6 mb-2">{s.h}</h2>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{s.b}</p>
          </div>
        ))}
        <div className="mt-8 pt-4 border-t border-gray-200 text-[12px] text-gray-400 whitespace-pre-line">
          {c.footer}
        </div>
      </div>
    </div>
  );
}
