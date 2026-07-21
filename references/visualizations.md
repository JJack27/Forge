# Visualizations (D3 + SVG)

The book supports interactive D3/SVG visualizations embedded in chapter bodies and inside test questions. There are four kinds:

- **Diagrams** — reference figures: ER sketches (DB schema), request-flow / architecture maps, layering diagrams.
- **Simulations / steppers** — explorable: step through a request lifecycle, toggle a state, scrub an algorithm.
- **Charts** — data-driven: bar / line / scatter, for when a concept is best shown with data.
- **Interactive test questions** — a D3 viz embedded inside a test question that the learner interacts with to answer.

D3 is **vendored** at `js/vendor/d3.min.js` (loaded by `index.html` before the app scripts), so the "no external requests" rule still holds — the book works offline. The version ships at v7.9.0; bump it deliberately if you need a newer one.

## How visualizations are stored

Every visualization's **code is a raw JavaScript string** living in the chapter JSON. At render time, `js/viz.js` compiles and runs it via `new Function(code).call(container, d3, helpers)`. The code is **trusted by construction** — the only author is the skill (you, the LLM). Errors are isolated: a throwing viz shows a styled error placeholder, never breaks the rest of the book.

### Chapter-body visualizations: the `viz[]` array

Add a top-level `viz` array to any chapter JSON. Each entry:

```json
{
  "type": "diagram",
  "slug": "er-diagram",
  "caption": "Optional caption beneath the viz. A plain string, or a locale key.",
  "code": "/* raw D3 code; this = container; d3 + helpers are in scope */"
}
```

`type` is informational (`diagram` | `simulation` | `chart`) — it does not change how the code runs, but it documents intent and may drive future styling. `slug` is a kebab-case id; it becomes the container id `viz-<slug>`.

**Placement.** By default, vizs append to the chapter body in array order. For precise placement, drop a placeholder in `bodyHtml` — a `<div data-viz="er-diagram"></div>` will be replaced by the live viz container. Use placeholders when the viz should sit between specific paragraphs.

### Interactive test questions: the `interactive` question type

A new question type joins `mcq`/`fill`/`short`:

```json
{
  "type": "interactive",
  "prompt": "Click the node that fails when service B is down.",
  "code": "/* D3 code rendering an interactive viz into `this` (the question's mount div) */",
  "check": "/* returns {passed, earned} given the mount div as `this` */",
  "answer": "Revealed after submit, like other question types.",
  "rationale": "...",
  "review": "sec-data-flow"
}
```

`main.js` renders the prompt + a `.interactive-mount` div, runs `code` to build the interaction, and at submit time runs `check` (also via `new Function`) against the mount to score it. The `earned` value feeds the same scoring path as the other types. If `check` throws, the question scores 0 rather than breaking the test.

## The `helpers` API

Every viz's `code` and every interactive `check` receives two in-scope values:

- **`this`** — the container element (a `<div>`). For chapter vizs, it's `viz-<slug>`; for interactive questions, it's the question's `.interactive-mount` div.
- **`d3`** — the D3 library (v7).
- **`helpers`** — a small object:
  - `helpers.t(key, fallback?)` — i18n lookup. Use it for any visible label so the same viz localizes across languages without code changes.
  - `helpers.lang` — current language code (e.g. `"en"`, `"zh"`).
  - `helpers.svg(tagName, attrs?)` — namespace-safe SVG element creator (saves the `createElementNS` boilerplate). Returns the element.
  - `helpers.clear(container?)` — empties the container (defaults to `this`'s container). Useful for clean re-mounts on language switch; the runner already clears before mounting, so you rarely need this.

Typical opening line of a viz:

```js
var svg = d3.select(this).append("svg").attr("viewBox", "0 0 640 200");
```

`d3.select(this)` selects the container; everything you append lives inside it.

## Authoring conventions

1. **Always use `viewBox`, never fixed pixel `width`/`height`.** A `viewBox` makes the SVG scale to its container and stay responsive. The CSS already sets `svg { width: 100%; height: auto; }`.
2. **Localize labels via `helpers.t()`.** Hard-coded English strings mean the viz won't translate when the book switches languages. For dynamic labels (entity names, etc.), keep them in the code only if they're proper nouns or API names — otherwise pass them through `helpers.t()`.
3. **Stay inside `this`.** Don't reach out to `document` or other parts of the page. One viz per container, isolated. This keeps language-switch re-mounts clean and prevents vizs from clobbering each other.
4. **No `fetch()` / external requests.** All data the viz needs lives in the code itself. This preserves the offline / no-external-requests guarantee.
5. **Throwing is fine.** `viz.js` catches errors and shows a styled error placeholder with the message. Don't write defensive try/catch — let it throw if something's wrong; the error UI will surface it.
6. **Prefer D3 idioms.** Use `d3.scaleBand`/`scaleLinear`, `d3.axisBottom`/`axisLeft`, data joins (`.data().enter()`). The CSS ships generic classes you can lean on: `.node`, `.node-fail`, `.edge`, `.label`, `.axis`.
7. **Keep it small.** A viz should illustrate one idea. If it's growing past ~60 lines, it's probably two vizs.

## Interactive question `check` patterns

The `check` code runs with `this` = the mount div, and must return `{ passed: bool, earned: number }` (earned is 0 or 1, or a fraction in [0,1] for partial credit). Common patterns:

- **Click selection:** the render code stores the learner's pick on the node's bound datum (`d.selected = true` in the click handler), and `check` reads it back via D3's `__data__`:

  ```js
  // check:
  var nodes = Array.prototype.slice.call(this.querySelectorAll("g.node"));
  var data = nodes.map(function(g){ return g.__data__; });
  var selected = data.filter(function(d){ return d.selected; });
  if (selected.length !== 1) return { passed: false, earned: 0 };
  var ok = selected[0].fails === true;
  return { passed: ok, earned: ok ? 1 : 0 };
  ```

- **Drag-to-reorder:** render code records the final order (e.g. as a `data-order` attribute on each child); `check` reads the order and compares.

- **Numeric input inside the viz:** render code appends an `<input>`; `check` reads its value.

See the worked `interactive` question in `assets/book-template/content/en/ch-01.json` for a complete, runnable example of the click-selection pattern.

## Error handling

- A viz whose `code` fails to parse → `viz.js` shows "Failed to parse viz code: <message>".
- A viz that throws at run time → "Viz threw while rendering: <message>".
- An interactive question's `check` that throws → the question scores 0, and a warning is logged to the console; the rest of the test is unaffected.

These are guardrails, not goals. A shipped viz should run cleanly; the error UI exists so a single broken viz doesn't take down the chapter.

## Verifying visualizations before delivery

Because vizs are code-as-data, a quick verification pass before delivering the book:

1. Every chapter JSON still parses (the `code` strings are inside JSON, so a stray unescaped quote breaks the whole file).
2. Every `code` and every `check` parses as JS (`new Function("d3","helpers", code)` doesn't throw). Do this with a tiny node script that walks the `viz[]` arrays and `interactive` questions.
3. Open the book in a browser, click through each viz, submit one interactive question right and one wrong, switch languages and confirm vizs re-mount. This is the real smoke test — there's no headless substitute.
