import Link from "next/link";

export default function HeroBanner() {
  return (
    <section className="mt-1 overflow-hidden rounded-[24px] bg-[#EBF4FC]">
      <div className="flex items-stretch min-h-[300px] pl-5 pr-0">
        {/* 텍스트 영역 (왼쪽, 세로 중앙, 이미지 위에 표시) */}
        <div className="relative z-10 self-center flex-[0.9] min-w-0 break-keep py-6">
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/90 border border-[#BFDBFE] px-3 py-1.5 text-[10px] font-semibold text-[#1D4ED8]">
            WELCOME TO THE WELL <span aria-hidden>👋</span>
          </span>
          <h2 className="mt-3 text-[15px] font-bold leading-[1.45] text-[#111827] break-keep">
            외국인 유학생의<br />
            즐겁고 안전한 대학생활,<br />
            <span className="whitespace-nowrap text-[#1D4ED8]">The Well</span>이 함께해요.
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-[#6B7280] break-keep">
            비자, 집, 은행, 병원, 알바, 학교생활<br />
            정보를 함께 나눠요.
          </p>
          <Link href="/community" className="mt-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1D4ED8] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1A45BE] transition-colors">
            커뮤니티 둘러보기 <span aria-hidden>→</span>
          </Link>
        </div>
        {/* 이미지 영역 (오른쪽, 크게·우측·바닥 고정으로 아래 안정 배치, 투명 배경) */}
        <div className="flex-[1.2] flex items-end justify-end overflow-visible">
          <img
            src="/images/the-well-banner-illustration.png"
            alt="The Well banner illustration"
            className="w-[330px] max-w-none object-contain"
          />
        </div>
      </div>
      <div className="flex justify-center gap-1.5 pb-3">
        <span className="h-1.5 w-[18px] rounded-full bg-[#1D4ED8]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#C3DDF3]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#C3DDF3]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#C3DDF3]" />
      </div>
    </section>
  );
}
