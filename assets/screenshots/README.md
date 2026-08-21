# Screenshots

All shots are captured with Playwright (2× retina) from the reference book
[open-connector-book](https://github.com/JJack27/open-connector-book) — 13
chapters on gateway architecture and OAuth, `en` + `zh` sibling folders. The
README references them by these filenames.

| File | What it shows | How it was captured |
|---|---|---|
| `hero.png` | Dashboard top: book title, subtitle, 3/13 progress bar, soft-gate note | index page, progress seeded in `localStorage` (ch 1–2 pass, ch 4 in progress) |
| `chapter-grid.png` | Chapter cards with mixed statuses: ✓ pass · • below 80% · ○ not taken | same seeded state, cropped to the grid |
| `knowledge-graph-progress.png` | Knowledge graph, progress view — concepts from passed chapters lit | default view after seeding |
| `knowledge-graph-full.png` | Knowledge graph, full map, PKCE node selected, side panel with section refs | toggled to "Full map", clicked the `pkce` node |
| `chapter-diagram.png` | Inline SVG diagram: request lifecycle through gateway layers | chapter 1, second `figure.diagram` |
| `interactive-demo.png` | Interactive CSRF demo mid-run: scenario radios + rejection output | chapter 6, ran both scenarios via `button[data-run]` |
| `test-feedback.png` | Wrong MCQ answer: red ✗ block, correct answer, rationale, "review this section" link | chapter 6 test, answered Q2 wrong, submitted |
| `test-result.png` | 56% "Below 80%" banner + retake button + self-checked short answer | same submission, cropped Q8 → retake button |

Tips for re-capturing:

- Serve the book (`python3 -m http.server`) — Playwright MCP blocks `file://`.
- Seed realistic progress first: `localStorage.setItem('book:<slug>:<lang>:ch:<n>', JSON.stringify({score, total, percent, pass, ts}))`.
- Use a browser context with `deviceScaleFactor: 2` at ~920 CSS px width; measure
  clip regions with `getBoundingClientRect() + window.scrollY` (page coords, not
  viewport coords) before `fullPage` clip screenshots.
