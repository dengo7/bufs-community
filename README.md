<div align="center">

# The Well

**부산외국어대학교 외국인 유학생을 위한 생활 커뮤니티**

![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-supabase--js_2.106-3FCF8E?logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)

</div>

## 서비스 소개

The Well은 부산외국어대학교(BUFS)에 다니는 외국인 유학생이 학교생활과 한국 생활에 필요한 정보를 한곳에서 찾고, 서로 묻고 답할 수 있는 커뮤니티 앱입니다.

웹(PWA)으로 만들었고, [Capacitor](https://capacitorjs.com/)로 감싸 **iOS · Android 앱**으로도 제공하는 구조입니다. 화면은 한국어·영어·중국어·일본어 4개 언어를 지원합니다.

## 스크린샷

| 홈 | 캠퍼스 가이드 | 통학버스 | 커뮤니티 |
| :---: | :---: | :---: | :---: |
| 준비 중 | 준비 중 | 준비 중 | 준비 중 |

## 해결하려는 문제

- **학교 공지가 한국어로만 올라온다** — 학사·국제교류처 공지를 자동으로 수집하고 4개 언어로 번역해 보여 줍니다.
- **캠퍼스 시설·운영 시간을 알기 어렵다** — 편의점, 식당, 인쇄소 등을 상황별로 찾고 지금 운영 중인지 바로 확인할 수 있습니다.
- **통학버스 시간표가 복잡하다** — 평일·금요일·기간별 시간표를 나누고, 오늘 기준 다음 버스를 안내합니다.
- **비자, 부동산, 은행, 통신, 보험, 병원, 아르바이트 정보가 흩어져 있다** — 카테고리별 게시판과 관리자가 관리하는 가이드로 묶었습니다.
- **학사 일정과 수업 관리가 번거롭다** — 학사일정과 개인 시간표를 앱 안에서 함께 봅니다.
- **모르는 것을 물어볼 곳이 없다** — 게시글에 언어를 지정할 수 있는 커뮤니티에서 선배·동료 유학생에게 질문할 수 있습니다.

## 주요 기능

`app/` 라우트 기준입니다.

| 기능 | 경로 | 설명 |
| --- | --- | --- |
| 홈 | `/` | 히어로 배너, 공지, 캠퍼스 가이드 섹션, 통학버스 다음 버스 퀵 카드, 다가오는 학사일정, 카테고리 바로가기, 최신 글 |
| 캠퍼스 가이드 | `/campus`, `/campus/[id]` | 교내시설·식당/카페·도서관/공부·이동/교통·편의시설·건강/안전·학교 꿀팁 분류, 상황별 바로가기, 시설 상세, 운영 상태 계산, "공식 정보 / 학생 팁" 배지 |
| 통학버스 | `/campus/shuttle` | 마을버스 금정 3번·3-2번 시간표(월~목 / 금 / 계절학기 / 방학 구분), 다음 버스 안내, 탑승 위치 |
| 학사일정 | `/schedule` | 시험·방학·신청 등 유형별 일정, 다가오는 일정 표시 |
| 시간표 | `/timetable` | 과목·요일·시간·강의실·교수·학점 입력, 시간 겹침 검사, 오늘의 수업 |
| 학교 공지 | `/notices` | 학사공지·국제교류처 공지 목록, 언어별 번역 제목 |
| 커뮤니티 | `/community`, `/category/[slug]`, `/post/[id]`, `/write` | 카테고리별 게시판, 글쓰기(이미지 최대 5장, 업로드 전 압축), 댓글·답글, 좋아요, 북마크, 신고, 사용자 차단, 글 핀 고정 |
| 생활 가이드 | `/category/[slug]`, `/guide/[id]`, `/guides` | 부동산·은행·통신·보험·병원 카테고리의 가이드 카드(절차·장소·체크리스트·정보). 관리자가 편집 |
| 검색 | `/search` | 게시글 검색 |
| 알림 | `/notifications` | 댓글·답글 알림, 웹 푸시(Service Worker + VAPID) |
| 내 정보 | `/my`, `/my/posts`, `/my/saved`, `/my/blocks`, `/my/notifications` | 내가 쓴 글, 저장한 글, 차단 목록, 알림 설정, 언어 변경, 이용약관·개인정보처리방침, 앱 사용 가이드 |
| 인증 | `/auth`, `/auth/reset` | 이메일·비밀번호 가입/로그인(이메일 인증), 비밀번호 재설정 |
| 계정 삭제 | `/account-deletion` | 계정 삭제 안내 및 처리(`/api/delete-account`) |

커뮤니티 카테고리는 학교생활 · 비자 · 부동산 · 은행 · 통신·유심 · 보험 · 병원 · 알바 8가지입니다.

**관리·운영 기능**
- 관리자 역할(`profiles.role = 'admin'`)이 게시글 삭제, 사용자 차단, 핀 고정, 가이드 편집을 할 수 있습니다.
- 게시글 신고는 이메일로 관리자에게 전달됩니다(Resend).
- 학교 공지는 GitHub Actions가 **매시 17분**에 자동 수집합니다(`.github/workflows/crawl-notices.yml`).

## 기술 스택

| 구분 | 기술 | 버전 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router) | 16.2.6 |
| UI | React / React DOM | 19.2.4 |
| 언어 | TypeScript | ^5 |
| 스타일 | Tailwind CSS | ^4 |
| 아이콘 | lucide-react | ^1.16.0 |
| 백엔드 | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) | ^2.106.1 / ^0.10.3 |
| 모바일 | Capacitor (`core`, `ios`, `android`, `splash-screen`) | ^8.4.1 / ^8.4.1 / ^8.5.1 / ^8.0.2 |
| 웹 푸시 | web-push | ^3.6.7 |
| 이메일 | Resend | ^6.14.0 |
| 이미지 | browser-image-compression, sharp | ^2.0.2 / ^0.35.4 |
| 공지 수집 | cheerio, Gemini API(번역) | ^1.2.0 |
| 앱 아이콘·스플래시 | `@capacitor/assets` | ^3.0.5 |
| 린트 | ESLint, eslint-config-next | ^9 / 16.2.6 |

## 다국어 지원

| 코드 | 언어 |
| --- | --- |
| `ko` | 한국어 (기본값) |
| `en` | English |
| `zh` | 中文 |
| `ja` | 日本語 |

- 선택한 언어는 브라우저 `localStorage`(`the-well-lang`)에 저장되고 `<html lang>`에 반영됩니다. (`app/lib/lang.ts`)
- 화면 문구는 각 페이지·컴포넌트와 `app/lib/*I18n.ts`에 4개 언어로 정의되어 있습니다.
- 게시글 언어는 DB에 `kr` · `en` · `cn` · `jp`로 저장되며, UI 언어 코드와 상호 변환됩니다.
- 학교 공지는 수집 시 Gemini로 번역하고, 실패한 항목은 Google 번역으로 대체합니다.
- 캠퍼스 시설 상세 번역(`campusFacilityTranslations.ts`)은 시설 데이터 갱신 시 함께 관리합니다.

## 프로젝트 구조

```
.
├── app/                    # Next.js App Router
│   ├── api/                # 서버 라우트: 계정 삭제, 푸시, 신고 메일, 관리자(글 삭제·사용자 차단)
│   ├── auth/               # 로그인·가입·비밀번호 재설정·인증 콜백
│   ├── campus/             # 캠퍼스 가이드, 통학버스
│   ├── category/ guide/ guides/   # 카테고리 게시판, 생활 가이드
│   ├── community/ post/ write/ search/
│   ├── schedule/ timetable/ notices/ notifications/
│   ├── my/                 # 내 정보·저장·차단·약관 등
│   ├── components/         # 공용 컴포넌트 (BottomTabBar, HeroBanner, campus/ …)
│   ├── lib/                # 도메인 로직·다국어 문구·Supabase 클라이언트·타입
│   └── manifest.ts         # PWA 매니페스트
├── proxy.ts                # Supabase 인증 세션 갱신 (Next.js Proxy)
├── supabase/migrations/    # SQL 마이그레이션 기록
├── scripts/crawl-notices.mjs   # 학교 공지 크롤러·번역
├── .github/workflows/      # 공지 수집 스케줄 (crawl-notices.yml)
├── public/                 # 정적 파일, Service Worker(sw.js), 캠퍼스 사진
├── ios/  android/          # Capacitor 네이티브 프로젝트
├── capacitor.config.ts     # Capacitor 설정
├── icons/  assets/  generate-icons.mjs   # 앱 아이콘·스플래시 리소스
└── AGENTS.md  CLAUDE.md    # AI 코딩 도구용 작업 지침
```

## 로컬 실행 방법

**요구 사항**: Node.js와 npm (공지 수집 워크플로는 Node 22 기준), Supabase 프로젝트

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 — 아래 "환경 변수" 참고
#    프로젝트 루트에 .env.local 파일을 만든다

# 3. 개발 서버 실행
npm run dev        # http://localhost:3000
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | ESLint |
| `npm run crawl:notices` | 학교 공지 수집(`--dry-run`으로 파싱만 확인 가능) |
| `npm run cap:sync` | Capacitor 네이티브 프로젝트 동기화 |
| `npm run cap:open` | Xcode에서 iOS 프로젝트 열기 |

**데이터베이스**: `supabase/migrations/`의 SQL을 번호 순서대로 Supabase에 적용합니다. 다만 `notices`, `timetable_courses` 테이블과 Storage 버킷(`post-images`) 정의는 이 폴더에 없으므로 Supabase 프로젝트에서 별도로 준비해야 합니다.

## 환경 변수

키 이름만 적습니다. 값은 저장소에 올리지 마세요 (`.env.local`).

**웹 앱 (`.env.local`)**

| 키 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개(anon) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 관리자 키 (계정 삭제·푸시·관리자 API) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 웹 푸시 공개 키 |
| `VAPID_PRIVATE_KEY` | 웹 푸시 비공개 키 |
| `VAPID_SUBJECT` | 웹 푸시 발신자 식별자 |
| `PUSH_WEBHOOK_SECRET` | `/api/push` 호출 검증용 시크릿 |
| `RESEND_API_KEY` | 신고 알림 이메일 발송 |
| `ADMIN_EMAIL` | 신고 알림 수신 주소 |

**공지 수집 (GitHub Actions Secrets / 로컬 실행 시 환경 변수)**

| 키 | 용도 |
| --- | --- |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 공지 저장용 관리자 키 |
| `GEMINI_API_KEY` | 공지 번역 (없으면 번역 단계 제한) |
| `GEMINI_MODEL` | 번역 모델 (선택) |
| `GEMINI_DELAY_MS` | 번역 배치 사이 대기 시간 (선택, 기본 15000ms) |

## 배포

- **웹**: Vercel에 배포합니다. 앱이 바라보는 주소는 `https://bufs-community.vercel.app`입니다.
- **iOS · Android**: Capacitor 앱이 정적 번들을 담지 않고 **배포된 웹 주소를 원격으로 불러오는 방식**입니다. (`capacitor.config.ts`의 `server.url`)
  - 따라서 웹을 배포하면 앱에도 바로 반영되고, 화면 변경만으로는 스토어 재배포가 필요 없습니다.
  - 네이티브 설정·플러그인·아이콘·스플래시를 바꿀 때는 `npm run cap:sync` 후 Xcode / Android Studio에서 다시 빌드해야 합니다.
  - 앱 ID: `com.bufs.thewell`, 앱 이름: `The Well`
- **공지 수집**: 웹 배포와 별개로 GitHub Actions가 실행합니다.
