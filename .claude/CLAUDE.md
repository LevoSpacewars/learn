# Working on the tutor harness

This repo is one person's Obsidian vault plus the `pi` configuration (`.pi/`) that turns pi 0.87 into their tutor. The learner is the repo owner; the "tutor" is pi running the teach/review skills with the extensions below. Read this before changing anything under `.pi/`.

This file lives under `.claude/` on purpose: pi loads any `CLAUDE.md` or `AGENTS.md` at the vault root into the tutor's system prompt. Never create one there.

## Where it runs (since 2026-10-28)

There are two checkouts of this repo. Know which one you are in.

- **Live vault: the Windows desktop `tvdesktop`, inside WSL1 Ubuntu 24.04, at `/home/alex/learn`.** pi runs there in the tmux session `learn` (`bin/learn`), and the phone/iPad page is served on its Tailscale address `100.80.194.22:8787`. All learner state (`.learn/`, `lessons/`, `knowledge/`, `book/`, `work/`, `viz/`) is written there and committed from there. The PC's BIOS has virtualization off, so it is WSL**1**: no WSL2, no Docker.
- **Development checkout: the Mac, `~/learn`.** Code changes are made and tested here (worktrees, unit tests, browser checks with Chrome). pi does not run here any more; never start it on the Mac, or `.learn/*.json` diverges from the desktop's. The Mac's `main` holds no learning data of its own: keep it clean and pull before you branch.
- `origin` is the private `LevoSpacewars/learn` on GitHub. Both machines push to it over SSH. Never push to `amosblomqvist/learn`.

Reaching the desktop from the Mac: `ssh desktop` on the LAN, `ssh desktop-remote` from anywhere (`papapoff.tplinkdns.com:42022`), or Tailscale `ssh -p 42022 alex@100.80.194.22`. These land in **Git Bash on Windows**, not in Linux. Run Linux commands with `MSYS_NO_PATHCONV=1 wsl.exe -d Ubuntu -- bash -lc '...'`. Quoting through ssh → Git Bash → wsl eats `$`, backslashes and nested quotes, so for anything longer than one command, write a script, `scp` it to `desktop-remote:C:/WSL/scratch/`, and run `wsl.exe -d Ubuntu -- bash -l /mnt/c/WSL/scratch/<script>.sh`. Delete your scripts when you are done. `ssh learn-desktop` (Mac alias) attaches the learner to the tutor.

## Layout

- `.pi/extensions/` — the harness. `start-menu.ts` (review / continue / learn new / next on the path; injects the `<learner>` slice), `recall.ts` (free-recall tool: typed, photo or voice answers, graded by a separate process; also `lesson_read` and the gate hooks), `quiz.ts`, `md-log.ts` (writes Obsidian callouts into `lessons/*.md`), `curriculum.ts`, `plot.ts` (SVG function plots into `viz/`), `ask-user-question.ts`.
- `.pi/extensions/review/` — `index.ts` (FSRS cards, `review_due`, `review_add_cards`, `lesson_plan`, `lesson_node`, `session_close`), `store.ts` (learner.json: lessons, goals, fundamentals, misconceptions, sessions, events log), `pedagogy.ts` (every gate: floor, reading, miss, predict, owed reply, node-id check, practice ladder, review one-ask rule; state on `globalThis.__learnPedagogy`), `grader.ts` (context-free grader: `pi -p --no-extensions`, model `PI_GRADER_MODEL`), `book.ts` (readings → `book/<slug>.md`), `sidechat.ts` (side questions answered from lesson material only), `notebook.ts` (his handwritten notes: pages in `notebook/pages/`, store, background reader/tagger in a separate `pi -p` that transcribes the pages, `notebook/*.md` + `Notebook.md` index, the `notebook` tool and `/note`), `prompts.ts` (pending-prompt registry shared with the web page), `ui.ts`, `plainmath.ts`.
- `.pi/extensions/phone-work/` — the web surface on port 8787 (`PI_PHONE_PORT`, `PI_PHONE_BIND`): `page.html` (lesson viewer, answer pad, drawing canvas, start menu, side chat, Book, Notebook; re-read on every page load, so page-only changes need no pi restart), `graph.html` (knowledge map), `scratch.js`. Token in `.learn/phone-token`.
- `.pi/extensions/visual-tools/` — Mermaid/SVG tools for the subagents (needs Chrome or Chromium for `mmdc`).
- `.pi/skills/` — teach, review, curriculum, visualize. Prompts and code share the pedagogy: the code refuses what the skill forbids, so change both together.
- `.pi/tests/` — unit tests, browser checks and live grader checks, run outside pi. See its README.
- Data (all in the vault, committed from the desktop): `.learn/learner.json` (machine index), `.learn/events.jsonl` (append-only log of graded answers), `.learn/cards.json` (FSRS), `.learn/readings.jsonl`, `.learn/sidechat.jsonl`, `.learn/notes.jsonl`; `lessons/` (session notes), `knowledge/` (per-concept dossiers regenerated from events), `book/`, `notebook/` (his notes, rebuilt from notes.jsonl), `work/` (answer photos), `viz/`, `inbox/` (papers, ignored).
- pi session transcripts are on the desktop: `/home/alex/.pi/agent/sessions/--home-alex-learn--/*.jsonl` (older Mac ones: `~/.pi/agent/sessions/--Users-alexanderpatapoff-learn--/`). They are the evidence for how a session actually went; read them before changing pedagogy.

## Decisions that are settled (do not reintroduce)

- No clock anywhere: no time budgets, no latency, no pace. The learner walks away mid-answer and comes back.
- No confidence ratings. Legacy `confidence`, `latencyMs`, `calibration`, `budgetMin` fields in store.ts and quiz.ts stay only so old files parse.
- Nothing the learner reads may contain a node id like `D3` or `n2`; use the node's label. `pedagogy.ts` refuses tool calls that leak one.
- After a miss: explain, then retry or drill down. Never move on. The grader diagnoses; the tutor is the final judge of a grade.
- Reading before testing: a node's `lesson_read` must be shown (and read) before recall/quiz on it; then the practice ladder (next move → completion → assigned check → derivation on paper).
- Reactions and complaints are not answers (`attempted=false`), not misses.
- Keep all goals; the review pile is fine; one predict per lesson.
- **He answers in math, not prose (2026-11-03).** An equation or derivation step is a complete explanation; never require sentences, his "own words" or a named concept on top of correct math. Questions are phrased so an equation, a number or one line answers them. The grader prompt says so ("Math is an explanation"), and so do the review and teach skills.
- **One ask per card, graded on its core (2026-11-03).** No (a)/(b) parts or side asks (label each term, name the structure, invent a wrong answer that passes). `recall` refuses multi-part prompts for review cards and `review_add_cards` refuses multi-part fronts; the grader grades the main ask and treats side asks as notes. A MINOR GAP (partial ≥ `MISS_SCORE` 0.6) schedules as `good`, not `hard`. At most one paper problem per review batch; the other problem cards and all retries are QUICK one-line checks. This came from a review where four multi-part cards took an hour and all came back partial while the core was right each time.
- Driver model is set in `.pi/settings.json`; the grader defaults to `claude-bridge/claude-opus-5-5`. The bridge uses his Claude subscription through Claude Code's own login (`claude auth login --claudeai`), never pi's `/login` or an API key.

## How to change it

1. On the Mac, `git pull --ff-only` in `~/learn`, then work on a branch in a worktree (`.claude/worktrees/<name>`, gitignored). Symlink `node_modules` into `.pi/extensions/{review,phone-work,visual-tools}` and `.pi/tests` from the main checkout. The links are ignored; still, look at the full `git status` before every commit (never filter it with `grep -v node_modules`).
2. `cd .pi/tests && node run.mjs && node typecheck.mjs`. Both must be clean. Add a test for any new gate or tool rule; the fake-pi pattern is in `flow.test.mts`. For page changes also run `node browser.mjs` (headless Chrome, fake servers).
3. For UI changes, screenshot `page.html` with `fakeserver.mjs` + `shot.mjs`. For a change to what the grader accepts, run the matching `grader.live-*.mts` (calls the model). For anything the model does in a session, run a throwaway vault (`PI_LEARN_NO_OPEN=1 PI_PHONE_PORT=8799`, `.pi` symlinked) in tmux and drive it with `tmux send-keys`.
4. Commit, fast-forward `main` yourself (`git merge --ff-only`) and push `main`. Delete the branch and worktree afterwards so the next agent does not find them.
5. Deploy to the live vault: on the desktop, `cd ~/learn && git pull --ff-only origin main`. If a pull touches a `package.json`, rerun `bin/setup` there (answer `n` to the whisper prompt) and `node run.mjs` there.
6. Restart pi only when he is not in a session: no client attached (`tmux list-clients` is empty), and `.learn/learner.json` and the newest session file have not changed for a while. Then `tmux kill-session -t learn; cd ~/learn && tmux new-session -d -s learn pi` and check the pane for `Failed to load extension`. Otherwise tell him the running pi has the old code and that `Ctrl-b d`, `ssh desktop-remote learn stop`, `ssh learn-desktop` restarts it. Page-only changes (`page.html`) need only a page reload.
7. Learning state is committed from the desktop, not the Mac: `git add -A .learn lessons knowledge book work viz notebook` (only the folders that exist), commit `Learning state: …`, push. Do it between sessions. Never write to `.learn/*` or `lessons/*` by hand while pi runs, except to fix a record the user asked about.

## The desktop host

- WSL1 sees the Windows network adapters, so pi finds the Tailscale address (adapter `eth2`) and binds the phone page there. Windows Firewall rule `learn-pi-phone-8787` allows TCP 8787 from `100.64.0.0/10` only.
- `~/.tmux.conf` there sets `extended-keys on` (pi asks for it) and `remain-on-exit on`: if pi dies, the pane stays open with its last output and exit status instead of vanishing.
- `CLAUDE_BRIDGE_DEBUG=1` is exported in the desktop's `~/.profile` (since 2026-10-29) to catch a one-off 56 s stall before Claude Code started. Logs: `~/.pi/agent/claude-bridge.log`, `~/.pi/agent/cc-cli-logs/`. Remove the line once that is understood or gone.
- Measured on 2026-10-31: tool calls inside WSL take about 0.1 s; a model step takes a median of about 12 s on both the Mac and the desktop. "It's slow" is usually model time or the page, not WSL.
- The desktop also hosts the Valheim server (`gs`, Task Scheduler as user `gameserver`). Do not reboot it without asking him.
- In these agent sessions the permission classifier refuses installers (`msiexec`), firewall rules, reboots and `git push --delete`. Give him the exact command to run with `!` instead of working around it.

## Gotchas

- pi loads each extension file as its own module instance: anything shared between extensions (prompt registry, UI lock, pedagogy state, phone widget) lives on `globalThis`.
- Project extensions do not load under `pi -p`; pass them with `-e`. `pi -p` hangs if stdin is an open pipe and, with phone-work loaded, never exits because of the open port.
- pi exits at once with code 0 and `Failed to load extension … Cannot find module` when an extension's `node_modules` is missing: rerun `bin/setup`. (On 2026-11-03 a commit carried a worktree's node_modules symlinks and the desktop pull replaced the real folders; `.gitignore` now says `node_modules` without the slash so links are ignored too.)
- `ctx.ui.setWidget` with a `string[]` is truncated at 10 lines: use the component form.
- Gate text that says "not in thinking" trips the model's safeguard; word refusals as "reply in chat", never about the model's thinking.
- Skill text containing a literal `<learner>` once broke md-log's stripping; keep learner tags at line starts.
- `qrcode-terminal`'s small output is inverted (█ is a light module); `qrSvg()` in phone-work accounts for it.
- The lesson page re-renders on every tutor write. It patches only changed blocks and caches rendered math; lazy-loading images and `content-visibility` were measured and made iPad scrolling worse. Keep them out.
- macOS has no `timeout`; use `perl -e 'alarm N; exec @ARGV'` (works on the desktop too).
- In a worktree the Claude Code sandbox refuses shell heredocs, `$PWD` and computed arguments to `sed`/`node`: use the Write/Edit tools and literal paths.
