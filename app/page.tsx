'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const BOARDS = [
  { id: 'free', ko: '자유게시판', en: 'Free Board', icon: '💬' },
  { id: 'secret', ko: '비밀게시판', en: 'Secret Board', icon: '🔒' },
  { id: 'graduate', ko: '졸업생게시판', en: 'Graduate', icon: '🎓' },
  { id: 'freshman', ko: '새내기게시판', en: 'Freshman', icon: '🌱' },
  { id: 'issue', ko: '시사·이슈', en: 'Issues', icon: '📰' },
  { id: 'info', ko: '정보게시판', en: 'Info', icon: '📌' },
  { id: 'event', ko: '이벤트게시판', en: 'Events', icon: '🎉' },
  { id: 'promo', ko: '홍보게시판', en: 'Promotions', icon: '📢' },
  { id: 'club', ko: '동아리·학회', en: 'Clubs', icon: '🤝' },
  { id: 'career', ko: '취업·진로', en: 'Career', icon: '💼' },
  { id: 'dorm', ko: '기숙사게시판', en: 'Dormitory', icon: '🏠' },
] as const;

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
  const [newBoard, setNewBoard] = useState<BoardId>('free');
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
    <div className="min-h-screen bg-[#F5F5F5] text-base text-[#333333]">

      {/* ───── NAV ───── */}
      <nav className="bg-[#2F2F2F] sticky top-0 z-[200] shadow-[0_2px_8px_rgba(0,0,0,0.18)]">

        {/* Top bar */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-7 flex items-center h-[68px]">

          {/* Logo */}
          <div
            className="flex items-center gap-3 xl:mr-11 cursor-pointer shrink-0"
            onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
          >
            <div className="bg-[#4A4A4A] rounded-[6px] px-2 py-1 grid grid-cols-2 gap-px">
              <span className="text-[13px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[13px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[13px] font-extrabold text-white leading-none">F</span>
              <span className="text-[13px] font-extrabold text-white leading-none">S</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-normal text-[19px] text-white leading-[1.1]">부산외국어대학교</div>
              <div className="text-[11px] text-[#aaa] leading-[1.3]">Busan University of Foreign Studies</div>
              <div className="text-[11px] text-[#F6C21A] leading-[1.5] mt-0.5">
                {lang === 'ko' ? '외국인 유학생을 위한 BUFS 생활 커뮤니티' : 'BUFS Community for International Students'}
              </div>
            </div>
          </div>

          {/* Desktop nav links – xl 이상에서만 표시 */}
          <div className="hidden xl:flex">
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

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2.5">
            {/* 언어 토글 – sm 이상 */}
            <button
              onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
              className="hidden sm:block px-[14px] py-[7px] border border-[#666] rounded-full bg-transparent text-sm cursor-pointer font-medium text-[#ddd]"
            >
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>

            {/* 로그인 상태 – sm 이상 */}
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[#F6C21A] text-sm font-semibold">{user.user_metadata?.nickname || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-transparent text-[#ddd] border border-[#666] rounded-full text-sm cursor-pointer"
                >
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              </div>
            ) : (
              <a
                href="/auth"
                className="hidden sm:inline-block px-[22px] py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-[15px] font-bold no-underline"
              >
                {lang === 'ko' ? '로그인' : 'Sign In'}
              </a>
            )}

            {/* 햄버거 – xl 미만 */}
            <button
              className="xl:hidden flex items-center justify-center w-10 h-10 bg-transparent border-none text-white text-2xl cursor-pointer"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="메뉴"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#2F2F2F] border-t border-[#555]">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'home') { setActiveBoard('home'); setCurrentPost(null); }
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-6 py-3 text-base text-[#ccc] border-b border-[#444] bg-transparent cursor-pointer"
              >
                {lang === 'ko' ? item.ko : item.en}
              </button>
            ))}
            <div className="px-6 py-3 flex items-center gap-3">
              <button
                onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
                className="px-[14px] py-[7px] border border-[#666] rounded-full bg-transparent text-sm text-[#ddd] cursor-pointer"
              >
                {lang === 'ko' ? 'EN' : '한국어'}
              </button>
              {user ? (
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="px-4 py-2 bg-transparent text-[#ddd] border border-[#666] rounded-full text-sm cursor-pointer"
                >
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              ) : (
                <a
                  href="/auth"
                  className="px-5 py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-sm font-bold no-underline"
                >
                  {lang === 'ko' ? '로그인' : 'Sign In'}
                </a>
              )}
            </div>
          </div>
        )}

        {/* 게시판 탭바 – overflow-x-auto 스크롤 */}
        <div className="bg-[#3a3a3a] border-t border-[#555]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-7 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {/* ───── BODY ───── */}
      {/* pb-20 xl:pb-6 : 하단 탭바 높이만큼 여백 확보 */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-7 py-6 flex gap-6 pb-20 xl:pb-6">

        {/* ── LEFT SIDEBAR – xl 이상만 표시 ── */}
        <div className="hidden xl:block w-[220px] shrink-0">

          {/* 프로필 카드 */}
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
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-sm font-bold cursor-pointer"
                >
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              ) : (
                <>
                  <a
                    href="/auth"
                    className="flex-1 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm no-underline text-[#333333] flex items-center justify-center"
                  >
                    {lang === 'ko' ? '회원가입' : 'Sign Up'}
                  </a>
                  <a
                    href="/auth"
                    className="flex-1 py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-lg text-sm font-bold no-underline flex items-center justify-center"
                  >
                    {lang === 'ko' ? '로그인' : 'Sign In'}
                  </a>
                </>
              )}
            </div>
          </div>

          {/* 활동 링크 */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-4">
            {[
              { icon: '📝', ko: '내가 쓴 글', en: 'My Posts' },
              { icon: '💬', ko: '댓글 단 글', en: 'Commented' },
              { icon: '⭐', ko: '내 스크랩', en: 'Scrapped' },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-4 py-[13px] cursor-pointer text-[15px] hover:bg-[#F5F5F5] transition-colors
                  ${i < 2 ? 'border-b border-[#F5F5F5]' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{lang === 'ko' ? item.ko : item.en}</span>
              </div>
            ))}
          </div>

          {/* 게시판 목록 */}
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
                  ${activeBoard === b.id ? 'bg-[#FFFBEA] text-[#4A4A4A] font-bold' : 'hover:bg-[#F5F5F5] font-normal text-[#333333]'}`}
              >
                <span>{b.icon}</span>
                <span>{lang === 'ko' ? b.ko : b.en}</span>
                {activeBoard === b.id && <span className="ml-auto w-2 h-2 bg-[#F6C21A] rounded-full" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="flex-1 min-w-0">
          {loading && (
            <div className="text-center py-[60px] text-[#6B7280]">불러오는 중...</div>
          )}

          {/* 홈 그리드 – 1열(모바일) / 2열(sm 이상) */}
          {!loading && activeBoard === 'home' && !currentPost && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {BOARDS.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <div className="flex items-center justify-between px-[18px] py-[14px] border-b-2 border-b-[#F6C21A] bg-[#FFFBEA]">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]">{b.icon}</span>
                      <span className="text-[17px] font-bold text-[#2F2F2F]">{lang === 'ko' ? b.ko : b.en}</span>
                    </div>
                    <button
                      onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                      className="text-[13px] text-[#6B7280] bg-transparent border-none cursor-pointer"
                    >
                      {lang === 'ko' ? '더보기 ›' : 'More ›'}
                    </button>
                  </div>
                  {(boardPreviews[b.id] || []).length === 0
                    ? <div className="px-[18px] py-[14px] text-sm text-[#6B7280]">{lang === 'ko' ? '아직 게시글이 없습니다.' : 'No posts yet.'}</div>
                    : (boardPreviews[b.id] || []).map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() => openPost(p)}
                        className={`flex items-center justify-between px-[18px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] transition-colors
                          ${i < (boardPreviews[b.id] || []).length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}
                      >
                        <span className="text-[15px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap pr-2.5">{p.title}</span>
                        <span className="text-[13px] text-[#bbb] shrink-0">{formatTime(p.created_at)}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          {/* 게시판 목록 뷰 */}
          {!loading && activeBoard !== 'home' && !currentPost && (
            <div>
              <div className="bg-white rounded-xl border border-[#E5E7EB] px-[22px] py-[18px] mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xl font-bold flex items-center gap-2">
                  <span>{BOARDS.find(b => b.id === activeBoard)?.icon}</span>
                  <span>{boardName(activeBoard as BoardId)}</span>
                  <span className="text-[15px] text-[#6B7280] font-normal">
                    · {filteredPosts.length}{lang === 'ko' ? '개' : ' posts'}
                  </span>
                </div>
                <div className="flex gap-2.5 items-center">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={lang === 'ko' ? '검색...' : 'Search...'}
                    className="px-[14px] py-2 border border-[#E5E7EB] rounded-full text-sm outline-none w-[140px] sm:w-[180px]"
                  />
                  <button
                    onClick={() => setShowWrite(v => !v)}
                    className="hidden sm:block px-5 py-[9px] bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[15px] font-bold cursor-pointer"
                  >
                    ✏️ {lang === 'ko' ? '글쓰기' : 'Write'}
                  </button>
                </div>
              </div>

              {showWrite && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] px-[22px] py-[18px] mb-4">
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={lang === 'ko' ? '제목을 입력하세요' : 'Title'}
                    className="w-full px-[14px] py-2.5 border border-[#E5E7EB] rounded-lg text-base outline-none mb-2.5 box-border"
                  />
                  <textarea
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    placeholder={lang === 'ko' ? '내용을 입력하세요...' : 'Write your post...'}
                    className="w-full px-[14px] py-2.5 border border-[#E5E7EB] rounded-lg text-[15px] outline-none h-[120px] resize-none box-border"
                  />
                  <div className="flex justify-end gap-2.5 mt-2.5">
                    <button
                      onClick={() => setShowWrite(false)}
                      className="px-[18px] py-2 border border-[#E5E7EB] rounded-lg bg-white text-[15px] cursor-pointer"
                    >
                      {lang === 'ko' ? '취소' : 'Cancel'}
                    </button>
                    <button
                      onClick={submitPost}
                      className="px-[22px] py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[15px] font-bold cursor-pointer"
                    >
                      {lang === 'ko' ? '등록' : 'Post'}
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
                {filteredPosts.length === 0
                  ? <div className="py-12 text-center text-[#6B7280] text-base">
                      {lang === 'ko' ? '게시글이 없습니다. 첫 글을 작성해보세요!' : 'No posts yet. Be the first!'}
                    </div>
                  : filteredPosts.map((p, i) => (
                    <div
                      key={p.id}
                      onClick={() => openPost(p)}
                      className={`px-[22px] py-4 cursor-pointer hover:bg-[#F5F5F5] transition-colors
                        ${i < filteredPosts.length - 1 ? 'border-b border-[#F5F5F5]' : ''}`}
                    >
                      <div className="text-base font-medium mb-[5px]">{p.title}</div>
                      <div className="text-sm text-[#6B7280] flex gap-3.5">
                        <span>{p.author}</span>
                        <span>{formatTime(p.created_at)}</span>
                        <span className="ml-auto">👍 {p.likes}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 게시글 상세 뷰 */}
          {currentPost && (
            <div>
              <button
                onClick={closePost}
                className="flex items-center gap-1.5 py-2.5 bg-transparent border-none text-[15px] text-[#6B7280] cursor-pointer mb-3"
              >
                ← {lang === 'ko' ? '목록으로' : 'Back'}
              </button>

              <div className="bg-white rounded-xl border border-[#E5E7EB] px-5 sm:px-[30px] py-[26px] mb-4">
                <div className="text-[13px] text-[#4A4A4A] font-semibold mb-2">
                  {BOARDS.find(b => b.id === currentPost.board)?.icon} {boardName(currentPost.board)}
                </div>
                <div className="text-xl sm:text-[22px] font-bold mb-2.5 leading-[1.4]">{currentPost.title}</div>
                <div className="text-sm text-[#6B7280] mb-[22px]">{currentPost.author} · {formatTime(currentPost.created_at)}</div>
                <div className="text-base leading-[1.9] pb-[22px] border-b border-[#E5E7EB] whitespace-pre-line">{currentPost.body}</div>
                <div className="flex gap-2.5 pt-4 flex-wrap">
                  <button
                    onClick={toggleLike}
                    className={`px-[22px] py-2 rounded-full text-[15px] cursor-pointer border-2 transition-colors
                      ${liked ? 'border-[#F6C21A] bg-[#F6C21A] text-[#2F2F2F] font-bold' : 'border-[#E5E7EB] bg-white text-[#6B7280]'}`}
                  >
                    👍 {currentPost.likes}
                  </button>
                  <button className="px-[22px] py-2 border border-[#E5E7EB] bg-white rounded-full text-[15px] cursor-pointer text-[#6B7280]">
                    💬 {comments.length}
                  </button>
                  <button className="px-[22px] py-2 border border-[#E5E7EB] bg-white rounded-full text-[15px] cursor-pointer text-[#6B7280]">🔖</button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E5E7EB] px-5 sm:px-[30px] py-[22px]">
                <div className="text-[17px] font-bold mb-4">
                  {lang === 'ko' ? '댓글' : 'Comments'} {comments.length}
                </div>
                {comments.map((c) => (
                  <div key={c.id} className="py-3.5 border-b border-[#F5F5F5]">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[15px] font-semibold">{c.author}</span>
                      <span className="text-[13px] text-[#6B7280]">{formatTime(c.created_at)}</span>
                    </div>
                    <div className="text-[15px] leading-[1.6]">{c.body}</div>
                  </div>
                ))}
                <div className="mt-4">
                  <textarea
                    value={cmtInput}
                    onChange={e => setCmtInput(e.target.value)}
                    placeholder={lang === 'ko' ? '댓글을 입력하세요...' : 'Write a comment...'}
                    className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl text-[15px] resize-none h-20 outline-none box-border"
                  />
                  <div className="flex justify-end mt-2.5">
                    <button
                      onClick={submitComment}
                      className="px-[26px] py-[9px] bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[15px] font-bold cursor-pointer"
                    >
                      {lang === 'ko' ? '등록' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR – lg 이상만 표시 ── */}
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
              <div
                key={i}
                className={`flex gap-3 px-[18px] py-2.5 items-center ${i < 3 ? 'border-b border-[#F5F5F5]' : ''}`}
              >
                <span className="text-[13px] text-[#F6C21A] font-bold shrink-0 bg-[#2F2F2F] px-[7px] py-0.5 rounded">{item.date}</span>
                <span className="text-sm">{item.event}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ───── BOTTOM TAB BAR – xl 미만에서만 표시 ───── */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-[300] bg-[#2F2F2F] border-t border-[#555] flex">
        <button
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 bg-transparent border-none cursor-pointer transition-colors
            ${activeBoard === 'home' && !currentPost ? 'text-[#F6C21A]' : 'text-[#bbb]'}`}
          onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
        >
          <span className="text-xl">🏠</span>
          <span className="text-[11px]">{lang === 'ko' ? '홈' : 'Home'}</span>
        </button>
        <button
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-[#bbb] bg-transparent border-none cursor-pointer"
          onClick={() => setShowBoardSheet(true)}
        >
          <span className="text-xl">📋</span>
          <span className="text-[11px]">{lang === 'ko' ? '게시판' : 'Boards'}</span>
        </button>
        <button
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-[#bbb] bg-transparent border-none cursor-pointer"
          onClick={() => { if (activeBoard === 'home') setActiveBoard('free'); setShowWrite(v => !v); }}
        >
          <span className="text-xl">✏️</span>
          <span className="text-[11px]">{lang === 'ko' ? '글쓰기' : 'Write'}</span>
        </button>
        {user ? (
          <button
            className="flex-1 flex flex-col items-center py-2 gap-0.5 text-[#bbb] bg-transparent border-none cursor-pointer"
            onClick={handleLogout}
          >
            <span className="text-xl">👤</span>
            <span className="text-[11px]">MY</span>
          </button>
        ) : (
          <a
            href="/auth"
            className="flex-1 flex flex-col items-center py-2 gap-0.5 text-[#bbb] no-underline"
          >
            <span className="text-xl">👤</span>
            <span className="text-[11px]">MY</span>
          </a>
        )}
      </div>

      {/* ───── 게시판 슬라이드업 시트 – 모바일 게시판 선택 ───── */}
      {showBoardSheet && (
        <div className="xl:hidden fixed inset-0 z-[400]">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBoardSheet(false)}
          />
          {/* 시트 */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
              <span className="text-lg font-bold">{lang === 'ko' ? '게시판 선택' : 'Select Board'}</span>
              <button
                onClick={() => setShowBoardSheet(false)}
                className="text-[#6B7280] bg-transparent border-none text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* 전체 */}
            <button
              onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); setShowBoardSheet(false); }}
              className={`w-full flex items-center gap-3 px-5 py-4 border-b border-[#F5F5F5] cursor-pointer text-left text-[15px] transition-colors
                ${activeBoard === 'home' ? 'bg-[#FFFBEA] font-bold text-[#4A4A4A]' : 'bg-transparent text-[#333333]'}`}
            >
              <span>🏠</span>
              <span>{lang === 'ko' ? '전체' : 'All Boards'}</span>
              {activeBoard === 'home' && <span className="ml-auto w-2 h-2 bg-[#F6C21A] rounded-full" />}
            </button>
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => { setActiveBoard(b.id); setCurrentPost(null); setShowBoardSheet(false); }}
                className={`w-full flex items-center gap-3 px-5 py-4 border-b border-[#F5F5F5] cursor-pointer text-left text-[15px] transition-colors
                  ${activeBoard === b.id ? 'bg-[#FFFBEA] font-bold text-[#4A4A4A]' : 'bg-transparent text-[#333333]'}`}
              >
                <span>{b.icon}</span>
                <span>{lang === 'ko' ? b.ko : b.en}</span>
                {activeBoard === b.id && <span className="ml-auto w-2 h-2 bg-[#F6C21A] rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
