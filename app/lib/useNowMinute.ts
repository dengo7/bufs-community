'use client';

import { useSyncExternalStore } from 'react';

const MINUTE = 60 * 1000;

function subscribe(onStoreChange: () => void): () => void {
  const id = setInterval(onStoreChange, MINUTE);
  return () => clearInterval(id);
}

// 분 단위로 잘라 반환해야 같은 분 안에서는 스냅샷이 바뀌지 않는다
const getSnapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * 현재 시각(ms, 분 단위로 내림)을 구독한다. 1분마다 갱신.
 * 서버 렌더/하이드레이션 중에는 null → 시각에 의존하는 UI(운영 상태 등)는 마운트 후에 나타난다.
 */
export function useNowMinute(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
