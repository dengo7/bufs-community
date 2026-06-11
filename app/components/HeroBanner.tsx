import Link from "next/link";

export default function HeroBanner() {
  return (
    <section className="mt-1 overflow-hidden rounded-[24px] bg-[#EFF6FD]">
      <div className="flex flex-row items-center gap-3 min-h-[220px] px-5 py-5">
        {/* 텍스트 (왼쪽): 남는 폭을 다 차지하고 정상 줄바꿈 */}
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/90 border border-[#BFDBFE] px-3 py-1.5 text-[10px] font-semibold text-[#1D4ED8]">
            WELCOME TO THE WELL <span aria-hidden>👋</span>
          </span>
          <h2 className="mt-3 break-keep leading-snug font-bold text-[#111827] text-[18px] sm:text-[22px]">
            외국인 유학생의<br />
            즐겁고 안전한 대학생활,<br />
            <span className="whitespace-nowrap text-[#1D4ED8]">The Well</span>이 함께해요.
          </h2>
          <p className="mt-2.5 break-keep text-[13px] leading-relaxed text-[#6B7280]">
            비자, 집, 은행, 병원, 알바, 학교생활 정보를 함께 나눠요.
          </p>
          <Link href="/community" className="mt-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1D4ED8] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#1A45BE] transition-colors">
            커뮤니티 둘러보기 <span aria-hidden>→</span>
          </Link>
        </div>
        {/* 일러스트 (오른쪽): 고정 폭·작게, 텍스트를 밀지 않게 shrink-0, 세로 중앙 */}
        <img
          src="/hero-illustration.png"
          alt="The Well banner illustration"
          className="shrink-0 self-center w-[130px] sm:w-[170px] object-contain"
        />
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
