# Palm Farm Field Map (PamMap)

> **Version: v0.365** · PWA Builder APK 빌드용 패키지

야자수 농장 현장용 GIS 필드 매핑 PWA — GPS 추적, PDF 지도 뷰어, 레이어 관리, 오프라인 지원.

---

## 📦 패키지 구성

| 파일 | 용도 |
|---|---|
| `index.html` | 앱 본체 (단일 파일 SPA, v0.365) |
| `manifest.json` | PWA 매니페스트 (모든 필수 필드 포함) |
| `sw.js` | 서비스 워커 (오프라인 + 캐싱) |
| `icon-192.png` / `icon-512.png` | 일반 아이콘 (`purpose: any`) |
| `icon-192-maskable.png` / `icon-512-maskable.png` | Android Adaptive Icon (`purpose: maskable`) |
| `screenshot-mobile.png` | narrow form factor 스크린샷 (540×720) |
| `screenshot-desktop.png` | wide form factor 스크린샷 (1280×720) |
| `robots.txt` | 모든 봇 허용 (PWA Builder 호환) |
| `.nojekyll` | GitHub Pages Jekyll 처리 비활성화 |

---

## 🚀 GitHub Pages → PWA Builder APK 빌드

### 1. GitHub 저장소에 업로드
- **모든 파일을 저장소 루트에** 업로드 (폴더 없이)
- 저장소는 반드시 **Public**으로 설정
- `Settings → Pages → Source: Deploy from a branch → main / (root)` 저장
- 1~2분 후 `https://<USERNAME>.github.io/<repo>/` 접속 확인

### 2. PWA 동작 검증
브라우저에서 다음 URL이 정상적으로 열리는지 직접 확인:
- `https://<USERNAME>.github.io/<repo>/` → 앱이 뜨는지
- `https://<USERNAME>.github.io/<repo>/manifest.json` → JSON 내용이 보이는지
- `https://<USERNAME>.github.io/<repo>/sw.js` → JS 내용이 보이는지
- `https://<USERNAME>.github.io/<repo>/icon-512.png` → 아이콘이 보이는지

**하나라도 404가 뜨면 PWA Builder에서 오류 발생.**

### 3. PWA Builder에서 APK 생성
1. https://www.pwabuilder.com/ 접속
2. 위 GitHub Pages URL 입력 → **Start**
3. 점수 확인 (Manifest / Service Worker / Security 모두 ✅)
4. **Package For Stores → Android**
5. 옵션:
   - **Package ID** : `com.yourname.pammap` (역도메인 형식)
   - **App name** : `Palm Farm Field Map`
   - **Launcher name** : `PamMap`
   - **Signing key** : 처음이면 "New" 선택 (keystore 파일 반드시 백업)
6. **Generate** → `.zip` 다운로드 → `app-release-signed.apk` 사용

---

## 🔄 업데이트 시

`index.html` 수정 후:
1. `sw.js` 안의 `CACHE_VERSION` 값 증가 (`palmmap-v0365` → `v0366`)
2. GitHub push
3. 사용자 기기에서 다음 접속 시 자동 갱신

---

## ⚙️ 로컬 테스트

```bash
cd pammap
python3 -m http.server 8080
# → http://localhost:8080
```

Service Worker는 `http://localhost` 또는 `https://` 에서만 동작.

---

Palm Farm Field Map · v0.365
