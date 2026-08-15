# Project Structure

The book is a **multi-file static HTML project**: one self-contained `.html` file per chapter, plus an `index.html` dashboard, all sharing a single `assets/` folder per language. No build step, no server, no `fetch()` — every chapter works opened directly via `file://`. Start from `assets/book-template/` (which ships `en/` with one example chapter) and fill in the real chapters.

## Why HTML-per-chapter (and why it works under `file://`)

Each chapter is fully self-contained: the `<head>` links to the shared stylesheet (`assets/style.css`), and the closing `<script src="assets/book.js" defer>` pulls in the scoring/nav/dashboard logic. There is no runtime loading of chapter content — what you see in the file IS the chapter. That means a learner can double-click any `.html` file and it works, with no HTTP server and no internet. Language switching is just a hyperlink to a sibling file in another folder (`<a class="lang-toggle" href="../zh/01-…html">`).

## Project layout

```
<book-project>/
├── <primary-lang>/                    ← one folder per language; "en" is typical primary
│   ├── index.html                     ← dashboard / TOC (the page learners open first)
│   ├── 01-…-slug.html                 ← one self-contained HTML per chapter
│   ├── 02-…-slug.html
│   └── …
│   └── assets/
│       ├── style.css                  ← light/dark theme via CSS vars (shared verbatim across languages)
│       └── book.js                    ← scoring + nav + theme toggle + dashboard + demos registry (shared verbatim)
└── <other-lang>/                      ← e.g. zh/, added in Stage 4.5
    ├── index.html
    ├── 01-…-slug.html
    └── assets/                        ← byte-identical copy of <primary-lang>/assets/
```

Per-language `assets/` folders are byte-identical copies. Don't per-language customize `book.js` or `style.css` — if you need a change, it applies to all languages.

## Chapter HTML anatomy

Every chapter mirrors the canonical reference at `assets/book-template/en/01-example-chapter.html`. The structure (in order):

```html
<!doctype html>
<html lang="en">                                 <!-- ← per-language -->
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chapter N — Title</title>
<script>(function(){try{var t=localStorage.getItem("pbf:theme");if(t!=="light"&&t!=="dark"){t=(window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();</script>
                                                  <!-- theme snippet: copy verbatim, do not translate -->
<link rel="stylesheet" href="assets/style.css">  <!-- single stylesheet -->
</head>
<body>

<div class="topbar">
  <a href="index.html" class="brand">◆ MY BOOK</a>
  <span class="crumb">Chapter N · Short title</span>
  <span class="spacer"></span>
  <nav class="chapter-nav"></nav>                <!-- filled by book.js: prev / Contents / next -->
  <a class="lang-toggle" href="../zh/01-…html">中文 →</a>
</div>

<main class="chapter" data-chapter-n="1">
<script>window.BOOK_CONFIG = { slug: "my-book", lang: "en", chapters: […] };</script>

  <div class="chapter-header">
    <div class="eyebrow">Chapter 1 · Foundations</div>
    <h1>Chapter title</h1>
    <p class="lede">One-paragraph orientation.</p>
  </div>

  <div class="box objectives">
    <div class="box-title">Learning objectives</div>
    <ul><li>…</li><li>…</li></ul>
  </div>

  <h2 id="sec-main-concept">1.1 The main concept</h2>
  <p>…</p>
  <!-- Inline SVG diagram: -->
  <figure class="diagram"><svg viewBox="0 0 820 400">…</svg><figcaption>…</figcaption></figure>
  <!-- Interactive demo: -->
  <div class="demo" data-demo="myDemo">
    <div class="demo-title">Try it — …</div>
    <p>…</p>
    <button data-run>Run</button>
    <div class="demo-output empty">Click to run.</div>
  </div>

  <h2 id="sec-recap">1.N Recap</h2>
  <ul><li>…</li></ul>

  <div class="box pitfalls">
    <div class="box-title">Common pitfalls</div>
    <ul><li>…</li></ul>
  </div>

  <form class="test" data-chapter="1">
    <h2>Chapter 1 Test</h2>
    <!-- one <div class="q"> per question; see schemas below -->
    <button type="submit" class="submit-test">Submit test</button>
    <div class="test-result"></div>
    <button type="button" class="retake-btn" hidden>Retake test</button>
  </form>

  <p style="margin-top:2rem;">Next: <a href="02-…html"><strong>Chapter 2 — …</strong></a>.</p>

</main>

<script src="assets/book.js" defer></script>
</body>
</html>
```

### Critical conventions

- **`<html lang="…">`** matches the language folder (`en`, `zh-CN`, `es`, etc.).
- **The `<head>` theme snippet** (see the anatomy above) applies the stored theme — or `prefers-color-scheme`, defaulting to dark — before first paint so the page never flashes the wrong theme. Copy it **verbatim** into every page of every language; do not translate or modify it.
- **`<main class="chapter" data-chapter-n="N">`** — the `data-chapter-n` attribute tells `book.js` which chapter this is (drives prev/next nav + the `localStorage` key).
- **Inline `<script>window.BOOK_CONFIG = …</script>`** — the same object on every page. `book.js` reads it (overriding its built-in defaults) to know the book's slug, lang, and ordered chapters list. At minimum set `slug` (kebab-case, unique per book), `lang` (matches the folder), and `chapters` (ordered list of `{n, slug}`).
- **Section ids (`id="sec-…"`)** are language-neutral anchors that test `data-review` values point to. Don't translate them — the same id appears in every language's copy of the chapter.
- **`data-*` attributes on test questions are JSON arrays wrapped in single quotes** (`data-correct='["b"]'`). Inside the JSON, use double quotes. Never put an unescaped `"` inside a JSON string value.

## Test question schemas

Three types. Every question is a `<div class="q" …>` inside `<form class="test">`.

### mcq (single-select)

```html
<div class="q" data-id="1-1" data-type="mcq" data-correct='["b"]'
     data-answer="B — the answer."
     data-rationale="Why B; why each distractor is wrong."
     data-review="sec-main-concept">
  <div class="prompt"><span class="qnum">Q1.</span> Question text?</div>
  <label class="opt"><input type="radio" name="q-1-1" value="a"> A. Option A</label>
  <label class="opt"><input type="radio" name="q-1-1" value="b"> B. Option B</label>
  <label class="opt"><input type="radio" name="q-1-1" value="c"> C. Option C</label>
  <div class="feedback"></div>
</div>
```

### mcq (multi-select)

Add `data-multiselect="true"`, use checkboxes, all-and-only correct for the point:

```html
<div class="q" data-id="1-2" data-type="mcq" data-multiselect="true" data-correct='["a","c"]' …>
  <div class="prompt"><span class="qnum">Q2.</span> Which are true? <em>Select all that apply.</em></div>
  <label class="opt"><input type="checkbox" name="q-1-2" value="a"> A. …</label>
  <label class="opt"><input type="checkbox" name="q-1-2" value="b"> B. …</label>
  <label class="opt"><input type="checkbox" name="q-1-2" value="c"> C. …</label>
  <div class="feedback"></div>
</div>
```

### fill (single- or multi-blank)

```html
<div class="q" data-id="1-3" data-type="fill" data-accepted='["answer1","answer2","answer 3"]'
     data-answer="answer1 (or answer2)."
     data-rationale="…"
     data-review="sec-…">
  <div class="prompt"><span class="qnum">Q3.</span> Fill the blank: the value is ____.</div>
  <input type="text" class="fill">
  <div class="feedback"></div>
</div>
```

For multi-blank, add multiple `<input type="text" class="fill">` elements. Scoring is order-tolerant: each filled value must be in `accepted`, no duplicates, all filled.

### short (self-checked key points)

```html
<div class="q" data-id="1-4" data-type="short"
     data-key-points='["point 1","point 2","point 3","point 4"]'
     data-answer="Reference answer: …"
     data-rationale="…"
     data-review="sec-…">
  <div class="prompt"><span class="qnum">Q4.</span> In your own words: …?</div>
  <textarea class="short" placeholder="Your answer…"></textarea>
  <div class="key-points">
    <div class="hint">Only check a point if you actually addressed it — under-checking hurts the book's calibration, over-checking only fools yourself.</div>
  </div>
  <div class="feedback"></div>
</div>
```

The key-point checkboxes are injected by `book.js` at submit time (or on first focus of the textarea) from `data-key-points`. Score = (checked) / (total).

## Index page (`index.html`) — the dashboard

The entry point learners open. Has the topbar (no `chapter-nav`), a `.toc-header`, a `.dashboard` (progress bar with `#overall-progress` / `#progress-pct` / `#progress-passed`), and an empty `<div class="chapter-grid"></div>` that `book.js` fills with one card per chapter. Two inline scripts before `book.js`:

```html
<script>
window.BOOK_CONFIG = {
  slug: "my-book",
  lang: "en",
  chapters: [
    { n: 1, slug: "01-…-slug" },
    { n: 2, slug: "02-…-slug" }
    // one entry per chapter
  ]
};
window.CHAPTER_DESCS = {
  1: { title: "Chapter 1 Title", desc: "One-line description for the dashboard card." },
  2: { title: "Chapter 2 Title", desc: "…" }
};
</script>
<script src="assets/book.js" defer></script>
```

`CHAPTER_DESCS` is dashboard-only metadata — it is NOT duplicated in the chapter files.

## The `demos` registry in `assets/book.js`

`book.js` ships with an empty `demos = {}` registry. Each book authors its own demos there. Pattern:

```js
var demos = {
  myDemo: function (root) {
    var out = root.querySelector(".demo-output");
    out.classList.remove("empty");
    out.textContent = "…result…";
  }
};
```

A chapter references it via `<div class="demo" data-demo="myDemo">…</div>`. The harness binds the handler to any `<button data-run>` inside the demo (click), plus range/text `<input>` events and radio `change` events for live demos. Keep demos small and self-contained: no `fetch()`, no reaching outside the demo's root element.

## Inline SVG diagrams

Pure inline SVG inside `<figure class="diagram"><svg viewBox="0 0 W H">…</svg><figcaption>…</figcaption></figure>`. No external images, no D3, no fetch. The book has **light and dark themes**, so diagrams must be theme-aware: take colors from the page's CSS variables via **style attributes** — SVG presentation attributes (`fill="#hex"`) cannot hold `var()`, but style attributes can:

```html
<rect … style="fill:var(--surface-2);stroke:var(--accent)" stroke-width="2"/>
<text … style="fill:var(--accent)">LABEL</text>          <!-- emphasis -->
<text … style="fill:var(--fg)">LABEL</text>              <!-- normal text -->
<text … style="fill:var(--fg-dim)">caption</text>        <!-- secondary text -->
<line  … style="stroke:var(--muted)"/>                   <!-- arrows, connectors -->
```

Available vars: `--surface`/`--surface-2` (panels), `--fg`/`--fg-dim`/`--muted` (text), `--accent`/`--accent-2` (emphasis), `--pass`/`--fail`/`--warn` (semantic). **Never hardcode hex colors in a diagram** — a dark panel or light text becomes invisible in the other theme. Always set `viewBox` so the SVG scales responsively; always include a `<figcaption>`.

## Runtime flow (already implemented in `assets/book.js`)

1. Each page's inline `<script>window.BOOK_CONFIG = …</script>` overrides the defaults compiled into `book.js`.
2. On `DOMContentLoaded` (or immediately if already loaded), `book.js` boots:
   - `initDemos()` — finds every `<div class="demo" data-demo="…">`, looks up the handler in `demos`, binds it.
   - `initThemeToggle()` — injects the ☀/☾ button into `.topbar` (before `.lang-toggle`). Clicking flips `<html data-theme>` and persists the choice under the single `localStorage` key `pbf:theme` (shared across chapters and languages; the initial theme itself is applied pre-paint by the `<head>` snippet, not here).
   - `buildTocPage()` — no-op unless `.chapter-grid` exists (only on `index.html`). Renders one card per chapter from `CFG.chapters` + `window.CHAPTER_DESCS`, with status pills from `localStorage`.
   - If `<main class="chapter" data-chapter-n="N">` is present, `buildChapterNav(N)` fills `.topbar nav.chapter-nav` with prev / Contents / next links.
3. On test submit: `book.js` scores each `<div class="q">` via its `data-*` attributes, shows feedback (verdict + answer + rationale + review link), saves the score to `localStorage` under `book:<slug>:<lang>:ch:<N>`, and re-renders the TOC/dashboard.
4. Language switching is just navigation: the `lang-toggle` link jumps to the parallel file in another folder. No re-render, no `fetch`.

## Verifying the project before delivery

Run this from the project root. It checks every chapter across every language folder:

```bash
for lang in */; do
  [ -d "$lang" ] || continue
  for f in "$lang"0*.html; do
    [ -f "$f" ] || continue
    # 1. Every data-review must resolve to an id="sec-…" in the same file
    for r in $(grep -oE 'data-review="sec-[a-z0-9-]+"' "$f" | sort -u); do
      rid=$(echo "$r" | sed 's/data-review=/id=/')
      grep -qF "$rid" "$f" || echo "DANGLING review in $f: $r"
    done
    # 2. Every data-correct / data-accepted / data-key-points is valid JSON
    for attr in data-correct data-accepted data-key-points; do
      grep -oE "$attr='[^']*'" "$f" | sed "s/$attr='//;s/'$//" | while read -r json; do
        echo "$json" | python3 -c "import json,sys; json.loads(sys.stdin.read())" 2>/dev/null \
          || echo "BAD JSON in $f: $attr='$json'"
      done
    done
  done
done
```

Plus the cross-language i18n invariant (every chapter has the same question count, same `data-correct`/`data-accepted` for code-symbol answers, same `data-review` anchors, same section ids across languages) — see `references/i18n.md`.

And a no-external-requests check:

```bash
grep -rn -E 'src="https?:|href="https?:' --include="*.html" --include="*.js" --include="*.css" . \
  | grep -v '<a href="https://'   # further-reading <a> links are fine; resource loads are not
```

The only allowed external tokens are inside `<a href>` further-reading links, never resource loads (`<img src>`, `<script src>`, `<link href>` to a URL).
