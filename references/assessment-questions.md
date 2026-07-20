# Assessment Questions

How to write the 2–3 scenario / code-understanding questions asked at the start of each chapter (Stage 2a), and how to read the learner's answers (Stage 2b).

## Why scenario questions, not "do you know X?"

"Have you used React hooks?" tells you nothing — the learner can't judge their own level accurately, and even honest self-reports are unreliable. A scenario question forces them to *apply* the concept, which reveals what they actually understand.

Bad: "Are you familiar with the borrow checker?"

Good: "This code fails to compile. What's the borrow checker complaining about, and what's the smallest change that fixes it?
```rust
fn main() {
    let mut v = vec![1, 2, 3];
    let r = &v[0];
    v.push(4);
    println!(\"{}\", r);
}
```"

The second one reveals, in seconds, whether they understand lifetimes, mutable vs shared borrows, and the aliasing rule.

## Question shapes that work

Pick 2–3 of these per chapter, varying the shape:

- **Predict the output / error.** Give a snippet, ask what happens. Reveals whether they can run the model in their head.
- **Root cause from symptom.** "X hangs intermittently under load Y. What are the top 2 likely causes and how would you distinguish them?" Reveals whether they have the causal model, not just the vocabulary.
- **Compare two designs.** "Design A does X, design B does Y. Which breaks under condition Z, and why?" Reveals whether they understand the trade-offs, not just the surface.
- **Pick the right tool / API.** "You need to do X. Three options: A, B, C. Which do you reach for, and what's the failure mode of each wrong choice?" Reveals practical fluency.
- **Fill the missing step.** Give a partial solution with a gap that requires understanding the core mechanism. Reveals whether they see the mechanism, not just the pattern.

## What to avoid

- **Vocabulary recall questions.** "Define X." Useless for level-checking.
- **Questions whose answer is in the previous chapter.** You're assessing the *current* chapter, which they haven't read yet — that's the point.
- **Trick questions.** You're measuring understanding, not gotcha ability.
- **Questions so broad the learner can't tell what you're asking.** "Tell me about databases." → narrow it.
- **More than ~3 questions per chapter.** Beyond that the learner fatigues and the marginal information drops sharply.

## Reading the answers (Stage 2b)

Be honest. The whole skill fails if you inflate the learner's level — they get a book that skips things they don't know.

Split the chapter into its constituent knowledge points first (3–8 points typically). Then for each point, tag it based on the answer:

| Signal in the answer | Tag |
|---|---|
| Correct mechanism, correct reasoning, can extend to a new case | `mastered` |
| Right vocabulary but wrong / hand-wavy mechanism, or right answer with wrong reasoning, or knows it applies but not why | `partial` |
| Wrong, "I don't know", silent on it, or correct only by guessing | `unknown` |

Watch for these tells:

- **Confident but wrong** → `unknown`, not `partial`. Misconceptions are worse than gaps.
- **Right answer, no reasoning** → usually `partial`. They've seen the pattern but can't generalize.
- **"I think it's because…"** + a plausible-but-incomplete reason → `partial`.
- **Vague hedging** ("it's something to do with X") → `partial` at best, often `unknown`.

If the learner's answer is ambiguous, you may ask one short follow-up to disambiguate before tagging. Don't interrogate — one follow-up max.

## After scoring

Briefly tell the learner what you found, before writing the chapter. Example:

> "Based on your answers: you clearly already get X and Y (you nailed the borrow-checker question). You're shaky on Z — your reasoning conflated lifetimes with scopes. So this chapter will recap X/Y in a sentence each and spend most of its space on Z."

This does three things: it shows the learner you actually listened, it sets expectations for the chapter's depth, and it lets them correct you ("actually I do know Z, I just misread the question") before you write the wrong thing.
