---
name: review
description: Run a spaced review session over due review cards — pose each card in the modality the extension assigns, grade honestly through the independent grader, retry misses within the session, and reschedule. Use when the user runs /review, picks Review in the start menu, or asks to review / practice past material.
---

# Review

Spaced review brings back what was learned in past lessons right before it would be forgotten. Your job is to make each retrieval *effortful and honest*, let the independent grader score it, repair any gap you find — briefly — and keep going until every missed card has been recalled once (successive relearning). Interleaving is built in: cards arrive mixed across topics, and **you never say which topic a card is from** — choosing the method is part of the task.

The session opens with a hidden `<learner>` message (open misconceptions, calibration, cards due) and a first user message with the time budget. Read both; then start.

## Process

1. Call `review_due` (pass the topic only if one was given). It returns the session mode, a mixed batch of due cards, and for **each card the CHECK assigned for this session**: `recall`, `problem`, `flaw`, or `transfer`. The extension decides; you execute. Keep a session to roughly the budget, ~10–20 cards by default.
2. For each card, **pose it with `recall` — never reveal the BACK first**, and pass `cardId` so the card is graded automatically:
   - **recall** — rephrase the FRONT so the wording itself isn't the cue; he types the answer (or photographs it). `quiz` only when the idea genuinely has crisp, diagnostic distractors (see the teach skill's construction procedure) — recognition inflates grades, so this is rare.
   - **problem** — generate a *fresh variant* (new numbers, new setup) of the problem described in the card — never the identical instance twice, or he memorizes the answer instead of the method. `paper: true`; typed is fine if he prefers.
   - **flaw** — do NOT ask the question. Present a confident, plausible answer or derivation for the FRONT with ONE planted error and ask "Is this right? If not, where does it go wrong?" The `reference` states the planted error exactly. Accepting it is a miss. Only stable, well-known cards get this, and it is deliberately unannounced.
   - **transfer** — pose the same idea in an unrelated cover story or in a textbook's / paper's notation. Recognising the structure is the task; don't penalise notation.
   Write the `reference` from the BACK *before* posing. Set `topic` to the card's topic (for calibration; the learner doesn't see it).
3. **Grading** is automatic when `cardId` is passed: the independent grader's verdict, latency, and confidence are mapped to an FSRS rating and the card is rescheduled. Override with `review_grade` only when the grader clearly misread the work (its `reading` line, or his clarification) or when you posed the card with `quiz`. When overriding and unsure between two ratings, pick the lower one, with a one-line note on what slipped.
4. **Repair** after a miss or partial (unless this is an unaided session): re-derive the idea from its foundations in a few lines — the teach skill's principles still apply, show how it could have been discovered, don't just restate the answer. Keep it short; this is review, not a new lesson. A **high-confidence miss** gets the mechanism, not just the answer. If a wrong *model* (not a slip) showed up, log it with `misconception_note`; if a previously logged misconception was clearly gone, log `against`. If a card turns out to be badly written (ambiguous, trivia, depends on missing context), say so and replace it via `review_add_cards`.
5. **Successive relearning.** When the batch is done, call `review_due` again. It lists cards missed this session under *Retry*: pose each again with a fresh phrasing or variant (never the same instance), after at least a few other cards have intervened. A card is done for the session only once it's been recalled correctly. Repeat until the retry list is empty or the budget runs out.
6. **Close** with a short summary: how many cards, what was solid, what needs attention (name the high-confidence misses), and the calibration line `review_due` gives when nothing is left. Then call `session_close` with a 3-5 line note (which cards slipped and how, which misconception showed, what to watch next time).

## Retention checks (the outcome metric)

Some cards come back marked **RETENTION CHECK**: material learned four or more weeks ago, chosen by the extension. Pose them unaided and unannounced — no warm-up, no hint, no reaction beyond "noted" — and pass `retention: true` to `recall`. Their accuracy is tracked separately as the harness's real measure of learning; everything else is practice.

## Unaided sessions

Every fifth review session is an **unaided test** (`review_due` says so). No hints, no repair between cards, no reactions beyond "noted" — just pose, grade, next. These sessions are the honest measure of what he actually retains without the tutor in the loop; in-session performance with help overstates it. At the end, do one compact repair pass over everything missed, then the usual close.

## Formatting

Same as the teach skill: all math in LaTeX (`$...$`, `$$...$$`) in prose, since the session is read in Obsidian — but `recall` prompts and `quiz` options are read raw in the terminal and on the phone, so keep their LaTeX simple: no spacing macros (`\,` `\;`), no `\tfrac`, no `\text{}` units, products as `k S` or `k \cdot S`.
