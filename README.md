# personal-book-forger

A ZCode skill that forges a personalized, multi-file HTML learning book (with i18n and D3/SVG interactive visualizations) from a repo, a topic/domain, or external materials — calibrated to the learner's actual level.

The defining behavior: **before writing each chapter, the skill asks the learner 2–3 scenario/code-understanding questions, then writes the chapter at a depth matched to what they actually know.** Each chapter ships with a test; reaching 80% means "learned enough to move forward" (soft gate — never locks).

## What it produces

- A **multi-file static web project** (one folder per book): `index.html` + `css/` + `js/` + `js/vendor/d3.min.js` + `locales/` + `content/`
- **D3/SVG interactive visualizations** — chapter-body diagrams (ER sketches, flow diagrams, architecture maps), simulations/steppers (request lifecycle, algorithm states), charts (bar/line/scatter), and interactive D3 questions embedded inside tests (click the failing node, reorder the pipeline). D3 is vendored, so the book still works offline.
- **Internationalization** built in: a runtime language switcher, with content in per-language JSON files. Same structure across languages; only prose differs.
- **Two goals:**
  - `domain-expert` — master a field (concept-progression outline)
  - `repo-expert` — master a specific repo (onboarding chapters: architecture, DB schema, core services, data flow, API surface, dev environment, contributing map — auto-detected from what the repo actually has)
- A table of contents with per-chapter status (✓ pass / • below 80% / ○ not taken)
- A progress dashboard
- Per-chapter tests mixing multiple-choice, fill-in/code-fill, short-answer-with-self-check, and interactive D3 questions
- 80% soft gate: failed tests highlight wrong questions and link to the exact section to re-read, but never lock the next chapter
- Progress persisted in the browser's `localStorage`, tracked per language

## How to run a generated book

The project must be **served over HTTP** (the browser blocks `fetch()` of local JSON under `file://`):

```bash
cd <generated-book-project>
./start.sh            # launches a static server and opens the browser
# or:
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

```
personal-book-forger/
├── SKILL.md                       # main workflow (the entry point)
├── references/
│   ├── source-analysis.md         # how to extract structure from repo/topic/materials
│   │                              # + repo-onboarding artifact detection
│   ├── assessment-questions.md    # how to write & read the per-chapter scenario questions
│   ├── test-design.md             # test size, question types (incl. interactive D3), the 80% rule
│   ├── project-structure.md       # multi-file project layout + content schema (incl. viz[])
│   ├── visualizations.md          # D3 viz contract, helpers API, authoring conventions
│   └── i18n.md                    # locale conventions, runtime switch, translation guidance
└── assets/
    └── book-template/             # the template project (copy & fill per book)
        ├── index.html
        ├── start.sh
        ├── css/book.css
        ├── js/{i18n,scoring,dashboard,viz,main}.js
        ├── js/vendor/d3.min.js    # vendored D3 v7 (offline-friendly)
        ├── locales/en.json
        └── content/en/{meta.json, ch-01.json}   # ch-01 ships 3 example vizs + 1 interactive question
```

## Installation

This skill is discovered from `~/.agents/skills/`. To install:

```bash
cp -r personal-book-forger ~/.agents/skills/
```

Once installed, it triggers on requests like:

- "make me a book on distributed systems"
- "turn this repo into something I can learn from"
- "onboard me to this codebase"
- "build me a study guide for Rust ownership from these docs" (in Chinese? Say so — it'll author in Chinese and offer to translate)

## How it works (high level)

```
Stage 0:   analyze source(s) [+ repo-onboarding detection if repo]
Stage 0.5: ask learner — which languages? which goal (domain-expert / repo-expert)?
Stage 1:   propose outline (goal-driven) → learner approves
Stage 2:   per chapter (primary language) → ask 2-3 scenario questions →
           score knowledge points → choose depth (skim / targeted / full)
           → write body + test
Stage 3:   assemble multi-file project (primary language)
Stage 4:   deliver + explain usage (must serve over HTTP)
Stage 4.5: translate into each other selected language (same structure, same anchors,
           same test logic — only prose changes)
```

## Test prompts (for verifying the skill)

Four realistic prompts to exercise the skill:

1. **Topic + domain-expert:** "Make me a book on Rust ownership and borrowing, in English. I've written some Rust but I keep fighting the borrow checker."
2. **Repo + repo-expert:** "Onboard me to this codebase at `~/projects/some-repo`. I want to actually become an expert on it — DB, services, the works. English and Chinese."
3. **Materials + domain-expert:** "Build me a study guide on distributed consensus from these two papers: <url1>, <url2>. I know basic distributed systems but Paxos/Raft always confuse me. Chinese."
4. **Multi-language domain book:** "Create a course for me on database indexes. English primary, but I also want Japanese and Spanish versions."
