# Working on the tutor harness

This repo is one person's Obsidian vault plus the `pi` configuration (`.pi/`) that turns pi 0.87 into their tutor. The learner is the repo owner; the "tutor" is pi running the teach/review skills with the extensions below. Read this before changing anything under `.pi/`.

This file lives under `.claude/` on purpose: pi loads any `CLAUDE.md` or `AGENTS.md` at the vault root into the tutor's system prompt. Never create one there.

## Layout

- `.pi/extensions/` — the harness. `start-menu.ts` (review / continue / learn new / next on the path; injects the `<learner>` slice), `recall.ts` (free-recall tool: typed, photo or voice answers, graded by a separate process; also `lesson_read` and the gate hooks), `quiz.ts`, `md-log.ts` (writes Obsidian callouts into `lessons/*.md`), `curriculum.ts`, `plot.ts` (SVG function plots into `viz/`), `ask-user-question.ts`.
- `.pi/extensions/review/` — `index.ts` (FSRS cards, `review_due`, `lesson_plan`, `lesson_node`, `session_close`), `store.ts` (learner.json: lessons, goals, fundamentals, misconceptions, sessions, events log), `pedagogy.ts` (every gate: floor, reading, miss, predict, owed reply, node-id check, practice ladder; state on `globalThis.__learnPedagogy`), `grader.ts` (context-free grader: `pi -p --no-extensions`, model `PI_GRADER_MODEL`), `book.ts` (readings → `book/<slug>.md`), `sidechat.ts` (side questions answered from lesson material only), `notebook.ts` (his handwritten notes: pages in `notebook/pages/`, store, background reader/tagger in a separate `pi -p` that transcribes the pages, `notebook/*.md` + `Notebook.md` index, the `notebook` tool and `/note`), `prompts.ts` (pending-prompt registry shared with the web page), `ui.ts`, `plainmath.ts`.
- `.pi/extensions/phone-work/` — the web surface on port 8787 (`PI_PHONE_PORT`, `PI_PHONE_BIND`): `page.html` (lesson viewer, answer pad, drawing canvas, start menu, side chat, Book, Notebook), `graph.html` (knowledge map), `scratch.js`. Token in `.learn/phone-token`.
- `.pi/skills/` — teach, review, curriculum, visualize. Prompts and code share the pedagogy: the code refuses what the skill forbids, so change both together.
- `.pi/tests/` — unit tests and browser checks, run outside pi. See its README.
- Data (all in the vault, mostly committed): `.learn/learner.json` (machine index), `.learn/events.jsonl` (append-only log of graded answers), `.learn/cards.json` (FSRS), `.learn/readings.jsonl`, `.learn/sidechat.jsonl`, `.learn/notes.jsonl`; `lessons/` (session notes), `knowledge/` (per-concept dossiers regenerated from events), `book/`, `notebook/` (his notes, rebuilt from notes.jsonl), `work/` (answer photos), `viz/`, `inbox/` (papers, ignored).
- pi session transcripts: `~/.pi/agent/sessions/--Users-alexanderpatapoff-learn--/*.jsonl`. They are the evidence for how a session actually went; read them before changing pedagogy.

## Decisions that are settled (do not reintroduce)

- No clock anywhere: no time budgets, no latency, no pace. The learner walks away mid-answer and comes back.
- No confidence ratings. Legacy `confidence`, `latencyMs`, `calibration`, `budgetMin` fields in store.ts stay only so old files parse.
- Nothing the learner reads may contain a node id like `D3` or `n2`; use the node's label. `pedagogy.ts` refuses tool calls that leak one.
- After a miss: explain, then retry or drill down. Never move on. The grader diagnoses; the tutor is the final judge of a grade.
- Reading before testing: a node's `lesson_read` must be shown (and read) before recall/quiz on it; then the practice ladder (next move → completion → assigned check → derivation on paper).
- Reactions and complaints are not answers (`attempted=false`), not misses.
- Keep all goals; the review pile is fine; one predict per lesson.
- Driver model is set in `.pi/settings.json`; the grader defaults to `claude-bridge/claude-opus-5-5`.

## How to change it

1. Work on a branch in a worktree (`.claude/worktrees/<name>`, gitignored). Symlink `node_modules` into `.pi/extensions/{review,phone-work,visual-tools}` from the main checkout.
2. `cd .pi/tests && node run.mjs && node typecheck.mjs`. Both must be clean. Add a test for any new gate or tool rule; the fake-pi pattern is in `flow.test.mts`.
3. For UI changes, screenshot `page.html` with `fakeserver.mjs` + `shot.mjs` (headless Chrome). For anything the model does, run a throwaway vault (`PI_LEARN_NO_OPEN=1 PI_PHONE_PORT=8799`, `.pi` symlinked) in tmux and drive it with `tmux send-keys`.
4. Commit, then fast-forward merge into `main` yourself (`git merge --ff-only`) and push `main`. Delete the branch and worktree afterwards so the next agent does not find them.
5. Do not restart pi: the learner may be mid-session (check `ps` for a `pi` process and the mtime of `.learn/learner.json`). Tell them the running pi still has the old code and needs a restart.
6. Never write to `.learn/*` or `lessons/*` by hand while pi runs, except to fix a record the user asked about.
7. Remote: `origin` is the private `LevoSpacewars/learn`. Never push to `amosblomqvist/learn`.

## Gotchas

- pi loads each extension file as its own module instance: anything shared between extensions (prompt registry, UI lock, pedagogy state, phone widget) lives on `globalThis`.
- Project extensions do not load under `pi -p`; pass them with `-e`. `pi -p` hangs if stdin is an open pipe and, with phone-work loaded, never exits because of the open port.
- `ctx.ui.setWidget` with a `string[]` is truncated at 10 lines: use the component form.
- Gate text that says "not in thinking" trips the model's safeguard; word refusals as "reply in chat", never about the model's thinking.
- Skill text containing a literal `<learner>` once broke md-log's stripping; keep learner tags at line starts.
- `qrcode-terminal`'s small output is inverted (█ is a light module); `qrSvg()` in phone-work accounts for it.
- macOS has no `timeout`; use `perl -e 'alarm N; exec @ARGV'`.
- In a worktree the Claude Code sandbox refuses shell heredocs, `$PWD` and computed arguments to `sed`/`node`: use the Write/Edit tools and literal paths.
