'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('이메일 또는 비밀번호가 올바르지 않아요.');
    else window.location.href = '/';
    setLoading(false);
  }

  async function handleSignup() {
    setLoading(true); setError(''); setMessage('');
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); setLoading(false); return; }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nickname } }
    });
    if (error) setError('오류: ' + error.message);
    else setMessage('✅ 가입 완료! 이메일 인증 후 로그인해주세요.');
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", background: '#F5F5F5', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎓</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{mode === 'login' ? '로그인' : '회원가입'}</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>BUFS 외국인 유학생 커뮤니티</div>
        </div>

        <div style={{ display: 'flex', background: '#F5F5F5', borderRadius: 8, padding: 4, marginBottom: 24 }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage(''); }}
              style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#333' : '#6B7280' }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="이메일"
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="비밀번호 (6자리 이상)"
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff0f0', borderRadius: 8, fontSize: 13, color: '#cc0000' }}>{error}</div>}
        {message && <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fff4', borderRadius: 8, fontSize: 13, color: '#166534' }}>{message}</div>}

        <button onClick={mode === 'login' ? handleLogin : handleSignup} disabled={loading}
          style={{ width: '100%', padding: '13px 0', background: '#F6C21A', color: '#2F2F2F', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 20 }}>
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6B7280' }}>
          <a href="/" style={{ color: '#4A4A4A', textDecoration: 'underline' }}>← 홈으로 돌아가기</a>
        </div>
      </div>
    </div>
  );
}