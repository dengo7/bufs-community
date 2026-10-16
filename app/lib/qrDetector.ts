// QR 해독 엔진 — 스캔 테스트 페이지와 (2차) 제휴 가게 [QR 스캔]이 같이 쓴다.
// 기기에 BarcodeDetector(qr_code 지원)가 있으면 그것을, 없으면 barcode-detector 폴리필(zxing-wasm)을 쓴다.
// 폴리필의 WASM은 CDN이 아니라 우리 도메인(public/vendor/zxing/<버전>/)에서 받는다.
// 파일은 scripts/copy-zxing-wasm.mjs 가 같은 ZXING_WASM_VERSION 기준으로 복사한다(prebuild).

export type DetectedCode = { rawValue: string; format: string };
export type QrDetector = { detect(source: ImageBitmapSource): Promise<DetectedCode[]> };
export type QrEngine = { detector: QrDetector; name: string };

let enginePromise: Promise<QrEngine> | null = null;

export function getQrEngine(): Promise<QrEngine> {
  enginePromise ??= (async () => {
    const Native = (window as unknown as {
      BarcodeDetector?: {
        new (opts: { formats: string[] }): QrDetector;
        getSupportedFormats(): Promise<string[]>;
      };
    }).BarcodeDetector;
    if (Native) {
      try {
        if ((await Native.getSupportedFormats()).includes('qr_code')) {
          return { detector: new Native({ formats: ['qr_code'] }), name: '기기 내장 BarcodeDetector' };
        }
      } catch { /* 폴리필로 */ }
    }

    const { BarcodeDetector, prepareZXingModule, ZXING_WASM_VERSION } = await import('barcode-detector/ponyfill');
    const wasmBase = `/vendor/zxing/${ZXING_WASM_VERSION}/`;
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmBase + path : prefix + path),
      },
    });
    return {
      detector: new BarcodeDetector({ formats: ['qr_code'] }),
      name: `barcode-detector 폴리필 (zxing-wasm ${ZXING_WASM_VERSION}, ${wasmBase})`,
    };
  })();
  // 실패하면 다음 시도에서 다시 불러올 수 있게
  enginePromise.catch(() => { enginePromise = null; });
  return enginePromise;
}
