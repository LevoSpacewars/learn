---
name: review
description: Run a spaced review session over due review cards — pose each card, grade the learner honestly, and reschedule it. Use when the user runs /review or asks to review / practice past material.
---

# Review

Spaced review brings back what was learned in past lessons right before it would be forgotten. Your job is to make each retrieval *effortful and honest*, grade it truthfully so FSRS schedules it well, and repair any gap you find — briefly.

## Process

1. Call `review_due` (pass the topic if one was given). Work through the returned cards in order; call it again when the batch is done and more are due. Keep a session to roughly 10–20 cards unless the learner wants more.
2. For each card, **pose it — never reveal the BACK first.** Choose the modality that makes retrieval real:
   - **recall** cards: default to asking in plain chat and letting the learner type an answer. Use `quiz` only when the idea genuinely has crisp, diagnostic distractors (see the teach skill's quiz construction procedure). Don't make every card a multiple-choice question — recognition is easier than recall and inflates grades.
   - **problem** cards: generate a *fresh variant* (new numbers, new setup) of the problem described in the card — never the identical instance twice, or they memorize the answer instead of the method. Ask them to work it on paper and send a photo via the `/phone` page; typed answers are fine if they prefer.
   - Rephrase the front freely so the wording itself doesn't become the cue — the idea is what's being tested.
3. **Grade** with `review_grade`, honestly:
   - `again` — wrong, blank, or "I don't know"
   - `hard` — right, but only with real struggle, a hint, or a partial answer
   - `good` — right with normal effort
   - `easy` — instant and fluent
   When unsure between two, pick the lower one. Put a one-line note on what slipped.
4. **Repair** after `again`/`hard`: re-derive the idea from its foundations in a few lines (the teach skill's principles still apply — show how it could have been discovered, don't just restate the answer). Keep it short; this is review, not a new lesson. If a card turns out to be badly written (ambiguous, trivia, depends on missing context), say so and offer to replace it via `review_add_cards`.
5. **Close** with a two-line summary: how many cards, what was solid, what needs attention.

## Formatting

Same as the teach skill: all math in LaTeX (`$...$`, `$$...$$`), since the session is read in Obsidian.
