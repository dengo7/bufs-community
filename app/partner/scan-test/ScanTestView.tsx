'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getQrEngine } from '../../lib/qrDetector';

/**
 * QR 스캔 실기기 테스트 (숨김 페이지, DB 사용 없음)
 * 방식 1: getUserMedia 실시간 스캔 / 방식 2: <input capture> 사진 → 해독
 * 결과·에러를 가공 없이 화면에 보여준다. 문구는 개발 확인용이라 한국어만 둔다.
 *
 * 해독 엔진은 app/lib/qrDetector.ts (내장 BarcodeDetector 또는 자체 호스팅 zxing-wasm).
 */

const errText = (e: unknown) =>
  e instanceof Error ? `${e.name}: ${e.message}` : String(e);

type Result = { ok: boolean; text: string; engine?: string; ms?: number } | null;

export default function ScanTestView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [env, setEnv] = useState<Record<string, string>>({});
  const [liveStatus, setLiveStatus] = useState('대기');
  const [liveResult, setLiveResult] = useState<Result>(null);
  const [photoStatus, setPhotoStatus] = useState('대기');
  const [photoResult, setPhotoResult] = useState<Result>(null);

  useEffect(() => {
    setEnv({
      userAgent: navigator.userAgent,
      isSecureContext: String(window.isSecureContext),
      mediaDevices: String(!!navigator.mediaDevices?.getUserMedia),
      nativeBarcodeDetector: String('BarcodeDetector' in window),
      url: location.href,
    });
    return () => stopLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopLive() {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // ── 방식 1: 실시간 카메라 ───────────────────────────────────────
  async function startLive() {
    stopLive();
    setLiveResult(null);
    const started = performance.now();
    try {
      setLiveStatus('엔진 준비 중…');
      const engine = await getQrEngine();

      setLiveStatus('카메라 권한 요청 중…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setLiveStatus(`스캔 중… (${engine.name})`);

      const tick = async () => {
        if (!streamRef.current) return;
        try {
          if (video.readyState >= 2) {
            const codes = await engine.detector.detect(video);
            if (codes.length) {
              setLiveResult({ ok: true, text: codes[0].rawValue, engine: engine.name, ms: Math.round(performance.now() - started) });
              setLiveStatus('해독 완료 — 카메라 정지');
              stopLive();
              return;
            }
          }
        } catch (e) {
          setLiveResult({ ok: false, text: `detect 오류 — ${errText(e)}`, engine: engine.name });
          setLiveStatus('오류');
          stopLive();
          return;
        }
        timerRef.current = window.setTimeout(tick, 250);
      };
      tick();
    } catch (e) {
      setLiveResult({ ok: false, text: errText(e) });
      setLiveStatus('실패');
      stopLive();
    }
  }

  // ── 방식 2: 사진 찍기 → 해독 ────────────────────────────────────
  async function onPhoto(file: File | undefined) {
    setPhotoResult(null);
    if (!file) { setPhotoStatus('사진이 선택되지 않음'); return; }
    const started = performance.now();
    try {
      setPhotoStatus(`사진 수신 (${file.type || 'type 없음'}, ${Math.round(file.size / 1024)}KB) — 엔진 준비 중…`);
      const engine = await getQrEngine();
      setPhotoStatus('해독 중…');
      let source: ImageBitmapSource = file;
      try { source = await createImageBitmap(file); } catch { /* Blob 그대로 시도 */ }
      const codes = await engine.detector.detect(source);
      setPhotoResult(codes.length
        ? { ok: true, text: codes[0].rawValue, engine: engine.name, ms: Math.round(performance.now() - started) }
        : { ok: false, text: '사진에서 QR을 찾지 못함', engine: engine.name });
      setPhotoStatus('완료');
    } catch (e) {
      setPhotoResult({ ok: false, text: errText(e) });
      setPhotoStatus('실패');
    }
  }

  const box = 'bg-white rounded-2xl border border-[#E5E7EB] p-4';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[600px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <p className="text-[15px] font-bold">QR 스캔 테스트</p>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-safe space-y-4">
        <section className={box}>
          <h2 className="text-[15px] font-bold">방식 1 · 실시간 카메라</h2>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="mt-3 w-full aspect-[3/4] bg-black rounded-xl object-cover"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={startLive}
              className="flex-1 h-11 rounded-xl bg-[#1D4ED8] text-white text-[14px] font-semibold border-none cursor-pointer">
              카메라로 스캔 시작
            </button>
            <button type="button" onClick={() => { stopLive(); setLiveStatus('정지'); }}
              className="h-11 px-4 rounded-xl bg-white text-[#475569] text-[14px] font-semibold border border-[#E5E7EB] cursor-pointer">
              정지
            </button>
          </div>
          <ResultBlock status={liveStatus} result={liveResult} />
        </section>

        <section className={box}>
          <h2 className="text-[15px] font-bold">방식 2 · 사진 찍어서 해독</h2>
          <label className="mt-3 flex items-center justify-center h-11 rounded-xl bg-[#1D4ED8] text-white text-[14px] font-semibold cursor-pointer">
            사진 찍기
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
          <ResultBlock status={photoStatus} result={photoResult} />
        </section>

        <section className={box}>
          <h2 className="text-[15px] font-bold">환경 정보</h2>
          <dl className="mt-2 space-y-1.5 text-[12px] break-all">
            {Object.entries(env).map(([k, v]) => (
              <div key={k}><dt className="font-semibold text-[#475569]">{k}</dt><dd className="text-[#111827]">{v}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function ResultBlock({ status, result }: { status: string; result: Result }) {
  return (
    <div className="mt-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-3 text-[13px] break-all">
      <p className="text-[#64748B]">상태: {status}</p>
      {result && (
        <>
          <p className={`mt-1 font-semibold ${result.ok ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
            {result.ok ? '결과: ' : '에러: '}{result.text}
          </p>
          {result.engine && <p className="mt-1 text-[#64748B]">엔진: {result.engine}</p>}
          {result.ms != null && <p className="text-[#64748B]">소요: {result.ms}ms</p>}
        </>
      )}
    </div>
  );
}
