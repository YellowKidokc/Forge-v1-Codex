# PWA Implementation Checklist (Measured, Academic UI)

## Scope
Turn the dashboard/proof system into an installable desktop-grade web app.

## Required PWA Files
1. `manifest.webmanifest`
2. `service-worker.js`
3. Icons:
- `icon-192.png`
- `icon-512.png`
- maskable variants

## Manifest Baseline
- `name`: Theophysics Dashboard
- `short_name`: Theophysics
- `start_url`: `/dashboard` or `/proof/index.html`
- `display`: `standalone`
- `theme_color`: dark canonical tone
- `background_color`: dark canonical tone

## Service Worker Strategy
1. Cache static shell files:
- proof pages
- CSS/JS/assets
2. Network-first for dynamic JSON/session data
3. Offline fallback for core proof pages

## Routing Plan
Recommended route layout:
- `/dashboard`
- `/proof`
- `/proof/foundation`
- `/proof/subsystems`
- `/proof/bifurcation`
- `/proof/evidence`
- `/proof/falsification`
- `/proof/closure`
- `/workspace/bible`
- `/sessions`
- `/evidence`

## Desktop UX Requirements
- fast first paint
- keyboard shortcuts
- side panel persistence
- remembered last-open page
- explicit sync status for imported data

## Data Safety Requirements
- keep provenance on every imported record
- record source path + timestamp + method (manual/ai/import)
- version snapshots before major re-index/import

## Acceptance Criteria
1. Installable from browser as app.
2. Opens standalone window (no browser chrome).
3. Core proof pages load offline.
4. Last selected proof page and panel state restored on reopen.
5. No visual regressions from canonical theme.
