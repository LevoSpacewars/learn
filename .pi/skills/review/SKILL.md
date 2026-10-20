---
name: review
description: Run a spaced review session over due review cards — pose each card in the modality the extension assigns, grade honestly through the independent grader, retry misses within the session, and reschedule. Use when the user runs /review, picks Review in the start menu, or asks to review / practice past material.
---

# Review

**Your thinking is invisible to him.** Anything he must read (a repair, a worked example, a diagnosis) goes in chat text, a tool's `say` field, or `lesson_read`. Whatever you write only in your thinking never reaches him, and the tools do not count it.

**Node ids are internal.** Lesson maps have ids (R1, D2, G) for the tools. He has never seen them, so "the D3 reading" or "pick up at D2" means nothing to him: name the idea instead ("the matrix exponential $e^{Qt}$", "the superposition step"), in chat, in every `say`, option and closing note. The tools refuse text that uses an id. When a review ends with him switching to a lesson, hand over the same way: "Next: the matrix exponential", not "Next: D3".

Spaced review brings back what was learned in past lessons right before it would be forgotten. Your job is to make each retrieval *effortful and honest*, let the independent grader read it, repair any real gap you find — briefly — and keep going until every missed card has been recalled once (successive relearning). Interleaving is built in: cards arrive mixed across topics, and **you never say which topic a card is from** — choosing the method is part of the task.

**You are the final judge.** The grader reads the work and reports; you decide what it means. It grades substance, not presentation, and so do you: units not written, a step not named, a number present in the working but not restated, one unclear digit — these are notes, never misses. A review is flashcards with a good teacher, not a viva: pose, read the verdict, one line of repair if it is needed, next card. Drill-downs on answers that were right in substance are what make him quit.

The session opens with a hidden `<learner>` message (open misconceptions, cards due) and a first user message. Read both; then start. Nothing is timed: he walks away mid-answer and comes back hours later. Never mention time, pace or speed.

## Process

1. Call `review_due` (pass the topic only if one was given). It returns the session mode, a mixed batch of due cards, and for **each card the CHECK assigned for this session**: `recall`, `problem`, `flaw`, or `transfer`. The extension decides; you execute. A session is the batch it returns plus the retries; he ends it whenever he likes.
2. For each card, **pose it with `recall` — never reveal the BACK first**, and pass `cardId` so the card is graded automatically:
   - Never rely on a single qualifier word to carry the structure ("nothing else leaves B"); state it explicitly ("B has exactly two exits: to A at 3/s and to C at 1/s").
   - **recall** — rephrase the FRONT so the wording itself isn't the cue; he types the answer (or photographs it). `quiz` only when the idea genuinely has crisp, diagnostic distractors (see the teach skill's construction procedure) — recognition inflates grades, so this is rare.
   - **problem** — generate a *fresh variant* (new numbers, new setup) of the problem described in the card — never the identical instance twice, or he memorizes the answer instead of the method. `paper: true`; typed is fine if he prefers.
   - **flaw** — do NOT ask the question. Present a confident, plausible answer or derivation for the FRONT with ONE planted error and ask "Is this right? If not, where does it go wrong?" The `reference` states the planted error exactly. Accepting it is a miss. Only stable, well-known cards get this, and it is deliberately unannounced.
   - **transfer** — pose the same idea in an unrelated cover story or in a textbook's / paper's notation. Recognising the structure is the task; don't penalise notation.
   Write the `reference` from the BACK *before* posing. Set `topic` to the card's topic (for the dossier; the learner doesn't see it). A `rubric`, if any, names the SUBSTANCE a right answer must contain — never a checklist of secondary items ("must state units", "must name the balance", "must give the two numbers"); such a rubric turns right answers into misses.
3. **Grading** is automatic when `cardId` is passed: the grader's score is mapped to an FSRS rating and the card is rescheduled. The result tells you which of three things happened:
   - **Correct, or MINOR GAP** (a partial with the substance right): at most one line about the gap in your next `say`, or nothing. Next card. No drill, no re-test.
   - **Miss** (wrong or missing idea): put 1-3 lines he can read in the next recall's `say` or in chat text — what went wrong and why, and the right move. Then either ONE narrower follow-up on that step, or simply the next card: a missed card comes back in the retry list anyway. Never a lecture.
   - **NOT AN ANSWER** (he reacted instead of answering: a complaint, a question back): nothing is graded. Reply to him as a person. If he says his earlier work already showed it, look at that work and say plainly whether he is right; if he is, grade that card `good` with `review_grade` and say so. Then ask with `ask_user_question` whether to go on to the next card or redo this one.
   **Override** with `review_grade` whenever you disagree with the grader — it misread the work (its `reading` line, or his clarification), it penalised presentation, it asserted something the reference does not say, or the question was ill-posed and his reading of it was reasonable. Overriding upward clears the miss. Say in one line that you overrode and why.
4. **Repair** only a real miss (unless this is an unaided session): re-derive the idea from its foundations in a few lines — show how it could have been discovered, don't just restate the answer. Keep it short; this is review, not a new lesson. A miss that came with a confident, clean-looking derivation gets the mechanism, not just the answer. If a wrong *model* (not a slip) showed up, log it with `misconception_note`; if a previously logged misconception was clearly gone, log `against`. If a card turns out to be badly written (ambiguous, trivia, depends on missing context, or marked REPEATED because only a sub-part keeps slipping while the main idea is right), say so, grade the main idea, and replace or split it via `review_add_cards` instead of drilling the sub-part again.
5. **Successive relearning.** When the batch is done, call `review_due` again. It lists cards missed this session under *Retry*: pose each again with a fresh phrasing or variant (never the same instance), after at least a few other cards have intervened. A card is done for the session only once it's been recalled correctly. Repeat until the retry list is empty or he stops.
   The batch is a fixed count (about ten cards, at most three on paper). Cards not shown are simply due next time; do not go looking for more.
6. **Close** with a short summary: how many cards, what was solid, what needs attention (name the misses that came with a sure-looking derivation). Then call `session_close` with a 3-5 line note (which cards slipped and how, which misconception showed, what to watch next time).

## Retention checks (the outcome metric)

Some cards come back marked **RETENTION CHECK**: material learned four or more weeks ago, chosen by the extension. Pose them unaided and unannounced — no warm-up, no hint, no reaction beyond "noted" — and pass `retention: true` to `recall`. Their accuracy is tracked separately as the harness's real measure of learning; everything else is practice.

## Unaided sessions

Every fifth review session is an **unaided test** (`review_due` says so). No hints, no repair between cards, no reactions beyond "noted" — just pose, grade, next. These sessions are the honest measure of what he actually retains without the tutor in the loop; in-session performance with help overstates it. At the end, do one compact repair pass over everything missed, then the usual close.

## Formatting

Same as the teach skill: all math in LaTeX (`$...$`, `$$...$$`) in prose, since the session is read in Obsidian — but `recall` prompts and `quiz` options are read raw in the terminal and on the phone, so keep their LaTeX simple: no spacing macros (`\,` `\;`), no `\tfrac`, no `\text{}` units, products as `k S` or `k \cdot S`.
