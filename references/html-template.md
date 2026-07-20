# HTML Template Conventions

The book is a single self-contained `.html` file. Start from `assets/book-template.html` and fill in chapters — do not build the HTML from scratch each time, the template already has the TOC, dashboard, CSS, and scoring JS wired.

## Non-negotiables

- **Single file.** All CSS in a `<style>`, all JS in a `<script>`, no external requests. The learner must be able to email it, drop it on a USB stick, double-click it open.
- **No backend.** All test scoring happens in the browser. `localStorage` (keyed by the book slug) persists scores and per-chapter completion across reloads.
- **Anchors everywhere.** Every chapter, section, and key paragraph has a stable `id`. Test "review" links use these to jump the learner to the exact spot to re-read.

## Structure (what the template gives you)

```
<!doctype html>
<html>
  <head> … inlined CSS … </head>
  <body>
    <nav id="toc">                  ← table of contents, auto-populated from chapters
      <a href="#ch-3">3. Ownership</a> <span class="status"></span>
      …
    </nav>
    <header id="dashboard">         ← progress overview
      <div class="progress-bar"></div>
      <div class="chapter-status-grid"></div>
    </header>
    <main>
      <section id="ch-1" class="chapter" data-title="…">
        <h2>…</h2>
        <ul class="objectives">…</ul>
        <div class="body">… chapter content, with <section id="sec-…"> subsections …</div>
        <div class="pitfalls">…</div>
        <form class="test" data-chapter="1" data-pass-threshold="80">
          <div class="q" data-id="1-1" data-type="mcq" data-correct='["b"]'>…</div>
          <div class="q" data-id="1-2" data-type="fill" data-accepted='["ownership","borrowing"]'>…</div>
          <div class="q" data-id="1-3" data-type="short" data-key-points='["…","…"]'>…</div>
          <button class="submit-test">Submit</button>
        </form>
      </section>
      … more chapters …
    </main>
    <script> … inlined scoring + dashboard + localStorage logic … </script>
  </body>
</html>
```

## How scoring works (already implemented in the template)

The script reads each question's `data-*` attributes and scores on submit:

- **`mcq`** — compares the learner's selected options against `data-correct` (JSON array). All-and-only match for the point.
- **`fill`** — normalizes the learner's input (trim, collapse whitespace, lowercase) and accepts if it matches any entry in `data-accepted` (already normalized at generation time).
- **`short`** — renders each item from `data-key-points` as a checkbox the learner self-checks. Score = checked / total.

Test score = mean of question scores. Result is stored in `localStorage` under `book:<slug>:ch:<n>` and reflected in the TOC and dashboard.

## 80% soft-gate behavior (already implemented)

- Test result banner shows the percentage and pass/fail at 80%.
- Wrong answers are highlighted in place, each with its `answer`, `rationale`, and a `review` link to the in-book section.
- TOC: green check for ≥80%, yellow dot for <80%, blank for not-yet-taken.
- Next chapter is **never** disabled by a failed test. The TOC link always works.

## What you fill in per chapter

For each chapter `<section>`, provide:

1. `id="ch-N"` and `data-title="…"`.
2. `<h2>` chapter title.
3. `<ul class="objectives">` — the refined learning objectives.
4. `<div class="body">` — the chapter content. Use `<section id="sec-<slug>">` for subsections; test "review" links point at these.
5. `<div class="pitfalls">` (optional) — common pitfalls / contrasts / further reading.
6. `<form class="test">` — the chapter's questions, each as a `<div class="q">` with the right `data-*` attributes (see test-design.md for the per-question schema).

## Conventions

- **Language:** match the learner's language. The template's UI strings (Submit, Score, review) ship in English by default — translate them in the `<script>` if the book is in another language.
- **Code blocks:** use `<pre><code class="language-X">` and ship a tiny inlined highlighter (or none — readability beats fancy highlighting). Never load Prism/Highlight.js from a CDN; that breaks the "self-contained" promise.
- **Diagrams:** inline SVG. No external images unless you embed them as data URIs.
- **Anchors:** kebab-case, stable. `ch-3`, `sec-borrow-checker-rules`, `q-3-2`. Test review links use these.
- **Book slug:** derived from the topic or repo name, kebab-case. Used as the `localStorage` key prefix so different books don't collide.

## Verifying the file before delivery

Before handing the file off:

1. Open it in a browser (or at least grep it for unmatched `<section>`/`</section>`, missing `data-correct`, broken anchors).
2. Sanity-check one test of each type end-to-end: submit a right answer, submit a wrong answer, verify scoring and review links.
3. Confirm there are no external requests — search the file for `http://`, `https://`, `src=`. The only allowed external tokens are inside code samples or further-reading links (`<a href>`), never resource loads.
