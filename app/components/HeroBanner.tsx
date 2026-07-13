import Link from "next/link";

type Lang = 'ko' | 'en' | 'zh' | 'ja';

interface HeroBannerProps {
  lang?: Lang;
  user?: any;
}

const HERO_T = {
  ko: {
    badge: 'WELCOME TO THE WELL 👋',
    title1: '외국인 유학생의',
    title2: '즐겁고 안전한 대학생활,',
    title3: '이 함께해요.',
    desc: '비자, 집, 은행, 병원, 알바, 학교생활 정보를 함께 나눠요.',
    cta: '커뮤니티 둘러보기 →',
  },
  en: {
    badge: 'WELCOME TO THE WELL 👋',
    title1: 'Your campus life,',
    title2: 'safe and enjoyable —',
    title3: 'is here for you.',
    desc: 'Visa, housing, banking, hospital, part-time jobs and more.',
    cta: 'Explore Community →',
  },
  zh: {
    badge: 'WELCOME TO THE WELL 👋',
    title1: '外国留学生的',
    title2: '快乐安全的大学生活，',
    title3: '与您同行。',
    desc: '签证、住房、银行、医院、兼职等生活信息一网打尽。',
    cta: '浏览社区 →',
  },
  ja: {
    badge: 'WELCOME TO THE WELL 👋',
    title1: '外国人留学生の',
    title2: '楽しく安全なキャンパスライフを、',
    title3: 'がサポートします。',
    desc: 'ビザ、住居、銀行、病院、アルバイトなど生活情報をシェアしましょう。',
    cta: 'コミュニティを見る →',
  },
} as const;

export default function HeroBanner({ lang = 'ko' }: HeroBannerProps = {}) {
  const ht = HERO_T[lang];
  return (
    <section className="relative mt-1 min-h-[206px] overflow-hidden rounded-[20px] border border-[#D6E8FB] bg-gradient-to-br from-[#E7F2FF] via-[#ECF5FE] to-[#F0F7FE] sm:min-h-[248px] lg:min-h-[272px]">
      {/* 구름 장식 (일러스트 뒤쪽 하늘 — 은은하게 블러 처리해 스티커처럼 보이지 않게) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {/* 우측 상단 큰 구름 */}
        <svg className="absolute top-[15%] right-[9%] w-16 opacity-60 blur-[1.5px] sm:w-[84px]" viewBox="0 0 64 34" fill="#F4FAFF">
          <ellipse cx="19" cy="21" rx="15" ry="10" />
          <ellipse cx="34" cy="16" rx="17" ry="13" />
          <ellipse cx="47" cy="22" rx="12" ry="9" />
          <rect x="13" y="22" width="40" height="9" rx="4.5" />
        </svg>
        {/* 중앙 상단 중간 구름 */}
        <svg className="absolute top-[10%] right-[31%] w-12 opacity-50 blur-[1.5px] sm:w-[58px]" viewBox="0 0 64 34" fill="#F4FAFF">
          <ellipse cx="19" cy="21" rx="15" ry="10" />
          <ellipse cx="34" cy="16" rx="17" ry="13" />
          <ellipse cx="47" cy="22" rx="12" ry="9" />
          <rect x="13" y="22" width="40" height="9" rx="4.5" />
        </svg>
        {/* 좌측 중간 작은 구름 */}
        <svg className="absolute top-[36%] right-[41%] w-9 opacity-45 blur-[1px] sm:w-10" viewBox="0 0 64 34" fill="#EFF7FF">
          <ellipse cx="19" cy="21" rx="15" ry="10" />
          <ellipse cx="34" cy="16" rx="17" ry="13" />
          <ellipse cx="47" cy="22" rx="12" ry="9" />
          <rect x="13" y="22" width="40" height="9" rx="4.5" />
        </svg>
      </div>

      {/* 우측: 메인 우물·캠퍼스 일러스트 (투명 PNG → 카드 우하단까지 자연스럽게 bleed) */}
      <img
        src="/hero-illustration-transparent-soft.png"
        alt="The Well 캠퍼스 일러스트"
        aria-hidden
        className="pointer-events-none select-none absolute bottom-0 right-0 z-0 w-[48%] max-w-[400px] object-contain object-bottom"
      />

      {/* 좌측: 문구 + 버튼 (max-width + z-index로 보호) */}
      <div className="relative z-10 max-w-[60%] px-5 py-6 sm:max-w-[56%] sm:px-8 sm:py-9">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9E3FB] bg-white/85 px-3 py-1 text-[10px] font-bold tracking-wide text-[#1D4ED8] backdrop-blur-sm">
          {ht.badge}
        </span>

        <h2 className="mt-3.5 break-keep text-[17px] font-extrabold leading-[1.45] tracking-[-0.01em] text-[#0F172A] sm:text-[25px]">
          {ht.title1}<br />
          {ht.title2}<br />
          <span className="text-[#1D4ED8]">The Well</span>{ht.title3}
        </h2>

        <p className="mt-3 max-w-[34ch] break-keep text-[12.5px] leading-relaxed text-[#475569] sm:text-[13.5px]">
          {ht.desc}
        </p>

        <Link
          href="/community"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#1D4ED8] px-[18px] py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[#1D4ED8]/20 transition-colors hover:bg-[#1A45BE]"
        >
          {ht.cta}
        </Link>
      </div>
    </section>
  );
}
