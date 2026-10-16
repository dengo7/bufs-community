#!/usr/bin/env node
/**
 * QR 해독용 zxing WASM을 node_modules → public/vendor/zxing/<버전>/ 로 복사한다.
 *
 *   npm run vendor:zxing        (수동)
 *   npm run build               (prebuild 로 자동 실행 — Vercel 빌드 포함)
 *
 * 버전·해시는 런타임이 실제로 쓰는 값(barcode-detector/ponyfill 의 ZXING_WASM_VERSION·SHA256)을
 * 기준으로 하므로, 패키지를 올렸는데 파일이 옛 버전으로 남는 일이 없다.
 * 앱 코드(app/lib/qrDetector.ts)도 같은 ZXING_WASM_VERSION으로 경로를 만든다.
 * 다른 버전 폴더는 지운다. 해시가 맞지 않으면 실패(exit 1)해 빌드를 멈춘다.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ZXING_WASM_VERSION: version, ZXING_WASM_SHA256: sha256 } = await import('barcode-detector/ponyfill');

// barcode-detector가 실제로 쓰는 zxing-wasm (중첩 설치가 있으면 그쪽이 우선)
const candidates = [
  join(root, 'node_modules/barcode-detector/node_modules/zxing-wasm'),
  join(root, 'node_modules/zxing-wasm'),
];
const pkgDir = candidates.find(dir => {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version === version;
  } catch {
    return false;
  }
});
if (!pkgDir) {
  console.error(`[copy-zxing-wasm] zxing-wasm@${version} 을 node_modules에서 찾지 못했습니다`);
  process.exit(1);
}

const src = join(pkgDir, 'dist/reader/zxing_reader.wasm');
const buf = readFileSync(src);
const actual = createHash('sha256').update(buf).digest('hex');
if (actual !== sha256) {
  console.error(`[copy-zxing-wasm] SHA-256 불일치 — 기대 ${sha256}, 실제 ${actual}`);
  process.exit(1);
}

const vendorDir = join(root, 'public/vendor/zxing');
const outDir = join(vendorDir, version);
mkdirSync(outDir, { recursive: true });

const dest = join(outDir, 'zxing_reader.wasm');
const same = existsSync(dest) && createHash('sha256').update(readFileSync(dest)).digest('hex') === sha256;
if (!same) writeFileSync(dest, buf);

for (const name of readdirSync(vendorDir)) {
  if (name !== version) rmSync(join(vendorDir, name), { recursive: true, force: true });
}

console.log(`[copy-zxing-wasm] zxing-wasm@${version} → public/vendor/zxing/${version}/zxing_reader.wasm ${same ? '(변경 없음)' : '(복사)'}`);
