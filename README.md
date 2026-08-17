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

Apple 개발자 유료 계정 없이 아이폰에 설치하는 절차. **Mac이 한 번 필요하다** (Xcode 빌드는 macOS에서만 가능). 상세 단계는 아래 순서를 따른다.

#### 왜 이렇게 복잡한가

이 저장소는 npm 워크스페이스 모노레포라 `apps/mobile`의 의존성이 루트 `node_modules`로 올라간다(hoisting). Metro 번들러는 이를 감안해 설정돼 있지만, **CocoaPods와 React Native의 iOS 빌드 스크립트는 앱 폴더 바로 아래에 패키지가 다 있다고 가정**한다 — 이 불일치가 `expo-asset`/`@expo/cli`/`@react-native/virtualized-lists`를 못 찾는 에러나 `PrivacyInfo.xcprivacy` 관련 에러의 근본 원인이다. 그래서 iOS 빌드는 **모바일 앱을 워크스페이스 밖 독립 폴더로 복사**해서 진행한다.

또한 무료 Apple ID(Personal Team)로는 Xcode의 "Distribute App" 내보내기(.ipa 생성) 자체가 막혀 있어, DerivedData에 이미 빌드·서명된 `.app`을 직접 압축해서 `.ipa`를 만든다.

#### 준비물

- Mac (Intel/Apple Silicon 무관), 무료 Apple ID
- iOS 사이드로딩 도구: **SideStore** (AltStore Classic은 iOS 26에서 갱신 자체가 실패하는 알려진 문제가 있어 권장하지 않음)

#### 절차 요약

1. Mac에 Xcode, Node(nvm 권장), Homebrew + CocoaPods 설치
2. `git clone`으로 저장소를 받고, `apps/mobile` + `packages/schema`를 워크스페이스 밖 폴더(예: `~/mobilebuild`)로 복사
3. 복사한 폴더에서 `@archiedia/schema`를 `file:` 경로 의존성으로 바꾸고, `metro.config.js`를 모노레포 설정에서 단독 프로젝트용으로 교체
4. `npm install --legacy-peer-deps --install-links`
5. `npx expo prebuild --platform ios` → `pod install`
6. Xcode에서 `.xcworkspace`를 열고 Personal Team 서명, Build Configuration을 **Release**로 설정 → `⌘B`로 빌드 (Run 아님, 설치는 필요 없음)
7. `~/Library/Developer/Xcode/DerivedData/app-*/Build/Products/Release-iphoneos/app.app`을 `Payload/` 폴더에 넣고 zip → `.ipa`
8. 압축 후 반드시 `unzip -l app.ipa`로 `Payload/app.app/Info.plist`가 들어있는지 확인 (전송 중 손상 여부를 여기서 거른다)
9. 클라우드 드라이브로 `.ipa`를 아이폰에 전달, SideStore(iloader로 최초 설치)로 사이드로드

전체 단계별 실행 커맨드는 작업 중 만든 가이드 페이지에 정리돼 있다 (Claude 대화에서 발급된 개인 Artifact 링크 — 저장소에는 민감한 절차/커맨드 세부사항까지는 커밋하지 않는다).

#### 알아둘 것

- 무료 계정 서명은 **7일마다 만료**된다. SideStore는 아이폰의 단축어(Shortcuts) 자동화로 PC 없이 자체 갱신이 가능하다 (`LocalDevVPN` 연결 필요).
- 앱 코드를 새로 고쳐서 업데이트하려면 Mac에서 5~8단계를 다시 거쳐야 한다 — 자동 갱신은 "만료 방지"일 뿐 "업데이트"는 아니다.
- `npm install`로 패키지를 하나라도 새로 추가하면 5단계(iOS 프로젝트 생성)부터 다시 해야 한다.
