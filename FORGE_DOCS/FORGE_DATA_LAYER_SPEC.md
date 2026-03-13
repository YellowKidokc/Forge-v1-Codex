# FORGE Data Layer Spec
## The Ingestion Layer — Comes BEFORE the Graph

Date: 2026-03-10
Status: CANONICAL — this is Layer 0. Everything else builds on top.

---

## The Core Idea

Any data source. Drop it in. Answer 3-5 questions. It's live.

```
User drops Excel/CSV/JSON/database dump into FORGE
  → Setup wizard fires (3-5 questions max)
  → Data is ingested and indexed
  → Notes layer activates on top of it
  → AI partners start reading behind the scenes
  → Knowledge graph can now consume it
```

No schema design. No import scripts. No data engineering.
Drag. Answer. Done.

---

## The Setup Wizard (3-5 Questions Max)

When a file is dropped:

```
Q1: What IS this?
    [ Bible ] [ Research papers ] [ Historical data ]
    [ Stock prices ] [ My own notes ] [ Other: ______ ]

Q2: What's the primary key? (what makes a row unique?)
    e.g. "Book + Chapter + Verse" or "Date + Symbol" or "UUID"
    → auto-detected, user confirms or corrects

Q3: What do you want to DO with this?
    [ Read and annotate ] [ Search and cross-reference ]
    [ Run analysis ] [ Feed the knowledge graph ] [ All of the above ]

Q4: Any columns that are CANONICAL? (load-bearing, never overwrite)
    → user marks them or skips

Q5 (optional): What should the AI partners watch for?
    → user types in plain language, or skips
```

After 5 answers: data is live. No more setup.

---

## The Bible Use Case (Primary Example)

```
Drop in: KJV Bible in Excel
  (Book | Chapter | Verse | Text — 31,102 rows)

Q1: "What is this?" → Bible
Q2: Primary key → Book + Chapter + Verse (auto-detected)
Q3: "What do you want to do?" → Read, annotate, cross-reference, feed graph
Q4: Canonical columns → Text (KJV text is canonical, never overwrite)
Q5: "What should AI watch for?" → 
    "Connections to Theophysics framework. 
     Logos mentions. Chi variable correlations. Prophecy patterns."

RESULT:
- All 31,102 verses are live
- Notes layer active on every verse
- AI partners watching for framework connections
- Every verse is a potential anchor in the knowledge graph
- Select any verse → annotation loop fires
- "In the beginning was the Word" → canonical anchor → Logos Field
```

That's the whole thing. One drag. Five questions.

---

## What "Live" Means

After ingestion, every row in the data source becomes:

```
{
  id:          auto-generated FORGE UUID
  source:      "KJV_Bible.xlsx"
  primary_key: "JHN|1|1"
  columns:     { Book: "John", Chapter: 1, Verse: 1, Text: "In the beginning..." }
  notes:       []          ← empty, ready for annotation
  anchors:     []          ← empty, fills as user annotates
  ai_flags:    []          ← fills as background AI watches
  graph_node:  null        ← fills when graph consumes it
}
```

---

## The AI Partner Layer (3+ Models Behind the Scenes)

Three roles. Three models. All silent unless they find something.

### AI-1: The Connector
**Role:** Pattern matching across ALL ingested data sources
**Watches for:** Same concept appearing in multiple sources
**Fires when:** Bible verse + Theophysics paper + historical data all reference the same idea
**Output:** "I found a connection: JHN 1:1, E2.1 (Master Equation), and Newton's Principia all assert information primacy."

### AI-2: The Challenger  
**Role:** Contradiction detection
**Watches for:** Two canonical anchors that conflict with each other
**Fires when:** Something you declared canonical in doc A contradicts something canonical in doc B
**Output:** "Conflict detected: your canonical Grace equation uses G(t) decay. But in paper P-047 you define G as a constant. Which is canonical?"

### AI-3: The Archivist
**Role:** Gap detection and completeness scoring
**Watches for:** Things that SHOULD be there but aren't
**Fires when:** A citation appears but the source isn't ingested. A concept is referenced but never defined. A chain breaks.
**Output:** "You reference 'the Vine Principle' 14 times across 6 documents but it has no canonical definition. Want me to draft one?"

### AI-4+ (Expandable)
- Domain specialist (e.g., Hebrew/Greek lexicon watch)
- Prophecy pattern detector
- Cross-translation variance tracker
- Coherence scorer (Fruits + Chi, running on new ingestions)

All models run on a **lazy evaluation** schedule:
- On new ingestion: full initial pass
- On new annotation: targeted rescan of affected rows
- On explicit `/PROBE` or `/CHAIN` command: deep dive on demand
- Never blocking the user. Always background.

---

## The Notes Layer

Every row in every ingested source gets a notes layer.
Notes are NOT stored in the source file. They're stored in FORGE's annotation cache.

```
Source row (read-only, canonical):
  JHN 1:1 | "In the beginning was the Word..."

Notes attached to this row:
  [Opus, 2026-03-10] "Canonical Logos thesis. χ field definition begins here."
  [User, 2026-03-10] "Cross-ref: Genesis 1:1, E2.1, Logos Field Definition"
  [AI-1, 2026-03-10] "Connection: Wheeler's 'It from Bit' uses identical logical structure"
  [AI-2]             ← no flags on this row
  [AI-3, 2026-03-10] "Referenced 47 times across vault. Consider promoting to NEAR-CANONICAL tier."
```

Source is never modified. Notes float on top. Separated by design.
If source is re-imported with updates, notes survive.

---

## Supported Ingestion Formats (v1)

```
Excel (.xlsx)       → primary format, sheets become tabs
CSV (.csv)          → auto-detected delimiter
JSON array          → each object becomes a row
Markdown folder     → each .md file becomes a row (existing vault support)
PostgreSQL table    → direct query, live sync
Plain text          → line-per-row, manual column mapping
```

Future (not v1):
- PDF with structure detection
- Bible API direct (BibleGateway, api.bible)
- Google Sheets live sync
- Obsidian vault hot-reload

---

## The Layer Order (This Is the Right Stack)

```
Layer 0: DATA INGESTION         ← THIS SPEC. First. Always.
  ↓
Layer 1: ANNOTATION             ← Select → Chat → Declare → Done
  ↓
Layer 2: AI PARTNER MONITORING  ← 3+ models watching behind the scenes
  ↓
Layer 3: COHERENCE SCORING      ← Fruits + Chi running on annotated content
  ↓
Layer 4: KNOWLEDGE GRAPH        ← TIE_Graph + Fruits_Graph consuming scored nodes
  ↓
Layer 5: PUBLICATION            ← Substack, Logos Papers, public output
```

You said it right: Layer 0 comes before the graph.
The graph needs fuel. Ingestion is the fuel.

---

## Why Excel First (Not Database First)

Most people's data already lives in Excel. Bible downloads. Research exports. Stock prices. Historical tables. Prophecy trackers.

Excel first means:
- Zero setup friction
- Works with what users already have
- Familiar format, no conversion needed
- One file = one data source = five questions = live

Database can come later as a power-user feature.
Excel is the on-ramp for everyone.

---

## The "Any System" Property

Because the wizard asks WHAT it is before ingesting HOW it works,
any structured data source can be dropped in:

- Bible → verse-level annotation
- Stock prices → date-level annotation
- Axioms database → UUID-level annotation
- Historical documents → paragraph-level annotation
- Legal cases → clause-level annotation
- Sermon notes → section-level annotation

Same container. Same notes layer. Same AI partners watching.
Different metadata. Different AI-5 specialist if needed.

The framework is domain-agnostic by design.

---

## Build Order

```
1. File drop handler           → accept xlsx/csv/json, detect format
2. Setup wizard UI             → 5-question flow, auto-detect primary key
3. Row renderer                → display ingested data with notes column
4. Notes store                 → attach/read notes per row per source
5. AI-1 (Connector)           → first model, pattern match across sources
6. AI-2 (Challenger)          → contradiction watch
7. AI-3 (Archivist)           → gap detection
8. Graph bridge                → expose scored rows to TIE/Fruits graph
```

Ship 1+2+3+4. Everything else is additive.

---

## Status

This is Layer 0. Build this first.
Everything in FORGE that touches data should flow through this layer.
No direct database reads in the UI. No hardcoded schemas.
Everything goes through: DROP → WIZARD → LIVE → NOTES → AI → GRAPH.
## The Fundamental Rule: AIs Are Unconstrained

Once data is ingested, the AI partners have no restrictions on what they can create, infer, or structure.

- They do NOT wait for the user to define what to look for
- They do NOT ask permission to build internal models
- They do NOT surface anything until the user brings it up — unless they find something worth flagging
- They CAN build their own indexes, relationship maps, pattern libraries, concept clusters
- They NEVER modify source data (source is always canonical)
- They work silently until called

**Why this matters:** Constrained AIs produce constrained insights. The value is in what the AI finds that the user wasn't looking for. Let them roam. The user controls what surfaces, not what the AI notices.

---

