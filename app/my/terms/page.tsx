'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getLang } from '../../lib/lang';

const CONTENT = {
  ko: {
    title: '이용약관',
    sections: [
      {
        h: '제1조 (목적)',
        b: `이 약관은 Dengo(이하 "운영자")가 제공하는 The Well(이하 "서비스")의 이용 조건 및 절차, 운영자와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.`,
      },
      {
        h: '제2조 (정의)',
        b: `1. "서비스"란 운영자가 제공하는 부산외국어대학교 외국인 유학생 커뮤니티 웹 및 앱 서비스를 의미합니다.
2. "이용자"란 이 약관에 동의하고 서비스를 이용하는 자를 말합니다.
3. "게시물"이란 이용자가 서비스에 게재한 글, 사진, 댓글 등 모든 콘텐츠를 의미합니다.`,
      },
      {
        h: '제3조 (약관의 효력 및 변경)',
        b: `1. 이 약관은 서비스 내 공지함으로써 효력이 발생합니다.
2. 운영자는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일 이후부터 효력이 발생합니다.`,
      },
      {
        h: '제4조 (서비스 이용)',
        b: `1. 서비스는 만 14세 이상의 부산외국어대학교 재학 중인 외국인 유학생을 대상으로 합니다.
2. 이용자는 회원가입 시 정확한 정보를 제공해야 합니다.
3. 이용자는 타인의 개인정보를 무단으로 수집·이용해서는 안 됩니다.`,
      },
      {
        h: '제5조 (이용자의 의무)',
        b: `이용자는 다음 행위를 해서는 안 됩니다.
1. 타인을 사칭하거나 허위 정보를 게재하는 행위
2. 욕설, 비방, 혐오 표현을 포함한 게시물 작성
3. 개인정보 무단 수집 및 유포
4. 저작권 등 지적재산권을 침해하는 행위
5. 서비스 운영을 방해하는 행위
6. 스팸, 광고, 불법 콘텐츠 게재`,
      },
      {
        h: '제6조 (게시물 관리)',
        b: `1. 이용자가 작성한 게시물의 책임은 해당 이용자에게 있습니다.
2. 운영자는 이 약관에 위반되는 게시물을 사전 통보 없이 삭제할 수 있습니다.
3. 이용자는 자신의 게시물을 언제든지 삭제할 수 있습니다.`,
      },
      {
        h: '제7조 (서비스 중단)',
        b: `운영자는 시스템 점검, 서버 장애, 천재지변 등의 사유로 서비스 제공을 일시적으로 중단할 수 있습니다.`,
      },
      {
        h: '제8조 (책임의 한계)',
        b: `1. 운영자는 이용자 간의 분쟁에 대해 책임을 지지 않습니다.
2. 운영자는 이용자가 게재한 게시물의 내용에 대해 법적 책임을 지지 않습니다.
3. 운영자는 서비스 이용으로 발생한 손해에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.`,
      },
      {
        h: '제9조 (계정 정지 및 탈퇴)',
        b: `1. 운영자는 이 약관을 위반한 이용자의 계정을 정지하거나 삭제할 수 있습니다.
2. 이용자는 언제든지 계정 삭제를 요청할 수 있습니다.`,
      },
      {
        h: '제10조 (준거법 및 관할)',
        b: `이 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 부산지방법원을 관할법원으로 합니다.`,
      },
    ],
    footer: `시행일: 2026년 6월 23일
운영자: Dengo
문의: dengo12345@naver.com`,
  },
  en: {
    title: 'Terms of Service',
    sections: [
      {
        h: 'Article 1 (Purpose)',
        b: `These Terms of Service govern the conditions, procedures, and responsibilities for using The Well (the "Service") provided by Dengo (the "Operator").`,
      },
      {
        h: 'Article 2 (Definitions)',
        b: `1. "Service" refers to The Well, a community web and app service for international students at Busan University of Foreign Studies (BUFS).
2. "User" refers to any person who agrees to these Terms and uses the Service.
3. "Post" refers to all content including text, photos, and comments submitted by Users.`,
      },
      {
        h: 'Article 3 (Effect and Amendment)',
        b: `1. These Terms take effect upon being posted within the Service.
2. The Operator may amend these Terms as necessary. Amended Terms take effect 7 days after notice.`,
      },
      {
        h: 'Article 4 (Eligibility)',
        b: `1. The Service is intended for international students aged 14 or older enrolled at BUFS.
2. Users must provide accurate information upon registration.
3. Users must not collect or use others' personal information without consent.`,
      },
      {
        h: 'Article 5 (User Obligations)',
        b: `Users must not engage in the following:
1. Impersonating others or posting false information
2. Writing posts containing profanity, defamation, or hate speech
3. Collecting or distributing personal information without consent
4. Infringing on intellectual property rights
5. Disrupting service operations
6. Posting spam, advertisements, or illegal content`,
      },
      {
        h: 'Article 6 (Content Management)',
        b: `1. Users are responsible for their own posts.
2. The Operator may delete posts that violate these Terms without prior notice.
3. Users may delete their own posts at any time.`,
      },
      {
        h: 'Article 7 (Service Interruption)',
        b: `The Operator may temporarily suspend the Service due to system maintenance, server failures, or force majeure events.`,
      },
      {
        h: 'Article 8 (Limitation of Liability)',
        b: `1. The Operator is not responsible for disputes between Users.
2. The Operator bears no legal responsibility for content posted by Users.
3. The Operator is not liable for damages arising from use of the Service unless caused by intentional misconduct or gross negligence.`,
      },
      {
        h: 'Article 9 (Account Suspension and Withdrawal)',
        b: `1. The Operator may suspend or delete accounts of Users who violate these Terms.
2. Users may request account deletion at any time.`,
      },
      {
        h: 'Article 10 (Governing Law)',
        b: `These Terms shall be governed by the laws of the Republic of Korea. Any disputes shall be submitted to the jurisdiction of Busan District Court.`,
      },
    ],
    footer: `Effective Date: June 23, 2026
Operator: Dengo
Contact: dengo12345@naver.com`,
  },
} as const;

export default function TermsPage() {
  const router = useRouter();
  const [lang] = useState(getLang);
  const c = lang === 'en' ? CONTENT.en : CONTENT.ko;

  return (
    <div className="min-h-screen bg-gray-50 text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-4 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
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
