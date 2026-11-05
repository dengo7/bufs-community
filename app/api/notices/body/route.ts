import { load } from 'cheerio';

export const runtime = 'nodejs';

type Source = 'academic' | 'global';
type Language = 'ko' | 'en' | 'zh' | 'ja';

const cache = new Map<string, { expires: number; text: string; original: string }>();
const MAX_BODY_LENGTH = 30000;

function noticeUrl(source: Source, id: number) {
  return source === 'academic'
    ? `https://www.bufs.ac.kr/bbs/board.php?bo_table=notice_aca&wr_id=${id}`
    : `https://oiaglobal.bufs.ac.kr/notice/${id}`;
}

function extractBody(html: string) {
  const $ = load(html);
  const body = $('#bo_v_con, #view_con, .bo_v_con, .view-content').first();
  if (!body.length) return '';
  body.find('script, style, nav, iframe, button').remove();
  body.find('br, p, div, li, tr').append('\n');
  return body.text().replace(/\r/g, '').replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function chunks(text: string) {
  const result: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    let part = '';
    for (let line of paragraph.split(/(?<=[.!?。])\s+|\n/)) {
      if (part.length + line.length > 900 && part) {
        result.push(part);
        part = '';
      }
      while (line.length > 900) {
        result.push(line.slice(0, 900));
        line = line.slice(900);
      }
      part += (part ? ' ' : '') + line;
    }
    if (part) result.push(part);
  }
  return result;
}

async function translate(text: string, lang: Exclude<Language, 'ko'>) {
  const target = lang === 'zh' ? 'zh-CN' : lang;
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.search = new URLSearchParams({ client: 'gtx', sl: 'ko', tl: target, dt: 't', q: text }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: 'no-store' });
  if (!response.ok) throw new Error(`Translation HTTP ${response.status}`);
  const data = await response.json();
  const translated = (Array.isArray(data?.[0]) ? data[0] : [])
    .map((segment: unknown) => Array.isArray(segment) ? segment[0] : '')
    .join('').trim();
  if (!translated) throw new Error('Empty translation');
  return translated;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get('source');
  const lang = params.get('lang');
  const id = Number(params.get('wr_id'));
  if ((source !== 'academic' && source !== 'global') ||
      (lang !== 'ko' && lang !== 'en' && lang !== 'zh' && lang !== 'ja') ||
      !Number.isSafeInteger(id) || id <= 0) {
    return Response.json({ error: 'Invalid notice' }, { status: 400 });
  }

  const key = `${source}:${id}:${lang}`;
  const saved = cache.get(key);
  if (saved && saved.expires > Date.now()) {
    return Response.json({ text: saved.text, original: saved.original });
  }

  try {
    const response = await fetch(noticeUrl(source, id), {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheWell/1.0)' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Notice HTTP ${response.status}`);
    const original = extractBody(await response.text());
    if (!original) return Response.json({ error: 'Body unavailable' }, { status: 404 });
    if (original.length > MAX_BODY_LENGTH) {
      return Response.json({ error: 'Body too long' }, { status: 413 });
    }
    const parts = chunks(original);
    const translated = lang === 'ko' ? original : (await Promise.all(parts.map(part =>
      part ? translate(part, lang) : Promise.resolve('')
    ))).join('\n\n').trim();
    const value = { text: translated, original, expires: Date.now() + 60 * 60 * 1000 };
    cache.set(key, value);
    return Response.json({ text: value.text, original: value.original });
  } catch {
    return Response.json({ error: 'Translation unavailable' }, { status: 502 });
  }
}
