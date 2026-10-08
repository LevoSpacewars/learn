# learn — setup and hosting

This repository is an Obsidian vault plus a `pi` configuration (`.pi/`) that turns pi into a personal tutor: lessons in `lessons/`, per-concept dossiers in `knowledge/`, learner state in `.learn/`, and a web surface (lesson viewer + answer pad + iPad scratchpad) served by pi itself.

## New machine (Mac or Linux/WSL)

```bash
git clone git@github.com:LevoSpacewars/learn.git ~/learn
cd ~/learn && bin/setup        # checks tools, installs extension deps, offers the whisper model
pi                              # first start creates .learn/phone-token for this machine
```

Then in pi: `/phone` prints the links and QR code. Sign in to the Claude bridge once (`pi` will prompt) and make sure Tailscale is running.

## Hosting on a server (PC at home, laptop + iPad remote)

The state (learner file, events, cards) lives where pi runs, so run pi in **one** place and connect to it. A Linux box or WSL on the PC is the recommended host; the subagent extension needs tmux, which Git Bash on Windows lacks.

1. On the server: clone, `bin/setup`, install and sign in to Tailscale, sign in to the Claude bridge.
2. Start the session: `bin/learn` (a tmux session named `learn` running pi). Detach with `Ctrl-b d`; it keeps running.
3. From the laptop: `ssh server` then `bin/learn` to re-attach to the same terminal (the start menu and the few free-text questions still live there).
4. From any device on the tailnet, open the pad link (the server's Tailscale IP, port 8787, with the token from `.learn/phone-token` on the server). Use `&mode=viewer` on the laptop and `&mode=scratch` on the iPad.

Environment knobs: `PI_PHONE_PORT` (default 8787), `PI_PHONE_BIND` (override the bind address), `PI_WHISPER_MODEL`, `PI_GRADER_MODEL`.

## Syncing

- `git push` from the machine that runs pi whenever you like; the lessons, dossiers and learner state are the history of your learning.
- Do **not** run pi on two machines against the same vault at once: `.learn/*.json` would diverge. Move by pushing from one and pulling on the other.
- Never committed: `.learn/phone-token` (per machine), `.learn/tmp/`, `inbox/` (your papers; delete that line in `.gitignore` to version them), voice recordings, `node_modules/`.

## Layout

- `.pi/extensions/` — start-menu, review (cards, learner store, grader, prompts), recall, quiz, curriculum, md-log, phone-work (web surface: `page.html`, `scratch.js`)
- `.pi/skills/` — teach, review, curriculum
- `.pi/themes/bright.json` — terminal theme
- `bin/setup`, `bin/learn` — setup and launcher
