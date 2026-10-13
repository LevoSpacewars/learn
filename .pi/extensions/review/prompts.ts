/**
 * prompts — the one pending learner prompt, shared between surfaces.
 *
 * When the `recall` tool (or later, `quiz`) is waiting for an answer it
 * registers itself here. Any surface can then answer it: the terminal UI,
 * a photo upload from the phone page, or the answer pad. First answer wins;
 * the tool unregisters on completion.
 *
 * Not a pi extension (no default export).
 */

export interface PendingPrompt {
	id: string;
	kind: string; // recall kinds, "quiz", "menu", "input", "ask", or "read" (lesson_read)
	prompt: string;
	startedAt: number;
	paper?: boolean;
	options?: Array<{ index: number; label: string }>; // quiz only
	multi?: boolean; // quiz multi-select
	context?: string;
	say?: string; // tutor's 1-3 lines shown above the question
	banner?: string; // fixed framing line on the card (predict: quick guess)
	figure?: string; // read: vault-relative figure path (viz/...)
	/** Deliver an answer from any surface. Returns false if already answered. */
	answer(a: PromptAnswer): boolean;
}

export interface PromptAnswer {
	source: "tui" | "phone" | "pad";
	text?: string;
	photos?: Array<{ file: string; data: string; mimeType: string }>;
	audio?: { file: string; transcript: string };
	confidence?: number;
	dontKnow?: boolean;
	hint?: boolean;
	skip?: boolean; // learner wants to move on to new material without this check
	endRecall?: boolean; // stop the whole recall phase and start the lesson
	choices?: number[]; // quiz: 1-based option indices
}

/** What the web surface shows after a prompt resolves (feedback mirror). */
export interface LastResult {
	id: string;
	at: number;
	kind: string;
	prompt: string;
	verdict?: string; // correct | partial | incorrect | dontKnow | hint | cancelled
	score?: number;
	feedback?: string;
	reading?: string;
	firstError?: string;
	reference?: string;
	explanation?: string;
	chosen?: string[];
	correct?: string[];
	confidence?: number;
	latencyMs?: number;
}

// pi loads each extension file with its own module instance, so module-level
// state would NOT be shared between recall.ts and phone-work. Stash it on
// globalThis (same trick as the shared UI lock).
interface Registry {
	pending: PendingPrompt | undefined;
	listeners: Set<(p: PendingPrompt | undefined) => void>;
	lastResult?: LastResult;
}
function registry(): Registry {
	const g = globalThis as any;
	if (!g.__learnPromptRegistry) g.__learnPromptRegistry = { pending: undefined, listeners: new Set() } satisfies Registry;
	return g.__learnPromptRegistry as Registry;
}

export function setLastResult(r: LastResult): void {
	registry().lastResult = r;
}

export function getLastResult(): LastResult | undefined {
	return registry().lastResult;
}

export function setPending(p: PendingPrompt | undefined): void {
	const r = registry();
	r.pending = p;
	for (const l of r.listeners) l(p);
}

export function getPending(): PendingPrompt | undefined {
	return registry().pending;
}

/** Subscribe to prompt changes (the answer pad uses this to push updates). */
export function onPendingChange(l: (p: PendingPrompt | undefined) => void): () => void {
	const r = registry();
	r.listeners.add(l);
	return () => r.listeners.delete(l);
}

/** Try to answer the pending prompt from an external surface. */
export function answerPending(a: PromptAnswer): boolean {
	const p = registry().pending;
	if (!p) return false;
	return p.answer(a);
}
