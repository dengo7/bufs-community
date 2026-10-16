'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { encode } from 'uqr';
import { ArrowLeft, Download, KeyRound, QrCode, ShieldAlert } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { checkinUrl, currentUserId, STICKER_LINES } from '../../lib/partners';

/**
 * 관리자 전용 — 제휴 가게 매장 QR 코드 발급·재발급, 직원 PIN 설정, QR 스티커 이미지 내려받기.
 * 화면 문구는 관리자용이라 한국어만 둔다.
 *
 * 보안: QR 코드 원문은 발급 RPC 응답으로 한 번만 받아 이 화면의 메모리(state)에만 둔다.
 * 콘솔·저장소·로그에 남기지 않고, 화면을 벗어나면 다시 볼 수 없다(필요하면 재발급).
 * PIN은 입력 즉시 RPC로 보내고 입력칸을 비운다. DB에는 둘 다 해시만 저장된다.
 */

type AdminStore = { id: string; slug: string; name: string; active: boolean; stamps_per_reward: number };
type SecretStatus = { store_id: string; has_code: boolean; has_pin: boolean; updated_at: string | null };

export default function AdminPartnersView() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'forbidden' | 'unavailable' | 'ready'>('loading');
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [secrets, setSecrets] = useState<Map<string, SecretStatus>>(new Map());

  const load = useCallback(async () => {
    const client = getSupabaseClient();
    const [s, sec] = await Promise.all([
      client.from('partner_stores').select('id, slug, name, active, stamps_per_reward').order('sort_order'),
      client.rpc('partner_admin_secret_status'),
    ]);
    if (s.error || sec.error) { setState('unavailable'); return; }
    setStores((s.data ?? []) as AdminStore[]);
    setSecrets(new Map(((sec.data ?? []) as SecretStatus[]).map(x => [x.store_id, x])));
    setState('ready');
  }, []);

  useEffect(() => {
    (async () => {
      const uid = await currentUserId();
      if (!uid) { window.location.href = `/auth?next=${encodeURIComponent('/admin/partners')}`; return; }
      const { data } = await getSupabaseClient().from('profiles').select('role').eq('id', uid).single();
      if (data?.role !== 'admin') { setState('forbidden'); return; }
      await load();
    })();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-[720px] mx-auto flex items-center min-h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로"
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <p className="text-[15px] font-bold">제휴 가게 관리</p>
        </div>
      </header>

      <div className="max-w-[720px] mx-auto px-4 pt-4 pb-safe space-y-4">
        {state === 'loading' && <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />}
        {state === 'forbidden' && (
          <p className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white py-12 text-[14px] text-gray-500">
            <ShieldAlert size={18} /> 관리자만 볼 수 있는 화면이에요
          </p>
        )}
        {state === 'unavailable' && (
          <p className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-10 text-center text-[14px] text-gray-500">
            스탬프 기능이 아직 준비되지 않았어요. (015 마이그레이션 적용 후 사용 가능)
          </p>
        )}
        {state === 'ready' && stores.map(store => (
          <StoreAdminCard key={store.id} store={store} secret={secrets.get(store.id)} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function StoreAdminCard({ store, secret, onChanged }: { store: AdminStore; secret?: SecretStatus; onChanged: () => Promise<void> }) {
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [sticker, setSticker] = useState<string | null>(null);   // PNG data URL (코드 원문은 보관하지 않음)
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function issueCode() {
    if (secret?.has_code && !confirmReissue) { setConfirmReissue(true); return; }
    setBusy(true); setMsg(null); setConfirmReissue(false);
    const { data, error } = await getSupabaseClient().rpc('partner_admin_issue_code', { p_store_id: store.id });
    if (error || typeof data !== 'string') {
      setMsg({ ok: false, text: 'QR 코드 발급에 실패했어요.' });
    } else {
      setSticker(await drawSticker(store.name, checkinUrl(store.slug, data)));
      setMsg({ ok: true, text: 'QR 코드를 발급했어요. 지금 스티커 이미지를 내려받으세요 — 이 화면을 벗어나면 다시 볼 수 없어요.' });
      await onChanged();
    }
    setBusy(false);
  }

  async function savePin() {
    if (!/^\d{4}$/.test(pin)) { setMsg({ ok: false, text: 'PIN은 숫자 4자리예요.' }); return; }
    if (pin !== pin2) { setMsg({ ok: false, text: '두 PIN이 서로 달라요.' }); return; }
    setBusy(true); setMsg(null);
    const { error } = await getSupabaseClient().rpc('partner_admin_set_pin', { p_store_id: store.id, p_pin: pin });
    setPin(''); setPin2('');
    setMsg(error ? { ok: false, text: 'PIN 저장에 실패했어요.' } : { ok: true, text: '직원 PIN을 저장했어요. (이 가게의 PIN 잠금도 초기화됨)' });
    if (!error) await onChanged();
    setBusy(false);
  }

  const pinInputCls = 'w-24 h-11 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-center text-[18px] tracking-[0.4em] font-bold outline-none focus:border-[#1D4ED8]';

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[17px] font-extrabold">{store.name}</h2>
        <span className="text-[12px] text-[#94A3B8]">/{store.slug}</span>
        {!store.active && <span className="text-[11px] font-bold text-[#B91C1C]">비활성</span>}
      </div>
      <p className="mt-1 text-[12.5px] text-[#64748B]">
        QR 코드 {secret?.has_code ? '발급됨' : '없음'} · 직원 PIN {secret?.has_pin ? '설정됨' : '없음'} · 스탬프 {store.stamps_per_reward}개마다 쿠폰
      </p>

      {/* QR 코드 */}
      <div className="mt-4">
        <button
          type="button"
          onClick={issueCode}
          disabled={busy}
          className={`h-11 px-4 inline-flex items-center gap-1.5 rounded-xl text-[14px] font-semibold border-none cursor-pointer disabled:opacity-50
            ${confirmReissue ? 'bg-[#B91C1C] text-white' : 'bg-[#1D4ED8] text-white'}`}
        >
          <QrCode size={17} />
          {!secret?.has_code ? 'QR 코드 발급' : confirmReissue ? '한 번 더 누르면 재발급 (기존 스티커 즉시 무효)' : 'QR 코드 재발급'}
        </button>
        {confirmReissue && (
          <button type="button" onClick={() => setConfirmReissue(false)}
            className="ml-2 h-11 px-3 rounded-xl border border-[#E5E7EB] bg-white text-[13px] cursor-pointer">
            취소
          </button>
        )}
      </div>

      {sticker && (
        <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sticker} alt={`${store.name} QR 스티커`} className="mx-auto w-full max-w-[300px] rounded-lg border border-[#E5E7EB] bg-white" />
          <a
            href={sticker}
            download={`the-well-qr-${store.slug}.png`}
            className="mt-3 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#111827] text-[14px] font-semibold text-white no-underline"
          >
            <Download size={17} /> 스티커 이미지 내려받기 (PNG)
          </a>
          <p className="mt-2 text-[11.5px] text-[#64748B]">앱 안에서 내려받기가 안 되면 이미지를 길게 눌러 저장하세요.</p>
        </div>
      )}

      {/* 직원 PIN */}
      <div className="mt-5">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]"><KeyRound size={15} /> 직원 PIN {secret?.has_pin ? '변경' : '설정'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} placeholder="PIN"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className={pinInputCls} aria-label="새 PIN" />
          <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} placeholder="확인"
            value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))} className={pinInputCls} aria-label="PIN 확인" />
          <button type="button" onClick={savePin} disabled={busy || pin.length !== 4 || pin2.length !== 4}
            className="h-11 px-4 rounded-xl bg-[#111827] text-[14px] font-semibold text-white border-none cursor-pointer disabled:opacity-40">
            PIN 저장
          </button>
        </div>
      </div>

      {msg && <p className={`mt-3 text-[13px] font-semibold ${msg.ok ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>{msg.text}</p>}
    </section>
  );
}

/** 인쇄용 QR 스티커 (1200×1600, PNG data URL). QR + 가게 이름 + 4개 언어 안내 */
async function drawSticker(storeName: string, url: string): Promise<string> {
  const W = 1200, H = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1D4ED8';
  ctx.lineWidth = 16;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  const font = (weight: number, size: number) =>
    `${weight} ${size}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "PingFang SC", "Hiragino Sans", "Noto Sans CJK", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#1D4ED8';
  ctx.font = font(800, 92);
  ctx.fillText('The Well', W / 2, 190);
  ctx.fillStyle = '#111827';
  ctx.font = font(700, 58);
  ctx.fillText(storeName, W / 2, 280);

  // QR (오류 정정 M, 여백 4모듈 — 스티커 인쇄·조명 반사에 여유)
  const qr = encode(url, { ecc: 'M', border: 4 });
  const qrPx = 820;
  const cell = Math.floor(qrPx / qr.size);
  const drawn = cell * qr.size;
  const x0 = Math.round((W - drawn) / 2), y0 = 340;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.data[y][x]) ctx.fillRect(x0 + x * cell, y0 + y * cell, cell, cell);
    }
  }

  let ty = y0 + drawn + 110;
  ctx.fillStyle = '#111827';
  STICKER_LINES.forEach((line, i) => {
    ctx.font = font(i === 0 ? 800 : 600, i === 0 ? 56 : 44);
    ctx.fillText(line, W / 2, ty);
    ty += i === 0 ? 78 : 66;
  });

  return canvas.toDataURL('image/png');
}
