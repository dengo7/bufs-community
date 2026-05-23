'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { getSupabaseClient } from './lib/supabase/client';

type Lang = 'ko' | 'en' | 'zh' | 'ja';
const LANG_LABELS: Record<Lang, string> = { ko: 'KR', en: 'EN', zh: '中文', ja: '日本語' };

const T = {
  ko: {
    schoolName: '부산외국어대학교', schoolNameShort: '부산외국어대학교',
    introLine1: '부산외대 유학생을 위한', introLine2: '학교생활 커뮤니티',
    introSub: '비자, 집, 학교생활, 취업, 동아리, 친구 찾기까지 한곳에서',
    all: '전체', more: '더보기', login: '로그인', logout: '로그아웃', signUp: '회원가입',
    write: '글쓰기', submit: '등록', cancel: '취소', back: '목록으로',
    search: '검색', searchPh: '검색...', loading: '불러오는 중...',
    noPostCard: '아직 게시글이 없습니다', noPosts: '게시글이 없습니다. 첫 글을 작성해보세요!',
    selectBoard: '게시판 선택', allBoards: '전체',
    comments: '댓글', commentPh: '댓글을 입력하세요...', titlePh: '제목을 입력하세요', bodyPh: '내용을 입력하세요...',
    posts: '개', myPosts: '내가 쓴 글', commented: '댓글 단 글', scrapped: '내 스크랩',
    boards: '게시판', calendar: '학사 일정', pleaseLogin: '로그인이 필요해요',
    tabHome: '홈', tabLife: '생활정보', tabWrite: '글쓰기', tabCommunity: '커뮤니티', tabMy: 'MY',
    subSlogan: '외국인 유학생을 위한 BUFS 생활 커뮤니티',
    midtermResults: '중간고사 성적 발표', courseChange: '수강변경 기간', sportsDay: '체육대회', finalsStart: '기말고사 시작',
  },
  en: {
    schoolName: 'Busan University of Foreign Studies', schoolNameShort: 'Busan Univ. of Foreign Studies',
    introLine1: 'Campus Life Community for', introLine2: 'BUFS International Students',
    introSub: 'Visa, Housing, Campus Life, Jobs, Clubs & Friends — all in one place',
    all: 'All', more: 'More', login: 'Sign In', logout: 'Logout', signUp: 'Sign Up',
    write: 'Write', submit: 'Post', cancel: 'Cancel', back: 'Back',
    search: 'Search', searchPh: 'Search...', loading: 'Loading...',
    noPostCard: 'No posts yet', noPosts: 'No posts yet. Be the first!',
    selectBoard: 'Select Board', allBoards: 'All Boards',
    comments: 'Comments', commentPh: 'Write a comment...', titlePh: 'Title', bodyPh: 'Write your post...',
    posts: '', myPosts: 'My Posts', commented: 'Commented', scrapped: 'Scrapped',
    boards: 'BOARDS', calendar: 'Calendar', pleaseLogin: 'Please sign in',
    tabHome: 'Home', tabLife: 'Life', tabWrite: 'Write', tabCommunity: 'Community', tabMy: 'MY',
    subSlogan: 'BUFS Community for International Students',
    midtermResults: 'Midterm Results', courseChange: 'Course Change', sportsDay: 'Sports Day', finalsStart: 'Finals Start',
  },
  zh: {
    schoolName: '釜山外国语大学', schoolNameShort: '釜山外国语大学',
    introLine1: '为釜山外大留学生打造的', introLine2: '校园生活社区',
    introSub: '签证、住房、校园生活、就业、社团与交友，一站搞定',
    all: '全部', more: '更多', login: '登录', logout: '退出', signUp: '注册',
    write: '写帖', submit: '提交', cancel: '取消', back: '返回列表',
    search: '搜索', searchPh: '搜索...', loading: '加载中...',
    noPostCard: '暂无帖子', noPosts: '暂无帖子，快来发第一篇吧！',
    selectBoard: '选择版块', allBoards: '全部版块',
    comments: '评论', commentPh: '写下你的评论...', titlePh: '请输入标题', bodyPh: '请输入内容...',
    posts: '篇', myPosts: '我的帖子', commented: '我的评论', scrapped: '我的收藏',
    boards: '版块', calendar: '学校日程', pleaseLogin: '请先登录',
    tabHome: '首页', tabLife: '生活', tabWrite: '写帖', tabCommunity: '社区', tabMy: '我的',
    subSlogan: '为外国留学生打造的BUFS生活社区',
    midtermResults: '期中考试成绩发布', courseChange: '选课变更期间', sportsDay: '运动会', finalsStart: '期末考试开始',
  },
  ja: {
    schoolName: '釜山外国語大学', schoolNameShort: '釜山外国語大学',
    introLine1: 'BUFS留学生のための', introLine2: 'キャンパスライフコミュニティ',
    introSub: 'ビザ、住居、学校生活、就職、サークル、友達づくりまで一箇所で',
    all: '全体', more: 'もっと見る', login: 'ログイン', logout: 'ログアウト', signUp: '新規登録',
    write: '投稿する', submit: '登録', cancel: 'キャンセル', back: '一覧へ',
    search: '検索', searchPh: '検索...', loading: '読み込み中...',
    noPostCard: '投稿がありません', noPosts: '投稿がありません。最初の投稿をしてみましょう！',
    selectBoard: '掲示板を選択', allBoards: '全掲示板',
    comments: 'コメント', commentPh: 'コメントを入力してください...', titlePh: 'タイトルを入力', bodyPh: '内容を入力してください...',
    posts: '件', myPosts: '自分の投稿', commented: 'コメントした投稿', scrapped: 'スクラップ',
    boards: '掲示板', calendar: '学事日程', pleaseLogin: 'ログインしてください',
    tabHome: 'ホーム', tabLife: '生活', tabWrite: '投稿', tabCommunity: 'コミュ', tabMy: 'MY',
    subSlogan: '外国人留学生のためのBUFS生活コミュニティ',
    midtermResults: '中間試験成績発表', courseChange: '履修変更期間', sportsDay: '体育祭', finalsStart: '期末試験開始',
  },
} as const;

const BOARDS = [
  { id: 'campustalk', ko: '캠퍼스톡',    en: 'Campus Talk', zh: '校园话题',  ja: 'キャンパストーク', icon: '💬' },
  { id: 'lifeinfo',   ko: '생활정보',    en: 'Life Info',   zh: '生活信息',  ja: '生活情報',         icon: '🗺️' },
  { id: 'career',     ko: '취업·진로',   en: 'Career',      zh: '就业·进路', ja: '就職·進路',        icon: '💼' },
  { id: 'club',       ko: '동아리·모임', en: 'Clubs',       zh: '社团·聚会', ja: 'サークル·集い',    icon: '🤝' },
  { id: 'korea',      ko: '한국소식',    en: 'Korea News',  zh: '韩国资讯',  ja: '韓国ニュース',      icon: '🇰🇷' },
  { id: 'world',      ko: '세계소식',    en: 'World News',  zh: '世界新闻',  ja: '世界のニュース',    icon: '🌍' },
] as const;

const QUICK_MENUS = [
  { icon: '🛂', ko: '비자',     en: 'Visa',      zh: '签证',     ja: 'ビザ' },
  { icon: '🏠', ko: '부동산',   en: 'Housing',   zh: '住房',     ja: '住居' },
  { icon: '🏦', ko: '은행',     en: 'Bank',      zh: '银行',     ja: '銀行' },
  { icon: '📱', ko: '휴대폰',   en: 'Phone',     zh: '手机',     ja: 'スマホ' },
  { icon: '🛡️', ko: '보험',     en: 'Insurance', zh: '保险',     ja: '保険' },
  { icon: '🏥', ko: '병원',     en: 'Hospital',  zh: '医院',     ja: '病院' },
  { icon: '💼', ko: '알바',     en: 'Part-time', zh: '兼职',     ja: 'アルバイト' },
  { icon: '🎓', ko: '학교생활', en: 'Campus',    zh: '校园生活', ja: '学校生活' },
];

type BoardId = typeof BOARDS[number]['id'];

interface Comment { id: number; post_id: number; author: string; body: string; created_at: string; }
interface Post { id: number; board: BoardId; title: string; body: string; author: string; created_at: string; likes: number; }

const NAV_ITEMS = [
  { id: 'home',      ko: '게시판',     en: 'Boards',    zh: '版块',     ja: '掲示板' },
  { id: 'timetable', ko: '시간표',     en: 'Timetable', zh: '课程表',   ja: '時間割' },
  { id: 'lecture',   ko: '강의실',     en: 'Lecture',   zh: '教室',     ja: '講義室' },
  { id: 'grade',     ko: '학점계산기', en: 'GPA Calc',  zh: '成绩计算', ja: 'GPA計算' },
  { id: 'friend',    ko: '친구',       en: 'Friends',   zh: '朋友',     ja: '友達' },
  { id: 'book',      ko: '책방',       en: 'Books',     zh: '书店',     ja: '本屋' },
  { id: 'campus',    ko: '캠퍼스픽',   en: 'Campus',    zh: '校园',     ja: 'キャンパス' },
];

function QuickIcon({ i }: { i: number }) {
  const p = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (i === 0) return <svg {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="13" y2="12"/><circle cx="15" cy="15" r="2"/></svg>;
  if (i === 1) return <svg {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>;
  if (i === 2) return <svg {...p}><line x1="3" y1="22" x2="21" y2="22"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="5" y1="11" x2="5" y2="21"/><line x1="9" y1="11" x2="9" y2="21"/><line x1="15" y1="11" x2="15" y2="21"/><line x1="19" y1="11" x2="19" y2="21"/><path d="M12 2L3 11h18L12 2z"/></svg>;
  if (i === 3) return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>;
  if (i === 4) return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
  if (i === 5) return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>;
  if (i === 6) return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="2" y1="13" x2="22" y2="13"/></svg>;
  if (i === 7) return <svg {...p}><path d="M2 10l10-7 10 7-10 7-10-7z"/><path d="M6 12v5c0 2 2.5 4 6 4s6-2 6-4v-5"/><line x1="22" y1="10" x2="22" y2="16"/></svg>;
  return null;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ko');
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

  const t = T[lang];
  const bLabel = (b: { ko: string; en: string; zh: string; ja: string }) =>
    lang === 'ko' ? b.ko : lang === 'en' ? b.en : lang === 'zh' ? b.zh : b.ja;
  const boardName = (id: BoardId) => { const b = BOARDS.find(x => x.id === id)!; return bLabel(b); };
  const filteredPosts = posts.filter(p => search === '' || p.title.includes(search));

  useEffect(() => {
    const client = getSupabaseClient();
    client.auth.getUser().then(({ data }: { data: { user: any } }) => {
      setUser(data.user ?? null);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    loadBoardPreviews();
    return () => subscription.unsubscribe();
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
    await getSupabaseClient().auth.signOut();
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
          MOBILE HEADER  (xl 미만)  – 단일 행 54px
      ══════════════════════════════════════════ */}
      <header className="xl:hidden sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="flex items-center h-[54px] px-3 gap-2">

          {/* 로고 + 학교명 */}
          <div
            className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
            onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
          >
            <div className="bg-[#2F2F2F] rounded-[5px] px-[7px] py-[5px] grid grid-cols-2 gap-px shrink-0">
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">B</span>
              <span className="text-[10px] font-extrabold text-[#F6C21A] leading-none">U</span>
              <span className="text-[10px] font-extrabold text-white leading-none">F</span>
              <span className="text-[10px] font-extrabold text-white leading-none">S</span>
            </div>
            <span className="text-[13px] font-bold text-[#1A1A1A] truncate">{t.schoolNameShort}</span>
          </div>

          {/* 언어 토글 – 헤더 통합 */}
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-[8px] py-[6px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {l === 'ko' ? 'KR' : l === 'en' ? 'EN' : l === 'zh' ? '中' : '日'}
              </button>
            ))}
          </div>

          {/* 아이콘 3개 */}
          <div className="flex items-center shrink-0">
            <button className="w-8 h-8 flex items-center justify-center text-[#555] bg-transparent border-none cursor-pointer" aria-label="검색">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-[#555] bg-transparent border-none cursor-pointer" aria-label="알림">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {user ? (
              <button className="w-8 h-8 flex items-center justify-center text-[#555] bg-transparent border-none cursor-pointer" aria-label="프로필">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            ) : (
              <a href="/auth" className="w-8 h-8 flex items-center justify-center text-[#555] no-underline" aria-label="로그인">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE BOARD TAB BAR  (xl 미만)
          sticky: 모바일 헤더(54px) 바로 아래
      ══════════════════════════════════════════ */}
      <div className="xl:hidden sticky top-[54px] z-[150] bg-white border-b border-[#EBEBEB]">
        <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2">
          <button
            onClick={() => { setActiveBoard('home'); setCurrentPost(null); loadBoardPreviews(); }}
            className={`px-3 py-2.5 text-[13px] whitespace-nowrap border-none bg-transparent cursor-pointer border-b-2 transition-colors
              ${activeBoard === 'home' ? 'text-[#F6C21A] border-b-[#F6C21A] font-bold' : 'text-[#888] border-b-transparent font-medium'}`}
          >
            {t.all}
          </button>
          {BOARDS.map(b => (
            <button
              key={b.id}
              onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
              className={`px-3 py-2.5 text-[13px] whitespace-nowrap border-none bg-transparent cursor-pointer border-b-2 transition-colors
                ${activeBoard === b.id ? 'text-[#F6C21A] border-b-[#F6C21A] font-bold' : 'text-[#888] border-b-transparent font-medium'}`}
            >
              {bLabel(b)}
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
              <div className="font-normal text-[19px] text-white leading-[1.1]">
                {t.schoolName}
              </div>
              <div className="text-[11px] text-[#aaa] leading-[1.3]">Busan University of Foreign Studies</div>
              <div className="text-[11px] text-[#F6C21A] leading-[1.5] mt-0.5">
                {t.subSlogan}
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
                {bLabel(item)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* 4-language toggle */}
            <div className="flex items-center border border-[#666] rounded-full overflow-hidden text-[12px]">
              {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 border-none cursor-pointer transition-colors font-medium
                    ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F] font-bold' : 'bg-transparent text-[#999]'}`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[#F6C21A] text-sm font-semibold">{user.user_metadata?.nickname || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-transparent text-[#ddd] border border-[#666] rounded-full text-sm cursor-pointer"
                >
                  {t.logout}
                </button>
              </div>
            ) : (
              <a href="/auth" className="px-[22px] py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-[15px] font-bold no-underline">
                {t.login}
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
              {t.all}
            </button>
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                className={`px-[18px] py-[11px] border-none bg-transparent text-[15px] whitespace-nowrap cursor-pointer border-b-2 transition-colors
                  ${activeBoard === b.id ? 'font-bold text-[#F6C21A] border-b-[#F6C21A]' : 'font-normal text-[#bbb] border-b-transparent'}`}
              >
                {bLabel(b)}
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
            {user ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-3" />
                <div className="text-[15px] font-bold mb-4">
                  {user.user_metadata?.nickname || user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 border border-[#E5E7EB] rounded-lg text-sm text-[#555] cursor-pointer bg-white hover:bg-[#F5F5F5] transition-colors"
                >
                  {t.logout}
                </button>
              </>
            ) : (
              <>
                <div className="w-[68px] h-[68px] bg-[#F5F5F5] rounded-full mx-auto mb-[10px] flex items-center justify-center text-[30px] border-2 border-[#E5E7EB]">
                  👤
                </div>
                <div className="text-[15px] font-bold mb-[3px]">{t.pleaseLogin}</div>
                <div className="text-xs text-[#6B7280] mb-4">BUFS International</div>
                <div className="flex gap-2">
                  <a href="/auth" className="flex-1 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm no-underline text-[#333333] flex items-center justify-center">
                    {t.signUp}
                  </a>
                  <a href="/auth" className="flex-1 py-2 bg-[#F6C21A] text-[#2F2F2F] rounded-lg text-sm font-bold no-underline flex items-center justify-center">
                    {t.login}
                  </a>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden mb-4">
            {[
              { icon: '📝', label: t.myPosts },
              { icon: '💬', label: t.commented },
              { icon: '⭐', label: t.scrapped },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2.5 px-4 py-[13px] cursor-pointer text-[15px] hover:bg-[#F5F5F5] transition-colors ${i < 2 ? 'border-b border-[#F5F5F5]' : ''}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F5F5F5] text-xs font-bold text-[#6B7280] tracking-[0.06em]">
              {t.boards}
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
                <span>{bLabel(b)}</span>
                {activeBoard === b.id && <span className="ml-auto w-2 h-2 bg-[#F6C21A] rounded-full" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0">

          {loading && (
            <div className="text-center py-16 text-[#AAAAAA] text-sm">{t.loading}</div>
          )}

          {/* ── 홈: 소개 + 빠른메뉴 + 게시판 프리뷰 ── */}
          {!loading && activeBoard === 'home' && !currentPost && (
            <>
              {/* 소개 섹션 */}
              <div className="bg-[#2F2F2F] rounded-2xl px-4 pt-5 pb-4 mb-3 sm:mb-5">
                <p className="text-[11px] text-[#F6C21A] font-semibold tracking-widest mb-1">BUFS COMMUNITY</p>
                <h2 className="text-white text-[16px] font-bold leading-snug mb-1.5">
                  {t.introLine1}<br/>{t.introLine2}
                </h2>
                <p className="text-white/60 text-[12px] leading-snug mb-4">
                  {t.introSub}
                </p>
                {/* 빠른메뉴 4×2 */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_MENUS.map((m, i) => (
                    <button
                      key={i}
                      className="flex flex-col items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl py-3 border-none cursor-pointer transition-colors"
                    >
                      <span className="text-white/90"><QuickIcon i={i} /></span>
                      <span className="text-[10px] text-white/90 font-medium leading-tight text-center whitespace-nowrap">
                        {bLabel(m)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
              {BOARDS.map((b, idx) => (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl border border-[#EBEBEB] overflow-hidden
                    ${idx === BOARDS.length - 1 && BOARDS.length % 2 !== 0 ? 'col-span-2 sm:col-span-1' : ''}`}
                >

                  {/* 카드 헤더 */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F0F0F0]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[13px] shrink-0">{b.icon}</span>
                      <span className="text-[12px] sm:text-[13px] font-bold text-[#1A1A1A] truncate">
                        {bLabel(b)}
                      </span>
                    </div>
                    <button
                      onClick={() => { setActiveBoard(b.id); setCurrentPost(null); }}
                      className="text-[11px] text-[#AAAAAA] bg-transparent border-none cursor-pointer shrink-0 ml-1"
                    >
                      {t.more}
                    </button>
                  </div>

                  {/* 게시글 목록 – 제목만 간결하게 */}
                  <div className="px-4 py-2.5 pb-3.5">
                    {(boardPreviews[b.id] || []).length === 0 ? (
                      <p className="text-[11px] text-[#CCCCCC] py-1.5">
                        {t.noPostCard}
                      </p>
                    ) : (
                      (boardPreviews[b.id] || []).slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => openPost(p)}
                          className="py-[7px] cursor-pointer"
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
                    {filteredPosts.length}{t.posts}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t.searchPh}
                    className="px-3 py-1.5 border border-[#E5E7EB] rounded-full text-[13px] outline-none w-[110px] sm:w-[180px]"
                  />
                  <button
                    onClick={() => setShowWrite(v => !v)}
                    className="hidden sm:block px-5 py-[9px] bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[15px] font-bold cursor-pointer"
                  >
                    ✏️ {t.write}
                  </button>
                </div>
              </div>

              {/* 글쓰기 폼 */}
              {showWrite && (
                <div className="bg-white rounded-xl border border-[#EBEBEB] px-4 sm:px-[22px] py-4 mb-2.5">
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={t.titlePh}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[14px] outline-none mb-2.5 box-border"
                  />
                  <textarea
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    placeholder={t.bodyPh}
                    className="w-full px-3.5 py-2.5 border border-[#E5E7EB] rounded-lg text-[14px] outline-none h-[120px] resize-none box-border"
                  />
                  <div className="flex justify-end gap-2 mt-2.5">
                    <button onClick={() => setShowWrite(false)} className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-[14px] cursor-pointer text-[#555]">
                      {t.cancel}
                    </button>
                    <button onClick={submitPost} className="px-5 py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-lg text-[14px] font-bold cursor-pointer">
                      {t.submit}
                    </button>
                  </div>
                </div>
              )}

              {/* 게시글 목록 */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden">
                {filteredPosts.length === 0 ? (
                  <div className="py-12 text-center text-[#AAAAAA] text-sm">
                    {t.noPosts}
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
                {t.back}
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
                  {t.comments}
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
                    placeholder={t.commentPh}
                    className="flex-1 px-3.5 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] resize-none h-[72px] outline-none box-border"
                  />
                  <button
                    onClick={submitComment}
                    className="px-4 py-2 bg-[#F6C21A] text-[#2F2F2F] border-none rounded-xl text-[13px] font-bold cursor-pointer shrink-0 h-[72px]"
                  >
                    {t.submit}
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
              <span className="text-base font-bold text-white">📅 {t.calendar}</span>
            </div>
            {[
              { date: '05.26', event: t.midtermResults },
              { date: '06.01', event: t.courseChange },
              { date: '06.15', event: t.sportsDay },
              { date: '06.20', event: t.finalsStart },
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
          <span className="text-[9px] font-medium">{t.tabHome}</span>
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
          <span className="text-[9px] font-medium">{t.tabLife}</span>
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
          <span className="text-[9px] font-medium">{t.tabWrite}</span>
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
          <span className="text-[9px] font-medium">{t.tabCommunity}</span>
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
            <span className="text-[9px] font-medium">{t.tabMy}</span>
          </button>
        ) : (
          <a href="/auth" className="flex-1 flex flex-col items-center pt-2 pb-[11px] gap-[3px] text-[#BBBBBB] no-underline">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-[9px] font-medium">{t.tabMy}</span>
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
                {t.selectBoard}
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
                {t.allBoards}
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
                  {bLabel(b)}
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
