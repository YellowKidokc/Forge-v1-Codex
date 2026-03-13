# Bible Semantic Explorer - AI Handoff Spec (Web-First, Obsidian-Ready)

## Purpose
Define a working system that keeps Scripture text as the primary reading surface while enabling on-demand semantic analysis and writing workflows.

This is **not Obsidian-only**. It is a reusable architecture that can run as:
- plain HTML/CSS/JS prototype
- Obsidian plugin view
- standalone app tied into the Evidence Engine

## Canonical Inputs Used
- User requirements from live build session (Genesis 11 prototype workflow).
- Vault architecture context in `00_SYSTEM` and `05_EVIDENCE_ENGINE`.
- Canonical framing baseline from:
  - `O:\_Theophysics_v4\00_SYSTEM\CANONICAL_FRAMING.md`

## System Definition (What We Are Building)
### Core interaction contract
1. Main text remains center and primary.
2. User can open **left OR right panel only** (mutually exclusive).
3. Inline per-verse controls:
- `◀` opens research panel (left)
- `✚` toggles semantic overlay mode
- `▶` opens writing/AI panel (right)
4. Semantic overlay highlights linked entities directly in verse text.
5. Left panel contains configurable module stack (orderable).
6. Right panel contains writing workspace tabs (chat placeholder, markdown pad, notes).

### Hierarchical UUID model (required)
Every object in the text stack has a persistent UUID:
- testament_uuid
- book_uuid
- chapter_uuid
- verse_uuid
- word_uuid
- misc_uuid (non-canonical/support items)

All annotations, links, and evidence references can attach at any level.

### Why this matters for Theophysics
This can serve as the **front-end lens** over the Evidence Engine:
- verse/word links -> claim/evidence graph
- semantic highlights -> relation visibility
- writing workspace -> publication drafting

It is a Scripture use case and a general-purpose coherence interface.

## Functional Scope v1 (Build Now)
### Must-have
- Single-page prototype in HTML/CSS/JS.
- One chapter rendered (Genesis 11 sample).
- Inline controls (`◀ ✚ ▶`) per verse.
- Left/right exclusive panels.
- Left panel module list with drag-reorder.
- Right panel tabs: Chat, Writing, Notes (UI placeholders only).
- Color-coded semantic highlight toggle from `✚`.
- JSON-backed sample UUID data for words/verses/chapters.

### Should-have
- Hover tooltip for a word (show UUID + type + quick metadata).
- Settings modal for choosing visible left modules and order.
- Persist settings to `localStorage`.

### Not in v1
- Real LLM calls.
- Full markdown engine.
- Full Bible corpus ingest.
- Production auth/sync.

## Data Contract (JSON, minimal)
```json
{
  "chapter_uuid": "uuid_c_gen_11",
  "book_uuid": "uuid_b_genesis",
  "testament_uuid": "uuid_t_ot",
  "verses": [
    {
      "verse_uuid": "uuid_v_gen_11_1",
      "verse_number": 1,
      "words": [
        {
          "word_uuid": "uuid_w_gen_11_1_001",
          "text": "Now",
          "types": ["theme"],
          "links": ["evidence:EV-0001", "claim:CL-A-001"]
        }
      ]
    }
  ]
}
```

## UI Blueprint
### Main layout
- Center column: chapter text.
- Left slide panel: research modules.
- Right slide panel: writing workspace.
- One panel open at a time.

### Left panel modules (configurable)
- Greek/Hebrew Lexicon
- People/Places/Things
- Timeline
- Cross References
- Themes
- Maps
- Claim/Evidence Links

### Right panel tabs
- Chat
- Writing Pad
- Notes
- Export

### Semantic overlay legend
- `lexicon`: gold
- `person`: cyan
- `place`: coral
- `theme`: violet
- `crossref`: green
- `evidence-link`: rose underline

## Obsidian Integration Path (After Web v1)
1. Embed prototype as plugin view or local webview.
2. Map UUID links to vault paths.
3. Connect claim/evidence IDs to `05_EVIDENCE_ENGINE` registers.
4. Route right-panel outputs into drafting folders.

## Build Plan for Another AI
1. Create `/prototype/bible-semantic-explorer/index.html`.
2. Create `/prototype/bible-semantic-explorer/app.css`.
3. Create `/prototype/bible-semantic-explorer/app.js`.
4. Create `/prototype/bible-semantic-explorer/data/genesis11.sample.json`.
5. Implement mutually exclusive side-panel state machine.
6. Implement semantic toggle and highlight legend.
7. Implement module reorder + save to localStorage.
8. Add README with run instructions (open `index.html`).

## Acceptance Tests
1. Clicking `◀` opens only left panel and closes right.
2. Clicking `▶` opens only right panel and closes left.
3. Clicking `✚` toggles semantic highlights on/off for tagged words.
4. Word hover shows tooltip with `word_uuid`.
5. Reload preserves module order and visibility settings.
6. No overlap or broken layout on desktop and mobile widths.

## Suggested File for Next AI Deliverable
- `O:\_Theophysics_v4\David\Programs\bible-semantic-explorer-prototype\`
  - `index.html`
  - `app.css`
  - `app.js`
  - `data/genesis11.sample.json`
  - `README.md`

## Intervention Note
Changed from "Obsidian plugin only" to **web-first core + Obsidian adapter** because this is stronger:
- faster iteration
- portable architecture
- easier testing
- direct reuse by Evidence Engine

Assumption made: UI-first validation is currently higher priority than deep plugin coupling.

## Audit Footer
### 1) Where We Are Right
- The model cleanly separates reading, research, and writing without clutter.
- UUID hierarchy enables durable linking from words to evidence artifacts.
- Web-first approach increases speed and survivability across tools.

### 2) Where We Might Be Wrong
- Color/shape semantic coding may become too dense at scale.
- Word-level UUID authoring across full corpus may need ingestion tooling sooner.
- Right-panel "chat + writing" could require tighter UX boundaries.

### 3) What We Think
This architecture is the right bridge between Scripture analysis and the Theophysics Evidence Engine. Build v1 as a browser prototype immediately, then bind it to vault and plugin systems after behavior is stable.

## Next Action Options
1. Generate the actual v1 prototype files now under `David\Programs\bible-semantic-explorer-prototype`.
2. Add a compact schema validator for UUID JSON before UI render.
3. Draft the Obsidian adapter spec once v1 interaction is validated.
