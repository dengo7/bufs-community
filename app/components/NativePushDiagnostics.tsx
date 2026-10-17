'use client';

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from '../lib/supabase/client';
import { isNativePushSupported } from '../lib/nativePush';

/**
 * 관리자 전용 — 앱 푸시 진단 정보 (알림 설정 화면 맨 아래).
 * iOS 실기기에서 권한 창이 뜨지 않는 원인을 Safari 인스펙터 없이 확인하기 위한 임시 표시.
 * 일반 사용자에게는 아무것도 렌더링하지 않는다. 문구는 관리자용이라 한국어만 둔다.
 *
 * checkPermissions 는 nativePush.getNativePushPermission() 을 거치지 않고 플러그인을 직접 불러
 * 에러를 'denied' 로 바꾸지 않고 원문 그대로 보여준다.
 */

type Row = [label: string, value: string];

/** 에러 객체를 가능한 한 원문 그대로 문자열로 */
function errorText(err: unknown): string {
  if (err instanceof Error) {
    const extra = (err as Error & { code?: unknown; data?: unknown });
    const parts = [`${err.name}: ${err.message}`];
    if (extra.code !== undefined) parts.push(`code=${JSON.stringify(extra.code)}`);
    if (extra.data !== undefined) parts.push(`data=${JSON.stringify(extra.data)}`);
    return parts.join(' | ');
  }
  try { return JSON.stringify(err); } catch { return String(err); }
}

async function collect(): Promise<Row[]> {
  const win = window as unknown as {
    Capacitor?: { PluginHeaders?: { name: string }[] };
    webkit?: { messageHandlers?: Record<string, unknown> };
  };
  const rows: Row[] = [];
  const safe = (label: string, fn: () => unknown) => {
    try { rows.push([label, String(fn())]); } catch (e) { rows.push([label, `throw → ${errorText(e)}`]); }
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
    rows.push(['checkPermissions()', JSON.stringify(res)]);
  } catch (e) {
    rows.push(['checkPermissions()', `에러 → ${errorText(e)}`]);
  }

  safe('location', () => window.location.href);
  safe('userAgent', () => navigator.userAgent);
  safe('측정 시각', () => new Date().toISOString());
  return rows;
}

export default function NativePushDiagnostics({ userId }: { userId: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

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

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-[#475569]">푸시 진단 (관리자 전용)</h2>
        <button
          type="button"
          onClick={run}
          className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[12px] font-semibold text-[#475569] cursor-pointer"
        >
          다시 측정
        </button>
      </div>
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
