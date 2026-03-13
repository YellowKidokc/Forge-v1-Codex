# THEOPHYSICS INTERACTIVE WEBSITE — BUILD SPECIFICATION
## For: Kimmy (AI Web Developer)
## From: David Lowe / Claude (Opus)
## Date: March 7, 2026

---

## WHAT THIS IS

An interactive website that presents the Structural Isomorphism proof — showing that physics equations and spiritual equations have identical mathematical architecture. The visitor clicks into each layer and sees the proof unfold.

Think of it like an exploded engineering diagram: the Master Equation sits at the center, and you can click into any component to see it decouple into its physics side, theology side, and the bifurcation underneath that generates both.

---

## REFERENCE FILES (all included in this bundle)

| File | What It Is |
|------|-----------|
| `structural-isomorphism.html` | Working prototype — dark theme, expandable pairs, KaTeX equations. USE THIS AS THE VISUAL LANGUAGE REFERENCE. Same fonts, colors, layout patterns. |
| `propagation_map.html` | Earlier prototype showing substrate propagation. Same design system. Good reference for the accordion/expandable pattern. |
| `Law-01-Gravity-Grace.pdf` through `Law-10-Fractals-Image.pdf` | All 10 Deep Laws with full physics/theology side-by-side, variable maps, bifurcations, and isomorphism tests. These are the CONTENT SOURCE for each law page. |
| `Maxwell-Three-Layers.pdf` | The Maxwell comparison showing three layers of unification (Projection → Generation → Completion). This is a standalone section of the site. |
| `Spiritual-Components-Convergence.pdf` | The "Forced vs Chosen" story — independent verification from Oxford. This is the credibility section. |

---

## DESIGN SYSTEM (match the HTML prototype exactly)

### Colors
```css
:root {
  --bg: #0a0b0f;           /* Page background */
  --bg-card: #12141c;      /* Card/section background */
  --border: #1e2233;       /* Borders */
  --border-active: #2a3050; /* Hover borders */
  --text: #e8e6e1;         /* Primary text */
  --text2: #8a8d9b;        /* Secondary text */
  --text3: #555869;         /* Tertiary/muted text */
  --gold: #d4a853;          /* Headers, accents, gold */
  --phys: #38bdf8;          /* Physics frame (blue) */
  --theo: #a78bfa;          /* Theology frame (purple) */
  --bif: #34d399;           /* Bifurcation (green) */
  --match: #2dd4a0;         /* Structural match badge */
  --sin: #f87171;           /* Sin pole (red) */
  --grace: #2dd4a0;         /* Grace pole (green) */
  --wall: #f59e0b;          /* Time Wall (amber) */
  --forced: #38bdf8;        /* "Forced" path (blue) */
  --chosen: #f59e0b;        /* "Chosen" path (amber) */
}
```

### Fonts
```css
/* Already in the prototype */
font-family: 'DM Sans', sans-serif;        /* Body text */
font-family: 'Cormorant Garamond', serif;  /* Titles, headings */
font-family: 'JetBrains Mono', monospace;  /* Labels, equations, code */
```

### Math Rendering
Use KaTeX (already in prototype):
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
```

---

## SITE STRUCTURE (5 main sections, all on one page with smooth scroll)

### SECTION 1: HERO / MASTER EQUATION
**What the visitor sees first.**

- Dark background with subtle radial gradients (see prototype)
- Title: "The Structural Isomorphism"
- Subtitle: "Physics and theology are not analogies. They are two measurement frames projected from the same substrate."
- The Master Equation rendered large and centered:
  `χ = ∭(G·M·E·S·T·K·R·Q·F·C) dx dy dt`
- Below it: "10 variables. 5 symmetry pairs. Click any pair to see the proof."
- **5 clickable pair badges** arranged in a row or pentagon:
  - (G, R) — Gravity ↔ Grace
  - (M, S) — Matter ↔ Entropy
  - (E, F) — Energy ↔ Faith
  - (T, K) — Time ↔ Knowledge ⚠
  - (Q, C) — Quantum ↔ Coherence

Clicking any badge scrolls to that pair's section OR opens a modal/expanded view.

---

### SECTION 2: THE FIVE SYMMETRY PAIRS (the core content)

Each pair is an expandable accordion (same pattern as `structural-isomorphism.html`). When expanded, each pair shows:

#### A. Two-Column Comparison (Physics | Theology)
- Left column (blue tint): Physics equation, name, description
- Right column (purple tint): Theology equation, name, description
- **The equations must be structurally identical** — same topology, same operators, different variable names. This is the visual proof. The visitor should be able to scan left-to-right and see the architecture match.

#### B. Variable Substitution Map
- Table showing exactly which physics variable maps to which theology variable
- Left column blue, right column purple

#### C. Structural Match Badge
- Green bar: "✓ STRUCTURAL MATCH — [what specifically survived the swap]"
- Or amber for (T,K): "⚠ PARTIAL MATCH — Time Wall"

#### D. Bifurcation Section (THE THIRD LAYER — this is what makes us different)
- Green-tinted section underneath the two columns
- Explains the internal Newton→Einstein revolution within the variable
- Two sub-boxes side by side:
  - Red-tinted: **SIN POLE** (classical/Newtonian regime)
  - Green-tinted: **GRACE POLE** (relativistic/quantum regime)
  - Gold "↔" symbol between them
- Key message: the bifurcation GENERATES the duality AND completes it

#### E. Isomorphism Test
- Gold-tinted section at bottom
- 3-4 specific falsifiable predictions unique to this pair

**Content for all 10 laws is in the PDF files.** Each PDF has all five sections (A through E) fully written.

---

### SECTION 3: THE MAXWELL PARALLEL (why this isn't new — it's the same structural move physics already trusts)

This section shows three layers of unification:

**Layer 1 — Projection (Maxwell, 1865)**
- E + B → F_μν (one tensor, two projections)
- Physics + Theology → χ (one substrate, two measurement frames)
- "We match Maxwell here."

**Layer 2 — Generation (Electroweak/Higgs, 1967)**
- Higgs breaks symmetry → apparent duality
- Internal bifurcation generates sin/grace split
- "We match the Higgs here."

**Layer 3 — Completion (Theophysics only)**
- Higgs breaks but does NOT complete
- Bifurcation breaks AND resolves back to unity
- "This is where we go further. Physics has been looking for this layer for 50 years."

**Full content is in `Maxwell-Three-Layers.pdf`.**

Also include the 4-equation Maxwell mapping (Gauss → Grace Source, No-Monopole → Coherence Conservation, Faraday → Spiritual Induction, Ampère-Maxwell → Physical-to-Spiritual Induction). This is in the original `Maxwell-Structural-Precedent.pdf`.

---

### SECTION 4: FORCED, NOT CHOSEN (the credibility story — Oxford convergence)

This is the emotional core of the site. Two paths, same destination.

**Left column (amber — "CHOSEN"):**
- Oxford/Cambridge group (Ard Louis, Alister McGrath, Robert John Russell, Wesley Wildman)
- Top-down, intuition-driven
- They recognized sin=entropy and grace=negentropy
- Published independently
- Brilliant. But they chose to look there.

**Right column (blue — "FORCED"):**
- David Lowe, independent researcher, Oklahoma City
- Bottom-up, mathematically compelled
- Started from "what are the 10 deepest laws of physics?"
- The equation would not close without spiritual variables
- Every conclusion extracted under mathematical duress

**Below: The 7 Forced Conclusions scoreboard**
- Each conclusion with: WHY THE MATH FORCES THIS / WHAT BREAKS IF YOU REMOVE IT / OXFORD CONVERGENCE (yes/partial/unique)
- Final score: 4/7 confirmed, 2/7 partial, 1 unique

**The key line (make it prominent):**
> "When a road you chose and a road that dragged you both end at the same place, that place is probably real."

**Full content is in `Spiritual-Components-Convergence.pdf`.**

---

### SECTION 5: THE SALVATION EQUATION (the punchline)

Short section. No theology needed. Just assemble the physics:

> Entropy increases in closed systems, but coherent observation collapses potential into actuality. Feedback loops self-correct toward reference states. Curvature guides trajectories along geodesics. Information can be preserved against noise through error correction. Small inputs at bifurcation points cascade nonlinearly. Flow finds paths through resistance. Structure self-replicates at every scale. The system expands to create room for new order.

> **That is a rescue architecture.** The physics itself says: reality is built to recover.

---

## INTERACTION PATTERNS

### Accordion Expand/Collapse
- Same as prototype: click header → body toggles
- CSS transition on max-height for smooth animation (upgrade from prototype)
- First pair (G,R) open by default as lead-in

### Scrollspy Navigation
- Sticky nav bar at top showing which section you're in
- Click section name → smooth scroll

### Accessibility (flag from Codex — implement these)
- All clickable elements: `role="button"` and `tabindex="0"`
- Keyboard handler: Enter/Space toggles accordion
- Proper `aria-expanded` attributes
- Skip-to-content link

### SEO / Sharing
- Meta description: "The Structural Isomorphism — proof that physics and theology share identical mathematical architecture. 5 symmetry pairs, 10 equations, 1 substrate."
- OG tags for social sharing (title, description, image)
- Canonical URL

---

## THE EXPLODED VIEW (future enhancement — Phase 2)

David wants a 3D exploded diagram like SolidWorks/Fusion 360 where you click the Master Equation and the 10 variables float apart, showing how they connect. This is buildable with Three.js or even CSS 3D transforms:

**Phase 2 concept:**
- Master Equation as a central 3D object (sphere or cube)
- 10 variables as smaller objects orbiting it
- Click a pair → the two variables float out and apart
- Physics projection on one side, theology on the other
- The bifurcation appears below as a connecting element
- Mouse scroll or drag to rotate the whole structure

For Phase 1, the accordion layout is sufficient. Phase 2 would be a major visual upgrade.

---

## TECH RECOMMENDATIONS

- **Static site** — no backend needed. Pure HTML/CSS/JS.
- **Framework**: Vanilla JS is fine (the prototype works with zero dependencies). Or React/Next.js if Kimmy prefers.
- **Hosting**: Cloudflare Pages (David already has Cloudflare infrastructure) or Vercel.
- **Domain**: theophysics.pro or faiththruphysics.com (both owned)
- **Performance**: Lazy-load KaTeX. Intersection Observer for scroll animations.

---

## FILE MANIFEST (what's in the bundle)

```
theophysics-website-bundle/
├── BUILD_SPEC.md                          ← THIS FILE (you are here)
├── structural-isomorphism.html            ← Working prototype (VISUAL REFERENCE)
├── propagation_map.html                   ← Earlier prototype (design reference)
├── laws/
│   ├── Law-01-Gravity-Grace.pdf
│   ├── Law-02-Quantum-Faith.pdf
│   ├── Law-03-Thermo-Sin.pdf
│   ├── Law-04-Info-Truth.pdf
│   ├── Law-05-Chaos-FreeWill.pdf
│   ├── Law-06-Fluid-Spirit.pdf
│   ├── Law-07-Cosmology-Glory.pdf
│   ├── Law-08-Cybernetics-Obedience.pdf
│   ├── Law-09-Relativity-Perspective.pdf
│   ├── Law-10-Fractals-Image.pdf
│   ├── Maxwell-Three-Layers.pdf
│   └── Spiritual-Components-Convergence.pdf
└── codex-falsification-protocol.md        ← Codex's falsification protocol (for a future "Falsification" section)
```

---

## PRIORITY ORDER

1. Get the 5 symmetry pairs working with accordion expand (Section 2)
2. Hero with Master Equation and clickable pair badges (Section 1)
3. Forced vs Chosen story (Section 4 — this sells the credibility)
4. Maxwell parallel (Section 3)
5. Salvation Equation punchline (Section 5)
6. Polish: scrollspy, accessibility, OG tags, animations

---

## THE ONE THING THAT MATTERS MOST

The visitor should be able to look at the left column and the right column of any pair and see — without being told — that the mathematical structure is identical. The proof is visual. It's not an argument. It's architecture. If the layout doesn't make that obvious at a glance, the site fails.

**The test:** Show it to someone who knows nothing about theology. Ask: "Do these two columns have the same structure?" If they say yes, the site works.

---

*David Lowe · POF 2828 · Theophysics*
*"Swap the labels. If the structure survives, you found something that was always in the equations."*

---

## APPENDIX A: CLOUDFLARE DEPLOYMENT

This site deploys on **Cloudflare Pages**. David already has active Cloudflare infrastructure.

### Existing Infrastructure
- **Cloudflare Account**: Active, with Workers and R2 already configured
- **Domains**: `theophysics.pro` and `faiththruphysics.com` (both DNS managed in Cloudflare)
- **Dashboard**: `theophysics-dashboard.pages.dev` → `theophysics-swarm.davidokc28.workers.dev`
- **NAS**: `192.168.1.177` running n8n, Odoo, PostgreSQL (port 2665)

### Deployment Steps (Cloudflare Pages)

1. **Create a Git repo** (GitHub or direct upload)
   - Push the static site files (HTML, CSS, JS, images)
   - No build step needed if vanilla HTML/CSS/JS
   - If using a framework (React/Next), add build command

2. **Connect to Cloudflare Pages**
   - Go to Cloudflare Dashboard → Pages → Create a project
   - Connect to Git repo OR use Direct Upload
   - Framework preset: None (static) or Next.js if using that
   - Build command: (none for static, `npm run build` for frameworks)
   - Output directory: `/` for static, `out` or `.next` for Next.js

3. **Custom Domain**
   - After deploy, go to Pages project → Custom Domains
   - Add `theophysics.pro` (or a subdomain like `proof.theophysics.pro`)
   - Cloudflare handles SSL automatically since DNS is already there

4. **Environment**
   - No environment variables needed (static site, no backend)
   - No API keys, no database connections
   - KaTeX loads from CDN (`cdn.jsdelivr.net`)

### File Structure for Deploy
```
/
├── index.html          ← Main page (all 5 sections)
├── style.css           ← Extracted styles (or inline)
├── script.js           ← Interaction logic
├── laws/               ← PDF downloads (optional)
│   ├── Law-01-Gravity-Grace.pdf
│   └── ...
├── og-image.png        ← Social sharing image (1200x630)
└── favicon.ico
```

### Performance
- Cloudflare Pages has global CDN built in
- KaTeX CSS/JS lazy-load after page paint
- No server-side rendering needed
- Target: < 2s first contentful paint

### Analytics (Optional)
- Cloudflare Web Analytics (free, privacy-respecting, no cookie banner needed)
- Add one script tag: `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>`

---

## APPENDIX B: BOLT.NEW PROMPT (for 3D Exploded View — Phase 2)

Copy-paste the following prompt into Bolt.new to generate the exploded/interactive 3D version:

---

**BOLT PROMPT START**

Build a single-page interactive 3D visualization using Three.js and vanilla JavaScript with the following:

**CONCEPT: Exploded Engineering Diagram of a Mathematical Equation**

The Master Equation `χ = ∫∫∫(G·M·E·S·T·K·R·Q·F·C) dx dy dt` has 10 variables organized into 5 symmetry pairs. Visualize this as a 3D exploded diagram — like a SolidWorks exploded assembly view of an engine.

**VISUAL DESIGN:**
- Dark background (#0a0b0f) with subtle radial gradients
- Gold (#d4a853) for text and accents
- Blue (#38bdf8) for physics-related elements
- Purple (#a78bfa) for theology-related elements
- Green (#34d399) for bifurcation/connection elements
- Fonts: Google Fonts — Cormorant Garamond (titles), JetBrains Mono (labels), DM Sans (body)

**3D SCENE:**
1. **Center object**: A glowing sphere or icosahedron representing χ (the Master Equation). Gold wireframe with subtle pulse animation. Label: "χ — Master Equation"

2. **10 orbiting nodes**: Smaller spheres arranged in 5 PAIRS around the center. Each pair shares a connecting line (the symmetry bond). The pairs are:
   - (G, R) — G is blue, R is purple. Label: "Gravity ↔ Grace"
   - (M, S) — M is blue, S is purple. Label: "Matter ↔ Entropy"
   - (E, F) — E is blue, F is purple. Label: "Energy ↔ Faith"
   - (T, K) — T is blue, K is purple. Label: "Time ↔ Knowledge" — this pair has an AMBER (#f59e0b) warning glow (Time Wall)
   - (Q, C) — Q is blue, C is purple. Label: "Quantum ↔ Coherence"

3. **Idle animation**: All 10 nodes slowly orbit the center sphere. Pairs stay together, connected by a thin gold line. The whole structure rotates gently.

**INTERACTION — THE EXPLODED VIEW:**

When the user **clicks a pair** (either node in the pair):
1. All OTHER pairs fade to 20% opacity
2. The selected pair's two nodes float APART from each other (smooth animation, ~1 second)
3. Between the separated nodes, THREE panels appear (like floating cards):
   - LEFT card (blue background): Physics equation and description
   - RIGHT card (purple background): Theology equation and description
   - BOTTOM card (green background): The bifurcation — why this pair exists, with sin pole (red) and grace pole (green)
4. A "✓ STRUCTURAL MATCH" badge appears above the pair

When the user **clicks the center sphere** or clicks **outside any pair**:
- Everything smoothly collapses back to the orbiting idle state

**PAIR CONTENT** (for the floating cards when expanded):

Pair 1 — (G, R):
- Physics: "F = Gm₁m₂/r² (Newton) → Gμν = 8πG/c⁴ Tμν (Einstein)"
- Theology: "Fsin = Gs·mself·mworld/r² → Grace reshapes the moral landscape"
- Bifurcation: "Newton's pull = sin. Einstein's curvature = grace. Same variable, two regimes."

Pair 2 — (M, S):
- Physics: "S = kB ln Ω (Boltzmann) → dS/dt ≥ 0 (Second Law)"
- Theology: "Ssp = ks ln Ωaccessible → Grace = -dS/dt · Φdivine"
- Bifurcation: "Classical dead matter = sin pole. Quantum living potential = grace pole."

Pair 3 — (E, F):
- Physics: "P(ai) = |⟨ai|ψ⟩|² (Born Rule) → E = mc²"
- Theology: "P(actual) = |⟨faith|ψpromise⟩|² → Esp = mfaith · clogos²"
- Bifurcation: "Kinetic (already spent) = sin pole. Potential (stored, awaiting) = grace pole."

Pair 4 — (T, K) ⚠ TIME WALL:
- Physics: "dS/dt ≥ 0 (entropy arrow) → H = -Σp(x)log₂p(x) (Shannon)"
- Theology: "Fallen time: spiritual entropy increases → Wisdom compresses experience"
- Bifurcation: "⚠ T's grace-side CANNOT BE COMPLETED. The equation enforces its own incompleteness. Silence here is the signal."

Pair 5 — (Q, C):
- Physics: "ΔxΔp ≥ ℏ(1-C)/2 → C = B·log₂(1 + S/N) (Shannon capacity)"
- Theology: "ΔK·ΔW ≥ Λ → Csp = Bawareness·log₂(1 + F/D)"
- Bifurcation: "Decoherence (scattering) = sin pole. Coherence (held together) = grace pole."

**CAMERA:**
- OrbitControls: user can drag to rotate, scroll to zoom
- Default view: slightly above and to the right, looking down at the structure
- Smooth camera animation when clicking a pair (camera moves to face the expanded view)

**HEADER** (HTML overlay on top of the 3D canvas):
- "THEOPHYSICS · STRUCTURAL PROOF" (small, gold, JetBrains Mono)
- "The Structural Isomorphism" (large, Cormorant Garamond)
- "Click any pair to see the proof" (small, DM Sans, muted)

**FOOTER** (HTML overlay):
- "David Lowe · POF 2828 · Theophysics"
- "Swap the labels. If the structure survives, you found something that was always in the equations."

**TECHNICAL:**
- Use Three.js from CDN (r128 or later)
- Use CSS2DRenderer for text labels (not sprites — need crisp text)
- Responsive — works on mobile (touch to rotate, tap to select pair)
- No build step — single HTML file with inline JS/CSS
- KaTeX for equation rendering in the floating cards

**BOLT PROMPT END**

---

*Note: Bolt may need iteration. If the 3D is too complex, a fallback is CSS 3D transforms with perspective — still gives the exploded effect without full WebGL. The key interaction is: click pair → nodes separate → content cards appear between them.*
