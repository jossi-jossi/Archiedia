# iOS 사이드로드 가이드 (개인용, 무료 Apple ID)

Apple 개발자 유료 계정 없이 아이폰에 앱을 설치하는 전체 절차. Mac이 한 번 필요하다 (Xcode 빌드는 macOS에서만 가능). Windows PC를 주력으로 쓰는 상황을 기준으로 썼다.

## 왜 이렇게 해야 하는가

이 저장소는 npm 워크스페이스 모노레포라 `apps/mobile`의 의존성 대부분이 루트 `node_modules`로 올라간다(hoisting). Metro 번들러는 `metro.config.js`에서 이를 감안해 설정돼 있지만, **CocoaPods와 React Native의 iOS 빌드 스크립트는 앱 폴더 바로 아래(`apps/mobile/node_modules`)에 패키지가 다 있다고 가정**하고 상대 경로를 계산한다. 이 불일치가 `expo-asset`, `@expo/cli`, `@react-native/virtualized-lists`를 못 찾는 에러나 `PrivacyInfo.xcprivacy` "no such file" 에러의 공통 원인이다.

심볼릭 링크로 하나씩 땜질하면 다른 패키지를 설치할 때마다 npm이 hoisting을 다시 계산하면서 또 깨진다. 그래서 **모바일 앱을 워크스페이스 밖 독립 폴더로 복사**해서 빌드한다 — 그러면 `node_modules`에 모든 게 실제로 존재해서 이 문제 자체가 없어진다.

또한 무료 Apple ID(Personal Team)로는 Xcode의 "Distribute App" 내보내기(.ipa 생성)가 막혀 있다 — 어떤 배포 방식을 선택해도 유료 Apple Developer Program 가입을 요구한다. 그래서 이미 Xcode가 빌드·서명해둔 `.app`(DerivedData 안)을 직접 zip으로 묶어 `.ipa`를 만든다.

## 사전 정리 — 이전 설치가 남아있다면

재시도하는 거라면 예전 상태를 지우고 시작하는 게 확실하다. 처음 하는 거면 건너뛴다.

Xcode / Node / Homebrew가 이미 잘 깔려 있으면 그건 두고, 프로젝트 폴더와 빌드 캐시만 지우면 충분하다:

```bash
rm -rf ~/Archiedia
rm -rf ~/mobilebuild
rm -rf ~/Desktop/AltStoreExport
rm -rf ~/Library/Developer/Xcode/DerivedData
```

이 경우 아래 0~2단계는 건너뛰고 **3단계(클론)부터** 시작한다. 개발 도구까지 싹 지우고 완전히 새로 하려면 추가로:

```bash
sudo rm -rf /Applications/Xcode.app
brew uninstall cocoapods
rm -rf ~/.cocoapods
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
```

## 0. Xcode 설치

Mac App Store에서 "Xcode" 검색 → 받기. 제일 오래 걸리니 맨 먼저 시작해두고 아래 단계 진행.

## 1. Node.js (nvm으로)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

터미널을 완전히 껐다가 새로 열고:

```bash
nvm install --lts
node -v
npm -v
```

## 2. Homebrew + CocoaPods

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

설치 끝나면 화면에 나오는 PATH 추가 명령어를 그대로 복사해서 실행 (보통 이런 모양):

```bash
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/usr/local/bin/brew shellenv)"
```

**필수** — 권한 문제를 미리 막는 두 줄. 건너뛰면 나중에 "Permission denied"로 다시 돌아와야 한다:

```bash
sudo chown -R $(whoami) /usr/local/*
sudo chown -R $(whoami) /usr/local/Homebrew
brew install cocoapods
```

## 3. 프로젝트 클론

```bash
cd ~
git clone https://github.com/jossi-jossi/Archiedia.git
cd Archiedia
```

로그인 물어보면 비밀번호 말고 **Personal Access Token**이 필요하다 — `github.com/settings/tokens/new`에서 repo 권한 체크해서 발급.

## 4. 워크스페이스 밖 독립 폴더로 복사

```bash
mkdir -p ~/mobilebuild
rsync -a --exclude node_modules --exclude ios --exclude .expo \
  ~/Archiedia/apps/mobile/ ~/mobilebuild/app/
rsync -a --exclude node_modules \
  ~/Archiedia/packages/schema/ ~/mobilebuild/schema/
```

워크스페이스 패키지였던 `@archiedia/schema`를 이제 파일 경로로 가리키게 바꾼다:

```bash
cd ~/mobilebuild/app
npm pkg set 'dependencies.@archiedia/schema=file:../schema'
```

기존 `metro.config.js`는 모노레포 전용이라 독립 폴더에선 엉뚱한 데(홈 디렉토리)를 가리킨다. 단독 프로젝트용으로 교체:

```bash
cat > metro.config.js <<'EOF'
const { getDefaultConfig } = require('expo/metro-config')
module.exports = getDefaultConfig(__dirname)
EOF
```

## 5. 패키지 설치

`--install-links`는 로컬 schema 패키지를 심볼릭 링크가 아니라 실제 폴더로 복사해 넣어준다 (Metro가 심볼릭 링크에서 헤매는 걸 방지).

```bash
cd ~/mobilebuild/app
npm install --legacy-peer-deps --install-links
```

설치 끝나면 확인 — 아래 다섯 경로가 전부 실제로 있어야 한다:

```bash
ls -d node_modules/react-native node_modules/expo-asset \
  node_modules/@expo/cli node_modules/@react-native/virtualized-lists \
  node_modules/@archiedia/schema
node -p "require('react-native/package.json').version"
```

버전은 `0.81.5`가 나와야 정상. 하나라도 없거나 다른 버전이면 여기서 멈추고 원인부터 확인한다.

## 6. 환경변수

4번의 rsync가 `.env`도 같이 복사했을 것이다. 먼저 확인:

```bash
cd ~/mobilebuild/app
cat .env
```

값 4개가 다 채워져 있으면 건너뛴다. 파일이 없거나 비어있으면:

```bash
cp .env.example .env
open -e .env
```

Windows에 있는 실제 값 그대로 채우고 저장 (⌘S):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_TMDB_API_KEY=
EXPO_PUBLIC_ALADIN_TTB_KEY=
```

## 7. iOS 프로젝트 생성 + Pods

```bash
cd ~/mobilebuild/app
npx expo prebuild --platform ios
cd ios
pod install
```

`prebuild` 출력에 "Using react-native@... instead of recommended ..." 경고가 **안 뜨면** 버전이 맞다는 뜻이다 (이 줄은 어긋났을 때만 나온다).

이후 패키지를 새로 설치하는 일이 생기면(`npm install ...`), Pods를 완전히 다시 깐다 — `pod install`만 다시 돌리면 증분 업데이트라 바뀐 경로를 놓칠 수 있다:

```bash
cd ~/mobilebuild/app/ios
rm -rf Pods Podfile.lock
pod install
```

## 8. Xcode에서 열기

`.xcworkspace`여야 한다 — `.xcodeproj`로 열면 Pods 연결이 아예 안 잡힌다.

```bash
cd ~/mobilebuild/app/ios
open app.xcworkspace
```

## 9. 서명 · 빌드 설정

**Signing**
1. 왼쪽 네비게이터 맨 위 파란 "app" 아이콘 클릭
2. TARGETS → app → **Signing & Capabilities**
3. "Automatically manage signing" 체크
4. Team → 본인 Apple ID (Personal Team)

**Build Configuration**
1. 상단 스킴("app") 클릭 → Edit Scheme
2. Run → Build Configuration → **Release**
3. Close

## 10. 연결 & 빌드

1. 케이블로 아이폰 연결 → 컴퓨터 신뢰
2. Xcode 상단 기기 선택에서 본인 아이폰 선택
3. **⌘B** (Build만 — Run 아님, 설치까지는 필요 없음)

에러 나면 정확한 메시지 전체를 확인한다 — 일부만 보고 판단하지 않는다.

## 11. .ipa 만들기

빌드 결과물을 자동으로 찾아서 압축 (폴더 이름을 직접 입력할 필요 없음):

```bash
cd ~/Desktop
rm -rf AltStoreExport
mkdir -p AltStoreExport/Payload
APP=$(ls -d ~/Library/Developer/Xcode/DerivedData/app-*/Build/Products/Release-iphoneos/app.app | head -1)
echo "찾은 경로: $APP"
cp -R "$APP" AltStoreExport/Payload/
cd AltStoreExport
zip -r app.ipa Payload
```

**필수** — 전송 전에 반드시 내용물을 확인한다. "does not contain an app bundle" 에러가 여기서 걸러진다:

```bash
unzip -l app.ipa | head -20
ls -lh app.ipa
```

`Payload/app.app/...` 형태 파일이 여러 줄 나오고 크기가 수십 MB면 정상. 이 **파일 크기를 기억해뒀다가** Windows/아이폰에서 받은 뒤 같은지 비교하면 전송 중 손상도 잡을 수 있다.

## 12. 아이폰으로 전송

Mac에서 클라우드 드라이브(구글 드라이브 등) 웹사이트로 `app.ipa` 업로드 → 아이폰(또는 Windows 경유)에서 같은 계정으로 다운로드.

## 13. SideStore로 설치

AltStore Classic은 iOS 26에서 "The data couldn't be read..." 에러로 갱신 자체가 실패하는 알려진 문제가 있다 (`.ipa` 문제가 아니라 AltStore가 자기 자신을 갱신할 때도 같은 에러가 난다). 유지보수가 활발한 **SideStore**를 쓴다.

**Windows에서**
1. `docs.sidestore.io/docs/installation/install`에서 **iloader** 다운로드
2. 아이폰 USB 연결 → "이 컴퓨터를 신뢰"
3. iloader 실행 → Apple 계정 로그인 → 기기 선택 → **Install SideStore (Stable)**

> 에러 7252 "no 'ios' certificate with serial number..."가 뜨면 무료 계정 인증서 2개 한도가 찬 것이다. 한 번 더 시도하면 통과되는 경우가 많다. 계속 막히면 `sideloadly.io`로 대체한다 (인증서 폐기를 물어보고 정리해준다).

**아이폰에서**
1. 설정 → 일반 → VPN 및 기기 관리 → Apple 계정 이름 아래 Developer App → **신뢰**
2. **LocalDevVPN** 앱 열고 **Connect** (꺼져 있으면 설치·갱신이 안 된다)
3. SideStore 앱 → 같은 Apple 계정 로그인 → My Apps → "7 DAYS" 탭해서 수동 갱신 1회
4. 클라우드 드라이브에서 `app.ipa` → **파일에 저장**
5. SideStore → My Apps → **+** → `app.ipa` 선택 → 설치

## 알아둘 것

- 무료 계정 서명은 **7일마다 만료**된다. SideStore는 아이폰의 단축어(Shortcuts) 자동화로 PC 없이 자체 갱신이 가능하다 (`LocalDevVPN` 연결 필요, 새벽 시간대 와이파이 연결 시 자동 실행되도록 설정).
- 앱 코드를 새로 고쳐서 업데이트하려면 Mac에서 5~11단계를 다시 거쳐야 한다 — 자동 갱신은 "만료 방지"일 뿐 "업데이트"는 아니다.
- `npm install`로 패키지를 하나라도 새로 추가하면 7단계(iOS 프로젝트 생성 + Pods)부터 다시 해야 한다.
- TrollStore, LiveContainer 등 7일 제한을 완전히 우회하는 방법은 iOS 17 이후 Apple이 관련 취약점을 막아서 iOS 26에서는 쓸 수 없다.

## Mac 반납 전 정리

인증서를 **폐기(revoke)하지 않는다.** 로컬 삭제는 괜찮지만 Apple 서버에서 폐기하면 아이폰에 설치한 앱이 즉시 죽는다.

**A. GUI 먼저 (Xcode 지우기 전에)**
1. Xcode 계정 제거 — Xcode → ⌘, → Accounts → Apple ID 선택 → 좌측 하단 **−**
2. 키체인 — "키체인 접근" 앱 → `Apple Development` 검색 → 인증서와 그 아래 개인 키 삭제
3. App Store 로그아웃 — App Store → 메뉴바 Store → 로그아웃
4. 시스템 Apple ID — 시스템 설정 맨 위 이름 → 로그인돼 있으면 로그아웃
5. Safari — 관련 사이트 로그아웃 → 방문 기록 지우기

**B. 터미널 한 번에**

`~/Archiedia`와 `~/mobilebuild` 안에 실제 API 키가 든 `.env`가 있으니 반드시 삭제한다.

```bash
rm -rf ~/Archiedia ~/mobilebuild ~/Desktop/AltStoreExport
rm -rf ~/Library/Developer ~/Library/Caches/com.apple.dt.Xcode
brew uninstall cocoapods
rm -rf ~/.cocoapods ~/.nvm
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
sudo rm -rf /Applications/Xcode.app
```

**C. 쉘 설정 파일 (nvm / brew 줄 자동 제거)**

```bash
touch ~/.zshrc ~/.zprofile
sed -i '' '/NVM_DIR/d;/nvm.sh/d;/bash_completion/d;/brew shellenv/d' ~/.zshrc ~/.zprofile
```

**D. 흔적 정리 (놓치기 쉬운 것들)**

```bash
rm -f ~/Desktop/스크린샷*.png ~/Desktop/Screenshot*.png
rm -f ~/.zsh_history
open ~/Desktop
open ~/Downloads
```

1. 열린 바탕화면 / 다운로드 폴더에서 남은 파일(Xcode .xip 등) 직접 확인 후 삭제
2. 휴지통 비우기 (Finder → 휴지통 우클릭)
3. 터미널 완전 종료 (⌘Q) — 화면에 남은 스크롤백도 같이 사라짐
4. Safari 저장된 암호 — Safari → 설정 → 암호에서 삭제

**E. GitHub 토큰 폐기** (다른 컴퓨터에서 해도 됨)

`github.com/settings/tokens` → 이번에 만든 토큰 **Delete**

**F. 아이폰 쪽 (Mac 아님)**

신뢰된 컴퓨터 해제 — 설정 → 일반 → 전송 또는 iPhone 재설정 → 재설정 → **위치 및 개인정보 보호 재설정** (앱은 그대로 유지됨)

**G. 클라우드 드라이브**

`app.ipa` 안에는 Supabase / TMDB / 알라딘 키가 그대로 들어있다. 공유 설정이 "링크가 있는 모든 사용자"로 되어 있지 않은지 확인한다.

정리해도 아이폰에 설치된 앱은 그대로 동작한다.
