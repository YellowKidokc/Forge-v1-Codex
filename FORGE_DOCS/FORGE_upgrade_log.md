# FORGE Upgrade Log

## 2026-03-05 - Dock + Launcher Upgrades 1/2/3

### Completed
- Dock now supports launcher types: `internal`, `url`, and `path`.
- Dock launcher data is persisted in settings (`dockLaunchers`) including order, icon, name, target, and pinned state.
- Right-click dock context actions enabled:
  - Pin/Unpin
  - Rename
  - Open in new window (internal launchers)
  - Remove (non-core launchers)
- Added launcher execution routing:
  - `internal` -> open editor/logic/AI workspace/AI panel
  - `url` -> open with system default browser
  - `path` -> open file/app/script via system default handler
- Added settings UI for launcher management:
  - Add launcher
  - Edit launcher fields
  - Reorder up/down (persisted)
  - Pin toggle
  - Remove launcher
- Added AI provider/key section in settings:
  - Claude/GPT selector
  - Claude key input
  - OpenAI key input

### Build Verification
- `npm run build` succeeded in `O:\FORGE\forge_app`.

### Notes
- Mini Apps are still supported and now sync into dock launchers for quick launch consistency.
- Internal launcher "Open in new window" opens a new Tauri webview window with launcher context.

## 2026-03-05 - Quick Places + Global Appearance

### Completed
- Added `Quick Places` model to settings with persistent entries:
  - custom name
  - path
  - mode (`notebook` or `path`)
  - pinned toggle
- Sidebar now shows a `Quick Places` strip (up to 10 pinned entries) for one-click jumps.
- Added `Pin current notebook` action in sidebar header controls.
- Added `Quick Places` management section in Settings + Platform:
  - add/edit/remove
  - reorder up/down
  - pin toggle
- Added global appearance controls in Settings + Platform:
  - app base text size
  - editor text size
  - app font family presets
- Applied appearance settings live via CSS variables + root font size updates.

### Verification
- `npm run build` succeeded after these additions.
