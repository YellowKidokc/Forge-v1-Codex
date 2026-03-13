# FORGE - Master Update (High-Level + Execution Plan)

Date: 2026-03-05
Status: Active Build
Owner: David + FORGE Core

## 1) Where We Are Right Now
FORGE has moved from concept into a working shell with real momentum.

### Live foundation already implemented
- Dock/taskbar with clickable app launchers.
- Launcher types:
  - internal views
  - web URL
  - local path/app/script
- Dock persistence:
  - order
  - pinned state
  - name/icon metadata
- Dock right-click actions:
  - pin/unpin
  - rename
  - open in new window (internal)
  - remove (non-core)
- AI Workspace baseline (TypingMind-style direction) with provider switching.
- Settings + Platform includes:
  - AI provider + keys
  - launcher management
  - global appearance controls
- Quick Places implemented:
  - pinned notebook/path shortcuts in sidebar
  - one-click jump/open
  - pin current notebook

## 2) Core Product Direction (Confirmed)
- Obsidian = Source of truth for vault knowledge.
- FORGE = Operating shell and orchestration layer.
- AI is substrate, not add-on.
- Every module should be composable, persistent, and cumulative.
- Avoid "two systems fighting" by enforcing a single write gateway for notes.

## 3) Big Architecture Decision
### Dependency-first build order (not preference-first)
Best sequence:
1. Stability + navigation primitives first.
2. Plugin foundation early enough to prevent migration debt.
3. Feature work built on plugin-capable interfaces.
4. Obsidian bridge with controlled write rules.

Why:
- Fast wins keep momentum.
- Foundation prevents rework.
- Safe write path prevents cross-system collisions.

## 4) Priority Roadmap

### Phase A - Fast Wins (Immediate)
- Tauri `single-instance`
- Tauri `window-state`
- Command palette (`cmdk`) for universal control

### Phase B - AI UX Upgrade
- Chat folders
- Prompt snippets/library integration
- Better structured AI workspace interactions

### Phase C - Obsidian Bridge (No-Fight Mode)
- Read/list through bridge first
- Deep links via Advanced URI
- Controlled writes via unified NoteGateway

### Phase D - Plugin Platform (Strategic)
- Manifest + discovery + enable/disable manager
- Capability permissions
- Command/panel contributions
- Queue + audit for note writes

## 5) Difficulty Snapshot
- #1 single-instance + window-state: easy
- #2 command palette: medium
- #3 chat folders/prompts: medium
- #4 Obsidian bridge: medium-hard
- #5 full plugin platform: hard (highest leverage)

Summary:
- 1-4 roughly comparable to plugin platform phase 0-1.
- Full plugin ecosystem is larger than all quick wins combined.

## 6) Recommended Build Strategy (Current)
Hybrid approach:
1. Ship immediate user-facing wins (A).
2. Stand up plugin foundation skeleton (D phase 0).
3. Build next UX features on top of that skeleton (B).
4. Add Obsidian bridge and safe-write policies (C).

This gives speed now and avoids architecture debt later.

## 7) Existing FORGE Planning Docs Created
- FORGE_SIMPLE_FIRST_ROADMAP.md
- FORGE_PLUGIN_PLATFORM_ARCHITECTURE.md
- FORGE_upgrade_log.md
- FORGE_plugin_feature_notes.md
- FORGE_plugin_inventory.csv

## 8) What To Implement Next (Action Queue)
1. Add `single-instance` + `window-state` plugins.
2. Add command palette (`cmdk`) with launcher/notebook/place commands.
3. Create plugin manifest schema + plugin discovery loader.
4. Create plugin manager page (enable/disable + permission display).
5. Implement NoteGateway abstraction (file backend first, bridge backend second).

## 9) Non-Negotiables
- No direct untracked plugin writes to vault files.
- All writes flow through one queue/audit path.
- Keep interfaces stable and versioned before opening ecosystem.

## 10) Strategic Outcome
If this sequence holds, FORGE becomes:
- useful immediately,
- extensible by outside developers,
- and safe enough to run as your long-term personal operating layer.


## Addendum - AI-HUB Merge Track (2026-03-05)
See: `O:\FORGE\FORGE_X_AIHUB_INTEGRATION_BLUEPRINT_2026-03-05.md`

This addendum defines how AI-HUB, ClipSync, and FORGE combine without operational conflict.
