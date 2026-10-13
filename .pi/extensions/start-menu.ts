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
 * The last session's closing note steers the order: its "Next:" line is shown
 * under the title, and when it points at new material / the open lesson, that
 * option comes first (preselected) and Review moves after it.
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
import { type LearnerStore, buildGraph, currentSession, learnerSlice, loadLearner, nextOnPath, openLessons, slugify, touchGoal, upsertLesson } from "./review/store.ts";
import { webInput, webSelect } from "./review/ui.ts";

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

// ── The last session's "Next:" line steers the menu ──────────────────────

/** The closing note of the most recent session that has one. */
export function lastSessionNote(store: Pick<LearnerStore, "sessions">): string | undefined {
	for (let i = store.sessions.length - 1; i >= 0; i--) if (store.sessions[i].note?.trim()) return store.sessions[i].note!.trim();
	return undefined;
}

/** The note's "Next: …" sentence (the last one, if several), or undefined. */
export function nextLine(note: string | undefined): string | undefined {
	if (!note) return undefined;
	const all = [...note.matchAll(/\bnext(?: steps?)?\s*:\s*([^\n]+)/gi)];
	const m = all.at(-1);
	return m ? `Next: ${m[1].trim()}` : undefined;
}

const NEW_MATERIAL = /\bnew (?:material|ideas?|topics?|concepts?|content|nodes?)\b|\b(?:open|next) lesson\b|\bcontinue (?:the )?lesson\b|\blead with\b|\bnext on the path\b|\bmilestones?\b|\bstart (?:the )?lesson\b/i;
const STOP = new Set(["the", "and", "from", "last", "lesson", "continue", "let", "with", "for", "new", "next", "path"]);

/** Does the line name this lesson (its slug, its title, or most of its distinctive slug words)? */
export function namesLesson(line: string, l: { slug: string; title?: string }): boolean {
	const low = line.toLowerCase();
	if (low.includes(l.slug.toLowerCase())) return true;
	if (l.title && l.title.length >= 6 && low.includes(l.title.toLowerCase())) return true;
	const words = new Set(low.split(/[^a-z0-9]+/).filter(Boolean));
	const toks = l.slug.toLowerCase().split("-").filter((t) => t.length >= 3 && !STOP.has(t));
	if (toks.length === 0) return false;
	const hit = toks.filter((t) => words.has(t)).length;
	return hit >= Math.min(2, toks.length);
}

/**
 * Which menu option the "Next:" line points at, if any: a named lesson's
 * Continue option, the Next-on-the-path option when its title is named, or for
 * "new material" generally the first Continue option (else Next on the path).
 */
export function preferredOption(
	line: string | undefined,
	o: { continues: Array<{ label: string; slug: string; title?: string }>; next?: { label: string; titles: string[] } },
): string | undefined {
	if (!line) return undefined;
	const named = o.continues.find((c) => namesLesson(line, c));
	if (named) return named.label;
	if (o.next && o.next.titles.some((t) => t && line.toLowerCase().includes(t.toLowerCase()))) return o.next.label;
	if (NEW_MATERIAL.test(line)) return o.continues[0]?.label ?? o.next?.label;
	return undefined;
}

/** Put the preferred option first and Review right after it; everything else keeps its order. */
export function orderOptions(options: string[], preferred: string | undefined, review: string | undefined): string[] {
	if (!preferred || !options.includes(preferred)) return options;
	const rest = options.filter((x) => x !== preferred && x !== review);
	const hasReview = review !== undefined && options.includes(review);
	return [preferred, ...(hasReview ? [review!] : []), ...rest];
}

export default function startMenu(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	function openNote(ctx: any, file: string, title: string) {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		if (!fs.existsSync(file)) fs.writeFileSync(file, `# ${title}\n\n`, "utf8");
		pi.events.emit("md-log:link", { file, ctx });
		if (!process.env.PI_LEARN_NO_OPEN && process.platform === "darwin") execFile("open", [`obsidian://open?path=${encodeURIComponent(file)}`], () => {});
	}

	async function askBudget(ctx: any): Promise<number | undefined> {
		const raw = (await webInput(ctx, "How much time do you have? (minutes, blank = open-ended)", "e.g. 30"))?.trim();
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
		const ORIENT = "Get oriented (summary + knowledge map)";
		const REVIEW = `Review (${due} due)`;
		const BRING = "Bring something (paper, idea, question)";
		const SETUP = "Set up my goals (one-time)";
		const continues = open.map((l) => ({
			label: `Continue: ${l.title} (${l.nodes.length ? `${l.nodes.filter((n) => n.status === "confirmed").length}/${l.nodes.length}` : "still mapping"})`,
			lesson: l,
		}));
		let pick: ReturnType<typeof nextOnPath>[number] | undefined;
		let hasGoals = false;
		let lastNext: string | undefined;
		try {
			const store = loadLearner(ctx.cwd);
			hasGoals = store.goals.length > 0;
			lastNext = nextLine(lastSessionNote(store));
			pick = nextOnPath(store)[0];
		} catch {
			// no curriculum yet
		}
		const NEXT = pick
			? `Next on the path: ${pick.action === "learn" ? `learn ${pick.fundamental!.title}` : `attempt ${pick.milestone.title}`} (${pick.goal.title})`
			: undefined;
		const preferred = preferredOption(lastNext, {
			continues: continues.map((c) => ({ label: c.label, slug: c.lesson.slug, title: c.lesson.title })),
			next: NEXT && pick ? { label: NEXT, titles: [pick.fundamental?.title ?? "", pick.milestone.title, pick.fundamental?.slug ?? ""] } : undefined,
		});
		const options = orderOptions(
			[...(due > 0 ? [REVIEW] : []), ...continues.map((c) => c.label), ...(NEXT ? [NEXT] : []), ...(hasGoals ? [BRING] : []), LEARN, ORIENT, ...(hasGoals ? [] : [SETUP])],
			preferred,
			due > 0 ? REVIEW : undefined,
		);
		const choice = await webSelect(ctx, `What would you like to do?${lastNext ? `\n\nLast session — ${lastNext}` : ""}`, options);
		if (!choice) return;

		if (choice === ORIENT) {
			const g = buildGraph(ctx.cwd);
			const file = path.join(ctx.cwd, "knowledge", "_orientation.md");
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, `# Orientation — ${today()}\n\n${g.summary}\n\n(Knowledge map: open the web surface and tap Map, or /phone for the link.)\n`, "utf8");
			const sh = (globalThis as any).__learnPhone as { url?: string; localUrl?: string } | undefined;
			const link = sh?.localUrl?.replace("/?t=", "/graph?t=") ?? sh?.url?.replace("/?t=", "/graph?t=");
			if (link && !process.env.PI_LEARN_NO_OPEN) execFile(process.platform === "darwin" ? "open" : "xdg-open", [link], () => {});
			ctx.ui.notify(`${g.summary.split("\n").slice(0, 12).join("\n")}\n\nFull orientation: knowledge/_orientation.md${link ? `\nMap: ${link}` : ""}`, "info");
			// Offer the menu again so this doesn't end the session.
			setTimeout(() => run(ctx).catch(() => {}), 0);
			return;
		}

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
			const text = (await webInput(ctx, "What did you bring?", "a file in inbox/, a URL, a question, an idea…"))?.trim();
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

		const topic = (await webInput(ctx, "What do you want to learn?", "e.g. the Pythagorean theorem"))?.trim();
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

	// "End recall → lesson": the learner stopped the recall phase mid-check and
	// wants to be taught. Start a lesson straight away, no menus: the lesson of the
	// current learn session, else the most recent open lesson, else next on the
	// path. Queued as a follow-up so it runs right after the current turn.
	const NO_RECALL =
		"RECALL PHASE ENDED BY THE LEARNER: he wants to learn something new now. No warm-up re-check, no review cards, no checks on earlier nodes. Go straight to teaching the first pending (new) node.";
	(globalThis as any).__learnStartLesson = (ctx: any): string => {
		const send = (text: string) => pi.sendUserMessage(text, { deliverAs: "followUp", expandPromptTemplates: true } as any);
		const store = loadLearner(ctx.cwd);
		const cur = currentSession(ctx.cwd, store);
		const open = openLessons(store);
		const lesson = (cur?.kind === "learn" && cur.lesson ? store.lessons.find((l) => l.slug === cur.lesson && l.status !== "done") : undefined) ?? open[0];
		if (lesson) {
			const file = lesson.file && fs.existsSync(path.resolve(ctx.cwd, lesson.file)) ? path.resolve(ctx.cwd, lesson.file) : lessonFile(ctx.cwd, lesson.title);
			if (!lesson.file) upsertLesson(ctx.cwd, { slug: lesson.slug, file: path.relative(ctx.cwd, file) });
			openNote(ctx, file, lesson.title);
			beginLearnSession(ctx.cwd, lesson.slug);
			const slice = learnerSlice(ctx.cwd, { lesson: lesson.slug, dueByTopic: dueByTopic(ctx.cwd) });
			send(`/skill:teach Continue the lesson "${lesson.title}" (slug: ${lesson.slug}). ${NO_RECALL}${learnerBlock(slice)}`);
			return `lesson "${lesson.title}"`;
		}
		const pick = nextOnPath(store)[0];
		if (pick && pick.action === "learn") {
			touchGoal(ctx.cwd, pick.goal.id);
			const slug = pick.fundamental!.slug;
			const existing = store.lessons.find((l) => l.slug === slug);
			const file = existing?.file && fs.existsSync(path.resolve(ctx.cwd, existing.file)) ? path.resolve(ctx.cwd, existing.file) : lessonFile(ctx.cwd, pick.fundamental!.title);
			openNote(ctx, file, pick.fundamental!.title);
			upsertLesson(ctx.cwd, { slug, title: pick.fundamental!.title, file: path.relative(ctx.cwd, file) });
			beginLearnSession(ctx.cwd, slug);
			const slice = learnerSlice(ctx.cwd, { lesson: slug, topics: [slug, pick.goal.id], dueByTopic: dueByTopic(ctx.cwd) });
			send(`/skill:teach Next on the path. ${pick.reason} Teach me: ${pick.fundamental!.title}. Use lesson slug "${slug}" and note "${path.relative(ctx.cwd, file)}". Motivate it from the milestone "${pick.milestone.title}" (goal ${pick.goal.id}). ${NO_RECALL}${learnerBlock(slice)}`);
			return `"${pick.fundamental!.title}" (next on the path)`;
		}
		if (pick) {
			touchGoal(ctx.cwd, pick.goal.id);
			const slug = `m-${pick.goal.id}-${pick.milestone.id}`;
			const existing = store.lessons.find((l) => l.slug === slug);
			const file = existing?.file && fs.existsSync(path.resolve(ctx.cwd, existing.file)) ? path.resolve(ctx.cwd, existing.file) : lessonFile(ctx.cwd, `${pick.goal.id} ${pick.milestone.title}`);
			openNote(ctx, file, pick.milestone.title);
			upsertLesson(ctx.cwd, { slug, title: pick.milestone.title, file: path.relative(ctx.cwd, file) });
			beginLearnSession(ctx.cwd, slug);
			const slice = learnerSlice(ctx.cwd, { lesson: slug, topics: [pick.goal.id, ...pick.milestone.needs], dueByTopic: dueByTopic(ctx.cwd) });
			send(`/skill:teach Next on the path. ${pick.reason} Milestone attempt: "${pick.milestone.title}" (goal ${pick.goal.id}, milestone ${pick.milestone.id}, kind ${pick.milestone.kind}).${pick.milestone.description ? ` Done means: ${pick.milestone.description}` : ""} Use lesson slug "${slug}" and note "${path.relative(ctx.cwd, file)}". ${NO_RECALL}${learnerBlock(slice)}`);
			return `"${pick.milestone.title}" (next on the path)`;
		}
		send(`/skill:teach ${NO_RECALL} There is no open lesson and no path yet: ask him with ask_user_question what he wants to learn, then teach it.`);
		return "a new lesson";
	};

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
