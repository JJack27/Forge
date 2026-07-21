# Project Structure

The book is a **multi-file static web project**, not a single HTML file. Start from `assets/book-template/` and fill in the locale + content files per chapter per language. Do not build the project from scratch — the template already has the shell, CSS, locale loader, scoring, and dashboard wired.

## Why multi-file (and why it must be served over HTTP)

Each chapter and each language lives in its own JSON file, loaded at runtime. This keeps the project maintainable (one file per chapter, not a 50,000-line HTML monster) and makes i18n a first-class concern. The trade-off: the browser cannot `fetch()` local files under `file://`, so the project **must be served over HTTP**. The template ships `start.sh` which starts a static server and opens the browser; or the learner can run `python3 -m http.server` in the project directory. Stage 4 (deliver) tells the learner this clearly.

## Project layout

```
<book-project>/
├── index.html              # shell: nav (TOC + lang switcher), dashboard, #app mount point
├── start.sh                # launches a static server and opens the browser
├── css/
│   └── book.css            # all styles (includes .viz-container, .viz-error, responsive SVG)
├── js/
│   ├── vendor/
│   │   └── d3.min.js       # vendored D3 v7 (loaded before app scripts; no external requests)
│   ├── i18n.js             # locale loader + t() lookup + language switch
│   ├── scoring.js          # mcq/fill/short scoring (language-neutral)
│   ├── dashboard.js        # TOC + progress + per-language score persistence
│   ├── viz.js              # visualization runner (mountViz, runInteractiveCheck, helpers)
│   └── main.js             # bootstrap: load locale + meta + chapters, render, wire events,
│                           #   mount chapter viz[] + interactive questions (set BOOK_SLUG here!)
├── locales/
│   ├── en.json             # UI strings for English
│   └── <lang>.json         # one file per language, SAME key set
└── content/
    └── <lang>/
        ├── meta.json       # book title, subtitle, ordered chapter manifest
        ├── ch-01.json      # one chapter per file (may include a viz[] array)
        └── ch-XX.json
```

## What the skill fills in

You almost never touch `index.html`, `css/`, or `js/`. You write:

1. **`locales/<lang>.json`** — UI strings. The template ships `en.json` with the full UI key set; copy it per language and translate values. (See `i18n.md`.)
2. **`content/<lang>/meta.json`** — book title, subtitle, and the ordered chapter manifest (`id`, `chapter`, `title`, `file`).
3. **`content/<lang>/ch-XX.json`** — one file per chapter, per language.
4. **`js/main.js`** — set `BOOK_SLUG` to a unique kebab-case id for the book (used as the localStorage prefix).

## Content file schema (a chapter)

```json
{
  "title": "3. Ownership and Borrowing",
  "objectives": ["objective 1", "objective 2"],
  "bodyHtml": "<p>Pre-rendered HTML, injected as-is.</p><section id=\"sec-ownership-rules\"><h3>…</h3><p>…</p></section>",
  "pitfallsHtml": "<p>Optional. Pitfalls, contrasts, further reading.</p>",
  "viz": [
    { "type": "diagram", "slug": "er-ownership", "caption": "Optional.", "code": "/* D3 code; see visualizations.md */" }
  ],
  "test": {
    "passThreshold": 80,
    "questions": [ /* see below */ ]
  }
}
```

- `bodyHtml` and `pitfallsHtml` are **trusted pre-rendered HTML** injected as-is. You author them. Use `<section id="sec-<slug>">` for subsections — the `id` is the anchor that test review links jump to.
- Anchors are **language-neutral**: the same `sec-ownership-rules` id appears in `content/en/ch-03.json` and `content/zh/ch-03.json`. The prose differs; the id does not. (See `i18n.md`.)
- `viz[]` is optional. Each entry's `code` is raw D3 JavaScript run at render time; see `references/visualizations.md` for the full contract. To place a viz at a specific spot in the body, leave a `<div data-viz="<slug>"></div>` placeholder in `bodyHtml` — otherwise vizs append to the body in array order.

## Question schemas

Three types. Every question has `type`, `prompt` (plain) or `promptHtml` (HTML, used when the prompt contains code), `answer` (revealed after submit), `rationale`, and `review` (the subsection anchor).

### mcq (single-select by default)

```json
{
  "type": "mcq",
  "prompt": "Prompt text?",
  "options": [
    { "value": "a", "label": "A. Option A" },
    { "value": "b", "label": "B. Option B (correct)" }
  ],
  "correct": ["b"],
  "answer": "B. …",
  "rationale": "Why B; why the distractors are wrong.",
  "review": "sec-ownership-rules"
}
```

### mcq (multi-select)

Add `"multiSelect": true`. Correct = all-and-only the options in `correct`.

### fill (single blank)

```json
{
  "type": "fill",
  "prompt": "Rust's core memory-safety concept is ____.",
  "blanks": 1,
  "placeholders": ["answer"],
  "accepted": ["ownership", "borrowing"],
  "answer": "ownership (or borrowing).",
  "rationale": "Provide every equivalent phrasing; the scorer normalizes (trim, lowercase, collapse whitespace).",
  "review": "sec-ownership-rules"
}
```

### fill (multi-blank, order-tolerant)

```json
{
  "type": "fill",
  "prompt": "The two phases are ____ and ____.",
  "blanks": 2,
  "placeholders": ["first", "second"],
  "accepted": ["analysis", "synthesis"],
  "answer": "analysis and synthesis.",
  "rationale": "Multi-blank is order-tolerant: each value must be in `accepted`, no duplicates, all filled.",
  "review": "sec-phases"
}
```

### short (self-checked key points)

```json
{
  "type": "short",
  "prompt": "In your own words, why does this design fail under condition Z?",
  "keyPoints": [
    "identifies that the failure is caused by X",
    "names the underlying mechanism (the Y rule)",
    "proposes the standard fix (Z pattern)"
  ],
  "answer": "Reference answer: …",
  "rationale": "Score = (points you honestly self-check) / (total points).",
  "review": "sec-design-failure"
}
```

The key-point checkboxes are injected by `main.js` from `keyPoints` at submit time. The learner sees the honesty framing hint above the checklist (from `ui.self_check_hint` in the locale).

### interactive (D3 visualization scored by interaction)

```json
{
  "type": "interactive",
  "prompt": "Click the node that fails when service B is down.",
  "code": "/* D3 code rendering an interactive viz into the question's mount div */",
  "check": "/* returns {passed, earned} given the mount div as `this` */",
  "answer": "Revealed after submit.",
  "rationale": "…",
  "review": "sec-data-flow"
}
```

`code` renders the viz; `check` scores the learner's interaction at submit time. Both are raw JS run via `new Function` with `this` = the mount div, `d3` and `helpers` in scope. Full guidance and worked examples in `references/visualizations.md`.

## Runtime flow (already implemented)

1. `index.html` loads `css/book.css` and the four JS files in order.
2. `main.js` detects the initial language (`?lang=` → `localStorage` → browser preference → `en`), calls `BookI18n.init(lang)` which fetches `locales/<lang>.json`.
3. Fetches `content/<lang>/meta.json`, then each chapter file listed in the manifest.
4. Renders the dashboard header, chapter sections, TOC, dashboard grid, and the language switcher.
5. The learner switches language via the TOC `<select>`; `main.js` re-inits the locale and re-fetches content for the new language, then re-renders. No page reload.
6. On test submit: `main.js` attaches each question's `answer`/`rationale` from the chapter data, builds key-point checkboxes for short questions, scores via `BookScoring.scoreQuestion`, shows feedback with the review link, saves the score via `BookDashboard.saveScore` (namespaced by book slug **and** language), and re-renders the TOC/dashboard.

## Verifying the project before delivery

Before handing off:

1. **JSON validity:** every `locales/*.json` and `content/**/*.json` parses. (`python3 -m json.tool < file` or `node -e "JSON.parse(require('fs').readFileSync('file','utf8'))"`.)
2. **Key set parity:** every `locales/<lang>.json` has the same keys as `locales/en.json`. (Run a diff of `Object.keys()`.)
3. **Manifest consistency:** every chapter listed in `meta.json` has a corresponding `ch-XX.json` file in the same language folder, and `id`/`chapter`/`file` fields are consistent.
4. **Anchor parity:** every `review` value across all chapters points to a real `<section id="...">` in the same chapter's `bodyHtml`, and that section id exists in every language's copy of the chapter.
5. **Smoke test the project:** run `./start.sh` (or `python3 -m http.server`), open the URL, submit one test of each type, switch languages, confirm scoring + review links + persistence work.
6. **No external requests:** grep the rendered output for `https://` / `http://` — only allowed in `<a href>` further-reading links, never in resource loads.
