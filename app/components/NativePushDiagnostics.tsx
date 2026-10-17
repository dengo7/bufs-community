'use client';

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from '../lib/supabase/client';
import {
  checkNativePushPermission,
  clearPushPromptDismissed,
  enableNativePush,
  isNativePushSupported,
  nativePushErrorText,
  pushPromptDismissedAt,
  pushPromptDismissedRecently,
} from '../lib/nativePush';

/**
 * 관리자 전용 — 앱 푸시 진단 정보 (알림 설정 화면 맨 아래).
 * iOS 실기기에서 권한 창이 뜨지 않는 원인을 Safari 인스펙터 없이 확인하기 위한 임시 표시.
 * 일반 사용자에게는 아무것도 렌더링하지 않는다. 문구는 관리자용이라 한국어만 둔다.
 *
 *  - 직접 호출: 플러그인을 바로 불러 checkPermissions (앱 경로와 비교용)
 *  - 앱 경로: nativePush.checkNativePushPermission() — 시트·토글이 실제로 쓰는 함수
 *  - 권한 요청 테스트: 앱이 쓰는 enableNativePush() 를 그대로 실행하고 단계별 결과를 표시
 *  - 시트 다시 보기: "나중에" 기록을 지우고 홈으로 이동
 *  - 테스트 알림 보내기: /api/admin/push-test 로 내 기기들에만 1통 (서버에서 관리자 확인, 5초 지연 옵션)
 */

type Row = [label: string, value: string];

async function collect(): Promise<Row[]> {
  const win = window as unknown as {
    Capacitor?: { PluginHeaders?: { name: string }[] };
    webkit?: { messageHandlers?: Record<string, unknown> };
  };
  const rows: Row[] = [];
  const safe = (label: string, fn: () => unknown) => {
    try { rows.push([label, String(fn())]); } catch (e) { rows.push([label, `throw → ${nativePushErrorText(e)}`]); }
  };

  safe('getPlatform()', () => Capacitor.getPlatform());
  safe('isNativePlatform()', () => Capacitor.isNativePlatform());
  safe("isPluginAvailable('PushNotifications')", () => Capacitor.isPluginAvailable('PushNotifications'));
  safe('PluginHeaders', () => {
    const names = (win.Capacitor?.PluginHeaders ?? []).map(h => h.name);
    return names.length ? names.join(', ') : '(없음)';
  });
  safe('webkit.messageHandlers.bridge', () => !!win.webkit?.messageHandlers?.bridge);
  safe('isNativePushSupported()', () => isNativePushSupported());

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const res = await PushNotifications.checkPermissions();
    rows.push(['checkPermissions() 직접 호출', JSON.stringify(res)]);
  } catch (e) {
    rows.push(['checkPermissions() 직접 호출', `에러 → ${nativePushErrorText(e)}`]);
  }

  const app = await checkNativePushPermission();
  rows.push(['checkNativePushPermission() 앱 경로', app.error ? `${app.permission} — 에러 → ${app.error}` : app.permission]);

  const at = pushPromptDismissedAt();
  safe('안내 시트 "나중에" 기록', () =>
    at ? `${new Date(at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (30일 안이면 시트 안 뜸: ${pushPromptDismissedRecently()})` : '없음');
  safe('저장된 기기 토큰', () => {
    try { const t = localStorage.getItem('the-well-push-token'); return t ? `있음 (${t.slice(0, 8)}… / ${t.length}자)` : '없음'; }
    catch { return 'localStorage 접근 불가'; }
  });

  safe('location', () => window.location.href);
  safe('userAgent', () => navigator.userAgent);
  safe('측정 시각', () => new Date().toISOString());
  return rows;
}

export default function NativePushDiagnostics({ userId }: { userId: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [steps, setSteps] = useState<Row[] | null>(null);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState<0 | 5 | null>(null);
  const [sendResult, setSendResult] = useState<Row[] | null>(null);

  const run = useCallback(async () => {
    setRows(await collect());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await getSupabaseClient().from('profiles').select('role').eq('id', userId).single();
      if (cancelled || data?.role !== 'admin') return;
      setIsAdmin(true);
      const r = await collect();
      if (!cancelled) setRows(r);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // 앱이 실제로 쓰는 경로(enableNativePush)로 requestPermissions → register → 저장까지
  const testRequest = async () => {
    if (testing) return;
    setTesting(true);
    const log: Row[] = [];
    const push = (k: string, v: string) => { log.push([`${log.length + 1}. ${k}`, v]); setSteps([...log]); };
    setSteps([]);
    try {
      const r = await enableNativePush(push);
      push('최종 결과', JSON.stringify(r));
    } catch (e) {
      push('예외', nativePushErrorText(e));
    } finally {
      setTesting(false);
      await run();
    }
  };

  // 서버가 FCM으로 내 기기들에만 발송. 5초 지연은 서버에서 기다린다(그동안 앱을 꺼도 발송됨)
  const sendTest = async (delaySeconds: 0 | 5) => {
    if (sending !== null) return;
    setSending(delaySeconds);
    setSendResult(delaySeconds
      ? [['안내', '5초 뒤 발송돼요 — 지금 홈으로 나가거나 앱을 완전히 꺼 보세요']]
      : [['요청', '발송 중…']]);
    try {
      const res = await fetch('/api/admin/push-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delaySeconds }),
      });
      const body = await res.json().catch(() => null) as {
        ok?: boolean; devices?: number; sent?: number; failed?: number; error?: string; sentAt?: string;
        results?: { device: string; platform: string | null; ok: boolean; messageId: string | null; error: string | null }[];
      } | null;
      const out: Row[] = [['HTTP', String(res.status)]];
      if (!body) out.push(['응답', '본문 없음']);
      else {
        out.push(['결과', body.ok ? '성공' : '실패']);
        if (body.devices !== undefined) out.push(['내 기기 수', String(body.devices)]);
        if (body.sent !== undefined) out.push(['성공 기기 수', `${body.sent} / 실패 ${body.failed ?? 0}`]);
        if (body.error) out.push(['에러', body.error]);
        if (body.sentAt) out.push(['발송 시각', new Date(body.sentAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })]);
        (body.results ?? []).forEach((r, i) =>
          out.push([`기기 ${i + 1} (${r.platform ?? '?'} ${r.device})`, r.ok ? `성공 ${r.messageId ?? ''}` : `실패 — ${r.error}`]));
      }
      setSendResult(out);
    } catch (e) {
      setSendResult([['요청 실패', nativePushErrorText(e)]]);
    } finally {
      setSending(null);
    }
  };

  const resetSheet = () => {
    clearPushPromptDismissed();
    window.location.href = '/';
  };

  if (!isAdmin) return null;

  const btn = 'rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#475569] cursor-pointer disabled:opacity-50';

  return (
    <section className="mt-8 rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-[#475569]">푸시 진단 (관리자 전용)</h2>
        <button type="button" onClick={run} className={btn}>다시 측정</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={testRequest} disabled={testing} className={btn}>
          {testing ? '권한 요청 중…' : '권한 요청 테스트'}
        </button>
        <button type="button" onClick={resetSheet} className={btn}>시트 다시 보기(기록 초기화)</button>
      </div>

      <div className="mt-3 rounded-xl border border-[#E5E7EB] px-3 py-3">
        <p className="text-[12px] font-bold text-[#475569]">테스트 알림 보내기</p>
        <p className="mt-0.5 text-[11px] text-gray-400">
          내 기기들에만 &quot;The Well / 테스트 알림입니다&quot; 1통. 탭하면 공지 목록으로 이동해요.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => sendTest(0)} disabled={sending !== null} className={btn}>
            {sending === 0 ? '보내는 중…' : '지금 보내기'}
          </button>
          <button type="button" onClick={() => sendTest(5)} disabled={sending !== null} className={btn}>
            {sending === 5 ? '5초 뒤 발송 대기…' : '5초 뒤 보내기'}
          </button>
        </div>
        {sendResult && (
          <dl className="mt-2 space-y-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-[12px] break-all select-text">
            {sendResult.map(([k, v], i) => (
              <div key={`${k}-${i}`}>
                <dt className="font-semibold text-[#64748B]">{k}</dt>
                <dd className="font-mono text-[#111827]">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        iOS 권한 창은 기기당 한 번만 떠요. 한 번 허용·거부한 뒤에는 바로 결과만 돌아와요.
        &quot;시트 다시 보기&quot;는 기록을 지우고 홈으로 이동해요(권한이 prompt일 때만 시트가 떠요).
      </p>

      {steps && (
        <dl className="mt-3 space-y-2 rounded-xl bg-[#F8FAFC] px-3 py-3 text-[12px] break-all select-text">
          {steps.length === 0 && <p className="text-gray-400">시작…</p>}
          {steps.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-[#64748B]">{k}</dt>
              <dd className="font-mono text-[#111827]">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {!rows ? (
        <p className="mt-3 text-[12px] text-gray-400">측정 중…</p>
      ) : (
        <dl className="mt-3 space-y-2 text-[12px] break-all select-text">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-[#64748B]">{k}</dt>
              <dd className="font-mono text-[#111827]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-[11px] text-gray-400">이 내용을 길게 눌러 복사해 전달해 주세요.</p>
    </section>
  );
}
