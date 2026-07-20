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

---

## Repo onboarding detection (for the `repo-expert` goal)

When the learner's goal (asked at Stage 0.5) is **`repo-expert`**, the book is about *the repo itself*. The outline becomes a Repository Onboarding arc. At Stage 0, scan the repo for the artifacts below and **only include a chapter for artifacts that actually exist**. Don't fabricate a "DB schema" chapter for a repo with no database.

Each onboarding chapter still goes through the normal per-chapter assessment loop (Stage 2a–2e): ask scenario questions about, say, the data flow before writing that chapter, calibrate depth, and ship a test.

| Artifact | Detection signals | What the chapter teaches |
|---|---|---|
| **Architecture overview** | always (from README + tree) | The mental model, subsystem map, layering. What's where, and why. |
| **DB schema** | ORM model files (`models/`, `app/models/`), migration dirs (`migrations/`, `db/migrate/`), `schema.sql`, `prisma/schema.prisma`, `*.prisma` | Entities, relationships (an inline SVG ER sketch), key constraints, how migrations flow. |
| **Core services / modules** | top-level `services/`, `controllers/`, `modules/`, `pkg/`, `internal/` dirs | What each service/module does, its public API, how others call it. |
| **Core data flow** | HTTP route handlers, event/message brokers (Kafka, RabbitMQ, Redis pub/sub), job queues (Sidekiq, Celery, Bull) | One canonical request traced end-to-end; an inline SVG flow diagram; message/event flow. |
| **Key domain concepts** | domain model files, a glossary in docs, ubiquitous language | The vocabulary a contributor needs to read the code and the conversations. |
| **API surface** | `openapi.yaml`/`swagger.json`, route definitions, a `public/` or exported API module | The contract the repo exposes to the outside world; what's stable vs internal. |
| **Dev environment** | README setup section, `Dockerfile`/`docker-compose.yml`, `Makefile`, `package.json` scripts, `.env.example` | How to run it locally; the non-obvious traps (which env vars matter, which services must be up). |
| **Contributing map** | `CONTRIBUTING.md`, issue/PR templates, test layout (`tests/`, `__tests__/`, `*_test.go`) | Where to make a first change; how tests are organized and run; the review conventions. |

### How to detect

- `ls` the top-level and the obvious subdirs. Don't recurse blindly — go one or two levels deep.
- `grep` for telltale filenames and patterns: `schema.sql`, `*.prisma`, `class.*< ApplicationRecord`, `CREATE TABLE`, `async def` + `celery`, `@app.route`/`@Controller`/`router.`, `kafka`/`rabbitmq` in deps files.
- Read the deps manifest (`package.json`, `requirements.txt`/`pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`) — it tells you which categories apply (is there an ORM? a message broker? a web framework?).
- Read the README's setup section for the dev-environment chapter.

### What to record at Stage 0

Produce a short artifact inventory: "This repo has: DB schema (Postgres via Prisma), core services (3 services under `services/`), data flow (REST + a Redis queue), API surface (OpenAPI), dev env (docker-compose). It does NOT have: an event broker beyond Redis, a CONTRIBUTING.md." This inventory drives the Stage 1 outline.

### Outlines for the two goals, at a glance

- **`domain-expert`** outline: foundations → core mechanisms → advanced → applied. The repo (if any) supplies examples, not structure.
- **`repo-expert`** outline: architecture overview → (detected onboarding artifacts in dependency order: schema before services that use it, services before data flow) → key domain concepts → API surface → dev environment → contributing map.

The `repo-expert` arc roughly mirrors how a new engineer onboards onto a codebase: *where am I → what's the data → what are the pieces → how does a request move through them → how do I run it → how do I change it.*
