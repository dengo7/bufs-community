'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import type { UILang } from '../../lib/categories';
import { getQrEngine } from '../../lib/qrDetector';
import { parseCheckinUrl, PARTNER_T } from '../../lib/partners';

type Props = {
  lang: UILang;
  onClose: () => void;
  /** 우리 가게 QR로 확인된 경우에만 호출된다 */
  onDetected: (target: { slug: string; code: string }) => void;
};

/**
 * 매장 QR 스캐너.
 * 1) 실시간 카메라(getUserMedia)를 먼저 시도하고
 * 2) 권한 거부·카메라 없음·엔진 오류 등으로 실패하면 사진 찍기(<input capture>) 방식으로 바꿔 안내한다.
 * 스캔한 주소가 우리 가게 적립 주소 형식이 아니면 적립하지 않고 안내만 한다.
 */
export default function QrScanModal({ lang, onClose, onDetected }: Props) {
  const t = PARTNER_T[lang];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  // 시작할 때마다 증가 — 이전 시도(StrictMode 이중 실행, 재시도)의 비동기 결과를 버리기 위함
  const genRef = useRef(0);

  const [mode, setMode] = useState<'live' | 'photo'>('live');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const stopLive = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(tr => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleText = useCallback((text: string): boolean => {
    const target = parseCheckinUrl(text);
    if (!target) {
      setNotice(t.notOurQr);
      return false;
    }
    doneRef.current = true;
    stopLive();
    onDetected(target);
    return true;
  }, [onDetected, stopLive, t.notOurQr]);

  const fallbackToPhoto = useCallback(() => {
    stopLive();
    setMode('photo');
    setNotice(t.cameraFailed);
  }, [stopLive, t.cameraFailed]);

  const startLive = useCallback(async () => {
    stopLive();
    const gen = ++genRef.current;
    doneRef.current = false;
    setMode('live');
    setNotice('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia unavailable');
      const engine = await getQrEngine();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (doneRef.current || gen !== genRef.current) { stream.getTracks().forEach(tr => tr.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const tick = async () => {
        if (!streamRef.current || doneRef.current || gen !== genRef.current) return;
        try {
          if (video.readyState >= 2) {
            const codes = await engine.detector.detect(video);
            for (const c of codes) if (handleText(c.rawValue)) return;
          }
        } catch {
          if (gen === genRef.current && !doneRef.current) fallbackToPhoto();
          return;
        }
        timerRef.current = window.setTimeout(tick, 250);
      };
      tick();
    } catch {
      if (gen === genRef.current && !doneRef.current) fallbackToPhoto();
    }
  }, [fallbackToPhoto, handleText, stopLive]);

  useEffect(() => {
    // queueMicrotask: effect 본문에서 setState를 직접 부르지 않도록 (react-hooks/set-state-in-effect)
    queueMicrotask(startLive);
    const gens = genRef;
    return () => { doneRef.current = true; gens.current++; stopLive(); };
  }, [startLive, stopLive]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNotice('');
    try {
      const engine = await getQrEngine();
      let source: ImageBitmapSource = file;
      try { source = await createImageBitmap(file); } catch { /* Blob 그대로 */ }
      const codes = await engine.detector.detect(source);
      if (!codes.length) setNotice(t.noQrInPhoto);
      else if (!codes.some(c => handleText(c.rawValue))) setNotice(t.notOurQr);
    } catch {
      setNotice(t.scanError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col bg-black/90 text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t.scanTitle}
    >
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <p className="text-[16px] font-bold">{t.scanTitle}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-11 h-11 -mr-2 flex items-center justify-center bg-transparent border-none text-white cursor-pointer"
          aria-label={t.close}
        >
          <X size={24} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        {mode === 'live' ? (
          <>
            <div className="relative w-full max-w-[340px] aspect-square overflow-hidden rounded-3xl bg-black">
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-[3px] border-white/85" />
            </div>
            <p className="text-center text-[14px] text-white/85">{t.scanHint}</p>
          </>
        ) : (
          <div className="w-full max-w-[340px] flex flex-col items-center gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
              <Camera size={36} strokeWidth={1.6} />
            </span>
            <label
              className={`w-full h-12 flex items-center justify-center rounded-2xl bg-white text-[#111827] text-[15px] font-bold cursor-pointer
                ${busy ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {t.takePhoto}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = ''; }}
              />
            </label>
            <button
              type="button"
              onClick={startLive}
              className="text-[13px] text-white/70 underline bg-transparent border-none cursor-pointer"
            >
              {t.retryCamera}
            </button>
          </div>
        )}

        {notice && (
          <p className="max-w-[340px] rounded-xl bg-white/10 px-4 py-2.5 text-center text-[13.5px] leading-snug" role="status">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
