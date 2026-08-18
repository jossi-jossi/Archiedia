# 아키디아 (Archiedia) — 콘텐츠 통합 아카이브

## 1. 개요

TMDB, 알라딘, 네이버웹툰, 카카오웹툰 등 여러 소스에 흩어진 콘텐츠 기록(시청/독서 이력, 평점, 후기)을 하나로 통합·보관하는 개인 아카이브 앱. 대상 콘텐츠 타입은 **영화 · 시리즈 · 웹툰 · 책** 4종이고, **Electron 데스크톱 앱**과 **Expo 모바일 앱**이 같은 Supabase 백엔드를 공유한다.

## 2. 저장소 구조

npm 워크스페이스 모노레포:

```
archiedia/
├── src/                  데스크톱 앱 본체 (Electron + React + TypeScript)
├── apps/mobile/           모바일 앱 (Expo / React Native)
├── packages/schema/        데스크톱·모바일 공용 타입 · Supabase 매퍼
└── supabase/schema.sql     DB 스키마 (Supabase 대시보드 SQL Editor에 수동 적용, 마이그레이션 도구 없음)
```

`packages/schema`가 콘텐츠 도메인 모델(`ContentItem`, `UserRecord` 등)과 DB row ↔ 도메인 객체 매퍼를 정의하고, 데스크톱·모바일 양쪽이 그대로 import해서 쓴다. 이 두 앱은 Supabase 데이터는 공유하지만 코드/의존성 트리는 각자 완전히 독립적이다 — 특히 모바일의 iOS 빌드는 npm 워크스페이스 hoisting이 CocoaPods 경로 가정과 안 맞아서, 실제로는 워크스페이스 밖 폴더로 복사해서 빌드해야 한다 (자세한 내용은 [docs/ios-sideload.md](./docs/ios-sideload.md)).

## 3. 기술 스택

| 영역 | 선택 | 비고 |
| --- | --- | --- |
| 데스크톱 | Electron + React + TypeScript (electron-vite) | main/preload/renderer 3-프로세스 구조, `electron-builder`로 Windows NSIS 인스톨러 배포 |
| 모바일 | Expo (React Native), managed workflow | 커스텀 네이티브 모듈 없이 표준 Expo 모듈만 사용 — Expo Go로 바로 개발 가능 |
| 백엔드 | Supabase (PostgreSQL + Auth + RLS) | 인증 내장, 행 단위 보안으로 사용자별 데이터 격리 |
| 외부 데이터 소스 | TMDB(영화·시리즈), 알라딘(책), 네이버웹툰·카카오웹툰(웹툰, 비공식 API) | 웹툰은 데스크톱 라이브러리 화면을 열 때 연재중 작품만 24시간 지나면 백그라운드 재동기화 |
| 타입 공유 | `packages/schema` | 콘텐츠 타입별 discriminated union으로 `metadata` jsonb의 타입 안정성 보완 |
| 정렬(드래그) | `@dnd-kit/core` / `@dnd-kit/sortable` (데스크톱) | `display_order` 값으로 사용자 지정 순서 구현 |
| 아이콘/벡터 | `@phosphor-icons/react`(데스크톱), `phosphor-react-native` + `react-native-svg`(모바일) | 로고 등 SVG는 모바일에서 `SvgXml`로 인라인 렌더링 (`.svg` 파일 직접 import 불가) |

## 4. UI 구성 방식

- **데스크톱**: 콘텐츠 타입(영화/시리즈/웹툰/책)마다 `LibraryView.tsx` / `EditXModal.tsx`를 **각각 통째로 중복 작성**한다. 구조가 거의 같아도 공용 컴포넌트로 묶지 않는 게 원칙 — 타입마다 나중에 요구사항이 갈라질 여지가 크기 때문이다.
- **모바일**: 반대로 `DetailScreen.tsx` / `LibraryScreen.tsx` 같은 화면을 **타입 무관 공용 컴포넌트 + `typeConfig()` 설정 테이블**로 분기한다.

두 플랫폼이 서로 다른 방향을 택한 건 의도적인 절충이라, 어느 한쪽 패턴을 다른 쪽에 맞추려 하지 않는다.

## 5. 데이터 모델

콘텐츠 타입마다 테이블을 분리하지 않고 **공통 스키마 + 타입별 메타데이터(jsonb)** 방식을 쓴다.

### `content_items`

| 필드 | 설명 |
| --- | --- |
| id | PK |
| user_id | FK (auth.users), RLS로 본인 데이터만 접근 |
| type | `movie` / `drama` / `webtoon` / `book` |
| title | 제목 |
| source | 출처 (`tmdb` / `aladin` / `naver` / `kakao` / `manual` 등) |
| external_id | 소스 내 식별자 |
| poster_url | 포스터/커버 이미지 |
| metadata | jsonb — 타입별 고유 필드 |
| display_order | 사용자 지정 정렬 기준값. 새 항목은 `-Date.now()`로 맨 위에 들어가고, 드래그로 순서를 바꾸면 이웃한 두 값의 중간값을 부여 |

**타입별 `metadata` 요지** (전체 필드는 `packages/schema/src/types/content.ts` 참고):

- `movie` — 원제/개봉연도/감독/장르/출연/러닝타임/국가/예고편/줄거리
- `drama` — 시리즈 공통 정보 + 시즌별 메타데이터(`seasons[]`, 시즌마다 감독·출연·줄거리·화수가 다를 수 있어 분리)
- `webtoon` — 작가/장르/해시태그/완결여부/총화수/원본링크. 카카오웹툰은 배경 삽화 위에 캐릭터 컷아웃을 얹는 2겹 카드 구조라 `backgroundImageUrl`을 따로 저장해 합성 렌더링 (네이버는 항상 null). `lastSyncedAt`으로 오래된 연재작만 자동 재동기화
- `book` — 작가/원제/출판사/개봉연도/페이지수/알라딘 카테고리 전체 경로/줄거리

### `user_records`

| 필드 | 설명 |
| --- | --- |
| user_id, content_item_id | FK, RLS로 본인 데이터만 접근 |
| my_rating | 나의 평점 |
| my_review | 나의 후기 |
| watch_count | 시청/읽은 횟수 |
| last_watched_at | 마지막 시청/읽은 날 |
| watch_medium | 시청/읽은 매체 |
| tags | 상태 태그 (`보고 싶음`, `보는 중` 등 — 앱 레이어에서 배타적으로 관리) |

## 6. 트레이드오프 메모

- `metadata`를 jsonb로 두면 유연하지만 타입 안정성이 약함 → `packages/schema`의 discriminated union으로 보완
- 웹툰 동기화는 데스크톱 라이브러리 화면을 열 때만 도는 백그라운드 작업이라, 모바일만 쓰는 동안엔 안 갱신됨
- Supabase 무료 티어는 7일 비활성 시 프로젝트가 일시정지됨 → 데스크톱 앱 실행 시 헬스체크 핑으로 방지
- DB 스키마 변경은 마이그레이션 파일 없이 `supabase/schema.sql`을 갱신하고 Supabase 대시보드에서 수동 실행하는 방식 — 이력 추적이 안 되니 스키마를 바꿀 땐 이 파일도 같이 업데이트할 것
