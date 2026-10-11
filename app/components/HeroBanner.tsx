type Lang = 'ko' | 'en' | 'zh' | 'ja';

interface HeroBannerProps {
  lang?: Lang;
}

/**
 * 브랜드 태그라인 — 번역하지 않는다.
 * 4개 언어 키에 같은 영문을 넣으면 "번역이 빠진 것"으로 오해해 누가 번역해 버릴 수 있어,
 * 언어와 무관한 상수로 분리해 둔다.
 */
const TAGLINE = "A place to belong, wherever you're from.";

const HERO_T = {
  ko: {
    title1: '외국인 유학생의',
    title2: '든든한 학교생활',
    illustAlt: 'The Well 캠퍼스 일러스트',
  },
  en: {
    title1: 'Reliable campus life',
    title2: 'for international students',
    illustAlt: 'The Well campus illustration',
  },
  zh: {
    title1: '外国留学生的',
    title2: '安心校园生活',
    illustAlt: 'The Well 校园插画',
  },
  ja: {
    title1: '外国人留学生の',
    title2: '心強い学校生活',
    illustAlt: 'The Well キャンパスイラスト',
  },
} as const;

/**
 * 홈 상단 환영 배너.
 * 높이를 고정하지 않고 내용(패딩 + 제목 2줄 + 태그라인)으로 결정한다 —
 * 390px 기준 약 110px, 번역이나 글자 확대 시에는 내용에 맞춰 늘어난다.
 * 커뮤니티 진입은 하단 탭바와 "최근 커뮤니티" 전체보기가 담당하므로 CTA 버튼은 두지 않는다.
 */
export default function HeroBanner({ lang = 'ko' }: HeroBannerProps) {
  const ht = HERO_T[lang];
  return (
    <section className="relative mt-1 overflow-hidden rounded-2xl border border-[#D6E8FB] bg-gradient-to-br from-[#E7F2FF] via-[#ECF5FE] to-[#F0F7FE]">
      {/* 구름 장식 (일러스트 뒤쪽 하늘 — 은은하게 블러 처리) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <svg className="absolute top-[12%] right-[8%] w-14 opacity-60 blur-[1.5px]" viewBox="0 0 64 34" fill="#F4FAFF">
          <ellipse cx="19" cy="21" rx="15" ry="10" />
          <ellipse cx="34" cy="16" rx="17" ry="13" />
          <ellipse cx="47" cy="22" rx="12" ry="9" />
          <rect x="13" y="22" width="40" height="9" rx="4.5" />
        </svg>
        <svg className="absolute top-[8%] right-[30%] w-9 opacity-50 blur-[1.5px]" viewBox="0 0 64 34" fill="#F4FAFF">
          <ellipse cx="19" cy="21" rx="15" ry="10" />
          <ellipse cx="34" cy="16" rx="17" ry="13" />
          <ellipse cx="47" cy="22" rx="12" ry="9" />
          <rect x="13" y="22" width="40" height="9" rx="4.5" />
        </svg>
      </div>

      {/* 우측: 기존 우물·캠퍼스 일러스트 (카드 우하단까지 bleed) */}
      <img
        src="/hero-illustration-transparent-soft.png"
        alt={ht.illustAlt}
        aria-hidden
        className="pointer-events-none select-none absolute bottom-0 right-0 z-0 w-[38%] max-w-[200px] object-contain object-bottom"
      />

      {/* 좌측: 제목 + 태그라인 */}
      <div className="relative z-10 max-w-[64%] px-4 py-4 sm:max-w-[58%] sm:px-6 sm:py-5">
        <h2 className="break-keep text-[18px] font-extrabold leading-[1.3] tracking-[-0.01em] text-[#0F172A] sm:text-[22px]">
          {ht.title1}<br />
          {ht.title2}
        </h2>

        {/* 브랜드 태그라인 — 언어와 무관하게 항상 영문 */}
        <p lang="en" className="mt-1.5 text-[12.5px] font-semibold leading-snug tracking-[0.01em] text-[#1D4ED8] sm:text-[13.5px]">
          {TAGLINE}
        </p>
      </div>
    </section>
  );
}
