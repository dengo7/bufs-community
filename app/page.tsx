'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

const C = {
  yellow: '#F6C21A',
  darkGray: '#2F2F2F',
  midGray: '#4A4A4A',
  subGray: '#6B7280',
  borderGray: '#E5E7EB',
  bgLight: '#F5F5F5',
  white: '#FFFFFF',
  text: '#333333',
};

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
    <div style={{ fontFamily: "'Noto Sans KR', sans-serif", background: C.bgLight, minHeight: '100vh', fontSize: 16, color: C.text }}>
      <nav style={{ background: C.darkGray, position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 44, cursor: 'pointer' }} onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}>
            <div style={{ background: C.midGray, borderRadius: 6, padding: '4px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>B</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.yellow, lineHeight: 1 }}>U</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.white, lineHeight: 1 }}>F</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.white, lineHeight: 1 }}>S</span>
            </div>
            <div>
              <div style={{ fontWeight: 400, fontSize: 19, color: C.white, lineHeight: 1.1 }}>부산외국어대학교</div>
              <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.3 }}>Busan University of Foreign Studies</div>
              <div style={{ fontSize: 11, color: C.yellow, lineHeight: 1.5, marginTop: 2 }}>
                {lang === 'ko' ? '외국인 유학생을 위한 BUFS 생활 커뮤니티' : 'BUFS Community for International Students'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex' }}>
            {[{ id: 'home', ko: '게시판', en: 'Boards' }, { id: 'timetable', ko: '시간표', en: 'Timetable' }, { id: 'lecture', ko: '강의실', en: 'Lecture' }, { id: 'grade', ko: '학점계산기', en: 'GPA Calc' }, { id: 'friend', ko: '친구', en: 'Friends' }, { id: 'book', ko: '책방', en: 'Books' }, { id: 'campus', ko: '캠퍼스픽', en: 'Campus' }].map(item => (
              <button key={item.id} onClick={() => { if (item.id === 'home') { setActiveBoard('home'); setCurrentPost(null); } }}
                style={{ padding: '0 18px', height: 68, border: 'none', background: 'none', fontSize: 16, fontWeight: item.id === 'home' ? 700 : 400, color: item.id === 'home' ? C.yellow : '#ccc', cursor: 'pointer', borderBottom: item.id === 'home' ? `3px solid ${C.yellow}` : '3px solid transparent', fontFamily: 'inherit' }}>
                {lang === 'ko' ? item.ko : item.en}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')}
              style={{ padding: '7px 14px', border: '1.5px solid #666', borderRadius: 20, background: 'transparent', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, color: '#ddd' }}>
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.yellow, fontSize: 14, fontWeight: 600 }}>{user.user_metadata?.nickname || user.email}</span>
                <button onClick={handleLogout}
                  style={{ padding: '8px 16px', background: 'transparent', color: '#ddd', border: '1.5px solid #666', borderRadius: 20, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              </div>
            ) : (
              <a href="/auth" style={{ padding: '8px 22px', background: C.yellow, color: C.darkGray, borderRadius: 20, fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                {lang === 'ko' ? '로그인' : 'Sign In'}
              </a>
            )}
          </div>
        </div>

        <div style={{ background: '#3a3a3a', borderTop: '1px solid #555' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px', display: 'flex', overflowX: 'auto' }}>
            <button onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
              style={{ padding: '11px 18px', border: 'none', background: 'none', fontSize: 15, fontWeight: activeBoard === 'home' ? 700 : 400, color: activeBoard === 'home' ? C.yellow : '#bbb', cursor: 'pointer', borderBottom: activeBoard === 'home' ? `2px solid ${C.yellow}` : '2px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              {lang === 'ko' ? '전체' : 'All'}
            </button>
            {BOARDS.map(b => (
              <button key={b.id} onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                style={{ padding: '11px 18px', border: 'none', background: 'none', fontSize: 15, fontWeight: activeBoard === b.id ? 700 : 400, color: activeBoard === b.id ? C.yellow : '#bbb', cursor: 'pointer', borderBottom: activeBoard === b.id ? `2px solid ${C.yellow}` : '2px solid transparent', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                {lang === 'ko' ? b.ko : b.en}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px', display: 'flex', gap: 24 }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, padding: '22px 16px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, background: C.bgLight, borderRadius: '50%', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: `2px solid ${C.borderGray}` }}>
              {user ? '😊' : '👤'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
              {user ? (user.user_metadata?.nickname || user.email) : (lang === 'ko' ? '로그인이 필요해요' : 'Please sign in')}
            </div>
            <div style={{ fontSize: 12, color: C.subGray, marginBottom: 16 }}>BUFS International</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {user ? (
                <button onClick={handleLogout} style={{ flex: 1, padding: '8px 0', background: C.yellow, color: C.darkGray, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {lang === 'ko' ? '로그아웃' : 'Logout'}
                </button>
              ) : (
                <>
                  <a href="/auth" style={{ flex: 1, padding: '8px 0', border: `1.5px solid ${C.borderGray}`, borderRadius: 8, background: C.white, fontSize: 14, cursor: 'pointer', textDecoration: 'none', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {lang === 'ko' ? '회원가입' : 'Sign Up'}
                  </a>
                  <a href="/auth" style={{ flex: 1, padding: '8px 0', background: C.yellow, color: C.darkGray, borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {lang === 'ko' ? '로그인' : 'Sign In'}
                  </a>
                </>
              )}
            </div>
          </div>

          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, overflow: 'hidden', marginBottom: 16 }}>
            {[{ icon: '📝', ko: '내가 쓴 글', en: 'My Posts' }, { icon: '💬', ko: '댓글 단 글', en: 'Commented' }, { icon: '⭐', ko: '내 스크랩', en: 'Scrapped' }].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: i < 2 ? `1px solid ${C.bgLight}` : 'none', cursor: 'pointer', fontSize: 15 }}
                onMouseEnter={e => (e.currentTarget.style.background = C.bgLight)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span>{item.icon}</span><span>{lang === 'ko' ? item.ko : item.en}</span>
              </div>
            ))}
          </div>

          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.bgLight}`, fontSize: 12, fontWeight: 700, color: C.subGray, letterSpacing: '.06em' }}>
              {lang === 'ko' ? '게시판' : 'BOARDS'}
            </div>
            {BOARDS.map((b, i) => (
              <div key={b.id} onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', borderBottom: i < BOARDS.length - 1 ? `1px solid ${C.bgLight}` : 'none', cursor: 'pointer', background: activeBoard === b.id ? '#FFFBEA' : 'transparent', color: activeBoard === b.id ? C.midGray : C.text, fontWeight: activeBoard === b.id ? 700 : 400, fontSize: 15 }}
                onMouseEnter={e => { if (activeBoard !== b.id) e.currentTarget.style.background = C.bgLight; }}
                onMouseLeave={e => { if (activeBoard !== b.id) e.currentTarget.style.background = 'transparent'; }}>
                <span>{b.icon}</span>
                <span>{lang === 'ko' ? b.ko : b.en}</span>
                {activeBoard === b.id && <span style={{ marginLeft: 'auto', width: 8, height: 8, background: C.yellow, borderRadius: '50%' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && <div style={{ textAlign: 'center', padding: 60, color: C.subGray }}>불러오는 중...</div>}

          {!loading && activeBoard === 'home' && !currentPost && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
              {BOARDS.map(b => (
                <div key={b.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `2px solid ${C.yellow}`, background: '#FFFBEA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{b.icon}</span>
                      <span style={{ fontSize: 17, fontWeight: 700, color: C.darkGray }}>{lang === 'ko' ? b.ko : b.en}</span>
                    </div>
                    <button onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                      style={{ fontSize: 13, color: C.subGray, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {lang === 'ko' ? '더보기 ›' : 'More ›'}
                    </button>
                  </div>
                  {(boardPreviews[b.id] || []).length === 0
                    ? <div style={{ padding: '14px 18px', fontSize: 14, color: C.subGray }}>{lang === 'ko' ? '아직 게시글이 없습니다.' : 'No posts yet.'}</div>
                    : (boardPreviews[b.id] || []).map((p, i) => (
                      <div key={p.id} onClick={() => openPost(p)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: i < (boardPreviews[b.id] || []).length - 1 ? `1px solid ${C.bgLight}` : 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.bgLight)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ fontSize: 15, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 10 }}>{p.title}</span>
                        <span style={{ fontSize: 13, color: '#bbb', flexShrink: 0 }}>{formatTime(p.created_at)}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}

          {!loading && activeBoard !== 'home' && !currentPost && (
            <div>
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, padding: '18px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{BOARDS.find(b => b.id === activeBoard)?.icon}</span>
                  <span>{boardName(activeBoard as BoardId)}</span>
                  <span style={{ fontSize: 15, color: C.subGray, fontWeight: 400 }}>· {filteredPosts.length}{lang === 'ko' ? '개' : ' posts'}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === 'ko' ? '검색...' : 'Search...'}
                    style={{ padding: '8px 14px', border: `1.5px solid ${C.borderGray}`, borderRadius: 20, fontSize: 14, outline: 'none', fontFamily: 'inherit', width: 180 }} />
                  <button onClick={() => setShowWrite(v => !v)}
                    style={{ padding: '9px 20px', background: C.yellow, color: C.darkGray, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ✏️ {lang === 'ko' ? '글쓰기' : 'Write'}
                  </button>
                </div>
              </div>

              {showWrite && (
                <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, padding: '18px 22px', marginBottom: 16 }}>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={lang === 'ko' ? '제목을 입력하세요' : 'Title'}
                    style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.borderGray}`, borderRadius: 8, fontSize: 16, fontFamily: 'inherit', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                  <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder={lang === 'ko' ? '내용을 입력하세요...' : 'Write your post...'}
                    style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${C.borderGray}`, borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', height: 120, resize: 'none', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                    <button onClick={() => setShowWrite(false)} style={{ padding: '8px 18px', border: `1.5px solid ${C.borderGray}`, borderRadius: 8, background: C.white, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'ko' ? '취소' : 'Cancel'}</button>
                    <button onClick={submitPost} style={{ padding: '8px 22px', background: C.yellow, color: C.darkGray, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'ko' ? '등록' : 'Post'}</button>
                  </div>
                </div>
              )}

              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, overflow: 'hidden' }}>
                {filteredPosts.length === 0
                  ? <div style={{ padding: 48, textAlign: 'center', color: C.subGray, fontSize: 16 }}>{lang === 'ko' ? '게시글이 없습니다. 첫 글을 작성해보세요!' : 'No posts yet. Be the first!'}</div>
                  : filteredPosts.map((p, i) => (
                    <div key={p.id} onClick={() => openPost(p)}
                      style={{ padding: '16px 22px', borderBottom: i < filteredPosts.length - 1 ? `1px solid ${C.bgLight}` : 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.bgLight)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 5 }}>{p.title}</div>
                      <div style={{ fontSize: 14, color: C.subGray, display: 'flex', gap: 14 }}>
                        <span>{p.author}</span>
                        <span>{formatTime(p.created_at)}</span>
                        <span style={{ marginLeft: 'auto' }}>👍 {p.likes}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {currentPost && (
            <div>
              <button onClick={closePost}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', background: 'none', border: 'none', fontSize: 15, color: C.subGray, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}>
                ← {lang === 'ko' ? '목록으로' : 'Back'}
              </button>
              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, padding: '26px 30px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.midGray, fontWeight: 600, marginBottom: 8 }}>
                  {BOARDS.find(b => b.id === currentPost.board)?.icon} {boardName(currentPost.board)}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{currentPost.title}</div>
                <div style={{ fontSize: 14, color: C.subGray, marginBottom: 22 }}>{currentPost.author} · {formatTime(currentPost.created_at)}</div>
                <div style={{ fontSize: 16, lineHeight: 1.9, paddingBottom: 22, borderBottom: `1px solid ${C.borderGray}`, whiteSpace: 'pre-line' }}>{currentPost.body}</div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 16 }}>
                  <button onClick={toggleLike}
                    style={{ padding: '8px 22px', border: `2px solid ${liked ? C.yellow : C.borderGray}`, background: liked ? C.yellow : C.white, borderRadius: 20, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', color: liked ? C.darkGray : C.subGray, fontWeight: liked ? 700 : 400 }}>
                    👍 {currentPost.likes}
                  </button>
                  <button style={{ padding: '8px 22px', border: `1.5px solid ${C.borderGray}`, background: C.white, borderRadius: 20, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', color: C.subGray }}>
                    💬 {comments.length}
                  </button>
                  <button style={{ padding: '8px 22px', border: `1.5px solid ${C.borderGray}`, background: C.white, borderRadius: 20, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', color: C.subGray }}>🔖</button>
                </div>
              </div>

              <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, padding: '22px 30px' }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
                  {lang === 'ko' ? '댓글' : 'Comments'} {comments.length}
                </div>
                {comments.map((c) => (
                  <div key={c.id} style={{ padding: '14px 0', borderBottom: `1px solid ${C.bgLight}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{c.author}</span>
                      <span style={{ fontSize: 13, color: C.subGray }}>{formatTime(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>{c.body}</div>
                  </div>
                ))}
                <div style={{ marginTop: 16 }}>
                  <textarea value={cmtInput} onChange={e => setCmtInput(e.target.value)}
                    placeholder={lang === 'ko' ? '댓글을 입력하세요...' : 'Write a comment...'}
                    style={{ width: '100%', padding: '12px 16px', border: `1.5px solid ${C.borderGray}`, borderRadius: 10, fontSize: 15, fontFamily: 'inherit', resize: 'none', height: 80, outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button onClick={submitComment}
                      style={{ padding: '9px 26px', background: C.yellow, color: C.darkGray, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {lang === 'ko' ? '등록' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderGray}`, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', background: C.darkGray, borderBottom: `2px solid ${C.yellow}` }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>📅 {lang === 'ko' ? '학사 일정' : 'Calendar'}</span>
            </div>
            {[
              { date: '05.26', event: lang === 'ko' ? '중간고사 성적 발표' : 'Midterm Results' },
              { date: '06.01', event: lang === 'ko' ? '수강변경 기간' : 'Course Change' },
              { date: '06.15', event: lang === 'ko' ? '체육대회' : 'Sports Day' },
              { date: '06.20', event: lang === 'ko' ? '기말고사 시작' : 'Finals Start' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 18px', borderBottom: i < 3 ? `1px solid ${C.bgLight}` : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: C.yellow, fontWeight: 700, flexShrink: 0, background: C.darkGray, padding: '2px 7px', borderRadius: 4 }}>{item.date}</span>
                <span style={{ fontSize: 14 }}>{item.event}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}