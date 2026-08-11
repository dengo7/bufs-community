#!/usr/bin/env node
/**
 * 부산외대 학사공지(그누보드5) 크롤러 → Supabase notices upsert
 *
 * 사용법:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... [GEMINI_API_KEY=...] \
 *     node scripts/crawl-notices.mjs [--pages=N] [--dry-run]
 *
 *   --source=academic|global|all  수집 소스 (기본 all)
 *                             academic: www.bufs.ac.kr 학사공지 / global: oiaglobal.bufs.ac.kr 국제교류처
 *   --pages=N                 1..N 페이지를 크롤 (기본 1, 소스마다 적용)
 *   --dry-run                 DB 접속 없이 파싱 결과만 출력 (셀렉터 점검용)
 *   --backfill-translations   크롤을 건너뛰고, translations가 비어 있는 기존 행만 번역해 채운다
 *                             (GEMINI_API_KEY 필수. 실패분은 다음 실행에서 다시 시도된다)
 *   --limit=N                 백필 전용 — 최신(wr_id 내림차순) 상위 N건만 처리. 없으면 전체
 *
 * 신규 wr_id만 분류·번역 후 upsert 한다. 이미 저장된 공지는 건드리지 않는다(재번역 방지).
 *
 * 번역은 Gemini에 최대 10건씩 묶어 보내고, 배치 호출 사이에 GEMINI_DELAY_MS(기본 15000ms)를
 * 쉰다. 429는 60초 후 재시도(배치당 3회)하며, 끝내 실패한 항목은 Google 번역으로 폴백한다.
 */

import { load } from 'cheerio';

const ACA_BASE    = 'https://www.bufs.ac.kr';
const ACA_BO      = 'notice_aca';
const GLOBAL_BASE = 'https://oiaglobal.bufs.ac.kr';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// ── 인자 ────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const dryRun   = args.includes('--dry-run');
const backfill = args.includes('--backfill-translations');
const pagesRaw = Number((args.find(a => a.startsWith('--pages=')) || '').split('=')[1]);
const pages    = Number.isInteger(pagesRaw) && pagesRaw > 0 ? pagesRaw : 1;
// --limit=N (백필 전용): 최신순 상위 N건만. 없으면 전체.
const limitRaw = Number((args.find(a => a.startsWith('--limit=')) || '').split('=')[1]);
const limit    = Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : null;
// --source=academic|global|all (기본 all)
const sourceArg = (args.find(a => a.startsWith('--source=')) || '').split('=')[1] || 'all';

// ── 환경변수 ────────────────────────────────────────────────────────────
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY } = process.env;

if (!dryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  const missing = [
    !SUPABASE_URL && 'SUPABASE_URL',
    !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean).join(', ');
  console.error(`[error] 필수 환경변수가 없습니다: ${missing}`);
  console.error('[error] 예) SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/crawl-notices.mjs');
  console.error('[error] 파싱만 확인하려면 --dry-run 으로 실행하세요.');
  process.exit(1);
}

// 백필은 번역이 목적이므로 키가 없으면 할 일이 없다.
if (backfill && !GEMINI_API_KEY) {
  console.error('[error] --backfill-translations 에는 GEMINI_API_KEY가 필요합니다');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── HTML 가져오기 (charset 자동 판별) ───────────────────────────────────
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);

  const buf = Buffer.from(await res.arrayBuffer());

  // 헤더 charset 우선, 없으면 <meta charset> 확인 (현재 이 게시판은 utf-8)
  const headerCharset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') || '')?.[1];
  const metaCharset   = /charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString('latin1'))?.[1];
  const charset = (headerCharset || metaCharset || 'utf-8').toLowerCase();

  if (charset === 'utf-8' || charset === 'utf8') return buf.toString('utf8');
  try {
    // Node 18+ full-icu 빌드는 euc-kr/ks_c_5601 디코딩을 기본 지원한다.
    return new TextDecoder(charset).decode(buf);
  } catch {
    console.warn(`[warn] 알 수 없는 charset(${charset}) — utf-8로 디코딩합니다`);
    return buf.toString('utf8');
  }
}

// ── 목록 파싱: academic (www.bufs.ac.kr / notice_aca) ───────────────────
/**
 * 행 구조:
 *   <tr class="bo_notice"|"">
 *     <td class="td_num">공지 | 1030</td>
 *     <td class="td_subject skinOption-subject">
 *       <a href="...&wr_id=1126" class="view-link" alt="제목 상세보기">제목(길면 …로 잘림)</a>
 *     <td class="td_date"><span class="date">2026. 08. 11</span></td>
 * 앵커 텍스트는 잘릴 수 있어 alt 속성의 전체 제목을 우선 사용한다.
 */
function parseAcademicList(html) {
  const $ = load(html);
  const rows = [];

  $('table tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const a = $tr.find('td.td_subject a[href*="wr_id="]').first();
    if (!a.length) return;

    const wrId = Number(/[?&]wr_id=(\d+)/.exec(a.attr('href') || '')?.[1]);
    if (!Number.isInteger(wrId)) return;

    const altTitle = (a.attr('alt') || '').replace(/\s*상세보기\s*$/, '').trim();
    const title = (altTitle || a.text()).replace(/\s+/g, ' ').trim();
    if (!title) return;

    const dateText = ($tr.find('td.td_date .date').first().text() ||
                      $tr.find('td.td_date').first().text()).trim();

    rows.push({ wr_id: wrId, title, dateText });
  });

  return rows;
}

// ── 목록 파싱: global (oiaglobal.bufs.ac.kr / notice) ───────────────────
/**
 * 같은 그누보드지만 스킨이 달라 <table>이 아니라 <ul class="tbody"><li class="tr">이다.
 *   <li class="tr bo_notice">
 *     <div class="cell_num">공지 | 320</div>
 *     <div class="cell_subject"><div class="skinOption-subject">
 *       <a href="https://oiaglobal.bufs.ac.kr/notice/380" alt="제목 상세보기">제목</a>
 *       <a href="...?sca=Outgoing" class="cate_link">Outgoing</a>   ← 목록 카테고리
 *     <div class="cell_date"><span class="date">2026. 07. 30</span></div>
 * 2페이지부터 글 링크에 ?page=N이 붙는다(/notice/338?page=2) — 숫자만 뽑는다.
 */
function parseGlobalList(html) {
  const $ = load(html);
  const rows = [];

  $('li.tr, ul.tbody li').each((_, li) => {
    const $li = $(li);

    // 카테고리 링크(?sca=...)가 아니라 글 링크(/notice/380 또는 wr_id=380)를 고른다.
    let wrId = null;
    let $a = null;
    $li.find('.cell_subject a[href], .skinOption-subject a[href]').each((_, el) => {
      if (wrId != null) return;
      const href = $(el).attr('href') || '';
      const id = /\/notice\/(\d+)/.exec(href)?.[1] ?? /[?&]wr_id=(\d+)/.exec(href)?.[1];
      if (id) { wrId = Number(id); $a = $(el); }
    });
    if (wrId == null || !$a) return;

    const altTitle = ($a.attr('alt') || '').replace(/\s*상세보기\s*$/, '').trim();
    const title = (altTitle || $a.text()).replace(/\s+/g, ' ').trim();
    if (!title) return;

    const dateText = ($li.find('.cell_date .date').first().text() ||
                      $li.find('.cell_date').first().text()).trim();
    const listCategory = $li.find('a.cate_link').first().text().replace(/\s+/g, '').trim();

    rows.push({ wr_id: wrId, title, dateText, listCategory });
  });

  return rows;
}

// ── 날짜 처리 ───────────────────────────────────────────────────────────
/** Asia/Seoul 기준 오늘 (YYYY-MM-DD) */
function seoulToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * "2026. 08. 11" / "2026-08-11" / "26-08-11" → YYYY-MM-DD
 * "14:32" (오늘 등록분) → Asia/Seoul 기준 오늘 날짜
 */
function parseDate(dateText) {
  const s = (dateText || '').trim();

  if (/^\d{1,2}:\d{2}$/.test(s)) return seoulToday();

  const full = /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/.exec(s);
  if (full) {
    const [, y, m, d] = full;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const short = /^(\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/.exec(s);
  if (short) {
    const [, y, m, d] = short;
    return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  console.warn(`[warn] 날짜 형식을 알 수 없어 오늘로 처리합니다: "${s}"`);
  return seoulToday();
}

// ── 카테고리 분류 (위에서부터 먼저 매칭) ────────────────────────────────
const CATEGORY_RULES = [
  { category: 'registration', keywords: ['수강신청', '수강정정', '수강취소', '재수강'] },
  { category: 'exam',         keywords: ['시험', '평가', '고사', 'TOEIC', '진단'] },
  { category: 'calendar',     keywords: ['학사일정', '공휴일', '휴일', '개강', '종강', '방학', '휴업', '계절학기', '등록금', '졸업', '학위수여식', '입학'] },
];

function categorize(title) {
  const t = title.toUpperCase();
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some(k => t.includes(k.toUpperCase()))) return category;
  }
  return 'etc';
}

// ── 카테고리 분류: global (목록 카테고리 + 제목 키워드) ─────────────────
// 목록 카테고리 표기는 Admissions / Incoming / Outgoing / Events＆Jobs(전각 ＆)
const GLOBAL_RULES = [
  { category: 'scholarship', cats: [],                       keywords: ['장학', 'DAAD', '장학생'] },
  { category: 'admission',   cats: ['admissions'],           keywords: ['입학', '모집', '합격자'] },
  { category: 'exchange',    cats: ['incoming', 'outgoing'], keywords: ['교환', '파견', '[OUTGOING]', '[INCOMING]', 'SAF'] },
  { category: 'event',       cats: ['events'],               keywords: ['[EVENT]', '행사', '설명회', '채용'] },
];

function categorizeGlobal(title, listCategory = '') {
  const t = (title || '').toUpperCase();
  // 전각 ＆·공백 표기가 섞여 있어 앞부분만 소문자로 비교한다 (Events＆Jobs → events…)
  const c = (listCategory || '').toLowerCase();

  for (const { category, cats, keywords } of GLOBAL_RULES) {
    if (cats.some(k => c.startsWith(k))) return category;
    if (keywords.some(k => t.includes(k.toUpperCase()))) return category;
  }
  return 'etc';
}

// ── 소스 설정 ───────────────────────────────────────────────────────────
const SOURCES = {
  academic: {
    key: 'academic',
    label: '학사공지',
    listUrl:   (page) => `${ACA_BASE}/bbs/board.php?bo_table=${ACA_BO}&page=${page}`,
    // 목록 링크에는 &page=N 같은 부수 파라미터가 붙으므로 정식 URL을 새로 만든다.
    sourceUrl: (wrId) => `${ACA_BASE}/bbs/board.php?bo_table=${ACA_BO}&wr_id=${wrId}`,
    parseList: parseAcademicList,
    classify:  (row) => categorize(row.title),
  },
  global: {
    key: 'global',
    label: '국제교류처',
    listUrl:   (page) => `${GLOBAL_BASE}/notice?page=${page}`,
    sourceUrl: (wrId) => `${GLOBAL_BASE}/notice/${wrId}`,
    parseList: parseGlobalList,
    classify:  (row) => categorizeGlobal(row.title, row.listCategory),
  },
};

const selectedSources =
  sourceArg === 'all' ? Object.values(SOURCES) : [SOURCES[sourceArg]].filter(Boolean);

if (!selectedSources.length) {
  console.error(`[error] 알 수 없는 --source 값: ${sourceArg} (academic | global | all)`);
  process.exit(1);
}

// ── 번역 ────────────────────────────────────────────────────────────────
const BATCH_SIZE      = 10;      // 한 번의 Gemini 호출에 넣는 제목 수
const GEMINI_DELAY_MS = Number(process.env.GEMINI_DELAY_MS) || 15_000; // 배치 호출 간 대기
const RETRY_429_MS    = 60_000;  // 429를 받았을 때 대기
const MAX_ATTEMPTS    = 3;       // 배치당 최대 시도 횟수
const FETCH_TIMEOUT_MS = 30_000;
const GOOGLE_GAP_MS   = 300;     // 폴백의 언어별 호출 간 대기

/** 모든 외부 호출에 타임아웃을 건다 (응답이 안 오면 배치 전체가 멈추는 것을 방지). */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ac.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`요청 타임아웃 (${timeoutMs / 1000}초)`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const toTranslations = (tr) => ({ en: { title: tr.en }, zh: { title: tr.zh }, ja: { title: tr.ja } });

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * 제목 여러 건을 한 번의 Gemini 호출로 번역한다.
 * 반환: Map<배치 내 인덱스, {en, zh, ja}> — 응답에서 빠졌거나 형식이 어긋난 idx는 담기지 않는다.
 * 429는 60초 후 재시도(배치당 최대 3회), 그 외 오류는 즉시 throw → 호출 측에서 폴백 처리.
 */
async function geminiBatch(titles) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const numbered = titles.map((t, i) => `${i}. ${t}`).join('\n');

  const body = {
    contents: [{
      role: 'user',
      parts: [{
        text:
          '다음은 한국 대학교 학사공지 제목 목록이다. 각 항목을 영어(en), 중국어 간체(zh), 일본어(ja)로 번역해줘.\n' +
          '- 항목 앞의 번호를 idx로 그대로 사용하고, 목록의 모든 항목을 빠짐없이 포함할 것\n' +
          '- 고유명사와 학사 용어는 자연스럽게 옮기고, 설명이나 원문은 덧붙이지 말 것\n\n' +
          numbered,
      }],
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            idx: { type: 'INTEGER' },
            en:  { type: 'STRING' },
            zh:  { type: 'STRING' },
            ja:  { type: 'STRING' },
          },
          required: ['idx', 'en', 'zh', 'ja'],
        },
      },
    },
  };

  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      lastErr = new Error('Gemini HTTP 429 (rate limit)');
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[warn] Gemini 429 — ${RETRY_429_MS / 1000}초 후 재시도 (${attempt}/${MAX_ATTEMPTS})`);
        await sleep(RETRY_429_MS);
        continue;
      }
      throw new Error(`Gemini 429 재시도 소진 (${MAX_ATTEMPTS}회)`);
    }

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini 응답에 본문이 없습니다');

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('Gemini 응답이 배열이 아닙니다');

    // idx로 원본과 매핑. 범위를 벗어나거나 값이 빈 항목은 담지 않는다(→ 개별 폴백).
    const byIdx = new Map();
    for (const row of parsed) {
      const idx = Number(row?.idx);
      if (!Number.isInteger(idx) || idx < 0 || idx >= titles.length) continue;
      if (!row.en || !row.zh || !row.ja) continue;
      byIdx.set(idx, { en: row.en, zh: row.zh, ja: row.ja });
    }
    return byIdx;
  }

  throw lastErr ?? new Error('Gemini 호출 실패');
}

/**
 * 폴백 — 비공식 Google 번역 엔드포인트로 제목 1건을 en/zh-CN/ja 각각 호출한다.
 * zh-CN 결과는 translations.zh 로 저장한다.
 */
async function googleTranslate(title) {
  const targets = [['en', 'en'], ['zh', 'zh-CN'], ['ja', 'ja']];
  const out = {};

  for (const [key, tl] of targets) {
    const url = 'https://translate.googleapis.com/translate_a/single' +
                `?client=gtx&sl=ko&tl=${tl}&dt=t&q=${encodeURIComponent(title)}`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Google 번역 HTTP ${res.status} (${tl})`);

    const json = await res.json();
    // 응답 첫 배열이 문장 조각들 — [[["번역","원문",...], ...], ...]
    const text = (Array.isArray(json?.[0]) ? json[0] : [])
      .map(seg => (Array.isArray(seg) ? seg[0] : '') || '')
      .join('')
      .trim();
    if (!text) throw new Error(`Google 번역 결과가 비었습니다 (${tl})`);

    out[key] = text;
    if (key !== 'ja') await sleep(GOOGLE_GAP_MS);
  }

  return toTranslations(out);
}

/**
 * 항목 목록을 배치 번역한다. 크롤 모드와 백필 모드가 공유한다.
 * items: [{ wr_id, title }]
 * onResult(item, translations|null) — 한 건이 정해질 때마다 호출된다(백필은 즉시 DB 반영).
 */
async function translateAll(items, onResult) {
  const stats = { gemini: 0, fallback: 0, failed: 0 };
  const batches = chunk(items, BATCH_SIZE);

  if (!GEMINI_API_KEY) {
    console.warn('[warn] GEMINI_API_KEY가 없어 Google 번역 폴백만 사용합니다');
  }

  for (const [bi, batch] of batches.entries()) {
    let byIdx = new Map();

    if (GEMINI_API_KEY) {
      if (bi > 0) await sleep(GEMINI_DELAY_MS); // rate limit 예방
      try {
        byIdx = await geminiBatch(batch.map(r => r.title));
        console.log(`[info] Gemini 배치 ${bi + 1}/${batches.length} (${batch.length}건) 완료`);
      } catch (err) {
        console.warn(`[warn] Gemini 배치 ${bi + 1}/${batches.length} 실패: ${err.message} — 폴백으로 처리합니다`);
      }
    }

    for (const [i, item] of batch.entries()) {
      const tr = byIdx.get(i);
      if (tr) {
        stats.gemini++;
        await onResult(item, toTranslations(tr));
        continue;
      }

      try {
        const fallback = await googleTranslate(item.title);
        stats.fallback++;
        console.warn(`[warn] 폴백 사용 (wr_id=${item.wr_id})`);
        await onResult(item, fallback);
      } catch (err) {
        stats.failed++;
        console.warn(`[warn] 번역 실패 (wr_id=${item.wr_id}): ${err.message} — translations를 비운 채 진행합니다`);
        await onResult(item, null);
      }
    }
  }

  console.log(`[done] 번역 요약: Gemini ${stats.gemini}건, 폴백 ${stats.fallback}건, 실패 ${stats.failed}건`);
  return stats;
}

// ── 저장소 (supabase-js 우선, 없으면 PostgREST) ─────────────────────────
async function makeStore() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return {
      mode: 'supabase-js',
      async existingIds(ids, source) {
        const { data, error } = await client
          .from('notices').select('wr_id').eq('source', source).in('wr_id', ids);
        if (error) throw new Error(error.message);
        return new Set((data ?? []).map(r => r.wr_id));
      },
      async upsert(rows) {
        const { error } = await client.from('notices').upsert(rows, { onConflict: 'source,wr_id' });
        if (error) throw new Error(error.message);
        return rows.length;
      },
      async untranslated(max) {
        let query = client
          .from('notices')
          .select('wr_id, title, source')
          .eq('translations', '{}')
          .order('wr_id', { ascending: false }); // 최신순
        if (max) query = query.limit(max);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data ?? [];
      },
      async setTranslations(row, translations, updatedAt) {
        // unique 키가 (source, wr_id)라 wr_id만으로는 행이 특정되지 않는다.
        const { error } = await client
          .from('notices')
          .update({ translations, updated_at: updatedAt })
          .eq('source', row.source)
          .eq('wr_id', row.wr_id);
        if (error) throw new Error(error.message);
      },
    };
  } catch (err) {
    if (err?.code !== 'ERR_MODULE_NOT_FOUND') throw err;
  }

  // 폴백: PostgREST 직접 호출
  const rest = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/notices`;
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  return {
    mode: 'postgrest',
    async existingIds(ids, source) {
      const res = await fetch(
        `${rest}?select=wr_id&source=eq.${encodeURIComponent(source)}&wr_id=in.(${ids.join(',')})`,
        { headers });
      if (!res.ok) throw new Error(`PostgREST HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return new Set((await res.json()).map(r => r.wr_id));
    },
    async upsert(rows) {
      const res = await fetch(`${rest}?on_conflict=source,wr_id`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
      if (!res.ok) throw new Error(`PostgREST HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return rows.length;
    },
    async untranslated(max) {
      const query = `select=wr_id,title,source&translations=eq.${encodeURIComponent('{}')}&order=wr_id.desc` +
                    (max ? `&limit=${max}` : '');
      const res = await fetch(`${rest}?${query}`, { headers });
      if (!res.ok) throw new Error(`PostgREST HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return res.json();
    },
    async setTranslations(row, translations, updatedAt) {
      // unique 키가 (source, wr_id)라 wr_id만으로는 행이 특정되지 않는다.
      const res = await fetch(`${rest}?source=eq.${encodeURIComponent(row.source)}&wr_id=eq.${row.wr_id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ translations, updated_at: updatedAt }),
      });
      if (!res.ok) throw new Error(`PostgREST HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  };
}

// ── 번역 백필 (크롤 없음) ───────────────────────────────────────────────
/**
 * translations가 비어 있는(= '{}') 기존 행만 번역해 채운다.
 * 한 건 실패해도 나머지는 계속 진행하고, 실패한 wr_id는 그대로 '{}'로 남아
 * 다음 실행에서 다시 대상이 된다.
 */
async function backfillTranslations() {
  console.log('[info] 번역 백필 시작 (크롤 건너뜀)');

  const store = await makeStore();
  console.log(`[info] 저장 방식: ${store.mode}`);

  const targets = await store.untranslated(limit);
  console.log(
    `[info] 대상 ${targets.length}건 (translations가 비어 있는 행` +
    `${limit ? `, 최신순 상위 ${limit}건 제한` : ''})`
  );

  if (!targets.length) {
    console.log('no notices to backfill');
    return;
  }

  let okCount = 0;
  const failed = [];

  // 번역이 끝나는 대로 그 건만 DB에 반영한다(중간에 멈춰도 앞선 결과는 남는다).
  await translateAll(targets, async (row, translations) => {
    if (!translations) {
      failed.push(row.wr_id);
      return; // translations는 '{}' 그대로 → 다음 실행에서 다시 대상
    }
    try {
      await store.setTranslations(row, translations, new Date().toISOString());
      okCount++;
    } catch (err) {
      failed.push(row.wr_id);
      console.warn(`[warn] 백필 저장 실패 (wr_id=${row.wr_id}): ${err.message}`);
    }
  });

  console.log(`[info] 번역 성공 ${okCount}건 / 실패 ${failed.length}건`);
  if (failed.length) {
    console.warn(`[warn] 실패한 wr_id: ${failed.join(', ')} — 다시 실행하면 남은 건만 재시도합니다`);
  }
  console.log(`[done] 백필 완료 — ${okCount}건 업데이트`);
}

// ── 메인 ────────────────────────────────────────────────────────────────
async function main() {
  if (backfill) return backfillTranslations();

  const names = selectedSources.map(s => s.key).join(', ');
  console.log(`[info] 공지 크롤 시작 — source=${names}, pages=${pages}${dryRun ? ' (dry-run)' : ''}`);

  // a. 소스별 목록 파싱 (같은 wr_id는 한 번만 — 상단 고정 공지가 중복 노출됨)
  const parsedBySource = new Map();

  for (const src of selectedSources) {
    const byId = new Map();
    for (let page = 1; page <= pages; page++) {
      const html = await fetchHtml(src.listUrl(page));
      const rows = src.parseList(html);
      console.log(`[info] [${src.key}] page ${page}: ${rows.length}건 파싱`);
      for (const row of rows) if (!byId.has(row.wr_id)) byId.set(row.wr_id, row);
      if (page < pages) await sleep(500);
    }

    const rows = [...byId.values()];
    console.log(`[info] [${src.key}] 파싱 ${rows.length}건 (중복 제거 후)`);

    if (!rows.length) {
      console.error(`[error] [${src.key}] 목록에서 공지를 하나도 찾지 못했습니다 — 페이지 구조가 바뀌었을 수 있습니다`);
      process.exit(1);
    }
    parsedBySource.set(src.key, rows);
  }

  if (dryRun) {
    let total = 0;
    for (const src of selectedSources) {
      for (const row of parsedBySource.get(src.key)) {
        total++;
        console.log(JSON.stringify({
          source: src.key,
          wr_id: row.wr_id,
          title: row.title,
          dateText: row.dateText,
          ...(row.listCategory ? { listCategory: row.listCategory } : {}),
          published_at: parseDate(row.dateText),
          category: src.classify(row),
          source_url: src.sourceUrl(row.wr_id),
        }, null, 2));
      }
    }
    console.log(`[done] dry-run — ${total}건 파싱, DB 쓰기 없음`);
    return;
  }

  // b. 기존 wr_id 조회 → 신규만 선별 (같은 source 안에서만 비교)
  const store = await makeStore();
  console.log(`[info] 저장 방식: ${store.mode}`);

  const fresh = [];
  for (const src of selectedSources) {
    const rows = parsedBySource.get(src.key);
    const existing = await store.existingIds(rows.map(r => r.wr_id), src.key);
    const newRows = rows.filter(r => !existing.has(r.wr_id));
    console.log(`[info] [${src.key}] 신규 ${newRows.length}건 (기존 ${existing.size}건은 건너뜀)`);
    for (const row of newRows) fresh.push({ ...row, src });
  }

  if (!fresh.length) {
    console.log('no new notices');
    return;
  }

  // c. 분류 + 번역 후 upsert (번역은 소스 구분 없이 한 번에 배치 처리)
  const now = new Date().toISOString();
  const translationsByKey = new Map();
  const keyOf = (row) => `${row.src.key}:${row.wr_id}`;

  await translateAll(fresh, (row, translations) => {
    if (translations) translationsByKey.set(keyOf(row), translations);
  });

  const records = fresh.map(row => ({
    source: row.src.key,
    wr_id: row.wr_id,
    title: row.title,
    category: row.src.classify(row),
    published_at: parseDate(row.dateText),
    source_url: row.src.sourceUrl(row.wr_id),
    translations: translationsByKey.get(keyOf(row)) ?? {}, // 실패분은 {}로 저장
    updated_at: now,
  }));

  const written = await store.upsert(records);
  console.log(`[done] upsert ${written}건 완료 (on_conflict=source,wr_id)`);
}

main().catch(err => {
  console.error(`[error] ${err.message}`);
  process.exit(1);
});
