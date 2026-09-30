/**
 * start-menu — the only choice to make when opening pi: review, or learn
 * something new.
 *
 * On a fresh session (startup or /new, never on resume/reload/fork) it asks:
 *   • Review (N due)        — only offered when cards are due
 *   • Learn something new   — asks what, then starts the teach skill
 * Esc skips the menu and leaves a plain chat.
 *
 * Either choice creates a lesson note, links it with md-log, opens it in
 * Obsidian, and sends the first prompt — no commands to remember.
 *   learning → lessons/<topic-slug>.md (dated suffix if it already exists)
 *   review   → lessons/review-YYYY-MM-DD.md (reused for the day)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { countDue } from "./review/index.ts";

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 50) || "lesson"
	);
}

function lessonFile(cwd: string, topic: string): string {
	const dir = path.join(cwd, "lessons");
	const slug = slugify(topic);
	let file = path.join(dir, `${slug}.md`);
	if (fs.existsSync(file)) file = path.join(dir, `${slug}-${today()}.md`);
	for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${slug}-${today()}-${n}.md`);
	return file;
}

export default function startMenu(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	function openNote(ctx: any, file: string, title: string) {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		if (!fs.existsSync(file)) fs.writeFileSync(file, `# ${title}\n\n`, "utf8");
		pi.events.emit("md-log:link", { file, ctx });
		execFile("open", [`obsidian://open?path=${encodeURIComponent(file)}`], () => {});
	}

	async function run(ctx: any) {
		let due = 0;
		try {
			due = countDue(ctx.cwd);
		} catch {
			// unreadable cards.json — just don't offer review
		}
		const LEARN = "Learn something new";
		const REVIEW = `Review (${due} due)`;
		const choice = due > 0 ? await ctx.ui.select("What would you like to do?", [REVIEW, LEARN]) : LEARN;
		if (!choice) return;

		if (choice === REVIEW) {
			openNote(ctx, path.join(ctx.cwd, "lessons", `review-${today()}.md`), `Review — ${today()}`);
			pi.sendUserMessage(`/skill:review ${due} card(s) are due.`, { expandPromptTemplates: true });
			return;
		}

		const topic = (await ctx.ui.input("What do you want to learn?", "e.g. the Pythagorean theorem"))?.trim();
		if (!topic) return;
		openNote(ctx, lessonFile(ctx.cwd, topic), topic);
		pi.sendUserMessage(`/skill:teach Teach me: ${topic}`, { expandPromptTemplates: true });
	}

	pi.on("session_start", async (event, ctx: any) => {
		if (!ctx.hasUI) return;
		if (event.reason !== "startup" && event.reason !== "new") return;
		const hasMessages = ctx.sessionManager.getEntries().some((e: any) => e.type === "message");
		if (hasMessages) return;
		// Don't block session startup on the dialog.
		setTimeout(() => run(ctx).catch((e) => ctx.ui.notify(`start menu: ${e?.message ?? e}`, "error")), 0);
	});
}
