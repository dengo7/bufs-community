'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import { subscribeToPush } from '../lib/push';
import { setLang as persistLang, LANG_KEY } from '../lib/lang';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
type Mode = 'login' | 'signup';

const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const T = {
  ko: {
    titleLogin: '로그인', titleSignup: '회원가입',
    subtitle: 'BUFS 외국인 유학생 커뮤니티',
    tabLogin: '로그인', tabSignup: '회원가입',
    name: '이름', namePh: '이름을 입력하세요',
    nickname: '닉네임', nicknamePh: '닉네임을 입력하세요',
    nicknameWarn: '실명보다 별명이나 닉네임을 사용해 주세요.',
    email: '이메일', emailPh: '이메일 주소',
    pw: '비밀번호', pwPh: '비밀번호 (6자리 이상)',
    pwNew: '비밀번호', pwNewPh: '비밀번호 설정 (6자리 이상)',
    submit: '로그인', submitSignup: '회원가입',
    or: '또는',
    google: 'Google로 계속하기', kakao: 'Kakao로 계속하기',
    home: '← 홈으로 돌아가기', loading: '처리 중...',
    errLogin: '이메일 또는 비밀번호가 올바르지 않아요.',
    errName: '이름을 입력해주세요.',
    errNickname: '닉네임을 입력해주세요.',
    successSignup: '✅ 가입 완료! 이메일 인증 후 로그인해주세요.',
  },
  en: {
    titleLogin: 'Sign In', titleSignup: 'Sign Up',
    subtitle: 'BUFS International Student Community',
    tabLogin: 'Sign In', tabSignup: 'Sign Up',
    name: 'Name', namePh: 'Your full name',
    nickname: 'Nickname', nicknamePh: 'Enter a nickname',
    nicknameWarn: 'Please use a nickname or alias instead of your real name.',
    email: 'Email', emailPh: 'Email address',
    pw: 'Password', pwPh: 'Password (6+ characters)',
    pwNew: 'Password', pwNewPh: 'Set password (6+ characters)',
    submit: 'Sign In', submitSignup: 'Create Account',
    or: 'or',
    google: 'Continue with Google', kakao: 'Continue with Kakao',
    home: '← Back to Home', loading: 'Processing...',
    errLogin: 'Invalid email or password.',
    errName: 'Please enter your name.',
    errNickname: 'Please enter a nickname.',
    successSignup: '✅ Done! Please check your email to verify.',
  },
  zh: {
    titleLogin: '登录', titleSignup: '注册',
    subtitle: 'BUFS留学生社区',
    tabLogin: '登录', tabSignup: '注册',
    name: '姓名', namePh: '请输入您的姓名',
    nickname: '昵称', nicknamePh: '请输入昵称',
    nicknameWarn: '请使用昵称或别名，而非真实姓名。',
    email: '邮箱', emailPh: '邮箱地址',
    pw: '密码', pwPh: '密码（6位以上）',
    pwNew: '密码', pwNewPh: '设置密码（6位以上）',
    submit: '登录', submitSignup: '注册账号',
    or: '或者',
    google: '使用Google继续', kakao: '使用Kakao继续',
    home: '← 返回首页', loading: '处理中...',
    errLogin: '邮箱或密码不正确。',
    errName: '请输入姓名。',
    errNickname: '请输入昵称。',
    successSignup: '✅ 注册成功！请验证邮箱后登录。',
  },
  ja: {
    titleLogin: 'ログイン', titleSignup: '新規登録',
    subtitle: 'BUFS留学生コミュニティ',
    tabLogin: 'ログイン', tabSignup: '新規登録',
    name: 'お名前', namePh: 'お名前を入力してください',
    nickname: 'ニックネーム', nicknamePh: 'ニックネームを入力してください',
    nicknameWarn: '本名ではなく、ニックネームや別名をご使用ください。',
    email: 'メール', emailPh: 'メールアドレス',
    pw: 'パスワード', pwPh: 'パスワード（6文字以上）',
    pwNew: 'パスワード', pwNewPh: 'パスワード設定（6文字以上）',
    submit: 'ログイン', submitSignup: '登録する',
    or: 'または',
    google: 'Googleで続ける', kakao: 'Kakaoで続ける',
    home: '← ホームへ戻る', loading: '処理中...',
    errLogin: 'メールまたはパスワードが正しくありません。',
    errName: 'お名前を入力してください。',
    errNickname: 'ニックネームを入力してください。',
    successSignup: '✅ 登録完了！メール認証後にログインしてください。',
  },
};

const inputCls =
  'w-full py-3 px-4 text-base border border-gray-200 rounded-xl bg-white text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors placeholder:text-gray-400';

// ── Main page ──────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [lang, setLang] = useState<Lang>('ko');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'lang'>('form');

  const t = T[lang];

  function reset() { setError(''); setMessage(''); }
  function switchMode(m: Mode) { setMode(m); reset(); }

  async function handleLogin() {
    setLoading(true); reset();
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(t.errLogin);
      } else {
        // 로그인 성공 시 푸시 알림 구독 요청 (실패해도 로그인은 정상 진행)
        try {
          await subscribeToPush();
        } catch {
          // 푸시 구독 실패는 무시
        }
        // 언어가 저장돼 있지 않으면 언어 선택 화면 표시, 있으면 바로 홈으로
        const hasLang = typeof window !== 'undefined' && localStorage.getItem(LANG_KEY) !== null;
        if (hasLang) {
          window.location.href = '/';
          return;
        }
        setStep('lang');
      }
    } catch {
      setError(t.errLogin);
    }
    setLoading(false);
  }

  async function handleSignup() {
    setLoading(true); reset();
    if (!name.trim()) { setError(t.errName); setLoading(false); return; }
    if (!nickname.trim()) { setError(t.errNickname); setLoading(false); return; }
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), nickname: nickname.trim() } },
    });
    if (error) setError(error.message);
    else setStep('lang'); // 회원가입 성공 → 언어 선택 화면
    setLoading(false);
  }

  // 언어 선택 → localStorage 저장 후 홈으로 이동
  function chooseLang(l: Lang) {
    persistLang(l);
    window.location.href = '/';
  }

  // ── 언어 선택 화면 ──────────────────────────────────────────
  if (step === 'lang') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-8">
            <div className="text-center mb-7">
              <div className="text-4xl mb-3">🌐</div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">언어 선택</h1>
              <p className="text-sm text-gray-500">Choose your language · 选择语言 · 言語を選択</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => chooseLang(l)}
                  className="py-4 text-base font-bold rounded-xl border border-gray-200 bg-white text-gray-800
                             hover:border-blue-400 hover:bg-blue-50 active:scale-[0.98] transition-all"
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 py-10">
      {/* Language selector */}
      <div className="w-full max-w-md flex justify-end mb-3">
        <select
          value={lang}
          onChange={e => setLang(e.target.value as Lang)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-600 outline-none focus:border-blue-400 transition-colors"
        >
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <option key={l} value={l}>{LANG_LABELS[l]}</option>
          ))}
        </select>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="text-4xl mb-3">🎓</div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {mode === 'login' ? t.titleLogin : t.titleSignup}
            </h1>
            <p className="text-sm text-gray-500">{t.subtitle}</p>
          </div>

          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {(['login', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all active:scale-[0.98] ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? t.tabLogin : t.tabSignup}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3">
            {mode === 'signup' && (
              <>
                {/* 0. 프로필 아바타 */}
                <div className="flex justify-center mb-1">
                  <div className="w-24 h-24 rounded-full bg-gray-300" />
                </div>

                {/* 1. 이름 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.name}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.namePh}
                    autoComplete="name"
                    className={inputCls}
                  />
                </div>

                {/* 2. 닉네임 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.nickname}</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder={t.nicknamePh}
                    autoComplete="nickname"
                    className={inputCls}
                  />
                  <p className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                    <AlertTriangle size={12} />
                    {t.nicknameWarn}
                  </p>
                </div>

              </>
            )}

            {/* 5. 이메일 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.emailPh}
                autoComplete="email"
                className={inputCls}
              />
            </div>

            {/* 6. 비밀번호 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">
                {mode === 'login' ? t.pw : t.pwNew}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'login' ? t.pwPh : t.pwNewPh}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={inputCls}
              />
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="mt-3 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
              {message}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full mt-5 py-3 text-base font-bold rounded-xl bg-blue-500 text-white active:scale-[0.98] transition-all hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t.loading : mode === 'login' ? t.submit : t.submitSignup}
          </button>

          {/* Back */}
          <div className="text-center mt-7">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {t.home}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

