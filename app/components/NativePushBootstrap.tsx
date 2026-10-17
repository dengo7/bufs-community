'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase/client';
import { useLang } from '../lib/lang';
import {
  isNativePushSupported,
  listenNativePushActions,
  syncNativePushOnLaunch,
  updateNativePushLang,
} from '../lib/nativePush';

/**
 * 앱 전역(layout)에 한 번 마운트. 네이티브 푸시가 지원되는 빌드에서만 동작한다.
 *  - 실행·로그인 시: 이미 켜 둔 기기면 토큰 재등록(갱신)
 *  - 언어 변경 시: 토큰 행의 lang 갱신
 *  - 알림 탭: data.url 로 이동
 * 웹 브라우저·구버전 앱에서는 아무 일도 하지 않는다.
 */
export default function NativePushBootstrap() {
  const router = useRouter();
  const lang = useLang();
  const mounted = useRef(false);

  useEffect(() => {
    if (!isNativePushSupported()) return;

    const client = getSupabaseClient();
    client.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session?.user) syncNativePushOnLaunch();
    });
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event: AuthChangeEvent) => {
        if (event === 'SIGNED_IN') syncNativePushOnLaunch();
      }
    );

    let stop: (() => void) | null = null;
    listenNativePushActions(url => router.push(url)).then(fn => { stop = fn; });

    return () => {
      subscription.unsubscribe();
      stop?.();
    };
  }, [router]);

  useEffect(() => {
    // 첫 렌더(저장값 로드)는 건너뛰고 실제 변경에만 반응
    if (!mounted.current) { mounted.current = true; return; }
    updateNativePushLang(lang);
  }, [lang]);

  return null;
}
