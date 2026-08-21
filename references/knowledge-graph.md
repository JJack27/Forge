# Knowledge Graph (optional index-page module)

An interactive concept map on the `index.html` dashboard: the book's core
concepts as nodes, their relations as edges, two toggleable views, and
click-through from any concept to the exact sections that teach it. Ships in
`assets/book-template/` (opt-in via the `.kg` section; delete the section and
the `graph.js` script tag to omit). Reference implementation:
[open-connector-book](https://github.com/JJack27/open-connector-book) (38
concepts / 53 relations / 89 section references across zh + en).

![Knowledge graph](../../assets/screenshots/knowledge-graph-full.png)

## When to add it

- **During Stage 3** (assembly) for books whose value is conceptual
  connectivity — multi-chapter mechanisms, deep-dive arcs, cross-cutting
  concerns. It shines when the same concept legitimately appears in 3+ chapters.
- **As a post-delivery enhancement** — learners who finished chapters ask
  "how does it all connect?"; the graph is the answer and reuses data you
  already wrote (section anchors + quiz records). See Stage 5 in SKILL.md.
- Skip it for short books (< 6 chapters) or purely linear narratives — a
  10-node graph adds noise, not insight.

## Behavior

- **Progress view** (default): a concept is *lit* when ANY chapter referencing
  it has a passing test (≥ 80%, same `book:<slug>:<lang>:ch:<n>` records as
  the dashboard); *dashed* when a referencing chapter was attempted but not
  passed; *dimmed* otherwise. The lowest-numbered unpassed chapter's concepts
  pulse. Edges light only between two lit nodes. Live-updates via the
  `storage` event (passing a quiz in another tab re-lights the graph).
- **Full map view**: everything lit, colored by concept domain. The toggle
  persists at `book:<slug>:graph-mode` (shared across languages, like the
  theme key).
- **Click a node**: side panel shows a one-line description + every reference,
  grouped by chapter with pass/taken status dots, each deep-linking to
  `<slug>.html#sec-…`.
- Hover focuses a node's neighborhood; nodes are draggable; pan/zoom in the
  Cytoscape renderer.

## Authoring pipeline (do it in this order)

**1. Extract the anchor inventory.** Every `h2`/`h3` id + heading text, per
chapter and per language (ids are language-neutral; titles are not):

```sh
cd <book>/<primary-lang>
for f in *.html; do grep -ho '<h2 id="sec-[a-z0-9-]*">.\{0,200\}' "$f"; done \
  | sed 's/<h2 id="/$/; s/">/ | /' | sed 's/<[^>]*>//g'
```

Headings containing `<code>` get truncated by a naive grep — re-extract those
with a wider match before writing refs. Verify anchor parity across language
editions (diff the id lists per chapter); if an id diverges, fix the chapter,
not the graph data.

**2. Curate the data** (the `DATA START/END` block in `assets/graph.js`):

- **25–40 nodes**, one per concept a learner should be able to place in the
  big picture. Not per-chapter summaries — concepts recur; that's the point.
- 4 **clusters** (concept domains) — edit `CLUSTERS` labels; keys `c1..c4`
  are pre-wired to the theme accents in `style.css`.
- Each node: `{id, c, label:{zh,en}, desc:{zh,en} (one honest sentence),
  refs:[{ch, sec, t:{zh,en}}…]}` — **2–6 refs**, spanning chapters when the
  concept does. `t` is the real heading text from step 1.
- **Edges ≈ 1.4× nodes**, hand-curated: each edge should read as "A is a
  prerequisite for / part of / enables B". No auto-collocation edges —
  term-frequency edges produce noise.
- The whole file is **byte-identical across language folders** (like
  `book.js`/`style.css`); strings are `{zh, en}` picked via
  `BOOK_CONFIG.lang`, so author both languages inline in the primary copy and
  sync.

**3. Validate every ref against the actual files** (a wrong anchor is a
broken deep link that no test will catch for you):

```sh
grep -oE '\{ ch: [0-9]+, sec: "[a-z0-9-]+"' <primary-lang>/assets/graph.js \
  | sed 's/{ ch: //; s/, sec: "/ /; s/"$//' | while read ch sec; do
      f=$(ls <primary-lang>/$(printf "%02d" "$ch")-*.html)
      grep -q "id=\"$sec\"" "$f" || echo "MISSING: ch$ch $sec"
    done
```

(Run it against EVERY language edition — zero output = all good.)

## The CDN gotcha (cost me one debug cycle — don't repeat it)

The Cytoscape renderer needs **four scripts in this exact order**:

```html
<script src="https://cdn.jsdelivr.net/npm/cytoscape@3.30.4/dist/cytoscape.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/layout-base@2.0.1/layout-base.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/cose-base@2.2.0/cose-base.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/cytoscape-fcose@2.2.0/cytoscape-fcose.min.js" defer></script>
```

`cose-base@2.x` silently depends on `layout-base` as a separate UMD global —
omit it and fcose fails to register with a cryptic
`Cannot read properties of undefined (reading 'FDLayoutConstants')`.
Deferred scripts execute in document order, so `defer` on all of them is safe.

**Offline fallback is mandatory.** The book's core promise is `file://` with
no internet. `graph.js` boots the built-in SVG force renderer when
`window.cytoscape` is undefined and shows a small "using the built-in
layout" badge. Verify this path by blocking the CDN (Playwright
`page.route('**cdn.jsdelivr.net**', r => r.abort())`) — the graph must still
render with correct states.

## Canvas-renderer specifics (Cytoscape)

- **Theme**: canvas doesn't inherit CSS variables. Read palette colors via
  `getComputedStyle(...).getPropertyValue('--accent')` at style-build time,
  and re-apply on theme flips with a `MutationObserver` on
  `<html data-theme>` (`attributeFilter: ["data-theme"]` — an ARRAY; passing
  a string throws and, if placed before boot, kills the whole module).
- **Container height**: the canvas needs an explicit height (`.kg-stage {
  height: 600px; }`); `height: auto` collapses it to zero.
- **Animations**: cytoscape styles have no keyframes — pulse frontier nodes
  by `setInterval`-toggling a class with `transition-duration` set.
- **Don't set `wheelSensitivity`** unless you enjoy console warnings.
- Keep the `.kg-*` DOM classes for the side panel/legend: they're plain DOM
  and work identically under both renderers. Expose the instance
  (`section._kgCy = cy`) — canvas has no DOM for tests to inspect.

## Verification matrix (Playwright)

For each language edition:

1. **Empty progress**: all nodes dimmed, frontier chapter's nodes pulsing,
   0 lit edges. **Partial** (inject `pass` for chapters 1..N, `taken` for
   N+1): lit/taken/dim split must match the dashboard counts, edges lit only
   between lit nodes. **All passed**: everything lit, no pulse.
2. **Click a multi-chapter node** → panel groups refs by chapter with status
   dots; every link target anchor exists (step 3 above already proved it).
3. **Toggle both modes** → persisted across reload and shared across
   languages.
4. **Theme flip** → canvas re-tints (observer path).
5. **CDN blocked** → fallback SVG renders all nodes + offline badge; console
   otherwise clean (zero errors AND warnings).
6. **`storage` event** → dispatch after changing a chapter record; states
   update without reload.

For README screenshots: capture from ONE consistent edition (English for an
English README), with *interacted* states — injected partial progress for the
progress view, a selected node for the panel shot.
