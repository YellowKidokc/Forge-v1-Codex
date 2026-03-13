# FORGE Selection-Annotation Spec
## The Core Loop

Date: 2026-03-10
Status: CANONICAL — do not build anything that contradicts this

---

## The Whole Idea in One Sentence

Select anything. Chat box opens. Say what it is. Done.

The system remembers. The system enforces. You never say it again.

---

## The Interaction Loop

```
1. SELECT   — any grain size: letter / word / sentence / block / paragraph
2. CHAT BOX — pops up inline, right where you are
3. DECLARE  — say what it is, what it means, what to do with it
4. CACHED   — AI stores it losslessly, enforces it going forward
```

That's the entire UX. No forms. No schema design sessions.
No dropdowns. No "pick a type from this list."
You teach the system by talking to it, exactly like you'd explain it to a person.

---

## What You Can Say (Examples)

```
"This is the canonical Grace equation"
→ Every G(t) in every document gets checked against this silently

"When I write Grace, highlight amber, circle shape"
→ Display rule created. Fires everywhere, retroactively.

"LOW1 = david.lowe@example.com"
→ Expansion macro. Type LOW1, get the full address.

"This paragraph is load-bearing. Flag if anything contradicts it."
→ Canonical anchor with contradiction watch enabled.

"Anytime I write entropy in a physics context, link to E7.1"
→ Contextual auto-link rule.

"This is a person. Name: David. Timeline: OT."
→ Semantic tag created. Visual decorator fires (circle, yellow).
```

---

## Three Stored Objects (All the System Needs)

### 1. Canonical Anchors
```
id:        auto-generated short UUID
text:       the selected text (exact or fuzzy)
label:      what you called it ("canonical Grace equation")
grain:      letter | word | sentence | block
scope:      local (this doc) | global (all docs)
locked:     true = frozen until explicit unlock
created:    timestamp
```

### 2. Display Rules
```
id:         auto-generated
trigger:    text match OR semantic tag OR domain
color:      hex value
shape:      box | circle | underline | highlight | none
opacity:    0.0 - 1.0
scope:      local | global
```

### 3. Expansion Macros
```
id:         auto-generated
shorthand:  e.g. LOW1
expansion:  full text
context:    always | specific domain | specific doc
```

---

## The Background AI (What It Actually Does)

Not a scheduler. Not a cron job. Always watching.

```
New content arrives
  → tokenize
  → match against canonical anchors (fuzzy OK, threshold configurable)
  → match against display rules → fire visual decorators
  → match against expansion macros → offer inline expansion
  → check for contradictions → silent if clean / flag if conflict
  → predict next token → surface as ghost text (accept with Tab)
```

Storage: lossless compressed annotation cache.
The AI doesn't store every word. It stores:
  - canonical anchors (what things ARE)
  - rules (what to DO when you see them)
  - derived data is re-computed on demand

This keeps the cache small even at astronomical document scale.
Bottleneck is human typing speed, not storage.

---

## Identity Over Time (The One Hard Problem)

If you rewrite the Grace equation slightly, is it still the same canonical thing?

Rule: **canonical = locked until you explicitly say otherwise.**

When a near-match is detected:
```
"This looks like your canonical Grace equation but differs here: [diff shown]
Update canonical? / Keep both? / Ignore?"
```

One question. You answer. Done. The system never asks again about that version.

---

## Grain Sizes (All Three Active Simultaneously)

```
Letter level:  G, Ψ, χ — symbol coloring, lexicon links, Greek/Hebrew tags
Word level:    "entropy", "grace", "logos" — semantic tags, domain links
Sentence level: full claims — truth node creation, contradiction watch
Block level:   equations, paragraphs — canonical anchor, load-bearing flag
```

You don't have to choose. All three layers are on.
The visual density is controlled by a single slider: annotation opacity.
Turn it to zero: clean writing surface.
Turn it up: full semantic layer visible.

---

## Why This Replaces Everything Else

| Old approach | New approach |
|---|---|
| Design schema upfront | Schema emerges from your annotations |
| Pick type from dropdown | Say what it is in plain language |
| Manual cross-referencing | Background AI watches automatically |
| Color coding system setup | Say "make this amber, circle" once |
| Separate abbreviation tool | Built into the macro layer |
| Separate auto-text tool | Built into prediction layer |
| Separate contradiction checker | Built into background AI |
| Separate semantic tagger | Built into the select → declare loop |

One interaction pattern. Everything derives from it.

---

## The Bible Use Case (Generalizes to All Knowledge Work)

```
Select: "In the beginning was the Word"
Say: "This is the Logos thesis statement. Domain: theology + physics.
      Canonical. Highlight blue. Link to E2.1."
Done.

Now: every document that touches Logos or "the Word"
     gets a blue highlight and a silent link to this anchor.
     AI watches for anything that contradicts the Logos = χ mapping.
```

Same loop works for:
- Equations (Theophysics)
- Sermons (theology)
- Legal briefs (law)
- Medical notes (clinical)
- Code comments (software)
- Historical timelines (history)

The container is domain-agnostic.
The classification is whatever you say it is.
The architecture is always the same.

---

## Build Order (When Ready)

```
1. Selection layer    — capture any grain size, pop inline chat
2. Anchor store       — flat key-value, fast lookup, fuzzy match
3. Display engine     — CSS rule generator from stored display rules
4. Macro engine       — expansion on keystroke match
5. Background watcher — diff new content against anchor store
6. Prediction layer   — ghost text from context + anchors
```

Do NOT build all six at once.
Ship 1 + 2 + 3. Everything else is additive.

---

## Status

This document IS the spec. Everything in FORGE should be consistent with this loop.
If a feature requires more than: SELECT → CHAT → DECLARE → DONE
it is overcomplicated and should be redesigned.
