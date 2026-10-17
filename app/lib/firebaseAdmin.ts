// 서버 전용 — firebase-admin 초기화.
// FIREBASE_SERVICE_ACCOUNT_JSON 은 서비스 계정 JSON 전체(원문 또는 base64)다.
// 값은 절대 로그·응답에 내보내지 않는다. (route.ts 의 nodejs 런타임에서만 import 할 것)
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return v !== null && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** 환경변수를 서비스 계정 객체로 읽는다. 원문 JSON → 실패 시 base64 로 재시도. */
export function readServiceAccount(raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON): ServiceAccount | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;

  let parsed = tryParse(value);
  if (!parsed) {
    try {
      parsed = tryParse(Buffer.from(value, 'base64').toString('utf8'));
    } catch {
      parsed = null;
    }
  }
  if (!parsed) return null;

  const { project_id, client_email, private_key } = parsed;
  if (
    typeof project_id !== 'string' || !project_id.trim() ||
    typeof client_email !== 'string' || !client_email.trim() ||
    typeof private_key !== 'string' || !private_key.trim()
  ) {
    return null;
  }
  // Vercel 에 붙여 넣을 때 개행이 "\n" 문자열로 들어가는 경우를 보정
  return { project_id, client_email, private_key: private_key.replace(/\\n/g, '\n') };
}

let app: App | null = null;

/** 서비스 계정이 없거나 잘못되면 null. 호출부는 "FCM 미설정"으로 처리한다. */
export function getFirebaseMessaging(): Messaging | null {
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const sa = readServiceAccount();
      if (!sa) return null;
      app = initializeApp({
        credential: cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key,
        }),
      });
    }
  }
  return getMessaging(app);
}
