/**
 * store — persistent learner state shared by the learning extensions.
 *
 * Lives in <cwd>/.learn/learner.json (dot folder, so Obsidian ignores it).
 * Everything here is evidence-weighted and self-correcting: nothing is a
 * permanent label. Cards live next door in cards.json (see index.ts).
 *
 * Holds:
 *   - lessons: open/paused/done lessons with their plan DAG and per-node status,
 *     so a lesson can be resumed in a later session
 *   - misconceptions: wrong models the learner has shown, with for/against
 *     evidence; resolved after two consistent demonstrations
 *   - calibration: (confidence, correct) pairs from every graded answer
 *   - sessions: one record per learn/review session (time budget, counts)
 *
 * Not a pi extension itself (no default export): imported by review/index.ts,
 * quiz.ts, recall.ts and start-menu.ts.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type CheckKind = "predict" | "explain" | "boundary" | "flaw" | "transfer" | "recall" | "problem";
export type NodeKind = "foundation" | "derived" | "goal";
export type NodeStatus = "pending" | "confirmed" | "shaky";
export type LessonStatus = "open" | "paused" | "done";

export interface LessonNode {
	id: string;
	label: string;
	kind: NodeKind;
	check: CheckKind;
	status: NodeStatus;
	hints: number;
	attemptedFirst?: boolean;
	note?: string;
	updated?: string;
}

export interface LessonRecord {
	slug: string;
	title: string;
	file?: string;
	goal?: string;
	plan?: string; // mermaid source of the dependency map
	nodes: LessonNode[];
	status: LessonStatus;
	summary?: string; // where to pick up
	created: string;
	updated: string;
}

export interface Misconception {
	id: string;
	topic: string;
	claim: string; // what the learner believed
	truth: string; // what is actually the case
	evidence: Array<{ at: string; kind: "for" | "against"; note?: string }>;
	status: "open" | "resolved";
	created: string;
	updated: string;
}

export interface CalibrationEvent {
	at: string;
	topic?: string;
	confidence: number; // 0-100
	correct: boolean;
	source: "quiz" | "recall";
	check?: CheckKind;
	cardId?: string;
	latencyMs?: number;
}

export interface SessionRecord {
	id: string;
	kind: "learn" | "review";
	at: string;
	budgetMin?: number;
	lesson?: string;
	unaided?: boolean;
	ended?: string;
	note?: string; // 3-5 lines written at close: what happened, what was hard, what's next
}

/**
 * One graded answer. Appended to <cwd>/.learn/events.jsonl (never rewritten),
 * so the struggle trail — what was asked, what he wrote, where it went wrong —
 * survives across sessions and feeds the per-concept dossiers and the slice.
 */
export interface LearnEvent {
	at: string;
	session?: string;
	source: "quiz" | "recall";
	topic?: string; // lesson / fundamental slug
	check?: CheckKind;
	prompt: string; // truncated
	answer?: string; // truncated (typed text, transcript, or "photo")
	verdict: "correct" | "partial" | "incorrect" | "dontKnow" | "hint";
	score?: number;
	firstError?: string;
	reading?: string;
	confidence?: number;
	latencyMs?: number;
	cardId?: string;
	retention?: boolean; // unannounced long-delay retention check (the outcome metric)
}

// ── Curriculum: goals, milestones, fundamentals ───────────────────────────

export type MilestoneKind = "do" | "derive" | "read" | "build" | "critique";
export type MilestoneStatus = "locked" | "ready" | "in_progress" | "done";

export interface Milestone {
	id: string;
	title: string;
	kind: MilestoneKind;
	description?: string;
	/** Fundamental slugs, or "m:<milestoneId>" for another milestone of the same goal. */
	needs: string[];
	status: MilestoneStatus;
	evidence?: string;
	lesson?: string;
	done?: string;
}

export interface Goal {
	id: string;
	title: string;
	why?: string;
	weight: number; // 1 (background) .. 3 (leading)
	status: "active" | "paused" | "done";
	milestones: Milestone[];
	created: string;
	updated: string;
	lastTouched?: string;
}

export type FundamentalStatus = "unknown" | "shaky" | "solid";

export interface Fundamental {
	slug: string; // == the lesson slug that teaches it
	title: string;
	domain?: string; // math | physics | cs | chemistry | ...
	status?: FundamentalStatus; // explicit override; otherwise derived from lessons
	note?: string;
	updated: string;
}

export interface Interest {
	at: string;
	text: string;
	goal?: string;
	milestone?: string;
	fundamentals?: string[];
}

export interface LearnerStore {
	version: 1;
	lessons: LessonRecord[];
	misconceptions: Misconception[];
	calibration: CalibrationEvent[];
	sessions: SessionRecord[];
	goals: Goal[];
	fundamentals: Fundamental[];
	interests: Interest[];
}

const RESOLVE_AFTER = 2; // consecutive "against" demonstrations that close a misconception

export function learnerPath(cwd: string): string {
	return path.join(cwd, ".learn", "learner.json");
}

export function loadLearner(cwd: string): LearnerStore {
	const file = learnerPath(cwd);
	if (!fs.existsSync(file)) return { version: 1, lessons: [], misconceptions: [], calibration: [], sessions: [], goals: [], fundamentals: [], interests: [] };
	const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<LearnerStore>;
	return {
		version: 1,
		lessons: raw.lessons ?? [],
		misconceptions: raw.misconceptions ?? [],
		calibration: raw.calibration ?? [],
		sessions: raw.sessions ?? [],
		goals: raw.goals ?? [],
		fundamentals: raw.fundamentals ?? [],
		interests: raw.interests ?? [],
	};
}

export function saveLearner(cwd: string, store: LearnerStore): void {
	const file = learnerPath(cwd);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(store, null, "\t"), "utf8");
	fs.renameSync(tmp, file);
}

export function newId(prefix: string): string {
	return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 50) || "lesson"
	);
}

// ── Sessions ───────────────────────────────────────────────────────────────

const SESSION_WINDOW_MS = 6 * 60 * 60 * 1000;

export function startSession(cwd: string, s: Omit<SessionRecord, "id" | "at">): SessionRecord {
	const store = loadLearner(cwd);
	for (const old of store.sessions) if (!old.ended) old.ended = old.at;
	const rec: SessionRecord = { id: newId("s"), at: new Date().toISOString(), ...s };
	store.sessions.push(rec);
	saveLearner(cwd, store);
	return rec;
}

/** The session started most recently, if it began within the last few hours. */
export function currentSession(cwd: string, store?: LearnerStore): SessionRecord | undefined {
	const s = store ?? loadLearner(cwd);
	const last = s.sessions.at(-1);
	if (!last) return undefined;
	if (Date.now() - new Date(last.at).getTime() > SESSION_WINDOW_MS) return undefined;
	return last;
}

export function reviewSessionCount(store: LearnerStore): number {
	return store.sessions.filter((s) => s.kind === "review").length;
}

// ── Check assignment (deterministic, decided by code not the model) ────────

/**
 * Which critical-thinking check a lesson node gets, by node kind and its
 * position among nodes of that kind. Foundations: predict before reveal.
 * Derived steps rotate explain → boundary → flaw. Goal nodes: far transfer.
 * Every node additionally closes with an explain-back recall (see teach skill).
 */
export function assignCheck(kind: NodeKind, ordinal: number): CheckKind {
	if (kind === "foundation") return "predict";
	if (kind === "goal") return "transfer";
	const rotation: CheckKind[] = ["explain", "boundary", "flaw"];
	return rotation[ordinal % rotation.length];
}

// ── Lessons ────────────────────────────────────────────────────────────────

export function upsertLesson(
	cwd: string,
	input: {
		slug: string;
		title?: string;
		file?: string;
		goal?: string;
		plan?: string;
		nodes?: Array<{ id: string; label: string; kind: NodeKind }>;
	},
): LessonRecord {
	const store = loadLearner(cwd);
	const now = new Date().toISOString();
	let lesson = store.lessons.find((l) => l.slug === input.slug);
	if (!lesson) {
		lesson = { slug: input.slug, title: input.title ?? input.slug, nodes: [], status: "open", created: now, updated: now };
		store.lessons.push(lesson);
	}
	if (input.title) lesson.title = input.title;
	if (input.file) lesson.file = input.file;
	if (input.goal) lesson.goal = input.goal;
	if (input.plan) lesson.plan = input.plan;
	if (input.nodes) {
		const counts: Record<NodeKind, number> = { foundation: 0, derived: 0, goal: 0 };
		const next: LessonNode[] = [];
		for (const n of input.nodes) {
			const existing = lesson.nodes.find((e) => e.id === n.id);
			const ordinal = counts[n.kind]++;
			next.push(
				existing
					? { ...existing, label: n.label, kind: n.kind }
					: { id: n.id, label: n.label, kind: n.kind, check: assignCheck(n.kind, ordinal), status: "pending", hints: 0 },
			);
		}
		lesson.nodes = next;
	}
	lesson.status = "open";
	lesson.updated = now;
	saveLearner(cwd, store);
	return lesson;
}

export function updateNode(
	cwd: string,
	slug: string,
	id: string,
	patch: { status?: NodeStatus; hints?: number; attemptedFirst?: boolean; note?: string },
): LessonNode {
	const store = loadLearner(cwd);
	const lesson = store.lessons.find((l) => l.slug === slug);
	if (!lesson) throw new Error(`No lesson "${slug}". Call lesson_plan first.`);
	const node = lesson.nodes.find((n) => n.id === id);
	if (!node) throw new Error(`No node "${id}" in lesson "${slug}". Known: ${lesson.nodes.map((n) => n.id).join(", ")}`);
	if (patch.status) node.status = patch.status;
	if (patch.hints !== undefined) node.hints = Math.max(node.hints, patch.hints);
	if (patch.attemptedFirst !== undefined) node.attemptedFirst = patch.attemptedFirst;
	if (patch.note) node.note = patch.note;
	node.updated = new Date().toISOString();
	lesson.updated = node.updated;
	if (lesson.nodes.length > 0 && lesson.nodes.every((n) => n.status === "confirmed")) lesson.status = "done";
	saveLearner(cwd, store);
	return node;
}

export function setLessonStatus(cwd: string, slug: string, status: LessonStatus, summary?: string): LessonRecord {
	const store = loadLearner(cwd);
	const lesson = store.lessons.find((l) => l.slug === slug);
	if (!lesson) throw new Error(`No lesson "${slug}".`);
	lesson.status = status;
	if (summary) lesson.summary = summary;
	lesson.updated = new Date().toISOString();
	saveLearner(cwd, store);
	return lesson;
}

export function openLessons(store: LearnerStore): LessonRecord[] {
	return store.lessons
		.filter((l) => l.status === "open" || l.status === "paused")
		.sort((a, b) => b.updated.localeCompare(a.updated));
}

// ── Misconceptions ─────────────────────────────────────────────────────────

export function noteMisconception(
	cwd: string,
	input: { topic: string; claim: string; truth: string; kind: "for" | "against"; note?: string },
): Misconception {
	const store = loadLearner(cwd);
	const now = new Date().toISOString();
	const topic = input.topic.trim().toLowerCase();
	const claim = input.claim.trim();
	let m = store.misconceptions.find((x) => x.topic === topic && x.claim.toLowerCase() === claim.toLowerCase());
	if (!m) {
		m = { id: newId("m"), topic, claim, truth: input.truth.trim(), evidence: [], status: "open", created: now, updated: now };
		store.misconceptions.push(m);
	}
	if (input.truth) m.truth = input.truth.trim();
	m.evidence.push({ at: now, kind: input.kind, note: input.note?.trim() || undefined });
	const tail = m.evidence.slice(-RESOLVE_AFTER);
	m.status = tail.length >= RESOLVE_AFTER && tail.every((e) => e.kind === "against") ? "resolved" : "open";
	m.updated = now;
	saveLearner(cwd, store);
	return m;
}

// ── Calibration ────────────────────────────────────────────────────────────

export function recordCalibration(cwd: string, ev: Omit<CalibrationEvent, "at">): void {
	if (!Number.isFinite(ev.confidence)) return;
	const store = loadLearner(cwd);
	store.calibration.push({ at: new Date().toISOString(), ...ev });
	saveLearner(cwd, store);
}

export interface CalibrationSummary {
	n: number;
	accuracy: number; // 0-1
	meanConfidence: number; // 0-1
	brier: number;
	overconfidentMisses: number; // confidence >= 70 and wrong
	byTopic: Array<{ topic: string; n: number; accuracy: number; meanConfidence: number }>;
}

export function summarizeCalibration(events: CalibrationEvent[]): CalibrationSummary {
	const n = events.length;
	if (n === 0) return { n: 0, accuracy: 0, meanConfidence: 0, brier: 0, overconfidentMisses: 0, byTopic: [] };
	let hits = 0;
	let conf = 0;
	let brier = 0;
	let over = 0;
	const topics = new Map<string, { n: number; hits: number; conf: number }>();
	for (const e of events) {
		const p = e.confidence / 100;
		hits += e.correct ? 1 : 0;
		conf += p;
		brier += (p - (e.correct ? 1 : 0)) ** 2;
		if (!e.correct && e.confidence >= 70) over++;
		const t = e.topic ?? "(none)";
		const agg = topics.get(t) ?? { n: 0, hits: 0, conf: 0 };
		agg.n++;
		agg.hits += e.correct ? 1 : 0;
		agg.conf += p;
		topics.set(t, agg);
	}
	return {
		n,
		accuracy: hits / n,
		meanConfidence: conf / n,
		brier: brier / n,
		overconfidentMisses: over,
		byTopic: [...topics.entries()].map(([topic, a]) => ({ topic, n: a.n, accuracy: a.hits / a.n, meanConfidence: a.conf / a.n })),
	};
}

export function calibrationLine(events: CalibrationEvent[]): string {
	const s = summarizeCalibration(events);
	if (s.n === 0) return "Calibration: no graded answers yet.";
	const gap = Math.round((s.meanConfidence - s.accuracy) * 100);
	const dir = gap > 5 ? `overconfident by ${gap} pts` : gap < -5 ? `underconfident by ${-gap} pts` : "well calibrated";
	const worst = s.byTopic
		.filter((t) => t.n >= 3)
		.map((t) => ({ ...t, gap: t.meanConfidence - t.accuracy }))
		.sort((a, b) => b.gap - a.gap)[0];
	return (
		`Calibration (${s.n} answers): accuracy ${Math.round(s.accuracy * 100)}%, mean confidence ${Math.round(s.meanConfidence * 100)}% — ${dir}` +
		(s.overconfidentMisses ? `; ${s.overconfidentMisses} high-confidence miss${s.overconfidentMisses === 1 ? "" : "es"}` : "") +
		(worst && worst.gap > 0.1 ? `; most overconfident on "${worst.topic}"` : "") +
		"."
	);
}

// ── Event log (append-only) and concept dossiers ───────────────────────────

const EVENT_TEXT_MAX = 400;

export function eventsPath(cwd: string): string {
	return path.join(cwd, ".learn", "events.jsonl");
}

function clip(t: string | undefined, n = EVENT_TEXT_MAX): string | undefined {
	if (!t) return undefined;
	const one = t.replace(/\s+/g, " ").trim();
	return one.length > n ? `${one.slice(0, n - 1)}…` : one;
}

export function recordEvent(cwd: string, ev: Omit<LearnEvent, "at" | "session">): LearnEvent {
	const session = currentSession(cwd);
	const rec: LearnEvent = { at: new Date().toISOString(), session: session?.id, ...ev, prompt: clip(ev.prompt) ?? "", answer: clip(ev.answer), firstError: clip(ev.firstError), reading: clip(ev.reading) };
	const file = eventsPath(cwd);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.appendFileSync(file, `${JSON.stringify(rec)}\n`, "utf8");
	if (rec.topic) {
		try {
			writeDossier(cwd, rec.topic);
		} catch {
			// a dossier is a convenience; never fail the event
		}
	}
	return rec;
}

export function loadEvents(cwd: string): LearnEvent[] {
	const file = eventsPath(cwd);
	if (!fs.existsSync(file)) return [];
	return fs
		.readFileSync(file, "utf8")
		.split("\n")
		.filter((l) => l.trim())
		.map((l) => {
			try {
				return JSON.parse(l) as LearnEvent;
			} catch {
				return undefined;
			}
		})
		.filter((e): e is LearnEvent => !!e);
}

export function closeSession(cwd: string, note: string): SessionRecord | undefined {
	const store = loadLearner(cwd);
	const s = store.sessions.at(-1);
	if (!s) return undefined;
	s.ended = new Date().toISOString();
	s.note = note.trim();
	saveLearner(cwd, store);
	return s;
}

/** Accuracy on unannounced long-delay retention checks — the harness's outcome metric. */
export function retentionSummary(events: LearnEvent[]): { n: number; accuracy: number } {
	const r = events.filter((e) => e.retention && e.verdict !== "hint");
	return { n: r.length, accuracy: r.length ? r.filter((e) => e.verdict === "correct").length / r.length : 0 };
}

function verdictMark(v: LearnEvent["verdict"]): string {
	return v === "correct" ? "✓" : v === "partial" ? "◐" : v === "incorrect" ? "✗" : v === "dontKnow" ? "idk" : "hint";
}

/**
 * knowledge/<slug>.md — one human-readable (Obsidian) dossier per concept:
 * status, what it serves, open misconceptions, cards, and the evidence trail
 * (latest first). Regenerated from the event log; safe to delete.
 */
export function writeDossier(cwd: string, slug: string): string {
	const store = loadLearner(cwd);
	const f = store.fundamentals.find((x) => x.slug === slug);
	const lesson = store.lessons.find((l) => l.slug === slug);
	const title = f?.title ?? lesson?.title ?? slug;
	const status = fundamentalStatus(store, slug);
	const serves: string[] = [];
	for (const g of store.goals) for (const m of g.milestones) if (m.needs.includes(slug)) serves.push(`${g.title} → ${m.title}`);
	const events = loadEvents(cwd).filter((e) => e.topic === slug).reverse();
	const mis = store.misconceptions.filter((m) => m.topic === slug);
	const lines = [
		"---",
		`slug: ${slug}`,
		`status: ${status}`,
		...(f?.domain ? [`domain: ${f.domain}`] : []),
		`updated: ${new Date().toISOString()}`,
		"---",
		`# ${title}`,
		"",
		`**Status:** ${status}${f?.note ? ` — ${f.note}` : ""}`,
		...(serves.length ? ["", "**Serves:**", ...serves.map((x) => `- ${x}`)] : []),
		...(lesson ? ["", `**Lesson:** [[${(lesson.file ?? `lessons/${slug}.md`).replace(/^lessons\//, "").replace(/\.md$/, "")}]] (${lesson.status}${lesson.nodes.length ? `, ${lesson.nodes.filter((n) => n.status === "confirmed").length}/${lesson.nodes.length} nodes` : ""})${lesson.summary ? ` — ${lesson.summary}` : ""}`] : []),
		...(mis.length ? ["", "## Misconceptions", ...mis.map((m) => `- [${m.status}] believed "${m.claim}" — truth: ${m.truth} (for ${m.evidence.filter((e) => e.kind === "for").length} / against ${m.evidence.filter((e) => e.kind === "against").length})`)] : []),
		"",
		`## Evidence (${events.length}, latest first)`,
		...(events.length
			? events.slice(0, 40).map((e) => {
					const bits = [`${e.at.slice(0, 10)} ${e.source}${e.check ? `/${e.check}` : ""} ${verdictMark(e.verdict)}${e.score !== undefined ? ` ${Math.round(e.score * 100)}%` : ""}${e.confidence !== undefined ? ` (conf ${e.confidence}%)` : ""}${e.retention ? " [retention]" : ""}`];
					bits.push(`  - asked: ${e.prompt}`);
					if (e.answer) bits.push(`  - answered: ${e.answer}`);
					if (e.firstError) bits.push(`  - first error: ${e.firstError}`);
					return `- ${bits.join("\n")}`;
				})
			: ["- (none yet)"]),
	];
	const dir = path.join(cwd, "knowledge");
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, `${slug}.md`);
	fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
	return file;
}

/** The struggle trail for a set of topics: recent non-correct events, newest first. */
export function recentStruggles(cwd: string, topics: Set<string>, limit = 6): string[] {
	const events = loadEvents(cwd).filter((e) => e.verdict !== "correct" && e.verdict !== "hint");
	const relevant = topics.size ? events.filter((e) => e.topic && [...topics].some((t) => e.topic === t || e.topic!.includes(t) || t.includes(e.topic!))) : events;
	return relevant
		.slice(-limit)
		.reverse()
		.map((e) => `- ${e.at.slice(0, 10)} [${e.topic ?? "?"}${e.check ? `/${e.check}` : ""}] ${verdictMark(e.verdict)}${e.confidence !== undefined ? ` conf ${e.confidence}%` : ""}: ${clip(e.prompt, 120)}${e.firstError ? ` → ${clip(e.firstError, 140)}` : ""}`);
}

// ── Curriculum logic (the scheduler lives here, in code) ───────────────────

const DAY = 24 * 60 * 60 * 1000;

export function fundamentalStatus(store: LearnerStore, slug: string): FundamentalStatus {
	const f = store.fundamentals.find((x) => x.slug === slug);
	if (f?.status) return f.status;
	const lesson = store.lessons.find((l) => l.slug === slug);
	if (!lesson) return "unknown";
	if (lesson.status === "done") return "solid";
	return lesson.nodes.some((n) => n.status === "confirmed") ? "shaky" : "unknown";
}

function needMet(store: LearnerStore, goal: Goal, need: string): boolean {
	if (need.startsWith("m:")) return goal.milestones.find((m) => m.id === need.slice(2))?.status === "done";
	return fundamentalStatus(store, need) !== "unknown";
}

export function unmetNeeds(store: LearnerStore, goal: Goal, m: Milestone): string[] {
	return m.needs.filter((n) => !needMet(store, goal, n));
}

/** Recompute locked/ready for every milestone (done / in_progress are kept). */
export function refreshMilestones(store: LearnerStore): void {
	for (const g of store.goals) {
		for (const m of g.milestones) {
			if (m.status === "done" || m.status === "in_progress") continue;
			m.status = unmetNeeds(store, g, m).length === 0 ? "ready" : "locked";
		}
	}
}

export function upsertGoal(
	cwd: string,
	input: { id: string; title: string; why?: string; weight?: number; status?: Goal["status"]; milestones?: Array<{ id: string; title: string; kind: MilestoneKind; description?: string; needs?: string[] }> },
): Goal {
	const store = loadLearner(cwd);
	const now = new Date().toISOString();
	let g = store.goals.find((x) => x.id === input.id);
	if (!g) {
		g = { id: input.id, title: input.title, weight: 2, status: "active", milestones: [], created: now, updated: now };
		store.goals.push(g);
	}
	g.title = input.title;
	if (input.why) g.why = input.why;
	if (input.weight) g.weight = Math.max(1, Math.min(3, input.weight));
	if (input.status) g.status = input.status;
	if (input.milestones) {
		const prev = new Map(g.milestones.map((m) => [m.id, m]));
		g.milestones = input.milestones.map((m) => {
			const old = prev.get(m.id);
			return { id: m.id, title: m.title, kind: m.kind, description: m.description, needs: m.needs ?? [], status: old?.status ?? "locked", evidence: old?.evidence, lesson: old?.lesson, done: old?.done };
		});
	}
	g.updated = now;
	refreshMilestones(store);
	saveLearner(cwd, store);
	return g;
}

export function setMilestone(cwd: string, goalId: string, milestoneId: string, patch: { status?: MilestoneStatus; evidence?: string; lesson?: string }): Milestone {
	const store = loadLearner(cwd);
	const g = store.goals.find((x) => x.id === goalId);
	if (!g) throw new Error(`No goal "${goalId}". Known: ${store.goals.map((x) => x.id).join(", ") || "(none)"}`);
	const m = g.milestones.find((x) => x.id === milestoneId);
	if (!m) throw new Error(`No milestone "${milestoneId}" in goal "${goalId}". Known: ${g.milestones.map((x) => x.id).join(", ")}`);
	const now = new Date().toISOString();
	if (patch.status) m.status = patch.status;
	if (patch.evidence) m.evidence = patch.evidence;
	if (patch.lesson) m.lesson = patch.lesson;
	if (patch.status === "done") {
		m.done = now;
		// Reaching a milestone is evidence the fundamentals it needs are in use.
		for (const need of m.needs) {
			if (need.startsWith("m:")) continue;
			const f = store.fundamentals.find((x) => x.slug === need);
			if (f && f.status !== "solid") {
				f.status = "solid";
				f.note = `used in milestone ${g.id}/${m.id}`;
				f.updated = now;
			} else if (!f) store.fundamentals.push({ slug: need, title: need, status: "solid", note: `used in milestone ${g.id}/${m.id}`, updated: now });
		}
	}
	g.lastTouched = now;
	g.updated = now;
	if (g.milestones.length && g.milestones.every((x) => x.status === "done")) g.status = "done";
	refreshMilestones(store);
	saveLearner(cwd, store);
	return m;
}

export function upsertFundamental(cwd: string, input: { slug: string; title?: string; domain?: string; status?: FundamentalStatus; note?: string; serves?: string[] }): Fundamental {
	const store = loadLearner(cwd);
	const now = new Date().toISOString();
	let f = store.fundamentals.find((x) => x.slug === input.slug);
	if (!f) {
		f = { slug: input.slug, title: input.title ?? input.slug, updated: now };
		store.fundamentals.push(f);
	}
	if (input.title) f.title = input.title;
	if (input.domain) f.domain = input.domain;
	if (input.status) f.status = input.status;
	if (input.note) f.note = input.note;
	f.updated = now;
	for (const ref of input.serves ?? []) {
		const [gid, mid] = ref.split("/");
		const m = store.goals.find((g) => g.id === gid)?.milestones.find((x) => x.id === mid);
		if (m && !m.needs.includes(f.slug)) m.needs.push(f.slug);
	}
	refreshMilestones(store);
	saveLearner(cwd, store);
	return f;
}

export function touchGoal(cwd: string, goalId: string): void {
	const store = loadLearner(cwd);
	const g = store.goals.find((x) => x.id === goalId);
	if (!g) return;
	g.lastTouched = new Date().toISOString();
	saveLearner(cwd, store);
}

export function recordInterest(cwd: string, i: Omit<Interest, "at">): Interest {
	const store = loadLearner(cwd);
	const rec: Interest = { at: new Date().toISOString(), ...i };
	store.interests.push(rec);
	if (i.goal) {
		const g = store.goals.find((x) => x.id === i.goal);
		if (g) g.lastTouched = rec.at;
	}
	saveLearner(cwd, store);
	return rec;
}

export interface PathPick {
	goal: Goal;
	milestone: Milestone;
	action: "attempt" | "learn";
	fundamental?: { slug: string; title: string; servesCount: number };
	score: number;
	reason: string;
}

/** How many milestones (across goals) a fundamental unlocks. */
function servesCount(store: LearnerStore, slug: string): number {
	let n = 0;
	for (const g of store.goals) for (const m of g.milestones) if (m.status !== "done" && m.needs.includes(slug)) n++;
	return n;
}

/**
 * The scheduler. For each active goal take its first unfinished milestone;
 * if its needs are met, propose attempting it, else propose learning the
 * unmet fundamental that serves the most milestones. Score = goal weight ×
 * staleness, penalised for the goal of the last learn session (rotation) and
 * boosted for a goal the learner showed interest in this week.
 */
export function nextOnPath(store: LearnerStore, now = new Date()): PathPick[] {
	refreshMilestones(store);
	const lastLearn = [...store.sessions].reverse().find((s) => s.kind === "learn");
	const lastGoal = lastLearn?.lesson ? goalOfLesson(store, lastLearn.lesson) : undefined;
	const recentInterest = new Map<string, number>();
	for (const i of store.interests) {
		if (!i.goal) continue;
		const age = (now.getTime() - new Date(i.at).getTime()) / DAY;
		if (age <= 7) recentInterest.set(i.goal, Math.max(recentInterest.get(i.goal) ?? 0, 1.5 - age / 14));
	}
	const picks: PathPick[] = [];
	for (const g of store.goals) {
		if (g.status !== "active") continue;
		const next = g.milestones.find((m) => m.status !== "done");
		if (!next) continue;
		const staleDays = (now.getTime() - new Date(g.lastTouched ?? g.created).getTime()) / DAY;
		let base = g.weight * (1 + Math.min(staleDays, 14) / 7);
		if (lastGoal === g.id) base *= 0.6;
		base *= recentInterest.get(g.id) ?? 1;
		const unmet = unmetNeeds(store, g, next);
		if (unmet.length === 0 || next.status === "in_progress") {
			picks.push({ goal: g, milestone: next, action: "attempt", score: base * 1.5, reason: `Attempt "${next.title}" in ${g.title}: ${next.status === "in_progress" ? "already in progress" : "everything it needs is in place"}.` });
			continue;
		}
		const fundamentals = unmet.filter((n) => !n.startsWith("m:"));
		if (fundamentals.length === 0) continue; // blocked on an earlier milestone (shouldn't happen if ordered)
		const ranked = fundamentals
			.map((slug) => ({ slug, title: store.fundamentals.find((f) => f.slug === slug)?.title ?? slug, servesCount: servesCount(store, slug) }))
			.sort((a, b) => b.servesCount - a.servesCount);
		const f = ranked[0];
		const others = f.servesCount - 1;
		picks.push({
			goal: g,
			milestone: next,
			action: "learn",
			fundamental: f,
			score: (base / (1 + (unmet.length - 1) * 0.5)) * (1 + 0.25 * others),
			reason: `Learn "${f.title}": it unlocks "${next.title}" in ${g.title}${others > 0 ? ` and serves ${others} other milestone${others === 1 ? "" : "s"}` : ""}${unmet.length > 1 ? ` (${unmet.length - 1} more prerequisite${unmet.length > 2 ? "s" : ""} after it)` : ""}.`,
		});
	}
	return picks.sort((a, b) => b.score - a.score);
}

/** Which goal a lesson slug belongs to (milestone lessons are "m-<goal>-<milestone>"; fundamentals via needs). */
export function goalOfLesson(store: LearnerStore, slug: string): string | undefined {
	for (const g of store.goals) {
		for (const m of g.milestones) {
			if (slug === `m-${g.id}-${m.id}` || m.lesson === slug) return g.id;
			if (m.needs.includes(slug) && m.status !== "done") return g.id;
		}
	}
	return undefined;
}

export function curriculumMap(store: LearnerStore): string {
	refreshMilestones(store);
	if (store.goals.length === 0) return "No goals set up yet.";
	const out: string[] = [];
	for (const g of store.goals) {
		const done = g.milestones.filter((m) => m.status === "done").length;
		out.push(`## ${g.title} (${g.id}) — ${g.status}, weight ${g.weight}, ${done}/${g.milestones.length} milestones${g.why ? ` — ${g.why}` : ""}`);
		for (const m of g.milestones) {
			const unmet = unmetNeeds(store, g, m);
			out.push(`- [${m.status}] ${m.id} · ${m.title} (${m.kind})${m.needs.length ? ` needs: ${m.needs.map((n) => (unmet.includes(n) ? `${n}✗` : `${n}✓`)).join(", ")}` : ""}`);
		}
	}
	const fund = store.fundamentals.map((f) => `${f.slug}:${fundamentalStatus(store, f.slug)}`);
	if (fund.length) out.push(`## Fundamentals: ${fund.join(", ")}`);
	return out.join("\n");
}

// ── Slice for a session (what the teacher gets to see) ─────────────────────

function fmtDate(iso: string): string {
	// Local calendar date, not the UTC slice of the ISO string.
	const d = new Date(iso);
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * A compact, relevant slice of the learner file for the start of a session or
 * when a lesson crosses into a new concept. Never the whole file.
 */
export function learnerSlice(cwd: string, opts: { lesson?: string; topics?: string[]; dueByTopic?: Record<string, number> } = {}): string {
	const store = loadLearner(cwd);
	const topics = new Set((opts.topics ?? []).map((t) => t.toLowerCase()));
	const out: string[] = [];

	const lesson = opts.lesson ? store.lessons.find((l) => l.slug === opts.lesson) : undefined;
	if (lesson) {
		out.push(`## Lesson "${lesson.title}" (${lesson.status}, started ${fmtDate(lesson.created)})`);
		if (lesson.goal) out.push(`Goal: ${lesson.goal}`);
		if (lesson.summary) out.push(`Where we left off: ${lesson.summary}`);
		if (lesson.nodes.length) {
			out.push("Nodes (id · label · kind · status · assigned check · hints):");
			for (const n of lesson.nodes) out.push(`- ${n.id} · ${n.label} · ${n.kind} · ${n.status} · ${n.check} · ${n.hints}${n.note ? ` · ${n.note}` : ""}`);
		}
		if (lesson.plan) out.push("Plan (mermaid):\n```mermaid\n" + lesson.plan.trim() + "\n```");
		for (const t of [lesson.slug, ...lesson.title.toLowerCase().split(/\s+/)]) topics.add(t);
	}

	const active = store.goals.filter((g) => g.status === "active");
	if (active.length) {
		refreshMilestones(store);
		out.push("## Goals (next milestone each)");
		for (const g of active) {
			const next = g.milestones.find((m) => m.status !== "done");
			const done = g.milestones.filter((m) => m.status === "done").length;
			out.push(`- ${g.title} (${g.id}, w${g.weight}): ${done}/${g.milestones.length} done${next ? ` — next "${next.title}" [${next.status}]${unmetNeeds(store, g, next).length ? ` needs ${unmetNeeds(store, g, next).join(", ")}` : ""}` : " — complete"}`);
		}
		const top = nextOnPath(store)[0];
		if (top) out.push(`Scheduler's pick: ${top.reason}`);
	}

	const others = openLessons(store).filter((l) => l.slug !== opts.lesson);
	if (others.length) {
		out.push("## Other open lessons");
		for (const l of others.slice(0, 5)) {
			const done = l.nodes.filter((n) => n.status === "confirmed").length;
			out.push(`- ${l.title} (${l.slug}): ${done}/${l.nodes.length} nodes, last touched ${fmtDate(l.updated)}${l.summary ? ` — ${l.summary}` : ""}`);
		}
	}

	const relevant = (m: Misconception) =>
		topics.size === 0 || topics.has(m.topic) || [...topics].some((t) => m.topic.includes(t) || t.includes(m.topic));
	const open = store.misconceptions.filter((m) => m.status === "open" && relevant(m));
	if (open.length) {
		out.push("## Open misconceptions (evidence-weighted; test, don't assume)");
		for (const m of open.slice(0, 8)) {
			const f = m.evidence.filter((e) => e.kind === "for").length;
			const a = m.evidence.filter((e) => e.kind === "against").length;
			out.push(`- [${m.topic}] believed: "${m.claim}" — truth: ${m.truth} (for ${f} / against ${a}, last ${fmtDate(m.updated)})`);
		}
	}
	const recentResolved = store.misconceptions.filter((m) => m.status === "resolved" && relevant(m)).slice(-3);
	if (recentResolved.length) {
		out.push("## Recently resolved");
		for (const m of recentResolved) out.push(`- [${m.topic}] "${m.claim}" → resolved ${fmtDate(m.updated)}`);
	}

	const struggles = recentStruggles(cwd, topics);
	if (struggles.length) out.push("## Recent struggles (what was asked → where it went wrong; re-test these, don't assume)", ...struggles);

	const cal = store.calibration.filter((e) => topics.size === 0 || (e.topic && topics.has(e.topic)));
	out.push(`## ${calibrationLine(cal.length >= 5 ? cal : store.calibration)}`);
	const ret = retentionSummary(loadEvents(cwd));
	if (ret.n) out.push(`## Long-delay retention checks: ${ret.n}, accuracy ${Math.round(ret.accuracy * 100)}% (the real outcome metric)`);

	if (opts.dueByTopic && Object.keys(opts.dueByTopic).length) {
		out.push("## Cards due: " + Object.entries(opts.dueByTopic).map(([t, n]) => `${t} ${n}`).join(", "));
	}

	const sessions = store.sessions.slice(-4);
	if (sessions.length) {
		out.push("## Recent sessions");
		for (const s of sessions) out.push(`- ${fmtDate(s.at)} ${s.kind}${s.budgetMin ? ` ${s.budgetMin}min` : ""}${s.lesson ? ` (${s.lesson})` : ""}${s.note ? `: ${s.note}` : ""}`);
	}
	return out.join("\n");
}
