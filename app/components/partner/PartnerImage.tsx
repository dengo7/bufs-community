'use client';

import { useState } from 'react';
import { Utensils } from 'lucide-react';

/** 가게 사진. 경로가 없거나 파일을 못 불러오면 기본 이미지(아이콘)로 대체한다. */
export default function PartnerImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#FFF4E8] to-[#FDE7D3] ${className}`}
        role="img"
        aria-label={alt}
      >
        <Utensils size={30} strokeWidth={1.6} className="text-[#C2611F] opacity-70" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} className={`object-cover ${className}`} />
  );
}
