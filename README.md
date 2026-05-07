# 🌴 PalmMap — Palm Farm GIS PWA

**Version: v0.190** | Single-file offline GIS app for palm oil plantation management

---

## 🚀 Quick Start (GitHub Pages)

1. Fork or clone this repository
2. Enable **GitHub Pages** → Settings → Pages → Source: `main` branch, `/ (root)`
3. Access at `https://<username>.github.io/<repo>/`

---

## 📁 Files

| File | Description |
|---|---|
| `index.html` | Main app (464 KB, all-in-one) |
| `sw.js` | Service Worker for offline caching |
| `manifest.json` | PWA manifest (fullscreen, installable) |
| `README.md` | This file |

---

## 📱 Features

### Maps
- 📂 Load **GeoPDF · GeoTIFF · GPKG · GeoJSON**
- 🗂 Multiple map slots (up to 10)
- 🔲 Layer management with **custom styles** (stroke, fill, opacity, font, halo)
- 🎨 Per-layer style editor (color picker, slider, dash style)

### Field Data
- 📍 **Titik** — Location memo + photo attachment (GPS or map center)
- 📐 **Jalur** — Line drawing (track/road)
- 🔲 **Area** — Polygon drawing
- 📷 **Foto** — Photo memo with GPS tag

### Navigation
- 📡 Real-time GPS tracking (7 track colors)
- 🧭 3-mode compass (device/GPS/fixed)
- 📏 Distance & area measurement
- 🔍 Unified search (blocks + Titik + Jalur + Area + Bookmarks)

### Import / Export
| Format | Import | Export |
|---|---|---|
| GeoJSON | ✅ | ✅ All data |
| KML | ✅ | ✅ |
| KMZ | ✅ | — |
| GPX | ✅ | ✅ Titik + Jalur + Tracks |
| SHP | ✅ (via shpjs) | ℹ️ Guide to mapshaper.org |
| GPKG | ✅ | — |
| CSV | ✅ | — |

### PWA
- 📲 Installable on Android/iOS
- 🔌 Full offline support (Service Worker)
- 💾 Data persisted in localStorage

---

## 🌐 Languages
- 🇰🇷 Korean (한국어)
- 🇺🇸 English
- 🇮🇩 Bahasa Indonesia

---

## 👤 Developer
**Sangpyo Park** · TBSM/PAM/GUM · Kalbar  
© 2026 Palm Farm GIS

---

## 📋 Changelog (recent)

| Version | Changes |
|---|---|
| v0.190 | Titik pin: GPS pos or map center, hamburger badges fixed |
| v0.189 | GPS accuracy circle scale-aware, map count badge |
| v0.188 | Panel count badges (8 panels), side-panel CSS fix |
| v0.187 | List panels working (Titik/Jalur/Area/Foto) |
| v0.185 | Layer style editor (stroke/fill/opacity/font/halo) |
| v0.183 | SHP/KML/KMZ/GPX import+export |
| v0.182 | LANG_DATA corruption fix, panTo function |
| v0.180 | Unified search (blocks+Titik+Jalur+Area+bookmarks) |
