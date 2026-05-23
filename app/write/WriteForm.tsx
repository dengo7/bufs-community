'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase/client';
import {
  CATEGORIES,
  getCategoryLabel,
  uiLangToLanguage,
  type UILang,
} from '../lib/categories';
import BottomTabBar from '../components/BottomTabBar';

const LANG_LABELS: Record<UILang, string> = { ko: 'KR', en: 'EN', zh: '中', ja: '日' };

const T = {
  ko: {
    pageTitle: '글쓰기',
    submit: '등록',
    categoryLabel: '카테고리',
    categoryRequired: '카테고리를 선택하세요',
    titleLabel: '제목',
    titlePlaceholder: '제목을 입력하세요',
    contentLabel: '내용',
    contentPlaceholder: '내용을 입력하세요',
    submitError: '글 등록 중 오류가 발생했습니다. 다시 시도해 주세요.',
  },
  en: {
    pageTitle: 'Write',
    submit: 'Submit',
    categoryLabel: 'Category',
    categoryRequired: 'Please select a category',
    titleLabel: 'Title',
    titlePlaceholder: 'Enter title',
    contentLabel: 'Content',
    contentPlaceholder: 'Enter content',
    submitError: 'Failed to submit. Please try again.',
  },
  zh: {
    pageTitle: '写作',
    submit: '发布',
    categoryLabel: '分类',
    categoryRequired: '请选择分类',
    titleLabel: '标题',
    titlePlaceholder: '请输入标题',
    contentLabel: '内容',
    contentPlaceholder: '请输入内容',
    submitError: '发布失败，请重试。',
  },
  ja: {
    pageTitle: '投稿',
    submit: '登録',
    categoryLabel: 'カテゴリ',
    categoryRequired: 'カテゴリを選択してください',
    titleLabel: 'タイトル',
    titlePlaceholder: 'タイトルを入力',
    contentLabel: '内容',
    contentPlaceholder: '内容を入力',
    submitError: '投稿に失敗しました。再度お試しください。',
  },
} as const;

const TITLE_MAX = 200;
const CONTENT_MAX = 10_000;

interface Props {
  initialCategory?: string;
  userId: string;
}

export default function WriteForm({ initialCategory, userId }: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<UILang>('ko');
  const [category, setCategory] = useState<string>(initialCategory ?? '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = T[lang];
  const canSubmit = category !== '' && title.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: insertError } = await supabase.from('posts').insert({
        author_id: userId,
        category,
        title: title.trim(),
        content: content.trim(),
        language: uiLangToLanguage(lang),
        image_urls: [],
      });

      if (insertError) throw insertError;
      router.push(`/category/${category}`);
    } catch {
      setError(t.submitError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#1A1A1A]">

      {/* 헤더 */}
      <header className="sticky top-0 z-[200] bg-white border-b border-[#EBEBEB]">
        <div className="flex items-center h-[54px] px-3 gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 -ml-1 text-gray-700 bg-transparent border-none cursor-pointer shrink-0"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>

          <span className="flex-1 text-[15px] font-bold text-center text-[#1A1A1A]">
            {t.pageTitle}
          </span>

          {/* 언어 선택 */}
          <div className="flex border border-[#EBEBEB] rounded-full overflow-hidden text-[10px] shrink-0">
            {(Object.keys(LANG_LABELS) as UILang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-[7px] py-[5px] border-none cursor-pointer transition-colors font-bold
                  ${lang === l ? 'bg-[#F6C21A] text-[#2F2F2F]' : 'bg-transparent text-[#BBBBBB]'}`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>

          {/* 등록 버튼 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="shrink-0 px-3 py-1.5 bg-[#F6C21A] text-[#2F2F2F] rounded-full text-[13px] font-bold
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {isSubmitting ? '…' : t.submit}
          </button>
        </div>
      </header>

      {/* 폼 본문 */}
      <div className="max-w-[600px] mx-auto px-4 pt-5 pb-32 space-y-5">

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* 카테고리 선택 */}
        <section>
          <p className="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">
            {t.categoryLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const isSelected = category === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setCategory(cat.slug)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors
                    ${isSelected
                      ? 'bg-[#2F2F2F] text-white border-[#2F2F2F]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                >
                  <cat.Icon size={13} strokeWidth={1.8} />
                  <span>{getCategoryLabel(cat.slug, uiLangToLanguage(lang))}</span>
                </button>
              );
            })}
          </div>
          {!category && (
            <p className="text-[11px] text-gray-400 mt-1.5">{t.categoryRequired}</p>
          )}
        </section>

        {/* 제목 */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
              {t.titleLabel}
            </p>
            <span className={`text-[11px] ${title.length >= TITLE_MAX ? 'text-red-500' : 'text-gray-400'}`}>
              {title.length} / {TITLE_MAX}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder={t.titlePlaceholder}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px]
                       placeholder-gray-300 focus:outline-none focus:border-[#F6C21A] transition-colors"
          />
        </section>

        {/* 본문 */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
              {t.contentLabel}
            </p>
            <span className={`text-[11px] ${content.length >= CONTENT_MAX ? 'text-red-500' : 'text-gray-400'}`}>
              {content.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}
            </span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, CONTENT_MAX))}
            placeholder={t.contentPlaceholder}
            rows={14}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[14px]
                       placeholder-gray-300 resize-none focus:outline-none focus:border-[#F6C21A]
                       transition-colors leading-relaxed"
          />
        </section>

      </div>

      <BottomTabBar lang={lang} user={{ id: userId }} />
    </div>
  );
}
