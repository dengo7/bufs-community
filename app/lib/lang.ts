// UILang 타입은 lib/categories.ts에 이미 정의돼 있어 re-export만 한다.
import type { UILang } from './categories';
export type { UILang };

export const LANG_KEY = 'the-well-lang';

export function getLang(): UILang {
  if (typeof window === 'undefined') return 'ko';
  return (localStorage.getItem(LANG_KEY) as UILang) ?? 'ko';
}

export function setLang(lang: UILang) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANG_KEY, lang);
}
