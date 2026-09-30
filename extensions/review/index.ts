/**
 * review — spaced review for what was learned in past lessons.
 *
 * Cards are created by the teacher during lessons (review_add_cards) and
 * scheduled with FSRS (ts-fsrs). `/review` starts an AI-run review session:
 * the teacher pulls due cards (review_due), poses each one in whatever
 * modality fits (quiz, typed answer, or a photo of handwritten work from the
 * phone), grades honestly, and reschedules it (review_grade).
 *
 * Storage: <cwd>/.learn/cards.json — a dot folder, so Obsidian ignores it.
 * Writes are atomic (tmp + rename).
 *
 * Commands:
 *   /review [topic]  — start a review session (all due cards, or one topic)
 *   /review-stats    — card counts per topic and what's due when
 *
 * Not loaded into subagents: they never see these tools.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import { type Card as FsrsCard, Rating, State, createEmptyCard, fsrs, generatorParameters } from "ts-fsrs";

type CardKind = "recall" | "problem";
type RatingName = "again" | "hard" | "good" | "easy";

interface ReviewCard {
	id: string;
	front: string;
	back: string;
	kind: CardKind;
	topic: string;
	lesson?: string;
	created: string;
	fsrs: FsrsCard;
	history: Array<{ at: string; rating: RatingName; note?: string }>;
}

interface Store {
	version: 1;
	cards: ReviewCard[];
}

const RATINGS: Record<RatingName, Rating> = {
	again: Rating.Again,
	hard: Rating.Hard,
	good: Rating.Good,
	easy: Rating.Easy,
};

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }));

function storePath(cwd: string): string {
	return path.join(cwd, ".learn", "cards.json");
}

// JSON turns FSRS dates into strings; revive them before scheduling.
function reviveCard(c: any): FsrsCard {
	return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

function load(cwd: string): Store {
	const file = storePath(cwd);
	if (!fs.existsSync(file)) return { version: 1, cards: [] };
	const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Store;
	for (const card of raw.cards) card.fsrs = reviveCard(card.fsrs);
	return raw;
}

function save(cwd: string, store: Store): void {
	const file = storePath(cwd);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(store, null, "\t"), "utf8");
	fs.renameSync(tmp, file);
}

function newId(): string {
	return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function dueCards(store: Store, now: Date, topic?: string): ReviewCard[] {
	const t = topic?.trim().toLowerCase();
	return store.cards
		.filter((c) => c.fsrs.due.getTime() <= now.getTime())
		.filter((c) => !t || c.topic.toLowerCase() === t)
		.sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
}

/** Number of cards due now (used by the start menu). */
export function countDue(cwd: string): number {
	return dueCards(load(cwd), new Date()).length;
}

function humanizeUntil(due: Date, now: Date): string {
	const mins = Math.round((due.getTime() - now.getTime()) / 60000);
	if (mins <= 0) return "now";
	if (mins < 60) return `in ${mins} min`;
	const hours = Math.round(mins / 60);
	if (hours < 24) return `in ${hours} h`;
	const days = Math.round(hours / 24);
	if (days < 60) return `in ${days} day${days === 1 ? "" : "s"}`;
	return `in ${Math.round(days / 30)} months`;
}

function nextDue(store: Store, now: Date): Date | undefined {
	const future = store.cards.map((c) => c.fsrs.due).filter((d) => d.getTime() > now.getTime());
	if (future.length === 0) return undefined;
	return new Date(Math.min(...future.map((d) => d.getTime())));
}

const AddParams = Type.Object({
	cards: Type.Array(
		Type.Object({
			front: Type.String({ description: "The prompt/question, self-contained (no 'as we saw above'). LaTeX allowed." }),
			back: Type.String({
				description:
					"The answer plus the key reason it's true. For problem cards: the METHOD and a worked example, not just a number — review generates a fresh variant each time.",
			}),
			kind: Type.Optional(
				Type.Union([Type.Literal("recall"), Type.Literal("problem")], {
					description: "recall = answerable in words/choice. problem = solve on paper (shown via phone photo). Default recall.",
				}),
			),
			topic: Type.String({ description: "Short topic slug, e.g. 'pythagoras'. Reuse the same slug for the same lesson topic." }),
		}),
		{ minItems: 1 },
	),
	lesson: Type.Optional(Type.String({ description: "Lesson note this came from, e.g. 'lessons/pythagoras.md'." })),
});

const DueParams = Type.Object({
	limit: Type.Optional(Type.Number({ description: "Max cards to return (default 10)." })),
	topic: Type.Optional(Type.String({ description: "Only this topic slug." })),
});

const GradeParams = Type.Object({
	id: Type.String({ description: "Card id from review_due." }),
	rating: Type.Union([Type.Literal("again"), Type.Literal("hard"), Type.Literal("good"), Type.Literal("easy")], {
		description:
			"again = wrong / couldn't recall. hard = right but with real struggle or a hint. good = right with normal effort. easy = instant and fluent.",
	}),
	note: Type.Optional(Type.String({ description: "One line on what went wrong or right (kept in the card's history)." })),
});

function textResult(text: string, details?: unknown) {
	return { content: [{ type: "text" as const, text }], details };
}

export default function review(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	function refreshStatus(ctx: any) {
		try {
			const n = dueCards(load(ctx.cwd), new Date()).length;
			ctx.ui.setStatus("review", n > 0 ? ctx.ui.theme?.fg?.("warning", `review: ${n} due`) ?? `review: ${n} due` : undefined);
		} catch {
			ctx.ui.setStatus("review", "review: cards.json unreadable");
		}
	}

	pi.on("session_start", async (_event, ctx) => refreshStatus(ctx));

	pi.registerTool({
		name: "review_add_cards",
		label: "review cards",
		description:
			"Save spaced-review cards for material the learner has just genuinely understood. They are scheduled with FSRS and come back in future /review sessions.",
		promptSnippet: "Use review_add_cards to save 1-3 spaced-review cards per concept the learner has solidly understood.",
		promptGuidelines: [
			"Add cards only for things the learner actually got — not for material you merely mentioned.",
			"One idea per card. The front must stand alone months later with no lesson context.",
			"Prefer 'why'/'how' and application over trivia. Use kind 'problem' for skills best shown by working on paper.",
		],
		parameters: AddParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const store = load(ctx.cwd);
			const existing = new Set(store.cards.map((c) => c.front.trim()));
			const now = new Date();
			const added: string[] = [];
			let skipped = 0;
			for (const c of params.cards) {
				if (existing.has(c.front.trim())) {
					skipped++;
					continue;
				}
				const card: ReviewCard = {
					id: newId(),
					front: c.front.trim(),
					back: c.back.trim(),
					kind: c.kind ?? "recall",
					topic: c.topic.trim().toLowerCase(),
					lesson: params.lesson,
					created: now.toISOString(),
					fsrs: createEmptyCard(now),
					history: [],
				};
				store.cards.push(card);
				existing.add(card.front);
				added.push(card.id);
			}
			save(ctx.cwd, store);
			refreshStatus(ctx);
			return textResult(
				`Saved ${added.length} card(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}. Total cards: ${store.cards.length}.`,
				{ added, skipped },
			);
		},
	});

	pi.registerTool({
		name: "review_due",
		label: "review due",
		description:
			"Get the spaced-review cards that are due now, most overdue first. Includes each card's back (the answer) — for YOUR grading only; never show it before the learner answers.",
		parameters: DueParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const store = load(ctx.cwd);
			const now = new Date();
			const due = dueCards(store, now, params.topic);
			const batch = due.slice(0, Math.max(1, Math.floor(params.limit ?? 10)));
			if (batch.length === 0) {
				const next = nextDue(store, now);
				return textResult(
					store.cards.length === 0
						? "No review cards exist yet."
						: `Nothing due${params.topic ? ` for topic "${params.topic}"` : ""}. Next card due ${next ? humanizeUntil(next, now) : "never"}.`,
				);
			}
			const lines = batch.map((c) => {
				const state = State[c.fsrs.state];
				const lapses = c.fsrs.lapses ? `, lapses ${c.fsrs.lapses}` : "";
				const last = c.history.at(-1);
				return [
					`### ${c.id} [${c.kind}] topic: ${c.topic} (${state}, reps ${c.fsrs.reps}${lapses})`,
					`FRONT: ${c.front}`,
					`BACK (hidden from learner): ${c.back}`,
					last ? `LAST: ${last.rating}${last.note ? ` — ${last.note}` : ""}` : "",
				]
					.filter(Boolean)
					.join("\n");
			});
			return textResult(`${due.length} due, showing ${batch.length}.\n\n${lines.join("\n\n")}`, {
				due: due.length,
				ids: batch.map((c) => c.id),
			});
		},
	});

	pi.registerTool({
		name: "review_grade",
		label: "review grade",
		description: "Record how the learner did on a review card and reschedule it with FSRS.",
		parameters: GradeParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const store = load(ctx.cwd);
			const card = store.cards.find((c) => c.id === params.id);
			if (!card) throw new Error(`No card with id "${params.id}"`);
			const now = new Date();
			card.fsrs = scheduler.next(card.fsrs, now, RATINGS[params.rating]).card;
			card.history.push({ at: now.toISOString(), rating: params.rating, note: params.note?.trim() || undefined });
			save(ctx.cwd, store);
			refreshStatus(ctx);
			const remaining = dueCards(store, now).length;
			return textResult(
				`${card.id}: ${params.rating} → next review ${humanizeUntil(card.fsrs.due, now)}. ${remaining} card(s) still due.`,
				{ due: card.fsrs.due.toISOString(), remaining },
			);
		},
	});

	pi.registerCommand("review", {
		description: "Start a spaced review session (optionally: /review <topic>)",
		handler: async (args, ctx: any) => {
			if (typeof ctx.isIdle === "function" && !ctx.isIdle()) {
				ctx.ui.notify("Wait for the agent to finish before starting a review.", "warning");
				return;
			}
			const topic = args.trim();
			const store = load(ctx.cwd);
			const now = new Date();
			const due = dueCards(store, now, topic || undefined);
			if (due.length === 0) {
				const next = nextDue(store, now);
				ctx.ui.notify(
					store.cards.length === 0
						? "No review cards yet — they're created during lessons."
						: `Nothing due${topic ? ` for "${topic}"` : ""}. Next card ${next ? humanizeUntil(next, now) : "—"}.`,
					"info",
				);
				return;
			}
			pi.sendUserMessage(`/skill:review ${topic ? `Topic: ${topic}. ` : ""}${due.length} card(s) are due.`, {
				expandPromptTemplates: true,
			});
		},
	});

	pi.registerCommand("review-stats", {
		description: "Show review card counts per topic and upcoming due dates",
		handler: async (_args, ctx: any) => {
			const store = load(ctx.cwd);
			if (store.cards.length === 0) {
				ctx.ui.notify("No review cards yet.", "info");
				return;
			}
			const now = new Date();
			const byTopic = new Map<string, ReviewCard[]>();
			for (const c of store.cards) byTopic.set(c.topic, [...(byTopic.get(c.topic) ?? []), c]);
			const lines = [...byTopic.entries()].map(([topic, cards]) => {
				const due = cards.filter((c) => c.fsrs.due.getTime() <= now.getTime()).length;
				const next = nextDue({ version: 1, cards }, now);
				return `${topic}: ${cards.length} cards, ${due} due${next ? `, next ${humanizeUntil(next, now)}` : ""}`;
			});
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
