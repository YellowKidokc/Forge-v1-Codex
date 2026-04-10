# FORGE — The Template Engine

## What Forge Is

Forge is a three-layer editor. Read the full codebase before writing a single line.

It has three layers at its feet:

1. **Markdown** — anything Obsidian can do, we can do. Clean text, wiki links, headings, callouts, frontmatter. TipTap (ProseMirror) powers this. It works.
2. **Blocks** — anything Notion can do, we can do. Promoted blocks already exist (claim, axiom, law, evidence, operator, conjecture). Each block has a unique `^blockId` and AI commands (PROBE/EST/CON). Extend this to columns, toggles, databases, embeds.
3. **Grid** — anything Excel can do, we can write the code for. `lib/grid.ts` + `hooks/useGrid.ts` + `Editor/GridLayer.tsx` are ALREADY BUILT. Every word in the document has a `[row, col]` coordinate. Cells have metadata: tags, flags, links, color, confidence scores. The grid syncs with TipTap in real-time. Persistence works via localStorage serialization.

We are NOT making Excel. We are NOT making Obsidian. We are NOT making Notion. We are making the thing that has all three and lets you mix them on one page.

## What's Already Built (DO NOT BREAK)

- **Editor**: TipTap with full markdown round-trip (`ForgeEditor.tsx`, `lib/markdown.ts`)
- **Promoted Blocks**: Custom TipTap extension with 6 block types + AI commands (`PromotedBlockExtension.ts`, `PromotedBlockView.tsx`)
- **Grid Layer**: Word-level addressable substrate with `[row, col]` coordinates, tagging, flagging, highlighting, cell mutation, range queries, text search, persistence (`lib/grid.ts`, `hooks/useGrid.ts`, `Editor/GridLayer.tsx`)
- **AI Layer (3-tier)**: Block-level AI (PROBE/EST/CON), Panel AI (interface/logic/copilot modes), Workspace AI (4-panel layout) — all streaming via Anthropic + OpenAI (`AiPanel.tsx`, `AIWorkspace.tsx`, `lib/ai.ts`, `lib/aiPrompts.ts`)
- **Sidebar + File Tree**: Vault switching, folder/file CRUD, wiki link resolution (`Sidebar.tsx`, `FileTree.tsx`)
- **Settings**: Full settings page with API key management (`SettingsPage.tsx`)
- **Rust Backend**: Tauri 2 commands for all file I/O + wiki link creation (`src-tauri/src/lib.rs`)
- **LogicSheet**: Standalone spreadsheet widget (`components/miniapps/LogicSheet.tsx`)
- **Toolbar**: Context-aware — already shows table tools only when cursor is in a table (`EditorToolbar.tsx`)

## The Core Interaction — What To Build

A user is looking at a page. They highlight a region of cells on the grid. They declare what that region IS:

- **Surface** — visible markdown, rendered clean like Obsidian
- **Active cells** — Excel-like, formulas work, values compute
- **Notion blocks** — structured content blocks with types and properties
- **Behind the scenes** — hidden data layer, not rendered but accessible to AI and queries

When you click into a region, the toolbar above changes to show ONLY the tools relevant to what you're standing on. Excel cell → Excel tools. Notion block → block tools. Markdown → formatting tools. Don't render 1000 tools. Render what you need right now. The toolbar ALREADY does this for tables (see `EditorToolbar.tsx` lines 79-85) — extend this pattern to all region types.

## Design Laws

1. **Contextual tooling** — tools appear when you need them, based on what cell/region type you're in. When you leave, they leave. The table toolbar pattern already demonstrates this.
2. **Declaration over configuration** — you highlight, you declare, it becomes. No settings dialogs. Select → declare.
3. **Write it when you use it** — don't pre-build every Excel function or every Notion block type. Build the framework so that when a tool is needed, the code for it gets written/loaded. Lazy capability.
4. **Clean rendering** — the output always looks clean. Obsidian-clean. The complexity is underneath, not on the surface.
5. **Template = frozen layout** — once a page is designed with its mix of regions (some markdown, some blocks, some grid, some hidden), that layout can be saved as a template and stamped onto new pages. Variables like `{{project_name}}` get filled on stamp.
6. **Reverse templating** — take any existing page, freeze its layout as a template, stamp it again later. "Save as template" is as important as "New from template."

## What To Build — The Template Engine

### Region Declaration System
- Extend the Grid's existing cell metadata (`CellMeta` in `lib/grid.ts`) to include a `regionType` field: `'surface' | 'active' | 'block' | 'hidden'`
- When user selects a range of cells (use the existing `getCellRange` API), let them declare the region type
- Regions persist via the existing `serializeGridMeta` / `deserializeGridMeta` system
- The toolbar (`EditorToolbar.tsx`) reads the current cursor's region type and swaps tool groups accordingly

### Contextual Toolbar
- Extend `EditorToolbar.tsx` to detect which region type the cursor is in
- Surface regions: show markdown formatting tools (already built)
- Active cell regions: show formula bar, cell formatting, basic computation tools
- Block regions: show block type selector, property editor, toggle controls
- Hidden regions: show a minimal "hidden data" indicator, no editing tools
- Build tools lazily — start with the region detection and toolbar swap. Individual tools get built as needed.

### Template System
- Template = snapshot of a page's structure: what regions exist, what types they are, what block types are used, what the markdown skeleton looks like
- `save_as_template(source_path, template_name)` — Tauri command that reads a page, extracts its region layout + content skeleton, saves as `{vault}/.forge/templates/{name}.yaml`
- `list_templates()` — Tauri command that scans templates directory
- `stamp_template(template_id, variables, output_path)` — Tauri command that creates a new page from a template, substituting `{{variables}}`
- Template UI: "New from Template" option in sidebar, template picker with previews
- Built-in starter templates (create 3):
  - **Research Paper**: title, abstract (surface), methods (surface), data table (active cells), evidence blocks (notion blocks), references (hidden metadata)
  - **Investigation Dossier**: timeline (surface), entity grid (active cells), evidence cards (notion blocks), contradiction tracker (active cells), source chain (hidden)
  - **Knowledge Base**: index (surface), axiom blocks (notion blocks), cross-references (hidden links), glossary table (active cells)

### File Import (Stretch Goal)
- Import a .docx file → parse to markdown → cut into blocks on the grid → user declares regions
- Can shell out to pandoc from Rust if available, or use a JS-based parser
- Wire into the existing upload button in `AIWorkspace.tsx` (currently a placeholder)

## Architecture Rules

- All file I/O goes through Rust `src-tauri/src/lib.rs` — add new `#[tauri::command]` handlers
- Frontend calls via `invoke()` — follow the existing patterns in `Sidebar.tsx`
- React 19 + TailwindCSS 4 + Lucide icons — match the existing dark theme (`bg-[#1e1e2e]`, `forge-ember` accents)
- TypeScript strict mode
- Grid mutations use the immutable pattern from `lib/grid.ts` (return new snapshots, don't mutate)
- Templates stored in `{vault}/.forge/templates/`

## What NOT to Do

- Don't modify the AI system (AiPanel, AIWorkspace, PromotedBlockView, aiPrompts)
- Don't modify the markdown serializer (markdown.ts) unless extending for new block types
- Don't break the existing grid system — extend it
- Don't clone Excel/Notion/Obsidian — take what's useful, skip what's not
- Don't render tools the user doesn't need right now
- Don't add npm dependencies without justification
