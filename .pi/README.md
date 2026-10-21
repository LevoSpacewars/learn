# .pi — the tutor's pi configuration

This directory turns [pi](https://github.com/earendil-works/pi) into a personal tutor for the Obsidian vault one level up. It started from Amos Blomqvist's [learn](https://github.com/amosblomqvist/learn) setup (the teach skill, `ask-user-question`, `quiz`, `md-log`, `visual-tools` and the subagent definitions) and has since grown its own review/curriculum layer, a web surface for phone and iPad, and tests. Setup and hosting are in `../SETUP.md`; the layout and the rules for changing anything are in `../.claude/CLAUDE.md`.

- `skills/` — teach, review, curriculum, visualize: the pedagogy as prompts
- `extensions/` — the tools and gates (start-menu, recall, quiz, review/, phone-work/, md-log, curriculum, plot, ask-user-question, visual-tools)
- `agents/` — researcher, svg-maker, mermaid-maker subagents
- `tests/` — unit tests and browser checks, run outside pi
- `themes/bright.json`, `settings.json` — terminal theme and the driver model
