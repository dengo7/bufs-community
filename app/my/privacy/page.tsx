'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getLang } from '../../lib/lang';

const CONTENT = {
  ko: {
    title: '개인정보처리방침',
    intro: `Dengo(이하 "운영자")는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」을 준수합니다.`,
    sections: [
      {
        h: '제1조 (수집하는 개인정보 항목)',
        b: `운영자는 회원가입 시 다음 정보를 수집합니다.
- 필수: 이메일 주소, 닉네임`,
      },
      {
        h: '제2조 (개인정보 수집 목적)',
        b: `1. 회원 식별 및 서비스 제공
2. 커뮤니티 활동 관리 (게시글, 댓글)
3. 서비스 운영 및 개선
4. 불법·부적절한 이용 방지`,
      },
      {
        h: '제3조 (개인정보 보유 및 이용 기간)',
        b: `1. 회원 탈퇴 시까지 보유합니다.
2. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.
   - 계약 또는 청약철회 기록: 5년 (전자상거래법)
   - 접속 로그: 3개월 (통신비밀보호법)`,
      },
      {
        h: '제4조 (개인정보 제3자 제공)',
        b: `운영자는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 다음의 경우는 예외로 합니다.
1. 이용자가 사전에 동의한 경우
2. 법령에 의해 요구되는 경우`,
      },
      {
        h: '제5조 (개인정보 처리 위탁)',
        b: `운영자는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.
- Supabase Inc.: 데이터베이스 및 인증 서비스
- Vercel Inc.: 서비스 호스팅
- Resend Inc.: 이메일 발송 서비스`,
      },
      {
        h: '제6조 (이용자의 권리)',
        b: `이용자는 언제든지 다음 권리를 행사할 수 있습니다.
1. 개인정보 열람 요청
2. 개인정보 수정 요청
3. 개인정보 삭제 요청 (회원 탈퇴)
4. 개인정보 처리 정지 요청
권리 행사는 dengo12345@naver.com으로 이메일 문의 바랍니다.`,
      },
      {
        h: '제7조 (개인정보 보호책임자)',
        b: `- 성명: Dengo
- 이메일: dengo12345@naver.com
- 주소: 부산광역시 금정구 금샘로 485번길 65 부산외국어대학교`,
      },
      {
        h: '제8조 (개인정보 파기)',
        b: `이용자 탈퇴 시 개인정보는 즉시 파기됩니다. 단, 관련 법령에 따라 보존이 필요한 정보는 별도 보관 후 파기합니다.`,
      },
      {
        h: '제9조 (쿠키 사용)',
        b: `서비스는 로그인 상태 유지를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키를 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.`,
      },
      {
        h: '제10조 (개인정보처리방침 변경)',
        b: `이 방침은 2026년 6월 23일부터 시행됩니다. 내용이 변경될 경우 서비스 내 공지를 통해 안내합니다.`,
      },
    ],
    footer: `시행일: 2026년 6월 23일
운영자: Dengo
문의: dengo12345@naver.com`,
  },
  en: {
    title: 'Privacy Policy',
    intro: `Dengo (the "Operator") values users' personal information and complies with applicable privacy laws.`,
    sections: [
      {
        h: 'Article 1 (Information Collected)',
        b: `The Operator collects the following information upon registration:
- Required: Email address, nickname`,
      },
      {
        h: 'Article 2 (Purpose of Collection)',
        b: `1. Member identification and service provision
2. Community activity management (posts, comments)
3. Service operation and improvement
4. Prevention of illegal or inappropriate use`,
      },
      {
        h: 'Article 3 (Retention Period)',
        b: `1. Personal information is retained until account deletion.
2. Certain records may be retained as required by law:
   - Transaction records: 5 years (E-Commerce Act)
   - Access logs: 3 months (Protection of Communications Secrets Act)`,
      },
      {
        h: 'Article 4 (Third-Party Sharing)',
        b: `The Operator does not share personal information with third parties except:
1. When the user has given prior consent
2. When required by law`,
      },
      {
        h: 'Article 5 (Processing Delegation)',
        b: `The Operator delegates processing to the following for service provision:
- Supabase Inc.: Database and authentication
- Vercel Inc.: Service hosting
- Resend Inc.: Email delivery`,
      },
      {
        h: 'Article 6 (User Rights)',
        b: `Users may exercise the following rights at any time:
1. Request access to personal information
2. Request correction of personal information
3. Request deletion (account withdrawal)
4. Request suspension of processing
Please contact dengo12345@naver.com to exercise these rights.`,
      },
      {
        h: 'Article 7 (Privacy Officer)',
        b: `- Name: Dengo
- Email: dengo12345@naver.com
- Address: 65 Geumssam-ro, Geumjeong-gu, Busan, Republic of Korea (BUFS)`,
      },
      {
        h: 'Article 8 (Disposal)',
        b: `Personal information is immediately destroyed upon account deletion. Information required by law is stored separately before disposal.`,
      },
      {
        h: 'Article 9 (Cookies)',
        b: `The Service uses cookies to maintain login sessions. Users may disable cookies in browser settings, though some features may be limited.`,
      },
      {
        h: 'Article 10 (Policy Changes)',
        b: `This policy is effective from June 23, 2026. Changes will be announced within the Service.`,
      },
    ],
    footer: `Effective Date: June 23, 2026
Operator: Dengo
Contact: dengo12345@naver.com`,
  },
} as const;

export default function PrivacyPage() {
  const router = useRouter();
  const [lang] = useState(getLang);
  const c = lang === 'en' ? CONTENT.en : CONTENT.ko;

  return (
    <div className="min-h-screen bg-gray-50 text-[#1A1A1A]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-4 gap-2 pt-14">
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
