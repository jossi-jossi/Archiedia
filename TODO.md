# TODO — 1차 목표: 데스크톱 앱 + 영화·시리즈·웹툰 콘텐츠 관리

> 기준 문서: [ARCHITECTURE.md](./ARCHITECTURE.md)
> 왓챠피디아는 공식 API/내보내기 기능이 없어 로그인 세션 크롤링(Playwright 등)을 1차 범위에서 제외하고, 우선 **TMDB API + 수동 입력**으로 영화 관리 MVP를 완성했다. 이후 왓챠 데이터 이전은 크롤링 대신, 커뮤니티 북마클릿 스크립트로 사용자가 직접 CSV로 내보낸 뒤 앱에서 가져오는 방식(Phase 9)으로 해결.

**플랫폼 지원**: 전 항목 Win/macOS 공통 지원 목표 (Electron/Supabase/TMDB API 기반이라 OS 종속 로직 거의 없음). OS별 예외가 생기는 항목에만 개별로 표시.

---

## Phase 1 — 프로젝트 스캐폴딩

- [x] Electron + React + TypeScript 프로젝트 초기화 (`src/` — 데스크톱 앱 본체, electron-vite react-ts 템플릿, npm workspaces)
- [x] `packages/schema` 패키지 생성 (공용 도메인 타입 자리 — 지금은 비어있어도 됨)
- [x] 기본 빌드/실행 스크립트 확인 (`npm run dev`, `npm run typecheck` — Windows에서 정상 구동 확인. macOS는 미검증)
- [x] ESLint/Prettier 등 최소 코드 스타일 설정 (템플릿 기본 제공)

## Phase 2 — Supabase 설정

- [x] Supabase 프로젝트 생성
- [x] `content_items` 테이블 생성 (id, user_id, type, title, source, external_id, poster_url, metadata jsonb)
- [x] `user_records` 테이블 생성 (id, user_id, content_item_id, my_rating, my_review, watch_count, last_watched_at, watch_medium, tags)
- [x] 인증 방식 결정 — Supabase Auth(이메일/비밀번호) + RLS로 사용자별 데이터 격리 (로그인 UI 구현은 Phase 4에서)
- [x] 환경변수(.env) 관리 방식 정리 — `.env`(gitignore) + `VITE_` 프리픽스로 렌더러에 주입, `.env.example` 제공
- [x] 앱 실행 시 헬스체크 핑 — `src/renderer/src/lib/supabase.ts`의 `pingSupabase()`, 7일 비활성 자동 정지 방지용

## Phase 3 — 공용 스키마/도메인 모델

- [x] Supabase 스키마 기반 TS 타입 생성 (`packages/schema/src/types/database.ts` — `schema.sql` 기준 수동 작성)
- [x] `ContentItem`, `UserRecord` 도메인 타입 정의 (`types/content.ts`, discriminated union으로 영화 metadata 타입 안정성 확보) + DB row ↔ 도메인 타입 매퍼(`mappers.ts`)
- [x] 영화 metadata 타입 정의: 원제/개봉연도/감독/장르/배우/러닝타임/제작국가/예고편/시리즈연결 (`MovieMetadata`, 제목·포스터는 `content_items` 공통 컬럼)

## Phase 4 — 영화 수동 등록 (MVP 우선순위)

- [x] 디자인 시안 기준 CSS 토큰/공용 클래스 작성 — 원본 `Nocturne` 디자인 시스템(`styles.css`)을 사용자가 추가로 업로드해줘서, 추측 없이 실제 값 그대로 `src/renderer/src/styles/nocturne.css`로 이식 + 연두색 액센트 오버라이드(`accent-override.css`). 구글 폰트 CDN import만 CSP상 제거하고 시스템 폰트로 폴백
- [x] 로그인/회원가입 화면 (Supabase Auth 이메일/비밀번호) — `features/auth/LoginScreen.tsx`, `useSession.ts`
- [x] ~~영화 등록 폼 UI~~ → 이후 TMDB 검색 기반 원클릭 보관 방식으로 대체 (`AddMovieForm.tsx` 삭제, 아래 8절 참고)
- [x] Supabase에 저장 (`content_items` + `user_records` insert) — `features/movies/api.ts`
- [x] 등록한 영화 목록 뷰 (카드/리스트) — `features/movies/LibraryView.tsx`
- [x] 영화 상세 뷰 (포스터, 메타데이터, 개인 기록 표시) — `features/movies/MovieDetail.tsx`, 고정 크기(880×620) 모달 팝업으로 구현 (라이브러리 위에 오버레이, Esc/바깥 클릭으로 닫힘)
- [x] 개인 기록 수정 UI (평점/후기/본 횟수/마지막 관람일/관람 매체/태그) — `MovieDetail.tsx` 내 인라인 편집(별점 클릭, blur 시 자동 저장)

## Phase 5 — TMDB 연동 (메타데이터 자동 입력)

- [x] TMDB API 키 발급 및 연동 방식 결정 — 렌더러에서 직접 호출 (`.env`의 `VITE_TMDB_API_KEY`, Supabase와 동일 패턴)
- [x] 제목으로 TMDB 검색 → 후보 목록 표시 (`features/movies/TmdbSearch.tsx`)
- [x] 후보 선택 시 감독/장르/배우/러닝타임/포스터/원제/개봉연도/제작국가 자동 채움 (`lib/tmdb.ts`의 `getMovieDetails`)
- [x] 예고편 URL 자동 연결 (TMDB videos 엔드포인트, YouTube 트레일러 우선)
- [x] ~~자동 입력 후 사용자가 직접 수정 가능하도록 폼 유지~~ → 검색 결과에서 "보관하기" 클릭 시 수정 단계 없이 바로 라이브러리에 추가하는 방식으로 변경 (아래 8절 참고)

## Phase 6 — 라이브러리 뷰 완성

- [x] 검색 (제목/원제 기준) — Phase 4에서 이미 구현
- [x] 필터 (장르, 태그, 관람 매체 등) — `FilterDropdown.tsx`, 라이브러리에 실제 등장하는 값만 옵션으로 표시
- [x] 정렬 (개봉연도, 나의 평점, 마지막 관람일 등) — 상단 드롭다운
- [x] 태그 상태 변경 UI (보고 싶음 / 1번 봄 / n번 봄) — `StatusQuickEdit.tsx`, 그리드/리스트에서 상세 화면 진입 없이 하트 아이콘으로 "보고 싶음" 상태를 바로 토글 (관람 기록 추가는 상세 화면에서)

## Phase 8 — 검색·추가 흐름 변경 (수정 단계 제거)

- [x] 검색 결과 카드 우측에 "보관하기" 버튼 — 클릭 시 수정 화면 없이 바로 `content_items`/`user_records` 생성
- [x] 이미 보관된 영화는 "보관 중"으로 표시(비활성화) — `content_items.external_id`(TMDB id)로 판별. **주의**: 이 변경 이전에 추가된 영화는 `external_id`가 저장되어 있지 않아 중복 판별이 안 됨
- [x] `createMovie`가 `source: 'tmdb'` + `external_id`를 저장하도록 변경 (예전엔 항상 `source: 'manual'`이었음)
- [x] `AddMovieForm.tsx` 삭제 — 수동 입력/사전 수정 단계 자체가 없어짐

## Phase 9 — 왓챠피디아 데이터 가져오기

- [x] 왓챠피디아 공식 내보내기 기능 부재 확인 — 커뮤니티 북마클릿 스크립트([erinyskim/watchapedia-export](https://github.com/erinyskim/watchapedia-export))로 본인 프로필을 CSV로 내보내는 방식 채택 (사용자가 브라우저에서 직접 실행, 앱은 이 CSV를 가져오기만 함)
- [x] CSV 파서 (`lib/csv.ts`) — 따옴표/콤마/줄바꿈 포함 필드 처리, UTF-8 BOM 제거
- [x] 가져오기 화면 (`features/movies/WatchaImportScreen.tsx`, 사이드바 "왓챠 가져오기") — CSV 업로드 → `Type=MOVIE` 항목만 추출 → 제목/연도로 TMDB 검색·매칭 → 순차 보관
- [x] 매칭된 항목은 왓챠의 평점/리뷰/시청일을 그대로 `user_records`에 반영 (`createMovie`에 `initialRecord` 옵션 추가); 시청일이 없는 항목에 찍히는 플레이스홀더(`1970-01-01`)는 null로 처리
- [x] 이미 보관된 작품(TMDB id 기준) 자동 스킵, TMDB 매칭 실패 작품은 목록으로 표시해 수동 확인 가능
- [x] 실사용 검증 완료 — 실제 왓챠 CSV로 가져오기 테스트 성공

## Phase 10 — 시리즈(드라마) 지원

- [x] `DramaMetadata` 타입 추가 (`packages/schema`) — 처음엔 `MovieMetadata`와 동일한 구조였다가, 시즌별 정보 지원을 위해 감독/출연/줄거리/러닝타임을 `seasons: DramaSeasonMetadata[]`로 이동 (장르/국가/예고편만 쇼 전체 공통)
- [x] TMDB TV 엔드포인트 연동 (`lib/tmdb.ts`의 `searchTv`/`getTvDetails`) — `/search/tv`, `/tv/{id}`. 시즌 0(스페셜)은 목록에서 제외
- [x] 시즌별 상세 조회 (`getSeasonDetail`, `/tv/{id}/season/{n}?append_to_response=credits`) — 시즌별 감독(크루의 Director)/출연(캐스트)/줄거리/평균 러닝타임(에피소드 runtime 평균)을 따로 가져옴
- [x] `content_items.type = 'drama'`로 시리즈 저장 (스키마에 이미 허용돼 있어 DB 마이그레이션 불필요) — `features/series/api.ts`
- [x] 시리즈 라이브러리/검색·추가/상세팝업(`features/series/LibraryView.tsx`, `TvSearch.tsx`, `AddSeriesScreen.tsx`, `SeriesDetail.tsx`) — 영화 쪽과 레이아웃 거의 동일. 상세팝업만 시즌이 2개 이상이면 시즌 선택 드롭다운이 추가되고, 감독/출연/줄거리가 선택된 시즌 기준으로 바뀜
- [x] 사이드바에 "영화"(기존 라이브러리 이름 변경 + 아이콘 변경)와 "시리즈" 섹션을 나란히 배치
- [x] 콘텐츠 타입 무관하게 재사용되던 로직을 공용 위치로 정리: `wishlist.ts`/`userRecords.ts` → `lib/`, `StatusQuickEdit.tsx`/`FilterDropdown.tsx` → `components/`
- [ ] 왓챠 가져오기(Phase 9)는 아직 영화 전용 — 시리즈(TV) 확장은 미착수

## Phase 11 — 웹툰 지원

- [x] 웹툰 API 조사 — TMDB 같은 공식 API 없음. 후보로 검토한 오픈소스 통합 API([korea-webtoon-api](https://github.com/HyeokjaeLee/korea-webtoon-api))는 목록 조회만 있고 장르/줄거리/평점이 없는 데다 공개 호스팅 인스턴스도 죽어있어서 제외. 대신 네이버웹툰 웹사이트 자체가 쓰는 비공식 내부 API를 브라우저 개발자도구로 직접 찾아서 사용
- [x] 네이버웹툰 비공식 API 엔드포인트 3개 확보 — 검색 `GET /api/search/all?keyword=`, 상세 `GET /api/article/list/info?titleId=`, 회차수 `GET /api/article/list?titleId=&page=1`
- [x] `WebtoonMetadata` 타입 추가 (`packages/schema`) — author/genres/tags/overview/isFinished/totalEpisodes/sourceUrl/backgroundColor
- [x] 웹툰 API는 CORS를 허용하지 않아 렌더러에서 직접 fetch가 막힐 수 있어서, 메인 프로세스에 IPC 핸들러(`webtoon:request`, 알려진 웹툰 도메인만 허용)를 두고 그쪽에서 대신 요청 — `src/main/index.ts`, `preload`, `lib/naverWebtoon.ts` / `lib/kakaoWebtoon.ts`
- [x] `content_items.type = 'webtoon'`으로 저장, `source: 'naver' | 'kakao'` (스키마에 이미 허용돼 있어 DB 마이그레이션 불필요) — `features/webtoons/api.ts`
- [x] 웹툰 라이브러리/검색·추가/상세팝업(`features/webtoons/LibraryView.tsx`, `NaverSearch.tsx`, `AddWebtoonScreen.tsx`, `WebtoonDetail.tsx`) — 영화/시리즈와 같은 틀이지만 필드는 웹툰에 맞게 구성: 감독→작가, 예고편/러닝타임/국가 없음, 대신 해시태그와 원본링크(comic.naver.com) 추가
- [x] 사이드바에 "웹툰" 섹션 추가 (라이브러리 + 검색·추가)
- [x] 왓챠 가져오기(Phase 9) 웹툰 지원 추가 — 연도 매칭이 의미 없어서 제목만으로 매칭 (네이버웹툰만, 카카오웹툰은 미포함)
- [x] 카카오웹툰 소스 추가 — 비공식 API 엔드포인트 3개 확보: 검색 `GET gateway-kw.kakao.com/search/v2/content`, 상세 `GET .../decorator/v2/decorator/contents/{id}/profile`, 회차수 `GET .../episode/v2/views/content-home/contents/{id}/episodes`(meta.pagination.totalCount). 완결 여부는 상세 응답의 `badges`에서 `{type: 'STATUS', title: 'COMPLETED'}` 여부로 판별
- [x] 카카오웹툰은 네이버와 달리 완성된 포스터 이미지가 없고 배경색(`backgroundColor`) 위에 캐릭터 컷아웃(투명 PNG)을 얹는 카드 구조라, `WebtoonMetadata.backgroundColor`에 배경색을 저장하고 `features/webtoons/poster.ts`에서 배경색+`background-size: contain` 합성으로 렌더링 (네이버는 이 필드가 항상 null, 기존 cover 방식 유지)
- [x] 검색·추가 화면에 네이버/카카오 소스 토글 추가 — `AddWebtoonScreen.tsx`, `KakaoSearch.tsx`
- [ ] 카카오웹툰 왓챠 가져오기 지원은 아직 미착수 (제목 매칭이 네이버와 카카오 양쪽에 걸칠 수 있어서 별도 논의 필요)

## Phase 7 — 패키징

- [ ] electron-builder 설정
- [ ] Windows 빌드 확인
- [ ] macOS 빌드 확인 (실 기기 없으면 최소 설정만 준비, 추후 검증)

---

## 2차 범위 (지금은 손대지 않음)

- 책 등 타 콘텐츠 타입 확장
- 원작-각색 콘텐츠 간 관계 모델링
- 모바일 앱 (`apps/mobile`) 분리 및 `packages/schema` 공유
