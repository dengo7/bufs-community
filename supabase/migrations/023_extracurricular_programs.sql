-- ============================================================
-- 023_extracurricular_programs.sql
-- 비교과 프로그램 (1차: 수동 입력 1건 테스트)
-- ⚠️ 아직 적용 전 — Supabase 대시보드 SQL Editor에서 실행
--
-- 학사공지(notices)와 분리한다. 공지는 "제목 + 원문 링크"가 전부지만 비교과 프로그램은
-- 일시·장소·신청기간·모집인원·혜택 등 구조화 필드가 많고, 원문이 로그인 뒤에 있어
-- 앱 안에 상세 화면이 필요하다. 크롤러·푸시 라우트는 이 테이블을 모른다.
--
-- 다국어 관례는 partner_stores 와 같다: ko 는 본 컬럼, en/zh/ja 는 translations[lang][field].
-- 당분간 수동 입력이므로 쓰기는 관리자(profiles.role = 'admin')만, 읽기는 published = true 행만.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.extracurricular_programs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title         text        NOT NULL,                        -- ko 원문 제목
  department    text,                                        -- 주관부서
  contact       text,                                        -- 문의 전화
  program_type  text,                                        -- 분류 (특강 등)
  session_label text,                                        -- 회차 표기 (4회차 등)
  format        text        CHECK (format IN ('offline','online','hybrid')),  -- 대면/온라인/혼합
  summary       text,                                        -- 내용
  event_at      timestamptz,                                 -- 일시 (시작)
  event_end_at  timestamptz,                                 -- 종료 시각 (원문에 없으면 null)
  location      text,                                        -- 장소
  apply_start   timestamptz,                                 -- 신청 시작
  apply_end     timestamptz,                                 -- 신청 마감 (이 시각 전까지 신청 가능)
  capacity      int         CHECK (capacity IS NULL OR capacity > 0),   -- 모집인원
  target        text,                                        -- 대상
  benefits      text[]      NOT NULL DEFAULT '{}',           -- 혜택 (ko)
  certificate   boolean,                                     -- 수료증 발급 여부 (null = 원문에 정보 없음)
  no_show_flag  boolean,                                     -- 불참자 지정 여부 (null = 원문에 정보 없음)
  how_to_apply  text,                                        -- 신청 방법
  source_url    text,                                        -- 원문 신청 링크 (로그인 필요)
  translations  jsonb       NOT NULL DEFAULT '{}',
    -- { en|zh|ja: { title, department, program_type, session_label, summary, location, target, benefits[], how_to_apply } }
  published     boolean     NOT NULL DEFAULT true,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS extracurricular_programs_updated_at ON public.extracurricular_programs;
CREATE TRIGGER extracurricular_programs_updated_at
  BEFORE UPDATE ON public.extracurricular_programs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 목록: 공개 행을 신청 마감 순으로 읽는다
CREATE INDEX IF NOT EXISTS idx_extracurricular_programs_published
  ON public.extracurricular_programs (published, apply_end, event_at);

ALTER TABLE public.extracurricular_programs ENABLE ROW LEVEL SECURITY;

-- 공개: published 행만 누구나(비로그인 포함) 조회
DROP POLICY IF EXISTS "programs_select_published" ON public.extracurricular_programs;
CREATE POLICY "programs_select_published"
  ON public.extracurricular_programs FOR SELECT
  USING (published = true);

-- 관리자: 전체 조회·수정 (비공개 행 포함)
DROP POLICY IF EXISTS "programs_admin_all" ON public.extracurricular_programs;
CREATE POLICY "programs_admin_all"
  ON public.extracurricular_programs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── seed: 테스트용 프로그램 1건 ─────────────────────────────────────────
-- 원문(BUFS 인재시스템)에서 수동으로 옮긴 값. 원문에 없는 항목은 null 로 둔다.
-- 번역은 사람이 작성했다. 교내 용어는 풀어 쓰고 괄호에 한국어 원어를 남긴다.
-- 날짜·시간은 컬럼(timestamptz)에만 두고 번역문에는 넣지 않는다(화면에서 언어별로 표기).
INSERT INTO public.extracurricular_programs (
  slug, title, department, contact, program_type, session_label, format, summary,
  event_at, event_end_at, location, apply_start, apply_end,
  capacity, target, benefits, certificate, no_show_flag, how_to_apply, source_url,
  translations, published, sort_order
) VALUES (
  'asean-expert-lecture-4',
  '[신입생 PSC세미나 시수 1시간 인정] 아세안 전문가 특별 강연 (4차)',
  '아세안연구원',
  '051-509-5670',
  '특강',
  '4회차',
  'offline',
  '이상화 대사 "아세안, 동쪽 끝에서 서쪽 끝까지 — 미얀마·필리핀 대사를 거치며 발전한 아세안의 기회와 가능성"',
  '2026-11-26 17:00:00+09',
  NULL,
  '부산외대 D동 332호',
  '2026-10-28 00:00:00+09',
  '2026-11-26 17:00:00+09',
  40,
  '1~4학년 / 학과·국적·성별 제한없음',
  ARRAY['비교과 지수 2점', '신입생 PSC 세미나 1시간 인정'],
  false,
  true,
  'BUFS 인재시스템 → 비교과프로그램 → 프로그램 신청',
  'https://eport.bufs.ac.kr/ncs/b/ncsb0020s.aspx?mc=0089',
  '{
    "en": {
      "title": "[1 hour credited toward the First-year PSC Seminar (신입생 PSC세미나)] ASEAN Expert Special Lecture (Session 4)",
      "department": "ASEAN Research Institute (아세안연구원)",
      "program_type": "Special lecture",
      "session_label": "Session 4",
      "summary": "Ambassador Lee Sang-hwa (이상화): \"ASEAN, from the Eastern Edge to the Western Edge: the opportunities and potential of ASEAN, seen through postings as ambassador to Myanmar and the Philippines\"",
      "location": "Room 332, Building D, BUFS (부산외대 D동 332호)",
      "target": "Years 1 to 4. No restriction on major, nationality, or gender",
      "benefits": [
        "+2 extracurricular activity points (비교과 지수 2점)",
        "1 hour counted toward the First-year PSC Seminar requirement (신입생 PSC세미나 1시간 인정)"
      ],
      "how_to_apply": "BUFS Talent System (BUFS 인재시스템) → Extracurricular Programs (비교과프로그램) → Apply for Program (프로그램 신청)"
    },
    "zh": {
      "title": "[认定新生PSC研讨课（신입생 PSC세미나）1小时] 东盟专家特别讲座（第4场）",
      "department": "东盟研究院（아세안연구원）",
      "program_type": "特别讲座",
      "session_label": "第4场",
      "summary": "Lee Sang-hwa（이상화）大使：“东盟，从东端到西端：历任驻缅甸、驻菲律宾大使所见东盟的机遇与潜力”",
      "location": "釜山外国语大学 D栋 332室（부산외대 D동 332호）",
      "target": "1～4年级，不限学科、国籍、性别",
      "benefits": [
        "非教学活动指数（비교과 지수）加2分",
        "认定新生PSC研讨课（신입생 PSC세미나）1小时"
      ],
      "how_to_apply": "BUFS人才系统（BUFS 인재시스템）→ 非教学课程（비교과프로그램）→ 申请课程（프로그램 신청）"
    },
    "ja": {
      "title": "[新入生PSCセミナー（신입생 PSC세미나）1時間認定] ASEAN専門家特別講演（第4回）",
      "department": "ASEAN研究院（아세안연구원）",
      "program_type": "特別講演",
      "session_label": "第4回",
      "summary": "イ・サンファ（이상화）大使「ASEAN、東の端から西の端まで：ミャンマー・フィリピン大使を歴任して見たASEANの機会と可能性」",
      "location": "釜山外国語大学 D棟 332号室（부산외대 D동 332호）",
      "target": "1～4年生、学科・国籍・性別の制限なし",
      "benefits": [
        "非教科活動指数（비교과 지수）2点",
        "新入生PSCセミナー（신입생 PSC세미나）1時間認定"
      ],
      "how_to_apply": "BUFS人材システム（BUFS 인재시스템）→ 非教科プログラム（비교과프로그램）→ プログラム申請（프로그램 신청）"
    }
  }'::jsonb,
  true,
  0
)
ON CONFLICT (slug) DO NOTHING;
