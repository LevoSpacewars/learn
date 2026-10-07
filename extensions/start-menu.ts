/**
 * start-menu — the only choices to make when opening pi: review, continue a
 * lesson, or learn something new — then how much time there is.
 *
 * On a fresh session (startup or /new, never on resume/reload/fork) it asks:
 *   • Review (N due)             — only offered when cards are due
 *   • Continue: <lesson> (k/n)   — one per open/paused lesson
 *   • Next on the path: …        — the scheduler's pick, with its reason
 *   • Bring something            — a paper (inbox/), idea, question, chapter
 *   • Learn something new        — asks what, then starts the teach skill
 *   • Set up my goals            — only until goals exist
 * then "How much time do you have?" (minutes; blank = no budget).
 * Esc skips the menu and leaves a plain chat.
 *
 * Every choice creates/reuses a lesson note, links it with md-log, opens it
 * in Obsidian, records the session in the learner file, and sends the first
 * prompt with a <learner> slice attached — no commands to remember.
 *   learning → lessons/<topic-slug>.md (dated suffix if it already exists)
 *   continue → the lesson's own note
 *   review   → lessons/review-YYYY-MM-DD.md (reused for the day)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { beginLearnSession, beginReviewSession, countDue, dueByTopic } from "./review/index.ts";
import { learnerSlice, loadLearner, nextOnPath, openLessons, slugify, touchGoal, upsertLesson } from "./review/store.ts";

function today(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function lessonFile(cwd: string, topic: string): string {
	const dir = path.join(cwd, "lessons");
	const slug = slugify(topic);
	let file = path.join(dir, `${slug}.md`);
	if (fs.existsSync(file)) file = path.join(dir, `${slug}-${today()}.md`);
	for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${slug}-${today()}-${n}.md`);
	return file;
}

function budgetLine(min: number | undefined): string {
	return min ? `Time budget: ${min} min.` : "No fixed time budget.";
}

// The learner slice is delivered as a hidden custom message (display: false)
// on the next agent start, so the terminal shows only the one-line prompt.
// Stashed on globalThis because pi isolates module state per extension file.
function stashSlice(text: string): string {
	(globalThis as any).__learnPendingSlice = text;
	return "";
}
function learnerBlock(text: string): string {
	return stashSlice(text);
}

export default function startMenu(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	function openNote(ctx: any, file: string, title: string) {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		if (!fs.existsSync(file)) fs.writeFileSync(file, `# ${title}\n\n`, "utf8");
		pi.events.emit("md-log:link", { file, ctx });
		if (!process.env.PI_LEARN_NO_OPEN) execFile("open", [`obsidian://open?path=${encodeURIComponent(file)}`], () => {});
	}

	async function askBudget(ctx: any): Promise<number | undefined> {
		const raw = (await ctx.ui.input("How much time do you have? (minutes, blank = open-ended)", "e.g. 30"))?.trim();
		if (!raw) return undefined;
		const n = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
		return Number.isFinite(n) && n > 0 ? n : undefined;
	}

	async function run(ctx: any) {
		let due = 0;
		try {
			due = countDue(ctx.cwd);
		} catch {
			// unreadable cards.json — just don't offer review
		}
		let open: ReturnType<typeof openLessons> = [];
		try {
			open = openLessons(loadLearner(ctx.cwd)).slice(0, 4);
		} catch {
			// unreadable learner.json — no continue options
		}

		const LEARN = "Learn something new";
		const REVIEW = `Review (${due} due)`;
		const BRING = "Bring something (paper, idea, question)";
		const SETUP = "Set up my goals (one-time)";
		const continues = open.map((l) => ({
			label: `Continue: ${l.title} (${l.nodes.length ? `${l.nodes.filter((n) => n.status === "confirmed").length}/${l.nodes.length}` : "still mapping"})`,
			lesson: l,
		}));
		let pick: ReturnType<typeof nextOnPath>[number] | undefined;
		let hasGoals = false;
		try {
			const store = loadLearner(ctx.cwd);
			hasGoals = store.goals.length > 0;
			pick = nextOnPath(store)[0];
		} catch {
			// no curriculum yet
		}
		const NEXT = pick
			? `Next on the path: ${pick.action === "learn" ? `learn ${pick.fundamental!.title}` : `attempt ${pick.milestone.title}`} (${pick.goal.title})`
			: undefined;
		const options = [...(due > 0 ? [REVIEW] : []), ...continues.map((c) => c.label), ...(NEXT ? [NEXT] : []), ...(hasGoals ? [BRING] : []), LEARN, ...(hasGoals ? [] : [SETUP])];
		const choice = await ctx.ui.select("What would you like to do?", options);
		if (!choice) return;

		if (choice === SETUP) {
			const budget = await askBudget(ctx);
			openNote(ctx, path.join(ctx.cwd, "lessons", `goals-${today()}.md`), "Goals");
			pi.sendUserMessage(`/skill:curriculum Set up my goals. ${budgetLine(budget)}${learnerBlock(learnerSlice(ctx.cwd))}`, { expandPromptTemplates: true });
			return;
		}

		if (NEXT && choice === NEXT && pick) {
			const budget = await askBudget(ctx);
			touchGoal(ctx.cwd, pick.goal.id);
			if (pick.action === "learn") {
				const slug = pick.fundamental!.slug;
				const existing = loadLearner(ctx.cwd).lessons.find((l) => l.slug === slug);
				const file = existing?.file && fs.existsSync(path.resolve(ctx.cwd, existing.file)) ? path.resolve(ctx.cwd, existing.file) : lessonFile(ctx.cwd, pick.fundamental!.title);
				openNote(ctx, file, pick.fundamental!.title);
				upsertLesson(ctx.cwd, { slug, title: pick.fundamental!.title, file: path.relative(ctx.cwd, file) });
				beginLearnSession(ctx.cwd, slug, budget);
				const slice = learnerSlice(ctx.cwd, { lesson: slug, topics: [slug, pick.goal.id], dueByTopic: dueByTopic(ctx.cwd) });
				pi.sendUserMessage(
					`/skill:teach Next on the path. ${pick.reason} Teach me: ${pick.fundamental!.title}. Use lesson slug "${slug}" and note "${path.relative(ctx.cwd, file)}". Motivate it from the milestone "${pick.milestone.title}" (goal ${pick.goal.id}). ${budgetLine(budget)}${learnerBlock(slice)}`,
					{ expandPromptTemplates: true },
				);
			} else {
				const slug = `m-${pick.goal.id}-${pick.milestone.id}`;
				const existing = loadLearner(ctx.cwd).lessons.find((l) => l.slug === slug);
				const file = existing?.file && fs.existsSync(path.resolve(ctx.cwd, existing.file)) ? path.resolve(ctx.cwd, existing.file) : lessonFile(ctx.cwd, `${pick.goal.id} ${pick.milestone.title}`);
				openNote(ctx, file, pick.milestone.title);
				upsertLesson(ctx.cwd, { slug, title: pick.milestone.title, file: path.relative(ctx.cwd, file) });
				beginLearnSession(ctx.cwd, slug, budget);
				const slice = learnerSlice(ctx.cwd, { lesson: slug, topics: [pick.goal.id, ...pick.milestone.needs], dueByTopic: dueByTopic(ctx.cwd) });
				pi.sendUserMessage(
					`/skill:teach Next on the path. ${pick.reason} Milestone attempt: "${pick.milestone.title}" (goal ${pick.goal.id}, milestone ${pick.milestone.id}, kind ${pick.milestone.kind}).${pick.milestone.description ? ` Done means: ${pick.milestone.description}` : ""} Use lesson slug "${slug}" and note "${path.relative(ctx.cwd, file)}". ${budgetLine(budget)}${learnerBlock(slice)}`,
					{ expandPromptTemplates: true },
				);
			}
			return;
		}

		if (choice === BRING) {
			const text = (await ctx.ui.input("What did you bring?", "a file in inbox/, a URL, a question, an idea…"))?.trim();
			if (!text) return;
			const budget = await askBudget(ctx);
			const file = lessonFile(ctx.cwd, text.replace(/^inbox\//, "").replace(/\.[a-z0-9]+$/i, ""));
			const slug = path.basename(file, ".md");
			openNote(ctx, file, text);
			upsertLesson(ctx.cwd, { slug, title: text.slice(0, 80), file: path.relative(ctx.cwd, file) });
			beginLearnSession(ctx.cwd, slug, budget);
			const slice = learnerSlice(ctx.cwd, { topics: slug.split("-").filter((w) => w.length > 3), dueByTopic: dueByTopic(ctx.cwd) });
			pi.sendUserMessage(
				`/skill:teach Bring: ${text}. Use lesson slug "${slug}" and note "${path.relative(ctx.cwd, file)}". ${budgetLine(budget)}${learnerBlock(slice)}`,
				{ expandPromptTemplates: true },
			);
			return;
		}

		if (choice === REVIEW) {
			const budget = await askBudget(ctx);
			openNote(ctx, path.join(ctx.cwd, "lessons", `review-${today()}.md`), `Review — ${today()}`);
			const s = beginReviewSession(ctx.cwd, budget);
			const slice = learnerSlice(ctx.cwd, { dueByTopic: dueByTopic(ctx.cwd) });
			pi.sendUserMessage(
				`/skill:review ${due} card(s) are due. ${budgetLine(budget)}${s.unaided ? " This is an UNAIDED test session." : ""}${learnerBlock(slice)}`,
				{ expandPromptTemplates: true },
			);
			return;
		}

		const cont = continues.find((c) => c.label === choice);
		if (cont) {
			const budget = await askBudget(ctx);
			const l = cont.lesson;
			const file = l.file && fs.existsSync(path.resolve(ctx.cwd, l.file)) ? path.resolve(ctx.cwd, l.file) : lessonFile(ctx.cwd, l.title);
			if (!l.file) upsertLesson(ctx.cwd, { slug: l.slug, file: path.relative(ctx.cwd, file) });
			openNote(ctx, file, l.title);
			beginLearnSession(ctx.cwd, l.slug, budget);
			const slice = learnerSlice(ctx.cwd, { lesson: l.slug, dueByTopic: dueByTopic(ctx.cwd) });
			pi.sendUserMessage(
				`/skill:teach Continue the lesson "${l.title}" (slug: ${l.slug}). ${budgetLine(budget)}${learnerBlock(slice)}`,
				{ expandPromptTemplates: true },
			);
			return;
		}

		const topic = (await ctx.ui.input("What do you want to learn?", "e.g. the Pythagorean theorem"))?.trim();
		if (!topic) return;
		const budget = await askBudget(ctx);
		const file = lessonFile(ctx.cwd, topic);
		const slug = path.basename(file, ".md");
		openNote(ctx, file, topic);
		upsertLesson(ctx.cwd, { slug, title: topic, file: path.relative(ctx.cwd, file) });
		beginLearnSession(ctx.cwd, slug, budget);
		const slice = learnerSlice(ctx.cwd, { topics: slug.split("-").filter((w) => w.length > 3), dueByTopic: dueByTopic(ctx.cwd) });
		pi.sendUserMessage(
			`/skill:teach Teach me: ${topic}. Use lesson slug "${slug}" and note "${path.relative(ctx.cwd, file)}". ${budgetLine(budget)}${learnerBlock(slice)}`,
			{ expandPromptTemplates: true },
		);
	}

	pi.on("before_agent_start", async () => {
		const g = globalThis as any;
		const slice = g.__learnPendingSlice as string | undefined;
		if (!slice) return undefined;
		g.__learnPendingSlice = undefined;
		return { message: { customType: "learner-slice", content: `<learner>\n${slice}\n</learner>`, display: false } };
	});

	pi.on("session_start", async (event, ctx: any) => {
		if (!ctx.hasUI) return;
		if (event.reason !== "startup" && event.reason !== "new") return;
		const hasMessages = ctx.sessionManager.getEntries().some((e: any) => e.type === "message");
		if (hasMessages) return;
		// Don't block session startup on the dialog.
		setTimeout(() => run(ctx).catch((e) => ctx.ui.notify(`start menu: ${e?.message ?? e}`, "error")), 0);
	});
}
