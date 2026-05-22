'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const BOARDS = [
  { id: 'campustalk', ko: '캠퍼스톡', en: 'Campus Talk', icon: '💬' },
  { id: 'lifeinfo',   ko: '생활정보',  en: 'Life Info',   icon: '🗺️' },
  { id: 'career',     ko: '취업·진로', en: 'Career',       icon: '💼' },
  { id: 'club',       ko: '동아리·모임', en: 'Clubs',      icon: '🤝' },
  { id: 'korea',      ko: '한국소식',  en: 'Korea News',   icon: '🇰🇷' },
] as const;

const QUICK_MENUS = [
  { icon: '🛂', ko: '비자',     en: 'Visa' },
  { icon: '🏠', ko: '부동산',   en: 'Housing' },
  { icon: '🏦', ko: '은행',     en: 'Bank' },
  { icon: '📱', ko: '휴대폰',   en: 'Phone' },
  { icon: '🛡️', ko: '보험',     en: 'Insurance' },
  { icon: '🏥', ko: '병원',     en: 'Hospital' },
  { icon: '💼', ko: '알바',     en: 'Part-time' },
  { icon: '🎓', ko: '학교생활', en: 'Campus' },
];

type BoardId = typeof BOARDS[number]['id'];

interface Comment { id: number; post_id: number; author: string; body: string; created_at: string; }
interface Post { id: number; board: BoardId; title: string; body: string; author: string; created_at: string; likes: number; }

const NAV_ITEMS = [
  { id: 'home', ko: '게시판', en: 'Boards' },
  { id: 'timetable', ko: '시간표', en: 'Timetable' },
  { id: 'lecture', ko: '강의실', en: 'Lecture' },
  { id: 'grade', ko: '학점계산기', en: 'GPA Calc' },
  { id: 'friend', ko: '친구', en: 'Friends' },
  { id: 'book', ko: '책방', en: 'Books' },
  { id: 'campus', ko: '캠퍼스픽', en: 'Campus' },
];

export default function Home() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [activeBoard, setActiveBoard] = useState<BoardId | 'home'>('home');
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardPreviews, setBoardPreviews] = useState<Record<string, Post[]>>({});
  const [cmtInput, setCmtInput] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newBoard, setNewBoard] = useState<BoardId>('campustalk');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Mobile UI states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBoardSheet, setShowBoardSheet] = useState(false);

  const boardName = (id: BoardId) => { const b = BOARDS.find(x => x.id === id)!; return lang === 'ko' ? b.ko : b.en; };
  const filteredPosts = posts.filter(p => search === '' || p.title.includes(search));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    loadBoardPreviews();
  }, []);

  useEffect(() => {
    if (activeBoard !== 'home') loadPosts(activeBoard as BoardId);
  }, [activeBoard]);

  async function loadBoardPreviews() {
    setLoading(true);
    const previews: Record<string, Post[]> = {};
    for (const b of BOARDS) {
      const { data } = await supabase.from('posts').select('*').eq('board', b.id).order('created_at', { ascending: false }).limit(4);
      previews[b.id] = data || [];
    }
    setBoardPreviews(previews);
    setLoading(false);
  }

  async function loadPosts(boardId: BoardId) {
    setLoading(true);
    const { data } = await supabase.from('posts').select('*').eq('board', boardId).order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }

  async function loadComments(postId: number) {
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });
    setComments(data || []);
  }

  async function openPost(p: Post) { setCurrentPost(p); setLiked(false); await loadComments(p.id); }
  function closePost() { setCurrentPost(null); setComments([]); }

  async function toggleLike() {
    if (!currentPost) return;
    const next = !liked; setLiked(next);
    const newLikes = currentPost.likes + (next ? 1 : -1);
    await supabase.from('posts').update({ likes: newLikes }).eq('id', currentPost.id);
    setCurrentPost(prev => prev ? { ...prev, likes: newLikes } : prev);
    setPosts(prev => prev.map(p => p.id === currentPost.id ? { ...p, likes: newLikes } : p));
  }

  async function submitComment() {
    if (!cmtInput.trim() || !currentPost) return;
    const author = user?.user_metadata?.nickname || '익명';
    const { data } = await supabase.from('comments').insert({ post_id: currentPost.id, author, body: cmtInput }).select().single();
    if (data) setComments(prev => [...prev, data]);
    setCmtInput('');
  }

  async function submitPost() {
    if (!newTitle.trim() || !newBody.trim()) return;
    const author = user?.user_metadata?.nickname || '익명';
    const { data } = await supabase.from('posts').insert({ board: newBoard, title: newTitle, body: newBody, author, likes: 0 }).select().single();
    if (data) {
      setPosts(prev => [data, ...prev]);
      setBoardPreviews(prev => ({ ...prev, [newBoard]: [data, ...(prev[newBoard] || []).slice(0, 3)] }));
    }
    setNewTitle(''); setNewBody(''); setShowWrite(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  const formatTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return '방금';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* ══════════════════════════════════════════
          MOBILE HEADER  (xl 미만)
          에브리타임 스타일: 흰 배경 + 로고 + 아이콘
      ══════════════════════════════════════════ */}
      <header className="xl:hidden sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="flex items-center h-[54px] px-4">

          {/* 로고 + 학교명 */}
          <div
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
            onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
          >
            <div className="bg-[#2F2F2F] rounded-[5px] px-[7px] py-[5px] grid grid-cols-2 gap-px shrink-0">
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[10px] font-extrabold text-white leading-none">F</span>
              <span className="text-[10px] font-extrabold text-white leading-none">S</span>
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-[#1A1A1A] leading-none truncate">부산외국어대학교</div>
              <div className="text-[10px] text-[#AAAAAA] mt-[3px]">BUFS Community</div>
            </div>
          </div>

          {/* 오른쪽: 언어토글 + 아이콘 3개 */}
          <div className="flex items-center shrink-0 ml-2 gap-1.5">

            {/* KR / EN 토글 */}
            <div className="flex items-center border border-[#F6C21A] rounded-full overflow-hidden text-[11px] font-bold">
              <button
                onClick={() => setLang('ko')}
                className={`px-2.5 py-1 border-none cursor-pointer transition-colors
                  ${lang === 'ko' ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#F6C21A]'}`}
              >
                KR
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 border-none cursor-pointer transition-colors
                  ${lang === 'en' ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#F6C21A]'}`}
              >
                EN
              </button>
            </div>

            {/* 검색 */}
            <button className="w-9 h-9 flex items-center justify-center text-[#444] bg-transparent border-none cursor-pointer" aria-label="검색">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            {/* 알림 */}
            <button className="w-9 h-9 flex items-center justify-center text-[#444] bg-transparent border-none cursor-pointer" aria-label="알림">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {/* 프로필 */}
            {user ? (
              <button className="w-9 h-9 flex items-center justify-center text-[#444] bg-transparent border-none cursor-pointer" aria-label="프로필">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            ) : (
              <a href="/auth" className="w-9 h-9 flex items-center justify-center text-[#444] no-underline" aria-label="로그인">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </a>
            )}
          </div>        {/* /오른쪽 */}
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE BOARD TAB BAR  (xl 미만)
          sticky: 모바일 헤더 바로 아래
      ══════════════════════════════════════════ */}
      <div className="xl:hidden sticky top-[54px] z-[150] bg-white border-b border-[#EBEBEB]">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2">
          <button
            onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
            className={`px-3 py-2.5 text-[13px] whitespace-nowrap border-none bg-transparent cursor-pointer border-b-2 transition-colors
              ${activeBoard === 'home' ? 'text-[#F6C21A] border-b-[#F6C21A] font-bold' : 'text-[#888] border-b-transparent font-medium'}`}
          >
            {lang === 'ko' ? '전체' : 'All'}
          </button>
          {BOARDS.map(b => (
            <button
              key={b.id}
              onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
              className={`px-3 py-2.5 text-[13px] whitespace-nowrap border-none bg-transparent cursor-pointer border-b-2 transition-colors
                ${activeBoard === b.id ? 'text-[#F6C21A] border-b-[#F6C21A] font-bold' : 'text-[#888] border-b-transparent font-medium'}`}
            >
              {lang === 'ko' ? b.ko : b.en}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP NAV  (xl 이상)
          기존 다크 네비게이션 유지
      ══════════════════════════════════════════ */}
      <nav className="hidden xl:block bg-[#2F2F2F] sticky top-0 z-[200] shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
        <div className="max-w-[1400px] mx-auto px-7 flex items-center h-[68px]">

          <div
            className="flex items-center gap-3 mr-11 cursor-pointer shrink-0"
            onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
          >
            <div className="bg-[#4A4A4A] rounded-[6px] px-2 py-1 grid grid-cols-2 gap-px">
              <span className="text-[13px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[13px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[13px] font-extrabold text-white leading-none">F</span>
              <span className="text-[13px] font-extrabold text-white leading-none">S</span>
            </div>
            <div>
              <div className="font-normal text-[19px] text-white leading-[1.1]">부산외국어대학교</div>
              <div className="text-[11px] text-[#aaa] leading-[1.3]">Busan University of Foreign Studies</div>
              <div className="text-[11px] text-[#F6C21A] leading-[1.5] mt-0.5">
                {lang === 'ko' ? '외국인 유학생을 위한 BUFS 생활 커뮤니티' : 'BUFS Community for International Students'}
              </div>
            </div>
          </div>

          <div className="flex">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => { if (item.id === 'home') { setActiveBoard('home'); setCurrentPost(null); } }}
                className={`px-[18px] h-[68px] border-none bg-transparent text-base cursor-pointer border-b-[3px] transition-colors
                  ${item.id === 'home' ? 'font-bold text-[#F6C21A] border-b-[#F6C21A]' : 'font-normal text-[#ccc] border-b-transparent'}`}
              >
                {lang === 'ko' ? item.ko : item.en}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
              className="px-[14px] py-[7px] border border-[#666] rounded-full bg-transparent text-sm cursor-pointer font-medium text-[#ddd]"
            >
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[#F6C21A] text-sm font-semibold">{user.user_metadata?.nickname || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-transparent text-[#ddd] border border-[#666] rounded-full text-sm cursor-pointer"
                >
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              </div>
            ) : (
              <a href="/auth" className="px-[22px] py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-[15px] font-bold no-underline">
                {lang === 'ko' ? '로그인' : 'Sign In'}
              </a>
            )}
          </div>
        </div>

        {/* 데스크톱 게시판 탭바 */}
        <div className="bg-[#3a3a3a] border-t border-[#555]">
          <div className="max-w-[1400px] mx-auto px-7 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
              className={`px-[18px] py-[11px] border-none bg-transparent text-[15px] whitespace-nowrap cursor-pointer border-b-2 transition-colors
                ${activeBoard === 'home' ? 'font-bold text-[#F6C21A] border-b-[#F6C21A]' : 'font-normal text-[#bbb] border-b-transparent'}`}
            >
              {lang === 'ko' ? '전체' : 'All'}
            </button>
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                className={`px-[18px] py-[11px] border-none bg-transparent text-[15px] whitespace-nowrap cursor-pointer border-b-2 transition-colors
                  ${activeBoard === b.id ? 'font-bold text-[#F6C21A] border-b-[#F6C21A]' : 'font-normal text-[#bbb] border-b-transparent'}`}
              >
                {lang === 'ko' ? b.ko : b.en}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          BODY LAYOUT
      ══════════════════════════════════════════ */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-7 pt-3 sm:pt-6 pb-[76px] xl:pb-8 flex gap-6">

        {/* ── LEFT SIDEBAR (xl 이상) ── */}
        <div className="hidden xl:block w-[220px] shrink-0">

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-[22px_16px] mb-4 text-center">
            <div className="w-[68px] h-[68px] bg-[#F5F5F5] rounded-full mx-auto mb-[10px] flex items-center justify-center text-[30px] border-2 border-[#E5E7EB]">
              {user ? '😊' : '👤'}
            </div>
            <div className="text-[15px] font-bold mb-[3px]">
              {user ? (user.user_metadata?.nickname || user.email) : (lang === 'ko' ? '로그인이 필요해요' : 'Please sign in')}
            </div>
            <div className="text-xs text-[#6B7280] mb-4">BUFS International</div>
            <div className="flex gap-2">
              {user ? (
                <button onClick={handleLogout} className="flex-1 py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-sm font-bold cursor-pointer">
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              ) : (
                <>
                  <a href="/auth" className="flex-1 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm no-underline text-[#333333] flex items-center justify-center">
                    {lang === 'ko' ? '회원가입' : 'Sign Up'}
                  </a>
                  <a href="/auth" className="flex-1 py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-lg text-sm font-bold no-underline flex items-center justify-center">
                    {lang === 'ko' ? '로그인' : 'Sign In'}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-4">
            {[
              { icon: '📝', ko: '내가 쓴 글', en: 'My Posts' },
              { icon: '💬', ko: '댓글 단 글', en: 'Commented' },
              { icon: '⭐', ko: '내 스크랩', en: 'Scrapped' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2.5 px-4 py-[13px] cursor-pointer text-[15px] hover:bg-[#F5F5F5] transition-colors ${i < 2 ? 'border-b border-[#F5F5F5]' : ''}`}>
                <span>{item.icon}</span>
                <span>{lang === 'ko' ? item.ko : item.en}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F5F5F5] text-xs font-bold text-[#6B7280] tracking-[0.06em]">
              {lang === 'ko' ? '게시판' : 'BOARDS'}
            </div>
            {BOARDS.map((b, i) => (
              <div
                key={b.id}
                onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                className={`flex items-center gap-[9px] px-4 py-[11px] cursor-pointer text-[15px] transition-colors
                  ${i < BOARDS.length - 1 ? 'border-b border-[#F5F5F5]' : ''}
                  ${activeBoard === b.id ? 'bg-[#FFFBEA] text-[#4A4A4A] font-bold' : 'hover:bg-[#F5F5F5] text-[#333333]'}`}
              >
                <span>{b.icon}</span>
                <span>{lang === 'ko' ? b.ko : b.en}</span>
                {activeBoard === b.id && <span className="ml-auto w-2 h-2 bg-[#F6C21A] rounded-full" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">

          {loading && (
            <div className="text-center py-16 text-[#AAAAAA] text-sm">불러오는 중...</div>
          )}

          {/* ── 홈: 소개 + 빠른메뉴 + 게시판 프리뷰 ── */}
          {!loading && activeBoard === 'home' && !currentPost && (
            <>
              {/* 소개 섹션 */}
              <div className="bg-[#2F2F2F] rounded-2xl px-4 pt-5 pb-4 mb-3 sm:mb-5">
                <p className="text-[11px] text-[#F6C21A] font-semibold tracking-widest mb-1">BUFS COMMUNITY</p>
                <h2 className="text-white text-[16px] font-bold leading-snug mb-1.5">
                  {lang === 'ko'
                    ? <>부산외대 유학생을 위한<br/>학교생활 커뮤니티</>
                    : <>Campus Life Community for<br/>BUFS International Students</>}
                </h2>
                <p className="text-white/60 text-[12px] leading-snug mb-4">
                  {lang === 'ko'
                    ? '비자, 집, 학교생활, 취업, 동아리, 친구 찾기까지 한곳에서'
                    : 'Visa, Housing, Campus Life, Jobs, Clubs & Friends — all in one place'}
                </p>
                {/* 빠른메뉴 4×2 */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_MENUS.map((m, i) => (
                    <button
                      key={i}
                      className="flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl py-3 border-none cursor-pointer transition-colors"
                    >
                      <span className="text-[22px] leading-none">{m.icon}</span>
                      <span className="text-[10px] text-white/90 font-medium leading-tight text-center whitespace-nowrap">
                        {lang === 'ko' ? m.ko : m.en}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-5">
              {BOARDS.map((b, idx) => (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl border border-[#EBEBEB] overflow-hidden
                    ${idx === BOARDS.length - 1 && BOARDS.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''}`}
                >

                  {/* 카드 헤더 */}
                  <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] shrink-0">{b.icon}</span>
                      <span className="text-[12px] sm:text-[13px] font-bold text-[#1A1A1A] truncate">
                        {lang === 'ko' ? b.ko : b.en}
                      </span>
                    </div>
                    <button
                      onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                      className="text-[11px] text-[#AAAAAA] bg-transparent border-none cursor-pointer shrink-0 ml-1"
                    >
                      더보기
                    </button>
                  </div>

                  {/* 게시글 목록 – 제목만 간결하게 */}
                  <div className="px-3.5 py-2 pb-3">
                    {(boardPreviews[b.id] || []).length === 0 ? (
                      <p className="text-[11px] text-[#CCCCCC] py-1.5">
                        {lang === 'ko' ? '게시글이 없습니다' : 'No posts yet'}
                      </p>
                    ) : (
                      (boardPreviews[b.id] || []).slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => openPost(p)}
                          className="py-[5px] cursor-pointer"
                        >
                          <p className="text-[12px] text-[#333] leading-[1.4] truncate">{p.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {/* ── 게시판 목록 뷰 ── */}
          {!loading && activeBoard !== 'home' && !currentPost && (
            <div>
              {/* 게시판 헤더 */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] px-4 sm:px-[22px] py-3.5 sm:py-[18px] mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[16px] sm:text-xl font-bold flex items-center gap-2">
                  <span>{BOARDS.find(b => b.id === activeBoard)?.icon}</span>
                  <span>{boardName(activeBoard as BoardId)}</span>
                  <span className="text-[13px] text-[#AAAAAA] font-normal">
                    {filteredPosts.length}{lang === 'ko' ? '개' : ''}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={lang === 'ko' ? '검색' : 'Search'}
                    className="px-3 py-1.5 border border-[#E5E7EB] rounded-full text-[13px] outline-none w-[110px] sm:w-[180px]"
                  />
                  <button
                    onClick={() => setShowWrite(v => !v)}
                    className="hidden sm:block px-5 py-[9px] bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[15px] font-bold cursor-pointer"
                  >
                    ✏️ {lang === 'ko' ? '글쓰기' : 'Write'}
                  </button>
                </div>
              </div>

              {/* 글쓰기 폼 */}
              {showWrite && (
                <div className="bg-white rounded-xl border border-[#EBEBEB] px-4 sm:px-[22px] py-4 mb-2.5">
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={lang === 'ko' ? '제목을 입력하세요' : 'Title'}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[14px] outline-none mb-2.5 box-border"
                  />
                  <textarea
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    placeholder={lang === 'ko' ? '내용을 입력하세요...' : 'Write your post...'}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[14px] outline-none h-[120px] resize-none box-border"
                  />
                  <div className="flex justify-end gap-2 mt-2.5">
                    <button onClick={() => setShowWrite(false)} className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-[14px] cursor-pointer text-[#555]">
                      {lang === 'ko' ? '취소' : 'Cancel'}
                    </button>
                    <button onClick={submitPost} className="px-5 py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[14px] font-bold cursor-pointer">
                      {lang === 'ko' ? '등록' : 'Post'}
                    </button>
                  </div>
                </div>
              )}

              {/* 게시글 목록 */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden">
                {filteredPosts.length === 0 ? (
                  <div className="py-12 text-center text-[#AAAAAA] text-sm">
                    {lang === 'ko' ? '게시글이 없습니다. 첫 글을 작성해보세요!' : 'No posts yet. Be the first!'}
                  </div>
                ) : (
                  filteredPosts.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => openPost(p)}
                      className={`px-4 sm:px-5 py-3.5 cursor-pointer hover:bg-[#F8F9FA] transition-colors
                        ${i < filteredPosts.length - 1 ? 'border-b border-[#F2F2F2]' : ''}`}
                    >
                      <div className="text-[14px] font-medium text-[#1A1A1A] mb-1.5 leading-snug">{p.title}</div>
                      <div className="flex items-center gap-2.5 text-[11px] text-[#AAAAAA]">
                        <span>{p.author}</span>
                        <span>·</span>
                        <span>{formatTime(p.created_at)}</span>
                        <span className="ml-auto flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                          </svg>
                          {p.likes}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── 게시글 상세 ── */}
          {currentPost && (
            <div>
              <button
                onClick={closePost}
                className="flex items-center gap-1.5 py-2 mb-2 bg-transparent border-none text-[14px] text-[#888] cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                {lang === 'ko' ? '목록으로' : 'Back'}
              </button>

              <div className="bg-white rounded-xl border border-[#EBEBEB] px-4 sm:px-7 py-5 mb-2.5">
                <div className="text-[11px] text-[#888] font-medium mb-2">
                  {BOARDS.find(b => b.id === currentPost.board)?.icon} {boardName(currentPost.board)}
                </div>
                <div className="text-[18px] sm:text-[20px] font-bold mb-2 leading-snug">{currentPost.title}</div>
                <div className="text-[12px] text-[#AAAAAA] mb-5 flex items-center gap-1.5">
                  <span>{currentPost.author}</span>
                  <span>·</span>
                  <span>{formatTime(currentPost.created_at)}</span>
                </div>
                <div className="text-[14px] leading-[1.9] pb-5 border-b border-[#F0F0F0] whitespace-pre-line text-[#2A2A2A]">
                  {currentPost.body}
                </div>
                <div className="flex gap-2 pt-4 flex-wrap">
                  <button
                    onClick={toggleLike}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] cursor-pointer border transition-colors
                      ${liked ? 'border-[#F6C21A] bg-[#FFF9E6] text-[#D4A800] font-bold' : 'border-[#E5E7EB] bg-white text-[#888]'}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                    </svg>
                    {currentPost.likes}
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E7EB] bg-white rounded-full text-[13px] cursor-pointer text-[#888]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {comments.length}
                  </button>
                  <button className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E7EB] bg-white rounded-full text-[13px] cursor-pointer text-[#888]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* 댓글 */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] px-4 sm:px-7 py-5">
                <div className="text-[14px] font-bold mb-3 text-[#1A1A1A]">
                  {lang === 'ko' ? '댓글' : 'Comments'}
                  <span className="text-[#F6C21A] ml-1.5">{comments.length}</span>
                </div>
                {comments.map((c) => (
                  <div key={c.id} className="py-3 border-b border-[#F2F2F2]">
                    <div className="flex justify-between mb-1">
                      <span className="text-[13px] font-semibold text-[#1A1A1A]">{c.author}</span>
                      <span className="text-[11px] text-[#AAAAAA]">{formatTime(c.created_at)}</span>
                    </div>
                    <div className="text-[13px] leading-[1.6] text-[#333]">{c.body}</div>
                  </div>
                ))}
                <div className="mt-3 flex gap-2 items-end">
                  <textarea
                    value={cmtInput}
                    onChange={e => setCmtInput(e.target.value)}
                    placeholder={lang === 'ko' ? '댓글을 입력하세요...' : 'Write a comment...'}
                    className="flex-1 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] resize-none h-[72px] outline-none box-border"
                  />
                  <button
                    onClick={submitComment}
                    className="px-4 py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-xl text-[13px] font-bold cursor-pointer shrink-0 h-[72px]"
                  >
                    {lang === 'ko' ? '등록' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR (lg 이상) ── */}
        <div className="hidden lg:block w-[240px] shrink-0">
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-[18px] py-[13px] bg-[#2F2F2F] border-b-2 border-b-[#F6C21A]">
              <span className="text-base font-bold text-white">📅 {lang === 'ko' ? '학사 일정' : 'Calendar'}</span>
            </div>
            {[
              { date: '05.26', event: lang === 'ko' ? '중간고사 성적 발표' : 'Midterm Results' },
              { date: '06.01', event: lang === 'ko' ? '수강변경 기간' : 'Course Change' },
              { date: '06.15', event: lang === 'ko' ? '체육대회' : 'Sports Day' },
              { date: '06.20', event: lang === 'ko' ? '기말고사 시작' : 'Finals Start' },
            ].map((item, i) => (
              <div key={i} className={`flex gap-3 px-[18px] py-2.5 items-center ${i < 3 ? 'border-b border-[#F5F5F5]' : ''}`}>
                <span className="text-[13px] text-[#F6C21A] font-bold shrink-0 bg-[#2F2F2F] px-[7px] py-0.5 rounded">{item.date}</span>
                <span className="text-sm">{item.event}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════
          BOTTOM TAB BAR  (xl 미만)  – 5탭
      ══════════════════════════════════════════ */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-[300] bg-white border-t border-[#EBEBEB] flex">

        {/* 홈 */}
        <button
          onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
          className={`flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer transition-colors
            ${activeBoard === 'home' && !currentPost ? 'text-[#F6C21A]' : 'text-[#BBBBBB]'}`}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
            <polyline points="9 21 9 12 15 12 15 21"/>
          </svg>
          <span className="text-[9px] font-medium">{lang === 'ko' ? '홈' : 'Home'}</span>
        </button>

        {/* 생활정보 */}
        <button
          onClick={() => { setActiveBoard('lifeinfo'); setCurrentPost(null); }}
          className={`flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer transition-colors
            ${activeBoard === 'lifeinfo' && !currentPost ? 'text-[#F6C21A]' : 'text-[#BBBBBB]'}`}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span className="text-[9px] font-medium">{lang === 'ko' ? '생활정보' : 'Life'}</span>
        </button>

        {/* 글쓰기 – 강조 버튼 */}
        <button
          onClick={() => { if (activeBoard === 'home') setActiveBoard('campustalk'); setShowWrite(v => !v); }}
          className="flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer transition-colors text-[#BBBBBB]"
        >
          <div className="w-[38px] h-[38px] -mt-[18px] bg-[#F6C21A] rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(246,194,26,0.45)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F2F2F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <span className="text-[9px] font-medium">{lang === 'ko' ? '글쓰기' : 'Write'}</span>
        </button>

        {/* 커뮤니티 */}
        <button
          onClick={() => setShowBoardSheet(true)}
          className={`flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer transition-colors
            ${activeBoard !== 'home' && activeBoard !== 'lifeinfo' && !currentPost ? 'text-[#F6C21A]' : 'text-[#BBBBBB]'}`}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span className="text-[9px] font-medium">{lang === 'ko' ? '커뮤니티' : 'Community'}</span>
        </button>

        {/* MY */}
        {user ? (
          <button
            className="flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] bg-transparent border-none cursor-pointer text-[#BBBBBB] transition-colors"
            onClick={handleLogout}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-[9px] font-medium">MY</span>
          </button>
        ) : (
          <a href="/auth" className="flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] text-[#BBBBBB] no-underline">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-[9px] font-medium">MY</span>
          </a>
        )}
      </div>

      {/* ══════════════════════════════════════════
          BOARD SLIDE-UP SHEET  (모바일 게시판 선택)
      ══════════════════════════════════════════ */}
      {showBoardSheet && (
        <div className="xl:hidden fixed inset-0 z-[400]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBoardSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[72vh] overflow-y-auto">

            {/* 핸들 바 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[#DDDDDD] rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
              <span className="text-[15px] font-bold text-[#1A1A1A]">
                {lang === 'ko' ? '게시판 선택' : 'Select Board'}
              </span>
              <button onClick={() => setShowBoardSheet(false)} className="w-8 h-8 flex items-center justify-center text-[#888] bg-transparent border-none cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* 전체 */}
            <button
              onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); setShowBoardSheet(false); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F5F5] cursor-pointer text-left transition-colors
                ${activeBoard === 'home' ? 'bg-[#FFFBEA]' : 'bg-transparent'}`}
            >
              <span className="text-[16px]">🏠</span>
              <span className={`text-[14px] ${activeBoard === 'home' ? 'font-bold text-[#D4A800]' : 'text-[#1A1A1A]'}`}>
                {lang === 'ko' ? '전체' : 'All Boards'}
              </span>
              {activeBoard === 'home' && <span className="ml-auto w-1.5 h-1.5 bg-[#F6C21A] rounded-full" />}
            </button>

            {/* 게시판 목록 */}
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => { setActiveBoard(b.id); setCurrentPost(null); setShowBoardSheet(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F5F5] cursor-pointer text-left transition-colors
                  ${activeBoard === b.id ? 'bg-[#FFFBEA]' : 'bg-transparent'}`}
              >
                <span className="text-[16px]">{b.icon}</span>
                <span className={`text-[14px] ${activeBoard === b.id ? 'font-bold text-[#D4A800]' : 'text-[#1A1A1A]'}`}>
                  {lang === 'ko' ? b.ko : b.en}
                </span>
                {activeBoard === b.id && <span className="ml-auto w-1.5 h-1.5 bg-[#F6C21A] rounded-full" />}
              </button>
            ))}

            {/* 안전 영역 여백 */}
            <div className="h-6" />
          </div>
        </div>
      )}

    </div>
  );
}
