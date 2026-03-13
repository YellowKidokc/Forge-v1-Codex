# FORGE x AI-HUB Integration Blueprint (Master)

Date: 2026-03-05
Sources:
- FORGE master spec + current implementation state
- AI-HUB v2 Grand Vision & Master Roadmap (David Lowe)

## Executive Summary
Your AI-HUB roadmap is not competing with FORGE. It is a high-value upstream asset.

Best strategy:
1. Keep AI-HUB running as the mature desktop automation edge.
2. Let FORGE become the orchestration shell and long-term plugin platform.
3. Integrate AI-HUB capabilities into FORGE through adapters/packages first, then progressively absorb high-value components.

This prevents rewrite waste and avoids "two systems fighting."

---

## 1) Unified System Model

### Final target state
- FORGE = shell, AI workspace, plugin platform, module registry, cross-system UX.
- AI-HUB = automation engine + hotkey edge + legacy AHK acceleration layer.
- ClipSync (Cloudflare) = shared sync plane for clipboard/prompts/notes metadata.
- Obsidian = knowledge source of truth.

### Practical interpretation
FORGE should not immediately replace AHK automation where AHK already wins.
FORGE should wrap, launch, coordinate, and gradually replace modules where native implementation becomes clearly better.

---

## 2) Reuse Map (What to Keep, Wrap, Rebuild)

## Keep As-Is (now)
- AI-HUB hotkey ecosystem (stable, battle-tested).
- KeyClipboard package behavior patterns.
- Existing Cloudflare ClipSync architecture ideas (Worker + D1 + DO + JWT path).

## Wrap Into FORGE (short term)
- AI-HUB launcher/hotkey triggers -> FORGE "External Partner" adapter.
- Clipboard sync endpoints -> FORGE sync module.
- Prompt sync and categorization schema -> shared FORGE prompt store model.

## Rebuild Natively In FORGE (mid term)
- Dock/taskbar UX (already underway).
- Command palette and AI workspace flows.
- Plugin platform and capability system.
- Unified NoteGateway with write queue/audit.

---

## 3) Critical Anti-Conflict Rules

### Rule A: Hotkey Ownership Table
Do not let AHK and FORGE both bind the same global shortcuts.

Recommended split now:
- AHK owns: CapsLock combos, Ctrl+Numpad clipboard slot macros.
- FORGE owns: app shell commands, module switching, AI workspace actions.

### Rule B: Single Writer for Notes
All note writes must go through FORGE NoteGateway (or one agreed write path), even if initiated by external adapters.

### Rule C: Sync Is Data Plane, Not Control Plane
ClipSync should sync data/events; it should not become an uncontrolled remote command channel without explicit policy.

### Rule D: One Source of Truth Per Domain
- Notes: Obsidian vault
- Clipboard history cloud mirror: ClipSync
- App settings/capabilities: FORGE settings + plugin manifests

---

## 4) Mapping AI-HUB Package Philosophy to FORGE Plugin Platform

AI-HUB concept:
- `modules/` stable
- `packages/` toggleable extensions

FORGE equivalent:
- `core modules` (editor, ai workspace, settings, dock)
- `plugins/` with manifest + permissions + contributions

Direct conceptual mapping:
- AI-HUB `packages.json enabled/disabled` -> FORGE plugin manager enable/disable state
- AHK wrapper module -> FORGE plugin adapter runtime entry
- shortcut reporting tab -> FORGE command registry + command palette

---

## 5) Integration Architecture: Adapters First

## Adapter 1: AI-HUB Bridge Adapter
Responsibilities:
- Launch/stop AI-HUB profiles
- Read AI-HUB shortcut manifest for display in FORGE
- Trigger approved AHK actions from FORGE UI

## Adapter 2: ClipSync Adapter
Responsibilities:
- Push/pull clipboard and prompt objects
- Normalize payloads into FORGE schema
- Emit local events for UI refresh

## Adapter 3: Obsidian Bridge Adapter
Responsibilities:
- Advanced URI deep links
- Local REST API read/list first
- controlled write mode later

---

## 6) Shared Data Contracts (Must Define Early)

### Clipboard item (canonical)
- `id`
- `content`
- `type`
- `source` (`forge` | `aihub` | `web` | `android`)
- `created_at`
- `tags[]`
- `priority`

### Prompt item
- `id`
- `title`
- `body`
- `variables[]`
- `category`
- `source`
- `updated_at`

### Command descriptor
- `id`
- `title`
- `owner` (`forge_core`, `plugin:<id>`, `aihub_adapter`)
- `hotkey?`
- `capability_required[]`

---

## 7) Build Order (Merged Strategy)

### Week 1 (Foundation + immediate UX)
1. Add single-instance + window-state in FORGE.
2. Add command palette.
3. Add command registry abstraction.
4. Add static AI-HUB command mirror section in FORGE settings.

### Week 2 (Adapter path)
1. Implement AI-HUB Bridge Adapter (launch + command invoke).
2. Implement ClipSync adapter skeleton (read/push test endpoint).
3. Show synced clipboard/prompt feed in FORGE panel (read-only first).

### Week 3 (Plugin foundation)
1. Plugin manifest schema + discovery.
2. Plugin manager UI.
3. First-party plugins:
   - `aihub-bridge`
   - `clipsync-bridge`

### Week 4 (Safe write and Obsidian interop)
1. NoteGateway abstraction.
2. Obsidian read/list via bridge.
3. Controlled write queue + audit log.

---

## 8) Priority Guidance (Your specific question, operationalized)
Do not choose "easy" or "hard" in isolation.
Choose dependency-critical work that unlocks both speed and future stability.

For your stack, that means:
- ship quick shell wins every week,
- while laying plugin + gateway foundations so nothing needs a major rewrite.

---

## 9) Immediate Next Tickets (Concrete)
1. `FORGE-101` Command Registry + Palette (with owner namespaces).
2. `FORGE-102` Plugin Manifest v1 + Discovery Loader.
3. `FORGE-103` AI-HUB Adapter stub (launch + list exposed actions).
4. `FORGE-104` ClipSync schema draft + normalization layer.
5. `FORGE-105` Hotkey ownership matrix UI page.

---

## 10) Strategic Outcome
By integrating AI-HUB as a partner layer (not a throwaway), you keep your existing power while FORGE becomes the extensible long-term operating system.

That is the highest-leverage path with the lowest regret.
