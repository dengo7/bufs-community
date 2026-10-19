'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { encode } from 'uqr';
import { ArrowLeft, Download, KeyRound, QrCode, RefreshCw, ShieldAlert } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { checkinUrl, currentUserId, STICKER_LINES } from '../../lib/partners';

/**
 * 관리자 전용 — 제휴 가게 매장 QR 코드 발급·재발급, 직원 PIN 설정, QR 스티커 이미지 내려받기.
 * 화면 문구는 관리자용이라 한국어만 둔다.
 *
 * 보안: 매장 QR은 계산대에 공개로 붙는 값이라 관리자에게는 언제든 다시 보여준다(017,
 * 관리자 전용 RPC partner_admin_get_code). 화면 메모리(state)에만 두고 콘솔·저장소·로그에는 남기지 않는다.
 * 적립 검증은 DB의 해시로 한다. 직원 PIN은 입력 즉시 RPC로 보내고 입력칸을 비우며,
 * bcrypt 해시로만 저장돼 다시 볼 수 없다.
 */

// welcome_reward: null = 016 적용 전, enforce_hours: null = 020 적용 전(컬럼 없음)
type AdminStore = {
  id: string; slug: string; name: string; active: boolean; stamps_per_reward: number;
  welcome_reward: boolean | null; enforce_hours: boolean | null;
};
type SecretStatus = { store_id: string; has_code: boolean; has_pin: boolean; updated_at: string | null };

export default function AdminPartnersView() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'forbidden' | 'unavailable' | 'ready'>('loading');
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [secrets, setSecrets] = useState<Map<string, SecretStatus>>(new Map());

  const load = useCallback(async () => {
    const client = getSupabaseClient();
    const base = 'id, slug, name, active, stamps_per_reward';
    // 마이그레이션 적용 전 컬럼은 42703 → 최신 컬럼부터 하나씩 빼고 다시 읽는다
    const tiers = [`${base}, welcome_reward, enforce_hours`, `${base}, welcome_reward`, base];
    const [first, sec] = await Promise.all([
      client.from('partner_stores').select(tiers[0]).order('sort_order'),
      client.rpc('partner_admin_secret_status'),
    ]);
    let s = first;
    for (let i = 1; s.error?.code === '42703' && i < tiers.length; i++) {
      s = await client.from('partner_stores').select(tiers[i]).order('sort_order');
    }
    if (s.error || sec.error) { setState('unavailable'); return; }
    type Row = Omit<AdminStore, 'welcome_reward' | 'enforce_hours'> & { welcome_reward?: boolean; enforce_hours?: boolean };
    setStores(((s.data ?? []) as unknown as Row[]).map(x => ({
      ...x,
      welcome_reward: typeof x.welcome_reward === 'boolean' ? x.welcome_reward : null,
      enforce_hours: typeof x.enforce_hours === 'boolean' ? x.enforce_hours : null,
    })));
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

// 현재 QR 상태 — unsupported: 017 적용 전(다시 보기 RPC 없음), missing: 017 이전에 발급돼 원본이 없음
type QrState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'missing' }
  | { kind: 'unsupported' }
  | { kind: 'code'; code: string };

/** PostgREST: RPC 함수가 없으면 PGRST202 (017 적용 전) */
const isMissingFunction = (error: { code?: string } | null) => error?.code === 'PGRST202' || error?.code === '42883';

function StoreAdminCard({ store, secret, onChanged }: { store: AdminStore; secret?: SecretStatus; onChanged: () => Promise<void> }) {
  const [qr, setQr] = useState<QrState>({ kind: 'loading' });
  const [sticker, setSticker] = useState<string | null>(null);   // PNG data URL
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const hasCode = !!secret?.has_code;

  // 현재 QR 원본 불러오기 (관리자 전용 RPC)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasCode) { if (!cancelled) setQr({ kind: 'none' }); return; }
      const { data, error } = await getSupabaseClient().rpc('partner_admin_get_code', { p_store_id: store.id });
      if (cancelled) return;
      if (isMissingFunction(error)) setQr(prev => (prev.kind === 'code' ? prev : { kind: 'unsupported' }));
      else if (error) setQr({ kind: 'unsupported' });
      else if (typeof data === 'string' && data) setQr({ kind: 'code', code: data });
      else setQr({ kind: 'missing' });
    })();
    return () => { cancelled = true; };
  }, [hasCode, store.id]);

  // QR이 정해지면 스티커 이미지를 만든다
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = qr.kind === 'code' ? await drawSticker(store.name, checkinUrl(store.slug, qr.code)) : null;
      if (!cancelled) setSticker(url);
    })();
    return () => { cancelled = true; };
  }, [qr, store.name, store.slug]);

  async function issueCode() {
    setConfirmOpen(false);
    setBusy(true); setMsg(null);
    const { data, error } = await getSupabaseClient().rpc('partner_admin_issue_code', { p_store_id: store.id });
    if (error || typeof data !== 'string') {
      setMsg({ ok: false, text: 'QR 코드 발급에 실패했어요.' });
    } else {
      const reviewable = qr.kind !== 'unsupported';
      setQr({ kind: 'code', code: data });
      setMsg({
        ok: true,
        text: reviewable
          ? 'QR 코드를 발급했어요. 새 스티커를 출력해 계산대에 붙여 주세요.'
          : 'QR 코드를 발급했어요. 지금 스티커를 내려받으세요 — 017 적용 전이라 이 화면을 벗어나면 다시 볼 수 없어요.',
      });
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
        QR 코드 {hasCode ? '발급됨' : '없음'} · 직원 PIN {secret?.has_pin ? '설정됨' : '없음'}
      </p>
      {/* 혜택 설정 (보기 전용 — 바꾸려면 Supabase Table Editor) */}
      <dl className="mt-2 grid grid-cols-2 gap-2 text-[12.5px]">
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2">
          <dt className="text-[#94A3B8] font-semibold">첫 방문 웰컴 쿠폰 (welcome_reward)</dt>
          <dd className="mt-0.5 font-bold text-[#111827]">
            {store.welcome_reward === null ? '016 적용 전' : store.welcome_reward ? '켜짐' : '꺼짐'}
          </dd>
        </div>
        <div className="rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2">
          <dt className="text-[#94A3B8] font-semibold">쿠폰 주기 (stamps_per_reward)</dt>
          <dd className="mt-0.5 font-bold text-[#111827]">스탬프 {store.stamps_per_reward}개마다</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2">
          <dt className="text-[#94A3B8] font-semibold">영업시간 제한 (enforce_hours)</dt>
          <dd className="mt-0.5 font-bold text-[#111827]">
            {store.enforce_hours === null
              ? '020 적용 전 — 영업시간에만 적립'
              : store.enforce_hours ? '켜짐 — 영업시간에만 적립' : '꺼짐 — 시간 상관없이 적립'}
          </dd>
        </div>
      </dl>

      {/* 현재 QR · 스티커 */}
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]"><QrCode size={15} /> 현재 매장 QR</p>

        {qr.kind === 'loading' && <div className="mt-3 mx-auto h-64 max-w-[300px] rounded-lg bg-gray-100 animate-pulse" />}
        {qr.kind === 'none' && <p className="mt-2 text-[13px] text-[#64748B]">아직 발급한 QR이 없어요. 아래에서 발급해 주세요.</p>}
        {qr.kind === 'missing' && (
          <p className="mt-2 rounded-xl bg-[#FFF8E6] border border-[#F5E1A4] px-3 py-2.5 text-[13px] text-[#7A5B00] leading-snug">
            QR을 다시 보려면 한 번 재발급해 주세요. 이전 버전에서 발급한 QR은 원본이 저장돼 있지 않아요.
            (재발급하면 지금 붙어 있는 스티커는 바로 쓸 수 없게 되니 새 스티커로 바꿔 붙여 주세요)
          </p>
        )}
        {qr.kind === 'unsupported' && (
          <p className="mt-2 text-[13px] text-[#64748B] leading-snug">
            QR 다시 보기는 017 마이그레이션 적용 후에 쓸 수 있어요. 지금은 발급 직후에만 볼 수 있어요.
          </p>
        )}

        {sticker && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sticker} alt={`${store.name} QR 스티커`} className="mt-3 mx-auto w-full max-w-[300px] rounded-lg border border-[#E5E7EB] bg-white" />
            <a
              href={sticker}
              download={`the-well-qr-${store.slug}.png`}
              className="mt-3 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-[#111827] text-[14px] font-semibold text-white no-underline"
            >
              <Download size={17} /> 스티커 이미지 내려받기 (PNG)
            </a>
            <p className="mt-2 text-[11.5px] text-[#64748B]">앱 안에서 내려받기가 안 되면 이미지를 길게 눌러 저장하세요.</p>
          </>
        )}

        <button
          type="button"
          onClick={() => (hasCode ? setConfirmOpen(true) : issueCode())}
          disabled={busy || qr.kind === 'loading'}
          className={`mt-3 h-11 w-full inline-flex items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold cursor-pointer disabled:opacity-50
            ${hasCode ? 'bg-white text-[#B91C1C] border border-[#FECACA]' : 'bg-[#1D4ED8] text-white border-none'}`}
        >
          <RefreshCw size={16} />
          {hasCode ? 'QR 코드 재발급' : 'QR 코드 발급'}
        </button>
      </div>

      {/* 직원 PIN — 해시로만 저장하고 다시 보여주지 않는다 */}
      <div className="mt-5">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#334155]"><KeyRound size={15} /> 직원 PIN {secret?.has_pin ? '변경' : '설정'}</p>
        <p className="mt-1 text-[11.5px] text-[#94A3B8]">PIN은 저장 후 다시 볼 수 없어요. 잊으면 새로 설정해 주세요.</p>
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

      {/* 재발급 확인창 (브라우저 confirm 대신 화면 안 모달 — 앱 WebView에서도 같은 모양) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 px-6" role="dialog" aria-modal="true" aria-labelledby={`reissue-${store.id}`}>
          <div className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-xl">
            <p id={`reissue-${store.id}`} className="text-[16px] font-extrabold">QR 코드를 재발급할까요?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#475569]">
              기존 스티커는 바로 쓸 수 없게 돼요. 새 스티커를 출력해 계산대에 다시 붙여 주세요.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)}
                className="flex-1 h-11 rounded-xl border border-[#E5E7EB] bg-white text-[14px] font-semibold cursor-pointer">
                취소
              </button>
              <button type="button" onClick={issueCode}
                className="flex-1 h-11 rounded-xl bg-[#B91C1C] text-[14px] font-semibold text-white border-none cursor-pointer">
                재발급
              </button>
            </div>
          </div>
        </div>
      )}
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
