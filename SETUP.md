# learn — setup and hosting

This repository is an Obsidian vault plus a `pi` configuration (`.pi/`) that turns pi into a personal tutor: lessons in `lessons/`, per-concept dossiers in `knowledge/`, learner state in `.learn/`, and a web surface (lesson viewer + answer pad + iPad scratchpad) served by pi itself.

## New machine (Mac or Linux/WSL)

```bash
git clone git@github.com:LevoSpacewars/learn.git ~/learn
cd ~/learn && bin/setup        # checks tools, installs extension deps, offers the whisper model
pi                              # first start creates .learn/phone-token for this machine
```

Then in pi: pick "Connect my phone (show the QR code)" in the start menu, or type `/phone`; either prints the links and QR code. Make sure Tailscale is running.

Sign in to **Claude Code** once on the machine that runs pi: `claude auth login --claudeai` (it prints a link; open it anywhere and paste the code back). The Claude bridge runs every turn through Claude Code, so this login is what bills your Claude subscription. Do not use pi's own `/login` or an `ANTHROPIC_API_KEY`: those bill the API instead. `claude auth status` should say `"authMethod": "claude.ai"`.

## Hosting on a server (PC at home, laptop + iPad remote)

The state (learner file, events, cards) lives where pi runs, so run pi in **one** place and connect to it. A Linux box or WSL on the PC is the recommended host; the subagent extension needs tmux, which Git Bash on Windows lacks.

1. On the server: clone, `bin/setup`, install and sign in to Tailscale, sign in to the Claude bridge.
2. Start the session: `bin/learn` (a tmux session named `learn` running pi). Detach with `Ctrl-b d`; it keeps running.
3. From the laptop: `ssh server` then `bin/learn` to re-attach to the same terminal. The terminal is optional: the start menu, every question and the tutor's replies are mirrored to the web page, so a phone or iPad alone can drive a whole session.
4. From any device on the tailnet, open the pad link (the server's Tailscale IP, port 8787, with the token from `.learn/phone-token` on the server). Use `&mode=viewer` on the laptop and `&mode=scratch` on the iPad.

### The current host: a Windows PC under WSL1

This vault runs on a Windows 10 PC whose BIOS has virtualization switched off, so WSL2 is not available; WSL1 works without it and is fast enough (tool calls take about 0.1 s). What was done, all over SSH:

1. Enable the WSL feature (`Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux`), reboot, then import Ubuntu as a WSL1 distro: `wsl --import Ubuntu C:/WSL/Ubuntu ubuntu-noble-wsl-amd64-wsl.rootfs.tar.gz --version 1` (rootfs from cloud-images.ubuntu.com/wsl). Create the user, set it as default in `/etc/wsl.conf` with `appendWindowsPath=false`.
2. In Ubuntu: `apt install tmux ffmpeg poppler-utils git build-essential cmake ripgrep fd-find`, Node 26 from nodejs.org, Claude Code (`npm i -g @anthropic-ai/claude-code`), pi at the same version as the lockfile in its managed layout (`~/.pi/agent/install/releases/<v>/`, which `.pi/tests` resolves pi's packages from), then `pi install npm:pi-claude-bridge` and `pi install https://github.com/amosblomqvist/pi-interactive-subagents`. Build whisper.cpp's `whisper-cli` from source. Then clone and `bin/setup`.
3. Install Tailscale for Windows and sign in from the command line (`tailscale up` prints a link). WSL1 sees the Windows adapters, so pi binds the page to the Tailscale address. Allow the page through the firewall from the tailnet only: `New-NetFirewallRule -DisplayName learn-pi-phone-8787 -Direction Inbound -Protocol TCP -LocalPort 8787 -RemoteAddress 100.64.0.0/10 -Action Allow`.
4. `~/.tmux.conf`: `set -g extended-keys on` and `set -g remain-on-exit on` (a crashed pi leaves its error on screen). A tmux session survives SSH logout under WSL1 but not a reboot: after a reboot, start it again with `bin/learn`.
5. On the laptop, an SSH alias that attaches straight to the session: `RemoteCommand ~/bin/learn` with `RequestTTY yes`, where the PC's Git Bash `~/bin/learn` runs `wsl.exe -d Ubuntu -- bash -lc "cd ~/learn && exec bin/learn"`.

Environment knobs: `PI_PHONE_PORT` (default 8787), `PI_PHONE_BIND` (override the bind address), `PI_WHISPER_MODEL`, `PI_GRADER_MODEL`, `PI_SIDECHAT_MODEL`, `PI_NOTEBOOK_MODEL`.

## Syncing

- `git push` from the machine that runs pi whenever you like (between sessions); the lessons, dossiers and learner state are the history of your learning. Other checkouts only pull.
- Do **not** run pi on two machines against the same vault at once: `.learn/*.json` would diverge. Move by pushing from one and pulling on the other.
- Never committed: `.learn/phone-token` (per machine), `.learn/tmp/`, `inbox/` (your papers; delete that line in `.gitignore` to version them), voice recordings, `node_modules/`.

## Layout

- `.pi/extensions/` — start-menu, review (cards, learner store, grader, pedagogy gates, book, side chat, notebook), recall, quiz, curriculum, md-log, plot, phone-work (web surface: `page.html`, `graph.html`, `scratch.js`)
- `.pi/skills/` — teach, review, curriculum, visualize
- `.pi/tests/` — unit tests and browser checks for the extensions, run outside pi (see its README)
- `.pi/themes/bright.json` — terminal theme
- `bin/setup`, `bin/learn` — setup and launcher
- `.claude/CLAUDE.md` — orientation for coding agents working on the harness (pi reads a root `CLAUDE.md`/`AGENTS.md` into the tutor's prompt, which is why it lives under `.claude/`)
- `book/` — one readable "book" per lesson, rebuilt from the readings the tutor has shown; `lessons/` are the raw session notes
- `notebook/` — your own handwritten notes (Notebook button on the page: a pen pad; `/note` in the terminal for typed ones). Pages are PNGs in `notebook/pages/`; one markdown file per note embeds them with frontmatter tags and a transcript, plus `Notebook.md`, the index by tag and lesson. Transcripts, titles, tags, summaries and links are written for you in the background (`PI_NOTEBOOK_MODEL` overrides the model)
