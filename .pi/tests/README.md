# Tests for the tutor extensions

Everything here runs the extension sources in `../extensions` **outside pi**: `register.mjs` installs a resolve hook (`hooks.mjs`) that maps pi's packages to the managed install under `~/.pi/agent/install/releases/<current-version>/`. Node 22+ runs the `.mts` files directly. No pi process, no API calls, except the `grader.live-*.mts` scripts.

```bash
cd .pi/tests
npm install          # once: typescript + @types/node (for typecheck only)
node run.mjs         # all *.test.mts; `node run.mjs gate judge` for a subset
node typecheck.mjs   # tsc over every extension entry point
```

The extension directories need their own `node_modules` (`bin/setup` installs them). In a git worktree, symlink them from the main checkout: `ln -s ~/learn/.pi/extensions/review/node_modules .pi/extensions/review/node_modules` (same for `phone-work` and `visual-tools`).

## Unit tests (`node run.mjs`)

| file | covers |
|---|---|
| `gate.test.mts`, `floor.test.mts`, `guard.test.mts` | recall.ts: text-part counting for the gate, the floor prompt, the turn-end guard |
| `judge.test.mts` | pedagogy.ts: `isMiss` (partial ≥ 0.6 is a minor gap), streaks, review mode, `clearMiss` |
| `ladder.test.mts` | pedagogy.ts: the practice ladder (next move → completion → check → derivation) |
| `flow.test.mts` | recall.ts + quiz.ts driven by a fake pi through a teach session: reading gate, floor, quiz streak, `say`, predict rules |
| `menu.test.mts` | start-menu.ts: last session note, "Next:" line, option ordering |
| `mdlog.test.mts` | md-log.ts: callouts written to the lesson note |
| `book.test.mts` | review/book.ts: readings log → `book/<slug>.md`, id stripping, session import |
| `phone.test.mts`, `qr.test.mts` | phone-work: QR show/hide on globalThis, `/qr.svg`, the Phone button; binds `127.0.0.1` on ports 8795/8796 |
| `notebook.test.mts` | review/notebook.ts: notes.jsonl fold, tagger with a fake runner (his title/tags win; handwritten pages handed over as files, transcript stored and searchable), `notebook/pages/*.png`, `notebook/*.md` + index, slice lines, the `/notebook` and `/note*` endpoints with a fake pi on port 8793 (pages saved, served, appended) |

## Browser checks (manual, need Chrome)

`fakeserver.mjs` serves `page.html` with a fake lesson and a fake pending prompt (`PENDING=read|say|predict`, `NOPENDING=1`, `PORT`, `ANSWERS` log) so the cards can be screenshotted and clicked without pi. `fakebook.mjs` does the same for the Book view (`VAULT=<vault>`). `page.test.mjs`, `idle.test.mjs`, `skip.test.mjs`, `pad.check.mjs` and `nb.check.mjs` (the Notebook panel against its own fake server on 8792, scratch engine inlined: draw strokes with the mouse, save, see the page and its transcript, add a page, edit, filter, search, phone width, "Note this") drive those with puppeteer-core from `visual-tools/node_modules` and headless Google Chrome; `shot.mjs <url> <out.png> [w h]` takes a screenshot; `mermaid.debug.mjs <url>` prints the page console. Headless Chrome's minimum window width is about 500px: narrower screenshots are cropped, not reflowed.

## Live grader (manual, calls the model)

`grader.live.mts`, `grader.live-reactions.mts`, `grader.live-concurrent.mts` run `review/grader.ts` for real (a separate `pi -p` per call, ~6 s each) on answers from past sessions: a substantively right answer must grade correct, a complaint must come back `attempted=false`, concurrent calls must not collide. Run with `node --import ./register.mjs grader.live.mts`. `notebook.live.mts` runs the real notebook tagger on a handwritten page synthesized with headless Chrome in a handwriting font (about 5 s): prints the transcript, tags and the markdown file.

## Tools

`backfill.mjs <vault> [sessionsDir]` recovers every reading shown in past pi sessions (`~/.pi/agent/sessions/<vault-key>/*.jsonl`) into `.learn/readings.jsonl` and rewrites `book/*.md`; the `/book import` command in pi does the same.

`tmp/` holds logs, screenshots and the generated tsconfig; it is gitignored.
