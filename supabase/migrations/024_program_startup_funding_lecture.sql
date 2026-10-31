-- ============================================================
-- 024_program_startup_funding_lecture.sql
-- 비교과 프로그램 seed 1건 추가 — 창업 치트키 「내 아이디어로 지원금 받기」
-- ⚠️ 아직 적용 전 — Supabase 대시보드 SQL Editor에서 실행
--
-- 테이블(extracurricular_programs)은 023 에서 만들어 이미 적용됐으므로 이 파일은 INSERT 만 담는다.
-- 원문(BUFS 인재시스템)에서 수동으로 옮긴 값. 원문에 없는 항목(종료 시각)은 null 로 둔다.
-- 번역은 사람이 작성했다. 교내 용어·부서명·장소는 풀어 쓰고 괄호에 한국어 원어를 남긴다.
-- 날짜·시간은 컬럼(timestamptz)에만 두고 번역문에는 넣지 않는다(화면에서 언어별로 표기).
-- 023 의 아세안 특강과 달리 신입생 PSC 세미나 시간 인정은 없고, 수료증 발급 가능, 공인 결석계 발급.
-- ============================================================

INSERT INTO public.extracurricular_programs (
  slug, title, department, contact, program_type, session_label, format, summary,
  event_at, event_end_at, location, apply_start, apply_end,
  capacity, target, benefits, certificate, no_show_flag, how_to_apply, source_url,
  translations, published, sort_order
) VALUES (
  'startup-funding-lecture',
  '창업 치트키 「내 아이디어로 지원금 받기」',
  '창업지원팀',
  '051-509-5597',
  '특강',
  '1회차',
  'offline',
  '이동수 대표(다이버시티 하우스) — 정부지원사업·창업경진대회 참여 노하우와 사업계획서 작성 요령 등 창업 준비 실전 정보',
  '2026-11-04 14:00:00+09',
  NULL,
  'D434호',
  '2026-10-15 00:00:00+09',
  '2026-11-04 13:00:00+09',
  40,
  '1~4학년 / 학과·국적·성별 제한없음',
  ARRAY['비교과 지수 2점', '공인 결석계 발급'],
  true,
  true,
  'BUFS 인재시스템 → 비교과프로그램 → 프로그램 신청',
  'https://eport.bufs.ac.kr/ncs/b/ncsb0020s.aspx?mc=0089',
  '{
    "en": {
      "title": "Startup Cheat Key: \"Get Funding for My Idea\"",
      "department": "Startup Support Team (창업지원팀)",
      "program_type": "Special lecture",
      "session_label": "Session 1",
      "summary": "Lee Dong-su (이동수), CEO of Diversity House (다이버시티 하우스): practical information for preparing a startup, including know-how for taking part in government support programs and startup competitions, and tips for writing a business plan",
      "location": "Room D434 (D434호)",
      "target": "Years 1 to 4. No restriction on major, nationality, or gender",
      "benefits": [
        "+2 extracurricular activity points (비교과 지수 2점)",
        "Official excused-absence form issued (공인 결석계 발급)"
      ],
      "how_to_apply": "BUFS Talent System (BUFS 인재시스템) → Extracurricular Programs (비교과프로그램) → Apply for Program (프로그램 신청)"
    },
    "zh": {
      "title": "创业秘籍「用我的创意获得资助金」",
      "department": "创业支援组（창업지원팀）",
      "program_type": "特别讲座",
      "session_label": "第1场",
      "summary": "Lee Dong-su（이동수）代表（Diversity House／다이버시티 하우스）：参与政府支援项目与创业竞赛的经验、商业计划书撰写要领等创业准备实战信息",
      "location": "D434室（D434호）",
      "target": "1～4年级，不限学科、国籍、性别",
      "benefits": [
        "非教学活动指数（비교과 지수）加2分",
        "可开具公认缺勤证明（공인 결석계 발급）"
      ],
      "how_to_apply": "BUFS人才系统（BUFS 인재시스템）→ 非教学课程（비교과프로그램）→ 申请课程（프로그램 신청）"
    },
    "ja": {
      "title": "起業チートキー「自分のアイデアで支援金をもらう」",
      "department": "起業支援チーム（창업지원팀）",
      "program_type": "特別講演",
      "session_label": "第1回",
      "summary": "イ・ドンス（이동수）代表（Diversity House／다이버시티 하우스）：政府支援事業・起業コンテストへの参加ノウハウ、事業計画書の書き方など、起業準備の実践情報",
      "location": "D434号室（D434호）",
      "target": "1～4年生、学科・国籍・性別の制限なし",
      "benefits": [
        "非教科活動指数（비교과 지수）2点",
        "公認欠席届の発行（공인 결석계 발급）"
      ],
      "how_to_apply": "BUFS人材システム（BUFS 인재시스템）→ 非教科プログラム（비교과프로그램）→ プログラム申請（프로그램 신청）"
    }
  }'::jsonb,
  true,
  1
)
ON CONFLICT (slug) DO NOTHING;
