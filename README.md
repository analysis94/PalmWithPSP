# Palm Farm Field Map (PamMap)

> **Version: v0.348**

야자수 농장 현장용 GIS 필드 매핑 PWA — GPS 추적, PDF 지도 뷰어, 레이어 관리, 오프라인 지원.

---

## 📦 패키지 구성 (PWA Builder APK 빌드용)

| 파일 | 용도 | 필수 |
|---|---|---|
| `index.html` | 앱 본체 (단일 파일 SPA, v0.348) | ✅ |
| `manifest.json` | PWA 매니페스트 | ✅ |
| `sw.js` | 서비스 워커 (오프라인 + 캐싱) | ✅ |
| `icon-192.png` | 일반 아이콘 192×192 | ✅ |
| `icon-512.png` | 일반 아이콘 512×512 | ✅ |
| `icon-192-maskable.png` | maskable 아이콘 192×192 | ✅ |
| `icon-512-maskable.png` | maskable 아이콘 512×512 (Android Adaptive Icon 필수) | ✅ |
| `.nojekyll` | GitHub Pages Jekyll 처리 비활성화 | 권장 |
| `robots.txt` | 검색엔진 크롤러 차단 (모든 봇 Disallow) | ✅ |

> ℹ️ `screenshot-mobile.png`, `screenshot-desktop.png` 은 manifest에 참조되어 있지만 **선택사항** 입니다. 없으면 PWA Builder 점수만 약간 낮아지고 APK 빌드 자체는 됩니다. 직접 실기기/브라우저에서 캡처해서 추가하면 됩니다.

---

## 🚀 GitHub Pages 배포 → PWA Builder APK 빌드

### 1. GitHub 저장소 만들기
1. 새 public 저장소 생성 (예: `pammap`)
2. 이 ZIP의 **모든 파일을 저장소 루트에** 업로드 (폴더 없이)
3. `Settings → Pages → Source: Deploy from a branch → main / (root)` 저장
4. 잠시 후 `https://<USERNAME>.github.io/pammap/` 에서 접속 확인

### 2. PWA 동작 확인 (중요)
- 위 URL 접속 후 Chrome DevTools → **Application 탭**
  - **Manifest** : 에러 없음 확인
  - **Service Workers** : `activated and is running` 확인
- 모바일 Chrome에서 접속 → "홈 화면에 추가" 가 뜨면 정상

### 3. PWA Builder 에서 APK 생성
1. https://www.pwabuilder.com/ 접속
2. 위 GitHub Pages URL 입력 → **Start**
3. 점수 확인 (Manifest / Service Worker / Security 모두 ✅ 여야 함)
4. **Package For Stores → Android** 선택
5. 옵션:
   - **Package ID** : 예) `com.yourname.pammap` (역도메인 형식)
   - **App name** : `Palm Farm Field Map`
   - **Launcher name** : `PamMap`
   - **Signing key** : 처음이면 "New" 선택 (PWA Builder가 keystore 생성·다운로드 제공 — **반드시 별도 백업**)
6. **Generate** → `.zip` 다운로드 → 안에 `app-release-signed.apk` (사이드로딩용) + `.aab` (Play Store용) 포함

### 4. APK 설치
- `.apk` 파일을 안드로이드 기기로 전송
- "출처를 알 수 없는 앱 설치 허용" 후 탭하여 설치

---

## ⚙️ 로컬 테스트 (선택)

```bash
# 간단한 정적 서버 (Python)
cd pammap
python3 -m http.server 8080
# → http://localhost:8080
```

Service Worker는 `http://localhost` 또는 `https://` 에서만 동작합니다. `file://` 직접 열기는 폴백 Blob SW로 동작은 하지만 PWA 설치는 불가합니다.

---

## 🔄 업데이트 시

`index.html` 내용이 바뀌면:
1. `sw.js` 안의 `CACHE_VERSION` 값을 올림 (`palmmap-v0348` → `palmmap-v0349`)
2. GitHub 에 push
3. 사용자 기기에서 다음 접속 시 자동 갱신

---

## 📜 라이선스 / 저작

Palm Farm Field Map · v0.348
