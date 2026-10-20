/**
 * review — spaced review for what was learned in past lessons, plus the
 * learner-state tools (lesson progress, misconceptions, session slice).
 *
 * Cards are created by the teacher during lessons (review_add_cards) and
 * scheduled with FSRS (ts-fsrs). `/review` (or the start menu) starts an
 * AI-run review session: the teacher pulls due cards (review_due), poses each
 * one in the modality the extension assigns (recall, problem variant, planted
 * flaw, transfer), grades honestly, and reschedules it (review_grade).
 *
 * What the CODE decides (so the model can't drift):
 *   - which check each card gets this session (recall / problem / flaw / transfer)
 *   - whether this session is an unaided test (every 5th review session)
 *   - which cards still need a within-session retry (successive relearning)
 *   - when a card graduates (recalled to criterion in 3 separate sessions)
 *   - which critical-thinking check each lesson node gets (store.assignCheck)
 *
 * Storage: <cwd>/.learn/cards.json and <cwd>/.learn/learner.json — dot
 * folder, so Obsidian ignores it. Writes are atomic (tmp + rename).
 *
 * Commands:
 *   /review [topic]  — start a spaced review session
 *   /review-stats    — card counts per topic, due dates, calibration
 *
 * Not loaded into subagents: they never see these tools.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import { type Card as FsrsCard, type Grade, Rating, State, createEmptyCard, fsrs, generatorParameters } from "ts-fsrs";
import {
	type CheckKind,
	calibrationLine,
	closeSession,
	currentSession,
	learnerSlice,
	loadEvents,
	retentionSummary,
	loadLearner,
	noteMisconception,
	openLessons,
	reviewSessionCount,
	setLessonStatus,
	startSession,
	updateNode,
	upsertLesson,
} from "./store.ts";
import { clearMiss, pedagogy } from "./pedagogy.ts";
import { bookPath, importSessionReadings, writeAllBooks, writeBook } from "./book.ts";

type CardKind = "recall" | "problem";

/** Node ids are for the map and the tools; the learner has never seen them, and the tools refuse text that uses them. */
export const NODE_ID_NOTE = "Node ids (R1, D2, G) are internal: in anything he reads, name the idea by its label (\"the matrix exponential\", \"the superposition step\"), never the id.";

/**
 * Minutes a card costs him when nothing is known yet: a paper problem a quarter
 * of an hour, a quick card several minutes (his "quick" answers take 5-7 min).
 * Once there are enough graded answers, measuredMinutes() replaces these.
 */
export const CHECK_MINUTES: Record<CheckKind, number> = { problem: 12, flaw: 5, transfer: 6, recall: 6, explain: 7, predict: 3, boundary: 6 };
const DEFAULT_LIMIT = 10;
const MAX_PROBLEMS_NO_BUDGET = 3;
const MEASURE_MIN_SAMPLES = 5;
const GRADING_OVERHEAD_MIN = 1; // reading the verdict, the tutor's line, the next prompt

/**
 * Minutes per check from his own answer times: the 75th percentile of the
 * latencies on file (plus grading overhead), per check kind, when at least
 * MEASURE_MIN_SAMPLES exist; the default otherwise. A 60-minute budget that
 * assumed 4-minute cards ran 80 minutes on 2026-10-17.
 */
export function measuredMinutes(events: Array<{ check?: string; latencyMs?: number }>): Record<CheckKind, number> {
	const out = { ...CHECK_MINUTES };
	const by = new Map<string, number[]>();
	for (const e of events) {
		if (!e.check || !e.latencyMs || e.latencyMs <= 0 || e.latencyMs > 3600_000) continue; // >1 h: he walked away
		const list = by.get(e.check) ?? [];
		list.push(e.latencyMs / 60000);
		by.set(e.check, list);
	}
	for (const k of Object.keys(out) as CheckKind[]) {
		const v = (by.get(k) ?? []).sort((a, b) => a - b);
		if (v.length < MEASURE_MIN_SAMPLES) continue;
		const p75 = v[Math.min(v.length - 1, Math.floor(v.length * 0.75))];
		out[k] = Math.min(20, Math.max(2, Math.round(p75 + GRADING_OVERHEAD_MIN)));
	}
	return out;
}

/**
 * Size the batch to the time budget: 30 minutes is two paper problems and a
 * couple of quick cards, not fifteen cards. Without a budget, `limit` cards
 * with at most a few problems. Always at least one card.
 */
export function sizeBatch<T>(cards: T[], checkOf: (c: T) => CheckKind, budgetMin: number | undefined, limit?: number, reserveMin = 0, minutesOf: Record<CheckKind, number> = CHECK_MINUTES): T[] {
	const out: T[] = [];
	let minutes = 0;
	let problems = 0;
	const maxProblems = budgetMin ? Math.max(1, Math.floor(budgetMin / 15)) : MAX_PROBLEMS_NO_BUDGET;
	const max = Math.max(1, Math.floor(limit ?? DEFAULT_LIMIT));
	const room = budgetMin ? Math.max(minutesOf.recall, budgetMin - reserveMin) : Infinity;
	for (const c of cards) {
		if (out.length >= max) break;
		const check = checkOf(c);
		const cost = minutesOf[check] ?? minutesOf.recall;
		if (check === "problem" && problems >= maxProblems) continue;
		if (out.length > 0 && minutes + cost > room) {
			if (cost > minutesOf.recall) continue; // a cheaper card may still fit
			break;
		}
		out.push(c);
		minutes += cost;
		if (check === "problem") problems++;
	}
	return out;
}
type RatingName = "again" | "hard" | "good" | "easy";
type Modality = "choice" | "typed" | "photo" | "audio" | "implicit";

interface HistoryEntry {
	at: string;
	rating: RatingName;
	note?: string;
	session?: string;
	check?: CheckKind;
	modality?: Modality;
	latencyMs?: number;
	confidence?: number;
}

interface ReviewCard {
	id: string;
	front: string;
	back: string;
	kind: CardKind;
	topic: string;
	lesson?: string;
	created: string;
	fsrs: FsrsCard;
	history: HistoryEntry[];
	criterionSessions: number; // sessions in which it was recalled correctly at least once
	lastCriterionSession?: string;
	graduated: boolean; // criterionSessions >= GRADUATE_AFTER
}

interface Store {
	version: 2;
	cards: ReviewCard[];
}

const GRADUATE_AFTER = 3;
const FLAW_MIN_REPS = 3;
const FLAW_RATE = 0.2;
const UNAIDED_EVERY = 5;
// Day boundary (Anki-style rollover): a "review day" starts at 5am local time.
// A card due at any time on a review day is available from that day's 5am, and
// a new card's first review is the next 5am: after a night's sleep, not after
// a fixed 24 hours. Before 5am still counts as the previous day.
export const DAY_START_HOUR = 5;
/** The most recent DAY_START_HOUR local time at or before d. */
export function reviewDayStart(d: Date): Date {
	const s = new Date(d);
	s.setHours(DAY_START_HOUR, 0, 0, 0);
	if (s.getTime() > d.getTime()) s.setDate(s.getDate() - 1);
	return s;
}
/** The next review-day start strictly after d (first review of a new card). */
export function nextReviewDay(d: Date): Date {
	const s = reviewDayStart(d);
	s.setDate(s.getDate() + 1);
	return s;
}
/**
 * When a card scheduled for `due` becomes available. Day-scale gaps snap to
 * the start of the due day; short relearning steps (under ~20 h since the last
 * review, e.g. 10 minutes after "again") keep their exact time.
 */
export function availableAt(due: Date, lastReview?: Date): Date {
	if (lastReview && due.getTime() - lastReview.getTime() < 20 * 60 * 60 * 1000 && reviewDayStart(due).getTime() === reviewDayStart(lastReview).getTime()) return due;
	return reviewDayStart(due);
}
export function isDue(card: { due: Date; last_review?: Date }, now: Date): boolean {
	return availableAt(card.due, card.last_review).getTime() <= now.getTime();
}
const RETENTION_MIN_AGE_DAYS = 28; // unannounced long-delay checks: cards at least this old…
const RETENTION_RATE = 0.25; // …get tagged as retention checks this often

const RATINGS: Record<RatingName, Grade> = {
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
	if (!fs.existsSync(file)) return { version: 2, cards: [] };
	const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { version: number; cards: any[] };
	const cards: ReviewCard[] = raw.cards.map((c) => ({
		criterionSessions: 0,
		graduated: false,
		...c,
		fsrs: reviveCard(c.fsrs),
		history: c.history ?? [],
	}));
	return { version: 2, cards };
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
		.filter((c) => isDue(c.fsrs, now))
		.filter((c) => !t || c.topic.toLowerCase() === t)
		.sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
}

/** Number of cards due now (used by the start menu). */
export function countDue(cwd: string): number {
	return dueCards(load(cwd), new Date()).length;
}

/** Due counts per topic (for the session slice). */
export function dueByTopic(cwd: string): Record<string, number> {
	const out: Record<string, number> = {};
	for (const c of dueCards(load(cwd), new Date())) out[c.topic] = (out[c.topic] ?? 0) + 1;
	return out;
}

/** Start a review session; every Nth one is an unaided test. Exported for the start menu. */
export function beginReviewSession(cwd: string, budgetMin?: number): { id: string; unaided: boolean } {
	const count = reviewSessionCount(loadLearner(cwd)) + 1;
	const unaided = count % UNAIDED_EVERY === 0;
	const rec = startSession(cwd, { kind: "review", budgetMin, unaided });
	return { id: rec.id, unaided };
}

export function beginLearnSession(cwd: string, lesson: string, budgetMin?: number): string {
	return startSession(cwd, { kind: "learn", lesson, budgetMin }).id;
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
	const future = store.cards.map((c) => availableAt(c.fsrs.due, c.fsrs.last_review)).filter((d) => d.getTime() > now.getTime());
	if (future.length === 0) return undefined;
	return new Date(Math.min(...future.map((d) => d.getTime())));
}

// Deterministic 0..1 from a string (so a card's check is stable within a session).
function hash01(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return ((h >>> 0) % 10000) / 10000;
}

/** Which check this card gets this session. Code decides, the teacher executes. */
function assignCardCheck(card: ReviewCard, sessionId: string): CheckKind {
	const stable = card.fsrs.state === State.Review && card.fsrs.reps >= FLAW_MIN_REPS;
	const recentLapse = card.history.slice(-2).some((h) => h.rating === "again");
	if (stable && !recentLapse && hash01(card.id + sessionId) < FLAW_RATE) return "flaw";
	if (stable && card.fsrs.reps % 3 === 0) return "transfer";
	return card.kind === "problem" ? "problem" : "recall";
}

// Spread topics so consecutive cards rarely share one (interleaving).
function interleave(cards: ReviewCard[]): ReviewCard[] {
	const out: ReviewCard[] = [];
	const pool = [...cards];
	while (pool.length) {
		const last = out.at(-1)?.topic;
		const i = pool.findIndex((c) => c.topic !== last);
		out.push(...pool.splice(i === -1 ? 0 : i, 1));
	}
	return out;
}

/** Cards graded again/hard in this session that haven't yet been recalled correctly (successive relearning). */
function relearnCards(store: Store, sessionId: string, sessionStart: Date): ReviewCard[] {
	return store.cards.filter((c) => {
		const inSession = c.history.filter((h) => h.session === sessionId || new Date(h.at).getTime() >= sessionStart.getTime());
		if (inSession.length === 0) return false;
		const last = inSession.at(-1)!;
		return (last.rating === "again" || last.rating === "hard") && c.lastCriterionSession !== sessionId;
	});
}

const CHECK_INSTRUCTIONS: Record<CheckKind, string> = {
	recall: "Pose the FRONT (rephrased so the wording isn't the cue) and let the learner answer with `recall` (typed or photo). Never multiple-choice unless distractors are genuinely diagnostic.",
	problem: "Generate a FRESH variant (new numbers/setup) of the problem in the BACK; pose it with `recall` kind 'problem' and let them work on paper (photo).",
	flaw: "Do NOT ask the question. Instead present a confident, plausible answer/derivation for the FRONT that contains ONE planted error, and ask whether it is right (and what, if anything, is wrong) via `recall` kind 'flaw'. Accepting it counts as a miss.",
	transfer: "Pose the same idea in an unrelated cover story or different notation (e.g. a textbook's or a paper's), so recognising the structure is the task. Use `recall` kind 'transfer'.",
	predict: "",
	explain: "",
	boundary: "",
};

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
					description: "recall = answerable in words. problem = solve on paper (shown via phone photo). Default recall.",
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
	id: Type.String({ description: "Card id from review_due / review_search." }),
	rating: Type.Union([Type.Literal("again"), Type.Literal("hard"), Type.Literal("good"), Type.Literal("easy")], {
		description:
			"again = wrong / couldn't recall / accepted a planted flaw. hard = right but with real struggle, a hint, or slow. good = right with normal effort. easy = instant and fluent.",
	}),
	note: Type.Optional(Type.String({ description: "One line on what went wrong or right (kept in the card's history)." })),
	check: Type.Optional(
		Type.Union(
			[Type.Literal("recall"), Type.Literal("problem"), Type.Literal("flaw"), Type.Literal("transfer"), Type.Literal("explain")],
			{ description: "Which check was used (default: the one review_due assigned)." },
		),
	),
	modality: Type.Optional(
		Type.Union([Type.Literal("choice"), Type.Literal("typed"), Type.Literal("photo"), Type.Literal("audio"), Type.Literal("implicit")], {
			description: "How the learner answered. 'implicit' = credit for using the idea correctly mid-lesson without being asked.",
		}),
	),
	latencyMs: Type.Optional(Type.Number({ description: "Time to answer, if known (the recall tool reports it)." })),
	confidence: Type.Optional(Type.Number({ description: "Learner's stated confidence 0-100, if known." })),
});

const SearchParams = Type.Object({
	topic: Type.Optional(Type.String({ description: "Topic slug to list." })),
	query: Type.Optional(Type.String({ description: "Case-insensitive substring to match in the front/back." })),
	limit: Type.Optional(Type.Number({ description: "Max results (default 20)." })),
});

const NodeKind = Type.Union([Type.Literal("foundation"), Type.Literal("derived"), Type.Literal("goal")]);

const LessonPlanParams = Type.Object({
	slug: Type.String({ description: "Short stable slug for the lesson, e.g. 'large-deviations'. Reuse it across sessions." }),
	title: Type.String({ description: "Human title." }),
	goal: Type.Optional(Type.String({ description: "The learner's concrete goal, from the probe phase." })),
	file: Type.Optional(Type.String({ description: "Lesson note path, e.g. 'lessons/large-deviations.md'." })),
	plan: Type.Optional(Type.String({ description: "The dependency map as mermaid source (the same one shown in chat)." })),
	nodes: Type.Array(
		Type.Object({
			id: Type.String({ description: "Short internal id for the map and the tools, e.g. 'R1', 'D2', 'G'. The learner never sees ids: talk to him in labels." }),
			label: Type.String(),
			kind: NodeKind,
		}),
		{ minItems: 1, description: "Every node of the map in teaching order. foundation = unconditional truth; derived = reasoning step; goal = the sink." },
	),
});

const LessonNodeParams = Type.Object({
	slug: Type.String(),
	id: Type.String({ description: "Node id from lesson_plan." }),
	status: Type.Optional(Type.Union([Type.Literal("pending"), Type.Literal("confirmed"), Type.Literal("shaky")])),
	hints: Type.Optional(Type.Number({ description: "Total hints given on this node so far." })),
	attemptedFirst: Type.Optional(Type.Boolean({ description: "Did the learner submit an unaided attempt before any hint?" })),
	note: Type.Optional(Type.String({ description: "One line: what happened on this node." })),
});

const LessonStatusParams = Type.Object({
	slug: Type.String(),
	status: Type.Union([Type.Literal("open"), Type.Literal("paused"), Type.Literal("done")]),
	summary: Type.Optional(Type.String({ description: "Two lines max: where to pick up next time. Required when pausing." })),
});

const MisconceptionParams = Type.Object({
	topic: Type.String({ description: "Topic slug." }),
	claim: Type.String({ description: "What the learner believed, as a bare claim. Reuse the exact wording to add evidence to an existing entry." }),
	truth: Type.String({ description: "What is actually the case, one line." }),
	kind: Type.Union([Type.Literal("for"), Type.Literal("against")], {
		description: "'for' = they just showed the misconception again. 'against' = they just demonstrated the correct model unprompted.",
	}),
	note: Type.Optional(Type.String()),
});

const SliceParams = Type.Object({
	lesson: Type.Optional(Type.String({ description: "Lesson slug to focus on." })),
	topics: Type.Optional(Type.Array(Type.String(), { description: "Topic slugs the next concept touches." })),
});

function textResult(text: string, details?: unknown) {
	return { content: [{ type: "text" as const, text }], details };
}

// Quiet terminal: the learner reads the lesson in Obsidian, so tool calls
// render as one dim word and results as one line (never a card's BACK).
function quietCall(label: string) {
	return (_args: any, theme: any) => new Text(theme.fg("dim", label), 0, 0);
}
function quietResult(summary: (details: any, text: string) => string) {
	return (res: any, _opts: any, theme: any) => {
		const first = res.content?.[0];
		const text = first?.type === "text" ? first.text : "";
		return new Text(theme.fg("dim", summary(res.details, text)), 0, 0);
	};
}
const firstLine = (_d: any, t: string) => t.split("\n")[0].slice(0, 120);

export interface GradeCardInput {
	id: string;
	rating: RatingName;
	note?: string;
	check?: CheckKind;
	modality?: Modality;
	latencyMs?: number;
	confidence?: number;
}

/** Grade a card and reschedule it. Shared by review_grade and the recall tool. */
export function gradeCard(cwd: string, params: GradeCardInput): { text: string; rating: RatingName; details: Record<string, unknown> } {
	const store = load(cwd);
	const card = store.cards.find((c) => c.id === params.id);
	if (!card) throw new Error(`No card with id "${params.id}"`);
	const now = new Date();
	const session = currentSession(cwd);
	let rating = params.rating;
	// Correct but slow is not yet fluent. Only downgrade 'easy'; a 'good' stands.
	if (rating === "easy" && params.latencyMs && params.latencyMs > 20000) rating = "good";
	card.fsrs = scheduler.next(card.fsrs, now, RATINGS[rating]).card;
	card.history.push({
		at: now.toISOString(),
		rating,
		note: params.note?.trim() || undefined,
		session: session?.id,
		check: params.check,
		modality: params.modality,
		latencyMs: params.latencyMs,
		confidence: params.confidence,
	});
	let graduatedNow = false;
	if ((rating === "good" || rating === "easy") && session && card.lastCriterionSession !== session.id && params.modality !== "implicit") {
		card.criterionSessions++;
		card.lastCriterionSession = session.id;
		if (!card.graduated && card.criterionSessions >= GRADUATE_AFTER) {
			card.graduated = true;
			graduatedNow = true;
		}
	}
	save(cwd, store);
	const remaining = dueCards(store, now).length;
	const retry = session ? relearnCards(store, session.id, new Date(session.at)).length : 0;
	const text =
		`${card.id}: ${rating}${rating !== params.rating ? ` (was ${params.rating}; slow)` : ""} → next review ${humanizeUntil(availableAt(card.fsrs.due, card.fsrs.last_review), now)}.` +
		` ${remaining} due, ${retry} to retry this session.${graduatedNow ? " Card graduated (fluent)." : ""}`;
	return { text, rating, details: { due: card.fsrs.due.toISOString(), remaining, retry, graduated: card.graduated } };
}

/** Recompute the "review: N due" status line (any extension may call this after grading). */
export function refreshReviewStatus(ctx: any): void {
	try {
		const n = dueCards(load(ctx.cwd), new Date()).length;
		ctx.ui.setStatus("review", n > 0 ? ctx.ui.theme?.fg?.("warning", `review: ${n} due`) ?? `review: ${n} due` : undefined);
	} catch {
		ctx.ui.setStatus("review", "review: cards.json unreadable");
	}
}

export default function review(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	const refreshStatus = refreshReviewStatus;

	pi.on("session_start", async (_event, ctx) => refreshStatus(ctx));

	// ── Cards ────────────────────────────────────────────────────────────

	pi.registerTool({
		name: "review_add_cards",
		label: "review cards",
		description:
			"Save spaced-review cards for material the learner has just genuinely understood. They are scheduled with FSRS and come back in future review sessions.",
		promptSnippet: "Use review_add_cards to save 1-3 spaced-review cards per concept the learner has solidly understood.",
		promptGuidelines: [
			"Add cards only for things the learner actually got — not for material you merely mentioned.",
			"One idea per card. The front must stand alone months later with no lesson context.",
			"Prefer 'why'/'how' and application over trivia. Use kind 'problem' for skills best shown by working on paper.",
			"Card quality rubric: the front has exactly one defensible answer; the back states the answer AND the reason; no yes/no fronts; no 'list all…' fronts; fronts don't leak the answer.",
		],
		renderCall: quietCall("save cards"),
		renderResult: quietResult(firstLine),
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
					fsrs: { ...createEmptyCard(now), due: nextReviewDay(now) },
					history: [],
					criterionSessions: 0,
					graduated: false,
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
			"Get the spaced-review cards due now, interleaved across topics, each with the CHECK the extension assigned for this session. Includes each card's back (the answer) — for YOUR grading only; never show it before the learner answers. Also lists cards that still need a retry this session.",
		renderCall: quietCall("review due"),
		renderResult: quietResult((d) => (d?.due !== undefined ? `${d.due} due${d.retry?.length ? `, ${d.retry.length} to retry` : ""}${d.unaided ? " · unaided" : ""}` : "nothing due")),
		parameters: DueParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const store = load(ctx.cwd);
			const now = new Date();
			const learner = loadLearner(ctx.cwd);
			let session = currentSession(ctx.cwd, learner);
			if (!session || session.kind !== "review") {
				const s = beginReviewSession(ctx.cwd);
				session = { id: s.id, kind: "review", at: now.toISOString(), unaided: s.unaided };
			}
			const sessionStart = new Date(session.at);
			const due = dueCards(store, now, params.topic).filter((c) => c.lastCriterionSession !== session!.id);
			const retry = relearnCards(store, session.id, sessionStart).filter((c) => !params.topic || c.topic === params.topic.toLowerCase());
			const pool = interleave(due.filter((c) => !retry.includes(c)));
			const checkOf = (c: ReviewCard) => assignCardCheck(c, session!.id);
			const minutes = measuredMinutes(loadEvents(ctx.cwd));
			const batch = sizeBatch(pool, checkOf, session.budgetMin, params.limit, retry.length * minutes.recall, minutes);
			const onPaper = batch.filter((c) => checkOf(c) === "problem").length;
			const quickMin = Math.round(batch.filter((c) => checkOf(c) !== "problem").reduce((s, c) => s + minutes[checkOf(c)], 0) / Math.max(1, batch.length - onPaper));

			const header = [
				`Session ${session.id}${session.unaided ? " — UNAIDED TEST: no hints, no repair until the session summary; grade strictly." : ""}${session.budgetMin ? ` — budget ${session.budgetMin} min.` : ""}`,
				"Never tell the learner which topic a card is from; choosing the method is part of the task.",
			];
			if (batch.length === 0 && retry.length === 0) {
				const next = nextDue(store, now);
				return textResult(
					store.cards.length === 0
						? "No review cards exist yet."
						: `Nothing due${params.topic ? ` for topic "${params.topic}"` : ""}. Next card due ${next ? humanizeUntil(next, now) : "never"}.\n${calibrationLine(learner.calibration)}`,
				);
			}
			const isRetention = (c: ReviewCard) =>
				(now.getTime() - new Date(c.created).getTime()) / 86400000 >= RETENTION_MIN_AGE_DAYS && hash01(`r${c.id}${session!.id}`) < RETENTION_RATE;
			const fmt = (c: ReviewCard, check: CheckKind) => {
				const state = State[c.fsrs.state];
				const lapses = c.fsrs.lapses ? `, lapses ${c.fsrs.lapses}` : "";
				const last = c.history.at(-1);
				const retention = isRetention(c);
				const recent = c.history.slice(-2);
				const repeated = recent.length === 2 && recent.every((h) => h.rating === "hard" || h.rating === "again");
				return [
					`### ${c.id} [${c.kind}] topic: ${c.topic} (${state}, reps ${c.fsrs.reps}${lapses}, criterion sessions ${c.criterionSessions}${c.graduated ? ", graduated" : ""})${retention ? " RETENTION CHECK" : ""}`,
					retention ? "RETENTION: pose it unaided and unannounced — no hint, no warm-up, no reaction beyond 'noted' until the close; pass `retention: true` to `recall`. This is the outcome metric." : "",
					`CHECK: ${check} — ${CHECK_INSTRUCTIONS[check]}`,
					`FRONT: ${c.front}`,
					`BACK (hidden from learner): ${c.back}`,
					last ? `LAST: ${last.rating}${last.note ? ` — ${last.note}` : ""}` : "",
					repeated
						? `REPEATED: rated ${recent.map((h) => h.rating).join(" then ")} in its last two sessions${recent[0]?.note ? ` (before: ${recent[0].note})` : ""}. If the main idea was right each time and only a sub-part or a wording slipped, the card is badly cut: grade the main idea, say so, and split or rewrite it with review_add_cards instead of drilling the sub-part again.`
						: "",
				]
					.filter(Boolean)
					.join("\n");
			};
			const lines = batch.map((c) => fmt(c, assignCardCheck(c, session!.id)));
			const retryLines = retry.map((c) => fmt(c, c.kind === "problem" ? "problem" : "recall"));
			const text = [
				...header,
				`${due.length} due, showing ${batch.length}${session.budgetMin ? ` (sized to ${session.budgetMin} min from his answer times: ${onPaper} on paper at ~${minutes.problem} min each, ${batch.length - onPaper} quick at ~${quickMin} min)` : ""}. A card not shown is simply due next time; do not call review_due again for more until the retry list is empty.`,
				"",
				...lines,
				...(retryLines.length
					? ["", `## Retry this session (${retryLines.length}) — missed earlier; pose again with a fresh phrasing/variant after the batch:`, "", ...retryLines]
					: []),
			].join("\n");
			return textResult(text, { session: session.id, unaided: session.unaided, due: due.length, ids: batch.map((c) => c.id), retry: retry.map((c) => c.id) });
		},
	});

	pi.registerTool({
		name: "review_grade",
		label: "review grade",
		description:
			"Record how the learner did on a review card and reschedule it with FSRS. The `recall` tool grades cards automatically when given a cardId; use this to override, or for IMPLICIT credit: when a new lesson leans on an old card's idea and the learner uses it correctly unprompted, grade that card 'good' with modality 'implicit' (find its id with review_search).",
		renderCall: quietCall("grade"),
		renderResult: quietResult(firstLine),
		parameters: GradeParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const r = gradeCard(ctx.cwd, params);
			refreshStatus(ctx);
			// The tutor is the final judge: an upward override also clears the miss
			// streak, so the gate never demands a lecture on something he got right.
			if (r.rating === "good" || r.rating === "easy") clearMiss(pedagogy());
			return textResult(r.text, r.details);
		},
	});

	pi.registerTool({
		name: "review_search",
		label: "review search",
		description: "Find existing cards by topic or text (ids, fronts, state). Use before adding cards to avoid duplicates, and to find a card for implicit credit.",
		renderCall: quietCall("search cards"),
		renderResult: quietResult((_d, t) => `${t.split("\n").length} card(s)`),
		parameters: SearchParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const store = load(ctx.cwd);
			const t = params.topic?.trim().toLowerCase();
			const q = params.query?.trim().toLowerCase();
			const hits = store.cards
				.filter((c) => (!t || c.topic === t) && (!q || c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)))
				.slice(0, Math.max(1, Math.floor(params.limit ?? 20)));
			if (hits.length === 0) return textResult("No matching cards.");
			const now = new Date();
			return textResult(
				hits
					.map((c) => `${c.id} [${c.kind}] ${c.topic} (${State[c.fsrs.state]}, reps ${c.fsrs.reps}, due ${humanizeUntil(availableAt(c.fsrs.due, c.fsrs.last_review), now)}): ${c.front}`)
					.join("\n"),
			);
		},
	});

	// ── Learner state ────────────────────────────────────────────────────

	pi.registerTool({
		name: "lesson_plan",
		label: "lesson plan",
		description:
			"Register (or replace) a lesson's plan: its nodes in teaching order. Returns the critical-thinking CHECK assigned to each node — the extension decides this, you execute it. Call right after the learner okays the plan, and again if the plan changes.",
		renderCall: quietCall("lesson plan"),
		renderResult: quietResult(firstLine),
		parameters: LessonPlanParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			// The note md-log is writing to is the lesson's file, whatever path the model guessed.
			const logFile = (globalThis as any).__learnLogFile as string | undefined;
			const guessed = params.file ? path.resolve(ctx.cwd, params.file) : undefined;
			const file = guessed && fs.existsSync(guessed) ? params.file : logFile && fs.existsSync(logFile) ? path.relative(ctx.cwd, logFile) : params.file;
			const lesson = upsertLesson(ctx.cwd, { ...params, file });
			const lines = lesson.nodes.map((n) => `- ${n.id} (${n.kind}) "${n.label}": CHECK = ${n.check}${n.status !== "pending" ? ` [${n.status}]` : ""}`);
			try {
				writeBook(ctx.cwd, lesson.slug);
			} catch {
				// the book is a convenience
			}
			return textResult(`Lesson "${lesson.slug}" saved with ${lesson.nodes.length} nodes.\n${lines.join("\n")}\n${NODE_ID_NOTE}`, { slug: lesson.slug });
		},
	});

	pi.registerTool({
		name: "lesson_node",
		label: "lesson node",
		description:
			"Update one node of the current lesson: status (confirmed only after the explain-back lands), hint count, whether an unaided attempt came before any hint, and a one-line note.",
		renderCall: quietCall("node"),
		renderResult: quietResult(firstLine),
		parameters: LessonNodeParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const node = updateNode(ctx.cwd, params.slug, params.id, params);
			return textResult(`${params.slug}/${node.id}: ${node.status}, hints ${node.hints}${node.attemptedFirst === false ? ", NO unaided attempt first" : ""}.`);
		},
	});

	pi.registerTool({
		name: "lesson_status",
		label: "lesson status",
		description: "Mark a lesson paused (with a two-line summary of where to pick up) or done. Call when the learner stops, the time budget runs out, or the goal node is confirmed.",
		renderCall: quietCall("lesson"),
		renderResult: quietResult(firstLine),
		parameters: LessonStatusParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			if (params.status === "paused" && !params.summary?.trim()) throw new Error("A summary is required when pausing.");
			const lesson = setLessonStatus(ctx.cwd, params.slug, params.status, params.summary);
			return textResult(`Lesson "${lesson.slug}" is now ${lesson.status}.`);
		},
	});

	pi.registerTool({
		name: "misconception_note",
		label: "misconception",
		description:
			"Log evidence about a wrong model the learner holds (kind 'for') or has just demonstrated they no longer hold (kind 'against'). Entries resolve automatically after two consecutive 'against' demonstrations. Use only for genuine model errors, not slips.",
		renderCall: quietCall("misconception"),
		renderResult: quietResult(firstLine),
		parameters: MisconceptionParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const m = noteMisconception(ctx.cwd, params);
			const f = m.evidence.filter((e) => e.kind === "for").length;
			const a = m.evidence.filter((e) => e.kind === "against").length;
			return textResult(`[${m.topic}] "${m.claim}" — ${m.status} (for ${f} / against ${a}).`, { id: m.id, status: m.status });
		},
	});

	pi.registerTool({
		name: "learner_slice",
		label: "learner slice",
		description:
			"The relevant slice of the learner file: the named lesson's nodes and status, other open lessons, open misconceptions touching the given topics, calibration, due cards. Call when a lesson crosses into a new concept (pass its topics), not every turn.",
		renderCall: quietCall("learner slice"),
		renderResult: quietResult(() => "loaded"),
		parameters: SliceParams,
		async execute(_id, params, _signal, _onUpdate, ctx) {
			return textResult(learnerSlice(ctx.cwd, { lesson: params.lesson, topics: params.topics, dueByTopic: dueByTopic(ctx.cwd) }));
		},
	});

	pi.registerTool({
		name: "session_close",
		label: "session close",
		description:
			"Write the session's closing note (3-5 lines: what was worked on, what was hard and why, what's next) into the learner file. Call at the end of every learn or review session; the next session's slice shows it.",
		renderCall: quietCall("session close"),
		renderResult: quietResult(firstLine),
		parameters: Type.Object({ note: Type.String({ description: "3-5 lines, concrete: names of concepts, the specific errors, the next step." }) }),
		async execute(_id, params, _s, _u, ctx) {
			const s = closeSession(ctx.cwd, params.note);
			const ret = retentionSummary(loadEvents(ctx.cwd));
			return textResult(s ? `Session ${s.id} closed.${ret.n ? ` Retention checks so far: ${ret.n}, accuracy ${Math.round(ret.accuracy * 100)}%.` : ""}` : "No session to close.");
		},
	});

	// ── Commands ─────────────────────────────────────────────────────────

	pi.registerCommand("book", {
		description: "Rebuild the lesson books (book/<slug>.md: readings only, no cards). `/book import` also recovers readings from past session transcripts.",
		handler: async (args, ctx: any) => {
			const imported = /\bimport\b/i.test(args) ? importSessionReadings(ctx.cwd) : undefined;
			const files = writeAllBooks(ctx.cwd);
			const where = files.length === 1 ? path.relative(ctx.cwd, files[0]) : path.relative(ctx.cwd, bookPath(ctx.cwd, "")).replace(/\.md$/, "");
			ctx.ui.notify(`${imported ? `Imported ${imported.added} reading(s) from ${imported.files} transcript(s). ` : ""}${files.length} book(s) written to ${where}.`, "info");
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
			const s = beginReviewSession(ctx.cwd);
			pi.sendUserMessage(
				`/skill:review ${topic ? `Topic: ${topic}. ` : ""}${due.length} card(s) are due.${s.unaided ? " This is an UNAIDED test session." : ""}`,
				{ expandPromptTemplates: true },
			);
		},
	});

	pi.registerCommand("review-stats", {
		description: "Show review card counts per topic, upcoming due dates, calibration",
		handler: async (_args, ctx: any) => {
			const store = load(ctx.cwd);
			const learner = loadLearner(ctx.cwd);
			if (store.cards.length === 0 && learner.lessons.length === 0) {
				ctx.ui.notify("No review cards or lessons yet.", "info");
				return;
			}
			const now = new Date();
			const byTopic = new Map<string, ReviewCard[]>();
			for (const c of store.cards) byTopic.set(c.topic, [...(byTopic.get(c.topic) ?? []), c]);
			const lines = [...byTopic.entries()].map(([topic, cards]) => {
				const due = cards.filter((c) => isDue(c.fsrs, now)).length;
				const grad = cards.filter((c) => c.graduated).length;
				const next = nextDue({ version: 2, cards }, now);
				return `${topic}: ${cards.length} cards, ${due} due, ${grad} graduated${next ? `, next ${humanizeUntil(next, now)}` : ""}`;
			});
			const open = openLessons(learner);
			if (open.length) lines.push(`open lessons: ${open.map((l) => `${l.title} (${l.nodes.filter((n) => n.status === "confirmed").length}/${l.nodes.length})`).join(", ")}`);
			const openM = learner.misconceptions.filter((m) => m.status === "open").length;
			if (openM) lines.push(`open misconceptions: ${openM}`);
			lines.push(calibrationLine(learner.calibration));
			const ret = retentionSummary(loadEvents(ctx.cwd));
			if (ret.n) lines.push(`long-delay retention: ${ret.n} checks, ${Math.round(ret.accuracy * 100)}% correct`);
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
