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
import * as path from "node:path";
import { type GradeResult, grade } from "./review/grader.ts";
import { gradeCard, refreshReviewStatus } from "./review/index.ts";
import { plainMath } from "./review/plainmath.ts";
import { type PromptAnswer, setLastResult, setPending } from "./review/prompts.ts";
import { type CheckKind, recordCalibration, recordEvent } from "./review/store.ts";

type RecallStatus = "answered" | "hint" | "dontKnow" | "cancelled" | "unavailable";
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
	verdict?: GradeResult["verdict"];
	score?: number;
	reading?: string;
	firstError?: string;
	feedback?: string;
	cardId?: string;
	cardRating?: string;
	message?: string;
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
	prompt: Type.String({ description: "What the learner sees. Self-contained; LaTeX allowed. For 'flaw': the full planted-error argument plus 'Is this right? If not, where does it go wrong?'" }),
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
	rubric: Type.Optional(Type.String({ description: "Extra grading guidance for the grader, one line." })),
	retention: Type.Optional(Type.Boolean({ description: "True when review_due marked this card RETENTION CHECK (unannounced long-delay test). Recorded as the outcome metric." })),
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

function ratingFor(r: GradeResult, latencyMs: number): "again" | "hard" | "good" | "easy" {
	if (r.verdict === "incorrect" || r.score < 0.4) return "again";
	if (r.verdict === "partial" || r.score < 0.8) return "hard";
	if (latencyMs < 15000 && r.score >= 0.95) return "easy";
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
	opts: { kind: CheckKind; prompt: string; paper: boolean; reference: string; runGrade: (a: PromptAnswer, confidence: number) => Promise<GradeResult> },
): Promise<UiOutcome> {
	const startedAt = Date.now();
	const promptId = `p${startedAt.toString(36)}`;
	return ctx.ui.custom((tui: any, theme: any, _kb: any, done: (r: UiOutcome) => void) => {
		let phase: "answer" | "confidence" | "grading" | "feedback" = "answer";
		let answer: PromptAnswer | undefined;
		let latencyMs = 0;
		let confidence = 70;
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
					setLastResult({ id: promptId, at: Date.now(), kind: opts.kind, prompt: opts.prompt, verdict: graded?.verdict ?? "ungraded", score: graded?.score, feedback: graded?.feedback ?? gradeError, reading: graded?.reading, firstError: graded?.firstError, reference: opts.reference, confidence, latencyMs });
					refresh();
					// Answered from the phone/iPad: the result is on that screen, so don't wait for a keypress here.
					if (answer?.source !== "tui") setTimeout(() => { if (phase === "feedback") finish({ status: "answered", answer, confidence, latencyMs, graded }); }, 8000);
				});
		}

		setPending({ id: promptId, kind: opts.kind, prompt: opts.prompt, paper: opts.paper, startedAt, answer: receive });

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
					if (/^(idk|i don'?t know)$/i.test(text)) return void receive({ source: "tui", dontKnow: true });
					receive({ source: "tui", text });
					return;
				}
				editor.handleInput(data);
				tui.requestRender();
				return;
			}
			if (phase === "confidence") {
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
			addWrapped(lines, theme.fg("text", plainMath(opts.prompt)), width, " ");
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
				add(theme.fg("dim", " Enter submit · Ctrl+J newline · ? = hint · idk = I don't know · qr = phone link · Esc cancel"));
			} else if (phase === "confidence") {
				const filled = Math.round(confidence / 5);
				const bar = "█".repeat(filled) + "░".repeat(20 - filled);
				add(theme.fg("text", ` How confident are you that this is right?`));
				add(` ${theme.fg("accent", bar)} ${theme.fg("accent", `${confidence}%`)}`);
				lines.push("");
				add(theme.fg("dim", " ←/→ ±10 · ↑/↓ ±5 · type digits · Enter confirm"));
			} else if (phase === "grading") {
				add(theme.fg("muted", ` Grading independently… (${answer?.photos?.length ? "reading your photo" : "reading your answer"})`));
			} else {
				if (gradeError || !graded) {
					addWrapped(lines, theme.fg("warning", ` Grader unavailable: ${gradeError ?? "no result"}. The teacher will grade this by hand.`), width, " ");
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

export default function recall(pi: ExtensionAPI) {
	if (process.env.PI_SUBAGENT_AGENT) return;

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
			const base: RecallDetails = { status: "unavailable", kind, prompt: params.prompt, paper, topic: params.topic, cardId: params.cardId };
			if (!ctx.hasUI) return result("recall requires interactive mode UI", { ...base, message: "no UI" });

			onUpdate?.({ content: [{ type: "text", text: "asked" }], details: { ...base, phase: "asked" } });

			const promptStarted = Date.now();
			const outcome = await withUILock(() => askRecall(ctx, {
				kind,
				prompt: params.prompt,
				paper,
				reference: params.reference,
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
			if (outcome.status === "hint") {
				logEvent("hint");
				return result(
					`Learner asked for a HINT before attempting (after ${Math.round(outcome.latencyMs / 1000)}s). No unaided attempt yet. Give one small hint and pose again.`,
					details,
				);
			}
			if (outcome.status === "dontKnow") {
				logEvent("dontKnow");
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

			if (g) {
				Object.assign(details, { verdict: g.verdict, score: g.score, reading: g.reading, firstError: g.firstError, feedback: g.feedback });
				logEvent(g.verdict, { score: g.score, firstError: g.firstError, reading: g.reading, confidence });
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
							g.verdict !== "correct" && confidence >= 70 ? "HIGH-CONFIDENCE MISS: give richer feedback on the mechanism and re-test this soon." : "",
							g.verdict !== "correct"
								? "NEXT STEP (required): in 1-3 lines say what went wrong and why, then EITHER pose a fresh variant of the same thing with `recall`, OR drill down: pose the specific component that failed. Do not move on to a different strand until he has had another go at this one."
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
			if (d.status === "hint") return new Text(theme.fg("warning", "hint requested"), 0, 0);
			if (d.status === "dontKnow") return new Text(theme.fg("warning", "I don't know"), 0, 0);
			if (d.status === "cancelled") return new Text(theme.fg("dim", "cancelled"), 0, 0);
			const color = d.verdict === "correct" ? "success" : d.verdict === "partial" ? "warning" : "error";
			const head = theme.fg(color, `${d.verdict ?? "ungraded"} ${d.score !== undefined ? Math.round(d.score * 100) + "%" : ""}`) + theme.fg("dim", ` · conf ${d.confidence}% · ${Math.round((d.latencyMs ?? 0) / 1000)}s · ${d.modality}`);
			return new Text(expanded && d.feedback ? `${head}\n${d.feedback}` : head, 0, 0);
		},
	});
}
