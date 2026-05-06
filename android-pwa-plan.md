# Plan: Make QPaperMaker an Android Webapp (PWA)

## Context
The app is already a React + Vite + TailwindCSS SPA with mobile-responsive layouts. The goal is to make it installable on Android as a **Progressive Web App (PWA)** — so users can add it to their home screen, launch it full-screen, and have it load fast. This does not require publishing to the Play Store. Android Chrome will prompt "Add to Home Screen" once PWA criteria are met.

The app still requires a live backend connection (no offline-first requirement).

---

## What's Already Done
- Viewport meta tag present (`width=device-width, initial-scale=1.0`)
- Mobile-responsive layouts with Tailwind sm:/lg: breakpoints
- Touch-friendly button sizes throughout
- `favicon.svg` and `icons.svg` already in `frontend/public/`

## What's Missing
1. No `manifest.json` (required for installability)
2. No service worker (required for installability)
3. No app icons at correct PNG sizes (192×192, 512×512)
4. No `theme-color` meta tag (controls Android status bar color)
5. Upload drag-drop copy says "Drag & drop" — should mention tap on mobile

---

## Implementation Plan

### Step 1 — Install vite-plugin-pwa
```bash
cd frontend
npm install -D vite-plugin-pwa
```

### Step 2 — Update `frontend/vite.config.js`
Add the VitePWA plugin alongside the existing react() and tailwindcss() plugins:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AI QPaperMaker',
        short_name: 'QPaperMaker',
        description: 'Generate AI-powered question papers from textbook photos',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // API calls: always try network, fall back to cache
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ai': 'http://localhost:8000',
    },
  },
})
```

### Step 3 — Generate app icons
Create `frontend/public/icons/` with two PNG files:
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px

**How:** Use the existing `icons.svg` in `public/` as the source. Convert with any of:
- `npx @vite-pwa/assets-generator` (reads a source SVG, outputs all sizes)
- Or manually export from the SVG using Inkscape / any image editor

### Step 4 — Add `theme-color` meta to `frontend/index.html`
```html
<meta name="theme-color" content="#2563eb" />
```
(Add after the existing viewport meta tag. Controls the Android status/browser bar colour.)

### Step 5 — Fix upload copy for mobile (`frontend/src/pages/Upload.jsx`)
Line 309 currently reads:
```
"Drag & drop images here, or click to browse"
```
Change to:
```
"Tap to select images, or drag & drop"
```
This makes sense on both mobile (tap) and desktop (drag-drop).

---

## Files to Modify
| File | Change |
|---|---|
| `frontend/package.json` | `vite-plugin-pwa` added as devDependency |
| `frontend/vite.config.js` | Add VitePWA plugin with manifest + workbox config |
| `frontend/index.html` | Add `theme-color` meta tag |
| `frontend/src/pages/Upload.jsx` | Fix drag-drop copy for mobile |
| `frontend/public/icons/icon-192.png` | New — 192×192 app icon |
| `frontend/public/icons/icon-512.png` | New — 512×512 app icon |

---

## Deployment Requirement
PWA install prompts only appear over **HTTPS**. Localhost works for testing, but for real Android users the app must be deployed publicly. The Dockerfile and HuggingFace Spaces setup already in the repo satisfies this — HF Spaces serves over HTTPS automatically.

---

## Verification
1. Run `npm run build` in `frontend/` — confirm no errors and `dist/sw.js` + `dist/manifest.webmanifest` are generated
2. Run `npm run preview` — open Chrome DevTools → Application tab → confirm Manifest and Service Worker are registered
3. On Android Chrome, open the deployed URL → Chrome should show an "Add to Home Screen" banner or it appears under the browser menu
4. Install → launch from home screen → app opens without browser chrome (standalone mode)
