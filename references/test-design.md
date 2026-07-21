# Test Design

How to write each chapter's test (Stage 2e): question count, types, scoring, the 80% rule, and the soft-gate behavior.

## Test size

**8–15 questions per chapter.** Fewer for short/shallow chapters, more for full-depth ones. Prefer fewer well-chosen questions over many shallow ones — a 15-question test where 12 are recall is worse than an 8-question test where all 8 probe understanding.

## Question types

The learner asked for three types, plus a fourth D3-powered interactive type. Use a mix; don't make a test all one type.

### 1. Multiple-choice

- **Single-select or multi-select.** For multi-select, mark it clearly ("select all that apply") and require all-and-only correct options for the point.
- **3–5 options.** Fewer is too easy to guess; more is exhausting.
- **Distractors should be plausible** — common misconceptions, off-by-one reasoning, confusing the concept with a neighbor. A wrong answer that nobody would pick teaches nothing.
- **One unambiguously correct answer.** If two options could be defensible, rewrite the question.

### 2. Fill-in-the-blank / code-fill

- A sentence or code snippet with one or more blanks.
- **Provide a small set of accepted answers per blank** — equivalent phrasings, alternate identifiers, with/without trailing punctuation. The frontend normalizes (trim, collapse whitespace, case-insensitive) unless the answer is genuinely case-sensitive (e.g. an API name).
- **Avoid blanks with many valid free-form answers.** If you can't list the acceptable answers, it's not a fill-in — make it a short-answer instead.
- Code-fill: make sure the blank has exactly one syntactic/semantic completion. `const x: ___ = 5` is bad (i32? usize? inferred?). `let x: &str = ___;` where the surrounding code forces a `&'static str` is good.

### 3. Short-answer with self-checked key points

This is the type that most rewards understanding and most resists gaming. Structure:

- Pose the question (e.g. "In your own words: why does this design fail under condition Z, and what's the standard fix?").
- The learner writes a free-form answer in a textarea.
- On submit, reveal the **reference answer as a checklist of key points** (3–6 bullets). E.g.:
  - [ ] identifies that the failure is caused by X
  - [ ] names the underlying mechanism (Y rule)
  - [ ] proposes the standard fix (Z pattern)
  - [ ] notes the trade-off the fix introduces
- The learner self-checks each point: "only check a point if you actually addressed it — under-checking hurts the book's calibration, over-checking only fools yourself." Score for the question = (checked points) / (total points).
- This honesty framing matters. Put it above every short-answer checklist, not buried in help text.

### 4. Interactive (D3-powered)

For concepts best tested by doing — click the failing node, drag to reorder the request steps, adjust a parameter to hit a target. The question carries two code strings:

- `code` — D3 code that renders an interactive visualization into the question's mount div.
- `check` — code that scores the learner's interaction; returns `{ passed: bool, earned: 0|1 }` (or a fraction in [0,1] for partial credit).

Both run via `new Function` with `this` = the mount div, `d3` and `helpers` in scope. The render runs when the question mounts; the check runs at submit. If `check` throws, the question scores 0 (logged to console) rather than breaking the test.

**When to use it.** Only when the interaction genuinely tests understanding that a static question can't — tracing a failure path on a real diagram, reordering a pipeline, tuning a value to meet a constraint. Don't use it for things a multiple-choice question would test equally well; interactive questions cost more to author and more for the learner to operate.

**Scoring patterns.** The most common is click-selection: the render code stores the learner's pick on the node's bound datum (`d.selected = true` in the click handler), and `check` reads it back via `this.querySelectorAll("g.node")` + each element's `__data__`. See `references/visualizations.md` for the worked example.

## Where test data lives

In the multi-file project, each chapter's test lives in `content/<lang>/ch-XX.json` under `test.questions`. The **scoring logic is language-neutral** (it reads `data-*` attributes off the rendered DOM), so when you translate a chapter:

- Keep the same number of questions, same types, same order.
- Keep `correct` (mcq value tokens) and `accepted` (fill) **identical across languages**, unless an `accepted` answer is a natural-language term — then translate its acceptable forms.
- Keep the `keyPoints` count identical for short-answer questions.

See `references/i18n.md` for the full invariant.

## Scoring

- Every question is worth equal points by default. (Weighting tends to confuse learners and rarely reflects anything real.)
- Test score = (points earned) / (points possible), as a percentage.
- Chapter is "learned enough to move forward" at **≥ 80%**. This threshold is the skill's core promise — don't fudge it.
- Scores persist per language: `localStorage` key `book:<slug>:<lang>:ch:<n>`. Passing the English test doesn't mark the Chinese test as passed — they're separate certifications.

## Weighting toward weak points

When you generate the test (Stage 2e), you already know — from the assessment (Stage 2a/2b) — which knowledge points the learner was shaky on. **Roughly half the test questions should target those weak points.** The other half covers the rest of the chapter to make sure nothing slipped.

This is what makes the test a real gate rather than a generic quiz: if the learner crammed the one thing they were shaky on but it didn't stick, the test catches it.

## Every question ships with

For each question, generate (the HTML template consumes this):

- `id` — stable within the chapter, used for review navigation
- `type` — `mcq` | `fill` | `short`
- `prompt` — the question text (may include code blocks)
- `options` (mcq only) — array; mark which are correct
- `accepted` (fill only) — array of acceptable normalized answers
- `keyPoints` (short only) — array of checklist items
- `answer` — the canonical correct answer / explanation, revealed after submit
- `rationale` — one or two sentences on *why* this is the answer; for partial-credit cases, why each distractor is wrong
- `review` — an in-book anchor for re-study, e.g. `chapter-3#sec-borrow-checker-rules`. The frontend renders this as "review §3.2".

## Soft-gate behavior (do not lock)

- **≥ 80%:** green check on the TOC and dashboard. Learner is encouraged (not forced) to move on.
- **< 80%:** yellow marker on the TOC. The test results page highlights every wrong question and, under each, links to the exact book section to re-read ("review §3.2 — you missed the distinction between X and Y").
- **Never lock the next chapter.** The learner can always read ahead. The gate is informational, not coercive. This is a deliberate design choice — forced gating produces frustration and gaming; honest feedback produces learning.
- The learner can re-take any test at any time (button on the chapter). New score overwrites old in `localStorage`.

## What not to do

- Don't write questions whose answer is verbatim in the chapter text. That tests search, not understanding.
- Don't make every test identical in shape across chapters — vary the mix so the learner can't pattern-match.
- Don't omit the rationale. "Correct answer: B" teaches nothing; "B is correct because X; A confuses this with the unrelated Y rule; C is the behavior of a different API" teaches the misconception's shape.
- Don't generate a test for a chapter that has nothing testable. Say so and skip — a fake test is worse than no test.
