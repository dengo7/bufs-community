'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../lib/supabase/client';
import { useLang } from '../../lib/lang';

const T = {
  ko: {
    title: '새 비밀번호 설정',
    subtitle: 'BUFS 외국인 유학생 커뮤니티',
    pw: '새 비밀번호', pwPh: '새 비밀번호 (6자리 이상)',
    pw2: '비밀번호 확인', pw2Ph: '새 비밀번호를 한 번 더 입력하세요',
    submit: '비밀번호 변경', loading: '처리 중...', checking: '확인 중...',
    errShort: '비밀번호는 6자리 이상이어야 해요.',
    errMismatch: '비밀번호가 일치하지 않아요.',
    errUpdate: '비밀번호 변경에 실패했어요. 잠시 후 다시 시도해주세요.',
    expiredTitle: '링크가 만료됐어요',
    expiredDesc: '비밀번호 재설정 링크가 만료됐거나 올바르지 않아요. 로그인 화면에서 다시 요청해주세요.',
    goLogin: '로그인 화면으로',
    done: '✅ 비밀번호가 변경됐어요. 로그인 화면으로 이동할게요...',
  },
  en: {
    title: 'Set New Password',
    subtitle: 'BUFS International Student Community',
    pw: 'New Password', pwPh: 'New password (6+ characters)',
    pw2: 'Confirm Password', pw2Ph: 'Enter the new password again',
    submit: 'Change Password', loading: 'Processing...', checking: 'Checking...',
    errShort: 'Password must be at least 6 characters.',
    errMismatch: 'Passwords do not match.',
    errUpdate: 'Failed to change password. Please try again later.',
    expiredTitle: 'Link Expired',
    expiredDesc: 'This password reset link has expired or is invalid. Please request a new one from the sign-in page.',
    goLogin: 'Go to Sign In',
    done: '✅ Password changed. Taking you to sign in...',
  },
  zh: {
    title: '设置新密码',
    subtitle: 'BUFS留学生社区',
    pw: '新密码', pwPh: '新密码（6位以上）',
    pw2: '确认密码', pw2Ph: '请再次输入新密码',
    submit: '修改密码', loading: '处理中...', checking: '确认中...',
    errShort: '密码至少需要6位。',
    errMismatch: '两次输入的密码不一致。',
    errUpdate: '密码修改失败，请稍后重试。',
    expiredTitle: '链接已过期',
    expiredDesc: '密码重置链接已过期或无效。请在登录页面重新申请。',
    goLogin: '前往登录',
    done: '✅ 密码已修改。即将跳转到登录页面...',
  },
  ja: {
    title: '新しいパスワードの設定',
    subtitle: 'BUFS留学生コミュニティ',
    pw: '新しいパスワード', pwPh: '新しいパスワード（6文字以上）',
    pw2: 'パスワード確認', pw2Ph: '新しいパスワードをもう一度入力してください',
    submit: 'パスワードを変更', loading: '処理中...', checking: '確認中...',
    errShort: 'パスワードは6文字以上にしてください。',
    errMismatch: 'パスワードが一致しません。',
    errUpdate: 'パスワードの変更に失敗しました。しばらくしてからもう一度お試しください。',
    expiredTitle: 'リンクの有効期限が切れています',
    expiredDesc: 'パスワード再設定リンクの有効期限が切れているか、無効です。ログイン画面から再度リクエストしてください。',
    goLogin: 'ログイン画面へ',
    done: '✅ パスワードを変更しました。ログイン画面へ移動します...',
  },
};

const inputCls =
  'w-full py-3 px-4 text-base border border-gray-200 rounded-xl bg-white text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder:text-gray-400';

// 메일 링크 → /auth/callback(PKCE 코드 교환) → 세션이 잡힌 채 이 페이지 도착.
// 세션이 없으면 만료/잘못된 링크로 보고 재요청을 안내한다.
type Status = 'checking' | 'ready' | 'expired' | 'done';

export default function ResetPasswordPage() {
  const lang = useLang();
  const t = T[lang];

  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then((res: { data: { session: unknown } }) => {
      setStatus(res.data.session ? 'ready' : 'expired');
    });
  }, []);

  async function handleSubmit() {
    setError('');
    if (password.length < 6) { setError(t.errShort); return; }
    if (password !== confirm) { setError(t.errMismatch); return; }
    setLoading(true);
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(t.errUpdate);
      setLoading(false);
      return;
    }
    setStatus('done');
    // 새 비밀번호로 다시 로그인하도록 세션을 정리한 뒤 이동
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = '/auth'; }, 2500);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-8">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="text-4xl mb-3">🔒</div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {status === 'expired' ? t.expiredTitle : t.title}
            </h1>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>

          {status === 'checking' && (
            <p className="text-center text-sm text-gray-400 py-6">{t.checking}</p>
          )}

          {status === 'expired' && (
            <>
              <p className="text-sm text-gray-600 text-center mb-6">{t.expiredDesc}</p>
              <a
                href="/auth"
                className="block w-full py-3 text-base font-bold text-center rounded-xl bg-blue-500 text-white no-underline active:scale-[0.98] transition-all hover:bg-blue-600"
              >
                {t.goLogin}
              </a>
            </>
          )}

          {status === 'ready' && (
            <>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.pw}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t.pwPh}
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.pw2}</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder={t.pw2Ph}
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-5 py-3 text-base font-bold rounded-xl bg-blue-500 text-white active:scale-[0.98] transition-all hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? t.loading : t.submit}
              </button>
            </>
          )}

          {status === 'done' && (
            <div className="px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 text-center">
              {t.done}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
