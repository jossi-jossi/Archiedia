# TODO — 1차 목표: 데스크톱 앱 + 영화 콘텐츠 관리

> 기준 문서: [ARCHITECTURE.md](./ARCHITECTURE.md)
> 왓챠피디아 크롤링(로그인 세션 필요)은 난이도가 높아 1차 범위에서 제외. 우선 **TMDB API + 수동 입력**으로 영화 관리 MVP를 완성하고, 크롤링 연동은 2차로 미룬다.

**플랫폼 지원**: 전 항목 Win/macOS 공통 지원 목표 (Electron/Supabase/TMDB API 기반이라 OS 종속 로직 거의 없음). OS별 예외가 생기는 항목에만 개별로 표시.

---

## Phase 1 — 프로젝트 스캐폴딩

- [ ] Electron + React + TypeScript 프로젝트 초기화 (`src/` — 데스크톱 앱 본체)
- [ ] `packages/schema` 패키지 생성 (공용 도메인 타입 자리 — 지금은 비어있어도 됨)
- [ ] 기본 빌드/실행 스크립트 확인 (`npm run dev` 등, Win/macOS 둘 다 로컬에서 구동 확인)
- [ ] ESLint/Prettier 등 최소 코드 스타일 설정

## Phase 2 — Supabase 설정

- [ ] Supabase 프로젝트 생성
- [ ] `content_items` 테이블 생성 (id, type, title, source, external_id, poster_url, metadata jsonb)
- [ ] `user_records` 테이블 생성 (content_item_id, my_rating, my_review, watch_count, last_watched_at, watch_medium, tags)
- [ ] 인증 방식 결정 (개인용 1인 사용이므로 단순 이메일 로그인 or Supabase anon key + RLS로 충분한지 확인)
- [ ] 환경변수(.env) 관리 방식 정리 (Supabase URL/키를 Electron 앱에 안전하게 주입하는 방법)
- [ ] 앱 실행 시 헬스체크 핑 — 7일 비활성 자동 정지 방지용

## Phase 3 — 공용 스키마/도메인 모델

- [ ] Supabase 스키마 기반 TS 타입 생성 (`packages/schema`)
- [ ] `ContentItem`, `UserRecord` 도메인 타입 정의 (discriminated union으로 영화 metadata 타입 안정성 확보)
- [ ] 영화 metadata 타입 정의: 제목/원제/개봉연도/포스터/감독/장르/배우/러닝타임/제작국가/예고편/시리즈연결

## Phase 4 — 영화 수동 등록 (MVP 우선순위)

- [ ] 영화 등록 폼 UI (메타데이터 전체 입력)
- [ ] Supabase에 저장 (`content_items` + `user_records` insert)
- [ ] 등록한 영화 목록 뷰 (카드/리스트)
- [ ] 영화 상세 뷰 (포스터, 메타데이터, 개인 기록 표시)
- [ ] 개인 기록 수정 UI (평점/후기/본 횟수/마지막 관람일/관람 매체/태그)

## Phase 5 — TMDB 연동 (메타데이터 자동 입력)

- [ ] TMDB API 키 발급 및 연동 방식 결정 (클라이언트 직접 호출 vs Supabase Edge Function 경유)
- [ ] 제목으로 TMDB 검색 → 후보 목록 표시
- [ ] 후보 선택 시 감독/장르/배우/러닝타임/포스터/원제/개봉연도/제작국가 자동 채움
- [ ] 예고편 URL 자동 연결 (TMDB videos 엔드포인트)
- [ ] 자동 입력 후 사용자가 직접 수정 가능하도록 폼 유지

## Phase 6 — 라이브러리 뷰 완성

- [ ] 검색 (제목/원제 기준)
- [ ] 필터 (장르, 태그, 관람 매체 등)
- [ ] 정렬 (개봉연도, 나의 평점, 마지막 관람일 등)
- [ ] 태그 상태 변경 UI (보고 싶음 / 1번 봄 / n번 봄)

## Phase 7 — 패키징

- [ ] electron-builder 설정
- [ ] Windows 빌드 확인
- [ ] macOS 빌드 확인 (실 기기 없으면 최소 설정만 준비, 추후 검증)

---

## 2차 범위 (지금은 손대지 않음)

- 왓챠피디아 로그인 세션 크롤링 연동 (Playwright 기반 `WatchaAdapter`)
- 책/웹툰/드라마 등 타 콘텐츠 타입 확장
- 원작-각색 콘텐츠 간 관계 모델링
- 모바일 앱 (`apps/mobile`) 분리 및 `packages/schema` 공유
