'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // 경로/쿼리가 바뀌면(=이동 완료) 스피너 해제
  useEffect(() => {
    clearTimer();
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // <a> 태그(또는 그 내부 요소) 클릭일 때만 반응
      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor) return;

      // 새 탭/다운로드/외부 링크 등 SPA 이동이 아닌 경우는 무시
      if (
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      setLoading(true);

      // 라우팅이 일어나지 않아도 3초 후 자동 해제
      clearTimer();
      timeoutRef.current = setTimeout(() => setLoading(false), 3000);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      clearTimer();
    };
  }, []);

  if (!loading) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{
        width: 44,
        height: 44,
        border: '4px solid #E5E7EB',
        borderTop: '4px solid #1D4ED8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
