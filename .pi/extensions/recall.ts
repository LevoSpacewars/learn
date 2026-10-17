/**
 * recall — free-recall answers, graded by an independent grader.
 *
 * The teacher poses a prompt that has a right answer but no options: the
 * learner TYPES the answer, or works it on paper and sends a PHOTO from the
 * phone page (whichever arrives first wins). Then they rate their confidence
 * (0-100), and a context-free grader (see review/grader.ts) compares the
 * answer with the reference the teacher wrote BEFORE the learner answered.
 *
 * Kinds (the critical-thinking checks; which one a node gets is assigned by
 * lesson_plan / review_due, not chosen here):
 *   recall   — say the idea and why                 explain  — explain-back in own words
 *   predict  — commit to an outcome before reveal   boundary — which assumption / what breaks
 *   flaw     — is this (planted-error) argument right?   transfer — same structure, new clothes
 *   problem  — work it on paper
 *
 * Records latency and confidence (calibration) and, when a cardId is given,
 * grades the FSRS card automatically (the teacher can override with
 * review_grade). Typing `?` alone asks for a hint (logged: no unaided attempt
 * yet); typing `idk` alone is an honest "I don't know".
 *
 * Not loaded into subagents.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, Text, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import { type GradeResult, grade } from "./review/grader.ts";
import { gradeCard, refreshReviewStatus } from "./review/index.ts";
import { plainMath } from "./review/plainmath.ts";
import { type PromptAnswer, setLastResult, setPending } from "./review/prompts.ts";
import {
	type Pedagogy,
	QUICK_GUESS,
	armReading,
	creditReading,
	floorReason,
	clearMiss,
	gateReason,
	isMiss,
	isReady,
	markRead,
	creditReply,
	isQuestionText,
	oweReply,
	pedagogy,
	predictReason,
	readBodyReason,
	readingReason,
	readyAnswered,
	replyReason,
	recordOutcome,
	resetPedagogy,
} from "./review/pedagogy.ts";
import { type CheckKind, loadLearner, recordCalibration, recordEvent } from "./review/store.ts";
import { webRead } from "./review/ui.ts";

type RecallStatus = "answered" | "hint" | "dontKnow" | "skipped" | "ended" | "cancelled" | "unavailable" | "blocked";
type Modality = "typed" | "photo" | "audio";

interface RecallDetails {
	status: RecallStatus;
	phase?: "asked" | "done";
	kind: CheckKind;
	prompt: string;
	paper: boolean;
	topic?: string;
	modality?: Modality;
	answerText?: string;
	photos?: string[]; // basenames inside work/, for ![[embed]]
	confidence?: number;
	latencyMs?: number;
	verdict?: GradeResult["verdict"] | "notAnswer";
	score?: number;
	reading?: string;
	firstError?: string;
	feedback?: string;
	cardId?: string;
	cardRating?: string;
	message?: string;
	say?: string; // shown to the learner above the question
	banner?: string; // fixed framing line (predict: quick guess)
}

const KIND_LABEL: Record<CheckKind, string> = {
	recall: "Recall",
	explain: "Explain it back",
	predict: "Predict",
	boundary: "Boundary",
	flaw: "Find the flaw",
	transfer: "Transfer",
	problem: "Problem",
};

const RecallParams = Type.Object({
	prompt: Type.String({
		description:
			"What the learner sees. Self-contained. ALL math in LaTeX ($k\\,dt$, $e^{-kt}$, $\\frac{a}{b}$): it renders on the web page and in Obsidian, and is auto-converted for the terminal; never write ASCII math like 'k x dt' or 'e^-kt'. After a miss: ONE step, at most two parts. For 'flaw': the full planted-error argument plus 'Is this right? If not, where does it go wrong?'",
	}),
	reference: Type.String({
		description:
			"HIDDEN. The correct answer with its reason, or the key points a good answer must contain. For 'flaw': exactly what the planted error is and where. For 'problem': the method and the result. Write it BEFORE the learner answers; the grader compares against it.",
	}),
	kind: Type.Optional(
		Type.Union(
			[
				Type.Literal("recall"),
				Type.Literal("explain"),
				Type.Literal("predict"),
				Type.Literal("boundary"),
				Type.Literal("flaw"),
				Type.Literal("transfer"),
				Type.Literal("problem"),
			],
			{ description: "The check kind assigned by lesson_plan / review_due. Default recall." },
		),
	),
	topic: Type.Optional(Type.String({ description: "Topic slug (for calibration tracking)." })),
	cardId: Type.Optional(Type.String({ description: "Review card id when this answers a due card; the card is graded automatically." })),
	paper: Type.Optional(Type.Boolean({ description: "Suggest working on paper and sending a photo (default true for 'problem')." })),
	rubric: Type.Optional(
		Type.String({
			description:
				"Optional, one line: what the SUBSTANCE of a right answer must contain (the idea, the method, the result). Never a checklist of secondary items (units written out, a step named, a number restated, a label spelled out): those are notes, not errors, and a rubric that lists them turns right answers into misses.",
		}),
	),
	retention: Type.Optional(Type.Boolean({ description: "True when review_due marked this card RETENTION CHECK (unannounced long-delay test). Recorded as the outcome metric." })),
	say: Type.Optional(
		Type.String({
			description:
				"1-3 lines shown to the learner ABOVE the question (LaTeX math): your diagnosis of the last miss, or the one line of framing he needs. Your thinking is invisible to him; this is how a diagnosis reaches him. Counts as text written since the last miss.",
		}),
	),
});

const ReadParams = Type.Object({
	slug: Type.String({ description: "Lesson slug (as in lesson_plan)." }),
	node: Type.String({ description: "Node id this reading teaches (as in lesson_plan)." }),
	title: Type.String({ description: "Section title, a few words (e.g. 'Why the slice probability is k dt')." }),
	body: Type.String({
		description:
			"The reading, markdown + LaTeX ($...$, $$...$$), at least 1200 characters: a textbook page, not a paragraph. (1) Why we need this node now. (2) The derivation or guided derivation, every move motivated (how could he have discovered it?). (3) ONE worked instance with concrete numbers, each step with its reason. (4) What it hangs off: the earlier node or handle he already owns.",
	}),
	figure: Type.Optional(Type.String({ description: "Optional figure under viz/ (e.g. viz/decay.svg, from the plot tool), shown under the text." })),
});

function createEditorTheme(theme: any): EditorTheme {
	return {
		borderColor: (s) => theme.fg("accent", s),
		selectList: {
			selectedPrefix: (t) => theme.fg("accent", t),
			selectedText: (t) => theme.fg("accent", t),
			description: (t) => theme.fg("muted", t),
			scrollInfo: (t) => theme.fg("dim", t),
			noMatch: (t) => theme.fg("warning", t),
		},
	};
}

function addWrapped(lines: string[], text: string, width: number, indent = ""): void {
	const contentWidth = Math.max(1, width - indent.length);
	for (const line of wrapTextWithAnsi(text, contentWidth)) lines.push(truncateToWidth(`${indent}${line}`, width));
}

/** FSRS rating from the grader's score: the substance decides, not the verdict label. */
export function ratingFor(r: Pick<GradeResult, "verdict" | "score">, latencyMs: number): "again" | "hard" | "good" | "easy" {
	if (r.verdict === "incorrect" || r.score < 0.4) return "again";
	if (r.score < 0.75) return "hard";
	if (r.verdict === "correct" && latencyMs < 15000 && r.score >= 0.95) return "easy";
	return "good";
}

interface UiOutcome {
	promptId?: string;
	status: RecallStatus;
	answer?: PromptAnswer;
	confidence?: number;
	latencyMs: number;
	graded?: GradeResult;
}

async function askRecall(
	ctx: any,
	opts: { kind: CheckKind; prompt: string; paper: boolean; reference: string; say?: string; banner?: string; runGrade: (a: PromptAnswer, confidence: number) => Promise<GradeResult> },
): Promise<UiOutcome> {
	const startedAt = Date.now();
	const promptId = `p${startedAt.toString(36)}`;
	return ctx.ui.custom((tui: any, theme: any, _kb: any, done: (r: UiOutcome) => void) => {
		let phase: "answer" | "confidence" | "grading" | "feedback" = "answer";
		let answer: PromptAnswer | undefined;
		let latencyMs = 0;
		let confidence = 50;
		let confSet = false; // the learner must move the value; a default is not a judgement
		let typedDigits = "";
		let graded: GradeResult | undefined;
		let gradeError: string | undefined;
		let cachedLines: string[] | undefined;
		let cachedWidth = -1;
		let showQr = false;
		const editor = new Editor(tui, createEditorTheme(theme));
		editor.focused = true;
		editor.disableSubmit = true; // Enter is intercepted below so the buffer isn't cleared

		function refresh() {
			cachedLines = undefined;
			tui.requestRender();
		}
		function finish(r: UiOutcome) {
			setPending(undefined);
			done({ ...r, promptId });
		}
		function receive(a: PromptAnswer): boolean {
			if (phase !== "answer") return false;
			answer = a;
			latencyMs = Date.now() - startedAt;
			if (a.hint) {
				finish({ status: "hint", answer: a, latencyMs });
				return true;
			}
			if (a.skip) {
				finish({ status: "skipped", answer: a, latencyMs });
				return true;
			}
			if (a.endRecall) {
				finish({ status: "ended", answer: a, latencyMs });
				return true;
			}
			if (a.dontKnow) {
				finish({ status: "dontKnow", answer: a, latencyMs });
				return true;
			}
			if (typeof a.confidence === "number") {
				confidence = a.confidence;
				startGrading();
			} else {
				phase = "confidence";
				editor.focused = false;
			}
			refresh();
			return true;
		}
		function startGrading() {
			phase = "grading";
			refresh();
			opts
				.runGrade(answer!, confidence)
				.then((g) => {
					graded = g;
				})
				.catch((e) => {
					gradeError = String(e?.message ?? e);
				})
				.finally(() => {
					phase = "feedback";
					// Publish for the web surface as soon as grading is done (not when Enter is pressed here).
					if (graded && !graded.attempted) setLastResult({ id: promptId, at: Date.now(), kind: opts.kind, prompt: opts.prompt, verdict: "notAnswer", feedback: "Not graded: that wasn't an answer. The tutor will reply.", confidence, latencyMs });
					else setLastResult({ id: promptId, at: Date.now(), kind: opts.kind, prompt: opts.prompt, verdict: graded?.verdict ?? "ungraded", score: graded?.score, feedback: graded?.feedback ?? gradeError, reading: graded?.reading, firstError: graded?.firstError, reference: opts.reference, confidence, latencyMs });
					refresh();
					// Answered from the phone/iPad: the result is on that screen, so don't wait for a keypress here.
					if (answer?.source !== "tui") setTimeout(() => { if (phase === "feedback") finish({ status: "answered", answer, confidence, latencyMs, graded }); }, 8000);
				});
		}

		setPending({ id: promptId, kind: opts.kind, prompt: opts.prompt, paper: opts.paper, say: opts.say, banner: opts.banner, startedAt, answer: receive });

		function handleInput(data: string) {
			if (phase === "answer") {
				if (matchesKey(data, Key.escape)) {
					finish({ status: "cancelled", latencyMs: Date.now() - startedAt });
					return;
				}
				if (matchesKey(data, Key.enter)) {
					const text = editor.getText().trim();
					if (!text) return;
					if (/^(qr|phone)$/i.test(text)) {
						// Show the answer-pad QR code inside the prompt (the phone may not be connected yet).
						showQr = !showQr;
						editor.setText("");
						refresh();
						return;
					}
					if (text === "?") return void receive({ source: "tui", hint: true });
					if (/^(skip|next|move on)$/i.test(text)) return void receive({ source: "tui", skip: true });
					if (/^(lesson|end recall|start (the )?lesson|teach me)$/i.test(text)) return void receive({ source: "tui", endRecall: true });
					if (/^(idk|i don'?t know)$/i.test(text)) return void receive({ source: "tui", dontKnow: true });
					receive({ source: "tui", text });
					return;
				}
				editor.handleInput(data);
				tui.requestRender();
				return;
			}
			if (phase === "confidence") {
				const valueKey = matchesKey(data, Key.left) || matchesKey(data, Key.right) || matchesKey(data, Key.down) || matchesKey(data, Key.up) || /^[0-9]$/.test(data) || matchesKey(data, Key.backspace);
				if (valueKey) confSet = true;
				if (matchesKey(data, Key.left)) confidence = Math.max(0, confidence - 10);
				else if (matchesKey(data, Key.right)) confidence = Math.min(100, confidence + 10);
				else if (matchesKey(data, Key.down)) confidence = Math.max(0, confidence - 5);
				else if (matchesKey(data, Key.up)) confidence = Math.min(100, confidence + 5);
				else if (/^[0-9]$/.test(data)) {
					typedDigits = (typedDigits + data).slice(-3);
					confidence = Math.min(100, Number(typedDigits));
				} else if (matchesKey(data, Key.backspace)) {
					typedDigits = typedDigits.slice(0, -1);
					confidence = typedDigits ? Number(typedDigits) : 0;
				} else if (matchesKey(data, Key.enter)) {
					if (!confSet) {
						refresh();
						return;
					}
					startGrading();
					return;
				} else if (matchesKey(data, Key.escape)) {
					// Skip confidence: record as unknown by using 50.
					confidence = 50;
					startGrading();
					return;
				}
				refresh();
				return;
			}
			if (phase === "feedback") {
				if (matchesKey(data, Key.enter) || matchesKey(data, Key.escape)) {
					finish({ status: "answered", answer, confidence, latencyMs, graded });
				}
			}
		}

		function render(width: number): string[] {
			if (cachedLines && cachedWidth === width && phase !== "answer") return cachedLines;
			const lines: string[] = [];
			const add = (t: string) => lines.push(truncateToWidth(t, width));
			add(theme.fg("accent", "─".repeat(width)));
			add(theme.fg("accent", ` ${KIND_LABEL[opts.kind]}`) + (opts.paper ? theme.fg("dim", "  · work on paper and send a photo from your phone, or type") : ""));
			lines.push("");
			if (opts.say) {
				addWrapped(lines, theme.fg("muted", plainMath(opts.say)), width, " ");
				lines.push("");
			}
			addWrapped(lines, theme.fg("text", plainMath(opts.prompt)), width, " ");
			if (opts.banner) addWrapped(lines, theme.fg("warning", opts.banner), width, " ");
			lines.push("");
			if (phase === "answer") {
				if (showQr) {
					const sh = (globalThis as any).__learnPhone as { url?: string; qrLines?: string[] } | undefined;
					const qr = sh?.qrLines ?? (sh?.url ? [sh.url] : ["Phone server not running (is Tailscale on?)"]);
					for (const l of qr) add(" " + l);
					lines.push("");
				}
				for (const l of editor.render(Math.max(1, width - 2))) lines.push(l);
				lines.push("");
				add(theme.fg("dim", " Enter submit · Ctrl+J newline · ? = hint · idk = I don't know · skip = move on · lesson = end recall, start the lesson · qr = phone link · Esc cancel"));
			} else if (phase === "confidence") {
				const filled = Math.round(confidence / 5);
				const bar = "█".repeat(filled) + "░".repeat(20 - filled);
				add(theme.fg("text", ` How confident are you that this is right?`));
				add(` ${theme.fg(confSet ? "accent" : "dim", bar)} ${confSet ? theme.fg("accent", `${confidence}%`) : theme.fg("dim", "— (set it)")}`);
				lines.push("");
				add(theme.fg("dim", confSet ? " ←/→ ±10 · ↑/↓ ±5 · type digits · Enter confirm" : " Move it first: ←/→ ±10 · ↑/↓ ±5 · or type digits · then Enter"));
			} else if (phase === "grading") {
				add(theme.fg("muted", ` Grading independently… (${answer?.photos?.length ? "reading your photo" : "reading your answer"})`));
			} else {
				if (gradeError || !graded) {
					addWrapped(lines, theme.fg("warning", ` Grader unavailable: ${gradeError ?? "no result"}. The teacher will grade this by hand.`), width, " ");
				} else if (!graded.attempted) {
					add(theme.fg("muted", ` — not graded: that wasn't an answer. The tutor will reply.`));
				} else {
					const color = graded.verdict === "correct" ? "success" : graded.verdict === "partial" ? "warning" : "error";
					const mark = graded.verdict === "correct" ? "✓" : graded.verdict === "partial" ? "◐" : "✗";
					add(theme.fg(color, ` ${mark} ${graded.verdict.toUpperCase()}  (${Math.round(graded.score * 100)}%)`) + theme.fg("dim", `  confidence ${confidence}% · ${Math.round(latencyMs / 1000)}s`));
					if (graded.reading) addWrapped(lines, theme.fg("dim", `Read as: ${graded.reading}`), width, " ");
					if (graded.firstError) addWrapped(lines, theme.fg("warning", `First error: ${graded.firstError}`), width, " ");
					lines.push("");
					addWrapped(lines, theme.fg("text", graded.feedback), width, " ");
					// Score yourself against the key points: the one thing shown to fix overconfidence.
					lines.push("");
					addWrapped(lines, theme.fg("muted", `Key points (reference): ${plainMath(opts.reference)}`), width, " ");
				}
				lines.push("");
				add(theme.fg("dim", " Enter/Esc to continue"));
			}
			add(theme.fg("accent", "─".repeat(width)));
			if (phase !== "answer") {
				cachedLines = lines;
				cachedWidth = width;
			}
			return lines;
		}

		return {
			render,
			invalidate: () => {
				cachedLines = undefined;
				editor.invalidate();
			},
			handleInput,
		};
	});
}

// Shared UI mutex with quiz / ask_user_question (stashed on globalThis so
// separate extension files serialize their pop-ups against each other).
function withUILock<T>(fn: () => Promise<T>): Promise<T> {
	const g = globalThis as any;
	if (!g.__piSharedUiLock) {
		let chain: Promise<void> = Promise.resolve();
		g.__piSharedUiLock = {
			withLock<U>(f: () => U | Promise<U>): Promise<U> {
				const prev = chain;
				let release: () => void;
				chain = new Promise<void>((r) => {
					release = r;
				});
				return prev.then(f).finally(() => release!());
			},
		};
	}
	return g.__piSharedUiLock.withLock(fn);
}

function result(text: string, details: RecallDetails) {
	return { content: [{ type: "text" as const, text }], details };
}

// ---------- pedagogy gates ----------
// The gates (open floor, reading, miss/diagnose/teach, predict) live in
// review/pedagogy.ts so quiz.ts shares the same globalThis state. Re-exported
// here for the tests and older imports.
export { FLOOR_MESSAGE, countParts, floorReason, gateReason, isReady } from "./review/pedagogy.ts";

// ---------- turn-end guard ----------
// The tutor sometimes stops on a question written as prose ("Say go when you're
// ready", "Tell me where it goes wrong"). The learner answers from the web page,
// which has no answer box unless a tool prompt is open, so the lesson stalls.
// At the final boundary of a run, if the last thing said is waiting on the
// learner and no prompt tool was opened, push the tutor to pose it with a tool.
const WAITING = /(\?\s*[*_)"'”’]*\s*$)|say\s+["“']?go\b|when you'?re ready|ready when you are|let me know when|i'?ll (?:pose|ask|give you)|\bnext i'?ll\b|tell me (?:where|what|why|how|which|if)|your turn\b|over to you|have a go\b|give it a (?:go|try)|try (?:it|this|that)\b[^.]*\.?\s*$/i;
/** True when the tutor's final text is waiting on the learner. */
export function endsWaitingOnLearner(text: string): boolean {
	const tail = text.trim().slice(-400);
	return tail.length > 0 && WAITING.test(tail);
}
function lastAssistant(messages: any[]): any | undefined {
	for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "assistant") return messages[i];
	return undefined;
}
const PROMPT_TOOLS = new Set(["recall", "quiz", "ask_user_question", "lesson_read"]);

/** Every refusal recall applies before posing, in order. Predict is a pretest: it comes before the reading. */
export function recallBlock(p: Pedagogy, o: { kind: CheckKind; prompt: string; paper?: boolean; say?: string }): string | undefined {
	if (o.kind === "predict") {
		const r = predictReason(o.prompt, o.paper);
		if (r) return r;
	}
	return (o.kind === "predict" ? undefined : readingReason(p)) ?? floorReason(p) ?? gateReason(p, o.prompt, o.say?.length ?? 0);
}

/** After lesson_plan / lesson_node: the first pending node of the lesson needs a reading. */
function armForLesson(p: Pedagogy, cwd: string, slug: string): void {
	try {
		const lesson = loadLearner(cwd).lessons.find((l) => l.slug === slug);
		armReading(p, slug, lesson?.nodes.find((n) => n.status === "pending")?.id);
	} catch {
		// unreadable learner file: no gate rather than a stuck lesson
	}
}

/** A figure for lesson_read: a file under viz/ inside the vault. */
function figurePath(cwd: string, fig: string | undefined): { rel?: string; error?: string } {
	if (!fig?.trim()) return {};
	const rel = fig.trim().replace(/^\.?\/+/, "").replace(/^!\[\[|\]\]$/g, "").split("|")[0];
	const abs = path.resolve(cwd, rel);
	if (!rel.startsWith("viz/") || !abs.startsWith(path.resolve(cwd, "viz") + path.sep)) return { error: `figure must be a path under viz/ (got "${fig}")` };
	if (!fs.existsSync(abs)) return { error: `figure ${rel} does not exist; make it first (plot tool) or drop the figure` };
	return { rel };
}

interface ReadDetails {
	status: "read" | "question" | "refused" | "cancelled" | "unavailable";
	phase?: "shown";
	slug: string;
	node: string;
	title: string;
	body: string;
	figure?: string;
	question?: string;
	message?: string;
}

export default function recall(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

	// Lesson context: only guard sessions where a recall has been posed, and at
	// most one nudge per learner message (a nudge that fails must not loop).
	let lessonActive = false;
	let nudged = false;
	let closedThisRun = false; // the session was wrapped up: closing remarks may end on a question
	pi.on("tool_call", async (event) => {
		const name = (event as any).toolName;
		if (name === "session_close") closedThisRun = true;
		if (!PROMPT_TOOLS.has(name)) return;
		lessonActive = true;
		const input = (event as any).input ?? {};
		const own = String(input.details ?? input.say ?? input.body ?? "").trim().length;
		const reason = replyReason(pedagogy(), name, own);
		if (reason) return { block: true, reason };
	});
	pi.on("agent_start", async () => {
		closedThisRun = false;
	});
	pi.on("input", async (event) => {
		nudged = false;
		// A message typed mid-lesson is usually a question about the material.
		const text = String((event as any).text ?? "");
		if (lessonActive && isQuestionText(text)) oweReply(pedagogy(), text);
	});
	pi.on("agent_before_settle", async (event) => {
		const e = event as any;
		if (process.env.PI_GUARD_DEBUG) {
			const lm = lastAssistant(e.context?.contextMessages ?? []);
			fs.appendFileSync(process.env.PI_GUARD_DEBUG, JSON.stringify({ lessonActive, nudged, closedThisRun, outcome: e.outcome, canContinue: e.context?.canContinue, n: e.context?.contextMessages?.length, roles: (e.context?.contextMessages ?? []).map((m: any) => m.role), last: lm?.content }) + "\n");
		}
		if (!lessonActive || nudged || closedThisRun || e.outcome !== "completed") return;
		const last = lastAssistant(e.context?.contextMessages ?? []);
		if (!last) return;
		const content = Array.isArray(last.content) ? last.content : [];
		if (content.some((c: any) => c.type === "toolCall")) return;
		const text = content.filter((c: any) => c.type === "text").map((c: any) => String(c.text ?? "")).join("\n");
		if (!endsWaitingOnLearner(text)) return;
		nudged = true;
		return {
			entries: [
				{
					type: "custom_message" as const,
					customType: "tutor-guard",
					display: false,
					content:
						"[tutor-guard] You ended your turn on a question to the learner written as plain text. He answers from the web page, which shows an answer box ONLY while a tool prompt is open, so he cannot reply and the lesson has stalled. Do not repeat your explanation and do not ask whether he is ready. Pose that exact question now: `recall` if it has a right answer (write the reference first), `ask_user_question` if it is a choice. If you meant to end the session, call `ask_user_question` (continue / pause) instead.",
				},
			],
			continue: true,
		};
	});

	// Count the teacher's prose so the gate above knows whether anything was
	// said (or taught) between a miss and the next recall.
	pi.on("message_end", async (event) => {
		const msg = (event as any).message;
		if (!msg || msg.role !== "assistant") return;
		const chars = (msg.content || [])
			.filter((c: any) => c.type === "text")
			.map((c: any) => String(c.text ?? "").trim())
			.reduce((n: number, t: string) => n + t.length, 0);
		if (chars) pedagogy().sinceMissChars += chars;
		creditReply(
			pedagogy(),
			(msg.content || [])
				.filter((c: any) => c.type === "text")
				.map((c: any) => String(c.text ?? ""))
				.join("\n\n"),
		);
	});
	pi.on("session_start", async () => {
		resetPedagogy();
	});

	// Open floor at the start of a teach session: the learner gets to discuss
	// before the first question. His "ready" (typed, or picked in
	// ask_user_question) lifts it; discussion does not.
	pi.on("before_agent_start", async (event, ctx) => {
		const prompt = String((event as any).prompt ?? "");
		const p = pedagogy();
		if (/<skill name="teach"/.test(prompt) || /^\s*\/skill:teach\b/.test(prompt)) {
			p.floorNeeded = true;
			p.reviewMode = false;
			// Continuing a lesson ("Continue the lesson … (slug: x)" or 'lesson slug "x"'):
			// its first pending node is new material and must be read before it is
			// tested, exactly as after lesson_plan. A lesson with no nodes yet arms nothing.
			const m = prompt.match(/lesson slug "([^"]+)"|\(slug: ([^)\s]+)\)/);
			const slug = m?.[1] ?? m?.[2];
			if (slug) armForLesson(p, (ctx as any)?.cwd ?? process.cwd(), slug);
		} else if (/<skill name="review"/.test(prompt) || /^\s*\/skill:review\b/.test(prompt)) {
			p.floorNeeded = false; // review is not new material
			p.readNeeded = undefined;
			p.reviewMode = true; // misses need a visible diagnosis, nothing more; the retry list relearns
		} else if (isReady(prompt)) readyAnswered(p);
	});
	// Reading gate: an approved plan, or a finished node, means the next check
	// would be the first on a new node. That node must be READ first
	// (lesson_read + the learner's tap). This replaces re-arming the open floor
	// here: one "ready" per node, never two.
	pi.on("tool_result", async (event, ctx) => {
		const e = event as any;
		const name = e.toolName;
		const p = pedagogy();
		if (!e.isError && (name === "lesson_plan" || (name === "lesson_node" && (e.input?.status === "confirmed" || e.input?.status === "shaky")))) {
			const slug = String(e.details?.slug ?? e.input?.slug ?? "");
			if (slug) armForLesson(p, (ctx as any)?.cwd ?? process.cwd(), slug);
		}
		if (name === "ask_user_question") {
			const answers: any[] = e.details?.answers ?? [];
			if (answers.some((a) => isReady(String(a?.label ?? "")))) readyAnswered(p);
			// Typed "Other" text (or a free-text answer) that asks something is owed a visible reply.
			const typed = answers.find((a) => (a?.type === "other" || a?.type === "text") && isQuestionText(String(a?.label ?? "")));
			if (typed) oweReply(p, String(typed.label));
		}
	});

	pi.registerTool({
		name: "recall",
		label: "recall",
		description:
			"Pose a question with a right answer but NO options: the learner types the answer or sends a photo of paper work; then rates confidence; then an independent grader scores it against your hidden reference. Use for every check that isn't genuinely multiple-choice (explain-back, predict, boundary, find-the-flaw, transfer, problems). Returns verdict, score, what the grader read, the first error, latency and confidence — and grades the review card if cardId is given.",
		promptSnippet: "Use recall for free-recall checks (typed or photo) with an independent grader; quiz only when distractors are genuinely diagnostic.",
		promptGuidelines: [
			"Write the reference before posing: the answer AND the reason, or the exact planted error for 'flaw'.",
			"Never reveal the reference. After the result, give your own one-or-two-line response; the grader's feedback was already shown to the learner.",
			"If status is 'hint', the learner has NOT attempted yet: give ONE small hint and pose again (count it with lesson_node hints). If 'dontKnow', that's a genuine gap, not a wrong guess.",
			"If the grader's 'reading' misread the work (e.g. bad photo), trust the learner's clarification and override with review_grade / your own judgement.",
		],
		parameters: RecallParams,
		async execute(_id, params, _signal, onUpdate, ctx) {
			const kind = (params.kind ?? "recall") as CheckKind;
			const paper = params.paper ?? kind === "problem";
			const say = params.say?.trim() || undefined;
			const banner = kind === "predict" ? QUICK_GUESS : undefined;
			const base: RecallDetails = { status: "unavailable", kind, prompt: params.prompt, paper, topic: params.topic, cardId: params.cardId, say, banner };
			const ped = pedagogy();
			const blocked = recallBlock(ped, { kind, prompt: params.prompt, paper: params.paper, say });
			if (blocked) return result(blocked, { ...base, status: "blocked", message: blocked });
			if (!ctx.hasUI) return result("recall requires interactive mode UI", { ...base, message: "no UI" });
			if (say) ped.sinceMissChars += say.length; // he reads it above the question

			onUpdate?.({ content: [{ type: "text", text: "asked" }], details: { ...base, phase: "asked" } });

			const promptStarted = Date.now();
			const outcome = await withUILock(() => askRecall(ctx, {
				kind,
				prompt: params.prompt,
				paper,
				reference: params.reference,
				say,
				banner,
				runGrade: (a, confidence) =>
					grade({
						cwd: ctx.cwd,
						kind,
						prompt: params.prompt,
						reference: params.reference,
						rubric: params.rubric,
						answerText: a.text ?? a.audio?.transcript,
						photoFiles: a.photos?.map((p) => p.file),
						confidence,
					}),
			}));

			const modality: Modality | undefined = outcome.answer?.photos?.length ? "photo" : outcome.answer?.audio ? "audio" : outcome.answer ? "typed" : undefined;
			const photos = outcome.answer?.photos?.map((p) => path.basename(p.file));
			const answerText = outcome.answer?.text ?? outcome.answer?.audio?.transcript;
			const details: RecallDetails = { ...base, status: outcome.status, phase: "done", modality, answerText, photos, latencyMs: outcome.latencyMs };

			if (outcome.status !== "answered") setLastResult({ id: outcome.promptId ?? `p${promptStarted.toString(36)}`, at: Date.now(), kind, prompt: params.prompt, verdict: outcome.status, latencyMs: outcome.latencyMs });
			if (outcome.status === "cancelled") return result("Learner cancelled the prompt (Esc). Ask what they'd like to do.", details);
			const logEvent = (verdict: "correct" | "partial" | "incorrect" | "dontKnow" | "hint", extra: Partial<Parameters<typeof recordEvent>[1]> = {}) => {
				try {
					recordEvent(ctx.cwd, { source: "recall", topic: params.topic?.trim().toLowerCase(), check: kind, prompt: params.prompt, answer: answerText ?? (photos?.length ? `photo: ${photos.join(", ")}` : undefined), verdict, latencyMs: outcome.latencyMs, cardId: params.cardId, retention: params.retention || undefined, ...extra });
				} catch {
					// never block on bookkeeping
				}
			};
			if (outcome.status === "ended") {
				clearMiss(ped);
				let started = "";
				try {
					started = (globalThis as any).__learnStartLesson?.(ctx) ?? "";
				} catch (e: any) {
					started = "";
					details.message = `lesson start failed: ${e?.message ?? e}`;
				}
				return result(
					started
						? `Learner ENDED the recall phase and asked to start the lesson. Do not pose any more checks or review cards. If this was a review session, call session_close with a one-line note of what was reviewed. Then reply with one short line (e.g. "On to the lesson.") and STOP: ${started} starts automatically in the next message.`
						: "Learner ENDED the recall phase and asked to start the lesson. Do not pose any more checks or review cards. Start teaching new material now: continue the open lesson from its first pending node (no warm-up re-check), or if there is none, ask with ask_user_question what he wants to learn.",
					details,
				);
			}
			if (outcome.status === "skipped") {
				// He chose learning over testing: clear the drill-down pressure entirely.
				clearMiss(ped);
				return result(
					"Learner SKIPPED this check: he wants to learn something new now. Do NOT re-pose it, a variant, or a drill-down, and don't ask whether he wants to continue. Note it and move on: if this was a node's check, lesson_node with status shaky; if no review card covers the idea, save one with review_add_cards (that is where it gets tested, later). Then go straight to teaching the next new idea. If he skips twice in a row, check in once with ask_user_question about the pace (more explanation, fewer checks?).",
					details,
				);
			}
			if (outcome.status === "hint") {
				logEvent("hint");
				return result(
					`Learner asked for a HINT before attempting (after ${Math.round(outcome.latencyMs / 1000)}s). No unaided attempt yet. Give one small hint and pose again.`,
					details,
				);
			}
			if (outcome.status === "dontKnow") {
				logEvent("dontKnow");
				recordOutcome(ped, { correct: false, prompt: params.prompt, verdict: "dontKnow" });
				if (params.cardId) {
					const g = gradeCard(ctx.cwd, { id: params.cardId, rating: "again", note: "I don't know", check: kind, modality: "typed", latencyMs: outcome.latencyMs });
					details.cardRating = g.rating;
					refreshReviewStatus(ctx);
				}
				return result(`Learner said "I don't know" (genuine gap, not a wrong guess).${details.cardRating ? ` Card ${params.cardId} graded again.` : ""}`, details);
			}

			const g = outcome.graded;
			const confidence = outcome.confidence ?? 50;
			details.confidence = confidence;

			if (g && !g.attempted) {
				// A reaction, not an answer: nobody grades it, nothing escalates.
				Object.assign(details, { verdict: "notAnswer", reading: g.reading });
				clearMiss(ped);
				return result(
					[
						`NOT AN ANSWER: he wrote "${(answerText ?? g.reading ?? "").trim().slice(0, 300)}".`,
						"Not graded: no card rating, no miss, no calibration. Do not re-pose, drill, or lecture.",
						"Reply to him as a person in 1-3 lines of chat text. If he says his earlier work already showed it, look at that work (the grader's earlier reading) and say plainly whether he is right; if he is, grade that card with review_grade (good) and say so.",
						"Then call ask_user_question with options \"Next card\" and \"Let me redo this one\" (he can also type). Never end the turn on a plain-text question.",
					].join("\n"),
					details,
				);
			}
			if (g) {
				const miss = isMiss(g.verdict, g.score);
				Object.assign(details, { verdict: g.verdict, score: g.score, reading: g.reading, firstError: g.firstError, feedback: g.feedback });
				logEvent(g.verdict, { score: g.score, firstError: g.firstError, reading: g.reading, confidence });
				recordOutcome(ped, { correct: !miss, prompt: params.prompt, verdict: g.verdict, firstError: g.firstError });
				try {
					recordCalibration(ctx.cwd, { topic: params.topic, confidence, correct: g.verdict === "correct", source: "recall", check: kind, cardId: params.cardId, latencyMs: outcome.latencyMs });
				} catch {
					// never block on bookkeeping
				}
				if (params.cardId) {
					try {
						const r = gradeCard(ctx.cwd, { id: params.cardId, rating: ratingFor(g, outcome.latencyMs), check: kind, modality, latencyMs: outcome.latencyMs, confidence, note: g.firstError || undefined });
						details.cardRating = r.rating;
						refreshReviewStatus(ctx);
					} catch (e: any) {
						details.message = `card grade failed: ${e?.message ?? e}`;
					}
				}
			}

			const lines = [
				`Learner answered by ${modality}${photos?.length ? ` (${photos.join(", ")})` : ""} in ${Math.round(outcome.latencyMs / 1000)}s, confidence ${confidence}%.`,
				answerText ? `Answer: ${answerText}` : "",
				g
					? [
							`Grader verdict: ${g.verdict.toUpperCase()} (score ${g.score.toFixed(2)})${g.error ? " — grader output was unreadable; grade by hand" : ""}`,
							g.reading ? `Grader read: ${g.reading}` : "",
							g.firstError ? `First error: ${g.firstError}` : "",
							`Grader feedback (already shown to learner): ${g.feedback}`,
							g.verdict === "partial" && !isMiss(g.verdict, g.score)
								? "MINOR GAP, not a miss: the substance was right. At most one line about it in your next `say` (or nothing), then the next card. Do not drill, re-test, or lecture on it."
								: "",
							isMiss(g.verdict, g.score) && confidence >= 70 ? "HIGH-CONFIDENCE MISS: give richer feedback on the mechanism and re-test this soon." : "",
							isMiss(g.verdict, g.score) && ped.reviewMode
								? "NEXT STEP: put 1-3 lines he can read (what went wrong and why, and the right move) in the next recall's `say` or in chat text; the next recall is refused without it. Then either ONE narrower follow-up on that step or the next card: a missed card comes back in the retry list anyway. If the grader misread him or the card is badly cut (see LAST/REPEATED in review_due), say so and override with review_grade instead of drilling."
								: isMiss(g.verdict, g.score) && ped.missStreak >= 2
									? `NEXT STEP (enforced): ${ped.missStreak} misses in a row. STOP testing. Teach the one step that failed with a worked example (every move with its reason, concrete numbers): call lesson_read with it (slug, node, title, body), or write it as chat text of at least 350 characters; your thinking is invisible to him. Then call recall with a completion problem (one blank). The next recall is refused until the worked example is visible to him. Never end your turn on a question written as plain text: he cannot answer it from the web page.`
									: isMiss(g.verdict, g.score)
										? "NEXT STEP (enforced): drill down with ONE narrower recall (at most two parts) on exactly the step that failed, and put your diagnosis in its `say` field (1-3 lines: what went wrong and why, in your words, and what the right move was; your thinking is invisible to him). Never ask the follow-up as plain text (the web page has no answer box without an open recall). A multi-part prompt, or one with no diagnosis he can read, is refused. Do not move to a different strand until he has had another go at this one."
										: "",
							isMiss(g.verdict, g.score) && g.firstError && /slip|instead of|dropped|off by|should be|mislabel|complement|sign|factor|width/i.test(g.firstError)
								? "ATTENTION-TO-DETAIL: the first error looks like a slip inside otherwise-right working. Consider kind 'flaw' with HIS OWN line as the argument (\"Here is your step 1: ... Is it right? If not, where does it go wrong?\") so he finds it himself."
								: "",
						].join("\n")
					: "Grader unavailable — grade this answer yourself.",
				details.cardRating ? `Card ${params.cardId} graded ${details.cardRating} (override with review_grade if you disagree).` : "",
				details.message ?? "",
			].filter(Boolean);
			return result(lines.join("\n"), details);
		},
		renderCall(args: any, theme: any) {
			return new Text(theme.fg("dim", `recall · ${KIND_LABEL[(args?.kind as CheckKind) ?? "recall"] ?? "recall"}`), 0, 0);
		},
		renderResult(res: any, { expanded }: any, theme: any) {
			const d = res.details as RecallDetails | undefined;
			if (!d) return new Text(theme.fg("dim", "recall"), 0, 0);
			if (d.phase === "asked") return new Text(theme.fg("dim", "awaiting answer…"), 0, 0);
			if (d.status === "unavailable") return new Text(theme.fg("warning", d.message || "recall unavailable"), 0, 0);
			if (d.status === "blocked") return new Text(theme.fg("warning", `refused: ${(d.message ?? "").replace(/^(Blocked|Refused): /, "").slice(0, 90)}`), 0, 0);
			if (d.status === "hint") return new Text(theme.fg("warning", "hint requested"), 0, 0);
			if (d.status === "skipped") return new Text(theme.fg("dim", "skipped: moving on"), 0, 0);
			if (d.status === "ended") return new Text(theme.fg("accent", "recall ended: starting the lesson"), 0, 0);
			if (d.status === "dontKnow") return new Text(theme.fg("warning", "I don't know"), 0, 0);
			if (d.status === "cancelled") return new Text(theme.fg("dim", "cancelled"), 0, 0);
			if (d.verdict === "notAnswer") return new Text(theme.fg("warning", "not an answer (not graded)"), 0, 0);
			const color = d.verdict === "correct" ? "success" : d.verdict === "partial" ? "warning" : "error";
			const head = theme.fg(color, `${d.verdict ?? "ungraded"} ${d.score !== undefined ? Math.round(d.score * 100) + "%" : ""}`) + theme.fg("dim", ` · conf ${d.confidence}% · ${Math.round((d.latencyMs ?? 0) / 1000)}s · ${d.modality}`);
			return new Text(expanded && d.feedback ? `${head}\n${d.feedback}` : head, 0, 0);
		},
	});

	pi.registerTool({
		name: "lesson_read",
		label: "lesson read",
		description:
			"Give the learner a READING for a new node: a textbook page (markdown + LaTeX, at least 1200 characters) with the motivated derivation, one worked instance with every move explained, and what it hangs off. It is written into the lesson note as a section and shown on his page with one button, \"Read it, ask me\"; he can also type a question. After lesson_plan, and after each node is confirmed, the next recall/quiz is refused until the current node's reading has been read. Also the way to teach a worked example after two misses.",
		promptSnippet: "Use lesson_read to teach each new node as a readable section (derivation + worked instance) before testing it.",
		promptGuidelines: [
			"Your thinking is invisible to the learner. Anything he must read (derivations, worked examples, the plan) goes in lesson_read, chat text, or a tool's `say` field.",
			"One lesson_read per node, before its check. If he types a question instead of tapping the button, answer it in chat text, then offer ask_user_question with a ready option; do not call lesson_read again for that node.",
		],
		parameters: ReadParams,
		async execute(_id, params, _signal, onUpdate, ctx) {
			const body = params.body.trim();
			const title = params.title.trim() || params.node;
			const base: ReadDetails = { status: "refused", slug: params.slug, node: params.node, title, body };
			const short = readBodyReason(body);
			if (short) return { content: [{ type: "text" as const, text: short }], details: { ...base, message: short } };
			const fig = figurePath(ctx.cwd, params.figure);
			if (fig.error) return { content: [{ type: "text" as const, text: `Refused: ${fig.error}.` }], details: { ...base, message: fig.error } };
			if (!ctx.hasUI) return { content: [{ type: "text" as const, text: "lesson_read requires interactive mode UI" }], details: { ...base, status: "unavailable" as const } };
			const shown: ReadDetails = { ...base, status: "read", phase: "shown", figure: fig.rel };
			onUpdate?.({ content: [{ type: "text", text: "reading shown" }], details: shown });
			const out = await withUILock(() => webRead(ctx, { title, body, figure: fig.rel }));
			const p = pedagogy();
			if (!out) {
				return { content: [{ type: "text" as const, text: "He closed the reading without marking it read (Esc). Ask what he'd like to do with ask_user_question." }], details: { ...shown, phase: undefined, status: "cancelled" as const } };
			}
			if (out.read) {
				markRead(p, params.slug, params.node, body.length);
				return {
					content: [{ type: "text" as const, text: `He read "${title}" and tapped "Read it, ask me". Pose the node's check now (recall / quiz). Do not ask whether he is ready: he already said go.` }],
					details: { ...shown, phase: undefined, status: "read" as const },
				};
			}
			creditReading(p, body.length);
			p.readNeeded = { slug: params.slug, node: params.node, shown: true };
			oweReply(p, out.question);
			return {
				content: [
					{
						type: "text" as const,
						text: `He has a question about the reading instead of marking it read:\n"${out.question}"\nAnswer it properly in chat text (he cannot see your thinking). Then call ask_user_question ("Ready for the question?" with options "Ready, ask me" and "I have another question"). His ready unlocks the check; do NOT call lesson_read again for this node.`,
					},
				],
				details: { ...shown, phase: undefined, status: "question" as const, question: out.question },
			};
		},
		renderCall(args: any, theme: any) {
			return new Text(theme.fg("dim", `reading · ${args?.title ?? args?.node ?? ""}`), 0, 0);
		},
		renderResult(res: any, _o: any, theme: any) {
			const d = res.details as ReadDetails | undefined;
			if (!d) return new Text(theme.fg("dim", "reading"), 0, 0);
			if (d.phase === "shown") return new Text(theme.fg("dim", "reading…"), 0, 0);
			if (d.status === "refused") return new Text(theme.fg("warning", `refused: ${(d.message ?? "").slice(0, 90)}`), 0, 0);
			if (d.status === "question") return new Text(theme.fg("accent", `question: ${d.question ?? ""}`), 0, 0);
			if (d.status === "read") return new Text(theme.fg("success", "read ✓"), 0, 0);
			return new Text(theme.fg("dim", d.status), 0, 0);
		},
	});
}
