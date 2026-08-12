# 아키디아 (Archiedia) — 콘텐츠 통합 아카이브 데스크톱 프로그램

## 1. 개요

왓챠피디아, TMDB, 넷플릭스, 리디북스 등 여러 플랫폼에 흩어진 콘텐츠 기록(시청/독서 이력, 평점, 리뷰)을 하나의 데스크톱 프로그램에 통합·보관하는 개인 아카이브 앱.
1차 대상 콘텐츠 타입은 **영화**이며, 이후 책/웹툰/드라마 등으로 확장 예정.

## 2. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 데스크톱 프레임워크 | Electron + React + TypeScript | Windows/macOS 동시 지원, 추후 React Native 모바일 앱과 도메인 로직·타입 공유 가능 |
| 스크래핑 실행 위치 | Electron 메인 프로세스 (Playwright) | 왓챠피디아처럼 로그인 세션이 필요한 소스는 사용자 로컬 브라우저 세션 기반으로 수집 (서버에 로그인 쿠키 보관 지양) |
| 백엔드 | Supabase (PostgreSQL + Auth + Storage) | 무료 티어로 개인 아카이브 규모 충분, 인증 내장, 추후 모바일 확장 시 동일 백엔드 재사용 |
| 공식 API 소스 | TMDB API 등 | 영화 메타데이터 보완용 |
| 타입 공유 | Supabase 자동 생성 TS 타입 + 공용 스키마 패키지 | 데스크톱/모바일 간 도메인 모델 불일치 방지 |

> **플랫폼 지원 메모**: Electron/Playwright/Supabase 모두 Windows·macOS 양쪽에서 동작. 다만 왓챠피디아 로그인 세션 크롤링 로직은 브라우저 프로필 경로 등 OS별 차이가 생길 수 있으므로, 구현 시 OS 분기를 최소화하고 이식 가능한 방식(Playwright의 persistent context 등)을 우선 검토할 것.

## 3. 레이어 아키텍처

```
[UI Layer]            React 컴포넌트 — 라이브러리 뷰, 검색, 상세, 통계
      │
[Domain Layer]        콘텐츠 관리 로직 (평가, 상태 변경, 필터링) — 소스 무관
      │
[Sync Layer]          Supabase Client (CRUD, 인증, 실시간 구독)
      │
[Ingestion Layer]     소스 어댑터 레지스트리
      ├─ WatchaAdapter   (Playwright 크롤링, 로그인 세션 필요)
      ├─ TmdbAdapter     (공식 API)
      └─ (추후 확장)      RidibooksAdapter, NetflixAdapter 등
```

각 어댑터는 공통 인터페이스만 구현:
- `fetch(query) → RawItem`
- `normalize(RawItem) → ContentItem`

새 소스를 추가할 때 상위 레이어(Domain/UI)는 수정하지 않고 어댑터만 추가하는 것을 원칙으로 한다.

## 4. 데이터 모델 (초안)

콘텐츠 타입마다 테이블을 분리하지 않고, **공통 스키마 + 타입별 메타데이터(jsonb) 분리** 방식을 사용한다. 타입마다 필드가 달라도 마이그레이션 없이 대응 가능하며, 자주 쓰는 필드는 이후 정규 컬럼으로 승격할 수 있다.

### `content_items` (공통)
| 필드 | 설명 |
|---|---|
| id | PK |
| type | movie / book / webtoon / drama … |
| title | 제목 |
| source | 데이터 출처 (watcha / tmdb / manual …) |
| external_id | 소스 내 식별자 |
| poster_url | 포스터/커버 이미지 |
| metadata | jsonb — 타입별 고유 필드 |

### 영화(`type = movie`)의 `metadata` 필드

**메타데이터**
- 영화 제목
- 원제
- 개봉연도
- 포스터 이미지
- 감독
- 장르
- 배우
- 러닝타임
- 제작 국가
- 예고편 (URL)
- 시리즈/프랜차이즈 연결 (관련 `content_items` 참조)

### `user_records` (사용자별 개인 기록, content_item과 1:1 또는 1:N)
| 필드 | 설명 |
|---|---|
| content_item_id | FK |
| my_rating | 나의 평점 |
| my_review | 나의 후기 |
| watch_count | 본 횟수 |
| last_watched_at | 마지막 관람일 |
| watch_medium | 관람 매체/경로 (극장 / OTT / 블루레이 등) |
| tags | 보고 싶음 / 1번 봄 / n번 봄 등 |

## 5. 트레이드오프 메모

- `metadata`를 jsonb로 두면 유연하지만 타입 안정성이 약함 → TS 쪽에서 콘텐츠 타입별 discriminated union으로 보완
- 로컬 크롤링 방식은 앱이 실행 중일 때만 동기화됨 → "왓챠 연동은 앱 실행 시에만 갱신"이라는 제약을 사용자에게 명시
- Supabase 무료 티어는 7일 비활성 시 프로젝트 일시정지 → 앱 실행 시 헬스체크 핑으로 방지

## 6. 저장소 구조

풀 모노레포(앱마다 폴더 분리)는 모바일 앱이 실제로 생기는 시점으로 미루고, 지금은 **단일 저장소 + 공용 스키마 패키지만 분리**하는 가벼운 구조로 시작한다.

```
archiedia/
  ├── src/            ← Electron 데스크톱 앱 본체
  ├── packages/
  │   └── schema/     ← Supabase 타입, 콘텐츠 도메인 모델(공용) — 나중에 모바일 앱도 그대로 재사용
  └── package.json
```

- 지금: `packages/schema`에 Supabase 자동 생성 타입 + `ContentItem`/`UserRecord` 등 도메인 모델을 정의해두고, 데스크톱 앱(`src/`)이 이를 참조
- 나중에 모바일 앱을 실제로 시작하는 시점에 `src/`를 `apps/desktop/`으로, 모바일을 `apps/mobile/`로 승격하는 구조로 전환

## 7. 결정된 사항 요약

- 백엔드: Supabase
- 데스크톱 스택: Electron + React + TypeScript
- 크롤링: Electron 메인 프로세스에서 Playwright로 로컬 실행
- 데이터 모델: 공통 테이블 + jsonb 메타데이터 방식
- 저장소 구조: 단일 저장소 + `packages/schema` 공용 패키지만 우선 분리 (모노레포 전환은 모바일 착수 시점으로 유예)

## 8. 미결정/추후 논의 사항

- 책/웹툰/드라마 등 타 콘텐츠 타입의 소스 및 필드 정의
- 원작-각색 등 콘텐츠 간 관계 모델링 방식
