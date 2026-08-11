import type { ReactNode } from 'react';

// http(s):// 로 시작하거나 www. 로 시작하는 토큰을 URL 후보로 본다.
const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

// URL 뒤에 붙은 문장부호 (링크에 포함하면 안 되는 것들)
const PUNCT = '.,;:!?…"\'';
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/**
 * URL 끝에 달라붙은 마침표/쉼표/닫는 괄호를 잘라낸다.
 * 괄호는 URL 안에서 짝이 맞으면(예: .../foo_(bar)) 링크에 남긴다.
 */
function splitTrailing(token: string): [url: string, trailing: string] {
  let end = token.length;

  while (end > 0) {
    const ch = token[end - 1];

    if (PUNCT.includes(ch)) { end--; continue; }

    const open = CLOSERS[ch];
    if (open) {
      const slice = token.slice(0, end);
      const opens  = slice.split(open).length - 1;
      const closes = slice.split(ch).length - 1;
      if (closes > opens) { end--; continue; }
    }

    break;
  }

  return [token.slice(0, end), token.slice(end)];
}

/**
 * 일반 텍스트 안의 URL을 <a> 노드로 바꿔 React 노드 배열로 돌려준다.
 * dangerouslySetInnerHTML 없이 텍스트를 분할하므로 줄바꿈(whitespace-pre-wrap)은 그대로 유지된다.
 */
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text)) !== null) {
    // 이메일 주소(name@www...)의 일부는 링크로 만들지 않는다.
    if (match.index > 0 && text[match.index - 1] === '@') continue;

    const [url, trailing] = splitTrailing(match[0]);

    // 부호만 남는 비정상 토큰은 링크로 만들지 않는다.
    if (!url || url === 'www.') continue;

    if (match.index > last) nodes.push(text.slice(last, match.index));

    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
    nodes.push(
      <a
        key={`link-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all"
      >
        {url}
      </a>
    );

    if (trailing) nodes.push(trailing);
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
