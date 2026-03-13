# FORGE — Programmer Handoff Document
## What This Is and How It Works

Date: 2026-03-10
Author: David Lowe / Opus
Purpose: Hand this to any programmer. They don't need AI context. They need architecture.

---

## 1. THE BIG PICTURE

FORGE is a knowledge workspace. Think of it like Notion or Obsidian,
but with three things those tools don't have:

1. Any data source can be dropped in and annotated (Excel, Notion, Obsidian, databases)
2. AI partners run silently in the background, watching everything
3. A knowledge graph builds itself from what gets annotated

The user never has to design a schema, configure a pipeline, or tell the
AI what to look for. They just work. The system learns from them as they go.

---

## 2. THE LAYOUT (Flexible — Programmer Decides Implementation)

The workspace is a configurable panel system. The user can arrange it however
they want. Suggested defaults — but none of these are locked:

```
Option A: Four quadrants
┌─────────────┬─────────────┐
│  Data View  │  Editor     │
│  (top left) │  (top right)│
├─────────────┼─────────────┤
│  AI Feed    │  Graph      │
│ (bot left)  │  (bot right)│
└─────────────┴─────────────┘

Option B: Two columns
┌──────────┬──────────────────┐
│ Sidebar  │  Main workspace  │
│ (narrow) │  (wide)          │
└──────────┴──────────────────┘

Option C: Stacked horizontal strips
┌─────────────────────────────┐
│  Data / Editor (top)        │
├─────────────────────────────┤
│  AI Feed + Graph (bottom)   │
└─────────────────────────────┘
```

The panels are: Data View, Editor, AI Feed, Knowledge Graph, Side Panel.
How they're arranged doesn't matter to the core architecture.
The programmer can make them draggable, resizable, collapsible — whatever works.
The data layer and AI layer don't care about the UI layout.

---

## 3. THE DATA LAYER (Excel / Notion / Obsidian)

### The Core Loop

```
User drops a file (or connects a source)
  → Setup wizard fires (max 5 questions)
  → Data is indexed row by row
  → Notes layer activates on every row
  → AI partners start watching
  → Done
```

### Supported Sources (build in this order)

```
Priority 1: Excel / CSV
  - User drops .xlsx or .csv file
  - Each row becomes a "record"
  - Primary key auto-detected (or user picks)
  - Column headers become field names
  - Example: KJV Bible = 31,102 rows, columns: Book/Chapter/Verse/Text

Priority 2: Notion
  - Connect via Notion API
  - Each database row = record
  - Pages = records with rich content
  - Notes attach alongside existing Notion content

Priority 3: Obsidian vault
  - Point FORGE at a folder
  - Each .md file = record
  - Wikilinks become relationships automatically
  - Tags become searchable metadata

Priority 4: PostgreSQL (direct connection)
  - Any table = data source
  - Live sync on query
```

### The 5-Question Setup Wizard

When any source is connected, ask these in order. Stop early if enough info is collected.

```
Q1: What is this?
    (free text or quick-pick: Bible / Research / Notes / Data / Other)

Q2: What makes each row unique?
    (auto-detect from columns, user confirms or corrects)

Q3: What do you want to do with it?
    (Read+annotate / Search / Feed the graph / All)

Q4: Are any columns sacred? (never change, always canonical)
    (user marks columns or skips)

Q5: Anything specific to watch for? (optional)
    (plain language, passed to AI partners as a hint — not a rule)
```

After 5 answers: data is live. Wizard never appears again for this source.

### The Notes Layer

Source data is NEVER modified. Notes float on top, stored separately in FORGE's own database.

```
Source record (read-only):
  John 1:1 | "In the beginning was the Word..."

FORGE notes attached to this record:
  [User, 2026-03-10]  "Canonical Logos anchor"
  [AI-Connector]      "Same logical structure as Wheeler's It-From-Bit"
  [AI-Archivist]      "Referenced 47x across vault — consider promoting"
```

If the source file is re-imported or updated, the notes survive.
Notes are keyed to the record's primary key, not its position in the file.

---

## 4. THE AI PARTNER LAYER

### The Fundamental Rule

The AI partners are UNCONSTRAINED after ingestion.
They do not need to be told what to look for.
They do not surface anything until the user asks — unless they find something significant.
They can build whatever internal models, indexes, or relationship maps they want.
They never modify source data.
They work silently.

This is intentional. Constrained AIs produce constrained insights.
The value is in what the AI finds that the user wasn't looking for.

### Three Core Roles (minimum)

```
AI-1: THE CONNECTOR
  Job: Find the same concept appearing across different sources
  Example: Bible verse + research paper + historical record all assert
           the same claim → surface the connection
  Fires: When cross-source pattern confidence exceeds threshold
  Silent otherwise

AI-2: THE CHALLENGER
  Job: Catch contradictions between things the user has marked canonical
  Example: User declares Grace equation canonical in doc A.
           Same variable defined differently in doc B.
           → flag the conflict, ask which is authoritative
  Fires: Only when two locked/canonical items conflict
  Silent otherwise

AI-3: THE ARCHIVIST
  Job: Find gaps — things referenced but never defined, chains that break,
       citations pointing to sources not yet ingested
  Example: "You reference 'the Vine Principle' 14 times but it has
            no canonical definition anywhere in the vault"
  Fires: On ingestion (full pass) and on new annotation (targeted rescan)
  Silent otherwise
```

### More AI roles can be added

The framework supports any number of named background roles.
Examples of what could be added later:

```
AI-4: Domain Specialist     (e.g., Hebrew/Greek lexicon, legal terms)
AI-5: Pattern Detector      (recurring structures across documents)
AI-6: Coherence Scorer      (runs Fruits of Spirit + Chi variable scoring)
AI-7: Prophecy Tracker      (date/event pattern matching in scripture)
```

Each one is just: watch the data, build internal models, surface on request.
Same interface, different specialty.

### How the AI Partners Communicate to the User

```
Default state: silent
Surface via: AI Feed panel (not a popup, not an interruption)
User pulls from the feed when they want it
AI can flag "high confidence" items that appear at top of feed
User can /PROBE any AI partner directly: "Connector, what did you find in John 1?"
User can clear/dismiss any AI finding
```

---

## 5. THE KNOWLEDGE GRAPH LAYER

The graph is downstream of the data and annotation layers.
It builds from what the user has annotated and what the AI partners have flagged.

Two graph engines exist already (Python, fully working):

```
TIE_Graph_v1
  Location: O:\999_IGNORE\Obsidian Programs\TIE_Graph_v1
  What it does: Structural scoring of nodes, wikilink-based edges,
                vector similarity edges (TF-IDF + SVD), 2D + 3D viewer
  Last run: 2026-03-07, 20 nodes, 217 edges
  Status: Working, needs a bridge to FORGE

Fruits Graph (Python Backend)
  Location: O:\999_IGNORE\Obsidian Programs\Python_Backend\ui\tabs\fruits_graph_tab.py
  What it does: Scores every vault note against Fruits of the Spirit
                (structural coherence metrics) + Chi variable scoring
                from the Theophysics Master Equation.
                Nodes sized by combined score. Colored by dominant Chi variable.
                Edges by shared Chi dominance + vector cosine similarity.
  Status: Working standalone, needs a bridge to FORGE
```

The bridge needed: expose both Python engines as background processes
that FORGE calls via subprocess or REST. Feed them the annotated data.
Consume their JSON output in the graph panel.

---

## 6. BUILD ORDER (Recommended)

```
Phase 1: Foundation
  1. File drop handler — accept .xlsx / .csv / .json
  2. Setup wizard — 5-question flow, primary key detection
  3. Row renderer — display ingested rows with a notes column
  4. Notes store — per-row note attachment, survives re-import

Phase 2: AI Layer
  5. AI-1 Connector — cross-source pattern matching
  6. AI-2 Challenger — canonical conflict detection
  7. AI-3 Archivist — gap and broken-chain detection
  8. AI Feed panel — where findings surface on demand

Phase 3: Sources
  9. Notion connector — API, database rows as records
  10. Obsidian connector — folder watch, .md files as records
  11. PostgreSQL connector — direct table query

Phase 4: Graph
  12. TIE Graph bridge — subprocess call, JSON output to graph panel
  13. Fruits Graph bridge — same pattern
  14. Graph panel — 2D vis-network + 3D Plotly viewer (code exists)
```

---

## 7. WHAT ALREADY EXISTS (Don't REBUILD)

```
TIE_Graph_v1            O:\999_IGNORE\Obsidian Programs\TIE_Graph_v1\
                        Full Python graph builder + HTML viewer. Working.

Python Backend          O:\999_IGNORE\Obsidian Programs\Python_Backend\
                        Coherence engine, Fruits scorer, contradiction detector,
                        semantic tag engine, vault analytics. All working.

FORGE Shell             O:\FORGE\_FORGE_SOURCE\
                        Tauri (Rust + React/TypeScript) desktop app scaffold.
                        Editor, bottom bar, side panel, AI panel roughed in.

Spec Docs               O:\FORGE\FORGE_DOCS\
                        FORGE_SELECTION_ANNOTATION_SPEC.md
                        FORGE_DATA_LAYER_SPEC.md
                        This file.
```

---

## 8. THE ONE DESIGN PRINCIPLE

If a feature requires more than:
  SELECT something → say what it is → done

...it is probably overcomplicated. Rebuild it simpler.

The user should never feel like they are configuring a system.
They should feel like they are talking to a system that already understands them.
