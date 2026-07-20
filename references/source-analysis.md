# Source Analysis

How to extract the "what can this teach?" from each kind of source, at Stage 0.

## Repo

Goal: figure out what knowledge lives in this codebase and how it's structured as a learning path.

Steps:

1. **Read the README and any top-level docs** (ARCHITECTURE.md, docs/, CONTRIBUTING.md). These usually state the system's purpose and shape directly.
2. **List the directory tree** (top two levels is enough to start). Identify the main subsystems.
3. **Open the 2–3 most central entry points.** Look for `main`, the public API module, the core data structure, the request handler — whatever the system revolves around. Read enough to understand the spine.
4. **Optionally skim recent commits** (`git log --oneline -30`) to see what's actively changing — often signals what's important or subtle.
5. **Produce a short note** (3–8 bullets): "this repo teaches X, Y, Z. The natural progression is A → B → C because …"

Do not try to read the whole repo. You are looking for the *spine*, not completeness.

### Pitfalls

- Don't get pulled into implementation detail at this stage. You're choosing chapters, not writing them.
- Don't treat the repo's own `docs/` ordering as gospel. It's usually reference material, not a learning path. Re-organize for pedagogy.
- If the repo is a library/framework, the learning path usually goes: mental model → core abstraction → common usage → advanced patterns → internals/contributing. Follow that shape.

## Topic / domain

Goal: enumerate the field's accepted conceptual progression, then use it as the book's skeleton.

Steps:

1. Identify the field's **foundational concepts** — the vocabulary and mental models every practitioner starts with.
2. Identify the **core mechanisms** — the central techniques or objects the field revolves around.
3. Identify **advanced topics** — subtleties, edge cases, performance, trade-offs.
4. Identify **applied / integration topics** — how the field meets the real world (tooling, common pitfalls in practice, related fields).
5. Order them as a progression: each chapter should depend only on concepts already covered.

Use your own knowledge of the field. If you're uncertain about canonical structure, say so and propose a structure with a note like "I'm organizing this around X; tell me if your goal is better served by a different cut (e.g. by use-case rather than by concept)."

### Pitfalls

- Don't invent a novel pedagogical structure. Use the field's own conventions — learners will compare your book to other resources and a weird structure costs them.
- A topic is not a single chapter. "Databases" is a book; "B+ tree indexes" is a chapter. Get the granularity right at Stage 1.

## Materials (URLs or files)

Goal: extract a knowledge graph from the raw material, then organize it into a progression.

Steps:

1. **Fetch each URL** (use the web fetch tool) or **read each file**.
2. **Summarize each** in 3–5 bullets — what it covers, what stance it takes, what it assumes the reader knows.
3. **Deduplicate and merge** — when multiple sources cover the same concept, keep the clearest treatment.
4. **Find the progression** — what's the prerequisite order across the merged set?
5. **Note gaps** — if the learner only gave you papers on advanced topics, flag at Stage 1 that the book will need foundational chapters you'll write from general knowledge (not the materials).

### Pitfalls

- Materials are a *source*, not a *structure*. Don't just produce one chapter per source — that produces a disjoint anthology. Merge into a real progression.
- Respect licensing and attribution. If you quote or closely follow a source, name it in the chapter's "further reading."

## Multiple sources combined

When the learner gives a topic + a repo + materials, the rule is: **topic provides the skeleton, repo and materials provide the evidence and worked examples.**

- Stage 0 produces a topic-shaped outline.
- For each chapter, prefer concrete examples drawn from the repo (with file:line citations) or from the materials (with attribution).
- If the repo/materials don't cover a chapter the topic skeleton calls for, write that chapter from general domain knowledge and say so.
