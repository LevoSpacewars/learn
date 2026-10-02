---
name: curriculum
description: One-time (and occasional) setup of the learner's goals — the frontier fields he wants to do research in — as spines of real milestones with the fundamentals each needs, followed by a placement probe per goal. Use when the start menu says "Set up my goals", when he asks to add/change a goal, or when he asks what his path looks like.
---

# Curriculum setup

He wants to do frontier research across several fields at once (currently: molecular dynamics, mass-spec analysis, HDX, Linux administration, AI, wafer defect detection / optics; more may come). He has a physics undergraduate degree, is out of practice in math and reasoning, and must **never feel like he is only catching up**. So the curriculum is pull-based: goals are spines of real tasks, fundamentals are learned only when a milestone needs them, and the scheduler (code, not you) rotates across goals.

Your job here is to build that graph well, with him, and then run a short placement probe per goal so the spines start where he actually is. Everything is saved with `goal_set` / `fundamental_set` and lives in the learner file; later sessions read it automatically.

## Part 1 — Interview (ask_user_question, short)

For each goal he names, get three things, one question at a time:
1. **The endpoint, concretely.** "Expert in HDX" could mean: analyze his own HDX-MS data end to end, model exchange kinetics, design experiments, review papers critically. Ask until you can write one line that starts with "I can …".
2. **His foothold.** What he already does in this field today (tools, papers, problems). The first milestone sits just above this.
3. **Weight.** Leading (3), normal (2), background (1). Ask once for all goals.

Keep it brisk: six goals × three questions is already a lot. Group where you can.

## Part 2 — Research each field (researcher subagents, in parallel)

For each goal fire a `researcher` with: the endpoint line, his foothold, and the request: "What are the 5-8 capabilities, in rough difficulty order, that someone must actually be able to DO to reach this endpoint; for each, the 1-3 genuine prerequisites (math/physics/stat/CS), named as specific concepts not subjects; and the canonical texts/papers." Ask it to be concrete: not "statistical mechanics" but "Boltzmann weights and partition functions", not "linear algebra" but "eigendecomposition of symmetric matrices".

## Part 3 — Draft spines, then let him edit

Turn each research brief into a spine of **5-8 milestones**, each a real task phrased as a verb (analyze / derive / build / reproduce / critique), with a one-line "done means …" and only the fundamentals it genuinely needs. Rules:

- The **first milestone is doable within a session or two from his foothold**, possibly needing one fundamental. Day one must feel like doing the field.
- **Name fundamentals by concept and reuse slugs across goals.** The same `eigendecomposition` serves MD normal modes, PCA in MS analysis, and large-deviation rate functions. Shared slugs are what make the graph efficient.
- Where a paper or problem of his own fits, make it a milestone (`kind: read` / `critique` / `do`) and say so; his material lives in `inbox/` in the vault.
- A fundamental is a *lesson-sized* idea (one session), not a course. Split "linear algebra" into the three or four pieces the milestones actually use.

Present all spines in chat as compact lists (goal → milestones → needs). Then ask whether to adjust; apply his edits; save each goal with `goal_set` and each fundamental with `fundamental_set` (domain + serves). Finish with `curriculum_map` and show it.

## Part 4 — Placement probe (per goal, ~15-20 min each, can be spread over sessions)

For each goal, probe the **fundamentals its first two milestones need** using the teach skill's bracketing method (`quiz` for crisp distractors, `recall` otherwise; escalate until something breaks, characterize misses). Then set each fundamental's status with `fundamental_set` (`solid` / `shaky` / `unknown`) and, for solid ones, note it. Don't teach during placement; mark and move on. If the first milestone's needs are all solid, say so: he can attempt it next session.

If time runs out, save what's placed and tell him which goals remain; the start menu will offer the rest.

## Afterwards

Nothing else to invoke. The start menu offers "Next on the path" with the scheduler's reason, and "Bring something" for his own material; the teach skill knows how to place both.
