# DEBUG TASK — Codex Debugging Claude's Code

## What Happened
The source code in `_FORGE_SOURCE/` was written by Claude AI (originally in Forge-v1-Claude repo). It has been placed here for you (Codex) to debug, fix, and improve.

The original Codex code is preserved on the `main` branch. This swapped code is on the `claude-code-debug` branch.

## Your Job
1. Get this code to compile and run cleanly (`npm install && npm run dev`)
2. Fix any TypeScript errors, missing imports, broken references
3. Test each component actually works in the browser
4. Report what you fixed

## What Claude Built (that you need to debug)
These files are NEW — they didn't exist in your original version:
- `src/components/ChatSidebar.tsx` — foldered chat sidebar with thread management
- `src/components/CommandPalette.tsx` — Ctrl+K command palette (needs `cmdk` package)
- `src/components/DataIngestion/IngestionView.tsx` — data import UI
- `src/components/GlobalEngine/EngineManager.tsx` — YAML engine config UI
- `src/components/PluginManager/PluginManagerView.tsx` — plugin management
- `src/components/PromptSnippets.tsx` — reusable prompt library
- `src/components/SortableList.tsx` — drag-and-drop list (needs `@dnd-kit`)
- `src/components/VersionControl/VersionBrowser.tsx` — version diff viewer
- `src/lib/versioning.ts` — Tauri-based snapshot/diff system
- `src/lib/chatStore.ts` — chat thread persistence
- `src/lib/ingestion.ts` — data ingestion logic
- `src/lib/plugins.ts` — plugin registry

## Known Differences From Your Version
- `App.tsx` is 674 lines (yours was 589) — more state, more panels, more commands
- `package.json` has extra deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `cmdk`, `@tauri-apps/plugin-window-state`
- `src-tauri/src/lib.rs` is 939 lines (yours was 760) — extra Tauri commands for versioning, engines, etc.
- `InlineAiChat.tsx` has a two-mode system (declare vs AI) that your version didn't have
- `useGrid.ts` uses polling (setInterval 500ms) — your version used event-driven subscriptions which was better

## Extra Credit (After Debugging)
If you can, port your instruction cache system (`instructionCache.ts`) into Claude's InlineAiChat — it would add the caching layer to Claude's more complete declaration system. Best of both worlds.

## Next Steps (After Debug Pass)
Refer to `FORGE_BUILD_SPEC_MASTER.md` — Priority order:
1. Verify Grid Layer works end-to-end
2. Verify Inline AI Chat selection → instruct → done loop
3. Verify Data Mirror creates shadow folders
4. Verify Global Engine loads and runs YAML configs
5. Verify Version Control snapshots and diffs

## Rules
- Do NOT delete files you don't understand — investigate first
- Do NOT rewrite from scratch — fix what's here
- Keep the existing architecture decisions (Tauri v2, TipTap, React 19)
- Log every fix you make

---
*Swapped by Opus | POF 2828 | March 20, 2026*
