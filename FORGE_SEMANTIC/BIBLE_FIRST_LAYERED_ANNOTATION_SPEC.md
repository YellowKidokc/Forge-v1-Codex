# Bible-First Layered Annotation Spec (Domain-General)

## Purpose
Define a Bible-first semantic system that supports annotation at multiple text levels and remains reusable for physics, law, and other knowledge work.

## Core Rule
Every annotation must attach to a **target level**:
- `word`
- `sentence`
- `paragraph`
- `verse`
- `chapter`
- `book`
- `corpus` (OT/NT/full set/domain collection)

This prevents forcing all meaning into word-level tags.

## Rendering Rule (Reading Experience)
- Default display is paragraph reading (no extra line breaks required).
- Verse numbers can be shown as subtle inline markers or superscripts.
- Semantic controls remain lightweight:
  - `◀` research panel
  - `✚` semantic overlay toggle
  - `▶` writing panel

## Ingest Mode Contract
The system starts with an ingest profile and can switch profiles.

### Ingest profile fields
- `domain`: bible | physics | legal | general
- `segmentation`: paragraph-first | sentence-first | verse-first
- `id_strategy`: stable UUID generation rules
- `enabled_levels`: list of target levels
- `enabled_classes`: taxonomy profile

### Bible-first profile (initial)
- `domain`: bible
- `segmentation`: paragraph-first with verse mapping
- `enabled_levels`: word,sentence,paragraph,verse,chapter,book,corpus
- `enabled_classes`: theology + language + narrative + evidence

## Universal Classification Taxonomy (Cross-Domain)
Use facets so one item can carry many labels without conflict.

### Facet A: Entity Type (what it is)
- person
- place
- object
- concept
- event
- claim
- source
- law/principle
- equation/model

### Facet B: Function Role (what it does)
- definition
- action
- relation
- cause
- effect
- constraint
- exception
- bridge
- analogy
- direct_mapping

### Facet C: Evidence/Posture (how strong it is)
- asserted
- provisional
- verified
- disputed
- unresolved

### Facet D: Time Scope
- timeless
- historical
- sequence_point
- duration
- prophetic/projected

### Facet E: Research Ops
- needs_source
- needs_review
- publish_ready
- canonical
- deprecated

## Bible Mapping Examples
- Word-level: `bara` -> entity:concept, role:action, evidence:verified
- Sentence-level: "God created..." -> claim + causal structure
- Paragraph-level: narrative unit -> event cluster + theme
- Chapter-level: motif progression + timeline markers
- Book-level: doctrinal arc + recurring mappings

## Cross-Domain Mapping (Why this scales)
- Bible "claim" == Physics "hypothesis/model claim" == Law "argument claim"
- Bible "source" == Physics "paper/dataset" == Law "case/statute"
- Bible "relation" == Physics "coupling/dependency" == Law "precedent linkage"

Same taxonomy, different content.

## Data Model (Minimum)
### Segment table
- `segment_uuid`
- `level` (word/sentence/paragraph/...)
- `parent_uuid`
- `content`
- `index_in_parent`

### Annotation table
- `annotation_uuid`
- `segment_uuid`
- `facet_entity`
- `facet_role`
- `facet_evidence`
- `facet_time`
- `facet_ops`
- `confidence`
- `note`

### Link table
- `link_uuid`
- `from_segment_uuid`
- `to_target_uuid`
- `link_type` (reference|evidence|definition|action|map)
- `weight`

## Excel Layer Upgrade
Keep current sheets, add these:
- `segments` (all levels)
- `segment_annotations` (facet-based)
- `segment_links` (cross-level links)

Retain `tokens_home` for word detail but do not make it the only anchor.

## UI Behavior Upgrade
When user clicks a token/segment:
1. Ask scope: `Word | Sentence | Paragraph | Verse | Chapter`
2. Ask action: `References | Actions | Notes`
3. Open the selected panel filtered to that scope

This matches your requested workflow exactly.

## Prompt-Ready Build Notes (for Claude Code)
- Implement paragraph-first reader with embedded verse anchors.
- Add multi-level segment IDs and annotation assignment UI.
- Add scope selector in popover.
- Add facet chips (Entity, Role, Evidence, Time, Ops).
- Keep left/right panels mutually exclusive.

## What Changed and Why
Changed from single-level token tagging to layered segment model.
Why stronger: preserves meaning at sentence/paragraph/chapter scope and makes the system portable beyond Bible use.

## Audit Footer
### 1) Where We Are Right
- Multi-level annotation is required for real research fidelity.
- Facet taxonomy makes Bible-first work reusable in physics/law.
- Paragraph-first display preserves reading quality while retaining structure.

### 2) Where We Might Be Wrong
- Too many facets can overwhelm early users; defaults may need simplification.
- Segment extraction quality will depend on ingest parser quality.
- Chapter/book-level annotations may need editorial governance rules.

### 3) What We Think
This is the durable architecture: Bible-first implementation, domain-general taxonomy, and layered scopes that map cleanly into your Evidence Engine and Forge roadmap.
