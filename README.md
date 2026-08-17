# 아키디아 (Archiedia)

영화·시리즈·웹툰·책 기록을 한곳에 모으는 개인용 콘텐츠 아카이브. Electron 데스크톱 앱과 Expo(React Native) 모바일 앱이 같은 Supabase 백엔드를 공유하는 모노레포다.

```
├── src/                 데스크톱 앱 (Electron + React + TypeScript)
├── apps/mobile/          모바일 앱 (Expo / React Native)
├── packages/schema/       데스크톱·모바일 공용 타입 · Supabase 매퍼
└── supabase/schema.sql    DB 스키마 (수동으로 Supabase 대시보드에 적용)
```

아키텍처/데이터 모델 배경은 [ARCHITECTURE.md](./ARCHITECTURE.md) 참고.

## 시작하기

```
npm install
```

루트 `.env`와 `apps/mobile/.env`를 각각 `.env.example`을 복사해서 채운다 (Supabase URL/anon key, TMDB API 키, 알라딘 TTB 키).

### 데스크톱 개발

```
npm run dev
```

메인 프로세스/preload를 고치면 재시작 필요, 렌더러만 고치면 HMR로 바로 반영.

### 모바일 개발

```
npm run mobile
```

Expo Go 앱으로 QR코드를 스캔하면 실행된다 (커스텀 네이티브 모듈을 안 쓰는 한 이 방법이 제일 간단).

### 검증

코드를 고칠 때마다 아래를 통과시킨다 (데스크톱 main/renderer, `packages/schema`, 모바일 타입체크를 한 번에 검사):

```
npm run typecheck && npm run format && npm run lint && npx electron-vite build && rm -rf out
```

## 배포

### 데스크톱 (Windows 설치파일)

```
npm run build:win
```

`dist/archiedia-<version>-setup.exe`가 생성된다. 코드 서명이 안 되어 있어 SmartScreen 경고가 뜨면 "추가 정보 → 실행"으로 넘어간다.

빌드 전 실행 중인 앱 인스턴스(`electron.exe` / 이전에 설치한 `app.exe`)를 모두 종료해야 한다 — 안 그러면 `dist/` 정리 중 `EPERM: operation not permitted, rename ...win-unpacked.tmp` 에러가 난다.

### 모바일 (개인용, iOS 사이드로드)

Apple 개발자 유료 계정 없이 아이폰에 설치하는 절차 — Mac이 한 번 필요하고(Xcode 빌드는 macOS에서만 가능), npm 워크스페이스 hoisting과 CocoaPods의 경로 가정이 어긋나서 앱을 워크스페이스 밖으로 복사해 빌드해야 하는 등 손이 많이 간다.

전체 단계별 실행 커맨드와 원인 설명은 **[docs/ios-sideload.md](./docs/ios-sideload.md)** 참고.
