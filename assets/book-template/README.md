# book-template

The HTML-per-chapter template for the personal-book-forger skill. This is what
Stage 3 of the skill copies to start a new book.

## Layout

```
book-template/
└── en/                        ← one folder per language; "en" is the primary
    ├── index.html             ← dashboard / TOC (the page learners open first)
    ├── 01-example-chapter.html ← canonical chapter reference (copy + rename per chapter)
    └── assets/
        ├── style.css          ← light/dark theme via CSS vars (shared verbatim across languages)
        └── book.js            ← scoring + nav + theme toggle + dashboard + demos registry (shared verbatim)
```

## How to use it

1. **Copy the whole `book-template/` directory** to `./books/<your-book-slug>/`.
2. **Rename `en/`** to your primary language code if it isn't English (`zh/`, `es/`, etc.). Or keep `en/` and add sibling folders for other languages.
3. **Edit `en/index.html`**: set `window.BOOK_CONFIG.slug` to your kebab-case book id; replace the placeholder `chapters: [...]` list with your real chapters; fill `window.CHAPTER_DESCS` with each chapter's title + one-line description.
4. **Copy `en/01-example-chapter.html`** once per chapter, rename to `0N-your-slug.html`, replace the content. Keep the structure identical (topbar, inline `BOOK_CONFIG`, chapter-header, objectives, `sec-*` subsections, recap, pitfalls, test form).
5. **On every chapter page**, paste the same `window.BOOK_CONFIG` object inline (the one from `index.html`) so the shared `book.js` knows the book's slug/lang/chapter-list.
6. **Add demos** to the `demos = {}` registry in `assets/book.js` as needed (the template ships empty). Each book authors its own demos; the harness binds them automatically.
7. **Translate** by copying `en/` → `zh/` (or whatever), translating the prose, flipping `<html lang>` and `BOOK_CONFIG.lang`, and flipping the `lang-toggle` link to point back at `en/`. See `references/i18n.md`.

## Open the book

Just open `en/index.html` directly in a browser — no server, no build step, no internet. The book works under `file://` because every chapter is fully self-contained HTML.

## What NOT to change

- `assets/style.css` and `assets/book.js` are shared verbatim across all language folders. Don't per-language customize them; if you need a style or behavior change, it applies to all languages.
- The `<head>` theme `<script>` snippet in each page — it applies the light/dark theme before first paint. Copy it verbatim into every page; do not translate or modify it. The ☀/☾ toggle button itself is injected by `book.js` — nothing to add per page.
- The test-scoring `data-*` attributes (`data-correct`, `data-accepted`, `data-key-points`, `data-answer`, `data-rationale`, `data-review`) are read by `book.js` — keep their format exactly as shown in the example chapter.
- Section ids (`sec-…`) are language-neutral anchors. Don't translate them.
- Inline SVG diagrams take colors from CSS variables (`style="fill:var(--…)"`), never hardcoded hex — the book must render correctly in both the light and the dark theme.
