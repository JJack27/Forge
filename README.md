# personal-book-forger

A ZCode skill that forges a personalized, self-contained HTML learning book from a repo, a topic/domain, or external materials — calibrated to the learner's actual level.

The defining behavior: **before writing each chapter, the skill asks the learner 2–3 scenario/code-understanding questions, then writes the chapter at a depth matched to what they actually know.** Each chapter ships with a test; reaching 80% means "learned enough to move forward" (soft gate — never locks).

## What it produces

- A single self-contained `.html` file (all CSS/JS inlined, no backend, no external requests)
- A table of contents with per-chapter status (✓ pass / • below 80% / ○ not taken)
- A progress dashboard
- Per-chapter tests mixing multiple-choice, fill-in/code-fill, and short-answer-with-self-check
- 80% soft gate: failed tests highlight wrong questions and link to the exact section to re-read, but never lock the next chapter
- Progress persisted in the browser's `localStorage`

## Files

```
personal-book-forger/
├── SKILL.md                       # main workflow (the entry point)
├── references/
│   ├── source-analysis.md         # how to extract structure from repo/topic/materials
│   ├── assessment-questions.md    # how to write & read the per-chapter scenario questions
│   ├── test-design.md             # test size, question types, scoring, the 80% rule
│   └── html-template.md           # how to fill in the single-file HTML
└── assets/
    └── book-template.html         # the HTML skeleton with CSS + scoring JS pre-wired
```

## Installation

This skill is discovered from `~/.agents/skills/`. To install:

```bash
cp -r personal-book-forger ~/.agents/skills/
```

(or symlink it). Once installed, it triggers on requests like:

- "make me a book on distributed systems"
- "turn this repo into something I can learn from"
- "build me a study guide for Rust ownership from these docs"

## How it works (high level)

```
Stage 0: analyze source(s)
Stage 1: propose outline → learner approves
Stage 2: per chapter → ask 2-3 scenario questions → score knowledge points
         → choose depth (skim / targeted / full) → write body + test
Stage 3: assemble single-file HTML
Stage 4: deliver + explain usage
```

## Test prompts (for verifying the skill)

Three realistic prompts to exercise the skill:

1. **Topic source:** "Make me a book on Rust ownership and borrowing. I've written some Rust but I keep fighting the borrow checker."
2. **Repo source:** "I want to learn how this codebase works: `~/projects/some-repo`. Turn it into a book I can study from. I'm new to this domain."
3. **Materials source:** "Build me a study guide on distributed consensus from these two papers: <url1>, <url2>. I know basic distributed systems but Paxos/Raft always confuse me."
