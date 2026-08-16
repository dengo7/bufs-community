'use client';

import { useSyncExternalStore } from 'react';
// UILang 타입은 lib/categories.ts에 이미 정의돼 있어 re-export만 한다.
import type { UILang } from './categories';
export type { UILang };

export const LANG_KEY = 'the-well-lang';

const DEFAULT_LANG: UILang = 'ko';
const LANGS: readonly UILang[] = ['ko', 'en', 'zh', 'ja'];

const isUILang = (v: unknown): v is UILang => LANGS.includes(v as UILang);

// 모듈 스코프 현재 언어 — 첫 접근 시 localStorage에서 lazy 초기화한다.
let current: UILang | null = null;
const listeners = new Set<() => void>();

/** <html lang="..."> 을 실제 UI 언어와 맞춘다. */
function syncDocumentLang(lang: UILang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
}

/** 현재 언어(스냅샷). 서버에서는 항상 기본값. */
export function getLang(): UILang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  if (current === null) {
    const stored = localStorage.getItem(LANG_KEY);
    current = isUILang(stored) ? stored : DEFAULT_LANG;
  }
  return current;
}

/** 언어 변경 — 스토어 갱신 + 저장 + <html lang> 동기화 + 구독자 통지 */
export function setLang(lang: UILang) {
  if (typeof window === 'undefined') return;
  current = lang;
  localStorage.setItem(LANG_KEY, lang);
  syncDocumentLang(lang);
  listeners.forEach(notify => notify());
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // 초기 로드 동기화. subscribe는 커밋 이후 실행되므로 렌더 중 DOM을 건드리지 않는다.
  syncDocumentLang(getLang());
  return () => { listeners.delete(onStoreChange); };
}

/**
 * 현재 UI 언어를 구독한다.
 * 첫 렌더는 서버/하이드레이션과 동일하게 'ko', 마운트 직후 저장된 언어로 전환된다.
 * (기존 useState('ko') + useEffect(setLang(getLang())) 패턴과 동일한 타이밍)
 */
export function useLang(): UILang {
  return useSyncExternalStore(subscribe, getLang, () => DEFAULT_LANG);
}
