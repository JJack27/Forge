# Forge

*Forge yourself into an expert.*

A ZCode skill that forges a personalized, multi-file HTML learning book (one self-contained `.html` file per chapter, with inline SVG diagrams and a small per-book demo registry) from a repo, a topic/domain, or external materials — calibrated to the learner's actual level.

The defining behavior: **before writing each chapter, the skill asks the learner 2–3 scenario/code-understanding questions, then writes the chapter at a depth matched to what they actually know.** Each chapter ships with a test; reaching 80% means "learned enough to move forward" (soft gate — never locks).

## What it produces

- A **multi-file static HTML project** (one folder per book): `index.html` dashboard + one self-contained `.html` per chapter + a shared `assets/` folder per language
- **Inline SVG diagrams** (`<figure class="diagram"><svg>…</svg><figcaption>…</figcaption></figure>`) — ER sketches, flow diagrams, architecture maps, layering diagrams. Pure inline SVG, no external images, no D3, works offline.
- **Interactive demos** (`<div class="demo" data-demo="NAME">`) — small per-book widgets (a hash stability demo, a per-site token slider, a step-by-step loop printer) backed by a registry the author adds to `assets/book.js`. The template ships empty; each book authors its own.
- **Internationalization via parallel sibling folders** (`en/`, `zh/`, …) — each a complete independent copy in one language. Switching language is a hyperlink to the parallel file; no runtime switcher, no `fetch()`.
- **Two goals:**
  - `domain-expert` — master a field (concept-progression outline)
  - `repo-expert` — master a specific repo (onboarding chapters: architecture, DB schema, core services, data flow, API surface, dev environment, contributing map — auto-detected from what the repo actually has)
- A table of contents with per-chapter status (✓ pass / • below 80% / ○ not taken)
- A progress dashboard
- Per-chapter tests mixing multiple-choice (single + multi), fill-in/code-fill, and short-answer-with-self-check
- 80% soft gate: failed tests highlight wrong questions and link to the exact section to re-read, but never lock the next chapter
- Progress persisted in the browser's `localStorage`, tracked per language

## How to run a generated book

**Just open the file directly** — no server, no build step, no internet required:

```bash
open <generated-book-project>/en/index.html      # macOS
# or double-click en/index.html in any browser
```

Every chapter is fully self-contained HTML and works under `file://`. Switch languages via the `lang-toggle` link in the top-right of any page.

## Files

```
Forge/
├── SKILL.md                       # main workflow (the entry point)
├── references/
│   ├── source-analysis.md         # how to extract structure from repo/topic/materials
│   │                              # + repo-onboarding artifact detection
│   ├── assessment-questions.md    # how to write & read the per-chapter scenario questions
│   ├── test-design.md             # test size, the three question types, the 80% rule
│   ├── project-structure.md       # HTML-per-chapter layout + data-* attribute schemas + SVG/demos
│   └── i18n.md                    # sibling-folder convention, the i18n invariant, translation guidance
└── assets/
    └── book-template/             # the template project (copy & fill per book)
        ├── README.md              # how to use the template
        └── en/                    # primary language folder
            ├── index.html         # dashboard shell (inline BOOK_CONFIG + CHAPTER_DESCS)
            ├── 01-example-chapter.html  # canonical chapter reference (all 4 question types, 1 SVG, 1 demo)
            └── assets/
                ├── style.css      # light/dark theme via CSS vars (shared verbatim across languages)
                └── book.js        # scoring + nav + theme toggle + dashboard + empty demos registry (shared verbatim)
```

## Installation

This skill is discovered from `~/.agents/skills/`. To install:

```bash
cp -r Forge ~/.agents/skills/
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
Stage 3:   assemble multi-file HTML project (primary language)
Stage 4:   deliver + explain usage (just open en/index.html — no server needed)
Stage 4.5: translate into each other selected language (sibling folder,
           same structure, same section ids, same data-correct/data-review,
           same question count — only prose changes)
```

## Test prompts (for verifying the skill)

Four realistic prompts to exercise the skill:

1. **Topic + domain-expert:** "Make me a book on Rust ownership and borrowing, in English. I've written some Rust but I keep fighting the borrow checker."
2. **Repo + repo-expert:** "Onboard me to this codebase at `~/projects/some-repo`. I want to actually become an expert on it — DB, services, the works. English and Chinese."
3. **Materials + domain-expert:** "Build me a study guide on distributed consensus from these two papers: <url1>, <url2>. I know basic distributed systems but Paxos/Raft always confuse me. Chinese."
4. **Multi-language domain book:** "Create a course for me on database indexes. English primary, but I also want Japanese and Spanish versions."
